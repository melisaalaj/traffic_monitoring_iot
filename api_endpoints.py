#!/usr/bin/env python3
"""
API Endpoints for IoT Traffic Monitoring Dashboard
Provides REST API endpoints for sensor data and statistics
"""

from flask import Blueprint, jsonify, request
from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider
import json
from datetime import datetime, timedelta

# Create Blueprint for API routes
api_bp = Blueprint('api', __name__, url_prefix='/api')

# Register alert endpoints

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

def calculate_overall_stats(sensors):
    """Calculate overall statistics for all sensor types"""
    stats = {
        'traffic': {
            'count': 0,
            'vehicle_count_avg': 0,
            'speed_avg': 0,
            'wait_time_avg': 0
        },
        'air_quality': {
            'count': 0,
            'pm25_avg': 0,
            'temp_avg': 0
        },
        'noise': {
            'count': 0,
            'noise_avg': 0
        }
    }
    
    # Group sensors by type
    traffic_sensors = [s for s in sensors if s['sensor_type'] == 'traffic_loop']
    air_sensors = [s for s in sensors if s['sensor_type'] == 'air_quality']
    noise_sensors = [s for s in sensors if s['sensor_type'] == 'noise']
    
    # Calculate traffic statistics
    if traffic_sensors:
        valid_vehicle_counts = [float(s['vehicle_count_per_min']) for s in traffic_sensors 
                              if s['vehicle_count_per_min'] not in ['-', None]]
        valid_speeds = [float(s['avg_speed_kmh']) for s in traffic_sensors 
                       if s['avg_speed_kmh'] not in ['-', None]]
        valid_wait_times = [float(s['avg_wait_time_s']) for s in traffic_sensors 
                           if s['avg_wait_time_s'] not in ['-', None]]
        
        stats['traffic']['vehicle_count_avg'] = sum(valid_vehicle_counts) / len(valid_vehicle_counts) if valid_vehicle_counts else 0
        stats['traffic']['speed_avg'] = sum(valid_speeds) / len(valid_speeds) if valid_speeds else 0
        stats['traffic']['wait_time_avg'] = sum(valid_wait_times) / len(valid_wait_times) if valid_wait_times else 0
        stats['traffic']['count'] = len(traffic_sensors)
    
    # Calculate air quality statistics
    if air_sensors:
        valid_pm25 = [float(s['pm25']) for s in air_sensors if s['pm25'] not in ['-', None]]
        valid_temps = [float(s['temp_c']) for s in air_sensors if s['temp_c'] not in ['-', None]]
        
        stats['air_quality']['pm25_avg'] = sum(valid_pm25) / len(valid_pm25) if valid_pm25 else 0
        stats['air_quality']['temp_avg'] = sum(valid_temps) / len(valid_temps) if valid_temps else 0
        stats['air_quality']['count'] = len(air_sensors)
    
    # Calculate noise statistics
    if noise_sensors:
        valid_noise = [float(s['noise_db']) for s in noise_sensors if s['noise_db'] not in ['-', None]]
        
        stats['noise']['noise_avg'] = sum(valid_noise) / len(valid_noise) if valid_noise else 0
        stats['noise']['count'] = len(noise_sensors)
    
    return stats

@api_bp.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "IoT Traffic Monitoring API"
    })

@api_bp.route('/data')
def get_sensor_data():
    """Get latest data for all sensors with statistics"""
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
        
        # Calculate overall statistics
        stats = calculate_overall_stats(data)
        
        cluster.shutdown()
        
        return jsonify({
            "sensors": data,
            "statistics": stats,
            "last_updated": datetime.now().isoformat(),
            "total_sensors": len(data)
        })
        
    except Exception as e:
        cluster.shutdown()
        return jsonify({"error": str(e)}), 500

