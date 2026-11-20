import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ChangeType(str, Enum):
    ADDED = "ADDED"
    UPDATED = "UPDATED"
    EXPIRED = "EXPIRED"
    CLOSED = "CLOSED"
    DUPLICATE_MERGED = "DUPLICATE_MERGED"
    WEBSITE_UNAVAILABLE = "WEBSITE_UNAVAILABLE"
    WEBSITE_RESTORED = "WEBSITE_RESTORED"
    NO_CHANGE = "NO_CHANGE"


class WebsiteStatus(str, Enum):
    HEALTHY = "HEALTHY"
    TEMPORARILY_UNAVAILABLE = "TEMPORARILY_UNAVAILABLE"
    PERMANENTLY_CLOSED = "PERMANENTLY_CLOSED"
    UNKNOWN = "UNKNOWN"


class SchemeChangeItem(BaseModel):
    slug: str
    scheme_name: str
    change_type: ChangeType
    details: Dict[str, Any] = Field(default_factory=dict)
    field_diffs: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    reasons: List[str] = Field(default_factory=list)


class WebsiteHealthReport(BaseModel):
    url: str
    status: WebsiteStatus
    status_code: Optional[int] = None
    last_checked_at: datetime = Field(default_factory=datetime.utcnow)
    consecutive_failures: int = 0
    error_message: Optional[str] = None


class SyncRunSummary(BaseModel):
    sync_id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    status: str = "completed"  # running, completed, failed
    dry_run: bool = False
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    duration_seconds: float = 0.0
    
    total_scanned: int = 0
    added_count: int = 0
    updated_count: int = 0
    expired_count: int = 0
    closed_count: int = 0
    duplicate_count: int = 0
    unavailable_count: int = 0
    
    changes: List[SchemeChangeItem] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)


class SyncTriggerRequest(BaseModel):
    dry_run: bool = False
    rebuild_embeddings: bool = True
    trigger_rematch: bool = True
    source_url: Optional[str] = None
    target_slugs: Optional[List[str]] = None


class SyncStatusResponse(BaseModel):
    is_running: bool
    current_or_last_sync_id: Optional[str] = None
    last_completed_sync: Optional[SyncRunSummary] = None
    total_audit_events: int = 0
