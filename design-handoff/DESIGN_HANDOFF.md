# Sovereign Way Cleaners: UI redesign handoff

This folder is the source of truth for the app's new layout and look.
Implement it in the existing codebase, keeping the existing data model, auth and server logic.
Only the presentation layer, navigation and page composition change, plus the few small data additions listed under "Gaps".

## What's in this folder

| File | What it is |
|---|---|
| `DESIGN_HANDOFF.md` | This spec: tokens, components, screens, behaviour |
| `screens/*.html` | Exact mockup source for every screen (see "Reading the mockup files") |
| `screenshots/` | (Optional) PNG exports of each screen, if added |

### Reading the mockup files

The files in `screens/` were made in a design tool, not written as production code. Read them as a precise visual spec:

- **All styling is inline** (`style="…"`). Copy the exact values: colours, sizes, radii, spacing, font weights.
- `<x-dc>`, `<helmet>`, `<sc-for list="{{items}}" as="item">` (a loop) and `<sc-if value="{{x}}">` (a conditional) are mockup-runtime tags. Translate them into the app's own components, loops and conditionals.
- `{{something}}` values come from the `renderVals()` function in the `<script type="text/x-dc">` block at the bottom of each file. That block holds the sample data and any computed styles, such as the colour of each status pill or the active nav item.
- Sample data is illustrative: client names, numbers, addresses and standard names. Wire everything to real data.
- Do not ship these files or their runtime tags. Rebuild the screens as real components.

## Principles

1. **Each role lands on a dashboard, never a "Welcome + one button" page.** Remove the current welcome pages.
2. **Lists first, forms second.** Admin pages open on the data, and create/edit forms open from a "New …" button in a right-hand side panel (drawer) or modal.
3. **Use the same status words and colours everywhere** (see Status system).
4. **Admin and supervisor use a desktop layout with a sidebar. Cleaner and client are designed for phones first, with bottom tabs.** All pages must still work at phone width.
5. Touch targets are at least 44px tall, and primary actions on phone screens are 52–56px.

## Design tokens

Font: **Plus Jakarta Sans** (Google Fonts), weights 400/500/600/700/800. Remove other fonts.

| Token | Value | Use |
|---|---|---|
| `--green-900` | `#0F3B26` | Sidebar background, dark hero cards |
| `--green-700` | `#1B5E3B` | Primary buttons, links, active states, completed bars |
| `--green-500` | `#5E9C78` | Partial progress bars |
| `--green-100` | `#DFF1E5` | Success tint |
| `--gold` | `#E9C46A` | Logo tile, nav badges, accent on dark backgrounds |
| `--bg` | `#F5F7F5` | Page background |
| `--surface` | `#FFFFFF` | Cards, tables, panels |
| `--ink` | `#15211B` | Main text |
| `--ink-2` | `#34403A` | Secondary body text |
| `--muted` | `#55615A` | Labels, meta text |
| `--border` | `#E2E7E3` | Card and table borders |
| `--border-soft` | `#EEF1EF` | Row dividers |
| `--input-border` | `#C9D1CC` | Inputs, secondary buttons |
| `--track` | `#E8ECE9` | Progress tracks, disabled buttons |
| `--photo-placeholder` | `#DCE5DF` | Empty photo tiles |
| `--sidebar-text` | `#D7E7DD` | Sidebar text |
| `--sidebar-muted` | `#A9C7B5` | Sidebar secondary text |
| `--danger` | `#B42318` | Not met, Deactivate |

Radii: inputs and buttons 10px, cards 16px, hero cards 20px, pills 999px.
Spacing: page padding 32–40px on desktop and 16px on phone. Gaps between cards are 16–20px.
Type scale: page title 28–30px/800, section title 17–18px/700–800, body 14px, meta 12–13px, uppercase labels 12–13px/700 with 0.06em letter-spacing.

## Status system (use everywhere: admin, supervisor, cleaner, client)

| Status | Background | Text | Meaning / who acts next |
|---|---|---|---|
| Scheduled | `#EEF1EF` | `#3F4B44` | Booked by admin; cleaner hasn't started |
| In progress | `#FFF1D1` | `#7A4B00` | Cleaner is photographing standards |
| In review | `#E3EEFB` | `#1C4F8F` | Supervisor is checking |
| Changes requested | `#FCE6DA` | `#9A3A0B` | Sent back; cleaner redoes the standards marked Not met |
| Completed | `#DFF1E5` | `#155B33` | Finalised; client can see results and rate |

Pill: 12px/700, padding 4px 10px, radius 999px. Build it as one shared `<StatusPill status=…>` component.
Replace the current labels "Cleaning In Progress" and "In progress" with these labels.

## Shared components