@api_bp.route('/sensors/<sensor_id>')
def get_single_sensor(sensor_id):
    """Get data for a specific sensor"""
    cluster, session = get_cassandra_connection()
    if not session:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        # Get sensor metadata
        metadata_query = "SELECT sensor_id, type, lat, lon, road FROM sensor_metadata WHERE sensor_id = %s"
        metadata_result = session.execute(metadata_query, [sensor_id])
        metadata_row = metadata_result.one()
        
        if not metadata_row:
            return jsonify({"error": "Sensor not found"}), 404
        
        # Get latest sensor data
        data_query = """
        SELECT sensor_id, window_start, vehicle_count_per_min, avg_speed_kmh, 
               avg_wait_time_s, pm25, temp_c, noise_db, status
        FROM aggregates_minute 
        WHERE sensor_id = %s
        ORDER BY window_start DESC 
        LIMIT 10
        """
        
        data_rows = session.execute(data_query, [sensor_id])
        readings = []
        
        for row in data_rows:
            reading = {
                'sensor_id': row.sensor_id,
                'timestamp': format_value(row.window_start),
                'vehicle_count_per_min': format_value(row.vehicle_count_per_min),
                'avg_speed_kmh': format_value(row.avg_speed_kmh),
                'avg_wait_time_s': format_value(row.avg_wait_time_s),
                'pm25': format_value(row.pm25),
                'temp_c': format_value(row.temp_c),
                'noise_db': format_value(row.noise_db),
                'status': format_value(row.status)
            }
            readings.append(reading)
        
        cluster.shutdown()
        
        return jsonify({
            "sensor_id": sensor_id,
            "sensor_type": metadata_row.type,
            "location": {
                "lat": float(metadata_row.lat) if metadata_row.lat is not None else 42.6629,
                "lon": float(metadata_row.lon) if metadata_row.lon is not None else 21.1655,
                "road": metadata_row.road
            },
            "readings": readings,
            "total_readings": len(readings)
        })
        
    except Exception as e:
        cluster.shutdown()
        return jsonify({"error": str(e)}), 500

@api_bp.route('/sensors/type/<sensor_type>')
def get_sensors_by_type(sensor_type):
    """Get all sensors of a specific type"""
    cluster, session = get_cassandra_connection()
    if not session:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        # Get sensors of specific type
        metadata_query = "SELECT sensor_id, type, lat, lon, road FROM sensor_metadata WHERE type = %s ALLOW FILTERING"
        metadata_result = session.execute(metadata_query, [sensor_type])
        
        sensors = []
        for row in metadata_result:
            # Get latest data for this sensor
            data_query = """
            SELECT sensor_id, window_start, vehicle_count_per_min, avg_speed_kmh, 
                   avg_wait_time_s, pm25, temp_c, noise_db, status
            FROM aggregates_minute 
            WHERE sensor_id = %s
            ORDER BY window_start DESC 
            LIMIT 1
            """
            
            data_rows = session.execute(data_query, [row.sensor_id])
            data_row = data_rows.one() if data_rows else None
            
            sensor_data = {
                'sensor_id': row.sensor_id,
                'sensor_type': row.type,
                'lat': float(row.lat) if row.lat is not None else 42.6629,
                'lon': float(row.lon) if row.lon is not None else 21.1655,
                'road': row.road
            }
            
            if data_row:
                sensor_data.update({
                    'timestamp': format_value(data_row.window_start),
                    'vehicle_count_per_min': format_value(data_row.vehicle_count_per_min),
                    'avg_speed_kmh': format_value(data_row.avg_speed_kmh),
                    'avg_wait_time_s': format_value(data_row.avg_wait_time_s),
                    'pm25': format_value(data_row.pm25),
                    'temp_c': format_value(data_row.temp_c),
                    'noise_db': format_value(data_row.noise_db),
                    'status': format_value(data_row.status)
                })
            
            sensors.append(sensor_data)
        
        cluster.shutdown()
        
        return jsonify({
            "sensor_type": sensor_type,
            "sensors": sensors,
            "total_sensors": len(sensors)
        })
        
    except Exception as e:
        cluster.shutdown()
        return jsonify({"error": str(e)}), 500

