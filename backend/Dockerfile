# ─── AquaFlow Backend Dockerfile ─────────────────────────────────────────────
# Uses Node.js 22 LTS (has built-in SQLite, no C++ build tools needed)
FROM node:22-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (layer cache optimization)
COPY package*.json ./
RUN npm install --omit=dev

# Copy source files
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose the API port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

# Start server
CMD ["node", "server.js"]
