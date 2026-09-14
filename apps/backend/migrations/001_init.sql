-- Week 6: activity persistence + 15-minute aggregation (SRS §10-11).
-- Coordinates never live here; events reference locationId (ADR-005).

CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_action TEXT,
  event_time TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL,
  user_id BIGINT,
  repository_id BIGINT,
  location_id TEXT,
  language_id TEXT,
  CONSTRAINT activity_events_source_event_unique UNIQUE (source, source_event_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_events_event_time
  ON activity_events (event_time);
CREATE INDEX IF NOT EXISTS idx_activity_events_event_time_location
  ON activity_events (event_time, location_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_event_time_language
  ON activity_events (event_time, language_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_event_time_type
  ON activity_events (event_time, event_type);

-- Aggregate dimensions: time × location × language × event type (SRS §14).
-- Null enrichment dims are stored under the 'unknown' sentinel so the
-- composite primary key stays NOT NULL; raw event rows keep real NULLs.
CREATE TABLE IF NOT EXISTS activity_buckets (
  bucket_start TIMESTAMPTZ NOT NULL,
  location_id TEXT NOT NULL,
  language_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_count BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_start, location_id, language_id, event_type)
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
