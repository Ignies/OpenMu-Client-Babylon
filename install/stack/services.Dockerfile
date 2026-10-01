# One image for every Bun service (proxy, register, cash shop, marketplace, ops); compose picks the command.
FROM oven/bun:1.4.2-slim
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts
COPY . .
RUN mkdir -p /data/proxy /data/register /data/cashshop /data/marketplace /data/ops && chown -R bun:bun /data
USER bun
