# The web client, the register site and the website's static half, built with this server's defaults, served
# by Caddy. The website's PHP runs in the site image, which copies /srv/site from this one (site.Dockerfile).
FROM oven/bun:1.4.2 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG VITE_WS_HOST VITE_WS_PORT VITE_SERVER_LIST_URL VITE_REGISTER_URL VITE_REGISTER_API VITE_DATA_URL_REGISTER VITE_MODULE_SIGNING_KEY
RUN VITE_WS_HOST="$VITE_WS_HOST" VITE_WS_PORT="$VITE_WS_PORT" VITE_SERVER_LIST_URL="$VITE_SERVER_LIST_URL" \
    VITE_REGISTER_URL="$VITE_REGISTER_URL" VITE_REGISTER_API="$VITE_REGISTER_API" \
    VITE_MODULE_SIGNING_KEY="$VITE_MODULE_SIGNING_KEY" bun run build
RUN VITE_DATA_URL="$VITE_DATA_URL_REGISTER" VITE_REGISTER_API=/api/register bun run build:register
RUN bun run build:site-fx

# The website's UI art, rendered per theme (website/art/build.py).
FROM python:3.12-slim AS art
RUN pip install --no-cache-dir numpy==2.3.3 pillow==11.3.0
COPY website/art /art
RUN python /art/build.py /out

FROM caddy:2-alpine
COPY --from=build /app/dist /srv/client
COPY --from=build /app/dist-register /srv/register
COPY --from=build /app/website /srv/site
COPY --from=art /out /srv/site/config/resources/img/ui
COPY --from=build /app/public/fonts /srv/site/shared/fonts
COPY --from=build /app/public/icons /srv/site/shared/icons
COPY --from=build /app/public/ui/world_select /srv/site/shared/ui/world_select
