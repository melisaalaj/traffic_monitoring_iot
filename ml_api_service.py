#!/usr/bin/env python3
"""
ML Model API Service
Flask API that serves the trained AI models for Spark Streaming
"""

from flask import Flask, request, jsonify
import logging
import json
from datetime import datetime
import traceback
import numpy as np

# Import the trained AI system
from ai_traffic_classifier import AITrafficAnalyzer

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Global AI analyzer (loaded once when service starts)
ai_analyzer = None

def convert_to_json_serializable(obj):
    """Convert numpy types and other non-serializable types to JSON-safe types"""
    if isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif hasattr(obj, 'item'):  # numpy scalars
        return obj.item()
    else:
        return obj

def initialize_ai_models():
    """Initialize AI models on service startup"""
    global ai_analyzer
    
    try:
        logger.info("🚀 Initializing AI Models...")
        ai_analyzer = AITrafficAnalyzer()
        
        # Test with a sample prediction to ensure models work
        test_data = {
            'vehicle_count': 25.0,
            'avg_speed': 35.0,
            'wait_time_s': 20.0
        }
        
        test_result = ai_analyzer.analyze_traffic('test_sensor', test_data)
        logger.info(f"✅ AI Models initialized successfully")
        logger.info(f"🧪 Test prediction: {test_result['traffic_state']} (conf: {test_result['confidence']:.2f})")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize AI models: {str(e)}")
        logger.error(traceback.format_exc())
        return False

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'ML API Service',
        'timestamp': datetime.now().isoformat(),
        'ai_models_loaded': ai_analyzer is not None
    })

