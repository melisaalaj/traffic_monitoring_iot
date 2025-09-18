#!/usr/bin/env python3
"""
Spark Streaming with ML API Calls
Spark calls external ML API service for AI predictions
"""

import os
import json
import logging
import requests
from datetime import datetime, timezone
from typing import Dict, Any

# Set Java 17 environment BEFORE importing pyspark
os.environ['JAVA_HOME'] = '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home'
os.environ['PATH'] = f"{os.environ['JAVA_HOME']}/bin:{os.environ.get('PATH', '')}"

# PySpark imports
from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
CHECKPOINT_LOCATION = "./spark-api-checkpoints"
ML_API_URL = "http://localhost:8090"
os.makedirs(CHECKPOINT_LOCATION, exist_ok=True)

def create_spark_session():
    """Create Spark session"""
    
    spark = SparkSession.builder \
        .appName("SparkWithMLAPI") \
        .config("spark.sql.adaptive.enabled", "true") \
        .config("spark.sql.streaming.checkpointLocation", CHECKPOINT_LOCATION) \
        .config("spark.serializer", "org.apache.spark.serializer.KryoSerializer") \
        .config("spark.sql.streaming.forceDeleteTempCheckpointLocation", "true") \
        .getOrCreate()
    
    spark.sparkContext.setLogLevel("WARN")
    
    logger.info("✅ Spark Session created")
    return spark

def test_ml_api_connection():
    """Test connection to ML API service"""
    try:
        response = requests.get(f"{ML_API_URL}/health", timeout=5)
        if response.status_code == 200:
            health_data = response.json()
            logger.info(f"✅ ML API Service is healthy: {health_data['status']}")
            return True
        else:
            logger.error(f"❌ ML API Service unhealthy: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Cannot connect to ML API Service: {str(e)}")
        return False

