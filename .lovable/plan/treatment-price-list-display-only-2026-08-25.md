# Treatment Price List (display only)

A new public page that shows your full treatment menu with prices — no cart, no checkout, nothing purchasable. Just a clean, browsable price list in the clinic's gold/grey/white style.

## What you get

New page at `/pricing` ("Price List" / "ราคา") linked from the site header and footer, covering all 8 groups exactly as you sent them:

1. Filler group — face restoration (7 items, per cc, with duration notes)
2. Hair programs — Hair PRP per session + package
3. PL fat-dissolving injections (8 areas)
4. Thread lifting (3 options)
5. Botox (Hugel / Nabota / Allergan, 100 units)
6. Skin vitamin / brightening treatments (5 formulas)
7. Fat reduction & tightening (Mini Ulthera, RF)
8. Treatment & Meso programs (Cryo, masks, Meso range)

Each group is a section card; each item shows name, short description where you gave one, and price with its unit (บาท/ซีซี, ต่อครั้ง, ต่อยูนิต).

Details:
- Fully bilingual — Thai text exactly as you wrote it, with English equivalents for the EN toggle.
- Prices are static content in code (fast, no database, no Stripe). You tell me when they change and I update them.
- Clear note: prices are per session/unit, final plan confirmed at consultation.
- "Book a consultation" button at the bottom pointing to the booking page — the only action on the page.
- Existing skincare shop, scan packs and checkout are untouched.

## Technical notes

- `src/lib/treatment-menu.ts` — typed group/item data with `nameEn`, `nameTh`, optional `descEn`/`descTh`, `priceThb` or price label, and unit key.
- `src/routes/pricing.tsx` — new route with its own `head()` meta (title, description, og tags); renders groups from that data using existing tokens/utility classes.
- Add nav entry in `SiteHeader.tsx` + link in `SiteFooter.tsx`; add the handful of new i18n keys (page title, lede, unit labels, disclaimer) to `src/lib/i18n.tsx`.
- No database migration, no `catalog_items` changes, no payment code.

## Open question

The uploaded price-board photo is reference only — I won't embed it. If you'd rather the page live at `/treatments-pricing` or replace the price hints on the existing Treatments page, say so and I'll adjust.
