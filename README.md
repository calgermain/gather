# Gather — Shared Meal Planner

A phone-first React/Vite app for a shared household meal calendar, recipe library, serving scaling, drag-and-drop weekly planning, pantry inventory, weekly grocery calculations, leftovers, and ingredient-overlap suggestions.

## Included

- **Week view:** drag a meal card onto another day on desktop; on mobile, open a meal and change its date. Moving a meal updates the selected week's grocery calculation.
- **Month view:** color-coded calendar (purple = both, red = husband only, blue = you only).
- **Recipes:** manual recipe entry, saved source URL, ingredients, servings and instructions. New recipe opens a URL-only form with a Manually enter recipe link. Successful import opens a review form with name, ingredient rows, servings and cooking steps. Changing servings scales the visible ingredient quantities; save persists that adjusted yield and quantities together. Manual entry opens the same review form blank. Import failures stay on the URL screen and show an inline explanation.
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
- **Recipe import:** arbitrary websites often block browser fetches. The included endpoint validates HTTPS targets and DNS addresses, pins the validated address, revalidates redirects, and bounds page size and request time. Add hosting-level rate limiting before a public launch. Sites without Recipe JSON-LD require manual entry.
- **Ingredient normalization:** Matching uses conservative aliases, fractions, and compatible mass/volume conversions; incompatible units remain separate. Extend the curated dictionary and ingredient-specific package sizes as needed. Do not assume that a bag, can, or bunch can be converted to a mass or volume without ingredient-specific data.
- **Leftover accounting:** this starter provides leftover suggestions and excludes meals explicitly marked as leftovers from new ingredient demand. For robust automatic leftover accounting, add a leftover-batch ledger with portions produced, reserved, consumed, and expired; make updates transactional.
- **Pantry inventory:** pantry deductions require compatible units for correct results. Unconvertible units should be reviewed instead of guessed. Use expiration dates and package units for advanced waste minimization.
- **Data migration:** local demo data is not automatically migrated to a newly configured Supabase project.
- **Testing:** Run `npm test` for grocery aggregation, serving scaling, unit conversions, fractions, pantry deductions, excluded meals, JSON-LD extraction, and private-address rejection. Browser and live cloud integration testing remain necessary.

## Core business rules

1. A meal with `status = planned` and a linked recipe contributes ingredient demand for its servings.
2. A meal with `status = leftover` represents already-cooked food and contributes no new recipe demand.
3. A meal with `status = skipped` contributes no demand.
4. Meal rescheduling changes which selected week includes its ingredients.
5. Pantry deductions apply to aggregate weekly ingredient demand, with matching names and compatible units.
6. Shopping package-size optimization should be an additional calculation layer, not a mutation of recipe requirements.

## Suggested next engineering milestone

Finish cloud persistence and household invitations, then move ingredient calculation and leftover-batch updates into tested domain functions. After that, add server-side recipe extraction and package-size-aware recommendations.

## Recipe API deployment

Deploy this repository to **Vercel** to serve both the Vite frontend and `api/recipe.js`. `npm run dev` also serves the endpoint locally. A static-only host (including GitHub Pages) cannot execute this endpoint. If deploying elsewhere, provide an equivalent Node endpoint and set `VITE_RECIPE_API_URL`; cross-origin hosting requires an explicit origin policy on that server. `npm run preview` previews only the built frontend.

Imports support public HTTPS pages containing Recipe JSON-LD, including nested graphs and instruction sections. Review yields (some sites give cookies or loaves instead of servings), ranges, package sizes, and unmeasured ingredients before saving. Unknown quantities are flagged for review, rather than counted as one. Pantry stock is deducted once per compatible ingredient group. Grocery checkmarks now include units, so incompatible rows can be checked independently.

Pantry quantities can be edited by clicking the quantity. Leftover suggestions subtract previously reserved portions and use one diner for individual meals or two for both. This is still a planning aid, not a full inventory-consumption ledger.

## Recipe review flow

Choose New recipe, paste a public HTTPS recipe URL, and select Import and review. Nothing is saved until Save recipe is selected on the review screen. Ingredient quantities, units and names can be edited individually; ingredients can be added or removed. Changing servings rescales measurable quantities; unspecified quantities remain for manual review. The saved serving yield and ingredient quantities stay aligned so grocery scaling does not double-scale them.

The pinned DNS callback supports both single-address and all-address lookup modes used by modern Node runtimes. `npm test` includes component tests for URL entry, mocked imports, inline failure handling, manual entry, and scaling before save, plus the domain tests. A real deployed RecipeTin Eats import still needs verification once deployment access is available.
