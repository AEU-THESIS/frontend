# ==========================================
# STAGE 1: BUILD THE VUE APP
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install packages
RUN npm ci

# Copy all source files
COPY . .

# Set default API target build argument (can be overridden during build)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Build for production
RUN npm run build

# ==========================================
# STAGE 2: SERVE WITH NGINX
# ==========================================
FROM nginx:stable-alpine

# Create runtime directories and set permissions for the built-in nginx user
RUN mkdir -p /var/cache/nginx /var/run /var/log/nginx && \
  chown -R nginx:nginx /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html /etc/nginx/conf.d

# Copy built static files from Stage 1
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Copy local Nginx configuration file
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

# Drop privileges
USER nginx

# Expose non-privileged port
EXPOSE 8080

# Add Docker HEALTHCHECK
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
