import json
import time
from datetime import datetime, timezone, timedelta
from collections import defaultdict, deque
from kafka import KafkaConsumer
from cassandra.cluster import Cluster
from cassandra.query import PreparedStatement
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------- Configuration ----------
KAFKA_BROKER = "localhost:9092"
KAFKA_TOPIC = "traffic.raw"
CASSANDRA_HOST = "127.0.0.1"
CASSANDRA_PORT = 9042
KEYSPACE = "traffic"
TABLE = "aggregates_minute"

# Sliding window configurations
WINDOW_SIZE_MINUTES = 10  # 10-minute sliding windows
WINDOW_SIZE_MEASUREMENTS = 20  # Keep last 20 measurements per sensor
RETENTION_HOURS = 24  # Keep data for 24 hours

class SlidingWindowAggregator:
    """
    Implementon dritare rreshqitëse (sliding windows) për sensore
    Implements sliding windows for sensors as required
    """
    def __init__(self, window_size_minutes=10, max_measurements=20, retention_hours=24):
        self.window_size = timedelta(minutes=window_size_minutes)
        self.max_measurements = max_measurements
        self.retention_period = timedelta(hours=retention_hours)
        
        # Store data by sensor_id -> deque of (timestamp, metric, value)
        self.sensor_data = defaultdict(lambda: deque(maxlen=max_measurements))
        self.time_windows = defaultdict(lambda: defaultdict(list))  # sensor -> time_window -> measurements
        
    def add_measurement(self, sensor_id, timestamp, metric, value):
        """Add new measurement to sliding windows"""
        dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        
        # Add to measurement-based window (last N measurements)
        self.sensor_data[sensor_id].append((dt, metric, float(value)))
        
        # Add to time-based window
        window_key = self._get_window_key(dt)
        self.time_windows[sensor_id][window_key].append((dt, metric, float(value)))
        
        # Clean old data
        self._cleanup_old_data(dt)
        
    def _get_window_key(self, timestamp):
        """Get window key for time-based aggregation"""
        # Round to minute for window grouping
        return timestamp.replace(second=0, microsecond=0)
    
    def _cleanup_old_data(self, current_time):
        """Remove data older than retention period"""
        cutoff = current_time - self.retention_period
        
        for sensor_id in list(self.time_windows.keys()):
            for window_key in list(self.time_windows[sensor_id].keys()):
                if window_key < cutoff:
                    del self.time_windows[sensor_id][window_key]
            
            # Clean empty sensors
            if not self.time_windows[sensor_id]:
                del self.time_windows[sensor_id]
    
    def get_sliding_window_aggregates(self, sensor_id):
        """Get aggregates for sliding windows"""
        if sensor_id not in self.sensor_data:
            return None
            
        measurements = list(self.sensor_data[sensor_id])
        if not measurements:
            return None
            
        # Group by metric
        metrics = defaultdict(list)
        for timestamp, metric, value in measurements:
            metrics[metric].append(value)
        
        # Calculate aggregates
        aggregates = {}
        for metric, values in metrics.items():
            if values:
                aggregates[f"{metric}_avg"] = sum(values) / len(values)
                aggregates[f"{metric}_min"] = min(values)
                aggregates[f"{metric}_max"] = max(values)
                aggregates[f"{metric}_count"] = len(values)
        
        return {
            'sensor_id': sensor_id,
            'window_type': 'sliding_measurements',
            'window_size': len(measurements),
            'aggregates': aggregates,
            'timestamp_range': {
                'start': measurements[0][0].isoformat(),
                'end': measurements[-1][0].isoformat()
            }
        }
    
    def get_time_window_aggregates(self, cutoff_time):
        """Get completed time windows for processing"""
        completed = {}
        
        for sensor_id in list(self.time_windows.keys()):
            for window_key in list(self.time_windows[sensor_id].keys()):
                if window_key < cutoff_time:
                    measurements = self.time_windows[sensor_id].pop(window_key)
                    
                    # Group by metric
                    metrics = defaultdict(list)
                    for timestamp, metric, value in measurements:
                        metrics[metric].append(value)
                    
                    # Calculate aggregates
                    aggregates = {}
                    for metric, values in metrics.items():
                        if values:
                            aggregates[metric] = sum(values) / len(values)
                    
                    completed[(sensor_id, window_key)] = aggregates
        
        return completed

class DataValidator:
    """
    Validimi i të dhënave dhe detektimi i anomalive
    Data validation and anomaly detection
    """
    def __init__(self):
        self.thresholds = {
            'vehicle_count': {'min': 0, 'max': 100},
            'avg_speed': {'min': 0, 'max': 120},
            'wait_time_s': {'min': 0, 'max': 600},
            'pm25': {'min': 0, 'max': 500},
            'noise_db': {'min': 30, 'max': 120},
            'temp_c': {'min': -30, 'max': 50}
        }
        
    def validate_measurement(self, metric, value):
        """Validate single measurement"""
        if metric not in self.thresholds:
            return True, "Unknown metric"
            
        threshold = self.thresholds[metric]
        if threshold['min'] <= value <= threshold['max']:
            return True, "Valid"
        else:
            return False, f"Out of range: {value} not in [{threshold['min']}, {threshold['max']}]"
    
    def detect_anomalies(self, sensor_data):
        """Detect anomalies in sensor data patterns"""
        anomalies = []
        
        # Example: Detect sudden spikes
        if 'vehicle_count' in sensor_data:
            values = sensor_data['vehicle_count']
            if len(values) >= 3:
                recent_avg = sum(values[-3:]) / 3
                if values[-1] > recent_avg * 2:  # 100% increase
                    anomalies.append("Sudden traffic spike detected")
        
        return anomalies

