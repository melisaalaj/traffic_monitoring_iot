#!/bin/bash


echo "🚀 Starting IoT Traffic Monitoring System v2 - React Dashboard"
echo "📍 60 Sensors: 20 Traffic, 20 Air Quality, 20 Noise"
echo "⚛️  Modern React UI with separated API endpoints"
echo ""

# Detect existing installations
detect_installations() {
    # Detect Kafka
    KAFKA_BIN=""
    KAFKA_DIR=""
    # Check for Homebrew Kafka first (without .sh extension)
    if command -v kafka-server-start >/dev/null 2>&1; then
        KAFKA_BIN=$(which kafka-server-start)
        KAFKA_DIR=$(dirname $(dirname "$KAFKA_BIN"))
    # Check for traditional installations with .sh extension
    elif command -v kafka-server-start.sh >/dev/null 2>&1; then
        KAFKA_BIN=$(which kafka-server-start.sh)
        KAFKA_DIR=$(dirname $(dirname "$KAFKA_BIN"))
    elif [ -f "/usr/local/kafka/bin/kafka-server-start.sh" ]; then
        KAFKA_BIN="/usr/local/kafka/bin/kafka-server-start.sh"
        KAFKA_DIR="/usr/local/kafka"
    elif [ -f "/opt/kafka/bin/kafka-server-start.sh" ]; then
        KAFKA_BIN="/opt/kafka/bin/kafka-server-start.sh"
        KAFKA_DIR="/opt/kafka"
    # Check Homebrew specific paths
    elif [ -f "/opt/homebrew/bin/kafka-server-start" ]; then
        KAFKA_BIN="/opt/homebrew/bin/kafka-server-start"
        KAFKA_DIR="/opt/homebrew/opt/kafka"
    else
        echo "❌ Kafka not found. Please install Kafka first."
        exit 1
    fi
    
    # Detect Cassandra
    CASSANDRA_BIN=""
    if command -v cassandra >/dev/null 2>&1; then
        CASSANDRA_BIN=$(which cassandra)
    elif [ -f "/usr/sbin/cassandra" ]; then
        CASSANDRA_BIN="/usr/sbin/cassandra"
    else
        echo "❌ Cassandra not found. Please install Cassandra first."
        exit 1
    fi
    
    echo "✅ Using Kafka at: $KAFKA_BIN"
    echo "✅ Using Cassandra at: $CASSANDRA_BIN"
}

# Check if Kafka is running
check_kafka() {
    if ! pgrep -f "kafka.Kafka" > /dev/null; then
        echo "❌ Kafka is not running. Starting Kafka..."
        cd "$KAFKA_DIR"
        
        # Start Zookeeper if not running
        if ! pgrep -f "zookeeper" > /dev/null; then
            echo "🔄 Starting Zookeeper..."
            nohup bin/zookeeper-server-start.sh config/zookeeper.properties > /tmp/zookeeper.log 2>&1 &
            sleep 5
        fi
        
        # Start Kafka
        echo "🔄 Starting Kafka..."
        nohup bin/kafka-server-start.sh config/server.properties > /tmp/kafka.log 2>&1 &
        sleep 10
    else
        echo "✅ Kafka is already running"
    fi
}

# Check if Cassandra is running
check_cassandra() {
    if ! pgrep -f "cassandra" > /dev/null; then
        echo "❌ Cassandra is not running. Please start Cassandra first."
        echo "   Run: sudo systemctl start cassandra"
        exit 1
    else
        echo "✅ Cassandra is running"
    fi
}

# Check if sensor data exists
check_sensor_data() {
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
}

# Check if React build exists or if source files are newer
check_react_build() {
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
            echo "❌ package.json not found. Please run setup first."
            exit 1
        fi
    fi
}

# Check if API endpoints file exists
check_api_endpoints() {
    if [ ! -f "api_endpoints.py" ]; then
        echo "❌ api_endpoints.py not found. Please run setup first."
        exit 1
    fi
}

# Main execution
main() {
    detect_installations
    check_kafka
    check_cassandra
    check_sensor_data
    check_react_build
    check_api_endpoints

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


    # Start Alert Engine

    echo ""
}

# Run main function
main "$@"
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
    echo "🚨 Alert system with SMS notifications active"
    echo ""
    echo "🔗 Available API Endpoints:"
    echo "   • GET /api/health - Health check"
    echo "   • GET /api/data - All sensor data + statistics"
    echo "   • GET /api/sensors/<id> - Single sensor data"
    echo "   • GET /api/sensors/type/<type> - Sensors by type"
    echo "   • GET /api/statistics - Overall statistics"
    echo "   • GET /api/table_data - Paginated table data"
    echo "   • GET /api/metadata - All sensor metadata"
    echo "   • GET /api/alerts/active - Active alerts"
    echo "   • GET /api/alerts/stats - Alert statistics"
    echo ""
    echo "🛑 To stop the system, run: ./stop_iot_app_v2.sh"
    echo ""
    echo "Process IDs:"
    echo "  Alert Engine: $ALERT_ENGINE_PID"
    echo "  SMS Service:  $SMS_PID"
    echo "  Simulator:    $SIMULATOR_PID"
    echo "  Pipeline:     $PIPELINE_PID"
    echo "  Dashboard:    $DASHBOARD_PID"

    # Save PIDs for stop script
    echo "$SIMULATOR_PID" > .simulator_v2.pid
    echo "$PIPELINE_PID" > .pipeline_v2.pid
    echo "$DASHBOARD_PID" > .dashboard_v2.pid
    echo "$ALERT_ENGINE_PID" > .alert_engine_v2.pid
    echo "$SMS_PID" > .sms_v2.pid

    echo ""
    echo "💡 Your detected configuration:"
    echo "   • Kafka: $KAFKA_BIN"
    echo "   • Cassandra: $CASSANDRA_BIN"
    echo "   • Java: $(java -version 2>&1 | head -n 1)"
    echo "   • Python: $(python3 --version)"
    if command -v node >/dev/null 2>&1; then
        echo "   • Node.js: $(node --version)"
    fi
    echo ""
}

# Run main function
main "$@"
