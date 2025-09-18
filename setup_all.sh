#!/bin/bash

echo "🚀 IoT Traffic Monitoring System - Complete Setup Script"
echo "========================================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detect operating system
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        print_status "Detected macOS"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        print_status "Detected Linux"
    else
        print_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if service is running
service_running() {
    if [[ "$OS" == "macos" ]]; then
        brew services list | grep -q "$1.*started"
    else
        systemctl is-active --quiet "$1"
    fi
}

# Detect existing installations (for flexible setup)
detect_existing_installations() {
    print_status "Detecting existing installations..."
    
    # Detect Kafka
    KAFKA_BIN=""
    KAFKA_DIR=""
    if command_exists kafka-server-start.sh; then
        KAFKA_BIN=$(which kafka-server-start.sh)
        KAFKA_DIR=$(dirname $(dirname "$KAFKA_BIN"))
        print_success "Found existing Kafka at: $KAFKA_BIN"
    elif [ -f "/usr/local/kafka/bin/kafka-server-start.sh" ]; then
        KAFKA_BIN="/usr/local/kafka/bin/kafka-server-start.sh"
        KAFKA_DIR="/usr/local/kafka"
        print_success "Found existing Kafka at: $KAFKA_BIN"
    elif [ -f "/opt/kafka/bin/kafka-server-start.sh" ]; then
        KAFKA_BIN="/opt/kafka/bin/kafka-server-start.sh"
        KAFKA_DIR="/opt/kafka"
        print_success "Found existing Kafka at: $KAFKA_BIN"
    fi
    
    # Detect Cassandra
    CASSANDRA_BIN=""
    if command_exists cassandra; then
        CASSANDRA_BIN=$(which cassandra)
        print_success "Found existing Cassandra at: $CASSANDRA_BIN"
    elif [ -f "/usr/sbin/cassandra" ]; then
        CASSANDRA_BIN="/usr/sbin/cassandra"
        print_success "Found existing Cassandra at: $CASSANDRA_BIN"
    fi
    
    # Export for use in other functions
    export KAFKA_BIN
    export KAFKA_DIR
    export CASSANDRA_BIN
}

# Install Java if not present
install_java() {
    if command_exists java; then
        JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
        if [[ "$JAVA_VERSION" -ge 11 ]]; then
            print_success "Java $JAVA_VERSION is already installed"
            return 0
        fi
    fi

    print_status "Installing Java..."
    if [[ "$OS" == "macos" ]]; then
        if ! command_exists brew; then
            print_error "Homebrew is required but not installed. Please install Homebrew first:"
            print_error "https://brew.sh/"
            exit 1
        fi
        brew install openjdk@17
        echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
        export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
    else
        sudo apt update
        sudo apt install -y openjdk-17-jdk
    fi
    print_success "Java installed successfully"
}

# Install Python dependencies
install_python_deps() {
    print_status "Installing Python dependencies..."
    
    # Check if we're in a virtual environment
    if [[ -n "$VIRTUAL_ENV" ]]; then
        print_status "Using virtual environment: $VIRTUAL_ENV"
    else
        print_warning "Not in a virtual environment. Consider using one."
    fi
    
    pip3 install kafka-python cassandra-driver flask flask-cors
    print_success "Python dependencies installed"
}

# Install and setup Kafka
setup_kafka() {
    print_status "Setting up Apache Kafka..."
    
    if [[ "$OS" == "macos" ]]; then
        if ! command_exists kafka-server-start; then
            print_status "Installing Kafka via Homebrew..."
            brew install kafka
        else
            print_success "Kafka is already installed"
        fi
        
        # Start Kafka services
        if ! service_running kafka; then
            print_status "Starting Kafka services..."
            brew services start zookeeper
            sleep 5
            brew services start kafka
            sleep 10
        else
            print_success "Kafka is already running"
        fi
        
    else
        # Linux installation - check for existing installation first
        if [[ -n "$KAFKA_BIN" && -n "$KAFKA_DIR" ]]; then
            print_success "Using existing Kafka installation at: $KAFKA_BIN"
        elif ! command_exists /opt/kafka/bin/kafka-server-start.sh; then
            print_status "Installing Kafka for Linux..."
            cd /tmp
            wget -q https://downloads.apache.org/kafka/2.13-3.6.0/kafka_2.13-3.6.0.tgz
            tar -xzf kafka_2.13-3.6.0.tgz
            sudo mv kafka_2.13-3.6.0 /opt/kafka
            sudo chown -R $USER:$USER /opt/kafka
            KAFKA_DIR="/opt/kafka"
            KAFKA_BIN="/opt/kafka/bin/kafka-server-start.sh"
            
            # Add Kafka to PATH
            if ! grep -q "/opt/kafka/bin" ~/.bashrc; then
                echo 'export PATH="/opt/kafka/bin:$PATH"' >> ~/.bashrc
                export PATH="/opt/kafka/bin:$PATH"
            fi
        else
            print_success "Kafka is already installed"
            KAFKA_DIR="/opt/kafka"
            KAFKA_BIN="/opt/kafka/bin/kafka-server-start.sh"
        fi
        
        # Start Kafka services for Linux
        if ! pgrep -f "kafka.Kafka" > /dev/null; then
            print_status "Starting Kafka services..."
            cd "$KAFKA_DIR"
            
            # Start Zookeeper in background
            nohup bin/zookeeper-server-start.sh config/zookeeper.properties > /tmp/zookeeper.log 2>&1 &
            sleep 5
            
            # Start Kafka in background
            nohup bin/kafka-server-start.sh config/server.properties > /tmp/kafka.log 2>&1 &
            sleep 10
        else
            print_success "Kafka is already running"
        fi
    fi
}

