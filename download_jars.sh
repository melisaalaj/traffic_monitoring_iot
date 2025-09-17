#!/bin/bash

echo "🔧 Downloading Spark-Kafka connector JARs..."

# Create jars directory if it doesn't exist
mkdir -p jars

# Download Spark-Kafka connector
echo "📦 Downloading Spark-Kafka connector..."
curl -L -o jars/spark-kafka.jar \
  https://repo1.maven.org/maven2/org/apache/spark/spark-sql-kafka-0-10_2.12/3.5.0/spark-sql-kafka-0-10_2.12-3.5.0.jar

# Download Kafka clients
echo "📦 Downloading Kafka clients..."
curl -L -o jars/kafka-clients.jar \
  https://repo1.maven.org/maven2/org/apache/kafka/kafka-clients/3.4.0/kafka-clients-3.4.0.jar

# Download Commons Pool
echo "📦 Downloading Commons Pool..."
curl -L -o jars/commons-pool2.jar \
  https://repo1.maven.org/maven2/org/apache/commons/commons-pool2/2.11.1/commons-pool2-2.11.1.jar

echo "✅ JAR files downloaded to jars/ directory"
echo "🚀 You can now run Spark Streaming with:"
echo "   spark-submit --jars jars/spark-kafka.jar,jars/kafka-clients.jar,jars/commons-pool2.jar your_script.py" 