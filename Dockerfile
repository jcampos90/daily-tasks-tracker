# Stage 1: Build stage
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy Prisma schema
COPY prisma ./prisma

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:22-alpine AS runner

# Set metadata labels
LABEL maintainer="Juan Campos"
LABEL description="Daily Tasks Tracker Application"

# Set working directory
WORKDIR /app

# Copy package files for production dependencies
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy Prisma schema and generated client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Copy built application from builder stage
COPY --from=builder /app/.output ./.output

# Use non-root node user for security
RUN chown -R node:node /app
USER node

# Expose port (default Nitro port is 3000, but can be configured via env)
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Health check to ensure the application is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the Nitro server
CMD ["node", ".output/server/index.mjs"]

