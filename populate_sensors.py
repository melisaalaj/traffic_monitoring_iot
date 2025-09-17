import random
from cassandra.cluster import Cluster

# Connect to Cassandra
cluster = Cluster(['127.0.0.1'], port=9042)
session = cluster.connect('traffic')

# Prepare the statement
insert_ps = session.prepare("""
    INSERT INTO sensor_metadata (
        sensor_id, type, unit, city, road, lat, lon, interval_s
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""")

# Prishtina coordinates (approximate center)
prishtina_lat = 42.6629
prishtina_lon = 21.1639

# Generate 60 sensors across Prishtina
sensors = []

# 20 Traffic Loop Sensors
for i in range(1, 21):
    sensor_id = f"Loop-{i:02d}"
    lat = prishtina_lat + random.uniform(-0.05, 0.05)
    lon = prishtina_lon + random.uniform(-0.05, 0.05)
    road = f"Road {i}"
    
    sensors.append({
        'sensor_id': sensor_id,
        'type': 'traffic_loop',
        'unit': 'vehicles/min',
        'city': 'Prishtina',
        'road': road,
        'lat': lat,
        'lon': lon,
        'interval_s': 60
    })

# 20 Air Quality Sensors
for i in range(1, 21):
    sensor_id = f"Air-{i:02d}"
    lat = prishtina_lat + random.uniform(-0.05, 0.05)
    lon = prishtina_lon + random.uniform(-0.05, 0.05)
    road = f"Air Quality Station {i}"
    
    sensors.append({
        'sensor_id': sensor_id,
        'type': 'air_quality',
        'unit': 'µg/m³',
        'city': 'Prishtina',
        'road': road,
        'lat': lat,
        'lon': lon,
        'interval_s': 60
    })

# 20 Noise Sensors
for i in range(1, 21):
    sensor_id = f"Noise-{i:02d}"
    lat = prishtina_lat + random.uniform(-0.05, 0.05)
    lon = prishtina_lon + random.uniform(-0.05, 0.05)
    road = f"Noise Monitoring Point {i}"
    
    sensors.append({
        'sensor_id': sensor_id,
        'type': 'noise',
        'unit': 'dB',
        'city': 'Prishtina',
        'road': road,
        'lat': lat,
        'lon': lon,
        'interval_s': 60
    })

# Insert sensors into database
print(f"Inserting {len(sensors)} sensors...")
for sensor in sensors:
    session.execute(insert_ps, [
        sensor['sensor_id'],
        sensor['type'],
        sensor['unit'],
        sensor['city'],
        sensor['road'],
        sensor['lat'],
        sensor['lon'],
        sensor['interval_s']
    ])

print("✅ Sensors inserted successfully!")

# Verify
result = session.execute("SELECT COUNT(*) FROM sensor_metadata")
count = result.one().count
print(f"📊 Total sensors in database: {count}")

cluster.shutdown()
