FROM node:24-slim

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

EXPOSE 5173

ENV VITE_API_URL=http://localhost:8000

CMD ["npm", "run", "dev"]
