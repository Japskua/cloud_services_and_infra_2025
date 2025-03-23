# --- Build Stage ---
FROM oven/bun:1.2.5 AS builder
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copy package.json and install dependencies
COPY package*.json ./
RUN bun install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Build the app
# Notice, we cannot run --bytecode here (I guess we have something incompatible going on? 
# Maybe in later versions, as this feature is still in beta)
RUN bun build --compile --minify --sourcemap src/index.ts --outfile bin/backend

# --- Run Stage (Minimized) ---
FROM oven/bun:1.2.5-slim AS runner
WORKDIR /app

# Copy the binary
COPY --from=builder /usr/src/app/bin/backend /app/bin/backend

# Ensure it's executable
RUN chmod +x /app/bin/backend

# Run the app directly
CMD ["/app/bin/backend"]