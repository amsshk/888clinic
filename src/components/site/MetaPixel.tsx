import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

const META_PIXEL_ID = "1437834427873532";
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
