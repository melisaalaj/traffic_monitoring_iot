#!/usr/bin/env python3
"""
Alert Engine for IoT Traffic Monitoring System
Processes sensor data and generates alerts based on thresholds
"""

import json
import logging
import time
import uuid
from datetime import datetime
from kafka import KafkaProducer, KafkaConsumer
from cassandra.cluster import Cluster
from cassandra.query import SimpleStatement
import alert_config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/tmp/alert_engine.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Use thresholds from config file
ALERT_THRESHOLDS = alert_config.ALERT_THRESHOLDS

class AlertEngine:
    def __init__(self):
        self.cassandra_session = None
        self.kafka_producer = None
        self.insert_prepared = None
        self.setup_cassandra()
        self.setup_kafka()
        self.create_alerts_table()
        
    def setup_cassandra(self):
        """Connect to Cassandra"""
        try:
            cluster = Cluster(['127.0.0.1'], port=9042)
            self.cassandra_session = cluster.connect('traffic')
            logger.info("✅ Connected to Cassandra")
        except Exception as e:
            logger.error(f"❌ Failed to connect to Cassandra: {e}")
            raise
    
    def setup_kafka(self):
        """Setup Kafka producer for alerts"""
        try:
            self.kafka_producer = KafkaProducer(
                bootstrap_servers=['localhost:9092'],
                value_serializer=lambda x: json.dumps(x).encode('utf-8')
            )
            logger.info("✅ Kafka producer initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Kafka producer: {e}")
            raise
    
    def create_alerts_table(self):
        """Create alerts table if it doesn't exist"""
        try:
            create_table_query = """
            CREATE TABLE IF NOT EXISTS alerts (
                alert_id UUID PRIMARY KEY,
                sensor_id TEXT,
                sensor_type TEXT,
                metric TEXT,
                value DOUBLE,
                severity TEXT,
                message TEXT,
                location MAP<TEXT, TEXT>,
                timestamp TIMESTAMP,
                resolved BOOLEAN
            )
            """
            self.cassandra_session.execute(create_table_query)
            
            # Prepare insert statement
            insert_query = """
            INSERT INTO alerts (alert_id, sensor_id, sensor_type, metric, value, severity, message, location, timestamp, resolved, threshold_type, threshold_value)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            self.insert_prepared = self.cassandra_session.prepare(insert_query)
            
            logger.info("✅ Alerts table created/verified")
        except Exception as e:
            logger.error(f"❌ Failed to create alerts table: {e}")
            raise
    
    def determine_sensor_type(self, sensor_id, metric):
        """Determine sensor type from sensor_id and metric"""
        if sensor_id.startswith('Loop-'):
            return 'traffic_loop'
        elif sensor_id.startswith('Air-'):
            return 'air_quality'
        elif sensor_id.startswith('Noise-'):
            return 'noise'
        else:
            # Fallback based on metric
            if metric in ['pm25', 'co', 'temp_c']:
                return 'air_quality'
            elif metric in ['noise_db']:
                return 'noise'
            else:
                return 'traffic_loop'
    
    def check_threshold_breach(self, sensor_type, metric, value):
        """Check if value breaches warning or critical thresholds"""
        if sensor_type not in ALERT_THRESHOLDS:
            return None, None
            
        thresholds = ALERT_THRESHOLDS[sensor_type].get(metric)
        if not thresholds:
            return None, None
        
        # Special logic for speed - LOWER values are critical (slow traffic)
        if metric == 'avg_speed':
            if value <= thresholds['critical']:
                return 'critical', thresholds['critical']
            elif value <= thresholds['warning']:
                return 'warning', thresholds['warning']
        else:
            # Normal logic for other metrics - HIGHER values are critical
            if value >= thresholds['critical']:
                return 'critical', thresholds['critical']
            elif value >= thresholds['warning']:
                return 'warning', thresholds['warning']
        
        return None, None
    
    def create_alert_message(self, sensor_id, sensor_type, metric, value, severity, threshold):
        """Create user-friendly alert message"""
        if sensor_type == 'traffic_loop':
            if metric == 'vehicle_count':
                return f"High vehicle count on {sensor_id}, Prishtina. Vehicles: {value:.0f} (limit: {threshold})"
            elif metric == 'wait_time_s':
                return f"Long wait time on {sensor_id}, Prishtina. Wait: {value:.1f}s (limit: {threshold}s)"
            elif metric == 'avg_speed':
                return f"Slow traffic on {sensor_id}, Prishtina. Speed: {value:.1f} km/h (limit: {threshold} km/h)"
        elif sensor_type == 'air_quality':
            if metric == 'pm25':
                return f"High PM2.5 levels at {sensor_id}, Prishtina. PM2.5: {value:.1f} µg/m³ (limit: {threshold})"
            elif metric == 'co':
                return f"High CO levels at {sensor_id}, Prishtina. CO: {value:.1f} ppm (limit: {threshold})"
        elif sensor_type == 'noise':
            return f"High noise levels at {sensor_id}, Prishtina. Noise: {value:.1f} dB (limit: {threshold} dB)"
        
        return f"Alert for {sensor_id}: {metric} = {value:.2f} (threshold: {threshold})"
    
    def get_sensor_location(self, sensor_id):
        """Get sensor location information"""
        # Simple location mapping based on sensor ID
        sensor_num = sensor_id.split('-')[1] if '-' in sensor_id else '01'
        return {
            'road': f'Road {sensor_num.zfill(2)}',
            'city': 'Prishtina',
            'country': 'Kosovo'
        }
    
    def process_measurement(self, measurement):
        """Process a single sensor measurement"""
        try:
            sensor_id = measurement.get('sensor_id')
            metric = measurement.get('metric')
            value = measurement.get('value')
            timestamp = measurement.get('timestamp', datetime.now())
            
            if not all([sensor_id, metric, value is not None]):
                logger.warning(f"⚠️ Incomplete measurement: {measurement}")
                return
            
            # Determine sensor type
            sensor_type = self.determine_sensor_type(sensor_id, metric)
            
            # Check for threshold breach
            severity, threshold = self.check_threshold_breach(sensor_type, metric, value)
            
            if severity:
                # Create alert
                alert_id = uuid.uuid4()
                message = self.create_alert_message(sensor_id, sensor_type, metric, value, severity, threshold)
                location = self.get_sensor_location(sensor_id)
                
                # Store alert in Cassandra
                self.cassandra_session.execute(self.insert_prepared, (
                    alert_id,
                    sensor_id,
                    sensor_type,
                    metric,
                    value,
                    severity,
                    message,
                    location,
                    timestamp,
                    False,  # resolved = False
                    severity,  # threshold_type = severity
                    threshold  # threshold_value = threshold
                ))
                
                logger.info(f"✅ Alert stored: {severity.upper()} - {sensor_id} {metric}={value:.2f}")
                
                # Publish to Kafka
                alert_data = {
                    'alert_id': str(alert_id),
                    'sensor_id': sensor_id,
                    'sensor_type': sensor_type,
                    'metric': metric,
                    'value': value,
                    'severity': severity,
                    'message': message,
                    'location': location,
                    'timestamp': timestamp.isoformat(),
                    'resolved': False
                }
                
                self.kafka_producer.send('traffic.alerts', value=alert_data)
                logger.info(f"📤 Alert published to Kafka: {severity}")
                
        except Exception as e:
            logger.error(f"❌ Error processing measurement: {e}")
    
    def start_consuming(self):
        """Start consuming sensor data from Kafka"""
        try:
            consumer = KafkaConsumer(
                'traffic.raw',
                bootstrap_servers=['localhost:9092'],
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                group_id='alert-engine-group',
                auto_offset_reset='latest'
            )
            
            logger.info("🚨 Alert Engine started - monitoring for threshold breaches...")
            logger.info(f"📊 REALISTIC Thresholds: {ALERT_THRESHOLDS}")
            
            for message in consumer:
                self.process_measurement(message.value)
                
        except Exception as e:
            logger.error(f"❌ Error in consuming loop: {e}")
            time.sleep(5)
            self.start_consuming()

if __name__ == "__main__":
    engine = AlertEngine()
    engine.start_consuming()
