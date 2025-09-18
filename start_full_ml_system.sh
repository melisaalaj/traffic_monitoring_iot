#!/bin/bash

# Full ML-Enhanced IoT Traffic Monitoring System
# Combines Spark ML Pipeline + React Dashboard + Full IoT System

echo "🚀 Starting Full ML-Enhanced IoT Traffic Monitoring System"
echo "=========================================================="
echo "📊 Architecture: IoT Sensors → Kafka → Spark ML → Cassandra → React Dashboard"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Set Java 17 environment
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH

echo -e "${BLUE}☕ Using Java version:${NC}"
java -version
echo ""

# Detect existing installations (from start_iot_app_v2.sh)
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
        echo -e "${RED}❌ Kafka not found. Please install Kafka first.${NC}"
        exit 1
    fi
    
    # Detect Cassandra
    CASSANDRA_BIN=""
    if command -v cassandra >/dev/null 2>&1; then
        CASSANDRA_BIN=$(which cassandra)
    elif [ -f "/usr/sbin/cassandra" ]; then
        CASSANDRA_BIN="/usr/sbin/cassandra"
    else
        echo -e "${RED}❌ Cassandra not found. Please install Cassandra first.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Using Kafka at: $KAFKA_BIN${NC}"
    echo -e "${GREEN}✅ Using Cassandra at: $CASSANDRA_BIN${NC}"
}

# Check if Kafka is running
check_kafka() {
    if ! pgrep -f "kafka.Kafka" > /dev/null; then
        echo -e "${RED}❌ Kafka is not running but is required.${NC}"
        echo -e "${YELLOW}💡 Please start Kafka first with: brew services start kafka${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ Kafka is already running${NC}"
    fi
}

# Check if Cassandra is running
check_cassandra() {
    if ! pgrep -f "cassandra" > /dev/null; then
        echo -e "${RED}❌ Cassandra is not running but is required.${NC}"
        echo -e "${YELLOW}💡 Please start Cassandra first with: brew services start cassandra${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ Cassandra is running${NC}"
    fi
}

# Main execution
echo -e "${BLUE}🔍 Detecting installations...${NC}"
detect_installations
check_kafka
check_cassandra

# Create necessary directories
echo -e "${BLUE}📁 Creating directories...${NC}"
mkdir -p logs
mkdir -p models
mkdir -p spark-api-checkpoints

# Install Python dependencies
echo -e "${BLUE}🔧 Installing Python dependencies...${NC}"
pip3 install flask requests pyspark==3.5.0 scikit-learn joblib numpy cassandra-driver kafka-python

# Train AI Models if needed
echo -e "${BLUE}🤖 Checking AI Models...${NC}"
if [ ! -f "models/traffic_classifier.pkl" ] || [ ! -f "models/traffic_patterns.pkl" ]; then
    echo -e "${YELLOW}   Training ML models...${NC}"
    python3 train_models_for_spark.py > logs/model_training.log 2>&1
    echo -e "${GREEN}   ✅ Models trained${NC}"
else
    echo -e "${GREEN}   ✅ Models already exist${NC}"
fi

# Setup Cassandra schema if needed
echo -e "${BLUE}💾 Setting up Cassandra schema...${NC}"
python3 setup_cassandra.py > logs/cassandra_setup.log 2>&1
echo -e "${GREEN}   ✅ Cassandra schema ready${NC}"

# Setup Kafka topics if needed
echo -e "${BLUE}📡 Setting up Kafka topics...${NC}"
python3 setup_kafka_topics.py > logs/kafka_setup.log 2>&1
echo -e "${GREEN}   ✅ Kafka topics ready${NC}"

# Populate sensor metadata if needed
echo -e "${BLUE}🔍 Checking sensor metadata...${NC}"
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
    echo -e "${YELLOW}   Populating with 60 sensors...${NC}"
    python3 populate_sensors.py > logs/sensor_population.log 2>&1
    echo -e "${GREEN}   ✅ Sensor metadata populated${NC}"
