#!/bin/bash

echo "🚀 Starting Coach Johnson Realty System..."

# 1. Start Database
echo "📦 Starting PostgreSQL Database..."
docker compose up -d db

# 2. Wait for DB (optional but helpful)
echo "⏳ Waiting for database to be ready..."
sleep 3

# 3. Start Backend
echo "⚙️ Starting Backend API..."
cd backend && npm run start:dev &

# 4. Start Frontend
echo "💻 Starting Frontend..."
cd ../frontend && npm run dev &

echo "✅ System initialized!"
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:3000"
wait
