FROM oven/bun:1.2.15

WORKDIR /app

# Copy package.json for better layer caching
COPY package.json ./

# Install dependencies
RUN bun install

# Copy the rest of the server files
COPY . .

# Expose port 3000
EXPOSE 3000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Switch to non-root user
USER bun

# Set the command to run the server
CMD ["bun", "server.ts"]