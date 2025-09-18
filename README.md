# Real-Time IoT Traffic Monitoring System with AI/ML Integration

A comprehensive real-time data processing and visualization system for IoT sensor data using **Apache Kafka**, **Apache Spark**, **Machine Learning APIs**, **Enhanced Streaming Processing**, **Apache Cassandra**, and **React Dashboard** with **AI-powered traffic predictions**.

## 🏗️ Architecture Overview

```
📊 IoT Sensors (60 Simulated Sensors)
   • Traffic Loops (20 sensors)
   • Air Quality (20 sensors) 
   • Noise Sensors (20 sensors)
    ↓
🚀 Apache Kafka (Message Queue)
    ↓  
⚡ Enhanced Streaming Processor + 🔥 Apache Spark ML Pipeline
   • Sliding Windows (10min + last 20 measurements)
   • Data Validation & Range Checking
   • Anomaly Detection (traffic spikes)
   • Real-time Aggregation (avg, min, max, count)
   • 🤖 AI Traffic Predictions (K-Means + Random Forest + Isolation Forest)
   • 🌐 ML API Service (Flask) - Real-time ML predictions
    ↓
💾 Apache Cassandra (Time-Series Database)
    ↓
🚨 Alert Engine
   • Real-time threshold monitoring
   • Warning & Critical alert generation
   • SMS notifications via Twilio
   • Alert storage and management
    ↓
🌐 Flask API Server (REST Endpoints + ML Endpoints)
    ↓
⚛️ React Dashboard (Real-time Visualization + AI Predictions)
   • Alert Dashboard
   • Interactive Maps (Leaflet)
   • Data Visualizations (Chart.js)
   • Traffic Monitoring
   • Sensor Analytics
   • 🤖 AI Traffic Predictions Dashboard
   • 🎯 ML-enhanced Sensor Cards
```

## ✨ Features

### 🔄 Real-Time Processing
- **Stream Processing**: Sub-second latency sensor data processing
- **Sliding Windows**: Time-based (10-minute) and measurement-based (last 20) windows
- **Data Validation**: Automatic range checking and error detection
- **Anomaly Detection**: Traffic spike detection and pattern analysis

### 🤖 AI/ML Integration
- **Apache Spark Streaming**: Real-time ML pipeline with micro-batch processing
- **Hybrid ML Models**: K-Means clustering + Random Forest classification + Isolation Forest anomaly detection
- **ML API Service**: Flask-based API serving trained models on port 8090
- **Real-time Predictions**: Traffic state classification (Free Flow, Light Traffic, Heavy Congestion, Gridlock)
- **Confidence Scoring**: AI prediction confidence levels (0-100%)
- **Anomaly Detection**: ML-powered traffic anomaly identification
- **Model Versioning**: Hybrid AI system with fallback mechanisms

### 📊 Interactive Dashboard
- **React Frontend**: Modern, responsive web interface
- **Real-time Updates**: Live data refresh every 30 seconds
- **Interactive Maps**: Click sensors to focus and filter
- **Data Visualizations**: Charts and graphs for all sensor types
- **Traffic Monitoring**: Dedicated traffic analytics with granular controls
- **🤖 AI Predictions Tab**: Comprehensive ML dashboard with prediction cards
- **🎯 ML-Enhanced Sensor Cards**: Real-time AI predictions displayed on sensor cards
- **🚨 Anomaly Indicators**: Visual alerts for ML-detected anomalies
- **📊 Confidence Metrics**: AI prediction accuracy visualization

### 🎛️ Advanced Analytics
- **Multi-Granularity Views**: 1min, 5min, 30min, 1hour, 1day intervals
- **Time Period Selection**: 1hour, 2days, 1week historical data
- **Sensor Rankings**: Top performers by traffic, speed, noise levels
- **Statistical Analysis**: Real-time aggregations and trends

### 🗄️ Scalable Storage

### 🚨 Alert System
- **Real-time Monitoring**: Continuous threshold checking for all sensor types
- **Configurable Thresholds**: Warning and critical levels for traffic, air quality, and noise
- **SMS Notifications**: Automatic SMS alerts via Twilio for critical conditions
- **Alert Dashboard**: Real-time alert visualization and management
- **Multi-sensor Support**: Traffic loops, air quality, and noise sensors
- **Short Message Format**: Optimized for Twilio trial account limits

