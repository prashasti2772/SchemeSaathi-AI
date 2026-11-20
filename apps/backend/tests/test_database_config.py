import ssl
from pathlib import Path

import pytest

from src.config.database_url import database_options
from src.config.settings import Settings


@pytest.mark.parametrize("driver", ["postgres", "postgresql", "postgresql+asyncpg"])
def test_postgresql_options_normalize_driver_and_tls_without_losing_query(driver):
    url, options = database_options(driver + "://user:password@localhost/test?sslmode=require&channel_binding=require&application_name=scheme-test")
    assert url.drivername == "postgresql+asyncpg"
    assert dict(url.query) == {"application_name": "scheme-test"}
    assert isinstance(options["ssl"], ssl.SSLContext)
    assert options["ssl"].check_hostname
    assert options["timeout"] == 15


def test_explicit_local_tls_disable_and_sqlite_options():
    _, options = database_options("postgresql://localhost/test?sslmode=disable")
    assert "ssl" not in options
    url, options = database_options("sqlite+aiosqlite:///local.db")
    assert url.database == "local.db" and options == {"timeout": 15}


def test_backend_env_location_is_independent_of_working_directory():
    path = Path(Settings.model_config["env_file"])
    assert path.is_absolute() and path.name == ".env" and path.parent.name == "backend"


def test_startup_registers_existing_analytics_and_citizen_tables():
    from src.main import app
    from src.config.database import Base
    assert app is not None
    assert {"analytics_snapshots", "users", "citizen_scheme_profiles", "citizen_saved_schemes", "refresh_tokens"} <= set(Base.metadata.tables)
