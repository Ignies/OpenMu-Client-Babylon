# The web client and the register site, built with this server's defaults, served by Caddy.
FROM oven/bun:1.4.2 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG VITE_WS_HOST VITE_WS_PORT VITE_SERVER_LIST_URL VITE_REGISTER_URL VITE_REGISTER_API VITE_DATA_URL_REGISTER VITE_MODULE_SIGNING_KEY MU_LITE_ASSETS
# The lighter copies (tools/liteAssets.ts) encode the music with ffmpeg; only that build needs it.
RUN if [ "$MU_LITE_ASSETS" = on ]; then apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*; fi
RUN VITE_WS_HOST="$VITE_WS_HOST" VITE_WS_PORT="$VITE_WS_PORT" VITE_SERVER_LIST_URL="$VITE_SERVER_LIST_URL" \
    VITE_REGISTER_URL="$VITE_REGISTER_URL" VITE_REGISTER_API="$VITE_REGISTER_API" \
    VITE_MODULE_SIGNING_KEY="$VITE_MODULE_SIGNING_KEY" MU_LITE_ASSETS="$MU_LITE_ASSETS" bun run build
RUN VITE_DATA_URL="$VITE_DATA_URL_REGISTER" VITE_REGISTER_API=/api/register bun run build:register

FROM caddy:2-alpine
COPY --from=build /app/dist /srv/client
COPY --from=build /app/dist-register /srv/register
