## `README.md`

Put this in:

```text
data/experiments/github/2026-09-12/README.md
```

````markdown
# GitHub Location Data Experiment

## Purpose

This directory contains an empirical dataset collected from GitHub's public
Events API and public GitHub user profiles.

The experiment was performed to understand the real-world distribution and
quality of developer profile location data before expanding Git Pulse's
geographic location catalog.

The dataset is used as evidence for product and engineering decisions around:

- geographic coverage
- location normalization
- location resolution
- city catalog coverage
- missing-location handling
- frontend-plottable activity

This is an experiment dataset, not production application data.

---

## Collection

**Source:** GitHub public Events API and public GitHub user profile API

**Collection date:** 2026-09-12

**Target:** 1,000 unique GitHub events

**Uniqueness rule:** Events were deduplicated by GitHub event ID.

The experiment intentionally avoided pagination beyond the Events API's
supported behavior. Multiple Events API requests were collected and merged
by event ID until 1,000 unique events were obtained.

---

## Files

### `github-1000-unique-events.json`

Raw GitHub Events API objects for the 1,000 unique events collected during
the experiment.

This file is the primary event-level source dataset.

It contains GitHub public event information including:

- event ID
- event type
- actor
- repository
- event timestamp
- event-specific payload

The file must be treated as experimental source data and must not be used
directly as production application data.

---

### `github-1000-unique-user-locations.json`

Public GitHub user profile information collected for the unique actors
appearing in the event sample.

The experiment focused on the public `location` profile field.

The location field is self-reported by the GitHub user and is not verified
geographic information.

Locations may represent:

- cities
- countries
- regions
- states/provinces
- universities or institutions
- organizations
- informal descriptions
- invalid or non-geographic text

A missing location is valid source data and must not be interpreted as a
technical failure.

---

### `github-1000-unique-location-frequency.csv`

Derived frequency table of the non-empty raw profile location strings found
in the experiment.

This file is useful for quickly examining which location strings occurred
and how frequently they appeared.

It must not be interpreted as a geographic distribution of all GitHub
developers.

---

## Important Limitations

### 1. The sample is not statistically representative

The 1,000 events represent a snapshot of GitHub's public Events API and
should not be treated as a representative sample of the entire GitHub
developer population.

The dataset is intended to expose real-world data shapes and location
patterns, not to estimate global developer populations.

---

### 2. GitHub profile locations are self-reported

A GitHub profile's `location` field is user-provided.

It may be:

- missing
- outdated
- intentionally vague
- humorous
- ambiguous
- incomplete
- incorrectly formatted

Git Pulse must never treat the profile location as verified GPS data.

---

### 3. Missing locations are expected

A user without a profile location cannot be geographically resolved from
this source alone.

Git Pulse must not invent a city for such users.

Missing geographic information should remain unresolved and the associated
activity may still contribute to global activity statistics.

---

### 4. Raw locations require normalization

The same geographic location may appear in many forms.

Examples include differences in:

- capitalization
- whitespace
- punctuation
- abbreviations
- diacritics
- language
- city/country ordering

Raw profile strings must therefore not be used directly as location IDs.

---

### 5. A location string does not automatically identify a city

Examples such as:

```text
India
Japan
Canada
The Netherlands
Europe
````

do not provide a specific city.

Git Pulse must not arbitrarily assign such users to a city.

Similarly, institutional or organization references must not automatically
be interpreted as geographic locations without sufficient evidence.

---

## Relationship to Git Pulse

This experiment informs the geographic enrichment system:

```text
GitHub profile.location
        ↓
normalization
        ↓
location resolution
        ↓
locationId
        ↓
ActivityEvent
        ↓
PostgreSQL aggregation
        ↓
REST / WebSocket
        ↓
frontend visualization
```

The production system must preserve the existing location semantics:

* `RESOLVED`
* `AMBIGUOUS`
* `MISSING`
* `INVALID`

Coordinates belong to the canonical `Location` entity and must never be
invented on an individual event.

---

## Current Catalog Context

At the time of this experiment, Git Pulse used a small curated catalog of
12 cities.

The experiment demonstrated that real GitHub profile locations are much
more geographically diverse than that catalog.

However, the experiment must not be interpreted as a request to blindly add
every observed string to the catalog.

The dataset should instead be used to identify:

1. frequently occurring real cities
2. important geographic coverage gaps
3. useful aliases and spelling variants
4. country-only locations
5. ambiguous locations
6. invalid or non-geographic strings

Catalog expansion must remain curated, deterministic, and evidence-based.

---

## Production Data vs Experiment Data

These files are **not production data**.

Do not:

* import these events directly into PostgreSQL production tables
* use these events to fabricate live activity
* use these locations as guaranteed geographic truth
* hardcode every observed location into the application
* treat the sample as a global population estimate
* modify the raw source files during analysis

Production behavior must continue to use the live GitHub ingestion pipeline.

---

## Privacy and Repository Handling

The source data comes from publicly accessible GitHub APIs, but it may still
contain public usernames, repository names, profile URLs, and other
identifying information.

Therefore:

* do not add GitHub authentication tokens to these files
* do not add authorization headers
* do not expose credentials in logs
* do not unnecessarily duplicate raw profile information
* prefer derived location statistics for long-term project artifacts
* review `.gitignore` before committing raw experimental JSON data

If the raw JSON files are not required for reproducibility after analysis,
they may remain local/untracked while the derived analysis is committed.

---

## Reproducibility

The experiment should be reproducible conceptually from:

1. GitHub public Events API
2. unique event IDs
3. actor usernames
4. public GitHub user profiles
5. derived location-frequency analysis

Future experiments must record:

* collection date
* target sample size
* actual unique event count
* unique actor count
* number of profiles with locations
* collection methodology
* known API limitations
* any filtering or classification rules

---

## Intended Next Analysis

The next analysis should use this dataset to determine:

```text
raw profile location
        ↓
normalized location
        ↓
classification
        ↓
candidate geographic entity
        ↓
catalog coverage
```

The analysis should distinguish between:

* city
* country
* region/state/province
* institution/company
* ambiguous
* invalid/junk

The result should be used to guide expansion of the curated Git Pulse
location catalog.

No location catalog change should be made solely because a string appeared
once in this dataset.

---

## Status

**Status:** Completed empirical data collection

**Sample:** 1,000 unique GitHub events

**Purpose:** Geographic enrichment and catalog analysis

**Production use:** None

**Next step:** Analyze the dataset and expand geographic coverage based on
observed evidence.

````

### What to do with the other two files

**For now: keep all three.**

After the agent analyzes them, I'd expect the final repository to potentially look like:

```text
data/experiments/github/2026-09-12/
├── README.md
└── location-analysis.csv
````

while the raw:

```text
github-1000-unique-events.json
github-1000-unique-user-locations.json
```

could be `.gitignore`d and kept locally.

But **don't make that cleanup decision yet**. The agent needs the raw files to do the analysis we're about to ask it to do. The CSV alone loses some of the relationships we may want to inspect.
