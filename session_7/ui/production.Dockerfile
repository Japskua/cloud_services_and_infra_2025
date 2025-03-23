# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.2.5
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY package*.json .
RUN bun install
COPY . .
RUN bun run build