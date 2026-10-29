-- Lets refreshCleaningStandards() mark a snapshotted checklist item as
-- "No longer required" (its standard was removed, disabled, or the
-- client's assigned list changed since the job was created) without
-- deleting the row -- existing photos and review_status on that item
-- stay intact, matching the snapshot-not-deleted pattern already used
-- elsewhere for cleaning_standards.
alter table public.cleaning_standards add column is_obsolete boolean not null default false;