## 📋 Prerequisites

- **Operating System**: macOS (tested on 15.5) or Linux (Ubuntu 20.04+, CentOS 8+)
- **Package Manager**: Homebrew (macOS) or apt/yum (Linux)
- **Python 3.11+** with ML libraries (scikit-learn, joblib, numpy)
- **Node.js 16+** (for React dashboard)
- **Java 17+** (for Kafka, Cassandra, and Spark)
- **Apache Spark 3.5.0+** (for ML pipeline)
- **PySpark 3.5.0** (Python Spark integration)

## 🚀 Quick Start

### Automated Setup (Recommended)

The easiest way to get started is using our comprehensive setup script:

```bash
# Make the setup script executable
chmod +x setup_all.sh

# Run the automated setup (detects macOS/Linux automatically)
./setup_all.sh
```

This script will:
 - ✅ Configure Twilio SMS credentials (see Twilio SMS Setup below)
- ✅ Install Java, Kafka, and Cassandra
- ✅ Install Python dependencies
- ✅ Start all required services
- ✅ Create Kafka topics and Cassandra schema
- ✅ Populate 60 sensor metadata records
- ✅ Install Node.js dependencies for React dashboard
- ✅ Verify the complete setup

### Manual Setup (Alternative)

If you prefer manual installation, follow the detailed steps below:

#### Step 1: Install Services

**macOS (using Homebrew)**
```bash
# Install Apache Kafka 
brew install kafka

# Install Zookeeper
brew install zookeeper

# Install Apache Cassandra
brew install cassandra

# Install Node.js (for React dashboard)
brew install node

# Install Python packages (including ML libraries)
pip install kafka-python cassandra-driver confluent-kafka flask flask-cors pyspark==3.5.0 scikit-learn joblib numpy requests
```

**Linux (Ubuntu/Debian)**
```bash
# Update package list
sudo apt update

# Install Java 17 (required for Kafka and Cassandra)
sudo apt install openjdk-17-jdk

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Apache Kafka
wget https://downloads.apache.org/kafka/2.13-3.6.0/kafka_2.13-3.6.0.tgz
tar -xzf kafka_2.13-3.6.0.tgz
sudo mv kafka_2.13-3.6.0 /opt/kafka

# Install Apache Cassandra
echo "deb https://debian.cassandra.apache.org 40x main" | sudo tee -a /etc/apt/sources.list.d/cassandra.sources.list
curl https://downloads.apache.org/cassandra/KEYS | sudo apt-key add -
sudo apt update
sudo apt install cassandra

# Install Python packages (including ML libraries)
pip3 install kafka-python cassandra-driver confluent-kafka flask flask-cors pyspark==3.5.0 scikit-learn joblib numpy requests
```

#### Step 2: Setup Data Infrastructure

```bash
# Create Kafka topics
python3 setup_kafka_topics.py

# Create Cassandra schema
python3 setup_cassandra.py

# Populate sensor metadata (60 sensors)
python3 populate_sensors.py

# Install React dependencies
npm install
```

## 🎮 Running the Application

We provide multiple ways to run the application depending on your needs:

### 🤖 Full ML-Enhanced System (Recommended)

```bash
# Start the complete ML-enhanced IoT system
./start_full_ml_system.sh
```

**What this starts:**
- 🤖 **ML API Service**: Flask API serving trained models (port 8090)
- 📡 **Simulator**: Generates data for 60 sensors
- ⚡ **Streaming Pipeline**: Processes and stores data in real-time
- 🔥 **Spark ML Pipeline**: Real-time ML predictions with API calls
- 🚨 **Alert Engine**: Real-time threshold monitoring
- 📱 **SMS Service**: Twilio notifications
- 🌐 **Flask API Server**: Serves REST + ML endpoints (port 5002)
- ⚛️ **React Dashboard**: Production build with AI predictions (port 5002)

**Access the dashboard:** http://localhost:5002

### 🚀 Standard Production Mode

```bash
# Start the complete IoT application without ML features
./start_iot_app_v2.sh
```

**What this starts:**
- 📡 **Simulator**: Generates data for 60 sensors
- ⚡ **Streaming Pipeline**: Processes and stores data in real-time
- 🌐 **Flask API Server**: Serves REST endpoints (port 5002)
- ⚛️ **React Dashboard**: Production build (port 5002)

