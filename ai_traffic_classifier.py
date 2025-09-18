#!/usr/bin/env python3
"""
AI Traffic Classification System - Hybrid Approach
Uses unsupervised learning to discover patterns + supervised learning to classify
"""

import numpy as np
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Tuple, Optional
import json
import pickle
import os
from collections import deque

# Machine Learning imports
try:
    from sklearn.cluster import KMeans
    from sklearn.ensemble import RandomForestClassifier, IsolationForest
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report
    import joblib
except ImportError:
    print("⚠️  Installing required ML libraries...")
    import subprocess
    subprocess.check_call(["pip", "install", "scikit-learn", "joblib"])
    from sklearn.cluster import KMeans
    from sklearn.ensemble import RandomForestClassifier, IsolationForest
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report
    import joblib

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TrafficPatternDiscoverer:
    """
    Uses unsupervised learning to automatically discover traffic patterns
    """
    
    def __init__(self, n_clusters=4):
        self.n_clusters = n_clusters
        self.kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        self.scaler = StandardScaler()
        self.is_trained = False
        self.cluster_labels = {
            0: 'Free Flow',
            1: 'Light Traffic', 
            2: 'Heavy Congestion',
            3: 'Gridlock'
        }
        self.training_data = []
        self.model_path = 'models/traffic_patterns.pkl'
        
        # Create models directory
        os.makedirs('models', exist_ok=True)
        
    def add_training_sample(self, vehicle_count: float, avg_speed: float, wait_time: float):
        """Add a training sample to the dataset"""
        features = self._extract_features(vehicle_count, avg_speed, wait_time)
        self.training_data.append(features)
        
        # Auto-train when we have enough samples
        if len(self.training_data) >= 100 and len(self.training_data) % 50 == 0:
            self.train_pattern_discovery()
    
    def _extract_features(self, vehicle_count: float, avg_speed: float, wait_time: float) -> List[float]:
        """Extract features for ML model"""
        # Calculate derived features
        speed_variance = avg_speed / max(vehicle_count, 1)  # Speed per vehicle
        congestion_index = (wait_time * vehicle_count) / max(avg_speed, 1)  # Congestion indicator
        flow_efficiency = avg_speed / max(wait_time, 1)  # Flow efficiency
        
        # Time-based features
        hour = datetime.now().hour
        is_rush_hour = 1 if (7 <= hour <= 9) or (17 <= hour <= 19) else 0
        is_weekend = 1 if datetime.now().weekday() >= 5 else 0
        
        return [
            vehicle_count,
            avg_speed,
            wait_time,
            speed_variance,
            congestion_index,
            flow_efficiency,
            hour,
            is_rush_hour,
            is_weekend
        ]
    
    def train_pattern_discovery(self):
        """Train the unsupervised learning model to discover patterns"""
        if len(self.training_data) < 20:
            logger.warning("Not enough training data for pattern discovery")
            return False
            
        try:
            # Convert to numpy array
            X = np.array(self.training_data)
            
            # Normalize features
            X_scaled = self.scaler.fit_transform(X)
            
            # Discover patterns using K-Means clustering
            self.kmeans.fit(X_scaled)
            
            # Get cluster assignments
            cluster_labels = self.kmeans.labels_
            
            # Analyze clusters to assign meaningful names
            self._analyze_and_label_clusters(X, cluster_labels)
            
            self.is_trained = True
            
            # Save the model
            self._save_model()
            
            logger.info(f"✅ Pattern discovery trained on {len(self.training_data)} samples")
            logger.info(f"🔍 Discovered patterns: {list(self.cluster_labels.values())}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error training pattern discovery: {str(e)}")
            return False
    
    def _analyze_and_label_clusters(self, X: np.ndarray, labels: np.ndarray):
        """Analyze clusters and assign meaningful traffic state names"""
        cluster_stats = {}
        
        for cluster_id in range(self.n_clusters):
            mask = labels == cluster_id
            cluster_data = X[mask]
            
            if len(cluster_data) > 0:
                # Calculate cluster characteristics
                avg_speed = np.mean(cluster_data[:, 1])  # avg_speed column
                avg_wait = np.mean(cluster_data[:, 2])   # wait_time column
                avg_count = np.mean(cluster_data[:, 0])  # vehicle_count column
                
                cluster_stats[cluster_id] = {
                    'avg_speed': avg_speed,
                    'avg_wait': avg_wait,
                    'avg_count': avg_count
                }
        
        # Sort clusters by speed (high to low) to assign meaningful names
        sorted_clusters = sorted(cluster_stats.items(), key=lambda x: x[1]['avg_speed'], reverse=True)
        
        # Assign names based on traffic characteristics
        name_mapping = ['Free Flow', 'Light Traffic', 'Heavy Congestion', 'Gridlock']
        
        for i, (cluster_id, stats) in enumerate(sorted_clusters):
            if i < len(name_mapping):
                self.cluster_labels[cluster_id] = name_mapping[i]
            else:
                self.cluster_labels[cluster_id] = f'Pattern {cluster_id}'
    
    def predict_pattern(self, vehicle_count: float, avg_speed: float, wait_time: float) -> Tuple[str, float]:
        """Predict traffic pattern using discovered clusters"""
        if not self.is_trained:
            # Try to load existing model
            if not self._load_model():
                return 'Unknown', 0.0
        
        # Check if scaler is fitted
        if not hasattr(self.scaler, 'scale_'):
            logger.warning("StandardScaler not fitted yet, using rule-based fallback")
            return self._rule_based_pattern(vehicle_count, avg_speed, wait_time), 0.5
        
        try:
            features = np.array([self._extract_features(vehicle_count, avg_speed, wait_time)])
            features_scaled = self.scaler.transform(features)
            
            # Predict cluster
            cluster_id = self.kmeans.predict(features_scaled)[0]
            
            # Calculate confidence based on distance to cluster center
            distances = self.kmeans.transform(features_scaled)[0]
            min_distance = np.min(distances)
            confidence = max(0.1, 1.0 - (min_distance / np.max(distances)))
            
            pattern_name = self.cluster_labels.get(cluster_id, f'Pattern {cluster_id}')
            
            return pattern_name, confidence
            
        except Exception as e:
            logger.error(f"Error predicting pattern: {str(e)}")
            return self._rule_based_pattern(vehicle_count, avg_speed, wait_time), 0.3
    
    def _save_model(self):
        """Save the trained model to disk"""
        try:
            model_data = {
                'kmeans': self.kmeans,
                'scaler': self.scaler,
                'cluster_labels': self.cluster_labels,
                'is_trained': self.is_trained
            }
            joblib.dump(model_data, self.model_path)
            logger.info(f"💾 Model saved to {self.model_path}")
        except Exception as e:
            logger.error(f"Error saving model: {str(e)}")
    
    def _load_model(self):
        """Load trained model from disk"""
        try:
            if os.path.exists(self.model_path):
                model_data = joblib.load(self.model_path)
                self.kmeans = model_data['kmeans']
                self.scaler = model_data['scaler']
                self.cluster_labels = model_data['cluster_labels']
                self.is_trained = model_data['is_trained']
                logger.info(f"📂 Model loaded from {self.model_path}")
                return True
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
        return False
    
    def _rule_based_pattern(self, vehicle_count: float, avg_speed: float, wait_time: float) -> str:
        """Rule-based fallback when ML model is not ready"""
        if avg_speed > 50 and wait_time < 10:
            return 'Free Flow'
        elif avg_speed > 30 and wait_time < 30:
            return 'Light Traffic'
        elif avg_speed > 15 and wait_time < 60:
            return 'Heavy Congestion'
        else:
            return 'Gridlock'

