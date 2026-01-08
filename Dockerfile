# Use official Node.js LTS image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# Copy TypeScript source files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Remove dev dependencies and source files to reduce image size
RUN rm -rf src tsconfig.json && \
    npm ci --only=production && \
    npm cache clean --force

# Create output directory
RUN mkdir -p /app/output

# Environment variables (can be overridden)
ENV PROXY_URL=""
ENV OUTPUT_DIR="/app/output"
ENV MAX_PAGES="200"
ENV CRAWL_DELAY="1000"
ENV TIMEOUT="30000"
ENV BASE_URL="https://www.carzone.ie"

# Volume mount point for HTML files
VOLUME ["/app/output"]

# Run the crawler
CMD ["node", "dist/index.js"]
