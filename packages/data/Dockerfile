FROM nginx:1.27-alpine

# Install curl and wget for healthcheck
RUN apk add --no-cache curl wget

COPY packages/data/nginx.conf /etc/nginx/conf.d/default.conf
COPY packages/data/public/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]