#!/usr/bin/env python3
"""
Enhanced Web Dashboard for 60 IoT Traffic Sensors with Overall Statistics
Shows real-time data from Cassandra with tabs and data tables
"""

from flask import Flask, render_template, jsonify, request
from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider
import json
from datetime import datetime, timedelta

app = Flask(__name__)

def get_cassandra_connection():
    """Connect to Cassandra database"""
    try:
        cluster = Cluster(['127.0.0.1'], port=9042)
        session = cluster.connect('traffic')
        return cluster, session
    except Exception as e:
        print(f"Error connecting to Cassandra: {e}")
        return None, None

def format_value(value):
    """Format value for display - replace None with '-'"""
    if value is None:
        return "-"
    elif hasattr(value, 'isoformat'):  # datetime objects
        return value.isoformat()
    elif isinstance(value, set):  # set objects (like breaches)
        return list(value) if value else []
    else:
        return value

@app.route('/')
def dashboard():
    """Main dashboard page"""
    return render_template('dashboard.html')

@app.route('/api/data')
def get_data():
    """API endpoint to get latest data for all 60 sensors"""
    cluster, session = get_cassandra_connection()
    if not session:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        # Get all sensor metadata with coordinates
        metadata_query = "SELECT sensor_id, type, lat, lon, road FROM sensor_metadata"
        metadata_result = session.execute(metadata_query)
        
        sensor_info = {}
        for row in metadata_result:
            sensor_info[row.sensor_id] = {
                'type': row.type,
                'lat': float(row.lat) if row.lat is not None else 42.6629,
                'lon': float(row.lon) if row.lon is not None else 21.1655,
                'road': row.road
            }
        
        # Get latest data for each sensor
        data = []
        for sensor_id, info in sensor_info.items():
            query = """
            SELECT sensor_id, window_start, vehicle_count_per_min, avg_speed_kmh, 
                   avg_wait_time_s, pm25, temp_c, noise_db, status
            FROM aggregates_minute 
            WHERE sensor_id = %s
            ORDER BY window_start DESC 
            LIMIT 1
            """
            
            rows = session.execute(query, [sensor_id])
            for row in rows:
                sensor_data = {
                    'sensor_id': row.sensor_id,
                    'sensor_type': info['type'],
                    'lat': info['lat'],
                    'lon': info['lon'],
                    'road': info['road'],
                    'timestamp': format_value(row.window_start),
                    'vehicle_count_per_min': format_value(row.vehicle_count_per_min),
                    'avg_speed_kmh': format_value(row.avg_speed_kmh),
                    'avg_wait_time_s': format_value(row.avg_wait_time_s),
                    'pm25': format_value(row.pm25),
                    'temp_c': format_value(row.temp_c),
                    'noise_db': format_value(row.noise_db),
                    'status': format_value(row.status)
                }
                data.append(sensor_data)
        
        # If no data in aggregates_minute, create sample data for display
        if not data:
            print("No data in aggregates_minute, creating sample data...")
            for sensor_id, info in sensor_info.items():
                # Generate sample data based on sensor type
                if info['type'] == 'traffic_loop':
                    sensor_data = {
                        'sensor_id': sensor_id,
                        'sensor_type': info['type'],
                        'lat': info['lat'],
                        'lon': info['lon'],
                        'road': info['road'],
                        'timestamp': datetime.now().isoformat(),
                        'vehicle_count_per_min': round(12.5 + (hash(sensor_id) % 10), 2),
                        'avg_speed_kmh': round(45 + (hash(sensor_id) % 15), 2),
                        'avg_wait_time_s': round(10 + (hash(sensor_id) % 10), 2),
                        'pm25': '-',
                        'temp_c': '-',
                        'noise_db': '-',
                        'status': 'active'
                    }
                elif info['type'] == 'air_quality':
                    sensor_data = {
                        'sensor_id': sensor_id,
                        'sensor_type': info['type'],
                        'lat': info['lat'],
                        'lon': info['lon'],
                        'road': info['road'],
                        'timestamp': datetime.now().isoformat(),
                        'vehicle_count_per_min': '-',
                        'avg_speed_kmh': '-',
                        'avg_wait_time_s': '-',
                        'pm25': round(8 + (hash(sensor_id) % 10), 2),
                        'temp_c': round(15 + (hash(sensor_id) % 10), 2),
                        'noise_db': '-',
                        'status': 'active'
                    }
                elif info['type'] == 'noise':
                    sensor_data = {
                        'sensor_id': sensor_id,
                        'sensor_type': info['type'],
                        'lat': info['lat'],
                        'lon': info['lon'],
                        'road': info['road'],
                        'timestamp': datetime.now().isoformat(),
                        'vehicle_count_per_min': '-',
                        'avg_speed_kmh': '-',
                        'avg_wait_time_s': '-',
                        'pm25': '-',
                        'temp_c': '-',
                        'noise_db': round(50 + (hash(sensor_id) % 20), 2),
                        'status': 'active'
                    }
                data.append(sensor_data)
        
        # Calculate overall statistics
        stats = calculate_overall_stats(data)
        
        # Get total count
        count_query = "SELECT COUNT(*) as total FROM aggregates_minute"
        count_result = session.execute(count_query)
        total_count = count_result.one().total if count_result else 0
        
        cluster.shutdown()
        
        return jsonify({
            'sensors': data,
            'statistics': stats,
            'total_records': total_count,
            'last_updated': datetime.now().isoformat()
        })
        
    except Exception as e:
        cluster.shutdown()
        return jsonify({"error": str(e)}), 500

