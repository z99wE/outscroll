FROM node:20-alpine

WORKDIR /app

# Copy package files first for Docker layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S outscroll && \
    adduser -S outscroll -u 1001 -G outscroll
USER outscroll

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
