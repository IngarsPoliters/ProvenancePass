# ─────────────────────────────────────────────────────────────
# Apex redirect: provenancepass.com → https://www.provenancepass.com
# Using Caddy (tiny, clean 301 + healthz)
# ─────────────────────────────────────────────────────────────

FROM caddy:2.8-alpine
COPY redirect/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost/healthz || exit 1