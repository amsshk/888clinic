import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CATALOG_COLUMNS,
  FALLBACK_PACKS,
  FALLBACK_SKINCARE,
  toCatalogItem,
  type CatalogItem,
  type CatalogKind,
  type CatalogRow,
} from "@/lib/catalog.shared";

/**
 * Live prices and availability come from the clinic-managed catalogue table;
 * the static defaults render first so SSR and first paint never go blank.
 *
 * Sold-out items are kept in `items` so the storefront can label them as
 * unavailable (and point at the closest alternative) instead of silently
 * dropping them. `available` holds only the items that can be bought today.
 */
export function useCatalog(kind: CatalogKind) {
  const fallback = kind === "scan_pack" ? FALLBACK_PACKS : FALLBACK_SKINCARE;
  const [items, setItems] = useState<CatalogItem[]>(fallback);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from("catalog_items")
      .select(CATALOG_COLUMNS)
      .eq("kind", kind)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (!active) return;
        const rows = (data as CatalogRow[] | null) ?? [];
        if (rows.length > 0) setItems(rows.map(toCatalogItem));
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [kind]);

  const available = useMemo(() => items.filter((item) => item.available), [items]);

  return { items, available, loaded };
}
