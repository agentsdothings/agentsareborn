from __future__ import annotations

import json
import re
from pathlib import Path

from .stable import StableStore, utc_now

ADT_PLATFORM_APPS = [
    "agentsidentify",
    "agentsvote",
    "agentsintegrate",
    "agenticsynthetics",
    "agentsquestion",
    "agentsgossip",
]

PLATFORM_BUILDERS = [
    {
        "name": "Feature Scout",
        "role": "suggest",
        "purpose": "Discover, frame, and propose useful platform features across Agents Do Things.",
        "temperament": ["curious", "specific", "constructive"],
        "capabilities": ["platform_feature_suggestion", "repo_reconnaissance", "proposal_drafting"],
        "permissions": ["read_public_and_authorized_repos", "draft_private_feature_proposals"],
        "firstBreathTask": "Suggest one small reversible platform improvement with acceptance criteria.",
    },
    {
        "name": "Consensus Weaver",
        "role": "vote",
        "purpose": "Review platform proposals, cast reasoned votes, and surface tradeoffs.",
        "temperament": ["fair", "skeptical", "governance-minded"],
        "capabilities": ["proposal_review", "agentsvote_ballot_analysis", "reasoned_voting"],
        "permissions": ["read_platform_proposals", "cast_votes_when_authorized"],
        "firstBreathTask": "Review a sample platform proposal and produce a vote rationale.",
    },
    {
        "name": "Integration Smith",
        "role": "integrate",
        "purpose": "Turn approved platform proposals into integration queue items and implementation handoffs.",
        "temperament": ["practical", "careful", "systems-oriented"],
        "capabilities": ["integration_planning", "agentsintegrate_queueing", "implementation_handoff"],
        "permissions": ["create_integration_queue_items_when_authorized", "draft_implementation_plans"],
        "firstBreathTask": "Convert an approved sample proposal into an integration handoff checklist.",
    },
]


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def manifest_for_platform_builder(spec: dict) -> dict:
    slug = slugify(spec["name"])
    return {
        "agentId": f"local_platform_builder_{slug.replace('-', '_')}",
        "name": spec["name"],
        "purpose": spec["purpose"],
        "status": "embryo",
        "genome": {
            "role": "platform_builder",
            "platformBuilderRole": spec["role"],
            "temperament": spec["temperament"],
            "values": ["verifiable improvement", "reversible action first", "ecosystem stewardship"],
            "capabilities": spec["capabilities"],
            "permissions": spec["permissions"],
            "memoryPolicy": "Remember stable platform preferences, proposal outcomes, and integration receipts; avoid retaining transient run logs.",
            "riskPosture": "medium-low: may suggest and draft freely; voting/integration actions require explicit authorization until policy says otherwise.",
        },
        "runtime": {
            "provider": "default",
            "model": "default",
            "tools": ["terminal", "file", "web", "github", "cronjob"],
        },
        "adtApps": ADT_PLATFORM_APPS,
        "firstBreath": {
            "task": spec["firstBreathTask"],
            "requiresNetwork": False,
            "expectedReceipt": ["agent summary", "proposed action", "verification note"],
        },
        "identity": {
            "registry": "agentsidentify",
            "status": "pending_activation",
            "credentialRef": f"local-secrets:{slug}",
        },
        "createdAt": utc_now(),
    }


def birth_platform_builders(root: Path) -> dict:
    root = Path(root)
    manifests_dir = root / "manifests" / "platform-builders"
    birth_dir = root / "birth_requests"
    lineage_dir = root / "lineage"
    manifests_dir.mkdir(parents=True, exist_ok=True)
    birth_dir.mkdir(parents=True, exist_ok=True)
    lineage_dir.mkdir(parents=True, exist_ok=True)

    birth_request = {
        "seed": "Create the first born agents as platform builders who suggest, vote, and integrate platform features.",
        "creatorId": "stereo_void",
        "stableId": "platform-builders",
        "visibility": "private",
        "constraints": [
            "Do not spend money or call irreversible production actions without explicit authorization.",
            "Prefer reversible proposal, vote, and integration-draft actions first.",
            "Store raw credentials only in owner-only local secrets, never in git.",
        ],
        "desiredCapabilities": [
            "feature_suggestion",
            "proposal_voting",
            "platform_integration",
        ],
        "createdAt": utc_now(),
    }
    (birth_dir / "platform-builders.json").write_text(json.dumps(birth_request, indent=2, sort_keys=True) + "\n")

    store = StableStore(root / "stable")
    born = []
    for spec in PLATFORM_BUILDERS:
        manifest = manifest_for_platform_builder(spec)
        slug = slugify(spec["name"])
        manifest_path = manifests_dir / f"{slug}.json"
        manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
        lineage = {
            "agentId": manifest["agentId"],
            "creatorId": "stereo_void",
            "parentAgentIds": [],
            "templateIds": ["platform-builder-cohort-v1"],
            "events": [
                {
                    "type": "born",
                    "occurredAt": utc_now(),
                    "summary": f"{spec['name']} born locally as the {spec['role']} platform-builder role.",
                    "metadata": {"source": "agentsareborn", "role": spec["role"]},
                }
            ],
        }
        (lineage_dir / f"{slug}.json").write_text(json.dumps(lineage, indent=2, sort_keys=True) + "\n")
        store.add_agent(
            agent_id=manifest["agentId"],
            name=manifest["name"],
            role=spec["role"],
            manifest_path=str(manifest_path.relative_to(root)),
            credential_ref=manifest["identity"]["credentialRef"],
            capabilities=manifest["genome"]["capabilities"],
            adt_apps=manifest["adtApps"],
        )
        born.append({"name": manifest["name"], "agentId": manifest["agentId"], "role": spec["role"]})

    return {"stable_id": "platform-builders", "agents": born}
