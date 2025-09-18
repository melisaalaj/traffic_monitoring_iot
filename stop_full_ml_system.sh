#!/bin/bash

echo "🛑 Stopping Full ML-Enhanced IoT Traffic Monitoring System"
echo "=========================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to stop process by PID file
stop_process() {
    local name=$1
    local pid_file=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${BLUE}🔄 Stopping $name (PID: $pid)...${NC}"
            kill "$pid"
            sleep 2
            
            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${YELLOW}⚠️  Force killing $name...${NC}"
                kill -9 "$pid" 2>/dev/null
            fi
            echo -e "${GREEN}✅ $name stopped${NC}"
        else
            echo -e "${YELLOW}⚠️  $name process (PID: $pid) not found${NC}"
        fi
        rm -f "$pid_file"
    else
        echo -e "${YELLOW}⚠️  $name PID file not found${NC}"
    fi
}

# Stop all components in reverse order
echo -e "${BLUE}🔄 Stopping system components...${NC}"

stop_process "React Dashboard" ".dashboard_full.pid"
stop_process "SMS Service" ".sms_full.pid"
stop_process "Alert Engine" ".alert_engine_full.pid"
stop_process "Spark ML Streaming" ".spark_ml.pid"
stop_process "Streaming Pipeline" ".pipeline_full.pid"
stop_process "Data Simulator" ".simulator_full.pid"
stop_process "ML API Service" ".ml_api.pid"

# Additional cleanup - kill any remaining processes
echo ""
echo -e "${BLUE}🧹 Cleaning up any remaining processes...${NC}"

# Kill any remaining Python processes related to our apps
pkill -f "dashboard_react.py" 2>/dev/null
pkill -f "sms_notification_service.py" 2>/dev/null
pkill -f "alert_engine.py" 2>/dev/null
pkill -f "spark_with_api_calls.py" 2>/dev/null
pkill -f "enhanced_streaming_pipeline.py" 2>/dev/null
pkill -f "realistic_simulator_60.py" 2>/dev/null
pkill -f "ml_api_service.py" 2>/dev/null

# Stop any Spark processes
pkill -f "SparkWithMLAPI" 2>/dev/null

echo ""
echo -e "${GREEN}✅ Full ML-Enhanced IoT Traffic Monitoring System stopped successfully!${NC}"
echo ""
echo -e "${BLUE}📋 System Status:${NC}"
echo -e "${RED}   • React Dashboard: Stopped${NC}"
echo -e "${RED}   • ML API Service: Stopped${NC}"
echo -e "${RED}   • Spark ML Streaming: Stopped${NC}"
echo -e "${RED}   • API Endpoints: Stopped${NC}"
echo -e "${RED}   • Streaming Pipeline: Stopped${NC}"
echo -e "${RED}   • Data Simulator: Stopped${NC}"
echo -e "${RED}   • Alert Engine: Stopped${NC}"
echo -e "${RED}   • SMS Service: Stopped${NC}"
echo ""
echo -e "${BLUE}💡 To restart the system:${NC}"
echo -e "${GREEN}   ./start_full_ml_system.sh${NC}"
echo ""
echo -e "${BLUE}🔧 Services still running:${NC}"
echo -e "   • Kafka: $(pgrep -f 'kafka.Kafka' > /dev/null && echo -e "${GREEN}Running${NC}" || echo -e "${RED}Stopped${NC}")"
echo -e "   • Cassandra: $(pgrep -f 'cassandra' > /dev/null && echo -e "${GREEN}Running${NC}" || echo -e "${RED}Stopped${NC}")"
echo ""
echo -e "${YELLOW}💡 Kafka and Cassandra are left running for reuse${NC}"
echo -e "${YELLOW}💡 To stop them: brew services stop kafka cassandra${NC}"
echo "" 