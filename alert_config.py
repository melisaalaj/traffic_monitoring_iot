#!/usr/bin/env python3
"""
Alert Configuration for IoT Traffic Monitoring System
"""

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID = "your-twilio-account-sid"
TWILIO_AUTH_TOKEN = "your-twilio-auth-token"
TWILIO_FROM_NUMBER = "your-twilio-from-number"
TWILIO_TO_NUMBER = "your-phone-number"

# Alert thresholds - REALISTIC values based on simulator ranges
# Alert thresholds - TESTING values (slightly more sensitive)
ALERT_THRESHOLDS = {
    'traffic_loop': {
        'wait_time_s': {'warning': 8, 'critical': 12},     # Current avg: 10.4s
        'vehicle_count': {'warning': 8, 'critical': 12},   # Current avg: 10.3
        'avg_speed': {'warning': 55, 'critical': 60}       # Current avg: 52.5 (higher speeds = warning)
    },
    'air_quality': {
        'pm25': {'warning': 15, 'critical': 20},           # Current avg: 18.9
        'co': {'warning': 5, 'critical': 8}                # Realistic CO levels
    },
    'noise': {
        'noise_db': {'warning': 50, 'critical': 55}        # Current avg: 52.2
    }
}

# Notification settings
NOTIFICATION_SETTINGS = {
    'sms_enabled': True,
    'check_interval_minutes': 1
}

# Alert recipients
ALERT_RECIPIENTS = {
    'sms': [TWILIO_TO_NUMBER]
}
