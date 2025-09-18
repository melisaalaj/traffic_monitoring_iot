#!/usr/bin/env python3
"""
Pre-train AI Models for Spark Streaming
Ensures ML models are trained and saved before Spark Streaming starts
"""

import numpy as np
import logging
from ai_traffic_classifier import AITrafficAnalyzer

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def generate_training_data(num_samples=500):
    """Generate diverse training data for all AI models"""
    
    logger.info(f"🎯 Generating {num_samples} training samples...")
    
    training_data = []
    
    for i in range(num_samples):
        # Create realistic traffic scenarios
        hour = np.random.randint(0, 24)
        
        # Rush hour patterns
        if hour in [7, 8, 17, 18, 19]:  # Rush hours
            base_vehicles = np.random.normal(35, 8)
            base_speed = np.random.normal(25, 10)
            base_wait = np.random.normal(45, 15)
        elif hour in [9, 10, 11, 14, 15, 16]:  # Moderate traffic
            base_vehicles = np.random.normal(20, 6)
            base_speed = np.random.normal(45, 12)
            base_wait = np.random.normal(25, 10)
        else:  # Light traffic
            base_vehicles = np.random.normal(8, 4)
            base_speed = np.random.normal(55, 8)
            base_wait = np.random.normal(10, 5)
        
        # Add some randomness and ensure positive values
        vehicle_count = max(1, base_vehicles + np.random.normal(0, 3))
        avg_speed = max(5, base_speed + np.random.normal(0, 5))
        wait_time = max(1, base_wait + np.random.normal(0, 8))
        
        # Add some anomalies (10% of data)
        if np.random.random() < 0.1:
            if np.random.random() < 0.5:
                # Traffic jam anomaly
                vehicle_count *= 1.5
                avg_speed *= 0.3
                wait_time *= 2.5
            else:
                # Unusual speed anomaly
                avg_speed *= 2.0
                wait_time *= 0.3
        
        training_data.append({
            'vehicle_count': vehicle_count,
            'avg_speed': avg_speed,
            'wait_time_s': wait_time,
            'hour': hour
        })
    
    logger.info(f"✅ Generated {len(training_data)} training samples")
    return training_data

def train_all_models():
    """Train all AI models and save them"""
    
    logger.info("🚀 Starting AI Model Training for Spark Streaming")
    
    # Initialize AI analyzer
    ai_analyzer = AITrafficAnalyzer()
    
    # Generate training data
    training_data = generate_training_data(500)
    
    logger.info("🤖 Training AI Models...")
    
    # Feed training data to AI analyzer
    for i, data in enumerate(training_data):
        # The analyze_traffic method automatically accumulates training data
        result = ai_analyzer.analyze_traffic(f'sensor_{i % 20}', data)
        
        if i % 100 == 0:
            logger.info(f"   📊 Processed {i}/{len(training_data)} samples...")
    
    logger.info("✅ AI Model Training Complete!")
    
    # Test the trained models
    logger.info("🧪 Testing trained models...")
    
    test_scenarios = [
        {'vehicle_count': 45, 'avg_speed': 15, 'wait_time_s': 60, 'name': 'Heavy Traffic'},
        {'vehicle_count': 25, 'avg_speed': 35, 'wait_time_s': 30, 'name': 'Moderate Traffic'},
        {'vehicle_count': 8, 'avg_speed': 55, 'wait_time_s': 8, 'name': 'Light Traffic'},
        {'vehicle_count': 50, 'avg_speed': 5, 'wait_time_s': 120, 'name': 'Traffic Jam (Anomaly)'}
    ]
    
    for scenario in test_scenarios:
        result = ai_analyzer.analyze_traffic('test_sensor', scenario)
        logger.info(f"   🎯 {scenario['name']}: {result['traffic_state']} "
                   f"(conf: {result['confidence']:.2f}, "
                   f"anomaly: {result['anomaly_detection']['is_anomaly']})")
    
    logger.info("🎉 AI Models are ready for Spark Streaming!")
    return ai_analyzer

if __name__ == "__main__":
    train_all_models() 