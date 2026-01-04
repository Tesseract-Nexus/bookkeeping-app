-- Bookkeeping Application Database Initialization
-- This script creates all required databases for the microservices
-- Each microservice gets its own database for isolation

-- Auth Service Database
SELECT 'CREATE DATABASE bookkeep_auth'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'bookkeep_auth')\gexec

-- Tenant/Multi-tenancy Database
SELECT 'CREATE DATABASE bookkeep_tenant'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'bookkeep_tenant')\gexec

-- Core Business Logic Database
SELECT 'CREATE DATABASE bookkeep_core'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'bookkeep_core')\gexec

-- Customer Service Database
SELECT 'CREATE DATABASE bookkeep_customer'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'bookkeep_customer')\gexec

-- Invoice Service Database
SELECT 'CREATE DATABASE bookkeep_invoice'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'bookkeep_invoice')\gexec

-- Tax Service Database
SELECT 'CREATE DATABASE bookkeep_tax'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'bookkeep_tax')\gexec

-- Report Service Database
SELECT 'CREATE DATABASE bookkeep_report'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'bookkeep_report')\gexec

-- Grant privileges
DO $$
BEGIN
    GRANT ALL PRIVILEGES ON DATABASE bookkeep_auth TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE bookkeep_tenant TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE bookkeep_core TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE bookkeep_customer TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE bookkeep_invoice TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE bookkeep_tax TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE bookkeep_report TO postgres;
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if databases don't exist yet
    NULL;
END $$;
