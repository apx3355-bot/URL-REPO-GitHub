#!/bin/bash
set -e

echo "🚀 Starting Railway deployment..."

# Setup directories
mkdir -p data/uploads data/backups
mkdir -p public/uploads

# Restore database
if [ ! -f data/database.db ]; then
  echo "📦 Restoring database..."
  if [ -f "backups/database-20260911-015653-shutdown.db" ]; then
    cp "backups/database-20260911-015653-shutdown.db" data/database.db
  elif [ -f "database.db" ]; then
    cp database.db data/database.db
  fi
fi

# Install npm dependencies
echo "📥 Installing dependencies..."
npm install --legacy-peer-deps

# Build frontend
echo "🎨 Building React frontend..."
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..

# Copy frontend to public
cp -r frontend/dist/* public/ 2>/dev/null || true

echo "✅ Build complete!"
echo "🌐 Starting PHP server on port ${PORT:-8000}"

# Environment variables
export DB_PATH=data/database.db
export UPLOAD_PATH=data/uploads
export BACKUP_PATH=data/backups

# Start PHP server on Railway's PORT
php -S 0.0.0.0:${PORT:-8000} -t public backend/router.php
