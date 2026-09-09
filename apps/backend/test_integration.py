import asyncio
import httpx
from src.main import app
from src.modules.eligibility.service import eligibility_service
from src.modules.chatbot.service import chatbot_service

async def run_all_tests():
    print("==================================================")
    print("RUNNING SCHEMESATHI INTEGRATION VERIFICATION SUITE")
    print("==================================================")

    # TEST 1: Eligibility Service
    print("\n[TEST 1] Testing EligibilityService matching...")
    test_profile = {
        "age": 28,
        "gender": "Female",
        "category": "SC",
        "annual_income": "₹1 - ₹3 Lakh",
        "business_type": "Tailoring",
        "state": "Uttar Pradesh",
        "district": "Varanasi"
    }
    matches = eligibility_service.match_schemes(test_profile, top_n=5)
    assert len(matches) > 0, "No matches returned from EligibilityService"
    top_match = matches[0]
    assert "name" in top_match, "Match missing 'name'"
    assert "score" in top_match, "Match missing 'score'"
    assert "explanation" in top_match, "Match missing 'explanation'"
    assert "required_documents" in top_match, "Match missing 'required_documents'"
    assert "official_source_url" in top_match, "Match missing 'official_source_url'"
    print(f"[PASS] EligibilityService PASSED: {len(matches)} matches returned.")
    print(f"  Top Scheme: {top_match['name']}")
    print(f"  Score: {top_match['score']} ({top_match['confidence']} confidence)")
    print(f"  URL: {top_match['official_source_url']}")

    # TEST 2: Chatbot Service
    print("\n[TEST 2] Testing ChatbotService semantic RAG search...")
    search_results = chatbot_service.search("handicraft artisan subsidy", top_k=3)
    assert len(search_results) > 0, "No schemes returned from ChatbotService search"
    print(f"[PASS] FAISS search PASSED: {len(search_results)} relevant schemes found.")
    for s in search_results:
        print(f"  - {s.get('scheme_name')} ({s.get('level')})")

    chat_res = await chatbot_service.chat("How do I get financial assistance for starting a handicraft business?")
    assert "reply" in chat_res and len(chat_res["reply"]) > 0, "No reply generated"
    assert "retrieved_schemes" in chat_res and len(chat_res["retrieved_schemes"]) > 0, "No retrieved schemes"
    print(f"[PASS] Chatbot response PASSED: reply length={len(chat_res['reply'])}, schemes referenced={len(chat_res['retrieved_schemes'])}.")

    # TEST 3: FastAPI Endpoints via ASGI Client
    print("\n[TEST 3] Testing FastAPI HTTP endpoints...")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # A. Public Wizard Match Endpoint
        r_wizard = await client.post("/api/v1/public/self-service/schemes-match", json=test_profile)
        assert r_wizard.status_code == 200, f"Wizard match failed: {r_wizard.status_code}"
        d_wizard = r_wizard.json()
        assert d_wizard.get("total", 0) > 0, "Wizard match returned 0 total"
        print(f"[PASS] POST /api/v1/public/self-service/schemes-match: 200 OK ({d_wizard['total']} schemes)")

        # B. Public Chatbot Assistant Endpoint
        r_chat = await client.post(
            "/api/v1/public/self-service/assistant-chat",
            json={"message": "What schemes exist for solar energy subsidy?"}
        )
        assert r_chat.status_code == 200, f"Assistant chat failed: {r_chat.status_code}"
        d_chat = r_chat.json()
        assert "reply" in d_chat, "Assistant chat missing reply"
        print(f"[PASS] POST /api/v1/public/self-service/assistant-chat: 200 OK")

        # C. Dedicated Eligibility Recommend Endpoint
        r_rec = await client.post("/api/v1/eligibility/recommend", json=test_profile)
        assert r_rec.status_code == 200, f"Eligibility recommend failed: {r_rec.status_code}"
        d_rec = r_rec.json()
        assert d_rec.get("success") is True, "Eligibility recommend success is not True"
        print(f"[PASS] POST /api/v1/eligibility/recommend: 200 OK ({d_rec['total']} schemes)")

        # D. Dedicated Eligibility Explain Endpoint
        r_exp = await client.post("/api/v1/eligibility/explain", json=test_profile)
        assert r_exp.status_code == 200, f"Eligibility explain failed: {r_exp.status_code}"
        d_exp = r_exp.json()
        assert d_exp.get("success") is True, "Eligibility explain success is not True"
        print(f"[PASS] POST /api/v1/eligibility/explain: 200 OK (Scheme: {d_exp['scheme_name']})")

        # E. Dedicated Chatbot Search Endpoint
        r_search = await client.get("/api/v1/chatbot/search?q=dairy&top_k=3")
        assert r_search.status_code == 200, f"Chatbot search failed: {r_search.status_code}"
        d_search = r_search.json()
        assert d_search.get("total", 0) > 0, "Chatbot search returned 0 schemes"
        print(f"[PASS] GET /api/v1/chatbot/search: 200 OK ({d_search['total']} schemes found)")

    print("\n==================================================")
    print("ALL INTEGRATION VERIFICATIONS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_all_tests())
