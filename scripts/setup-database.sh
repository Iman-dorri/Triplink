#!/bin/bash

# Synvoy Database Setup Script for PostgreSQL 16.9
# This script sets up the complete database structure for the Synvoy project

echo "🚀 Setting up Synvoy PostgreSQL Database..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Database configuration
DB_NAME="triplink"
DB_USER="triplink_user"
DB_PASSWORD="triplink_secure_password_2024"
DB_HOST="localhost"
DB_PORT="5432"

# Check if PostgreSQL is running
check_postgres() {
    print_status "Checking PostgreSQL status..."
    
    if systemctl is-active --quiet postgresql; then
        print_success "PostgreSQL is running"
    else
        print_error "PostgreSQL is not running. Starting it..."
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        sleep 3
    fi
}

# Create database and user
create_database() {
    print_status "Creating database and user..."
    
    # Create user and database
    sudo -u postgres psql << EOF
-- Create user
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';

-- Create database
CREATE DATABASE $DB_NAME WITH OWNER = $DB_USER ENCODING = 'UTF8' LC_COLLATE = 'en_US.UTF-8' LC_CTYPE = 'en_US.UTF-8';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
GRANT CREATE ON DATABASE $DB_NAME TO $DB_USER;

-- Connect to the database
\c $DB_NAME

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT CREATE ON SCHEMA public TO $DB_USER;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Exit
\q
EOF

    if [ $? -eq 0 ]; then
        print_success "Database and user created successfully"
    else
        print_error "Failed to create database and user"
        exit 1
    fi
}

# Create database schema
create_schema() {
    print_status "Creating database schema..."
    
    # Create the schema SQL file
    cat > /tmp/triplink_schema.sql << 'EOF'
-- Synvoy Database Schema
-- PostgreSQL 16.9

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
CREATE TYPE trip_status AS ENUM ('planning', 'active', 'completed', 'cancelled', 'postponed');
CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'rejected', 'blocked');
CREATE TYPE alert_type AS ENUM ('flight', 'hotel', 'car_rental', 'activity', 'shopping', 'general');
CREATE TYPE notification_type AS ENUM ('price_alert', 'trip_update', 'connection_request', 'system', 'reminder');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    is_verified BOOLEAN DEFAULT FALSE,
    status user_status DEFAULT 'pending_verification',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Trips table
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    budget DECIMAL(10,2),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    status trip_status DEFAULT 'planning',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
    CONSTRAINT positive_budget CHECK (budget IS NULL OR budget >= 0)
);

-- Destinations table
CREATE TABLE destinations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    arrival_date TIMESTAMP WITH TIME ZONE,
    departure_date TIMESTAMP WITH TIME ZONE,
    priority INTEGER DEFAULT 1,
    notes TEXT,
    coordinates POINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_dates CHECK (departure_date IS NULL OR arrival_date IS NULL OR departure_date >= arrival_date),
    CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 10)
);

-- Price alerts table
CREATE TABLE price_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    alert_type alert_type NOT NULL,
    origin VARCHAR(100),
    destination VARCHAR(100),
    max_price DECIMAL(10,2),
    min_price DECIMAL(10,2),
    preferred_dates JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_price_range CHECK (min_price IS NULL OR max_price IS NULL OR max_price >= min_price)
);

-- Shopping items table
CREATE TABLE shopping_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    target_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    current_price DECIMAL(10,2),
    url TEXT,
    image_url TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_prices CHECK (
        (target_price IS NULL OR target_price >= 0) AND
        (max_price IS NULL OR max_price >= 0) AND
        (current_price IS NULL OR current_price >= 0)
    )
);

-- User connections table
CREATE TABLE user_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connected_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connection_type VARCHAR(50) DEFAULT 'friend',
    status connection_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_connection UNIQUE(user_id, connected_user_id),
    CONSTRAINT no_self_connection CHECK (user_id != connected_user_id)
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trip expenses table
CREATE TABLE trip_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Trip activities table
CREATE TABLE trip_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    destination_id UUID REFERENCES destinations(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    activity_type VARCHAR(100),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    location VARCHAR(200),
    cost DECIMAL(10,2),
    booking_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_times CHECK (end_time IS NULL OR start_time IS NULL OR end_time >= start_time)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_dates ON trips(start_date, end_date);
CREATE INDEX idx_destinations_trip_id ON destinations(trip_id);
CREATE INDEX idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_active ON price_alerts(is_active);
CREATE INDEX idx_shopping_items_user_id ON shopping_items(user_id);
CREATE INDEX idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX idx_user_connections_status ON user_connections(status);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_price_alerts_updated_at BEFORE UPDATE ON price_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopping_items_updated_at BEFORE UPDATE ON shopping_items FOR EECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_connections_updated_at BEFORE UPDATE ON user_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to the user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO triplink_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO triplink_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO triplink_user;
EOF

    # Execute the schema
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /tmp/triplink_schema.sql
    
    if [ $? -eq 0 ]; then
        print_success "Database schema created successfully"
    else
        print_error "Failed to create database schema"
        exit 1
    fi
    
    # Clean up
    rm -f /tmp/triplink_schema.sql
}