@app.route('/predict', methods=['POST'])
def predict_traffic():
    """Main prediction endpoint for traffic analysis"""
    try:
        # Get request data
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Extract required fields
        required_fields = ['vehicle_count', 'avg_speed', 'wait_time_s']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({
                'error': f'Missing required fields: {missing_fields}',
                'required_fields': required_fields
            }), 400
        
        # Extract sensor ID (optional)
        sensor_id = data.get('sensor_id', 'unknown_sensor')
        
        # Prepare traffic data
        traffic_data = {
            'vehicle_count': float(data['vehicle_count']),
            'avg_speed': float(data['avg_speed']),
            'wait_time_s': float(data['wait_time_s'])
        }
        
        # Get AI prediction
        if ai_analyzer is None:
            return jsonify({'error': 'AI models not initialized'}), 500
        
        ai_result = ai_analyzer.analyze_traffic(sensor_id, traffic_data)
        
        # Format response with explicit type conversion
        anomaly_detection = ai_result.get('anomaly_detection', {})
        response = {
            'sensor_id': str(sensor_id),
            'timestamp': datetime.now().isoformat(),
            'input_data': {
                'vehicle_count': convert_to_json_serializable(traffic_data['vehicle_count']),
                'avg_speed': convert_to_json_serializable(traffic_data['avg_speed']),
                'wait_time_s': convert_to_json_serializable(traffic_data['wait_time_s'])
            },
            'predictions': {
                'traffic_state': str(ai_result.get('traffic_state', 'Unknown')),
                'confidence': convert_to_json_serializable(ai_result.get('confidence', 0.0)),
                'severity': str(ai_result.get('severity', 'Low')),
                'predicted_duration': str(ai_result.get('predicted_duration', '10-20 minutes')),
                'anomaly_detected': convert_to_json_serializable(anomaly_detection.get('is_anomaly', False)),
                'anomaly_score': convert_to_json_serializable(anomaly_detection.get('anomaly_score', 0.0)),
                'model_version': 'hybrid-ai-v1.0'
            },
            'model_info': {
                'pattern_discovery': 'K-Means Clustering',
                'classification': 'Random Forest',
                'anomaly_detection': 'Isolation Forest'
            }
        }
        
        # Log prediction (optional, for monitoring)
        anomaly_flag = "🚨 ANOMALY" if response['predictions']['anomaly_detected'] else "✅ Normal"
        logger.info(f"🤖 Prediction [{sensor_id}]: {response['predictions']['traffic_state']} "
                   f"(conf: {response['predictions']['confidence']:.2f}) {anomaly_flag}")
        
        return jsonify(response)
        
    except ValueError as e:
        return jsonify({'error': f'Invalid data format: {str(e)}'}), 400
    except Exception as e:
        logger.error(f"❌ Prediction error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    """Batch prediction endpoint for multiple traffic readings"""
    try:
        data = request.get_json()
        
        if not data or 'batch' not in data:
            return jsonify({'error': 'Expected JSON with "batch" array'}), 400
        
        batch_data = data['batch']
        if not isinstance(batch_data, list):
            return jsonify({'error': 'Batch must be an array'}), 400
        
        if len(batch_data) > 100:  # Limit batch size
            return jsonify({'error': 'Batch size too large (max 100)'}), 400
        
        results = []
        
        for i, item in enumerate(batch_data):
            try:
                # Validate item
                required_fields = ['vehicle_count', 'avg_speed', 'wait_time_s']
                missing_fields = [field for field in required_fields if field not in item]
                
                if missing_fields:
                    results.append({
                        'index': i,
                        'error': f'Missing fields: {missing_fields}'
                    })
                    continue
                
                # Get prediction
                sensor_id = item.get('sensor_id', f'batch_sensor_{i}')
                traffic_data = {
                    'vehicle_count': float(item['vehicle_count']),
                    'avg_speed': float(item['avg_speed']),
                    'wait_time_s': float(item['wait_time_s'])
                }
                
                ai_result = ai_analyzer.analyze_traffic(sensor_id, traffic_data)
                
                anomaly_detection = ai_result.get('anomaly_detection', {})
                results.append({
                    'index': i,
                    'sensor_id': str(sensor_id),
                    'predictions': {
                        'traffic_state': str(ai_result.get('traffic_state', 'Unknown')),
                        'confidence': convert_to_json_serializable(ai_result.get('confidence', 0.0)),
                        'severity': str(ai_result.get('severity', 'Low')),
                        'predicted_duration': str(ai_result.get('predicted_duration', '10-20 minutes')),
                        'anomaly_detected': convert_to_json_serializable(anomaly_detection.get('is_anomaly', False)),
                        'anomaly_score': convert_to_json_serializable(anomaly_detection.get('anomaly_score', 0.0))
                    }
                })
                
            except Exception as e:
                results.append({
                    'index': i,
                    'error': str(e)
                })
        
        response = {
            'timestamp': datetime.now().isoformat(),
            'batch_size': len(batch_data),
            'results': results,
            'model_version': 'hybrid-ai-v1.0'
        }
        
        logger.info(f"📊 Batch prediction: {len(batch_data)} items processed")
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"❌ Batch prediction error: {str(e)}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/models/info', methods=['GET'])
def model_info():
    """Get information about loaded models"""
    if ai_analyzer is None:
        return jsonify({'error': 'AI models not initialized'}), 500
    
    try:
        # Get model statistics if available
        info = {
            'service': 'ML API Service',
            'model_type': 'Hybrid AI System',
            'components': {
                'pattern_discovery': {
                    'algorithm': 'K-Means Clustering',
                    'description': 'Unsupervised pattern discovery in traffic data'
                },
                'classification': {
                    'algorithm': 'Random Forest',
                    'description': 'Supervised traffic state classification'
                },
                'anomaly_detection': {
                    'algorithm': 'Isolation Forest',
                    'description': 'Unsupervised anomaly detection'
                }
            },
            'supported_predictions': [
                'traffic_state',
                'confidence_score',
                'severity_level',
                'duration_estimate',
                'anomaly_detection'
            ],
            'traffic_states': [
                'Free Flow',
                'Light Traffic', 
                'Heavy Congestion',
                'Gridlock'
            ],
            'api_version': '1.0',
            'model_version': 'hybrid-ai-v1.0'
        }
        
        return jsonify(info)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

def main():
    """Main function to start the ML API service"""
    
    logger.info("🚀 Starting ML Model API Service")
    logger.info("📊 Architecture: Flask API → Trained ML Models → Predictions")
    
    # Initialize AI models
    if not initialize_ai_models():
        logger.error("❌ Failed to start service - AI models could not be loaded")
        return
    
    logger.info("🌐 Available endpoints:")
    logger.info("   GET  /health - Health check")
    logger.info("   POST /predict - Single prediction")
    logger.info("   POST /predict/batch - Batch predictions")
    logger.info("   GET  /models/info - Model information")
    logger.info("")
    logger.info("📋 Example request:")
    logger.info('   curl -X POST http://localhost:8090/predict \\')
    logger.info('        -H "Content-Type: application/json" \\')
    logger.info('        -d \'{"vehicle_count": 25, "avg_speed": 35, "wait_time_s": 20}\'')
    logger.info("")
    logger.info("🔧 Service Configuration:")
    logger.info("   Host: 0.0.0.0")
    logger.info("   Port: 8090")
    logger.info("   Debug: False")
    logger.info("")
    
    try:
        # Start Flask server
        app.run(
            host='0.0.0.0',
            port=8090,
            debug=False,
            threaded=True
        )
    except Exception as e:
        logger.error(f"❌ Failed to start server: {str(e)}")

if __name__ == "__main__":
    main() 