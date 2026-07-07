
-- 1) Extend wholesale_listings with optional fields (products + storage)
ALTER TABLE public.wholesale_listings
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS wholesale_price numeric,
  ADD COLUMN IF NOT EXISTS available_quantity integer,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS delivery_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shipping_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2) Seed Egyptian wholesale/supply + storage categories (reuse business_categories)
INSERT INTO public.business_categories (slug, name_ar, name_en, icon, sort) VALUES
  ('warehouses',       'مخازن ومستودعات',        'Warehouses & Storage',   '🏬', 100),
  ('storage-services', 'خدمات التخزين',           'Storage Services',       '📦', 101),
  ('food-supplies',    'السلع التموينية',         'Food Supplies',          '🛒', 110),
  ('food-wholesale',   'المواد الغذائية بالجملة', 'Food Wholesale',         '🥫', 111),
  ('oils',             'الزيوت',                  'Oils',                   '🫒', 112),
  ('ghee',             'السمن',                   'Ghee',                   '🧈', 113),
  ('sugar',            'السكر',                   'Sugar',                  '🍬', 114),
  ('rice',             'الأرز',                   'Rice',                   '🍚', 115),
  ('flour',            'الدقيق',                  'Flour',                  '🌾', 116),
  ('grains',           'الحبوب',                  'Grains',                 '🌽', 117),
  ('legumes',          'البقوليات',               'Legumes',                '🫘', 118),
  ('pasta',            'المكرونة',                'Pasta',                  '🍝', 119),
  ('beverages',        'المشروبات',               'Beverages',              '🥤', 120),
  ('frozen',           'المجمدات',                'Frozen Foods',           '🧊', 121),
  ('detergents',       'المنظفات',                'Detergents',             '🧼', 122),
  ('paper-goods',      'الورقيات',                'Paper Goods',            '🧻', 123),
  ('animal-feed',      'الأعلاف',                 'Animal Feed',            '🌾', 124),
  ('packaging',        'التعبئة والتغليف',        'Packaging',              '📦', 125)
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  icon    = EXCLUDED.icon,
  sort    = EXCLUDED.sort;

CREATE INDEX IF NOT EXISTS wholesale_listings_kind_idx     ON public.wholesale_listings (kind);
CREATE INDEX IF NOT EXISTS wholesale_listings_category_idx ON public.wholesale_listings (category_slug);
CREATE INDEX IF NOT EXISTS wholesale_listings_gov_idx      ON public.wholesale_listings (governorate);
