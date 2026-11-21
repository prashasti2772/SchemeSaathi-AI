"""Neo4j async driver with graceful fallback when not configured."""
import logging
from typing import Optional

from neo4j import AsyncGraphDatabase, AsyncDriver

from src.config.settings import settings

logger = logging.getLogger(__name__)

_driver: Optional[AsyncDriver] = None
_last_error: Optional[str] = None


async def init_neo4j() -> bool:
    """Initialize Neo4j async driver. Returns True if connected."""
    global _driver, _last_error
    if not settings.NEO4J_URI or not settings.NEO4J_ENABLED:
        _last_error = "Neo4j URI not configured in .env"
        logger.info("Neo4j not configured, skipping")
        return False
    try:
        _driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD),
        )
        await _driver.verify_connectivity()
        _last_error = None
        logger.info("Neo4j connected successfully")
        return True
    except Exception as e:
        err_msg = str(e)
        if "Unauthorized" in err_msg or "authentication failure" in err_msg.lower():
            _last_error = "Authentication failed: Please verify NEO4J_PASSWORD in .env"
        else:
            _last_error = f"Connection error: {err_msg}"
        logger.warning(f"Neo4j connection failed: {e}. Running with local graph fallback.")
        _driver = None
        return False


async def close_neo4j():
    """Close the Neo4j async driver."""
    global _driver
    if _driver:
        await _driver.close()
        _driver = None


def get_driver() -> Optional[AsyncDriver]:
    """Return the active async driver, or None if not connected."""
    return _driver


def is_connected() -> bool:
    """Return True if the Neo4j driver is active."""
    return _driver is not None


def get_last_error() -> Optional[str]:
    """Return the last connection error if any."""
    return _last_error
