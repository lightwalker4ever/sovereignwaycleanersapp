-- ============================================================
-- Seeds a real, immediately-usable "Commercial Cleaning" bucket for
-- the standards overhaul, instead of leaving admins to hand-type every
-- area and standard through the new Standards page. Content is
-- synthesized from common task sets across several commercial-cleaning
-- checklist guides (no single public authoritative standard exists);
-- editable afterward like any other bucket.
-- ============================================================
do $$
declare
  v_bucket_id uuid;
  v_area_id   uuid;
begin
  insert into public.standard_buckets (name, description)
  values (
    'Commercial Cleaning',
    'Default checklist templates for commercial/office clients -- apply any area below more than once per client (e.g. 2x Office, 3x Toilet) from the client''s own page.'
  )
  returning id into v_bucket_id;

  -- Office / Workstation Area
  insert into public.area_templates (bucket_id, name, sort_order)
  values (v_bucket_id, 'Office / Workstation Area', 0)
  returning id into v_area_id;
  insert into public.area_template_standards (area_template_id, title, photo_required, sort_order) values
    (v_area_id, 'Empty bins and replace liners', true, 0),
    (v_area_id, 'Dust and wipe desks and shared surfaces', true, 1),
    (v_area_id, 'Wipe down phones, keyboards and other high-touch equipment', true, 2),
    (v_area_id, 'Vacuum carpet or mop hard floor', true, 3),
    (v_area_id, 'Clean glass partitions and doors (remove fingerprints)', true, 4),
    (v_area_id, 'Spot-clean marks from walls and light switches', true, 5);

  -- Washroom / Toilet
  insert into public.area_templates (bucket_id, name, sort_order)
  values (v_bucket_id, 'Washroom / Toilet', 1)
  returning id into v_area_id;
  insert into public.area_template_standards (area_template_id, title, photo_required, sort_order) values
    (v_area_id, 'Clean and disinfect toilets and urinals (bowl, seat, base, handle)', true, 0),
    (v_area_id, 'Clean and disinfect sinks, taps and countertops', true, 1),
    (v_area_id, 'Clean mirrors, free of smears', true, 2),
    (v_area_id, 'Restock toilet paper, soap and paper towels', true, 3),
    (v_area_id, 'Empty and sanitize bins', true, 4),
    (v_area_id, 'Wipe high-touch points (door handles, flush handles, light switches)', true, 5),
    (v_area_id, 'Mop and disinfect floor', true, 6),
    -- Judged by a note rather than a photo -- there's nothing
    -- meaningful to photograph for "no issue found".
    (v_area_id, 'Flag any maintenance issue (leak, broken fitting)', false, 7);

  -- Kitchen / Break Room
  insert into public.area_templates (bucket_id, name, sort_order)
  values (v_bucket_id, 'Kitchen / Break Room', 2)
  returning id into v_area_id;
  insert into public.area_template_standards (area_template_id, title, photo_required, sort_order) values
    (v_area_id, 'Disinfect counters and tables', true, 0),
    (v_area_id, 'Clean and disinfect the sink', true, 1),
    (v_area_id, 'Wipe appliance exteriors and handles (fridge, microwave, kettle)', true, 2),
    (v_area_id, 'Empty bins and recycling, replace liners', true, 3),
    (v_area_id, 'Refill soap and paper-towel dispensers', true, 4),
    (v_area_id, 'Sweep and mop floor', true, 5);

  -- Reception / Lobby
  insert into public.area_templates (bucket_id, name, sort_order)
  values (v_bucket_id, 'Reception / Lobby', 3)
  returning id into v_area_id;
  insert into public.area_template_standards (area_template_id, title, photo_required, sort_order) values
    (v_area_id, 'Wipe reception desk and surfaces', true, 0),
    (v_area_id, 'Vacuum or mop floor', true, 1),
    (v_area_id, 'Clean glass doors and partitions', true, 2),
    (v_area_id, 'Empty bins', true, 3),
    (v_area_id, 'Dust furniture and display surfaces', true, 4),
    (v_area_id, 'Sanitize high-touch points (door handles, intercom)', true, 5);

  -- Meeting Room
  insert into public.area_templates (bucket_id, name, sort_order)
  values (v_bucket_id, 'Meeting Room', 4)
  returning id into v_area_id;
  insert into public.area_template_standards (area_template_id, title, photo_required, sort_order) values
    (v_area_id, 'Wipe tables and chairs', true, 0),
    (v_area_id, 'Clean whiteboards', true, 1),
    (v_area_id, 'Sanitize shared equipment (phone, AV remote/panel)', true, 2),
    (v_area_id, 'Empty bins', true, 3),
    (v_area_id, 'Vacuum or mop floor', true, 4),
    (v_area_id, 'Straighten chairs', false, 5);

  -- Corridors / Communal Areas
  insert into public.area_templates (bucket_id, name, sort_order)
  values (v_bucket_id, 'Corridors / Communal Areas', 5)
  returning id into v_area_id;
  insert into public.area_template_standards (area_template_id, title, photo_required, sort_order) values
    (v_area_id, 'Vacuum or mop floor', true, 0),
    (v_area_id, 'Empty bins', true, 1),
    (v_area_id, 'Dust handrails and ledges', true, 2),
    (v_area_id, 'Clean entrance glass and doors', true, 3),
    (v_area_id, 'Spot-clean marks from walls', true, 4);
end $$;
