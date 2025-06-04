FROM oven/bun:1.2.15

WORKDIR /app

# Copy package.json files first (for better layer caching)
COPY package.json ./

# Install dependencies
RUN bun install

# Copy the rest of the client files
COPY . .

# Expose port 5173 (the default Vite dev server port)
EXPOSE 5173

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5173/ || exit 1

# Switch to non-root user
USER bun

# Set the command to run "bun run dev" with host set to 0.0.0.0 to allow external access
CMD ["bun", "run", "dev", "--host", "0.0.0.0"]