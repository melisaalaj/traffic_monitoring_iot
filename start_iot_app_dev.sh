#!/bin/bash


echo ""
echo "🚀 Starting IoT Traffic Monitoring System - DEVELOPMENT MODE"
echo "📍 60 Sensors: 20 Traffic, 20 Air Quality, 20 Noise"
echo "⚛️  React Development Server with Hot Reload"
echo ""

# Check if Kafka is running
if ! pgrep -f "kafka.Kafka" > /dev/null; then
    echo "❌ Kafka is not running. Please start Kafka first."
    echo "   Run: sudo systemctl start kafka (Linux) or brew services start kafka (macOS)"
    exit 1
fi

# Check if Cassandra is running
if ! pgrep -f "cassandra" > /dev/null; then
    echo "❌ Cassandra is not running. Please start Cassandra first."
    echo "   Run: sudo systemctl start cassandra (Linux) or brew services start cassandra (macOS)"
    exit 1
fi

echo "✅ Kafka and Cassandra are running"

# Check if sensor data exists
echo "🔍 Checking sensor metadata..."
SENSOR_COUNT=$(python3 -c "
try:
    from cassandra.cluster import Cluster
    cluster = Cluster(['127.0.0.1'], port=9042)
    session = cluster.connect('traffic')
    result = session.execute('SELECT COUNT(*) FROM sensor_metadata')
    print(result.one().count)
    cluster.shutdown()
except Exception as e:
    print('0')
" 2>/dev/null)

if [ "$SENSOR_COUNT" -eq 0 ]; then
    echo "⚠️  No sensor metadata found. Populating with 60 sensors..."
    if [ -f "populate_sensors.py" ]; then
        python3 populate_sensors.py
        echo "✅ Sensor metadata populated"
    else
        echo "❌ populate_sensors.py not found. Please run setup first."
        exit 1
    fi
else
    echo "✅ Found $SENSOR_COUNT sensors in database"
fi

# Check if API endpoints file exists
if [ ! -f "api_endpoints.py" ]; then
    echo "❌ api_endpoints.py not found. Please run setup_react.sh first."
    exit 1
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run setup_react.sh first."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo "📦 Installing/updating dependencies..."
    npm install
fi

echo ""
echo "🔄 Starting components..."

# Start the realistic data simulator for 60 sensors
echo "🔄 Starting realistic data simulator for 60 sensors..."
python3 realistic_simulator_60.py &
SIMULATOR_PID=$!

# Wait a moment for simulator to start
sleep 3

# Start Alert Engine
echo "🔄 Starting Alert Engine..."
python3 alert_engine.py &
ALERT_ENGINE_PID=$!
sleep 3

# Start SMS Notification Service
echo "🔄 Starting SMS Notification Service..."
python3 sms_notification_service.py &
SMS_PID=$!
sleep 2

# Start the enhanced streaming pipeline
echo "🔄 Starting enhanced streaming pipeline..."
python3 enhanced_streaming_pipeline.py &
PIPELINE_PID=$!

# Wait a moment for pipeline to start
sleep 3

# Start Alert Engine
echo "🔄 Starting Alert Engine..."
python3 alert_engine.py &
ALERT_ENGINE_PID=$!
sleep 3

# Start SMS Notification Service
echo "🔄 Starting SMS Notification Service..."
python3 sms_notification_service.py &
SMS_PID=$!
sleep 2


echo "🔄 Starting SMS Notification Service..."
        python3 sms_notification_service.py &
        SMS_PID=$!
        sleep 2
    fi
# Start the API server (Flask backend)
echo "🔄 Starting API server (Flask backend)..."
FLASK_RUN_PORT=5010 python3 -c "
from api_endpoints import app
app.run(host='0.0.0.0', port=5010, debug=False)
" &
API_PID=$!

# Wait a moment for API to start
sleep 3

# Start Alert Engine
echo "🔄 Starting Alert Engine..."
python3 alert_engine.py &
ALERT_ENGINE_PID=$!
sleep 3

# Start SMS Notification Service
echo "🔄 Starting SMS Notification Service..."
python3 sms_notification_service.py &
SMS_PID=$!
sleep 2

# Start React development server
echo "🔄 Starting React development server with hot reload..."
echo "📱 React Dev Server will open automatically in your browser"
npm start &
REACT_PID=$!

# Wait a moment for React dev server to start
sleep 5

echo ""
echo "🎉 IoT Traffic Monitoring System - DEVELOPMENT MODE is running!"
echo ""
echo "⚛️  React Dev Server: http://localhost:3000 (with hot reload)"
echo "🔗 API Server: http://localhost:5010"
echo "📍 60 sensors across Prishtina with real-time data"
echo "🔄 Hot Reload: Changes to React components update instantly"
echo ""
echo "🔗 Available API Endpoints:"
echo "   • GET /api/health - Health check"
echo "   • GET /api/data - All sensor data + statistics"
echo "   • GET /api/sensors/<id> - Single sensor data"
echo "   • GET /api/sensors/type/<type> - Sensors by type"
echo "   • GET /api/statistics - Overall statistics"
echo "   • GET /api/table_data - Paginated table data"
echo "   • GET /api/metadata - All sensor metadata"
echo ""
echo "🛑 To stop the system, run: ./stop_iot_app_dev.sh"
echo ""
echo "Process IDs:"
echo "  Simulator: $SIMULATOR_PID"
echo "  Pipeline:  $PIPELINE_PID"
echo "  API Server: $API_PID"
echo "  React Dev:  $REACT_PID"

# Save PIDs for stop script
echo "$SIMULATOR_PID" > .simulator_dev.pid
echo "$PIPELINE_PID" > .pipeline_dev.pid
echo "$API_PID" > .api_dev.pid
echo "$REACT_PID" > .react_dev.pid

echo ""
echo "💡 Development Features:"
echo "   • Hot reload: Edit React components and see changes instantly"
echo "   • React DevTools: Available in browser"
echo "   • Console logging: Check browser console for debugging"
echo "   • API testing: curl http://localhost:5010/api/health"
echo "" 