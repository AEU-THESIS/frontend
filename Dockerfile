# ==========================================
# STAGE 1: BUILD THE VUE APP
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install packages
RUN npm install

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

# Copy built static files from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy local Nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
