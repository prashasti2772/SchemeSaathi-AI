from fastapi import Request, status
from fastapi.responses import JSONResponse


class AppException(Exception):
    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "APP_ERROR"

    def __init__(self, message: str, status_code: int | None = None, error_code: str | None = None):
        self.message = message
        if status_code:
            self.status_code = status_code
        if error_code:
            self.error_code = error_code
        super().__init__(message)


class NotFoundException(AppException):
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "NOT_FOUND"


class UnauthorizedException(AppException):
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "UNAUTHORIZED"


class ForbiddenException(AppException):
    status_code = status.HTTP_403_FORBIDDEN
    error_code = "FORBIDDEN"


class ConflictException(AppException):
    status_code = status.HTTP_409_CONFLICT
    error_code = "CONFLICT"


class BusinessRuleException(AppException):
    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    error_code = "BUSINESS_RULE_VIOLATION"


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"error_code": exc.error_code, "message": exc.message})


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error_code": "INTERNAL_SERVER_ERROR", "message": "An unexpected error occurred"},
    )


def register_exception_handlers(app) -> None:
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