# Insert sample data
insert_sample_data() {
    print_status "Inserting sample data..."
    
    # Create sample data SQL file
    cat > /tmp/triplink_sample_data.sql << 'EOF'
-- Sample data for Synvoy

-- Insert sample user (password: test123)
INSERT INTO users (email, password_hash, first_name, last_name, phone, is_verified, status) VALUES
('test@triplink.com', crypt('test123', gen_salt('bf')), 'Test', 'User', '+1234567890', TRUE, 'active'),
('demo@triplink.com', crypt('demo123', gen_salt('bf')), 'Demo', 'User', '+0987654321', TRUE, 'active');

-- Insert sample trip
INSERT INTO trips (user_id, title, description, budget, start_date, end_date, status) 
SELECT 
    u.id,
    'Weekend in Paris',
    'A romantic weekend getaway to the City of Light',
    1500.00,
    CURRENT_DATE + INTERVAL '30 days',
    CURRENT_DATE + INTERVAL '32 days',
    'planning'
FROM users u WHERE u.email = 'test@triplink.com';

-- Insert sample destinations
INSERT INTO destinations (trip_id, city, country, arrival_date, departure_date, priority, notes)
SELECT 
    t.id,
    'Paris',
    'France',
    t.start_date,
    t.end_date,
    1,
    'Visit Eiffel Tower, Louvre Museum, and Notre-Dame'
FROM trips t 
JOIN users u ON t.user_id = u.id 
WHERE u.email = 'test@triplink.com' AND t.title = 'Weekend in Paris';

-- Insert sample price alert
INSERT INTO price_alerts (user_id, alert_type, origin, destination, max_price, is_active)
SELECT 
    u.id,
    'flight',
    'New York',
    'Paris',
    800.00,
    TRUE
FROM users u WHERE u.email = 'test@triplink.com';

-- Insert sample shopping item
INSERT INTO shopping_items (user_id, name, category, target_price, max_price, priority)
SELECT 
    u.id,
    'Travel Backpack',
    'Luggage',
    150.00,
    200.00,
    1
FROM users u WHERE u.email = 'test@triplink.com';
EOF

    # Execute the sample data
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /tmp/triplink_sample_data.sql
    
    if [ $? -eq 0 ]; then
        print_success "Sample data inserted successfully"
    else
        print_error "Failed to insert sample data"
        exit 1
    fi
    
    # Clean up
    rm -f /tmp/triplink_sample_data.sql
}

# Test database connection
test_connection() {
    print_status "Testing database connection..."
    
    # Test connection
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Database connection successful!"
        
        # Show database info
        echo ""
        echo "📊 Database Information:"
        echo "   Database: $DB_NAME"
        echo "   User: $DB_USER"
        echo "   Host: $DB_HOST:$DB_PORT"
        echo ""
        echo "🔑 Sample Login Credentials:"
        echo "   Email: test@triplink.com"
        echo "   Password: test123"
        echo ""
        echo "📋 Tables Created:"
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\dt" | grep -v "List of relations" | grep -v "Schema" | grep -v "Name" | grep -v "----" | grep -v "^$"
        
    else
        print_error "Database connection failed!"
        exit 1
    fi
}

# Update backend environment file
update_backend_env() {
    print_status "Updating backend environment file..."
    
    # Update the .env file with the correct database URL
    cd backend
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME|" .env
    
    print_success "Backend environment file updated"
    cd ..
}

# Main execution
main() {
    print_status "Starting Synvoy database setup..."
    
    # Check PostgreSQL
    check_postgres
    
    # Create database and user
    create_database
    
    # Create schema
    create_schema
    
    # Insert sample data
    insert_sample_data
    
    # Test connection
    test_connection
    
    # Update backend environment
    update_backend_env
    
    print_success "🎉 Synvoy database setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Start the backend: make backend-run"
    echo "2. Test the API: curl http://localhost:8000/health"
    echo "3. View API docs: http://localhost:8000/docs"
}

# Run main function
main 