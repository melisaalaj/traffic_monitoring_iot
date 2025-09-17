#!/bin/bash

echo "🚀 Setting up React Dashboard for Prishtina Traffic Monitoring"
echo "============================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first:"
    echo "   Visit: https://nodejs.org/"
    echo "   Or use: brew install node (macOS) or apt install nodejs npm (Linux)"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node -v)"
    echo "   Please update Node.js"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing React dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Build the React app for production
echo "🔨 Building React application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build React application"
    exit 1
fi

echo "✅ React application built successfully"

# Update Flask dashboard to serve React build
echo "🔧 Updating Flask server to serve React application..."

# Create backup of original dashboard
cp dashboard.py dashboard_html_backup.py

cat > dashboard_react.py << 'EOF'
#!/usr/bin/env python3
"""
Enhanced Web Dashboard for 60 IoT Traffic Sensors - React Version
Serves the React build and imports API endpoints from separate file
"""

from flask import Flask, send_from_directory, send_file
from api_endpoints import api_bp
import os

app = Flask(__name__, static_folder='build/static')

# Register API Blueprint
app.register_blueprint(api_bp)

# Serve React App
@app.route('/')
def serve_react_app():
    """Serve the React application"""
    return send_file('build/index.html')

@app.route('/<path:path>')
def serve_react_static(path):
    """Serve React static files"""
    if path.startswith('static/'):
        return send_from_directory('build', path)
    else:
        # For React Router - serve index.html for all non-API routes
        return send_file('build/index.html')

# All API routes are now handled by the api_endpoints.py Blueprint

if __name__ == '__main__':
    print("🚀 Starting React-powered IoT Traffic Dashboard for 60 sensors...")
    print("📊 Open your browser and go to: http://localhost:5002")
    print("🔄 Dashboard will show real-time data with React components")
    app.run(host='0.0.0.0', port=5002, debug=False)
EOF

echo "✅ Flask server updated for React"

echo ""
echo "🎉 React Dashboard Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "   1. Stop your current dashboard: Ctrl+C in the terminal running dashboard.py"
echo "   2. Start the React-powered dashboard: python3 dashboard_react.py"
echo "   3. Open your browser to: http://localhost:5002"
echo ""
echo "🔄 Development Mode:"
echo "   • For development with hot reload: npm start (runs on port 3000)"
echo "   • For production: Use dashboard_react.py (serves built React app on port 5002)"
echo ""
echo "📁 Files Created:"
echo "   • dashboard_react.py - Flask server for React app"
echo "   • dashboard_html_backup.py - Backup of original HTML dashboard"
echo "   • build/ - Production React build"
echo "" 