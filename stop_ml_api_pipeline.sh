#!/bin/bash

# Stop ML API + Spark Streaming Pipeline

echo "🛑 Stopping ML API + Spark Streaming Pipeline"
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to stop process by PID
stop_process() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 $pid 2>/dev/null; then
            echo -e "${BLUE}🛑 Stopping $service_name (PID: $pid)...${NC}"
            kill $pid
            
            # Wait for graceful shutdown
            for i in {1..10}; do
                if ! kill -0 $pid 2>/dev/null; then
                    echo -e "${GREEN}✅ $service_name stopped gracefully${NC}"
                    rm -f "$pid_file"
                    return 0
                fi
                sleep 1
            done
            
            # Force kill if still running
            if kill -0 $pid 2>/dev/null; then
                echo -e "${YELLOW}⚠️ Force killing $service_name...${NC}"
                kill -9 $pid
                sleep 2
                if ! kill -0 $pid 2>/dev/null; then
                    echo -e "${GREEN}✅ $service_name force stopped${NC}"
                else
                    echo -e "${RED}❌ Failed to stop $service_name${NC}"
                fi
            fi
            rm -f "$pid_file"
        else
            echo -e "${YELLOW}⚠️ $service_name PID file exists but process not running${NC}"
            rm -f "$pid_file"
        fi
    else
        echo -e "${YELLOW}⚠️ No PID file found for $service_name${NC}"
    fi
}

# Stop Spark Streaming first
echo -e "${BLUE}🔄 Stopping services...${NC}"
stop_process ".spark_api.pid" "Spark Streaming"

# Stop ML API Service
stop_process ".ml_api.pid" "ML API Service"

# Kill any remaining Python processes related to our services
echo -e "${BLUE}🧹 Cleaning up remaining processes...${NC}"

# Find and kill ML API service processes
ML_API_PIDS=$(ps aux | grep "ml_api_service.py" | grep -v grep | awk '{print $2}')
if [ ! -z "$ML_API_PIDS" ]; then
    echo -e "${YELLOW}🔧 Killing remaining ML API processes: $ML_API_PIDS${NC}"
    echo $ML_API_PIDS | xargs kill 2>/dev/null
fi

# Find and kill Spark API processes
SPARK_API_PIDS=$(ps aux | grep "spark_with_api_calls.py" | grep -v grep | awk '{print $2}')
if [ ! -z "$SPARK_API_PIDS" ]; then
    echo -e "${YELLOW}🔧 Killing remaining Spark API processes: $SPARK_API_PIDS${NC}"
    echo $SPARK_API_PIDS | xargs kill 2>/dev/null
fi

# Check for any remaining Spark processes
SPARK_PIDS=$(ps aux | grep "SparkWithMLAPI" | grep -v grep | awk '{print $2}')
if [ ! -z "$SPARK_PIDS" ]; then
    echo -e "${YELLOW}🔧 Killing remaining Spark processes: $SPARK_PIDS${NC}"
    echo $SPARK_PIDS | xargs kill 2>/dev/null
fi

# Wait a moment for cleanup
sleep 2

# Verify services are stopped
echo -e "${BLUE}🔍 Verifying services are stopped...${NC}"

# Check ML API port
API_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8090/health 2>/dev/null)
if [ "$API_CHECK" = "000" ] || [ -z "$API_CHECK" ]; then
    echo -e "${GREEN}✅ ML API Service (port 8090) is stopped${NC}"
else
    echo -e "${YELLOW}⚠️ ML API Service may still be running (HTTP: $API_CHECK)${NC}"
fi

# Check Spark UI port
SPARK_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4040 2>/dev/null)
if [ "$SPARK_CHECK" = "000" ] || [ -z "$SPARK_CHECK" ]; then
    echo -e "${GREEN}✅ Spark UI (port 4040) is stopped${NC}"
else
    echo -e "${YELLOW}⚠️ Spark UI may still be running (HTTP: $SPARK_CHECK)${NC}"
fi

# Clean up checkpoint directories (optional)
echo -e "${BLUE}🧹 Cleaning up temporary files...${NC}"
if [ -d "spark-api-checkpoints" ]; then
    echo -e "${YELLOW}🗂️ Removing Spark checkpoints...${NC}"
    rm -rf spark-api-checkpoints
fi

# Clean up PID files
rm -f .ml_api.pid .spark_api.pid

# Show log file locations for debugging
echo ""
echo -e "${BLUE}📁 Log files available for review:${NC}"
if [ -f "logs/ml_api_service.log" ]; then
    echo -e "${YELLOW}   🤖 ML API: logs/ml_api_service.log${NC}"
fi
if [ -f "logs/spark_api_streaming.log" ]; then
    echo -e "${YELLOW}   ⚡ Spark: logs/spark_api_streaming.log${NC}"
fi
if [ -f "logs/model_training.log" ]; then
    echo -e "${YELLOW}   📚 Training: logs/model_training.log${NC}"
fi

echo ""
echo -e "${GREEN}🎉 ML API + Spark Streaming Pipeline Stopped!${NC}"
echo -e "${BLUE}💡 To restart: ./start_ml_api_pipeline.sh${NC}"
echo -e "${BLUE}📊 Models remain saved in models/ directory${NC}" 