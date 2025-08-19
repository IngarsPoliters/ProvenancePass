# ─────────────────────────────────────────────────────────────
# Viewer: packages/viewer (Vite build → Nginx serve)
# Build args you will set in Coolify:
#   VITE_REVOCATIONS_URL=https://data.provenancepass.com/revocations.json
#   (optional) VITE_MANIFEST_URL=https://data.provenancepass.com/manifest/
# ─────────────────────────────────────────────────────────────

# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Only install viewer deps
COPY packages/viewer/package.json packages/viewer/package.json
WORKDIR /app/packages/viewer
RUN npm i --silent

# Build-time env (Vite reads only VITE_* at build time)
ARG VITE_REVOCATIONS_URL
ARG VITE_MANIFEST_URL
ENV VITE_REVOCATIONS_URL=${VITE_REVOCATIONS_URL}
ENV VITE_MANIFEST_URL=${VITE_MANIFEST_URL}

# Copy source and build
COPY packages/viewer/ .
RUN npm run build

# Runtime (static) stage
FROM nginx:1.27-alpine
COPY packages/viewer/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/viewer/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost/healthz || exit 1