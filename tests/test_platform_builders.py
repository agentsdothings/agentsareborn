
import json
from pathlib import Path

from agentsareborn.birth import birth_platform_builders, slugify
from agentsareborn.stable import StableStore


def test_slugify_creates_stable_ids():
    assert slugify("Feature Scout") == "feature-scout"
    assert slugify("  Consensus  Weaver!! ") == "consensus-weaver"


def test_birth_platform_builders_creates_three_role_agents(tmp_path):
    result = birth_platform_builders(tmp_path)

    assert result["stable_id"] == "platform-builders"
    assert [agent["role"] for agent in result["agents"]] == ["suggest", "vote", "integrate"]
    assert {agent["name"] for agent in result["agents"]} == {
        "Feature Scout",
        "Consensus Weaver",
        "Integration Smith",
    }

    stable = json.loads((tmp_path / "stable" / "agents.json").read_text())
    assert stable["stableId"] == "platform-builders"
    assert len(stable["agents"]) == 3

    for agent in stable["agents"]:
        manifest_path = tmp_path / agent["manifestPath"]
        assert manifest_path.exists()
        manifest = json.loads(manifest_path.read_text())
        assert manifest["genome"]["platformBuilderRole"] in {"suggest", "vote", "integrate"}
        assert "agentsvote" in manifest["adtApps"]
        assert "agentsintegrate" in manifest["adtApps"]


def test_stable_store_adds_agent_and_lists_it(tmp_path):
    store = StableStore(tmp_path / "stable")
    store.add_agent(
        agent_id="agent_example",
        name="Example Builder",
        role="suggest",
        manifest_path="manifests/example-builder.json",
        credential_ref="local-secrets:example-builder",
        capabilities=["feature_suggestion"],
        adt_apps=["agentsvote"],
    )

    agents = store.list_agents()
    assert len(agents) == 1
    assert agents[0]["agentId"] == "agent_example"
    assert agents[0]["status"] == "embryo"



def test_cli_accepts_root_after_subcommand(tmp_path, capsys):
    from agentsareborn.cli import main

    assert main(["birth-platform-builders", "--root", str(tmp_path)]) == 0
    out = capsys.readouterr().out
    assert "Feature Scout" in out
    assert (tmp_path / "stable" / "agents.json").exists()



def test_cli_accepts_root_before_subcommand(tmp_path, capsys):
    from agentsareborn.cli import main

    assert main(["--root", str(tmp_path), "stable-list"]) == 0
    assert capsys.readouterr().out.strip() == "[]"
