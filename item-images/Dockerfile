FROM oven/bun:latest

WORKDIR /app

# Copy package.json for better layer caching
COPY package.json ./

# Install dependencies
RUN bun install

# Copy the rest of the server files
COPY . .

# Expose port 3000
EXPOSE 3000

# Set the command to run the server
CMD ["bun", "server.ts"]