- **AppShell (admin and supervisor):** a flex row that wraps. On the left is the sidebar (`--green-900`, 240px, `flex: 1 1 240px`). The content area uses `flex: 999 1 560px; min-width: 0` and has a max-width of 1160px, centred. At phone width the sidebar stacks above the content.
  - Sidebar contents: a logo tile ("SW" on gold, 40px, radius 10), "Sovereign Way / Cleaners", nav items (44px tall, 20px stroke icon, label, optional gold count badge), and a user card at the bottom with initials, name, role and sign out.
  - Active nav item: background `rgba(255,255,255,0.14)`, white text, weight 700.
- **MobileShell (cleaner and client):** a header, scrolling content and a bottom tab bar (icon above an 11px/700 label; the active tab is `--green-700`).
- **KpiTile:** a white card (radius 16, padding 20) with a label (13px muted), a value (30–34px/800) and a sub-line. The sub-line is green when the change is good and blue when something is waiting. The whole tile is a link to the relevant filtered list.
- **DataTable:** a white card with uppercase 12px muted headers and rows separated by `--border-soft`. It scrolls horizontally on small screens.
- **ProgressBar:** a 6–8px track; fill is `--green-700` at 100% and `--green-500` below 100%. The label below reads "X of Y standards".
- **FilterChips:** pill buttons. The selected chip has an `--ink` background and white text; the others are white with a border. Each chip shows a count.
- **Drawer:** a right-hand panel (min 380px) with a header and close button, numbered form sections, and a sticky footer with Cancel and the primary action.
- **RowMenu:** an icon button that opens a menu: Edit details, Change role, Send password reset email, Generate temporary password, a divider, then Deactivate (in red).
- **PhotoTile:** a placeholder tile with a camera icon. Use the real photo when one exists.
- **Icons:** stroke icons, 1.8–2px. Any stroke icon set works if it matches (e.g. lucide-react).

## Screens

### Routing / navigation

| Role | Lands on | Navigation |
|---|---|---|
| Admin / Manager | `/admin` Dashboard | Sidebar: Dashboard, Cleanings, Clients, Staff, Standards, Feedback |
| Supervisor | `/supervisor` Review queue | Sidebar: Review queue, Cleanings, Team |
| Cleaner | `/cleaner` Today | Bottom tabs: Today, Schedule, History, Profile |
| Client | `/client` Home | Bottom tabs: Home, Cleanings, Account |

Adapt the paths to the app's existing route structure. Badges on nav items show live counts (e.g. Cleanings = number in review plus unassigned; Feedback = unread).

### Admin
1. **Dashboard** (`screens/AdminDashboard.html`)
   - A header with the date, a greeting, global search and a "New cleaning" button.
   - 4 KPI tiles: Today's cleanings; Waiting for review (with the oldest age); First-time pass rate (percentage of cleanings with every standard met on the first review, last 30 days, with the change vs the previous period); Client rating (average and number of reviews).
   - "Today's schedule" table (time, client and address, cleaner and supervisor, checklist progress, status), next to "Needs your attention", a list of alert cards with a coloured dot. Alerts cover unassigned cleaner, waiting for review, sent back, and client with no standards list.
   - "Cleanings completed, last 7 days" bar chart, next to "Latest feedback" cards (stars, comment, date, cleaner).
2. **Cleanings** (`screens/AdminCleanings.html`)
   - A header with a List/Calendar toggle and "New cleaning".
   - Status filter chips with counts, then search, a date range filter and a cleaner filter.
   - Table: When, Client and address, Cleaner (shows "Assign cleaner" link in orange if empty), Checklist progress, Status, and a chevron to open the cleaning.
   - **The New cleaning drawer** has these sections:
     1. Client: select, the address and phone shown underneath, and a "+ Add a new client instead" link.
     2. When: date, start time and a "Repeat weekly" checkbox.
     3. Team: cleaner and supervisor, plus an availability hint.
     4. Checklist: the assigned standards list (read-only) with a "Change" link.
     5. Notes for the cleaner.
3. **Staff** (`screens/AdminStaff.html`)
   - Count tiles, role filter chips, search, and an "Add staff member" button that opens a drawer or modal with the current create form.
   - Table: avatar and name with email, role, status (Active / Invited), jobs this month, last active, and a RowMenu. Move every per-row action button into the RowMenu.
   - **Clients** uses the same pattern: list first, "Add client" opens a drawer. Its columns are Name, Email, Phone, Account (Signed up / No login), Standards list and Last cleaning.
4. **Standards** (`screens/AdminStandards.html`)
   - Master–detail layout. The lists are on the left, each with its count of standards and clients, plus a "+ New list" button.
   - The selected list is on the right: name and description, Rename and Duplicate buttons, and "Used by" chips with "+ Assign to client".
   - Below that is an ordered list of standards: drag handle, number, title, description, area tag, "Photo required" toggle and edit button. An inline "Add a standard" input sits at the bottom.
   - Note shown on the page: changes only apply to future cleanings.
