#!/usr/bin/env python3
"""
Enhanced Web Dashboard for 60 IoT Traffic Sensors - React Version
Serves the React build and imports API endpoints from separate file
"""

from flask import Flask, send_from_directory, send_file
from api_endpoints import api_bp
from alert_endpoints import alert_bp
import os

app = Flask(__name__, static_folder='build/static')

# Register API Blueprint
app.register_blueprint(api_bp)

# Register Alert Blueprint directly (not through api_bp)
app.register_blueprint(alert_bp)

# Serve static files
@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serve React static files"""
    return send_from_directory('build/static', filename)

# Serve favicon and other root files
@app.route('/favicon.ico')
def serve_favicon():
    return send_from_directory('build', 'favicon.ico')

@app.route('/manifest.json')
def serve_manifest():
    return send_from_directory('build', 'manifest.json')

# Serve React App
@app.route('/')
def serve_react_app():
    """Serve the React application"""
    return send_file('build/index.html')

# For React Router - serve index.html for all other routes
@app.route('/<path:path>')
def serve_react_routes(path):
    """Serve React app for all other routes (React Router)"""
    return send_file('build/index.html')

if __name__ == '__main__':
    print("🚀 Starting React-powered IoT Traffic Dashboard for 60 sensors...")
    print("📊 Open your browser and go to: http://localhost:5002")
    print("🔄 Dashboard will show real-time data with React components")
    app.run(host='0.0.0.0', port=5002, debug=False)
