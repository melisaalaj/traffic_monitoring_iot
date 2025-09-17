#!/bin/bash

echo "🚀 Starting IoT Traffic Monitoring System v2 - React Dashboard"
echo "📍 60 Sensors: 20 Traffic, 20 Air Quality, 20 Noise"
echo "⚛️  Modern React UI with separated API endpoints"
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

# Check if React build exists or if source files are newer
NEED_BUILD=false

if [ ! -d "build" ]; then
    echo "⚠️  React build not found. Building React application..."
    NEED_BUILD=true
elif [ -f "package.json" ] && [ "package.json" -nt "build" ]; then
    echo "⚠️  package.json updated. Rebuilding React application..."
    NEED_BUILD=true
elif [ -d "src" ] && [ "$(find src -name '*.js' -newer build 2>/dev/null | head -1)" ]; then
    echo "⚠️  Source files updated. Rebuilding React application..."
    NEED_BUILD=true
else
    echo "✅ React build is up to date"
fi

if [ "$NEED_BUILD" = true ]; then
    if [ -f "package.json" ]; then
        if ! command -v npm &> /dev/null; then
            echo "❌ npm not found. Please install Node.js first."
            exit 1
        fi
        echo "📦 Installing dependencies..."
        npm install --silent
        echo "🔨 Building React application..."
        npm run build
        echo "✅ React application built successfully"
    else
        echo "❌ package.json not found. Please run setup_react.sh first."
        exit 1
    fi
fi

# Check if API endpoints file exists
if [ ! -f "api_endpoints.py" ]; then
    echo "❌ api_endpoints.py not found. Please run setup_react.sh first."
    exit 1
fi

echo ""
echo "🔄 Starting components..."

# Start the realistic data simulator for 60 sensors
echo "🔄 Starting realistic data simulator for 60 sensors..."
python3 realistic_simulator_60.py &
SIMULATOR_PID=$!

# Wait a moment for simulator to start
sleep 3

# Start the enhanced streaming pipeline
echo "🔄 Starting enhanced streaming pipeline..."
python3 enhanced_streaming_pipeline.py &
PIPELINE_PID=$!

# Wait a moment for pipeline to start
sleep 3

# Start the React dashboard with API endpoints
echo "🔄 Starting React Dashboard with API endpoints..."
python3 dashboard_react.py &
DASHBOARD_PID=$!

# Wait a moment for dashboard to start
sleep 5

echo ""
echo "🎉 IoT Traffic Monitoring System v2 is now running!"
echo ""
echo "⚛️  React Dashboard: http://localhost:5002"
echo "📍 60 sensors across Prishtina with real-time data"
echo "🗺️ Interactive React map with modern UI"
echo "📈 Separated API endpoints for better architecture"
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
echo "🛑 To stop the system, run: ./stop_iot_app_v2.sh"
echo ""
echo "Process IDs:"
echo "  Simulator: $SIMULATOR_PID"
echo "  Pipeline:  $PIPELINE_PID"
echo "  Dashboard: $DASHBOARD_PID"

# Save PIDs for stop script
echo "$SIMULATOR_PID" > .simulator_v2.pid
echo "$PIPELINE_PID" > .pipeline_v2.pid
echo "$DASHBOARD_PID" > .dashboard_v2.pid

echo ""
echo "💡 Development Tips:"
echo "   • For hot reload development: npm start (port 3000)"
echo "   • API testing: curl http://localhost:5002/api/health"
echo "   • View logs: tail -f /tmp/kafka.log"
echo "" 