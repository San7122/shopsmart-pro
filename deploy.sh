#!/bin/bash

# ShopSmart Pro Deployment Script
# This script automates the deployment process for different environments

set -e  # Exit on any error

echo "🚀 Starting ShopSmart Pro Deployment..."

# Function to display usage
usage() {
    echo "Usage: $0 [environment]"
    echo "Environments: staging, production, local"
    echo "Example: $0 production"
    exit 1
}

# Check if environment argument is provided
if [ $# -eq 0 ]; then
    usage
fi

ENVIRONMENT=$1

echo "🔧 Setting up deployment for: $ENVIRONMENT"

# Function to validate prerequisites
validate_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    MIN_VERSION="18.0.0"
    
    if [[ $(printf '%s\n' "$MIN_VERSION" "$NODE_VERSION" | sort -V | head -n1) != "$MIN_VERSION" ]]; then
        echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to v18 or higher."
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is not installed."
        exit 1
    fi
    
    echo "✅ Prerequisites validated successfully"
}

# Function to install dependencies
install_dependencies() {
    echo "📦 Installing dependencies..."
    
    # Install root dependencies
    npm install
    
    # Install server dependencies
    cd server
    npm install
    cd ..
    
    # Install client dependencies
    cd client
    npm install
    cd ..
    
    echo "✅ Dependencies installed successfully"
}

# Function to build the client
build_client() {
    echo "🔨 Building client application..."
    
    cd client
    npm run build
    cd ..
    
    echo "✅ Client built successfully"
}

# Function to set environment variables based on environment
setup_environment() {
    echo "⚙️ Setting up environment: $ENVIRONMENT"
    
    case $ENVIRONMENT in
        "production")
            echo "Setting up production environment..."
            if [ ! -f "server/.env.production" ]; then
                echo "❌ Production environment file not found. Create server/.env.production"
                exit 1
            fi
            cp server/.env.production server/.env
            ;;
        "staging")
            echo "Setting up staging environment..."
            if [ ! -f "server/.env.staging" ]; then
                echo "❌ Staging environment file not found. Create server/.env.staging"
                exit 1
            fi
            cp server/.env.staging server/.env
            ;;
        "local")
            echo "Setting up local development environment..."
            if [ ! -f "server/.env.local" ]; then
                echo "❌ Local environment file not found. Create server/.env.local"
                exit 1
            fi
            cp server/.env.local server/.env
            ;;
        *)
            echo "❌ Unknown environment: $ENVIRONMENT"
            usage
            ;;
    esac
    
    echo "✅ Environment setup completed"
}

# Function to start the application
start_application() {
    echo "🚀 Starting application..."
    
    cd server
    
    if [ "$ENVIRONMENT" = "local" ]; then
        echo "Starting in development mode..."
        npm run dev &
    else
        echo "Starting in production mode..."
        npm start &
    fi
    
    # Store the PID of the background process
    APP_PID=$!
    
    # Wait for the app to start
    sleep 5
    
    # Check if the app is running
    if kill -0 $APP_PID 2>/dev/null; then
        echo "✅ Application started successfully (PID: $APP_PID)"
        echo "🌐 Application is running at: http://localhost:5000"
        echo "📊 Health check: http://localhost:5000/api/health"
    else
        echo "❌ Failed to start application"
        exit 1
    fi
    
    # Keep the script running
    wait $APP_PID
}

# Function to run tests before deployment
run_pre_deployment_tests() {
    echo "🧪 Running pre-deployment tests..."
    
    # Run basic tests to ensure everything works
    cd server
    npm test || {
        echo "❌ Tests failed. Aborting deployment."
        exit 1
    }
    cd ..
    
    echo "✅ Pre-deployment tests passed"
}

# Function to create production build
create_production_build() {
    echo "🏭 Creating production build..."
    
    # Build the client for production
    build_client
    
    # Create a production-ready package
    if [ ! -d "dist" ]; then
        mkdir dist
    fi
    
    # Copy necessary files to dist directory
    cp -r server dist/
    cp -r client/dist dist/client_dist
    cp package*.json dist/
    cp README.md dist/
    cp DEPLOYMENT.md dist/
    
    echo "✅ Production build created in ./dist directory"
}

# Main deployment flow
main() {
    validate_prerequisites
    
    case $ENVIRONMENT in
        "production"|"staging")
            run_pre_deployment_tests
            setup_environment
            create_production_build
            ;;
        "local")
            setup_environment
            install_dependencies
            build_client
            ;;
    esac
    
    start_application
}

# Run the main function
main "$@"