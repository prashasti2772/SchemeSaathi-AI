from fastapi import Depends
from src.middlewares.auth_middleware import get_current_user
from src.middlewares.error_handler import ForbiddenException
from src.modules.users.models import User


def require_roles(*allowed_roles: str):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value not in allowed_roles:
            raise ForbiddenException(f"Role '{current_user.role.value}' is not permitted to perform this action")
        return current_user
    return role_checker


require_admin = require_roles("admin")
require_operator = require_roles("admin", "operator")
require_facilitator = require_roles("admin", "operator", "facilitator")
require_any_staff = require_roles("admin", "operator", "facilitator", "support")
