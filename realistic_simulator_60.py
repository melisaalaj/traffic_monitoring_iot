#!/usr/bin/env python3
"""
Realistic IoT Sensor Data Simulator for 60 sensors across Prishtina
Generates realistic traffic, air quality, and noise data
"""

import json
import time
import random
from datetime import datetime, timezone
from kafka import KafkaProducer
import math

# Kafka configuration
KAFKA_BROKER = "localhost:9092"
KAFKA_TOPIC = "traffic.raw"

def create_producer():
    """Create Kafka producer"""
    return KafkaProducer(
        bootstrap_servers=[KAFKA_BROKER],
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )

def generate_traffic_data(sensor_id, base_lat, base_lon):
    """Generate realistic traffic data based on real sensor specifications"""
    # Time-based patterns
    hour = datetime.now().hour
    day_of_week = datetime.now().weekday()
    
    # Rush hour multipliers (realistic for Prishtina)
    if 7 <= hour <= 9 or 17 <= hour <= 19:
        rush_multiplier = 1.8
    elif 10 <= hour <= 16:
        rush_multiplier = 1.2
    else:
        rush_multiplier = 0.6
    
    # Weekend patterns
    if day_of_week >= 5:  # Weekend
        rush_multiplier *= 0.7
    
    # Base values with realistic ranges (based on real traffic loop sensors)
    base_vehicle_count = random.uniform(8, 25) * rush_multiplier
    base_speed = random.uniform(35, 65) * (1.2 - rush_multiplier * 0.3)
    base_wait_time = random.uniform(8, 25) * rush_multiplier
    
    # Add realistic noise (±2% accuracy for traffic loops)
    vehicle_count = max(0, base_vehicle_count + random.uniform(-3, 3))
    speed = max(10, base_speed + random.uniform(-8, 8))
    wait_time = max(2, base_wait_time + random.uniform(-5, 5))
    
    return {
        'vehicle_count': round(vehicle_count, 2),
        'avg_speed': round(speed, 2),
        'wait_time_s': round(wait_time, 2)
    }

def generate_air_quality_data(sensor_id, base_lat, base_lon):
    """Generate realistic air quality data based on real sensor specifications"""
    # Time-based patterns
    hour = datetime.now().hour
    day_of_week = datetime.now().weekday()
    
    # Traffic influence on air quality
    if 7 <= hour <= 9 or 17 <= hour <= 19:
        traffic_factor = 1.5
    else:
        traffic_factor = 1.0
    
    # Weekend patterns
    if day_of_week >= 5:  # Weekend
        traffic_factor *= 0.8
    
    # Weather influence (simplified)
    temperature = random.uniform(5, 30)
    if temperature < 10:
        pm25_base = random.uniform(15, 35) * traffic_factor
    elif temperature < 20:
        pm25_base = random.uniform(10, 25) * traffic_factor
    else:
        pm25_base = random.uniform(8, 20) * traffic_factor
    
    # Add realistic noise (±10% accuracy for PM2.5 sensors)
    pm25 = max(2, pm25_base + random.uniform(-5, 5))
    temp_c = temperature + random.uniform(-2, 2)
    
    return {
        'pm25': round(pm25, 2),
        'temp_c': round(temp_c, 2)
    }

def generate_noise_data(sensor_id, base_lat, base_lon):
    """Generate realistic noise data based on real sensor specifications"""
    hour = datetime.now().hour
    day_of_week = datetime.now().weekday()
    
    # Time-based noise patterns (realistic for urban areas)
    if 7 <= hour <= 9 or 17 <= hour <= 19:
        base_noise = random.uniform(65, 85)
    elif 10 <= hour <= 16:
        base_noise = random.uniform(55, 75)
    elif 22 <= hour or hour <= 6:
        base_noise = random.uniform(35, 55)
    else:
        base_noise = random.uniform(45, 65)
    
    # Weekend patterns
    if day_of_week >= 5:  # Weekend
        base_noise *= 0.9
    
    # Add realistic noise (±1.5 dB accuracy for noise sensors)
    noise_db = max(30, base_noise + random.uniform(-5, 5))
    
    return {
        'noise_db': round(noise_db, 2)
    }

def main():
    """Main simulation loop"""
    print("🚀 Starting Realistic IoT Sensor Data Simulator for 60 sensors")
    print("📍 Simulating sensors across Prishtina")
    print("🔧 Based on real sensor specifications:")
    print("   - Traffic Loop Sensors: ±2% accuracy, 0-200 km/h range")
    print("   - Air Quality Sensors: ±10% PM2.5 accuracy, ±1°C temp")
    print("   - Noise Sensors: ±1.5 dB accuracy, 30-130 dB range")
    
    producer = create_producer()
    
    # Load sensor data from database
    from cassandra.cluster import Cluster
    cluster = Cluster(['127.0.0.1'], port=9042)
    session = cluster.connect('traffic')
    
    # Get all sensors
    result = session.execute("SELECT sensor_id, lat, lon, type, road FROM sensor_metadata")
    sensors = {}
    for row in result:
        sensors[row.sensor_id] = {
            'lat': row.lat,
            'lon': row.lon,
            'type': row.type,
            'road': row.road
        }
    
    cluster.shutdown()
    
    print(f"📍 Loaded {len(sensors)} sensors from database")
    
    try:
        while True:
            for sensor_id, sensor_data in sensors.items():
                timestamp = datetime.now(timezone.utc).isoformat()
                
                if sensor_data['type'] == 'traffic_loop':
                    data = generate_traffic_data(sensor_id, sensor_data['lat'], sensor_data['lon'])
                    for metric, value in data.items():
                        message = {
                            'sensor_id': sensor_id,
                            'ts': timestamp,
                            'metric': metric,
                            'value': value,
                            'location': {
                                'city': 'Prishtina',
                                'road': sensor_data['road'],
                                'lat': sensor_data['lat'],
                                'lon': sensor_data['lon']
                            }
                        }
                        producer.send(KAFKA_TOPIC, key=sensor_id.encode(), value=message)
                
                elif sensor_data['type'] == 'air_quality':
                    data = generate_air_quality_data(sensor_id, sensor_data['lat'], sensor_data['lon'])
                    for metric, value in data.items():
                        message = {
                            'sensor_id': sensor_id,
                            'ts': timestamp,
                            'metric': metric,
                            'value': value,
                            'location': {
                                'city': 'Prishtina',
                                'road': sensor_data['road'],
                                'lat': sensor_data['lat'],
                                'lon': sensor_data['lon']
                            }
                        }
                        producer.send(KAFKA_TOPIC, key=sensor_id.encode(), value=message)
                
                elif sensor_data['type'] == 'noise':
                    data = generate_noise_data(sensor_id, sensor_data['lat'], sensor_data['lon'])
                    for metric, value in data.items():
                        message = {
                            'sensor_id': sensor_id,
                            'ts': timestamp,
                            'metric': metric,
                            'value': value,
                            'location': {
                                'city': 'Prishtina',
                                'road': sensor_data['road'],
                                'lat': sensor_data['lat'],
                                'lon': sensor_data['lon']
                            }
                        }
                        producer.send(KAFKA_TOPIC, key=sensor_id.encode(), value=message)
            
            time.sleep(60)  # Send data every minute
            
    except KeyboardInterrupt:
        print("🛑 Stopping simulator...")
    finally:
        producer.close()

if __name__ == "__main__":
    main()
