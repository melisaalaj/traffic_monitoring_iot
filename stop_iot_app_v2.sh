#!/bin/bash

echo "🛑 Stopping IoT Traffic Monitoring System v2 - React Dashboard"
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
stop_process "React Dashboard" ".dashboard_v2.pid"
stop_process "Streaming Pipeline" ".pipeline_v2.pid"
stop_process "Data Simulator" ".simulator_v2.pid"


# Stop alert components if they exist
if [ -f ".alert_engine_v2.pid" ] || [ -f ".sms_v2.pid" ]; then
    echo "🔄 Stopping alert system components..."
    stop_process "Alert Engine" ".alert_engine_v2.pid"
    stop_process "SMS Service" ".sms_v2.pid"
fi
stop_process "SMS Service" ".sms_v2.pid"

# Additional cleanup - kill any remaining processes
echo ""
echo "🧹 Cleaning up any remaining processes..."

# Kill any remaining Python processes related to our apps
pkill -f "dashboard_react.py" 2>/dev/null
pkill -f "enhanced_streaming_pipeline.py" 2>/dev/null
pkill -f "realistic_simulator_60.py" 2>/dev/null

pkill -f "alert_engine.py" 2>/dev/null
pkill -f "sms_notification_service.py" 2>/dev/null

pkill -f "sms_notification_service.py" 2>/dev/null

echo ""
echo "✅ IoT Traffic Monitoring System v2 stopped successfully!"
echo ""
echo "📋 System Status:"
echo "   • React Dashboard: Stopped"
echo "   • API Endpoints: Stopped"
echo "   • Streaming Pipeline: Stopped"
echo "   • Data Simulator: Stopped"

    echo "   • SMS Service: Stopped"
echo ""
echo "💡 To restart the system:"
echo "   ./start_iot_app_v2.sh"
echo ""
echo "🔧 Services still running:"
echo "   • Kafka: $(pgrep -f 'kafka.Kafka' > /dev/null && echo 'Running' || echo 'Stopped')"
echo "   • Cassandra: $(pgrep -f 'cassandra' > /dev/null && echo 'Running' || echo 'Stopped')"
echo "" 