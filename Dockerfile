FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /app

# Install timezone data
RUN apt-get update && apt-get install -y tzdata && rm -rf /var/lib/apt/lists/*
ENV TZ=Europe/Belgrade

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV NODE_ENV=production

# Run the application
CMD ["node", "dist/index.js"]