class RealTimeProcessor:
    """
    Përpunimi i të dhënave në kohë reale
    Real-time data processing as required
    """
    def __init__(self):
        self.aggregator = SlidingWindowAggregator()
        self.validator = DataValidator()
        self.processing_stats = {
            'messages_processed': 0,
            'validation_errors': 0,
            'anomalies_detected': 0
        }
        
    def process_message(self, data):
        """Process single Kafka message"""
        sensor_id = data['sensor_id']
        timestamp = data['ts']
        metric = data['metric']
        value = data['value']
        
        # Validate data
        is_valid, validation_msg = self.validator.validate_measurement(metric, value)
        if not is_valid:
            self.processing_stats['validation_errors'] += 1
            logger.warning(f"Validation error for {sensor_id}: {validation_msg}")
            return None
            
        # Add to sliding windows
        self.aggregator.add_measurement(sensor_id, timestamp, metric, value)
        
        # Update stats
        self.processing_stats['messages_processed'] += 1
        
        # Check for anomalies every 10 messages
        if self.processing_stats['messages_processed'] % 10 == 0:
            sliding_data = self.aggregator.get_sliding_window_aggregates(sensor_id)
            if sliding_data:
                anomalies = self.validator.detect_anomalies(sliding_data['aggregates'])
                if anomalies:
                    self.processing_stats['anomalies_detected'] += len(anomalies)
                    logger.warning(f"Anomalies detected for {sensor_id}: {anomalies}")
        
        return True
    
    def get_completed_windows(self):
        """Get completed time windows for Cassandra storage"""
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=1)
        return self.aggregator.get_time_window_aggregates(cutoff)

def connect_cassandra(retries=20, delay=2):
    """Connect to Cassandra with retry logic"""
    last = None
    for i in range(retries):
        try:
            cluster = Cluster([CASSANDRA_HOST], port=CASSANDRA_PORT, connect_timeout=30)
            session = cluster.connect()
            session.set_keyspace(KEYSPACE)
            
            # Prepare insert statement
            insert_ps = session.prepare(f"""
                INSERT INTO {TABLE} (
                    sensor_id, window_start,
                    vehicle_count_per_min, avg_speed_kmh, avg_wait_time_s,
                    pm25, noise_db, temp_c
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """)
            return cluster, session, insert_ps
        except Exception as e:
            last = e
            logger.warning(f"[{i+1}/{retries}] Cassandra not ready: {e}")
            time.sleep(delay)
    raise RuntimeError(f"Failed to connect to Cassandra: {last}")

def connect_kafka():
    """Connect to Kafka consumer"""
    return KafkaConsumer(
        KAFKA_TOPIC,
        bootstrap_servers=[KAFKA_BROKER],
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        group_id="enhanced-streaming-processor",
        auto_offset_reset="latest",
        enable_auto_commit=True,
    )

def write_to_cassandra(session, insert_ps, sensor_id, window_start, aggregates):
    """Write aggregated data to Cassandra"""
    session.execute(
        insert_ps,
        [
            sensor_id,
            window_start,
            aggregates.get("vehicle_count"),
            aggregates.get("avg_speed"),
            aggregates.get("wait_time_s"),
            aggregates.get("pm25"),
            aggregates.get("noise_db"),
            aggregates.get("temp_c"),
        ]
    )

def main():
    """
    Aplikacioni kryesor për përpunimin e të dhënave në kohë reale
    Main application for real-time data processing
    """
    logger.info("🚀 Starting Enhanced Real-Time Traffic Processing Pipeline")
    logger.info("📊 Features: Sliding Windows, Data Validation, Anomaly Detection")
    
    # Initialize components
    processor = RealTimeProcessor()
    
    # Connect to services
    logger.info("🔧 Connecting to Cassandra...")
    cluster, session, insert_ps = connect_cassandra()
    
    logger.info("🔧 Connecting to Kafka...")
    consumer = connect_kafka()
    
    logger.info("📡 Starting real-time processing...")
    
    try:
        last_stats_time = time.time()
        
        for msg in consumer:
            data = msg.value
            
            # Basic sanity check
            if not all(k in data for k in ("sensor_id", "ts", "metric", "value")):
                continue
                
            # Process message
            processor.process_message(data)
            
            # Process completed windows
            completed = processor.get_completed_windows()
            for (sensor_id, window_start), aggregates in completed.items():
                write_to_cassandra(session, insert_ps, sensor_id, window_start, aggregates)
                logger.info(f"✅ Stored aggregates: {sensor_id} @ {window_start.isoformat()}")
            
            # Print stats every 30 seconds
            if time.time() - last_stats_time > 30:
                stats = processor.processing_stats
                logger.info(f"📈 Stats: {stats['messages_processed']} processed, "
                          f"{stats['validation_errors']} errors, "
                          f"{stats['anomalies_detected']} anomalies")
                last_stats_time = time.time()
                
    except KeyboardInterrupt:
        logger.info("🛑 Stopping pipeline...")
    finally:
        consumer.close()
        session.shutdown()
        cluster.shutdown()
        logger.info("✅ Pipeline stopped gracefully")

if __name__ == "__main__":
    main() 