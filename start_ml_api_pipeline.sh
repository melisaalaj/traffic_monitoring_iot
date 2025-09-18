#!/bin/bash

# ML API + Spark Streaming Pipeline Startup Script
# Runs ML models as API service + Spark calls API for predictions

echo "🚀 Starting ML API + Spark Streaming Pipeline"
echo "=============================================="

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

# Create necessary directories
mkdir -p logs
mkdir -p models
mkdir -p spark-api-checkpoints

echo -e "${BLUE}🔧 Installing dependencies...${NC}"
pip3 install flask requests pyspark==3.5.0 scikit-learn joblib numpy

echo -e "${BLUE}🤖 Training AI Models (if not already trained)...${NC}"
if [ ! -f "models/traffic_classifier.pkl" ] || [ ! -f "models/traffic_patterns.pkl" ]; then
    echo -e "${YELLOW}   Training ML models...${NC}"
    python3 train_models_for_spark.py > logs/model_training.log 2>&1
    echo -e "${GREEN}   ✅ Models trained${NC}"
else
    echo -e "${GREEN}   ✅ Models already exist${NC}"
fi

echo -e "${BLUE}🌐 Starting ML API Service (port 8090)...${NC}"
python3 ml_api_service.py > logs/ml_api_service.log 2>&1 &
ML_API_PID=$!
echo "ML API Service PID: $ML_API_PID"

# Wait for ML API to start
echo -e "${BLUE}⏳ Waiting for ML API Service to start...${NC}"
sleep 10

# Test ML API health
echo -e "${BLUE}🩺 Testing ML API health...${NC}"
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8090/health)
if [ "$API_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ ML API Service is healthy${NC}"
else
    echo -e "${RED}❌ ML API Service health check failed (HTTP: $API_HEALTH)${NC}"
    echo -e "${YELLOW}💡 Check logs/ml_api_service.log for details${NC}"
fi

echo -e "${BLUE}⚡ Starting Spark Streaming with API calls...${NC}"
python3 spark_with_api_calls.py > logs/spark_api_streaming.log 2>&1 &
SPARK_PID=$!
echo "Spark Streaming PID: $SPARK_PID"

# Save PIDs for stopping later
echo "$ML_API_PID" > .ml_api.pid
echo "$SPARK_PID" > .spark_api.pid

echo ""
echo -e "${GREEN}🎉 ML API + Spark Streaming Pipeline Started!${NC}"
echo "=============================================="
echo -e "${BLUE}📊 Architecture:${NC}"
echo "   🤖 ML API Service: Flask server with trained models"
echo "   ⚡ Spark Streaming: HTTP calls to ML API for predictions"
echo "   🔄 Real-time: Micro-batch processing every 20 seconds"
echo ""
echo -e "${BLUE}🔗 Access Points:${NC}"
echo "   🤖 ML API Health: http://localhost:8090/health"
echo "   📊 ML Model Info: http://localhost:8090/models/info"
echo "   🌐 Spark UI: http://localhost:4040"
echo ""
echo -e "${BLUE}🤖 ML Models Available:${NC}"
echo "   🔍 K-Means Clustering: Pattern discovery"
echo "   🎯 Random Forest: Traffic classification"
echo "   🚨 Isolation Forest: Anomaly detection"
echo ""
echo -e "${BLUE}🌐 API Endpoints:${NC}"
echo "   POST /predict - Single prediction"
echo "   POST /predict/batch - Batch predictions"
echo "   GET /models/info - Model information"
echo ""
echo -e "${BLUE}📋 Example API Call:${NC}"
echo '   curl -X POST http://localhost:8090/predict \'
echo '        -H "Content-Type: application/json" \'
echo '        -d '\''{"vehicle_count": 25, "avg_speed": 35, "wait_time_s": 20}'\'''
echo ""
echo -e "${BLUE}📁 Log Files:${NC}"
echo "   🤖 ML API: logs/ml_api_service.log"
echo "   ⚡ Spark Streaming: logs/spark_api_streaming.log"
echo "   📚 Model Training: logs/model_training.log"
echo ""
echo -e "${YELLOW}💡 To stop: ./stop_ml_api_pipeline.sh${NC}"
echo -e "${YELLOW}💡 Monitor API: tail -f logs/ml_api_service.log${NC}"
echo -e "${YELLOW}💡 Monitor Spark: tail -f logs/spark_api_streaming.log${NC}"
echo ""

# Monitor startup for 30 seconds
echo -e "${BLUE}🔍 Monitoring startup (30 seconds)...${NC}"
for i in {1..30}; do
    echo -n "."
    sleep 1
done
echo ""

# Check if processes are still running
if kill -0 $ML_API_PID 2>/dev/null; then
    echo -e "${GREEN}✅ ML API Service is running${NC}"
else
    echo -e "${RED}❌ ML API Service failed to start${NC}"
fi

if kill -0 $SPARK_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Spark Streaming is running${NC}"
else
    echo -e "${RED}❌ Spark Streaming failed to start${NC}"
fi

# Final API health check
echo -e "${BLUE}🩺 Final API health check...${NC}"
FINAL_HEALTH=$(curl -s http://localhost:8090/health 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
if [ "$FINAL_HEALTH" = "healthy" ]; then
    echo -e "${GREEN}✅ ML API Service is healthy and ready${NC}"
    
    # Show model info
    echo -e "${BLUE}🤖 Loaded Models:${NC}"
    curl -s http://localhost:8090/models/info 2>/dev/null | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    for comp, info in data.get('components', {}).items():
        print(f'   {info[\"algorithm\"]}: {info[\"description\"]}')
except:
    print('   Could not retrieve model info')
"
else
    echo -e "${YELLOW}⚠️ ML API Service may not be fully ready${NC}"
fi

echo ""
echo -e "${GREEN}⚡ ML API + Spark Pipeline is ready!${NC}"
echo -e "${BLUE}🤖 Trained ML models serving predictions via HTTP API${NC}"
echo -e "${BLUE}⚡ Spark Streaming calling API for real-time AI classification${NC}"
echo -e "${YELLOW}📊 Monitor real-time predictions in the logs!${NC}" 