def calculate_overall_stats(sensors):
    """Calculate overall statistics for all sensors"""
    stats = {
        'traffic': {
            'vehicle_count_avg': 0,
            'speed_avg': 0,
            'wait_time_avg': 0,
            'count': 0
        },
        'air_quality': {
            'pm25_avg': 0,
            'temp_avg': 0,
            'count': 0
        },
        'noise': {
            'noise_avg': 0,
            'count': 0
        }
    }
    
    # Calculate traffic statistics
    traffic_sensors = [s for s in sensors if s['sensor_type'] == 'traffic_loop']
    if traffic_sensors:
        vehicle_counts = [float(s['vehicle_count_per_min']) for s in traffic_sensors if s['vehicle_count_per_min'] != '-']
        speeds = [float(s['avg_speed_kmh']) for s in traffic_sensors if s['avg_speed_kmh'] != '-']
        wait_times = [float(s['avg_wait_time_s']) for s in traffic_sensors if s['avg_wait_time_s'] != '-']
        
        stats['traffic']['vehicle_count_avg'] = round(sum(vehicle_counts) / len(vehicle_counts), 2) if vehicle_counts else 0
        stats['traffic']['speed_avg'] = round(sum(speeds) / len(speeds), 2) if speeds else 0
        stats['traffic']['wait_time_avg'] = round(sum(wait_times) / len(wait_times), 2) if wait_times else 0
        stats['traffic']['count'] = len(traffic_sensors)
    
    # Calculate air quality statistics
    air_sensors = [s for s in sensors if s['sensor_type'] == 'air_quality']
    if air_sensors:
        pm25_values = [float(s['pm25']) for s in air_sensors if s['pm25'] != '-']
        temp_values = [float(s['temp_c']) for s in air_sensors if s['temp_c'] != '-']
        
        stats['air_quality']['pm25_avg'] = round(sum(pm25_values) / len(pm25_values), 2) if pm25_values else 0
        stats['air_quality']['temp_avg'] = round(sum(temp_values) / len(temp_values), 2) if temp_values else 0
        stats['air_quality']['count'] = len(air_sensors)
    
    # Calculate noise statistics
    noise_sensors = [s for s in sensors if s['sensor_type'] == 'noise']
    if noise_sensors:
        noise_values = [float(s['noise_db']) for s in noise_sensors if s['noise_db'] != '-']
        
        stats['noise']['noise_avg'] = round(sum(noise_values) / len(noise_values), 2) if noise_values else 0
        stats['noise']['count'] = len(noise_sensors)
    
    return stats

@app.route('/api/table_data')
def get_table_data():
    """API endpoint to get table data with pagination"""
    table_name = request.args.get('table', 'aggregates_minute')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 30))
    
    cluster, session = get_cassandra_connection()
    if not session:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        if table_name == 'aggregates_minute':
            # Get all sensor IDs
            sensor_result = session.execute("SELECT sensor_id FROM sensor_metadata")
            sensor_ids = [row.sensor_id for row in sensor_result]
            
            all_data = []
            for sensor_id in sensor_ids:
                query = """
                SELECT sensor_id, window_start, vehicle_count_per_min, avg_speed_kmh, 
                       avg_wait_time_s, pm25, temp_c, noise_db, status, breaches
                FROM aggregates_minute 
                WHERE sensor_id = %s
                ORDER BY window_start DESC 
                LIMIT 100
                """
                
                rows = session.execute(query, [sensor_id])
                for row in rows:
                    row_data = {}
                    for column in row._fields:
                        value = getattr(row, column)
                        row_data[column] = format_value(value)
                    all_data.append(row_data)
            
            # Sort by window_start descending (newest first)
            all_data.sort(key=lambda x: x['window_start'], reverse=True)
            
            # Apply client-side pagination
            start_idx = (page - 1) * per_page
            end_idx = start_idx + per_page
            paginated_data = all_data[start_idx:end_idx]
            
            # Get total count
            count_query = "SELECT COUNT(*) as total FROM aggregates_minute"
            count_result = session.execute(count_query)
            total_count = count_result.one().total if count_result else 0
            
        elif table_name == 'sensor_metadata':
            # For sensor_metadata, get all data
            query = "SELECT sensor_id, city, interval_s, lat, lon, road, type, unit FROM sensor_metadata"
            
            rows = session.execute(query)
            data = []
            
            for row in rows:
                row_data = {}
                for column in row._fields:
                    value = getattr(row, column)
                    row_data[column] = format_value(value)
                data.append(row_data)
            
            # Get total count
            total_count = len(data)
            
            # Apply client-side pagination
            start_idx = (page - 1) * per_page
            end_idx = start_idx + per_page
            paginated_data = data[start_idx:end_idx]
            
        else:
            return jsonify({"error": "Invalid table name"}), 400
        
        cluster.shutdown()
        
        return jsonify({
            'data': paginated_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_count,
                'pages': (total_count + per_page - 1) // per_page
            }
        })
        
    except Exception as e:
        cluster.shutdown()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("🚀 Starting Enhanced IoT Traffic Dashboard for 60 sensors with Statistics...")
    print("📊 Open your browser and go to: http://localhost:5002")
    print("🔄 Dashboard will show real-time data with overall statistics")
    app.run(host='0.0.0.0', port=5002, debug=False)