class TrafficStateClassifier:
    """
    Supervised learning classifier trained on discovered patterns
    """
    
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        self.training_features = []
        self.training_labels = []
        self.model_path = 'models/traffic_classifier.pkl'
        
        # Severity and duration mappings
        self.severity_mapping = {
            'Free Flow': 'Low',
            'Light Traffic': 'Low',
            'Heavy Congestion': 'High',
            'Gridlock': 'Critical'
        }
        
        self.duration_estimates = {
            'Free Flow': (0, 5),
            'Light Traffic': (5, 15),
            'Heavy Congestion': (20, 45),
            'Gridlock': (45, 90)
        }
    
    def add_training_sample(self, vehicle_count: float, avg_speed: float, wait_time: float, label: str):
        """Add labeled training sample"""
        features = self._extract_features(vehicle_count, avg_speed, wait_time)
        self.training_features.append(features)
        self.training_labels.append(label)
        
        # Auto-train when we have enough samples
        if len(self.training_features) >= 50 and len(self.training_features) % 25 == 0:
            self.train_classifier()
    
    def _extract_features(self, vehicle_count: float, avg_speed: float, wait_time: float) -> List[float]:
        """Extract features for supervised learning"""
        # Same feature extraction as pattern discoverer for consistency
        speed_variance = avg_speed / max(vehicle_count, 1)
        congestion_index = (wait_time * vehicle_count) / max(avg_speed, 1)
        flow_efficiency = avg_speed / max(wait_time, 1)
        
        hour = datetime.now().hour
        is_rush_hour = 1 if (7 <= hour <= 9) or (17 <= hour <= 19) else 0
        is_weekend = 1 if datetime.now().weekday() >= 5 else 0
        
        return [
            vehicle_count,
            avg_speed,
            wait_time,
            speed_variance,
            congestion_index,
            flow_efficiency,
            hour,
            is_rush_hour,
            is_weekend
        ]
    
    def train_classifier(self):
        """Train the supervised learning classifier"""
        if len(self.training_features) < 20:
            logger.warning("Not enough training data for classifier")
            return False
        
        try:
            X = np.array(self.training_features)
            y = np.array(self.training_labels)
            
            # Normalize features
            X_scaled = self.scaler.fit_transform(X)
            
            # Train the classifier
            self.model.fit(X_scaled, y)
            self.is_trained = True
            
            # Save model
            self._save_model()
            
            # Log feature importance
            feature_names = ['vehicle_count', 'avg_speed', 'wait_time', 'speed_variance', 
                           'congestion_index', 'flow_efficiency', 'hour', 'is_rush_hour', 'is_weekend']
            
            importances = self.model.feature_importances_
            for name, importance in zip(feature_names, importances):
                logger.info(f"📊 Feature importance - {name}: {importance:.3f}")
            
            logger.info(f"🎯 Classifier trained on {len(self.training_features)} samples")
            return True
            
        except Exception as e:
            logger.error(f"Error training classifier: {str(e)}")
            return False
    
    def predict_traffic_state(self, vehicle_count: float, avg_speed: float, wait_time: float) -> Dict:
        """Predict traffic state using trained classifier"""
        if not self.is_trained:
            if not self._load_model():
                return self._get_default_classification()
        
        # Check if scaler is fitted
        if not hasattr(self.scaler, 'scale_'):
            logger.warning("StandardScaler not fitted yet, using rule-based fallback")
            return self._get_rule_based_classification(vehicle_count, avg_speed, wait_time)
        
        try:
            features = np.array([self._extract_features(vehicle_count, avg_speed, wait_time)])
            features_scaled = self.scaler.transform(features)
            
            # Predict
            prediction = self.model.predict(features_scaled)[0]
            confidence_scores = self.model.predict_proba(features_scaled)[0]
            confidence = np.max(confidence_scores)
            
            # Get severity and duration
            severity = self.severity_mapping.get(prediction, 'Medium')
            duration_range = self.duration_estimates.get(prediction, (10, 20))
            predicted_duration = f"{duration_range[0]}-{duration_range[1]} minutes"
            
            return {
                'traffic_state': prediction,
                'confidence': round(float(confidence), 3),
                'severity': severity,
                'predicted_duration': predicted_duration,
                'model_type': 'Random Forest (Supervised Learning)',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error predicting traffic state: {str(e)}")
            return self._get_rule_based_classification(vehicle_count, avg_speed, wait_time)
    
    def _save_model(self):
        """Save trained model"""
        try:
            model_data = {
                'model': self.model,
                'scaler': self.scaler,
                'is_trained': self.is_trained,
                'severity_mapping': self.severity_mapping,
                'duration_estimates': self.duration_estimates
            }
            joblib.dump(model_data, self.model_path)
            logger.info(f"💾 Classifier saved to {self.model_path}")
        except Exception as e:
            logger.error(f"Error saving classifier: {str(e)}")
    
    def _load_model(self):
        """Load trained model"""
        try:
            if os.path.exists(self.model_path):
                model_data = joblib.load(self.model_path)
                self.model = model_data['model']
                self.scaler = model_data['scaler']
                self.is_trained = model_data['is_trained']
                self.severity_mapping = model_data['severity_mapping']
                self.duration_estimates = model_data['duration_estimates']
                logger.info(f"📂 Classifier loaded from {self.model_path}")
                return True
        except Exception as e:
            logger.error(f"Error loading classifier: {str(e)}")
        return False
    
    def _get_default_classification(self):
        """Default classification when model unavailable"""
        return {
            'traffic_state': 'Unknown',
            'confidence': 0.0,
            'severity': 'Low',
            'predicted_duration': '5-15 minutes',
            'model_type': 'Default (No ML Model)',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
    
    def _get_rule_based_classification(self, vehicle_count: float, avg_speed: float, wait_time: float):
        """Rule-based fallback classification when ML model is not ready"""
        # Determine traffic state based on rules
        if avg_speed > 50 and wait_time < 10:
            state = 'Free Flow'
            severity = 'Low'
            duration = '0-5 minutes'
            confidence = 0.7
        elif avg_speed > 30 and wait_time < 30:
            state = 'Light Traffic'
            severity = 'Low'
            duration = '5-15 minutes'
            confidence = 0.6
        elif avg_speed > 15 and wait_time < 60:
            state = 'Heavy Congestion'
            severity = 'High'
            duration = '20-45 minutes'
            confidence = 0.5
        else:
            state = 'Gridlock'
            severity = 'Critical'
            duration = '45-90 minutes'
            confidence = 0.4
        
        return {
            'traffic_state': state,
            'confidence': confidence,
            'severity': severity,
            'predicted_duration': duration,
            'model_type': 'Rule-based Fallback',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

class AnomalyDetector:
    """
    Uses Isolation Forest for anomaly detection
    """
    
    def __init__(self):
        self.model = IsolationForest(contamination=0.1, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        self.training_data = []
        self.model_path = 'models/anomaly_detector.pkl'
    
    def add_training_sample(self, vehicle_count: float, avg_speed: float, wait_time: float):
        """Add sample for anomaly detection training"""
        features = [vehicle_count, avg_speed, wait_time]
        self.training_data.append(features)
        
        # Auto-train periodically
        if len(self.training_data) >= 100 and len(self.training_data) % 50 == 0:
            self.train_anomaly_detector()
    
    def train_anomaly_detector(self):
        """Train anomaly detection model"""
        if len(self.training_data) < 50:
            return False
        
        try:
            X = np.array(self.training_data)
            X_scaled = self.scaler.fit_transform(X)
            
            self.model.fit(X_scaled)
            self.is_trained = True
            
            self._save_model()
            logger.info(f"🚨 Anomaly detector trained on {len(self.training_data)} samples")
            return True
            
        except Exception as e:
            logger.error(f"Error training anomaly detector: {str(e)}")
            return False
    
    def detect_anomaly(self, vehicle_count: float, avg_speed: float, wait_time: float) -> Dict:
        """Detect if current data is anomalous"""
        if not self.is_trained:
            if not self._load_model():
                return {'is_anomaly': False, 'confidence': 0.0, 'anomaly_score': 0.0}
        
        # Check if scaler is fitted
        if not hasattr(self.scaler, 'scale_'):
            logger.warning("StandardScaler not fitted yet, using rule-based anomaly detection")
            return self._rule_based_anomaly_detection(vehicle_count, avg_speed, wait_time)
        
        try:
            features = np.array([[vehicle_count, avg_speed, wait_time]])
            features_scaled = self.scaler.transform(features)
            
            # Predict (-1 = anomaly, 1 = normal)
            prediction = self.model.predict(features_scaled)[0]
            anomaly_score = self.model.decision_function(features_scaled)[0]
            
            is_anomaly = prediction == -1
            confidence = abs(float(anomaly_score))
            
            return {
                'is_anomaly': is_anomaly,
                'confidence': round(confidence, 3),
                'anomaly_score': round(float(anomaly_score), 3),
                'model_type': 'Isolation Forest (Unsupervised Learning)'
            }
            
        except Exception as e:
            logger.error(f"Error detecting anomaly: {str(e)}")
            return self._rule_based_anomaly_detection(vehicle_count, avg_speed, wait_time)
    
    def _save_model(self):
        """Save anomaly detector"""
        try:
            model_data = {
                'model': self.model,
                'scaler': self.scaler,
                'is_trained': self.is_trained
            }
            joblib.dump(model_data, self.model_path)
        except Exception as e:
            logger.error(f"Error saving anomaly detector: {str(e)}")
    
    def _load_model(self):
        """Load anomaly detector"""
        try:
            if os.path.exists(self.model_path):
                model_data = joblib.load(self.model_path)
                self.model = model_data['model']
                self.scaler = model_data['scaler']
                self.is_trained = model_data['is_trained']
                logger.info(f"📂 Anomaly detector loaded")
                return True
        except Exception as e:
            logger.error(f"Error loading anomaly detector: {str(e)}")
        return False
    
    def _rule_based_anomaly_detection(self, vehicle_count: float, avg_speed: float, wait_time: float) -> Dict:
        """Rule-based anomaly detection fallback"""
        # Define normal ranges
        normal_vehicle_range = (0, 100)
        normal_speed_range = (0, 80)
        normal_wait_range = (0, 120)
        
        # Check for anomalies
        is_anomaly = False
        anomaly_reasons = []
        
        if vehicle_count < normal_vehicle_range[0] or vehicle_count > normal_vehicle_range[1]:
            is_anomaly = True
            anomaly_reasons.append(f"unusual_vehicle_count_{vehicle_count}")
        
        if avg_speed < normal_speed_range[0] or avg_speed > normal_speed_range[1]:
            is_anomaly = True
            anomaly_reasons.append(f"unusual_speed_{avg_speed}")
        
        if wait_time < normal_wait_range[0] or wait_time > normal_wait_range[1]:
            is_anomaly = True
            anomaly_reasons.append(f"unusual_wait_time_{wait_time}")
        
        # Calculate confidence based on how far from normal
        confidence = 0.5 if is_anomaly else 0.3
        anomaly_score = -0.5 if is_anomaly else 0.3
        
        return {
            'is_anomaly': is_anomaly,
            'confidence': round(confidence, 3),
            'anomaly_score': round(anomaly_score, 3),
            'model_type': 'Rule-based Anomaly Detection'
        }

class AITrafficAnalyzer:
    """
    Hybrid AI system combining unsupervised pattern discovery + supervised classification
    """
    
    def __init__(self):
        self.pattern_discoverer = TrafficPatternDiscoverer()
        self.state_classifier = TrafficStateClassifier()
        self.anomaly_detector = AnomalyDetector()
        self.training_mode = True
        
        logger.info("🤖 AI Traffic Analyzer initialized with Hybrid Approach:")
        logger.info("   🔍 Unsupervised: Pattern Discovery (K-Means)")
        logger.info("   🎯 Supervised: Traffic Classification (Random Forest)")
        logger.info("   🚨 Anomaly Detection: Isolation Forest")
    
    def analyze_traffic(self, sensor_id: str, current_data: Dict, 
                       historical_data: Optional[List[Dict]] = None) -> Dict:
        """Complete AI analysis using hybrid approach"""
        try:
            # Extract metrics
            vehicle_count = current_data.get('vehicle_count', 0)
            avg_speed = current_data.get('avg_speed', 0) 
            wait_time = current_data.get('wait_time_s', 0)
            
            # Add to training data if in training mode
            if self.training_mode:
                self.pattern_discoverer.add_training_sample(vehicle_count, avg_speed, wait_time)
                self.anomaly_detector.add_training_sample(vehicle_count, avg_speed, wait_time)
                
                # Discover pattern and use for supervised learning
                pattern, pattern_confidence = self.pattern_discoverer.predict_pattern(
                    vehicle_count, avg_speed, wait_time
                )
                if pattern != 'Unknown':
                    self.state_classifier.add_training_sample(
                        vehicle_count, avg_speed, wait_time, pattern
                    )
            
            # Get predictions from all models
            classification = self.state_classifier.predict_traffic_state(
                vehicle_count, avg_speed, wait_time
            )
            
            anomaly_result = self.anomaly_detector.detect_anomaly(
                vehicle_count, avg_speed, wait_time
            )
            
            # Combine results
            ai_analysis = {
                'sensor_id': sensor_id,
                'traffic_state': classification['traffic_state'],
                'confidence': classification['confidence'],
                'severity': classification['severity'],
                'predicted_duration': classification['predicted_duration'],
                'anomaly_detection': anomaly_result,
                'ai_models': {
                    'pattern_discovery': 'K-Means Clustering (Unsupervised)',
                    'classification': 'Random Forest (Supervised)',
                    'anomaly_detection': 'Isolation Forest (Unsupervised)'
                },
                'training_samples': {
                    'patterns': len(self.pattern_discoverer.training_data),
                    'classifier': len(self.state_classifier.training_features),
                    'anomaly': len(self.anomaly_detector.training_data)
                },
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            # Log AI results
            anomaly_status = "🚨 ANOMALY" if anomaly_result.get('is_anomaly') else "✅ Normal"
            logger.info(f"🤖 AI Analysis [{sensor_id}]: {classification['traffic_state']} "
                       f"(conf: {classification['confidence']:.2f}) {anomaly_status}")
            
            return ai_analysis
            
        except Exception as e:
            logger.error(f"Error in AI analysis for {sensor_id}: {str(e)}")
            return self._get_default_analysis(sensor_id)
    
    def _get_default_analysis(self, sensor_id: str) -> Dict:
        """Default analysis when AI fails"""
        return {
            'sensor_id': sensor_id,
            'traffic_state': 'Unknown',
            'confidence': 0.0,
            'severity': 'Low',
            'predicted_duration': '5-15 minutes',
            'anomaly_detection': {'is_anomaly': False, 'confidence': 0.0},
            'ai_models': {'status': 'AI models not available'},
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

# Test the hybrid AI system
if __name__ == "__main__":
    analyzer = AITrafficAnalyzer()
    
    # Simulate some training data
    test_scenarios = [
        {'vehicle_count': 5, 'avg_speed': 55, 'wait_time_s': 8},   # Free flow
        {'vehicle_count': 15, 'avg_speed': 35, 'wait_time_s': 15}, # Light traffic
        {'vehicle_count': 35, 'avg_speed': 20, 'wait_time_s': 45}, # Heavy congestion
        {'vehicle_count': 50, 'avg_speed': 8, 'wait_time_s': 120}, # Gridlock
        {'vehicle_count': 100, 'avg_speed': 2, 'wait_time_s': 300} # Anomaly
    ]
    
    print("🤖 Testing Hybrid AI Traffic Analysis:")
    print("=" * 50)
    
    for i, scenario in enumerate(test_scenarios):
        result = analyzer.analyze_traffic(f'Test-{i+1}', scenario)
        print(f"\n📊 Scenario {i+1}: {scenario}")
        print(f"🎯 Classification: {result['traffic_state']} (confidence: {result['confidence']:.2f})")
        print(f"⚠️  Anomaly: {result['anomaly_detection'].get('is_anomaly', False)}")
        print(f"📈 Training samples: {result['training_samples']}") 