**Access the dashboard:** http://localhost:5002

### 🔬 ML Pipeline Only

```bash
# Start only the ML pipeline for testing
./start_ml_api_pipeline.sh
```

**What this starts:**
- 🤖 **ML API Service**: Flask API serving trained models (port 8090)
- 🔥 **Spark Streaming**: Real-time ML predictions

**Access ML API:** http://localhost:8090/health

### 🛠️ Development Mode (Hot Reload)

```bash
# Start the application in development mode
./start_iot_app_dev.sh
```

**What this starts:**
- 📡 **Simulator**: Generates data for 60 sensors
- ⚡ **Streaming Pipeline**: Processes and stores data in real-time
- 🌐 **Flask API Server**: Serves REST endpoints (port 5010)
- ⚛️ **React Dev Server**: Development with hot reload (port 3000)

**Access the dashboard:** http://localhost:3000

### 🛑 Stopping the Application

```bash
# Stop ML-enhanced system
./stop_full_ml_system.sh

# Stop standard production mode
./stop_iot_app_v2.sh

# Stop development mode
./stop_iot_app_dev.sh

# Stop ML pipeline only
./stop_ml_api_pipeline.sh
```

## 📱 Dashboard Features

### 🗺️ Overview Tab
- **Interactive Map**: 60 sensors plotted around Prishtina
- **Sensor Cards**: Real-time metrics for all sensors
- **Filter Controls**: Filter by sensor type (traffic, air quality, noise)
- **Statistics Section**: Overall system metrics
- **Traffic Monitoring**: Integrated traffic analytics

### 📊 Data Visualizations Tab
- **Traffic Visuals**: Vehicle counts, speed distribution, flow analysis
- **Air Quality Visuals**: PM2.5 trends, AQI distribution, temperature correlation
- **Noise Visuals**: Decibel levels, noise categorization, comparison charts
- **Granular Controls**: 1min to 1day intervals with historical data

### 📋 Data Tables Tab
- **Paginated Tables**: Browse all sensor data with pagination
- **Search & Filter**: Find specific sensors and time periods
- **Export Capabilities**: Download data for analysis

### 🤖 AI Predictions Tab
- **ML Dashboard**: Comprehensive AI prediction overview
- **Traffic State Cards**: Individual sensor predictions with confidence scores
- **Anomaly Detection**: Visual indicators for ML-detected anomalies
- **Model Information**: AI model versions and performance metrics
- **Real-time Updates**: Live ML predictions with 30-second refresh
- **Status Monitoring**: ML API service health and availability

### 🎛️ Advanced Controls
- **Time Period Selection**: 1 hour, 2 days, 1 week historical views
- **Granularity Control**: 1min, 5min, 30min, 1hour, 1day intervals
- **Sensor Focus**: Click any sensor to focus the map
- **Real-time Updates**: Automatic refresh every 30 seconds

## 📁 Project Structure

