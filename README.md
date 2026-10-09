# Gather — Shared Meal Planner

A phone-first React/Vite app for a shared household meal calendar, recipe library, serving scaling, drag-and-drop weekly planning, pantry inventory, weekly grocery calculations, leftovers, and ingredient-overlap suggestions.

## Included

- **Week view:** drag a meal card onto another day on desktop; on mobile, open a meal and change its date. Moving a meal updates the selected week's grocery calculation.
- **Month view:** color-coded calendar (purple = both, red = husband only, blue = you only).
- **Recipes:** manual recipe entry, saved source URL, ingredients, servings and instructions. URL import saves the link and opens an ingredient-review form; generic recipe extraction needs a server endpoint and is deliberately not faked in the client.
- **Grocery list:** aggregates normalized ingredient names for cooking events in the selected week, scales quantities by serving count, subtracts compatible pantry inventory, groups by aisle/category, and supports check-off.
- **Pantry:** add/edit stock quantities, which are deducted from grocery needs.
- **Leftovers:** mark a meal as leftovers or use “Suggest leftovers” to add a follow-up lunch. Leftover-status meals do not create a second set of grocery requirements.
- **Smart planning:** suggests saved recipes that overlap with ingredients on the current grocery list.
- **Local demo mode:** app data is saved in browser localStorage, no credentials required.
- **Supabase integration scaffold:** email/password auth, household database schema, basic meal/recipe/pantry/check persistence, and realtime subscriptions for meal/recipe changes.

## Run locally

Requires Node.js 20+ (18.18+ may work with compatible Vite versions).

```bash
npm install
cp .env.example .env
npm run dev
```

Open the local URL Vite prints. Without Supabase credentials, the app uses local demo data in that browser. This mode is useful for testing UI, but does not sync across devices or accounts.

## Enable cloud storage and accounts

1. Create a Supabase project.
2. Open the Supabase SQL editor and run `supabase/schema.sql`.
3. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the project's API settings.
4. Restart the Vite dev server.
5. Create an account in the app and create a household.
6. To connect a second person, add their authenticated user ID to `public.household_members` for the same household (or implement a proper invite flow before public launch).

Only use the public anon/publishable key in the browser. Never put a Supabase service-role key in `.env` for this frontend.

## Build

```bash
npm run build
npm run preview
```

Deploy the generated `dist/` folder to a static host that supports SPAs (for example, Vercel or Netlify). Configure the same environment variables in the host's project settings.

## Important production gaps to close before relying on this for household data

This is a functional starter app, not a finished, security-audited production service. In particular:

- **Household invitations:** currently the second user must be added to `household_members` by a trusted process. Build a verified invite flow before wider use.
- **Cloud sync:** the starter persists meal/recipe edits and initial pantry saves, and subscribes to realtime meal/recipe changes. Complete upsert/delete/reconciliation for every table, handle concurrent edits, and show explicit sync states before production use.
- **Recipe import:** arbitrary websites often block browser fetches. Implement a server-side endpoint that retrieves schema.org `Recipe` JSON-LD, validates the target URL to prevent SSRF, rate-limits requests, and returns ingredients for user review. The UI gracefully falls back to manual entry if `/api/recipe` is not implemented.
- **Ingredient normalization:** current matching is intentionally simple. Add a curated ingredient dictionary, aliases, density/conversion data, package sizes, and tests. Do not assume that a bag, can, or bunch can be converted to a mass or volume without ingredient-specific data.
- **Leftover accounting:** this starter provides leftover suggestions and excludes meals explicitly marked as leftovers from new ingredient demand. For robust automatic leftover accounting, add a leftover-batch ledger with portions produced, reserved, consumed, and expired; make updates transactional.
- **Pantry inventory:** pantry deductions require compatible units for correct results. Unconvertible units should be reviewed instead of guessed. Use expiration dates and package units for advanced waste minimization.
- **Data migration:** local demo data is not automatically migrated to a newly configured Supabase project.
- **Testing:** add unit tests for ingredient aggregation, conversions, pantry deductions, date boundaries, leftovers, and rescheduling before production use.

## Core business rules

1. A meal with `status = planned` and a linked recipe contributes ingredient demand for its servings.
2. A meal with `status = leftover` represents already-cooked food and contributes no new recipe demand.
3. A meal with `status = skipped` contributes no demand.
4. Meal rescheduling changes which selected week includes its ingredients.
5. Pantry deductions apply to aggregate weekly ingredient demand, with matching names and compatible units.
6. Shopping package-size optimization should be an additional calculation layer, not a mutation of recipe requirements.

## Suggested next engineering milestone

Finish cloud persistence and household invitations, then move ingredient calculation and leftover-batch updates into tested domain functions. After that, add server-side recipe extraction and package-size-aware recommendations.