def create_ml_api_udf():
    """Create UDF that calls ML API service"""
    
    def call_ml_api(vehicle_count, avg_speed, wait_time_s, sensor_id):
        """Call ML API for prediction"""
        try:
            # Prepare request data
            request_data = {
                'vehicle_count': float(vehicle_count) if vehicle_count is not None else 0.0,
                'avg_speed': float(avg_speed) if avg_speed is not None else 0.0,
                'wait_time_s': float(wait_time_s) if wait_time_s is not None else 0.0,
                'sensor_id': str(sensor_id) if sensor_id is not None else 'unknown'
            }
            
            # Make API call
            response = requests.post(
                f"{ML_API_URL}/predict",
                json=request_data,
                timeout=10,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                api_result = response.json()
                predictions = api_result.get('predictions', {})
                
                return (
                    predictions.get('traffic_state', 'Unknown'),
                    float(predictions.get('confidence', 0.0)),
                    predictions.get('severity', 'Low'),
                    predictions.get('predicted_duration', '10-20 minutes'),
                    bool(predictions.get('anomaly_detected', False)),
                    float(predictions.get('anomaly_score', 0.0)),
                    predictions.get('model_version', 'api-v1.0')
                )
            else:
                # API error - return fallback
                logger.error(f"API Error {response.status_code}: {response.text}")
                return fallback_prediction(request_data)
                
        except requests.exceptions.Timeout:
            logger.error("API Timeout - using fallback prediction")
            return fallback_prediction({
                'vehicle_count': vehicle_count,
                'avg_speed': avg_speed,
                'wait_time_s': wait_time_s
            })
        except Exception as e:
            logger.error(f"API Call Error: {str(e)} - using fallback")
            return fallback_prediction({
                'vehicle_count': vehicle_count,
                'avg_speed': avg_speed,
                'wait_time_s': wait_time_s
            })
    
    def fallback_prediction(data):
        """Simple fallback when API is unavailable"""
        vc = float(data.get('vehicle_count', 0))
        speed = float(data.get('avg_speed', 0))
        wait = float(data.get('wait_time_s', 0))
        
        # Simple rule-based fallback
        if vc > 35 or wait > 60:
            return ("Heavy Congestion", 0.7, "High", "20-45 minutes", True, 0.8, "fallback-v1.0")
        elif vc > 20 or wait > 30:
            return ("Light Traffic", 0.6, "Medium", "10-20 minutes", False, 0.3, "fallback-v1.0")
        else:
            return ("Free Flow", 0.8, "Low", "5-10 minutes", False, 0.1, "fallback-v1.0")
    
    # Define UDF schema
    api_udf_schema = StructType([
        StructField("ai_traffic_state", StringType(), True),
        StructField("ai_confidence", DoubleType(), True),
        StructField("ai_severity", StringType(), True),
        StructField("ai_predicted_duration", StringType(), True),
        StructField("ai_anomaly_detected", BooleanType(), True),
        StructField("ai_anomaly_score", DoubleType(), True),
        StructField("ai_model_version", StringType(), True)
    ])
    
    # Create the UDF
    ml_api_udf = udf(call_ml_api, api_udf_schema)
    logger.info("🌐 ML API UDF created")
    
    return ml_api_udf

def simulate_kafka_stream(spark):
    """Simulate traffic data stream"""
    
    logger.info("📡 Creating simulated traffic data stream...")
    
    rate_df = spark \
        .readStream \
        .format("rate") \
        .option("rowsPerSecond", 3) \
        .load()
    
    # Generate realistic sensor data
    sensor_data_df = rate_df \
        .withColumn("sensor_id", concat(lit("Loop-"), 
                   format_string("%02d", (col("value") % 20) + 1))) \
        .withColumn("current_hour", hour(current_timestamp())) \
        .withColumn("is_rush_hour", 
                   col("current_hour").isin([7, 8, 17, 18, 19])) \
        .withColumn("vehicle_count", 
                   when(col("is_rush_hour"), rand() * 35 + 25)
                   .otherwise(rand() * 15 + 5)) \
        .withColumn("avg_speed", 
                   when(col("vehicle_count") > 30, rand() * 20 + 15)
                   .when(col("vehicle_count") > 15, rand() * 25 + 35)
                   .otherwise(rand() * 20 + 50)) \
        .withColumn("wait_time_s", 
                   when(col("vehicle_count") > 30, rand() * 50 + 30)
                   .when(col("vehicle_count") > 15, rand() * 20 + 15)
                   .otherwise(rand() * 10 + 3)) \
        .withColumn("pm25", rand() * 25 + 10) \
        .withColumn("noise_db", rand() * 30 + 50) \
        .withColumn("temp_c", rand() * 15 + 15) \
        .drop("current_hour", "is_rush_hour")
    
    logger.info("✅ Simulated sensor data stream created")
    return sensor_data_df

def process_with_ml_api(df, ml_api_udf):
    """Process data with ML API calls"""
    
    logger.info("🌐 Applying ML API classification...")
    
    # Apply ML API UDF
    api_enhanced_df = df \
        .withColumn("api_results", 
                   ml_api_udf(col("vehicle_count"), col("avg_speed"), 
                             col("wait_time_s"), col("sensor_id"))) \
        .select(
            col("sensor_id"),
            current_timestamp().alias("window_start"),
            col("vehicle_count").alias("vehicle_count_per_min"),
            col("avg_speed").alias("avg_speed_kmh"),
            col("wait_time_s").alias("avg_wait_time_s"),
            col("pm25"),
            col("noise_db"),
            col("temp_c"),
            lit("OK").alias("status"),
            col("api_results.ai_traffic_state"),
            col("api_results.ai_confidence"),
            col("api_results.ai_severity"),
            col("api_results.ai_predicted_duration"),
            col("api_results.ai_anomaly_detected"),
            col("api_results.ai_anomaly_score"),
            col("api_results.ai_model_version")
        )
    
    logger.info("✅ ML API classification applied")
    return api_enhanced_df

def write_to_console(df, batch_id):
    """Write batch to console with API results"""
    try:
        logger.info(f"📝 Processing batch {batch_id}...")
        
        # Collect batch data
        batch_data = df.collect()
        batch_count = len(batch_data)
        
        if batch_count > 0:
            logger.info(f"✅ Batch {batch_id}: Processed {batch_count} records")
            
            # Analyze predictions
            ai_stats = {}
            anomaly_count = 0
            total_confidence = 0.0
            model_versions = {}
            
            for row in batch_data:
                state = row['ai_traffic_state']
                ai_stats[state] = ai_stats.get(state, 0) + 1
                
                if row['ai_anomaly_detected']:
                    anomaly_count += 1
                
                total_confidence += row['ai_confidence']
                
                version = row['ai_model_version']
                model_versions[version] = model_versions.get(version, 0) + 1
            
            avg_confidence = total_confidence / batch_count
            anomaly_rate = (anomaly_count / batch_count) * 100
            
            logger.info(f"🤖 AI Classifications: {ai_stats}")
            logger.info(f"📊 Avg Confidence: {avg_confidence:.2f}, Anomalies: {anomaly_count}/{batch_count} ({anomaly_rate:.1f}%)")
            logger.info(f"🔧 Model Versions: {model_versions}")
            
            # Show sample record
            sample = batch_data[0]
            anomaly_flag = "🚨 ANOMALY" if sample['ai_anomaly_detected'] else "✅ Normal"
            model_flag = "🌐 API" if "api" in sample['ai_model_version'] else "⚠️ FALLBACK"
            
            logger.info(f"📍 Sample: {sample['sensor_id']} - {sample['ai_traffic_state']} "
                       f"(conf: {sample['ai_confidence']:.2f}, severity: {sample['ai_severity']}) {anomaly_flag} {model_flag}")
            logger.info(f"   📊 Traffic: {sample['vehicle_count_per_min']:.0f} vehicles, "
                       f"{sample['avg_speed_kmh']:.0f} km/h, {sample['avg_wait_time_s']:.0f}s wait")
            logger.info(f"   🕐 Duration: {sample['ai_predicted_duration']}")
        
    except Exception as e:
        logger.error(f"❌ Error processing batch {batch_id}: {str(e)}")

def main():
    """Main Spark Streaming application with ML API calls"""
    
    logger.info("🚀 Starting Spark Streaming with ML API Integration")
    logger.info("📊 Architecture: Spark Streaming → HTTP API → ML Models → Predictions")
    
    # Test ML API connection first
    if not test_ml_api_connection():
        logger.warning("⚠️ ML API Service not available - will use fallback predictions")
        logger.info("💡 Start ML API service with: python3 ml_api_service.py")
    
    try:
        # Create Spark session
        spark = create_spark_session()
        
        # Create ML API UDF
        ml_api_udf = create_ml_api_udf()
        
        # Create simulated data stream
        data_stream = simulate_kafka_stream(spark)
        
        # Process with ML API
        api_enhanced_stream = process_with_ml_api(data_stream, ml_api_udf)
        
        # Start streaming query
        logger.info("🔄 Starting streaming query...")
        
        query = api_enhanced_stream.writeStream \
            .outputMode("append") \
            .foreachBatch(write_to_console) \
            .option("checkpointLocation", CHECKPOINT_LOCATION) \
            .trigger(processingTime='20 seconds') \
            .start()
        
        logger.info("✅ Streaming query started successfully")
        logger.info("📊 Processing micro-batches every 20 seconds")
        logger.info("🌐 Making HTTP API calls for ML predictions")
        logger.info("🖥️  Real-time API results displayed in console")
        logger.info("")
        logger.info("🔍 Monitor progress:")
        logger.info(f"   📁 Checkpoints: {CHECKPOINT_LOCATION}")
        logger.info("   🌐 Spark UI: http://localhost:4040")
        logger.info("   🤖 ML API: http://localhost:8090/health")
        logger.info("   ⏹️  Stop with Ctrl+C")
        logger.info("")
        logger.info("🌐 ML API Features:")
        logger.info("   🔍 K-Means Pattern Discovery")
        logger.info("   🎯 Random Forest Classification")
        logger.info("   🚨 Isolation Forest Anomaly Detection")
        logger.info("   ⚡ HTTP API with fallback handling")
        logger.info("   📊 Real-time model predictions")
        logger.info("")
        
        # Wait for termination
        query.awaitTermination()
        
    except KeyboardInterrupt:
        logger.info("🛑 Stopping Spark Streaming pipeline...")
    except Exception as e:
        logger.error(f"❌ Pipeline error: {str(e)}")
        raise
    finally:
        # Cleanup
        if 'spark' in locals():
            spark.stop()
        logger.info("🔌 Spark session stopped")

if __name__ == "__main__":
    main() 