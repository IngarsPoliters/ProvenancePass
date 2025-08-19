# ─────────────────────────────────────────────────────────────
# Data JSON: data.provenancepass.com (revocations.json with CORS)
# Serves /revocations.json (and you can later add /manifest/*)
# ─────────────────────────────────────────────────────────────

FROM nginx:1.27-alpine

# Copy a custom nginx with CORS + caching
COPY data/nginx.conf /etc/nginx/conf.d/default.conf

# Copy your signed revocation feed into web root
# (file lives in repo at docs/spec/revocations.json)
RUN mkdir -p /usr/share/nginx/html
COPY docs/spec/revocations.json /usr/share/nginx/html/revocations.json

# Optional: prepare empty manifest folder now (can upload later by CI)
RUN mkdir -p /usr/share/nginx/html/manifest

EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost/healthz || exit 1