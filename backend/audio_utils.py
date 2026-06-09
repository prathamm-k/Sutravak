import re
import numpy as np
from pydub import AudioSegment
from typing import List, Dict, Optional, Tuple

def estimate_tokens(text: str) -> int:
    """
    Estimates token count of a given text string.
    Rule: approx 1.3 tokens per word.
    """
    words = text.split()
    return int(len(words) * 1.3)

def split_script_into_chunks(text: str, target_chunk_tokens: int = 160) -> List[Dict[str, str]]:
    """
    Splits a full script into chunks.
    Rules:
    1. Split text by paragraph boundaries (\n\n) first.
    2. Within each paragraph, split by sentence boundaries (. ! ? — \u2014) and do not split mid-sentence.
    3. Group sentences into chunks targeting target_chunk_tokens.
    4. Each chunk has an optional 'prev_sentence' field (the last sentence of the previous chunk, if any)
       and a boolean 'ends_paragraph' to indicate if a paragraph break follows it.
    """
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks = []
    
    # Regex to split on sentence boundaries (. ! ? — \u2014) followed by whitespace, keeping delimiters.
    # We use a lookbehind assertion so the delimiters remain attached to the preceding sentence.
    sentence_split_regex = re.compile(r'(?<=[.!?—\u2014])\s+')
    
    prev_sentence = None
    
    for p_idx, paragraph in enumerate(paragraphs):
        sentences = [s.strip() for s in sentence_split_regex.split(paragraph) if s.strip()]
        if not sentences:
            continue
            
        current_chunk_sentences = []
        current_chunk_tokens = 0
        
        for s_idx, sentence in enumerate(sentences):
            sentence_tokens = estimate_tokens(sentence)
            
            # If current chunk has sentences, and adding this sentence exceeds target, we finalize the chunk.
            if current_chunk_sentences and (current_chunk_tokens + sentence_tokens > target_chunk_tokens):
                chunk_text = " ".join(current_chunk_sentences)
                chunks.append({
                    "text": chunk_text,
                    "prev_sentence": prev_sentence,
                    "ends_paragraph": False
                })
                # Set prev_sentence to the last sentence of this finished chunk
                prev_sentence = current_chunk_sentences[-1]
                
                # Start new chunk
                current_chunk_sentences = [sentence]
                current_chunk_tokens = sentence_tokens
            else:
                current_chunk_sentences.append(sentence)
                current_chunk_tokens += sentence_tokens
                
        # Finalize the last chunk of the paragraph
        if current_chunk_sentences:
            chunk_text = " ".join(current_chunk_sentences)
            is_last_paragraph = (p_idx == len(paragraphs) - 1)
            chunks.append({
                "text": chunk_text,
                "prev_sentence": prev_sentence,
                "ends_paragraph": not is_last_paragraph  # Insert silence if there is a next paragraph
            })
            prev_sentence = current_chunk_sentences[-1]
            
    return chunks

def stitch_audio_chunks(chunk_paths: List[str], crossfade_ms: int = 4, ends_paragraph_list: List[bool] = None) -> AudioSegment:
    """
    Stitches generated WAV chunk files together using pydub.
    Rules:
    - Apply crossfade of crossfade_ms between consecutive chunks.
    - If ends_paragraph_list indicates a paragraph break, insert 120ms silence.
      Note: No crossfade is applied to/from silence segments to preserve the pause.
    """
    if not chunk_paths:
        raise ValueError("No audio chunks provided to stitch.")
        
    combined = AudioSegment.from_file(chunk_paths[0])
    
    for i in range(1, len(chunk_paths)):
        next_chunk = AudioSegment.from_file(chunk_paths[i])
        
        # Check if previous chunk ended a paragraph
        if ends_paragraph_list and ends_paragraph_list[i-1]:
            # Generate 120ms silence with same properties (sample rate, channels, sample width)
            silence = AudioSegment.silent(duration=120, frame_rate=combined.frame_rate)
            # Append silence (no crossfade to maintain the pause)
            combined = combined + silence
            # Append next chunk (crossfade_ms is applied to the beginning of next_chunk with the tail of combined)
            # Since the tail of combined is silence, crossfading into it is smooth.
            combined = combined.append(next_chunk, crossfade=crossfade_ms)
        else:
            combined = combined.append(next_chunk, crossfade=crossfade_ms)
            
    return combined

def normalize_audio(segment: AudioSegment, target_dbfs: float = -3.0) -> AudioSegment:
    """
    Peak-normalizes the final audio to target_dbfs (default: -3.0 dB).
    """
    # Max peak of segment in dBFS
    max_peak = segment.max_dBFS
    # If the segment is silent, max_peak is -inf, in which case we don't apply gain
    if np.isinf(max_peak) or max_peak == 0.0:
        return segment
    change_in_dbfs = target_dbfs - max_peak
    return segment.apply_gain(change_in_dbfs)

def generate_waveform_peaks(segment: AudioSegment, num_points: int = 1000) -> List[float]:
    """
    Pre-computes waveform peak amplitude data normalized between 0.0 and 1.0.
    Divides the audio into num_points buckets and extracts the max peak from each.
    """
    samples = np.array(segment.get_array_of_samples(), dtype=np.float32)
    
    # Handle multi-channel (mono-fy)
    if segment.channels > 1:
        samples = samples.reshape((-1, segment.channels)).mean(axis=1)
        
    # Take absolute value for amplitude
    abs_samples = np.abs(samples)
    
    if len(abs_samples) < num_points:
        # Pad with zeros
        peaks = list(abs_samples) + [0.0] * (num_points - len(abs_samples))
    else:
        # Split into num_points buckets and get max of each
        buckets = np.array_split(abs_samples, num_points)
        peaks = [float(np.max(b)) if len(b) > 0 else 0.0 for b in buckets]
        
    # Normalize peak list between 0.0 and 1.0
    max_peak = max(peaks) if peaks else 0.0
    if max_peak > 0.0:
        peaks = [p / max_peak for p in peaks]
        
    return peaks
