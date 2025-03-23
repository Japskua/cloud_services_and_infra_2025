# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.2.5
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY package*.json .
RUN bun install
COPY . .
RUN bun build --compile --minify --sourcemap --bytecode src/index.ts --outfile bin/auth
CMD ["/usr/src/app/bin/auth"]