else
    echo -e "${GREEN}   ✅ Found $SENSOR_COUNT sensors in database${NC}"
fi

# Build React application if needed
echo -e "${BLUE}⚛️  Checking React build...${NC}"
NEED_BUILD=false

if [ ! -d "build" ]; then
    echo -e "${YELLOW}   React build not found. Building...${NC}"
    NEED_BUILD=true
elif [ -f "package.json" ] && [ "package.json" -nt "build" ]; then
    echo -e "${YELLOW}   package.json updated. Rebuilding...${NC}"
    NEED_BUILD=true
elif [ -d "src" ] && [ "$(find src -name '*.js' -newer build 2>/dev/null | head -1)" ]; then
    echo -e "${YELLOW}   Source files updated. Rebuilding...${NC}"
    NEED_BUILD=true
else
    echo -e "${GREEN}   ✅ React build is up to date${NC}"
fi

if [ "$NEED_BUILD" = true ]; then
    if [ -f "package.json" ]; then
        if ! command -v npm &> /dev/null; then
            echo -e "${RED}❌ npm not found. Please install Node.js first.${NC}"
            exit 1
        fi
        echo -e "${BLUE}📦 Installing dependencies...${NC}"
        npm install --silent
        echo -e "${BLUE}🔨 Building React application...${NC}"
        npm run build
        echo -e "${GREEN}✅ React application built successfully${NC}"
    else
        echo -e "${RED}❌ package.json not found.${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}🚀 Starting ML-Enhanced IoT System Components...${NC}"
echo "=================================================="

# 1. Start ML API Service
echo -e "${BLUE}🤖 Starting ML API Service (port 8090)...${NC}"
python3 ml_api_service.py > logs/ml_api_service.log 2>&1 &
ML_API_PID=$!
echo "   ML API Service PID: $ML_API_PID"

# Wait for ML API to start
echo -e "${BLUE}⏳ Waiting for ML API Service to start...${NC}"
sleep 10

# Test ML API health
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8090/health)
if [ "$API_HEALTH" = "200" ]; then
    echo -e "${GREEN}   ✅ ML API Service is healthy${NC}"
else
    echo -e "${YELLOW}   ⚠️ ML API Service may not be fully ready (HTTP: $API_HEALTH)${NC}"
fi

# 2. Start the realistic data simulator for 60 sensors
echo -e "${BLUE}📊 Starting realistic data simulator for 60 sensors...${NC}"
python3 realistic_simulator_60.py > logs/data_simulator.log 2>&1 &
SIMULATOR_PID=$!
echo "   Data Simulator PID: $SIMULATOR_PID"
sleep 3

# 3. Start the enhanced streaming pipeline (original Kafka-based)
echo -e "${BLUE}⚡ Starting enhanced streaming pipeline...${NC}"
python3 enhanced_streaming_pipeline.py > logs/streaming_pipeline.log 2>&1 &
PIPELINE_PID=$!
echo "   Streaming Pipeline PID: $PIPELINE_PID"
sleep 3

# 4. Start Spark Streaming with ML API calls
echo -e "${BLUE}🔥 Starting Spark Streaming with ML API integration...${NC}"
python3 spark_with_api_calls.py > logs/spark_ml_streaming.log 2>&1 &
SPARK_PID=$!
echo "   Spark ML Streaming PID: $SPARK_PID"
sleep 5

# 5. Start Alert Engine
echo -e "${BLUE}🚨 Starting Alert Engine...${NC}"
python3 alert_engine.py > logs/alert_engine.log 2>&1 &
ALERT_ENGINE_PID=$!
echo "   Alert Engine PID: $ALERT_ENGINE_PID"
sleep 3

# 6. Start SMS Notification Service
echo -e "${BLUE}📱 Starting SMS Notification Service...${NC}"
python3 sms_notification_service.py > logs/sms_service.log 2>&1 &
SMS_PID=$!
echo "   SMS Service PID: $SMS_PID"
sleep 2

