Paste this into Claude Code from the root of your app's repo, after copying the `design-handoff` folder into the repo.

---

I'm redesigning the UI of this app. The full spec is in `design-handoff/DESIGN_HANDOFF.md`, and the exact mockups are in `design-handoff/screens/*.html` (screenshots, if present, are in `design-handoff/screenshots/`).

Please:

1. Read `DESIGN_HANDOFF.md` fully, then read each mockup in `screens/`. Treat the inline styles as the exact visual spec. The `sc-for`, `sc-if` and `{{…}}` tags are mockup-only: translate them into our framework.
2. Explore this codebase: its framework, styling approach, routes per role, and data model. Then write me a short plan that covers:
   - how you'll map the tokens into our styling (CSS variables / Tailwind theme)
   - which shared components you'll create (AppShell, MobileShell, StatusPill, KpiTile, DataTable, Drawer, RowMenu, ProgressBar, FilterChips)
   - which existing pages change, and which new routes are needed
   - any data-model additions from the "Gaps" section, as migrations
   
   Wait for my OK before coding.
3. Build in this order, committing after each step so I can review:
   1. tokens + font + shared components
   2. admin shell + dashboard
   3. admin Cleanings (with the New cleaning drawer), Staff, Clients, Standards, Feedback
   4. supervisor queue + review screen
   5. cleaner Today + job checklist
   6. client Home + cleaning results
   7. login restyle
4. Keep all existing business logic, auth and permissions. Only change presentation, navigation and composition, plus the listed data additions.
5. Use real data everywhere. The names and numbers in the mockups are samples.
6. When done, go through the acceptance checklist at the end of `DESIGN_HANDOFF.md`. Check each page at 1440px and 390px wide, and tell me anything you couldn't match exactly.
