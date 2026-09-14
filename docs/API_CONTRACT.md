# Git Pulse — API Contract

This defines the frontend/backend boundary.

---

# GET /api/activity

Returns aggregated activity.

Parameters:

- from
- to
- language
- activityType
- location

Rules:

- maximum range = 24 hours
- visualization-ready response
- no raw GitHub payload
- no commit/file detail

Example:

```json
{
  "range": {
    "from": "2026-09-02T10:00:00Z",
    "to": "2026-09-03T10:00:00Z"
  },
  "buckets": [
    {
      "time": "2026-09-03T09:00:00Z",
      "locations": [
        {
          "locationId": "blr",
          "count": 184,
          "languages": {
            "python": 72,
            "javascript": 51,
            "java": 31
          }
        }
      ]
    }
  ]
}
GET /api/stats

Example:

{
  "activities": 124381,
  "activeLocations": 2483,
  "topLanguage": "python",
  "topCity": "blr",
  "activityBreakdown": {
    "push": 82100,
    "pullRequest": 23100,
    "issue": 19200
  }
}

Values are illustrative.

GET /api/locations

Example:

{
  "id": "blr",
  "city": "Bengaluru",
  "country": "India",
  "latitude": 12.9716,
  "longitude": 77.5946
}

The location catalog is reference data.

WS /api/live

Provides new aggregated updates.

Example:

{
  "timestamp": 1756890000,
  "updates": [
    {
      "locationId": "blr",
      "count": 12
    },
    {
      "locationId": "sfo",
      "count": 8
    }
  ]
}

Wire format may evolve.

Semantics may not silently change.

Messages must remain:

compact
aggregated
location-based
identity-free
commit-detail-free
GitHub-raw-payload-free