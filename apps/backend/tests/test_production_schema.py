"""A production release must never silently migrate the configured database."""
import pytest
from sqlalchemy import create_engine, MetaData, Table, Column, Integer, event

from src.config.schema import validate_production_schema


def test_production_validation_is_read_only_and_reports_missing_schema():
    engine = create_engine("sqlite://")
    metadata = MetaData()
    Table("example", metadata, Column("id", Integer, primary_key=True), Column("new_field", Integer))
    with engine.begin() as connection:
        connection.exec_driver_sql("CREATE TABLE example (id INTEGER PRIMARY KEY)")
        statements = []
        event.listen(connection, "before_cursor_execute", lambda conn, cursor, statement, parameters, context, many: statements.append(statement))
        with pytest.raises(RuntimeError, match="example.new_field"):
            validate_production_schema(connection, metadata, include_staff=True)
        assert statements and not any(statement.lstrip().upper().startswith(("CREATE", "ALTER", "INSERT", "UPDATE", "DELETE", "DROP")) for statement in statements)
        connection.exec_driver_sql("ALTER TABLE example ADD COLUMN new_field INTEGER")
        validate_production_schema(connection, metadata, include_staff=True)


def test_production_validation_does_not_create_missing_table():
    engine = create_engine("sqlite://")
    metadata = MetaData()
    Table("missing", metadata, Column("id", Integer, primary_key=True))
    with engine.connect() as connection:
        with pytest.raises(RuntimeError, match=r"missing \(table\)"):
            validate_production_schema(connection, metadata, include_staff=True)
        assert connection.exec_driver_sql("SELECT name FROM sqlite_master WHERE type='table'").all() == []
