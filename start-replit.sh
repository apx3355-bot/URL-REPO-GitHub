#!/bin/bash
set -e

echo "🚀 Starting Replit deployment setup..."

# Setup directories
mkdir -p /tmp/data/uploads /tmp/data/backups
mkdir -p public/uploads

# Copy database dari backups jika belum ada
if [ ! -f /tmp/data/database.db ]; then
  echo "📦 Restoring database from backups..."
  if [ -f "backups/database-20260911-015653-shutdown.db" ]; then
    cp "backups/database-20260911-015653-shutdown.db" /tmp/data/database.db
  elif [ -f "database.db" ]; then
    cp database.db /tmp/data/database.db
  fi
fi

# Install dependencies
echo "📥 Installing npm dependencies..."
npm install --legacy-peer-deps

echo "🎨 Building React frontend..."
npm --prefix frontend install --legacy-peer-deps
npm --prefix frontend run build

# Copy built frontend to public
if [ -d "frontend/dist" ]; then
  cp -r frontend/dist/* public/ 2>/dev/null || true
fi

echo "✅ Setup complete!"
echo "🌐 Server starting on http://0.0.0.0:8000"
echo ""

# Start PHP built-in server
export DB_PATH=/tmp/data/database.db
export UPLOAD_PATH=/tmp/data/uploads
export BACKUP_PATH=/tmp/data/backups

php -S 0.0.0.0:8000 -t public backend/router.php
