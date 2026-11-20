#!/usr/bin/env python3
"""
Automated Government Scheme Dataset Update CLI for SchemeSaathi-AI.

Usage:
    python scripts/update_schemes.py [--dry-run] [--source <path_or_url>] [--check-health] [--skip-embeddings] [--history] [--report]
"""
import argparse
import asyncio
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "apps" / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from src.config.database import AsyncSessionLocal
from src.modules.schemes.sync.engine import SchemeSyncEngine


async def main():
    parser = argparse.ArgumentParser(description="Automated Government Scheme Dataset Synchronizer for SchemeSaathi-AI")
    parser.add_argument("--dry-run", action="store_true", help="Simulate update without modifying datasets or database")
    parser.add_argument("--source", type=str, default=None, help="Path or URL to official source feed / snapshot")
    parser.add_argument("--check-health", action="store_true", help="Check official government portal HTTP reachability")
    parser.add_argument("--skip-embeddings", action="store_true", help="Skip heavy FAISS neural embedding recalculation")
    parser.add_argument("--history", action="store_true", help="Display recent scheme update audit history and exit")
    parser.add_argument("--report", action="store_true", help="Print latest markdown audit report and exit")
    parser.add_argument("--slugs", nargs="*", default=None, help="Target specific scheme slugs only")

    args = parser.parse_args()
    engine = SchemeSyncEngine.get_instance()

    if args.history:
        events = engine.auditor.get_recent_history(limit=20)
        print(f"\n--- Recent Scheme Sync Audit Events ({len(events)}) ---")
        for ev in events:
            etype = ev.get("event_type")
            ts = ev.get("timestamp", "")
            if etype == "SYNC_SUMMARY":
                m = ev.get("metrics", {})
                print(f"[{ts}] SYNC: Added={m.get('added')} Updated={m.get('updated')} Expired={m.get('expired')} Closed={m.get('closed')} Duplicates={m.get('duplicates')}")
            else:
                print(f"[{ts}] {ev.get('change_type')}: {ev.get('slug')} - {ev.get('scheme_name')} ({'; '.join(ev.get('reasons', []))})")
        return

    if args.report:
        events = engine.auditor.get_recent_history(limit=10)
        summaries = [e for e in events if e.get("event_type") == "SYNC_SUMMARY"]
        if not summaries:
            print("No synchronization reports found.")
            return
        latest = summaries[0]
        print(f"\nLatest Sync ID: {latest.get('sync_id')}")
        print(f"Status: {latest.get('status')}")
        print(f"Metrics: {latest.get('metrics')}")
        return

    print("=" * 65)
    print("SchemeSaathi-AI: Government Scheme Auto-Update Engine")
    print("=" * 65)
    print(f"Mode: {'DRY RUN (Preview)' if args.dry_run else 'LIVE UPDATE'}")
    print(f"Source: {args.source or 'Default catalogue & registered official sources'}")
    print(f"Check Website Health: {args.check_health}")
    print(f"Rebuild Embeddings: {not args.skip_embeddings}")
    print("-" * 65)

    async with AsyncSessionLocal() as db:
        summary = await engine.execute_sync(
            source_feed=args.source,
            dry_run=args.dry_run,
            rebuild_embeddings=not args.skip_embeddings,
            check_website_health=args.check_health,
            db=db,
            target_slugs=args.slugs,
        )

    print("\n" + engine.auditor.generate_markdown_report(summary))
    print("=" * 65)
    print("Synchronization process completed successfully!")


if __name__ == "__main__":
    asyncio.run(main())
