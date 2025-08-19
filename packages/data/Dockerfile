# Data service: serve revocations & manifests (CORS + caching + healthz)
FROM nginx:1.27-alpine
RUN apk add --no-cache curl
COPY packages/data/nginx.conf /etc/nginx/conf.d/default.conf

# Copy site assets first
COPY packages/data/public/ /usr/share/nginx/html/

# Authoritative feed copied straight from docs so it's always current
COPY docs/spec/revocations.json /usr/share/nginx/html/revocations.json
# If you produce a detached signature file, this COPY won't fail if missing:
# (Coolify uses BuildKit; you can enable/disable the next line as you start signing)
# COPY docs/spec/revocations.sig /usr/share/nginx/html/revocations.sig

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -fsS http://localhost/healthz || exit 1