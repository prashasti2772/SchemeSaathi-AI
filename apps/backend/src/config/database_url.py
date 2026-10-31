"""Connection options shared by runtime and read-only diagnostics."""
import ssl

from sqlalchemy.engine import make_url


def database_options(raw_url):
    url = make_url(raw_url)
    options = {"timeout": 15}
    if url.drivername in ("postgres", "postgresql", "postgresql+asyncpg"):
        query = dict(url.query)
        sslmode = query.pop("sslmode", None)
        query.pop("channel_binding", None)
        url = url.set(drivername="postgresql+asyncpg", query=query)
        if sslmode and sslmode != "disable":
            options["ssl"] = ssl.create_default_context()
    return url, options