@api_bp.route('/statistics')
def get_statistics():
    """Get overall statistics for all sensor types"""
    cluster, session = get_cassandra_connection()
    if not session:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        # Get all sensor data for statistics
        metadata_query = "SELECT sensor_id, type FROM sensor_metadata"
        metadata_result = session.execute(metadata_query)
        
        all_sensors = []
        for row in metadata_result:
            # Get latest data for this sensor
            data_query = """
            SELECT sensor_id, vehicle_count_per_min, avg_speed_kmh, 
                   avg_wait_time_s, pm25, temp_c, noise_db, status
            FROM aggregates_minute 
            WHERE sensor_id = %s
            ORDER BY window_start DESC 
            LIMIT 1
            """
            
            data_rows = session.execute(data_query, [row.sensor_id])
            data_row = data_rows.one() if data_rows else None
            
            if data_row:
                sensor_data = {
                    'sensor_type': row.type,
                    'vehicle_count_per_min': format_value(data_row.vehicle_count_per_min),
                    'avg_speed_kmh': format_value(data_row.avg_speed_kmh),
                    'avg_wait_time_s': format_value(data_row.avg_wait_time_s),
                    'pm25': format_value(data_row.pm25),
                    'temp_c': format_value(data_row.temp_c),
                    'noise_db': format_value(data_row.noise_db),
                }
                all_sensors.append(sensor_data)
        
        stats = calculate_overall_stats(all_sensors)
        
        cluster.shutdown()
        
        return jsonify({
            "statistics": stats,
            "generated_at": datetime.now().isoformat()
        })
        
    except Exception as e:
        cluster.shutdown()
        return jsonify({"error": str(e)}), 500

@api_bp.route('/table_data')
def get_table_data():
    """Get table data with pagination"""
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

@api_bp.route('/metadata')
def get_sensor_metadata():
    """Get all sensor metadata"""
    cluster, session = get_cassandra_connection()
    if not session:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        query = "SELECT sensor_id, city, interval_s, lat, lon, road, type, unit FROM sensor_metadata"
        rows = session.execute(query)
        
        sensors = []
        for row in rows:
            sensor_data = {
                'sensor_id': row.sensor_id,
                'city': row.city,
                'interval_s': row.interval_s,
                'lat': float(row.lat) if row.lat is not None else 42.6629,
                'lon': float(row.lon) if row.lon is not None else 21.1655,
                'road': row.road,
                'type': row.type,
                'unit': row.unit
            }
            sensors.append(sensor_data)
        
        cluster.shutdown()
        
        return jsonify({
            'sensors': sensors,
            'total_sensors': len(sensors)
        })
        
    except Exception as e:
        cluster.shutdown()
        return jsonify({"error": str(e)}), 500

@api_bp.route('/traffic/historical')
def get_historical_traffic():
    """Get historical traffic data for time-based analysis"""
    period = request.args.get('period', '1hour')
    granularity = request.args.get('granularity', '1min')
    
    # Determine how many records to fetch based on period and granularity
    period_minutes = {
        '1hour': 60,
        '2days': 2880,      # 48 hours * 60 minutes
        '1week': 10080      # 7 days * 24 hours * 60 minutes
    }
    
    granularity_factor = {
        '1min': 1,
        '5min': 5,
        '30min': 30,
        '1hour': 60,
        '1day': 1440        # 24 hours * 60 minutes
    }
    
    total_minutes = period_minutes.get(period, 60)
    grain_minutes = granularity_factor.get(granularity, 1)
    
    # Calculate how many records we need
    # For finer granularity, we need more records
    limit = min(total_minutes, 10000)  # Cap at 10k records for performance
    
    cluster, session = get_cassandra_connection()
    if not session:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        # Get traffic sensors
        metadata_query = "SELECT sensor_id FROM sensor_metadata WHERE type = 'traffic_loop' ALLOW FILTERING"
        metadata_result = session.execute(metadata_query)
        
        historical_data = []
        for row in metadata_result:
            # Get historical readings for each sensor
            data_query = """
            SELECT sensor_id, window_start, vehicle_count_per_min, avg_speed_kmh, avg_wait_time_s
            FROM aggregates_minute 
            WHERE sensor_id = %s
            ORDER BY window_start DESC 
            LIMIT %s
            """
            
            data_rows = session.execute(data_query, [row.sensor_id, limit])
            for data_row in data_rows:
                historical_data.append({
                    'sensor_id': data_row.sensor_id,
                    'timestamp': format_value(data_row.window_start),
                    'vehicle_count_per_min': format_value(data_row.vehicle_count_per_min),
                    'avg_speed_kmh': format_value(data_row.avg_speed_kmh),
                    'avg_wait_time_s': format_value(data_row.avg_wait_time_s)
                })
        
        cluster.shutdown()
        
        return jsonify({
            'historical_data': historical_data,
            'period': period,
            'total_records': len(historical_data)
        })
        
    except Exception as e:
        cluster.shutdown()
        return jsonify({"error": str(e)}), 500

