#!/usr/bin/env python3
"""
Alert API Endpoints
"""

import json
import logging
from datetime import datetime, timedelta
from flask import Blueprint, jsonify
from cassandra.cluster import Cluster

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

alert_bp = Blueprint('alerts', __name__)

# Cassandra connection
cassandra_cluster = Cluster(['127.0.0.1'], port=9042)
cassandra_session = cassandra_cluster.connect('traffic')

@alert_bp.route('/api/alerts/active', methods=['GET'])
def get_active_alerts():
    try:
        # Get unresolved alerts
        query = "SELECT * FROM alerts WHERE resolved = false ALLOW FILTERING"
        rows = cassandra_session.execute(query)
        
        alerts = []
        for row in rows:
            alert = {
                'alert_id': str(row.alert_id),
                'sensor_id': row.sensor_id,
                'sensor_type': row.sensor_type,
                'metric': row.metric,
                'value': float(row.value),
                'severity': row.severity,
                'message': row.message,
                'location': dict(row.location) if row.location else {},
                'timestamp': row.timestamp.isoformat() if row.timestamp else None,
                'resolved': row.resolved
            }
            alerts.append(alert)
        
        return jsonify({
            'alerts': alerts,
            'count': len(alerts)
        })
        
    except Exception as e:
        logger.error(f"Error fetching active alerts: {e}")
        return jsonify({'error': str(e)}), 500

@alert_bp.route('/api/alerts/stats', methods=['GET'])
def get_alert_stats():
    try:
        # Get total alerts
        total_query = "SELECT COUNT(*) FROM alerts"
        total_result = cassandra_session.execute(total_query)
        total_alerts = total_result.one().count
        
        # Get active alerts count
        active_query = "SELECT COUNT(*) FROM alerts WHERE resolved = false ALLOW FILTERING"
        active_result = cassandra_session.execute(active_query)
        active_alerts = active_result.one().count
        
        # Get critical count
        critical_query = "SELECT COUNT(*) FROM alerts WHERE severity = 'critical' AND resolved = false ALLOW FILTERING"
        critical_result = cassandra_session.execute(critical_query)
        critical_count = critical_result.one().count
        
        # Get warning count
        warning_query = "SELECT COUNT(*) FROM alerts WHERE severity = 'warning' AND resolved = false ALLOW FILTERING"
        warning_result = cassandra_session.execute(warning_query)
        warning_count = warning_result.one().count
        
        return jsonify({
            'total_alerts': total_alerts,
            'active_alerts': active_alerts,
            'critical_count': critical_count,
            'warning_count': warning_count
        })
        
    except Exception as e:
        logger.error(f"Error fetching alert stats: {e}")
        return jsonify({'error': str(e)}), 500

@alert_bp.route('/api/alerts/resolve/<alert_id>', methods=['POST'])
def resolve_alert(alert_id):
    try:
        # Mark alert as resolved
        query = "UPDATE alerts SET resolved = true WHERE alert_id = ?"
        cassandra_session.execute(query, [alert_id])
        
        return jsonify({'message': 'Alert resolved successfully'})
        
    except Exception as e:
        logger.error(f"Error resolving alert: {e}")
        return jsonify({'error': str(e)}), 500

@alert_bp.route('/api/alerts/clear', methods=['POST'])
def clear_all_alerts():
    try:
        # Clear all alerts
        query = "TRUNCATE alerts"
        cassandra_session.execute(query)
        
        return jsonify({'message': 'All alerts cleared successfully'})
        
    except Exception as e:
        logger.error(f"Error clearing alerts: {e}")
        return jsonify({'error': str(e)}), 500
