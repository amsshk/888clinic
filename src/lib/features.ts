/**
 * Site switches. Change a value to true and redeploy to show it again; nothing is deleted when off.
 *
 * SHOW_RESULTS     — patient before/after photos (home page strip, /results page, menu and footer links).
 *                    Off: the photos stay in the repo and in storage, /results redirects to /pricing.
 * SHOW_PROMOTIONS  — the Promotions cards at the top of /pricing. Off: the cards and images stay in the repo;
 *                    the Meta catalog (and its pricing-page ViewContent) is not affected.
 */
export const SHOW_RESULTS: boolean = false;
export const SHOW_PROMOTIONS: boolean = false;
