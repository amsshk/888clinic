import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

// HIFU 888 PLUS dataset (ad account 2368330666798802, catalog "888 Clinic Treatments").
const META_PIXEL_ID = "4301502583400400";
const META_PIXEL_ENABLED = import.meta.env.VITE_META_PIXEL_ENABLED === "true";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

// Meta's base pixel bootstrap script, adapted to init this clinic's pixel ID.
export const META_PIXEL_INIT_SCRIPT = `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`;

export function MetaPixelNoScript() {
  if (!META_PIXEL_ENABLED) return null;
  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}

// Tracks PageView on client-side route changes, skipping the initial load
// (already tracked by the base pixel script) to avoid double-counting.
export function MetaPixelRouteTracker() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!META_PIXEL_ENABLED) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname]);

  return null;
}

/**
 * Content IDs of the "888 Clinic Treatments" catalog items (Commerce Manager -> Products).
 * Sent as ViewContent on /pricing so Meta can match catalog items to visits and show them
 * as product cards under ads. Must match the catalog's Content IDs exactly.
 */
export const CATALOG_CONTENT_IDS: string[] = [];

/** Fires one ViewContent with all catalog items when the pricing page opens. */
export function useCatalogViewContent() {
  useEffect(() => {
    if (!META_PIXEL_ENABLED || CATALOG_CONTENT_IDS.length === 0) return;
    window.fbq?.("track", "ViewContent", {
      content_ids: CATALOG_CONTENT_IDS,
      content_type: "product",
      currency: "THB",
    });
  }, []);
}