# Install and setup Cassandra
setup_cassandra() {
    print_status "Setting up Apache Cassandra..."
    
    if [[ "$OS" == "macos" ]]; then
        if ! command_exists cassandra; then
            print_status "Installing Cassandra via Homebrew..."
            brew install cassandra
        else
            print_success "Cassandra is already installed"
        fi
        
        # Start Cassandra service
        if ! service_running cassandra; then
            print_status "Starting Cassandra..."
            brew services start cassandra
            sleep 15  # Cassandra takes longer to start
        else
            print_success "Cassandra is already running"
        fi
        
    else
        # Linux installation - check for existing installation first
        if [[ -n "$CASSANDRA_BIN" ]]; then
            print_success "Using existing Cassandra installation at: $CASSANDRA_BIN"
        elif ! command_exists cassandra; then
            print_status "Installing Cassandra for Linux..."
            
            # Add Cassandra repository
            wget -q -O - https://www.apache.org/dist/cassandra/KEYS | sudo apt-key add -
            echo "deb https://downloads.apache.org/cassandra/debian 40x main" | sudo tee -a /etc/apt/sources.list.d/cassandra.sources.list
            
            sudo apt update
            sudo apt install -y cassandra
        else
            print_success "Cassandra is already installed"
        fi
        
        # Start Cassandra service for Linux
        if ! pgrep -f "cassandra" > /dev/null; then
            print_status "Starting Cassandra..."
            if systemctl start cassandra 2>/dev/null; then
                print_success "Cassandra started via systemd"
                sleep 15
            else
                # Fallback to manual start
                print_status "Starting Cassandra manually..."
                nohup "$CASSANDRA_BIN" > /tmp/cassandra.log 2>&1 &
                sleep 15
            fi
        else
            print_success "Cassandra is already running"
        fi
    fi
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait for Kafka
    print_status "Checking Kafka connectivity..."
    for i in {1..30}; do
        if [[ "$OS" == "macos" ]]; then
            if kafka-topics --bootstrap-server localhost:9092 --list >/dev/null 2>&1; then
                break
            fi
        else
            # Use detected Kafka directory
            if [[ -n "$KAFKA_DIR" ]]; then
                if "$KAFKA_DIR/bin/kafka-topics.sh" --bootstrap-server localhost:9092 --list >/dev/null 2>&1; then
                    break
                fi
            else
                if /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list >/dev/null 2>&1; then
                    break
                fi
            fi
        fi
        
        if [[ $i -eq 30 ]]; then
            print_error "Kafka failed to start properly"
            exit 1
        fi
        sleep 2
    done
    print_success "Kafka is ready"
    
    # Wait for Cassandra
    print_status "Checking Cassandra connectivity..."
    for i in {1..60}; do
        if cqlsh -e "DESCRIBE KEYSPACES;" localhost 9042 >/dev/null 2>&1; then
            break
        fi
        
        if [[ $i -eq 60 ]]; then
            print_error "Cassandra failed to start properly"
            exit 1
        fi
        sleep 2
    done
    print_success "Cassandra is ready"
}