5. **Feedback**: list of feedback cards (stars, comment, client, date, cleaner), filterable by rating and cleaner. No mockup; use the feedback cards from the Dashboard.

### Supervisor
6. **Review queue** (`screens/SupervisorQueue.html`)
   - The title says how many cleanings are waiting, followed by 4 KPIs.
   - "Waiting for your review" cards show client, date, cleaner, list, an age pill (orange when older than 24h), 4 photo thumbnails, "X of Y photographed" and a "Start review" button.
   - Below the cards: "In progress now" and "Recently finalised" lists.
7. **Review a cleaning** (`screens/SupervisorReview.html`). This is a focused page with no sidebar.
   - Header: back link, client, status pill, a meta line, and an "X of N checked" progress bar.
   - Left column: the checklist, one row per standard, with a badge showing the number, ✓ or ✕ and "To check / Met / Not met".
   - Main panel: the current standard (title, area, description), the cleaner's photos, an "Add your own photo" tile, the cleaner's note, a comment box ("Required if Not met") and large **Met** / **Not met** buttons that are 64px tall.
   - **Behaviour:**
     - Marking a standard moves you to the next unmarked one.
     - "Finalise cleaning" is disabled until every standard is marked and all are Met.
     - If any standard is Not met, "Send back to cleaner" becomes the red primary button.
     - A sticky footer explains the current state in plain words.

### Cleaner (phone)
8. **Today** (`screens/CleanerToday.html`)
   - A dark green hero card shows the current or next job: time window, client, address, progress, and a big "Continue checklist" or "Start job" button.
   - An orange-bordered alert card appears for redo requests and quotes the supervisor's comment.
   - Below: lists for "Tomorrow" (or later today) and "Done today", then the bottom tabs.
9. **Job checklist** (`screens/CleanerJob.html`)
   - Header: back button, client, address and time, status pill, and a progress bar.
   - An amber note from the office (the cleaning's Notes field).
   - One card per standard. Done cards show ✓ and a thumbnail. The next undone card is expanded with its description, a 56px "Take photo" button that opens the camera (`<input type="file" accept="image/*" capture="environment">`) and "Add a note".
   - A sticky "Submit for review" button stays disabled until every standard that needs a photo has one, with a hint like "2 photos to go".
   - Redo mode: when the cleaning is in Changes requested, only show the standards marked Not met, with the supervisor's comment.

### Client (phone first)
10. **Home** (`screens/ClientHome.html`)
    - A greeting and a notifications bell.
    - A live card for today's or the latest cleaning: status pill, a plain-English sentence, a 4-step tracker (Scheduled → In progress → In review → Completed, with times) and the cleaner chip.
    - A "Next cleaning" date card, a "Request another cleaning" button, and "Past cleanings" with "Rate it" or the stars already given.
11. **Cleaning results** (`screens/ClientCleaning.html`)
    - A green banner ("All 3 standards met · signed off by …").
    - A checklist results list with photo thumbnails and "View all photos".
    - "How did we do?" with 5 star buttons (52px), an optional comment, and "Send feedback", which is disabled until a rating is chosen. This replaces the bare status card on the current detail page.

### Login
Keep the current layout, restyled with the tokens: logo tile, `--bg` background, 16px card radius, primary button `--green-700`.

## Gaps the design assumes (add if missing)

- Cleaning: `scheduled_at` (date and time), optional `ends_at` or duration, optional `repeat_weekly`, and `notes` (shown to the cleaner).
- Client: `address`.
- Standard: `area` (text) and `photo_required` (boolean), plus sort order.
- Review: a per-standard comment (exists), and a timestamp per status change for the client's tracker and the "age" pills.
- Feedback: `rating` (1–5) alongside the comment.
- Supervisor photos: already supported; show them in the same grid as the cleaner's photos.

## Acceptance checklist

- [ ] No role lands on a welcome or one-button page.
- [ ] Admin sections are reachable from the sidebar in one click from anywhere.
- [ ] No create form sits above a list; they open in a drawer or modal.
- [ ] One `StatusPill` component with the 5 statuses above, used on every screen.
- [ ] Colours, radii and font match the tokens; no other fonts.
- [ ] Every page works at 390px wide without horizontal page scroll (tables scroll inside their card).
- [ ] Supervisor finalise/send-back logic matches the behaviour above.
- [ ] Cleaner can't submit until required photos exist.
- [ ] Interactive elements are real `<button>`/`<a>`/`<input>` with labels; icon-only buttons have `aria-label`.
