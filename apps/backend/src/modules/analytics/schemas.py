from pydantic import BaseModel


class FunnelStageCount(BaseModel):
    stage: str
    count: int


class FunnelAnalyticsResponse(BaseModel):
    stages: list[FunnelStageCount]
    total_beneficiaries: int


class GeographicGapEntry(BaseModel):
    location: str
    beneficiary_count: int
    matched_count: int
    applied_count: int


class SchemeAnalyticsEntry(BaseModel):
    scheme_id: str
    scheme_name: str
    total_matches: int
    confirmed_matches: int
    applications: int


class DashboardSummaryResponse(BaseModel):
    total_beneficiaries: int
    total_active_schemes: int
    total_potential_matches: int
    total_confirmed_matches: int
    total_applications_submitted: int
    pending_readiness_checks: int
    active_campaigns: int
    open_facilitator_cases: int