# 7. Start the React dashboard with API endpoints
echo -e "${BLUE}⚛️  Starting React Dashboard with API endpoints...${NC}"
python3 dashboard_react.py > logs/react_dashboard.log 2>&1 &
DASHBOARD_PID=$!
echo "   React Dashboard PID: $DASHBOARD_PID"
sleep 5

# Save PIDs for stop script
echo "$ML_API_PID" > .ml_api.pid
echo "$SIMULATOR_PID" > .simulator_full.pid
echo "$PIPELINE_PID" > .pipeline_full.pid
echo "$SPARK_PID" > .spark_ml.pid
echo "$ALERT_ENGINE_PID" > .alert_engine_full.pid
echo "$SMS_PID" > .sms_full.pid
echo "$DASHBOARD_PID" > .dashboard_full.pid

echo ""
echo -e "${GREEN}🎉 Full ML-Enhanced IoT Traffic Monitoring System is now running!${NC}"
echo "=================================================================="
echo ""
echo -e "${BLUE}🌐 Access Points:${NC}"
echo -e "${GREEN}   ⚛️  React Dashboard: http://localhost:5002${NC}"
echo -e "${GREEN}   🤖 ML API Service: http://localhost:8090/health${NC}"
echo -e "${GREEN}   📊 ML Model Info: http://localhost:8090/models/info${NC}"
echo -e "${GREEN}   🔥 Spark UI: http://localhost:4040${NC}"
echo ""
echo -e "${BLUE}📊 System Architecture:${NC}"
echo "   📡 60 IoT Sensors → Kafka Topics"
echo "   ⚡ Enhanced Streaming → Real-time Processing → Cassandra"
echo "   🔥 Spark Streaming → ML API → AI Predictions"
echo "   🚨 Alert Engine → SMS Notifications"
echo "   ⚛️  React Dashboard → Interactive Visualization"
echo ""
echo -e "${BLUE}🤖 ML Features Available:${NC}"
echo "   🔍 K-Means Clustering: Pattern discovery"
echo "   🎯 Random Forest: Traffic classification"
echo "   🚨 Isolation Forest: Anomaly detection"
echo "   📊 Real-time AI predictions integrated into dashboard"
echo ""
echo -e "${BLUE}🔗 API Endpoints:${NC}"
echo "   • GET /api/health - Health check"
echo "   • GET /api/data - All sensor data + statistics"
echo "   • GET /api/sensors/<id> - Single sensor data"
echo "   • GET /api/sensors/type/<type> - Sensors by type"
echo "   • GET /api/statistics - Overall statistics"
echo "   • GET /api/table_data - Paginated table data"
echo "   • GET /api/metadata - All sensor metadata"
echo "   • GET /api/alerts/active - Active alerts"
echo "   • GET /api/alerts/stats - Alert statistics"
echo "   • POST /predict - ML predictions (port 8090)"
echo ""
echo -e "${BLUE}📁 Log Files:${NC}"
echo "   🤖 ML API: logs/ml_api_service.log"
echo "   🔥 Spark ML: logs/spark_ml_streaming.log"
echo "   ⚡ Streaming: logs/streaming_pipeline.log"
echo "   📊 Simulator: logs/data_simulator.log"
echo "   🚨 Alerts: logs/alert_engine.log"
echo "   ⚛️  Dashboard: logs/react_dashboard.log"
echo ""
echo -e "${YELLOW}💡 To stop the system: ./stop_full_ml_system.sh${NC}"
echo -e "${YELLOW}💡 Monitor ML API: tail -f logs/ml_api_service.log${NC}"
echo -e "${YELLOW}💡 Monitor Spark: tail -f logs/spark_ml_streaming.log${NC}"
echo -e "${YELLOW}💡 Monitor Dashboard: tail -f logs/react_dashboard.log${NC}"
echo ""
echo -e "${GREEN}🚀 System fully operational with ML-enhanced real-time analytics!${NC}" 