@api_bp.route('/air_quality/historical')
def get_historical_air_quality():
    """Get historical air quality data for time-based analysis"""
    period = request.args.get('period', '1hour')
    granularity = request.args.get('granularity', 'minute')
    
    limit_map = {
        '1hour': 60,
        '2days': 2880,
        '1week': 10080
    }
    limit = limit_map.get(period, 60)
    
    cluster, session = get_cassandra_connection()
    if not session:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        metadata_query = "SELECT sensor_id FROM sensor_metadata WHERE type = 'air_quality' ALLOW FILTERING"
        metadata_result = session.execute(metadata_query)
        
        historical_data = []
        for row in metadata_result:
            data_query = """
            SELECT sensor_id, window_start, pm25, temp_c
            FROM aggregates_minute 
            WHERE sensor_id = %s
            ORDER BY window_start DESC 
            LIMIT %s
            """
            
            data_rows = session.execute(data_query, [row.sensor_id, limit])
            for data_row in data_rows:
                historical_data.append({
                    'sensor_id': data_row.sensor_id,
                    'timestamp': format_value(data_row.window_start),
                    'pm25': format_value(data_row.pm25),
                    'temp_c': format_value(data_row.temp_c)
                })
        
        cluster.shutdown()
        
        return jsonify({
            'historical_data': historical_data,
            'period': period,
            'total_records': len(historical_data)
        })
        
    except Exception as e:
        cluster.shutdown()
        return jsonify({"error": str(e)}), 500

@api_bp.route('/noise/historical')
def get_historical_noise():
    """Get historical noise data for time-based analysis"""
    period = request.args.get('period', '1hour')
    granularity = request.args.get('granularity', 'minute')
    
    limit_map = {
        '1hour': 60,
        '2days': 2880,
        '1week': 10080
    }
    limit = limit_map.get(period, 60)
    
    cluster, session = get_cassandra_connection()
    if not session:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        metadata_query = "SELECT sensor_id FROM sensor_metadata WHERE type = 'noise' ALLOW FILTERING"
        metadata_result = session.execute(metadata_query)
        
        historical_data = []
        for row in metadata_result:
            data_query = """
            SELECT sensor_id, window_start, noise_db
            FROM aggregates_minute 
            WHERE sensor_id = %s
            ORDER BY window_start DESC 
            LIMIT %s
            """
            
            data_rows = session.execute(data_query, [row.sensor_id, limit])
            for data_row in data_rows:
                historical_data.append({
                    'sensor_id': data_row.sensor_id,
                    'timestamp': format_value(data_row.window_start),
                    'noise_db': format_value(data_row.noise_db)
                })
        
        cluster.shutdown()
        
        return jsonify({
            'historical_data': historical_data,
            'period': period,
            'total_records': len(historical_data)
        })
        
    except Exception as e:
        cluster.shutdown()
        return jsonify({"error": str(e)}), 500 