# Sovereign Way Cleaners: quote journey handoff

This adds a new **quote and booking-request journey** to an app that has already been redesigned.
The design tokens, the Plus Jakarta Sans font and the shared components (StatusPill, ProgressBar, FilterChips, Drawer, etc.) from the earlier `design-handoff` already exist in the codebase. **Reuse them; don't create parallel versions.** If something here conflicts with the existing implementation, the existing implementation wins for tokens and components, and this spec wins for the quote flow.

## What's in this folder

| File | What it is |
|---|---|
| `QUOTE_HANDOFF.md` | This spec |
| `screens/QuoteFlow.html` | Before/after overview of the journey (context only, don't build it) |
| `screens/Quote*.html` | Exact mockups for each step, desktop and phone |
| `screenshots/` | (Optional) PNG exports of each screen |

The mockups use the same format as before: inline styles are the exact visual spec. `<sc-for>`, `<sc-if>` and `{{…}}` are mockup-only tags. The sample data, price tables and interaction logic live in the `renderVals()` script at the bottom of each file. Read the logic there for steppers, toggles and live totals.

## What we're replacing

The current journey is a set of modals launched from "Get a Free Quote" on the home page: a service list, then a per-service form, then "Confirm Your Booking", then "Booking Received". Replace the whole modal flow. Keep and reuse:

- the existing **pricing logic and price data** for instant-price services (End of Tenancy, Deep Cleaning, Office Cleaning). Do not change the numbers.
- the existing **postcode coverage check**.
- the existing **request/notification plumbing** (whatever currently emails the team or the customer). Extend it; don't remove it.

Bugs to make sure do not carry over:
- Closing the "Booking Received" modal briefly re-shows the old quote form.
- Phone is labelled "Optional" but blocks submission when invalid.
- The tailored request form requires a 50-character minimum in its text box.

## Principles

1. **It's a page, not a pop-up.** Use a route such as `/quote` with the step kept in the URL (e.g. `/quote?step=property` or `/quote/property`), so the browser's Back button, refresh and shared links all work. Every "Get a quote" button on the site goes there. A button may pass the service and postcode along, e.g. `/quote?service=end-of-tenancy&postcode=N12+0ES`.
2. **Show the price before asking for contact details.** Never ask for an email in order to show a price. Contact details come last.
3. **Keep the price in view.** On desktop it sits in a sticky sidebar. On phones it's a sticky bottom bar that expands into the breakdown.
4. **Keep progress while the visitor is on the quote.** Save the quote's state to `sessionStorage` (or in the URL) so a refresh or Back doesn't lose it, and clear it after the request is submitted.
5. Touch targets are at least 44px; primary buttons are 52–54px. Use real `<button>`, `<input>` and `<label>` elements, and give icon-only buttons an `aria-label`.

## Steps

**Instant-price services:**

| # | Desktop mockup | Phone mockup | Content |
|---|---|---|---|
| 1 | `QuoteStart.html` | `QuoteMobileService.html` | Postcode + service |
| 2 | `QuoteDetails.html` (End of Tenancy) | `QuoteMobileDetails.html` (Deep Cleaning) | Property questions, live price |
| 3 | `QuoteWhen.html` | (use the desktop layout, single column) | Date + arrival window |
| 4 | `QuoteReview.html` | (desktop layout, single column, summary as a collapsible card at the top) | Contact, address, access, review |
| 5 | `QuoteConfirmed.html` | (same layout, single column) | Request received |

**Tailored-quote services** (Domestic, Commercial, Carpet, After Build, Builders & Sparkle, Move In/Out): step 1, then **About the job** (`QuoteMobileTailored.html`), then step 4 (without a price or date), then step 5 with the copy "We'll email your tailored price within 24 hours".

### Layout shell (desktop)
- A simple site header: logo, Services, Gallery, Sign in. No app sidebar.
- A stepper bar: numbered dots with labels (Service · Your property · Date & time · Your details). Completed steps show ✓ and can be clicked to go back.
- Below it, a two-column flex row that wraps: the main column (`flex: 999 1 560px`) and a summary column (`flex: 1 1 340px`, `position: sticky; top: 24px`). At phone width the summary drops below the main column, and the phone sticky bar takes over its job.

### Step 1: Postcode + service (`QuoteStart.html`, `QuoteMobileService.html`)
- Postcode input with a "Check" button, using the existing coverage check. Show the result inline:
  - ✓ green "Good news, we clean in N12" when covered.
  - When not covered, show a clear message plus a "Tell me if you start covering my area" email capture. Don't dead-end.
- Services are in two groups:
  - **"See your price now"** (badge "Instant price"): End of Tenancy, Deep Cleaning, Office Cleaning. These are large cards with an icon, a one-line description and "From £X" (compute the lowest price from the existing pricing).
  - **"Tailored quote"**, with the subtitle "we'll send your price within 24 hours": the other 6 services as compact rows.
- The selected card gets a 2px green border, and its icon box turns solid green.
- Summary sidebar: postcode, service, a one-line hint about what comes next, and Continue.

### Step 2: Your property (`QuoteDetails.html`, `QuoteMobileDetails.html`)
- Use the right input for each kind of question:
  - **Pick one of a few options** (property size, office pricing method): segmented buttons, 48px tall, never a dropdown.
  - **Counts** (bathrooms, bedrooms, WCs, kitchens, lounges, hours): a stepper (− value +, 44px buttons; − is disabled at the minimum). Show the unit price under each label ("£22 each", "First one included, then £35 each").
  - **Add-ons and appliances:** toggle tiles or chips that show their price ("+£30"). Selected ones have a green border or fill and a ✓.
- Keep each service's current questions. Map them onto these controls; don't merge the services' different question sets.
- **Live price:**
  - Desktop: a dark green summary header shows the total inc. VAT in 38px/800, with a one-line recap below. Underneath are the line items, the subtotal ex. VAT, and VAT at 20%.
  - Primary button: "Choose a date". Secondary link: **"Not ready? Email me this quote"** (an optional lead capture that sends the quote to an email; this is the only place an email is asked for before step 4).
  - Phone: a sticky dark bar shows the total and "See breakdown ▴". Tapping it opens a bottom sheet with the line items. The button is "Choose date" in gold (`#E9C46A`) on the dark green bar.
- Office Cleaning: keep the "By hours / By floor area" choice and the "Est. monthly cost" line, styled with these controls.

### Step 3: Date & time (`QuoteWhen.html`)
- A month calendar grid (Mon–Sun) with previous/next month buttons.
- Day states:
  - available: white with a border
  - fully booked or not offered: grey and struck through, disabled
  - selected: solid green
  - past dates: disabled
- Arrival windows are 3 cards: Morning 08:00–10:00, Midday 11:00–13:00, Afternoon 14:00–16:00. These windows are placeholders; make them configurable.
- A checkbox: "I'm flexible: any time that day is fine".
- Availability: if the app has no capacity data yet, show every day from tomorrow onward as available except Sundays, with a config list of blocked dates. Leave a clear TODO to plug in real capacity later.
- The summary sidebar shows the price, postcode, date and arrival window.

### Step 4: Your details (`QuoteReview.html`)
- Contact: full name, email and mobile, all required. Use `autocomplete` attributes. Validate UK numbers (07… or +44…) with the error message shown under the field.
- Property address: address line(s). The postcode is carried over from step 1 and shown as read-only, with a "Change" link.
- "How will we get in?" chips: I'll be there / Key safe or lockbox / Collect keys from agent. Plus an optional notes box. These notes are for the cleaner.
- Two checkboxes:
  - "Track this clean online", checked by default. It creates or links a Client account and emails a set-password link.
  - Marketing consent, unchecked by default.
- Summary sidebar: service, when, where, the full breakdown, total, the "Request this booking" button, and the text "No payment now. We'll confirm your date within [X hours]". The hours value is a config setting, still to be decided.

### Step 5: Request received (`QuoteConfirmed.html`)
- A check icon, "Thanks, {first name}. Your request is in.", the email address the quote was sent to, and a reference like `SWC-1042`.
- A booking card showing service, requested date and window, total, and the status pill **Awaiting confirmation**.
- "What happens next": a 4-step vertical timeline (we confirm → reminder the day before → every standard photographed → see results and rate).
- Buttons:
  - "Set a password to track it": goes to the account setup, then to the existing Client Home.
  - "Add to calendar": an `.ics` download.
  - "Back to the home page".
- Send the customer a confirmation email that contains the same summary.

### Tailored request: About the job (`QuoteMobileTailored.html`)
- Chip questions: type of home, bedrooms and frequency. Adapt the questions per service. For example, commercial asks premises type and size; carpet asks number of rooms and stairs.
- Optional photo upload (multiple images; on phones it can open the camera).
- An optional "Anything else?" text box with **no minimum length**.
- Then continue to step 4 (contact details and address, no price or date) and step 5 with the 24h copy.

## Integration with the existing app

1. **New status before Scheduled: "Awaiting confirmation".** Pill colours: background `#FFF1D1`, text `#7A4B00` (the same as In progress; or pick a distinct amber if you prefer, but keep the contrast at least 4.5:1). Add it to the shared `StatusPill`. The lifecycle becomes: Awaiting confirmation → Scheduled → In progress → In review → (Changes requested) → Completed. Also add a **Declined** state for requests the team can't do.
2. **Data:** a submitted request creates or links a Client and creates a Cleaning in "Awaiting confirmation" with these fields:
   - service
   - the answers given in step 2, as JSON
   - the price breakdown, saved as it was at the time (copy the lines and totals; don't recalculate them later)
   - requested date and arrival window, plus the "flexible" flag
   - address, access method and notes
   - marketing consent
   - source = "website quote"
   
   Tailored requests create a **Quote request** record (or a Cleaning with no price) in "Awaiting quote", plus any photos.
3. **Admin:**
   - The dashboard's "Needs your attention" list gets a "{n} new booking requests" alert.
   - The Cleanings list gets an "Awaiting confirmation" filter chip.
   - Opening a request shows a drawer with the customer's answers and breakdown and these actions:
     - **Confirm & schedule**: assign a cleaner and supervisor, set the exact time. Sets the status to Scheduled and emails the customer.
     - **Propose another date.**
     - **Decline**, with a reason, which emails the customer.
   - Tailored requests: a "Send quote" action where the admin enters a price, which emails the customer a link back to the quote at step 3.
4. **Client Home:** a cleaning that is Awaiting confirmation shows in the live card with the copy "We're confirming your date".
5. **Analytics (optional but recommended):** track step views and completions (step1_view … request_submitted, plus email_quote_clicked) so drop-off can be measured.

## Prices in the mockups

Only these prices in the mockups come from the current site: the End of Tenancy 3-bed (£305), extra bathroom (£35), carpet (£65), fridge/freezer (£30), washing machine (£20), microwave (£12); Deep Cleaning callout (£40), bedroom (£22), bathroom/toilet (£18), WC (£10), kitchen (£30), lounge (£18), fridge (£30), microwave (£10); VAT at 20%. Everything else is sample data. **Always use the app's existing pricing source.**

## Acceptance checklist

- [ ] No modal remains in the quote flow; `/quote` steps are reflected in the URL, and Back and refresh work without losing answers.
- [ ] The price for instant services is visible without entering an email.
- [ ] The total updates instantly on every change and matches the existing pricing engine exactly (add a unit test per service comparing the old and new totals for several configurations).
- [ ] A date and arrival window are required before submitting an instant-price request.
- [ ] Contact details are asked once, on step 4.
- [ ] Phone is required and validated with a clear message; the tailored form has no minimum text length.
- [ ] Submitting creates an "Awaiting confirmation" cleaning that is visible and actionable in admin, and the customer gets a confirmation email.
- [ ] Each step works at 390px wide with no horizontal scroll; the phone sticky price bar never covers form fields (pad the bottom of the content).
- [ ] Reuses the existing tokens and shared components; no new fonts or colours outside the token set.
