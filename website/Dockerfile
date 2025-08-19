# ─────────────────────────────────────────────────────────────
# Marketing site: website (static → Nginx)
# Put your built/static files under website/public
# ─────────────────────────────────────────────────────────────

FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

# If you don't have a site yet, we'll still build and serve a placeholder.
RUN mkdir -p /usr/share/nginx/html
COPY website/public/ /usr/share/nginx/html/
COPY website/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost/healthz || exit 1