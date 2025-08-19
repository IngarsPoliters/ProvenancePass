FROM nginx:1.27-alpine
COPY packages/data/nginx.conf /etc/nginx/conf.d/default.conf
COPY packages/data/public/ /usr/share/nginx/html/
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost/healthz || exit 1