# Setup Kafka topics
setup_kafka_topics() {
    print_status "Setting up Kafka topics..."
    
    if [[ -f "setup_kafka_topics.py" ]]; then
        python3 setup_kafka_topics.py
        print_success "Kafka topics created"
    else
        print_warning "setup_kafka_topics.py not found, creating topics manually..."
        
        if [[ "$OS" == "macos" ]]; then
            kafka-topics --create --topic traffic.raw --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1 --if-not-exists
        else
            # Use detected Kafka directory
            if [[ -n "$KAFKA_DIR" ]]; then
                "$KAFKA_DIR/bin/kafka-topics.sh" --create --topic traffic.raw --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1 --if-not-exists
            else
                /opt/kafka/bin/kafka-topics.sh --create --topic traffic.raw --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1 --if-not-exists
            fi
        fi
        print_success "Kafka topics created manually"
    fi
}

# Setup Cassandra schema
setup_cassandra_schema() {
    print_status "Setting up Cassandra schema..."
    
    if [[ -f "setup_cassandra.py" ]]; then
        python3 setup_cassandra.py
        print_success "Cassandra schema created"
    else
        print_error "setup_cassandra.py not found"
        exit 1
    fi
}

# Populate sensor data
populate_sensor_data() {
    print_status "Populating sensor metadata..."
    
    if [[ -f "populate_sensors.py" ]]; then
        python3 populate_sensors.py
        print_success "Sensor metadata populated"
    else
        print_error "populate_sensors.py not found"
        exit 1
    fi
}

# Install Node.js dependencies
install_node_deps() {
    if [[ -f "package.json" ]]; then
        print_status "Installing Node.js dependencies..."
        npm install
        print_success "Node.js dependencies installed"
    else
        print_warning "package.json not found. React dashboard may not be available."
    fi
}

# Verify setup
verify_setup() {
    print_status "Verifying setup..."
    
    # Check Kafka topics
    print_status "Checking Kafka topics..."
    if [[ "$OS" == "macos" ]]; then
        kafka-topics --bootstrap-server localhost:9092 --list
    else
        # Use detected Kafka directory
        if [[ -n "$KAFKA_DIR" ]]; then
            "$KAFKA_DIR/bin/kafka-topics.sh" --bootstrap-server localhost:9092 --list
        else
            /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list
        fi
    fi
    
    # Check Cassandra keyspace and tables
    print_status "Checking Cassandra setup..."
    python3 -c "
from cassandra.cluster import Cluster
try:
    cluster = Cluster(['127.0.0.1'], port=9042)
    session = cluster.connect('traffic')
    
    # Check sensor metadata count
    result = session.execute('SELECT COUNT(*) FROM sensor_metadata')
    sensor_count = result.one().count
    print(f'✅ Sensor metadata: {sensor_count} sensors')
    
    # Check tables
    tables = session.execute(\"SELECT table_name FROM system_schema.tables WHERE keyspace_name = 'traffic'\")
    print('✅ Tables created:')
    for table in tables:
        print(f'   - {table.table_name}')
    
    cluster.shutdown()
    print('✅ Cassandra setup verified')
except Exception as e:
    print(f'❌ Cassandra verification failed: {e}')
    exit(1)
"
}

# Main execution
main() {
    detect_os
    detect_existing_installations
    
    print_status "Starting complete setup process..."
    echo ""
    
    # Install prerequisites
    install_java
    install_python_deps
    
    # Setup services
    setup_kafka
    setup_cassandra
    
    # Wait for services to be ready
    wait_for_services
    
    # Setup data infrastructure
    setup_kafka_topics
    setup_cassandra_schema
    populate_sensor_data
    
    # Install Node.js dependencies
    install_node_deps
    
    # Verify everything is working
    verify_setup
    
    echo ""
    print_success "🎉 Complete setup finished successfully!"
    echo ""
    print_status "Your detected configuration:"
    if [[ "$OS" == "macos" ]]; then
        print_status "  OS: macOS"
        print_status "  Kafka: $(which kafka-server-start 2>/dev/null || echo 'via Homebrew')"
        print_status "  Cassandra: $(which cassandra 2>/dev/null || echo 'via Homebrew')"
    else
        print_status "  OS: Linux"
        print_status "  Kafka: ${KAFKA_BIN:-'/opt/kafka/bin/kafka-server-start.sh'}"
        print_status "  Cassandra: ${CASSANDRA_BIN:-'/usr/sbin/cassandra'}"
    fi
    print_status "  Java: $(java -version 2>&1 | head -n 1)"
    print_status "  Python: $(python3 --version)"
    if command -v node >/dev/null 2>&1; then
        print_status "  Node.js: $(node --version)"
    fi
    echo ""
    print_status "You can now run the IoT system with:"
    print_status "  ./start_iot_app_v2.sh"
    echo ""
    print_status "Dashboard will be available at:"
    print_status "  http://localhost:5002"
    echo ""
}

# Run main function
main "$@"
