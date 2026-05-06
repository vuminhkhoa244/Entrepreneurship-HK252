# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for native builds)
RUN npm ci --only=production

# Copy source code
COPY . .

# Create data directory for SQLite database and uploads
RUN mkdir -p /app/data /app/uploads

# Expose port
EXPOSE 4000

# Start server
CMD ["npm", "start"]
