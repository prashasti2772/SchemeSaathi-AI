"""Small additive upgrades for databases created by earlier prototype releases."""
from sqlalchemy import inspect


PUBLIC_TABLES = {
    "users", "refresh_tokens", "captcha_challenges", "password_recovery_state",
    "password_recovery_challenges", "login_otp_state", "login_otp_challenges",
    "citizen_scheme_profiles", "citizen_saved_schemes", "support_tickets",
    "support_replies", "support_deliveries", "catalogue_translations",
}


def validate_production_schema(connection, metadata, *, include_staff=False) -> None:
    """Inspect required columns without changing production tables or records."""
    inspector = inspect(connection)
    existing = set(inspector.get_table_names())
    required = set(metadata.tables) if include_staff else PUBLIC_TABLES
    missing = []
    for name in sorted(required):
        if name not in existing:
            missing.append(name + " (table)")
            continue
        columns = {column["name"] for column in inspector.get_columns(name)}
        for column in metadata.tables[name].columns:
            if column.name not in columns:
                missing.append(name + "." + column.name)
    if missing:
        raise RuntimeError("Production schema requires an explicitly approved migration: " + ", ".join(missing))


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
