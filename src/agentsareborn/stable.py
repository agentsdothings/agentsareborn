from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class StableStore:
    """Local stable registry for born agents.

    The stable intentionally stores credential references, never raw credentials.
    """

    def __init__(self, root: Path):
        self.root = Path(root)
        self.path = self.root / "agents.json"

    def _empty(self) -> dict:
        return {
            "stableId": "platform-builders",
            "description": "Local stable of platform-builder agents born by AgentsAreBorn.",
            "agents": [],
            "updatedAt": utc_now(),
        }

    def load(self) -> dict:
        if not self.path.exists():
            return self._empty()
        return json.loads(self.path.read_text())

    def save(self, stable: dict) -> None:
        stable["updatedAt"] = utc_now()
        self.root.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(stable, indent=2, sort_keys=True) + "\n")

    def add_agent(
        self,
        *,
        agent_id: str,
        name: str,
        role: str,
        manifest_path: str,
        credential_ref: str,
        capabilities: Iterable[str],
        adt_apps: Iterable[str],
        status: str = "embryo",
    ) -> dict:
        stable = self.load()
        agents = [a for a in stable["agents"] if a["agentId"] != agent_id]
        entry = {
            "agentId": agent_id,
            "name": name,
            "role": role,
            "status": status,
            "origin": "agentsareborn",
            "manifestPath": manifest_path,
            "credentialRef": credential_ref,
            "capabilities": list(capabilities),
            "adtApps": list(adt_apps),
            "allowedRunners": ["hermes", "cron", "webhook"],
            "createdAt": utc_now(),
            "lastRunAt": None,
        }
        agents.append(entry)
        stable["agents"] = sorted(agents, key=lambda a: a["name"])
        self.save(stable)
        return entry

    def list_agents(self) -> list[dict]:
        return self.load()["agents"]
