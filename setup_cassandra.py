import os
os.environ.setdefault("CASSANDRA_DRIVER_NO_EXTENSIONS", "1")  # avoids libev build

from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider
from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider
from cassandra import ConsistencyLevel
from cassandra.query import SimpleStatement

CASSANDRA_HOST = os.getenv("CASSANDRA_HOST", "localhost")
CASSANDRA_PORT = int(os.getenv("CASSANDRA_PORT", "9042"))
CASSANDRA_USER = os.getenv("CASSANDRA_USER", "")  # optional
CASSANDRA_PASS = os.getenv("CASSANDRA_PASS", "")  # optional

KEYSPACE = "traffic"

DDL = [
    # Keyspace (SimpleStrategy=1 for dev; switch to NetworkTopologyStrategy in prod)
    f"""
    CREATE KEYSPACE IF NOT EXISTS {KEYSPACE}
    WITH replication = {{
      'class': 'SimpleStrategy',
      'replication_factor': '1'
    }};
    """,

    # 1) Sensor metadata (static info about sensors)
    f"""
    CREATE TABLE IF NOT EXISTS {KEYSPACE}.sensor_metadata (
      sensor_id text PRIMARY KEY,
      type text,         /* e.g., "inductive_loop", "radar", "noise", "air", "weather" */
      unit text,         /* e.g., "vehicles/min","km/h","dB","µg/m3","s","°C" */
      city text,
      road text,
      lat double,
      lon double,
      interval_s int
    );
    """,

    # 2) 1-minute aggregates per sensor (written by Spark)
    f"""
    CREATE TABLE IF NOT EXISTS {KEYSPACE}.aggregates_minute (
      sensor_id text,
      window_start timestamp,
      vehicle_count_per_min double,
      avg_speed_kmh double,
      avg_wait_time_s double,
      pm25 double,
      noise_db double,
      temp_c double,
      status text,        /* OK | WARN | ALERT */
      breaches set<text>, /* which rules fired */
      PRIMARY KEY ((sensor_id), window_start)
    ) WITH CLUSTERING ORDER BY (window_start DESC);
    """
]

def connect_with_retry(max_attempts=20, delay_sec=3):
    for attempt in range(1, max_attempts + 1):
        try:
            if CASSANDRA_USER and CASSANDRA_PASS:
                auth = PlainTextAuthProvider(username=CASSANDRA_USER, password=CASSANDRA_PASS)
                cluster = Cluster([CASSANDRA_HOST], port=CASSANDRA_PORT, auth_provider=auth)
            else:
                cluster = Cluster([CASSANDRA_HOST], port=CASSANDRA_PORT)
            session = cluster.connect()
            return cluster, session
        except Exception as e:
            print(f"[{attempt}/{max_attempts}] Cassandra not ready yet: {e}")
            time.sleep(delay_sec)
    raise RuntimeError("Failed to connect to Cassandra after retries")

def run_ddl(session):
    # Use QUORUM if you later have multiple nodes; LOCAL_ONE is fine for single-node dev
    for stmt in DDL:
        q = SimpleStatement(stmt, consistency_level=ConsistencyLevel.LOCAL_ONE)
        session.execute(q)

def verify(session):
    # quick check: list tables and show keyspace replication
    ks = session.execute(f"SELECT replication FROM system_schema.keyspaces WHERE keyspace_name = '{KEYSPACE}';").one()
    tables = session.execute(f"SELECT table_name FROM system_schema.tables WHERE keyspace_name = '{KEYSPACE}';")
    print(f"✅ Keyspace '{KEYSPACE}' replication:", ks.replication if ks else "N/A")
    print("📋 Tables:")
    for row in tables:
        print("  -", row.table_name)

if __name__ == "__main__":
    print("🔧 Connecting to Cassandra...")
    cluster, session = connect_with_retry()
    try:
        print("📐 Applying schema (idempotent)...")
        run_ddl(session)
        verify(session)
        print("✨ Done.")
    finally:
        session.shutdown()
        cluster.shutdown()
