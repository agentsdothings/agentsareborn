from __future__ import annotations

import argparse
import json
from pathlib import Path

from .birth import birth_platform_builders
from .stable import StableStore


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="AgentsAreBorn local birth chamber")
    parser.set_defaults(root=Path.cwd())
    parser.add_argument("--root", dest="global_root", type=Path, help="workspace root for birth artifacts")
    sub = parser.add_subparsers(dest="command", required=True)

    birth = sub.add_parser("birth-platform-builders", help="birth the first suggest/vote/integrate platform-builder cohort")
    birth.add_argument("--root", dest="command_root", type=Path, help="workspace root for birth artifacts")
    stable = sub.add_parser("stable-list", help="list agents in the local stable")
    stable.add_argument("--root", dest="command_root", type=Path, help="workspace root for birth artifacts")

    args = parser.parse_args(argv)
    root = args.command_root or args.global_root or Path.cwd()
    if args.command == "birth-platform-builders":
        print(json.dumps(birth_platform_builders(root), indent=2, sort_keys=True))
        return 0
    if args.command == "stable-list":
        print(json.dumps(StableStore(root / "stable").list_agents(), indent=2, sort_keys=True))
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
