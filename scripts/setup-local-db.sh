#!/bin/bash

# Setup Local Database for Development
# This script creates a local PostgreSQL database and runs migrations

set -e

# Configuration
DB_NAME="trivianft"
DB_USER="trivia_admin"
DB_PASSWORD="local_dev_password"
DB_HOST="localhost"
DB_PORT="5432"

echo "🚀 Setting up local TriviaNFT database..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

# Check if database exists
if psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "⚠️  Database '$DB_NAME' already exists."
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Dropping existing database..."
        dropdb $DB_NAME || true
    else
        echo "✓ Using existing database"
    fi
fi

# Create database if it doesn't exist
if ! psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "📦 Creating database '$DB_NAME'..."
    createdb $DB_NAME
fi

# Create user if it doesn't exist
echo "👤 Creating database user..."
psql -d postgres -tc "SELECT 1 FROM pg_user WHERE usename = '$DB_USER'" | grep -q 1 || \
    psql -d postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"

# Grant privileges
echo "🔐 Granting privileges..."
psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

echo "✓ Database setup complete!"
echo ""
echo "📝 Connection details:"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo ""
echo "🔗 Connection string:"
echo "   DATABASE_URL=$DATABASE_URL"
echo ""

# Run migrations
echo "🔄 Running database migrations..."
cd "$(dirname "$0")/.."
pnpm migrate:up

echo ""
echo "✅ Local database setup complete!"
echo ""
echo "💡 To connect to the database:"
echo "   psql $DATABASE_URL"
echo ""
echo "💡 To run migrations manually:"
echo "   DATABASE_URL=$DATABASE_URL pnpm migrate:up"
