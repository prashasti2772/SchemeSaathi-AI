import pytest
from src.config.settings import Settings
from src.modules.eligibility.service import eligibility_service
from src.ml.eligibility_engine.matcher import EligibilityMatcher

@pytest.mark.parametrize("url", ["sqlite+aiosqlite:///./local.db", "", "invalid"])
def test_production_rejects_non_postgresql_without_exposing_input(url):
    with pytest.raises(RuntimeError, match="Production requires") as error:
        Settings(_env_file=None, ENV="production", DATABASE_URL=url)
    assert "local.db" not in str(error.value)

def test_local_development_keeps_sqlite_default():
    assert Settings(_env_file=None, ENV="development").DATABASE_URL.startswith("sqlite")

def test_production_accepts_existing_postgresql_driver():
    # Parsing only; never connects to this syntactic fixture.
    assert Settings(_env_file=None, ENV="production", DATABASE_URL="postgresql+asyncpg://localhost/test").ENV == "production"

def test_missing_business_is_unknown_only_for_business_restricted_schemes():
    matcher = EligibilityMatcher()
    normalized = eligibility_service.normalize_profile({"age":20,"business_type":None})
    assert normalized["Business_Type"] is None
    assert matcher.match_business(None, "Any") is True
    assert matcher.match_business(None, "Manufacturing") is None
    assert matcher.match_business("Service", "Services") is True
    assert matcher.match_business("Agriculture", "Manufacturing") is False
    scheme = eligibility_service.engine.df.iloc[0].copy()
    scheme["Age Range"] = "0-100"
    scheme["Max Income"] = ""
    scheme["Eligible Genders"] = "Any"
    scheme["Eligible Categories"] = "Any"
    scheme["Disability Required"] = "No"
    scheme["Rural Only"] = "No"
    scheme["State"] = "Any"
    scheme["Business Types"] = "Any"
    assert matcher.match_scheme(normalized, scheme)["eligible"]
    scheme["Business Types"] = "Manufacturing"
    result = matcher.match_scheme(normalized, scheme)
    assert not result["eligible"]
    assert "Business" in result["unknown"]
    assert "Business" not in result["failed"]
