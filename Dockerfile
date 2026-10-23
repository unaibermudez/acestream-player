# ---------- Build del frontend ----------
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---------- nginx: SPA + proxy inverso al motor ----------
FROM nginx:1.30-alpine

# Motor por defecto: el servicio "acestream" del compose. Se cambia con la variable ACE_ENGINE.
ENV ACE_ENGINE=http://acestream:6878
# La plantilla usa variables de nginx ($host, $uri…): solo se sustituyen las ACE_*.
ENV NGINX_ENVSUBST_FILTER=^ACE_
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
