#!/usr/bin/env python3
"""
Critical Alert Checker - SHORT SMS for trial account
"""

import time
import logging
from datetime import datetime, timedelta
from cassandra.cluster import Cluster
from twilio.rest import Client
import alert_config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/tmp/sms_notification.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class CriticalAlertChecker:
    def __init__(self):
        self.twilio_client = Client(alert_config.TWILIO_ACCOUNT_SID, alert_config.TWILIO_AUTH_TOKEN)
        self.cassandra_session = None
        self.setup_cassandra()
        
    def setup_cassandra(self):
        """Connect to Cassandra"""
        try:
            cluster = Cluster(['127.0.0.1'], port=9042)
            self.cassandra_session = cluster.connect('traffic')
            logger.info("✅ Connected to Cassandra")
        except Exception as e:
            logger.error(f"❌ Failed to connect to Cassandra: {e}")
            raise
    
    def get_new_critical_alerts(self):
        """Get NEW critical alerts since last check"""
        try:
            current_time = datetime.now()
            one_minute_ago = current_time - timedelta(minutes=1)
            
            query = """
            SELECT * FROM alerts 
            WHERE severity = 'critical' 
            AND timestamp > %s
            ALLOW FILTERING
            """
            
            result = self.cassandra_session.execute(query, [one_minute_ago])
            alerts = list(result)
            
            logger.info(f"🔍 Found {len(alerts)} new critical alerts in the last minute")
            return alerts
            
        except Exception as e:
            logger.error(f"Error getting new critical alerts: {e}")
            return []
    
    def send_sms(self, message):
        """Send SMS notification"""
        try:
            message_obj = self.twilio_client.messages.create(
                body=message,
                from_=alert_config.TWILIO_FROM_NUMBER,
                to=alert_config.TWILIO_TO_NUMBER
            )
            logger.info(f"📱 SMS sent successfully: {message_obj.sid}")
            return True
        except Exception as e:
            logger.error(f"❌ Error sending SMS: {e}")
            return False
    
    def create_short_message(self, alert):
        """Create SHORT SMS message for trial account"""
        sensor_type = alert.sensor_type
        location = alert.location.get('road', 'Unknown')
        metric = alert.metric
        value = alert.value
        
        # Very short message to avoid trial limits
        if sensor_type == 'air_quality':
            emoji = "��️"
            alert_type = "AIR"
        elif sensor_type == 'traffic_loop':
            emoji = "🚗"
            alert_type = "TRAFFIC"
        elif sensor_type == 'noise':
            emoji = "🔊"
            alert_type = "NOISE"
        else:
            emoji = "⚠️"
            alert_type = "ALERT"
        
        # SHORT message - under 160 characters
        sms_message = f"🚨{emoji} {alert_type} ALERT!\n{location}: {metric}={value}"
        
        return sms_message
    
    def process_new_alerts(self):
        """Process new critical alerts"""
        try:
            new_alerts = self.get_new_critical_alerts()
            
            if new_alerts:
                logger.info(f"🚨 Found {len(new_alerts)} new critical alerts!")
                
                for alert in new_alerts:
                    # Create SHORT SMS message
                    sms_message = self.create_short_message(alert)
                    
                    logger.info(f"🚨 Sending SHORT SMS for {alert.sensor_type}: {alert.sensor_id}")
                    logger.info(f"📱 Message: {sms_message}")
                    self.send_sms(sms_message)
                    
                    # Small delay between SMS
                    time.sleep(3)
            else:
                logger.info("✅ No new critical alerts in the last minute")
                
        except Exception as e:
            logger.error(f"Error processing new alerts: {e}")
    
    def run(self):
        """Main loop - check every minute"""
        logger.info("�� Critical Alert Checker started (SHORT SMS)")
        logger.info("⏰ Checking every minute for NEW critical alerts")
        logger.info("📱 Will send SHORT SMS to avoid trial limits")
        
        while True:
            try:
                logger.info("🔍 Checking for new critical alerts...")
                self.process_new_alerts()
                
                # Wait 1 minute
                logger.info("⏳ Waiting 1 minute before next check...")
                time.sleep(60)
                
            except KeyboardInterrupt:
                logger.info("🛑 Critical Alert Checker stopped")
                break
            except Exception as e:
                logger.error(f"Error in main loop: {e}")
                time.sleep(10)

if __name__ == "__main__":
    checker = CriticalAlertChecker()
    checker.run()
