# ============================================================
# Stage 1: Build — dùng node:20-alpine để cài dependencies và build
# ============================================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files và cài dependencies (npm ci cho reproducible build)
COPY package*.json ./
RUN npm ci

# Copy source code và build production bundle
COPY . .
RUN npm run build

# ============================================================
# Stage 2: Serve — dùng nginx:1.27-alpine để phục vụ static files
# ============================================================
FROM nginx:1.27-alpine AS serve

# Copy build output từ stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Container lắng nghe trên cổng 80
EXPOSE 80

# Chạy Nginx ở foreground (không daemon)
CMD ["nginx", "-g", "daemon off;"]
