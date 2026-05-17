# API Sketch

This is an initial shape, not a committed implementation contract.

## Create a birth request

```http
POST /api/birth-requests
```

```json
{
  "seed": "Create a careful research agent that monitors prediction markets and summarizes changes.",
  "creatorId": "user_123",
  "visibility": "private",
  "constraints": ["no posting publicly without approval"]
}
```

## Incubate a genome

```http
POST /api/birth-requests/{id}/incubate
```

Returns a draft genome requiring review.

## Approve a genome

```http
POST /api/genomes/{id}/approve
```

## Activate an agent

```http
POST /api/genomes/{id}/activate
```

Registers identity, publishes manifest, and returns activation receipts.

## Run first breath

```http
POST /api/agents/{agent_id}/first-breath
```

## List stable

```http
GET /api/stables/{stable_id}/agents
```
