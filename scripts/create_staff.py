"""Create a helpdesk/admin account; run from apps/backend with PYTHONPATH=."""
import asyncio
import getpass
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps/backend"))
from sqlalchemy import select
from src.config.database import AsyncSessionLocal, engine
from src.modules.users.models import User, UserRole
from src.utils.security import hash_password

async def main():
    email = input("Staff email: ").strip().lower()
    name = input("Full name: ").strip()
    password = getpass.getpass("Password (at least 10 characters): ")
    if len(password) < 10 or "@" not in email or len(name) < 2:
        raise SystemExit("Invalid details")
    async with AsyncSessionLocal() as db:
        if (await db.execute(select(User).where(User.email == email))).scalar_one_or_none():
            raise SystemExit("Account exists; no changes made")
        db.add(User(email=email, full_name=name, hashed_password=hash_password(password), role=UserRole.ADMIN))
        await db.commit()
    await engine.dispose()
    print("Staff account created. Sign in on the website and open Support.")
if __name__ == "__main__":
    asyncio.run(main())

