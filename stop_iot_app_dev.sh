#!/bin/bash

echo "🛑 Stopping IoT Traffic Monitoring System - DEVELOPMENT MODE"
echo ""

# Function to stop process by PID file
stop_process() {
    local name=$1
    local pid_file=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo "🔄 Stopping $name (PID: $pid)..."
            kill "$pid"
            sleep 2
            
            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                echo "⚠️  Force killing $name..."
                kill -9 "$pid" 2>/dev/null
            fi
            echo "✅ $name stopped"
        else
            echo "⚠️  $name process (PID: $pid) not found"
        fi
        rm -f "$pid_file"
    else
        echo "⚠️  $name PID file not found"
    fi
}

# Stop all components
stop_process "React Dev Server" ".react_dev.pid"
stop_process "API Server" ".api_dev.pid"
stop_process "Streaming Pipeline" ".pipeline_dev.pid"
stop_process "Data Simulator" ".simulator_dev.pid"

# Additional cleanup - kill any remaining processes
echo ""
echo "🧹 Cleaning up any remaining processes..."

# Kill any remaining processes
pkill -f "npm start" 2>/dev/null
pkill -f "react-scripts start" 2>/dev/null
pkill -f "api_endpoints.py" 2>/dev/null
pkill -f "enhanced_streaming_pipeline.py" 2>/dev/null
pkill -f "realistic_simulator_60.py" 2>/dev/null

echo ""
echo "✅ IoT Traffic Monitoring System - DEVELOPMENT MODE stopped!"
echo ""
echo "📋 System Status:"
echo "   • React Dev Server: Stopped"
echo "   • API Server: Stopped"
echo "   • Streaming Pipeline: Stopped"
echo "   • Data Simulator: Stopped"
echo ""
echo "💡 To restart in development mode:"
echo "   ./start_iot_app_dev.sh"
echo ""
echo "💡 To run in production mode:"
echo "   ./start_iot_app_v2.sh"
echo ""
echo "🔧 Services still running:"
echo "   • Kafka: $(pgrep -f 'kafka.Kafka' > /dev/null && echo 'Running' || echo 'Stopped')"
echo "   • Cassandra: $(pgrep -f 'cassandra' > /dev/null && echo 'Running' || echo 'Stopped')"
echo "" 