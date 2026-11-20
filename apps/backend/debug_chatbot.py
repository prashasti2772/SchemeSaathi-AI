import asyncio
import sys
sys.path.insert(0, ".")

async def main():
    print("=== Testing ChatbotService ===")
    try:
        from src.modules.chatbot.service import chatbot_service
        print("[1] ChatbotService imported OK")

        print("[2] Ensuring initialized...")
        await asyncio.to_thread(chatbot_service._ensure_initialized)
        print(f"    initialized={chatbot_service._is_initialized}")
        print(f"    embedder={chatbot_service.embedder}")
        print(f"    index={chatbot_service.index}")
        print(f"    docs count={len(chatbot_service.documents)}")

        print("[3] Running search...")
        results = await chatbot_service.search_async("women entrepreneur loan", top_k=3)
        print(f"    search results count={len(results)}")
        if results:
            print(f"    first result: {results[0].get('scheme_name')}")

        print("[4] Running chat...")
        result = await chatbot_service.chat("schemes for women in UP", history=[])
        print(f"    reply: {result['reply'][:200]}")
        print(f"    retrieved_schemes count: {len(result.get('retrieved_schemes', []))}")

    except Exception as e:
        import traceback
        print(f"\n❌ ERROR: {e}")
        traceback.print_exc()

asyncio.run(main())
