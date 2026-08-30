CREATE TABLE public.catalog_items (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('scan_pack','skincare')),
  name text NOT NULL,
  category text,
  size text,
  note text,
  actives text[] NOT NULL DEFAULT '{}'::text[],
  price_thb integer NOT NULL DEFAULT 0 CHECK (price_thb >= 0),
  refill_thb integer CHECK (refill_thb IS NULL OR refill_thb >= 0),
  credits integer CHECK (credits IS NULL OR credits > 0),
  once_price_id text,
  refill_price_id text,
  available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.catalog_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_items TO authenticated;
GRANT ALL ON public.catalog_items TO service_role;

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available catalog items"
  ON public.catalog_items FOR SELECT TO anon, authenticated
  USING (available = true);

CREATE POLICY "Admins view all catalog items"
  ON public.catalog_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert catalog items"
  ON public.catalog_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update catalog items"
  ON public.catalog_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete catalog items"
  ON public.catalog_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER catalog_items_set_updated_at
  BEFORE UPDATE ON public.catalog_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.catalog_items (id, kind, name, category, size, note, actives, price_thb, refill_thb, credits, once_price_id, refill_price_id, sort_order) VALUES
('pack-3','scan_pack','3 AI skin scans',NULL,NULL,'Best for tracking a lesion or a treatment course.','{}',500,NULL,3,'scan_pack_3_thb',NULL,10),
('gentle_gel_cleanser','skincare','Gentle Gel Cleanser','Cleanse','150 ml','Non-stripping daily wash for reactive and acne-prone skin.','{"Glycerin","Panthenol"}',1190,1070,NULL,'gentle_gel_cleanser_once','gentle_gel_cleanser_refill',20),
('clarifying_acid_wash','skincare','Clarifying Acid Wash','Cleanse','150 ml','Salicylic cleanser for congested T-zones and body acne.','{"2% Salicylic acid"}',1390,1250,NULL,'clarifying_acid_wash_once','clarifying_acid_wash_refill',30),
('vitamin_c_15_serum','skincare','Vitamin C 15 Serum','Treat','30 ml','Brightens dullness and post-inflammatory marks.','{"15% L-ascorbic","Ferulic"}',2590,2330,NULL,'vitamin_c_15_serum_once','vitamin_c_15_serum_refill',40),
('retinal_005_night','skincare','Retinal 0.05 Night','Treat','30 ml','Encapsulated retinaldehyde for texture and fine lines.','{"Retinaldehyde","Squalane"}',2990,2690,NULL,'retinal_005_night_once','retinal_005_night_refill',50),
('azelaic_redness_cream','skincare','Azelaic Redness Cream','Treat','30 ml','Calms rosacea flushing and evens tone.','{"15% Azelaic acid"}',1990,1790,NULL,'azelaic_redness_cream_once','azelaic_redness_cream_refill',60),
('barrier_repair_moisturiser','skincare','Barrier Repair Moisturiser','Hydrate','50 ml','Ceramide-rich cream for compromised barriers.','{"Ceramides","Cholesterol"}',1690,1520,NULL,'barrier_repair_moisturiser_once','barrier_repair_moisturiser_refill',70),
('hydra_peptide_lotion','skincare','Hydra Peptide Lotion','Hydrate','50 ml','Lightweight hydration for oily and combination skin.','{"Peptides","HA"}',1890,1700,NULL,'hydra_peptide_lotion_once','hydra_peptide_lotion_refill',80),
('mineral_fluid_spf50','skincare','Mineral Fluid SPF 50','Protect','50 ml','Invisible zinc finish, safe post-procedure.','{"Zinc oxide"}',1590,1430,NULL,'mineral_fluid_spf50_once','mineral_fluid_spf50_refill',90),
('tinted_shield_spf50','skincare','Tinted Shield SPF 50','Protect','40 ml','Iron-oxide tint for melasma and pigment control.','{"Zinc","Iron oxides"}',1750,1570,NULL,'tinted_shield_spf50_once','tinted_shield_spf50_refill',100);