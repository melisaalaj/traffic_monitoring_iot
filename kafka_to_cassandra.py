import json
import time
from datetime import datetime, timezone
from collections import defaultdict

from kafka import KafkaConsumer
from cassandra.cluster import Cluster
from cassandra.query import PreparedStatement

# ---------- Config ----------
KAFKA_BROKER = "localhost:9092"        # if your broker runs in Docker, 9092 must be published
KAFKA_TOPIC = "traffic.raw"

CASSANDRA_HOST = "127.0.0.1"           # force IPv4 to avoid ::1 issues
CASSANDRA_PORT = 9042
KEYSPACE = "traffic"
TABLE = "aggregates_minute"

# ---------- Cassandra ----------
def connect_cassandra(retries=20, delay=2):
    last = None
    for i in range(retries):
        try:
            cluster = Cluster([CASSANDRA_HOST], port=CASSANDRA_PORT, connect_timeout=30)
            session = cluster.connect()
            # idempotent: create keyspace/table if missing (optional; comment out if you already applied schema)
            session.execute(f"""
                CREATE KEYSPACE IF NOT EXISTS {KEYSPACE}
                WITH replication = {{ 'class': 'SimpleStrategy', 'replication_factor': '1' }};
            """)
            session.set_keyspace(KEYSPACE)
            session.execute(f"""
                CREATE TABLE IF NOT EXISTS {TABLE} (
                  sensor_id text,
                  window_start timestamp,
                  vehicle_count_per_min double,
                  avg_speed_kmh double,
                  avg_wait_time_s double,
                  pm25 double,
                  noise_db double,
                  temp_c double,
                  status text,
                  breaches set<text>,
                  PRIMARY KEY ((sensor_id), window_start)
                ) WITH CLUSTERING ORDER BY (window_start DESC);
            """)
            # prepare once
            insert_ps = session.prepare(f"""
                INSERT INTO {TABLE} (
                    sensor_id, window_start,
                    vehicle_count_per_min, avg_speed_kmh, avg_wait_time_s,
                    pm25, noise_db, temp_c
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """)
            return cluster, session, insert_ps
        except Exception as e:
            last = e
            print(f"[{i+1}/{retries}] Cassandra not ready: {e}")
            time.sleep(delay)
    raise RuntimeError(f"Failed to connect to Cassandra: {last}")

# ---------- Kafka ----------
def connect_kafka():
    return KafkaConsumer(
        KAFKA_TOPIC,
        bootstrap_servers=[KAFKA_BROKER],
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        group_id="cassandra-writer-new",
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        consumer_timeout_ms=0,   # block forever - back to production mode
    )

# ---------- Aggregator ----------
class DataAggregator:
    def __init__(self):
        self.data = defaultdict(lambda: defaultdict(list))

    def add_measurement(self, sensor_id, timestamp, metric, value):
        # Parse ISO timestamp (supports "Z")
        dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        minute_key = dt.replace(second=0, microsecond=0, tzinfo=timezone.utc)
        self.data[sensor_id][minute_key].append((metric, float(value)))

    def get_and_clear_completed_minutes(self, safety_delay_min=1):
        # Emit any minute strictly older than the current (UTC) minute minus a small delay
        now_minute = datetime.now(timezone.utc).replace(second=0, microsecond=0)
        cutoff = now_minute if safety_delay_min <= 0 else (now_minute)
        completed = {}
        for sid in list(self.data.keys()):
            for minute_key in list(self.data[sid].keys()):
                if minute_key < cutoff:
                    measurements = self.data[sid].pop(minute_key)
                    completed[(sid, minute_key)] = self._aggregate(measurements)
            if not self.data[sid]:
                del self.data[sid]
        return completed

    def _aggregate(self, measurements):
        by_metric = defaultdict(list)
        for metric, value in measurements:
            by_metric[metric].append(value)
        out = {}
        for metric, values in by_metric.items():
            out[metric] = sum(values) / len(values)
        return out

# ---------- Write ----------
def write_to_cassandra(session, insert_ps: PreparedStatement, sensor_id, window_start, agg):
    session.execute(
        insert_ps,
        [
            sensor_id,
            window_start,
            agg.get("vehicle_count"),
            agg.get("avg_speed"),
            agg.get("wait_time_s"),
            agg.get("pm25"),
            agg.get("noise_db"),
            agg.get("temp_c"),
        ]
    )

# ---------- Main ----------
def main():
    print("🔧 Connecting to Cassandra...")
    cluster, session, insert_ps = connect_cassandra()

    print("🔧 Connecting to Kafka...")
    consumer = connect_kafka()

    print("📊 Starting Kafka → Cassandra pipeline...")
    aggregator = DataAggregator()
    
    print("🔍 Waiting for messages from Kafka...")
    message_count = 0

    try:
        for msg in consumer:
            message_count += 1
            if message_count % 10 == 1:  # Print every 10th message
                print(f"📨 Received message #{message_count}")
            data = msg.value
            # basic sanity
            if not all(k in data for k in ("sensor_id", "ts", "metric", "value")):
                continue
            aggregator.add_measurement(data["sensor_id"], data["ts"], data["metric"], data["value"])

            # flush completed minutes
            completed = aggregator.get_and_clear_completed_minutes()
            for (sid, win_start), agg in completed.items():
                write_to_cassandra(session, insert_ps, sid, win_start, agg)
                print(f"✅ Upsert: {sid} @ {win_start.isoformat()} → { {k:v for k,v in agg.items() if v is not None} }")

    except KeyboardInterrupt:
        print("🛑 Stopping...")
    except StopIteration:
        print("⏰ Consumer timed out - no messages available")
    finally:
        consumer.close()
        session.shutdown()
        cluster.shutdown()

if __name__ == "__main__":
    main()
