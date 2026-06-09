FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expose Vite development server port
EXPOSE 2001

# Run Vite dev server in host-bound mode
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
