# Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# PHP Runtime
FROM php:8.2-cli-alpine
WORKDIR /var/www/html

# Install SQLite & dependencies
RUN apk add --no-cache sqlite-libs sqlite-dev \
    && docker-php-ext-install pdo pdo_sqlite

# Copy source
COPY --from=frontend-builder /app/frontend/dist ./public
COPY backend/ ./backend/
COPY backups/ ./backups/
COPY public/ ./public/

# Environment Variables
ENV PORT=10000 \
    DB_PATH=/data/database.db \
    UPLOAD_PATH=/data/uploads \
    BACKUP_PATH=/data/backups

# Persist data directories
RUN mkdir -p /data/uploads /data/backups /var/www/html/public/uploads \
    && chmod -R 777 /data /var/www/html/public/uploads

EXPOSE 10000

# Start PHP built-in server with router
CMD ["sh", "-c", "php -S 0.0.0.0:${PORT} -t public backend/router.php"]
