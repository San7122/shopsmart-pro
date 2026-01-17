# Use Node.js 18 LTS Alpine image for smaller size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install root dependencies
RUN npm install

# Copy server directory
COPY server/ ./server/

# Navigate to server directory and install dependencies
WORKDIR /app/server
RUN npm install

# Navigate back to root
WORKDIR /app

# Copy client directory
COPY client/ ./client/

# Navigate to client directory and install dependencies
WORKDIR /app/client
RUN npm install

# Build the client application
RUN npm run build

# Navigate back to root
WORKDIR /app

# Expose port 5000 for the server
EXPOSE 5000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Create logs directory
RUN mkdir -p server/logs

# Start the application
CMD ["sh", "-c", "cd server && npm start"]