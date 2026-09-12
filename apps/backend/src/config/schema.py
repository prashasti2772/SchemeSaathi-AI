"""Small additive upgrades for databases created by earlier prototype releases."""
from sqlalchemy import inspect


def upgrade_user_schema(connection) -> None:
    """Preserve all existing rows while bringing legacy users tables up to date."""
    columns = {column["name"] for column in inspect(connection).get_columns("users")}
    additions = {
        "reset_token": "VARCHAR(255)",
        "reset_token_expires_at": "TIMESTAMP",
        "auth_version": "INTEGER NOT NULL DEFAULT 0",
    }
    for name, definition in additions.items():
        if name not in columns:
            connection.exec_driver_sql(f'ALTER TABLE users ADD COLUMN {name} {definition}')
