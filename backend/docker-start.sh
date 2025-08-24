#!/bin/bash

# Scooby NFT Companion API - Docker Start Script

set -e

echo "🐕 Starting Scooby NFT Companion API..."

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ] && [ -z "$NEON_DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL or NEON_DATABASE_URL must be set"
    exit 1
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY is not set. AI features will be limited."
fi

# Check if logs directory exists (should be created in Dockerfile)
if [ ! -d "/app/logs" ]; then
    echo "⚠️  Warning: /app/logs directory not found"
fi

# Wait for database to be ready (if using local postgres)
if [[ "$DATABASE_URL" == *"localhost"* ]] || [[ "$DATABASE_URL" == *"postgres"* ]]; then
    echo "🔄 Waiting for database to be ready..."
    sleep 5
fi

echo "🚀 Starting FastAPI server..."
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --log-level info \
    --access-log \
    --use-colors
