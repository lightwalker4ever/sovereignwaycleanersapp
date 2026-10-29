-- Tracks that a missed job has been rescheduled, so the UI can show a
-- persistent "Rescheduled" status instead of reverting to a plain
-- "Scheduled" label once a new date is agreed. Set by
-- rescheduleCleaning(); cleared implicitly once the job actually
-- starts (toDisplayCleaningStatus stops checking it once started_at
-- is set) rather than being reset by this migration or any trigger.
alter table public.cleanings add column rescheduled_at timestamptz;
