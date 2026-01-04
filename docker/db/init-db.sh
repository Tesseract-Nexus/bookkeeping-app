#!/bin/bash
# Database initialization script for Bookkeeping Application
# This script ensures the required database exists before the service starts
# Usage: DB_HOST=hostname DB_USER=user DB_NAME=dbname DB_PASSWORD=password ./init-db.sh

set -e

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT:-5432}..."
until pg_isready -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -q; do
    echo "PostgreSQL is not ready yet. Retrying in 2 seconds..."
    sleep 2
done
echo "PostgreSQL is ready!"

# Create database if it doesn't exist
echo "Checking if database '${DB_NAME}' exists..."
export PGPASSWORD="${DB_PASSWORD}"

if psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -lqt | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
    echo "Database '${DB_NAME}' already exists."
else
    echo "Creating database '${DB_NAME}'..."
    psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -c "CREATE DATABASE ${DB_NAME};"
    echo "Database '${DB_NAME}' created successfully."
fi

echo "Database initialization complete."
