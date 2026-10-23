Paste this into Claude Code from the root of your app's repo, after copying the `quote-handoff` folder into the repo.

---

I'm adding a new quote and booking-request journey to this app. The spec is in `quote-handoff/QUOTE_HANDOFF.md`, and the mockups are in `quote-handoff/screens/*.html` (screenshots, if present, are in `quote-handoff/screenshots/`). The rest of the app was already redesigned from an earlier `design-handoff`, so reuse the existing design tokens and shared components.

Please:

1. Read `QUOTE_HANDOFF.md` fully, then each mockup in `screens/`. Treat the inline styles as the exact visual spec. The `sc-for`, `sc-if` and `{{…}}` tags are mockup-only. Read the `renderVals()` scripts for how the steppers, toggles and live totals behave.
2. Explore the codebase and find:
   - the current quote modals and their pricing logic per service
   - the postcode coverage check
   - how quote and booking requests are currently stored and emailed
   - the existing StatusPill and Cleaning model
   
   Then write me a short plan that covers:
   - the new `/quote` route structure and how its state is kept
   - how you'll reuse the existing pricing logic, without changing any numbers
   - data-model changes: the "Awaiting confirmation" and "Declined" statuses, saved price breakdown, requested date and window, access method, quote requests with photos. Write these as migrations.
   - the admin additions (dashboard alert, filter chip, request drawer with Confirm / Propose date / Decline / Send quote)
   - which old modal code you'll remove
   
   Wait for my OK before coding.
3. Before changing any pricing code, write unit tests that capture the current totals for each instant-price service across several configurations, so we can prove the new UI gives identical prices.
4. Build in this order, committing after each step:
   1. pricing tests + data-model migrations + new statuses in StatusPill
   2. `/quote` shell (header, stepper, sticky summary, phone sticky price bar) + step 1
   3. step 2 for End of Tenancy, Deep Cleaning and Office Cleaning
   4. step 3 date & time
   5. step 4 details & review + submission + customer confirmation email
   6. step 5 confirmation page + "Track this clean" account link + .ics download
   7. the tailored-quote path
   8. admin request handling + Client Home "Awaiting confirmation" state
   9. point every "Get a quote" button on the site at `/quote` and remove the old modals
5. Don't change existing business logic beyond what the spec asks for. Wherever the spec shows `[X hours]`, the arrival windows or blocked dates, make them config values and tell me where they live.
6. When done, go through the acceptance checklist at the end of `QUOTE_HANDOFF.md`. Test each step at 1440px and 390px wide, and tell me anything you couldn't match or any decision you had to make.