```
iot-traffic-monitoring/
├── README.md                          # This documentation
├── .gitignore                         # Git ignore rules
│
├── 🔧 Setup & Control Scripts
├── setup_all.sh                      # Comprehensive setup script
├── start_iot_app.sh                  # Original startup script
├── start_iot_app_v2.sh               # Production startup script
├── start_iot_app_dev.sh              # Development startup script
├── stop_iot_app_v2.sh                # Production shutdown script
├── stop_iot_app_dev.sh               # Development shutdown script
│
├── 🐍 Python Backend
├── realistic_simulator_60.py         # IoT sensor data generator (60 sensors)
├── enhanced_streaming_pipeline.py    # Main streaming processor
├── alert_engine.py                   # Alert processing and threshold monitoring
├── sms_notification_service.py       # SMS notifications via Twilio
├── alert_config.py                   # Alert thresholds and Twilio configuration
├── alert_endpoints.py                # Alert API endpoints
├── alert_engine.py                   # Alert processing and threshold monitoring
├── sms_notification_service.py       # SMS notifications via Twilio
├── alert_config.py                   # Alert thresholds and Twilio configuration
├── alert_endpoints.py                # Alert API endpoints
├── dashboard_react.py                # Flask server for React dashboard
├── api_endpoints.py                  # REST API endpoints (includes ML endpoints)
├── setup_kafka_topics.py            # Kafka topic creation
├── setup_cassandra.py               # Database schema setup
├── populate_sensors.py              # Sensor metadata population
│
├── 🤖 ML/AI Components
├── train_models_for_spark.py         # AI model training for Spark
├── ai_traffic_classifier.py          # Hybrid ML system (K-Means + Random Forest + Isolation Forest)
├── ml_api_service.py                 # Flask API serving trained models
├── spark_with_api_calls.py           # Spark streaming with ML API integration
├── start_ml_api_pipeline.sh          # ML pipeline startup script
├── stop_ml_api_pipeline.sh           # ML pipeline shutdown script
├── start_full_ml_system.sh           # Full ML-enhanced system startup
├── stop_full_ml_system.sh            # Full ML-enhanced system shutdown
├── download_jars.sh                  # Spark-Kafka connector JAR downloader
│
├── ⚛️ React Frontend
├── package.json                      # Node.js dependencies
├── package-lock.json                # Dependency lock file
├── public/
│   └── index.html                    # React app HTML template
└── src/
    ├── index.js                      # React app entry point
    ├── index.css                     # Global styles
    ├── App.js                        # Main React component
    └── components/                   # React components
        ├── Header.js                 # Dashboard header
        ├── StatisticsSection.js      # Overall statistics
        ├── TabNavigation.js          # Tab navigation
        ├── Overview.js               # Overview tab container
        ├── FilterButtons.js          # Sensor type filters
        ├── SensorGrid.js             # Sensor cards grid
        ├── SensorMap.js              # Interactive Leaflet map
        ├── DataTables.js             # Data tables with pagination
        ├── Visuals.js                # Visualization tab container
        ├── TrafficVisuals.js         # Traffic charts and graphs
        ├── AirQualityVisuals.js      # Air quality visualizations
        ├── NoiseVisuals.js           # Noise level analytics
        ├── TrafficMonitoring.js      # Dedicated traffic dashboard
        ├── MLDashboard.js            # AI predictions dashboard
        └── MLIndicator.js            # ML prediction indicators for sensor cards
│
└── 📊 Legacy Files
    └── templates/
        └── dashboard.html            # Original HTML template
```

## 🔧 Configuration

### Kafka Configuration
- **Broker**: `localhost:9092`
- **Topics**: 
  - `traffic.raw` - Raw sensor data
  - `traffic.processed` - Processed data
  - `traffic.alerts` - Alert messages

### Cassandra Configuration
- **Host**: `localhost:9042`
- **Keyspace**: `traffic`
- **Tables**:
  - `sensor_metadata` - Sensor information (60 sensors)
  - `aggregates_minute` - 1-minute aggregated data
  - alerts - Alert storage with severity, thresholds, and resolution status

### API Endpoints

#### Main Dashboard API
- **Base URL**: `http://localhost:5002` (production) or `http://localhost:5010` (development)
- **Main Data**: `GET /api/data` - Current sensor data and statistics
- **Table Data**: `GET /api/table_data` - Paginated sensor data
- **Historical Traffic**: `GET /api/traffic/historical?period=1hour&granularity=1min`
- **Historical Air Quality**: `GET /api/air_quality/historical?period=1hour&granularity=1min`
- **Historical Noise**: `GET /api/noise/historical?period=1hour&granularity=1min`
- **Active Alerts**: `GET /api/alerts/active` - Current unresolved alerts
- **Alert Statistics**: `GET /api/alerts/stats` - Alert counts and statistics

#### ML/AI API Endpoints
- **ML Health Check**: `GET /api/ml/health` - ML API service status
- **All ML Predictions**: `GET /api/ml/predictions` - All traffic sensor predictions
- **Single Prediction**: `GET /api/ml/predict/<sensor_id>` - Specific sensor prediction
- **Model Information**: `GET /api/ml/models/info` - ML model details

#### Direct ML API Service (Port 8090)
- **Health Check**: `GET /health` - ML service health
- **Single Prediction**: `POST /predict` - Real-time traffic prediction
- **Batch Predictions**: `POST /predict/batch` - Multiple predictions
- **Model Info**: `GET /models/info` - Detailed model information

### React Configuration

### Alert Configuration

### Twilio SMS Setup
Before running the application, you need to configure your Twilio credentials in `alert_config.py`:

