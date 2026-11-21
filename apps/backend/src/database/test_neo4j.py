from src.database.neo4j_db import check_connection

try:
    check_connection()
    print("Neo4j connected successfully!")
except Exception as e:
    print("Neo4j connection failed:", e)