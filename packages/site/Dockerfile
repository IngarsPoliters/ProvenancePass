# Marketing: static Nginx + healthz + gzip
FROM nginx:1.27-alpine
RUN apk add --no-cache curl
COPY packages/site/nginx.conf /etc/nginx/conf.d/default.conf
COPY packages/site/public/ /usr/share/nginx/html/
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -fsS http://localhost/healthz || exit 1