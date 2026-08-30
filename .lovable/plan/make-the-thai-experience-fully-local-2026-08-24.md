# Make the Thai experience fully local

## Goal
When a visitor switches to Thai, the entire patient journey should read like a real modern Bangkok dermatology clinic—not a partial or literal translation—and should not fall back to English except for brand names, standard product/medical terms, email addresses, or model identifiers where appropriate.

## What will change

1. **Polish the core Thai voice**
   - Review the existing Thai dictionary for natural phrasing, consistent polite particles, spelling, and terminology.
   - Standardize clinic terms such as โบท็อกซ์, ฟิลเลอร์, สแกนผิว, จองคิว, เครดิต, and treatment names.
   - Keep medical warnings accurate and clear while making ordinary UI copy conversational rather than textbook-like.

2. **Remove English leaks from patient-facing screens**
   - Move hardcoded checkout and payment-return wording into the bilingual copy system.
   - Localize account feedback, accessibility labels, loading/error/success states, quantities, refill wording, fulfillment choices, and dates.
   - Keep the admin console in English; this pass targets the public site and signed-in patient experience.

3. **Localize catalog and results content**
   - Add Thai patient-facing names/descriptions for skincare products while preserving ingredient and product identifiers where clinically or commercially useful.
   - Add Thai categories, treatment areas, captions, descriptions, and alt text for the before/after gallery and moving result strips.
   - Ensure filters and dynamically loaded catalog items display the correct language rather than only translating the surrounding page.

4. **Make MALI answers follow the selected language**
   - Pass the current language into the skin-scan request and instruct the report-writing model to return all patient-facing fields in natural Thai when Thai is selected.
   - Localize deterministic MALI labels such as condition names, severity, urgency, fallback text, and server-returned errors.
   - Preserve clinical meaning and uncertainty; do not introduce promises or fixed accuracy claims.
   - Keep the existing before/after Thai response instruction, but tighten terminology and localize any remaining error paths.

5. **Generate the downloadable report in the chosen language**
   - Pass the active language into report generation.
   - Add a Thai PDF layout using the bundled Thai font, including headings, labels, findings, recommendations, clinic details, and medical disclaimer.
   - Retain an English report when English is selected and ensure Thai characters render correctly rather than as missing glyphs.

6. **Verify the full Thai journey**
   - Test switching EN → TH and refreshing to confirm the preference persists and the document language updates.
   - Check desktop and mobile views for homepage, treatments, products/checkout, results, booking, sign-in, MALI scan, before/after, orders, and payment return.
   - Run a focused scan/report test to confirm generated findings and the downloaded PDF are Thai.

## Technical details
- Extend the existing typed `BASE_COPY` dictionary instead of adding a second translation mechanism.
- Introduce locale-aware presentation helpers for catalog/results/status values while keeping stored IDs and payment payload values stable in English.
- Add `lang` to the skin-analysis input and keep every `createServerFn` file as a thin declaration-only wrapper by placing language/prompt logic in imported server helpers.
- Use `th-TH` for patient-visible dates and number formatting when Thai is active.
