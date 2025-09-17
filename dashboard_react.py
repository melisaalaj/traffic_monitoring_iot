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
