from confluent_kafka.admin import AdminClient, NewTopic
from confluent_kafka import KafkaException

KAFKA_BROKER = "localhost:9092"  # local Kafka broker

TOPICS = [
    {"name": "traffic.raw", "partitions": 3, "replication": 1},
    {"name": "traffic.processed", "partitions": 3, "replication": 1},
    {"name": "traffic.alerts", "partitions": 3, "replication": 1},
]


def create_topics():
    admin = AdminClient({"bootstrap.servers": KAFKA_BROKER})

    new_topics = [
        NewTopic(t["name"], num_partitions=t["partitions"], replication_factor=t["replication"])
        for t in TOPICS
    ]

    fs = admin.create_topics(new_topics)

    try:
        for topic, f in fs.items():
            f.result()  # raises exception on failure
        print("✅ Topics created successfully.")
    except KafkaException as e:
        # If topics already exist, confluent_kafka returns an error per topic; treat as warning
        print("⚠️  Topic creation returned:", e)
    finally:
        pass


def list_topics():
    admin = AdminClient({"bootstrap.servers": KAFKA_BROKER})
    md = admin.list_topics(timeout=10)
    print("📋 Current topics on broker:")
    for t in sorted(md.topics.keys()):
        print("  -", t)


if __name__ == "__main__":
    print("🔧 Setting up Kafka topics...")
    create_topics()
    list_topics()