```python
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID = "your-twilio-account-sid"  # Replace with your Twilio Account SID
TWILIO_AUTH_TOKEN = "your-twilio-auth-token"    # Replace with your Twilio Auth Token
TWILIO_FROM_NUMBER = "your-twilio-from-number"  # Replace with your Twilio phone number
TWILIO_TO_NUMBER = "your-phone-number"         # Replace with your phone number
```

**Getting Twilio Credentials:**
1. Sign up at [twilio.com](https://www.twilio.com)
2. Get your Account SID and Auth Token from the Twilio Console
3. Purchase a phone number or use the trial number
4. Verify your recipient phone number in the Twilio Console

**Note:** The system uses short SMS messages optimized for Twilio trial accounts.
- **Thresholds**: Configurable warning and critical levels in `alert_config.py`
- **SMS Settings**: Twilio credentials and phone numbers
- **Alert Types**: Traffic (speed, wait time, vehicle count), Air Quality (PM2.5, CO), Noise (dB levels)
- **Message Format**: Short SMS messages optimized for trial accounts
- **Check Interval**: 1-minute polling for new critical alerts
- **Development Server**: `localhost:3000`
- **Production Build**: Served by Flask at `localhost:5002`
- **API Proxy**: Configured for seamless development

## 📊 Data Flow

### 1. Data Generation (`realistic_simulator_60.py`)
Generates realistic IoT sensor data for 60 sensors:
- **Traffic Loops (20)**: Vehicle counts, speeds, wait times
- **Air Quality (20)**: PM2.5, AQI, temperature measurements  
- **Noise Sensors (20)**: Decibel readings with categorization

### 2. Message Streaming (Kafka)
Data flows through Kafka topics with:
- **Partitioning**: 3 partitions per topic
- **Replication**: Single replica (development)
- **Serialization**: JSON format

### 3. Stream Processing (`enhanced_streaming_pipeline.py`)
├── alert_engine.py                   # Alert processing and threshold monitoring
├── sms_notification_service.py       # SMS notifications via Twilio
├── alert_config.py                   # Alert thresholds and Twilio configuration
├── alert_endpoints.py                # Alert API endpoints
Real-time processing with:

#### Sliding Windows
```python
# Time-based: 10-minute sliding windows
WINDOW_SIZE_MINUTES = 10

# Measurement-based: Last 20 measurements
WINDOW_SIZE_MEASUREMENTS = 20

# Data retention: 24 hours
RETENTION_HOURS = 24
```

## 🔍 Monitoring & Debugging

### Check System Status
```bash
# Check if all services are running
brew services list | grep -E "(zookeeper|kafka|cassandra)"

# Check application processes
ps aux | grep -E "(simulator|enhanced_streaming|dashboard)"
```

### Monitor Kafka Messages
```bash
kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic traffic.raw \
  --from-beginning
```

### Check Cassandra Data
```bash
cqlsh -e "SELECT * FROM traffic.aggregates_minute LIMIT 10;"
  - alerts - Alert storage with severity, thresholds, and resolution status
cqlsh -e "SELECT COUNT(*) FROM traffic.sensor_metadata;"
```

### View API Responses
```bash
# Test main data endpoint
curl http://localhost:5002/api/data | jq

# Test historical data
curl "http://localhost:5002/api/traffic/historical?period=1hour&granularity=5min" | jq

# Test ML API health
curl http://localhost:5002/api/ml/health | jq

# Test ML predictions
curl http://localhost:5002/api/ml/predictions | jq

# Test direct ML API service
curl http://localhost:8090/health | jq

# Test single ML prediction
curl -X POST http://localhost:8090/predict \
  -H "Content-Type: application/json" \
  -d '{"vehicle_count": 25, "avg_speed": 35, "wait_time_s": 20}' | jq
```

### React Development Tools
```bash
# Check React build
npm run build

# Run React development server
npm start

# Check for linting issues
npm run lint
```

## 🛠️ Troubleshooting

### Common Issues

**Port Conflicts**
```bash
# Check what's using a port
lsof -i :5002
lsof -i :3000

# Kill processes if needed
pkill -f "dashboard"
pkill -f "react-scripts"
```

**Service Connection Issues**
```bash
# Restart all services
brew services restart zookeeper
brew services restart kafka  
brew services restart cassandra

# Wait for services to be ready
sleep 10
```

**React Build Issues**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Python Package Issues**
```bash
# Install in virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
