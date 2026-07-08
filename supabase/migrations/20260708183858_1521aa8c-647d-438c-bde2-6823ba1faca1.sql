
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'customer');
CREATE TYPE public.order_status AS ENUM ('received', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled');
CREATE TYPE public.delivery_type AS ENUM ('pickup', 'delivery');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ AUTO-CREATE PROFILE + GRANT ADMIN FOR @puniqueofficial.com ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.grant_admin_for_verified_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND lower(split_part(NEW.email, '@', 2)) = 'puniqueofficial.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_grant_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_for_verified_domain();

CREATE TRIGGER on_auth_user_confirmed_grant_admin
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_admin_for_verified_domain();

-- ============ CATEGORIES ============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MENU ITEMS ============
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  is_special BOOLEAN NOT NULL DEFAULT false,
  protein_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads menu items" ON public.menu_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage menu items" ON public.menu_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER menu_items_updated BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ORDERS ============
-- Human-readable order number
CREATE SEQUENCE public.order_number_seq START 1001;

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE DEFAULT ('PK-' || nextval('public.order_number_seq')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  delivery_type delivery_type NOT NULL DEFAULT 'pickup',
  address TEXT,
  area TEXT,
  status order_status NOT NULL DEFAULT 'received',
  subtotal NUMERIC(10,2) NOT NULL,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  notes TEXT,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_reference TEXT,
  paystack_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.orders TO anon, authenticated;
GRANT INSERT, UPDATE ON public.orders TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- Anyone can read an order by order_number (needed for guest tracking). Restrictive column projection is done in server code.
CREATE POLICY "Anyone can read orders (tracking by order number)" ON public.orders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX orders_created_idx ON public.orders (created_at DESC);
CREATE INDEX orders_status_idx ON public.orders (status);
CREATE INDEX orders_user_idx ON public.orders (user_id);

-- ============ ORDER ITEMS ============
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name_snapshot TEXT NOT NULL,
  price_at_time NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  addons JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_items TO anon, authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads order items" ON public.order_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone creates order items" ON public.order_items FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ============ SETTINGS ============
CREATE TABLE public.settings (
  id INT PRIMARY KEY DEFAULT 1,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 1000,
  min_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_open BOOLEAN NOT NULL DEFAULT true,
  announcement TEXT,
  whatsapp_number TEXT NOT NULL DEFAULT '2348083163956',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
GRANT SELECT ON public.settings TO anon, authenticated;
GRANT UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads settings" ON public.settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins update settings" ON public.settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER settings_updated BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.settings (id) VALUES (1);

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- ============ SEED DATA ============
INSERT INTO public.categories (name, slug, description, display_order) VALUES
  ('Everyday Favourites', 'everyday-favourites', 'Our beloved daily specials', 1),
  ('Signature Dishes', 'signature-dishes', 'What we''re famous for', 2),
  ('Rice Dishes', 'rice-dishes', 'Rich, smokey and satisfying', 3),
  ('Soups', 'soups', 'Traditional Nigerian soups with your choice of protein', 4),
  ('Sauces', 'sauces', 'Bold curries served as sides or with rice', 5),
  ('Special Dishes', 'special-dishes', 'Chef''s specials, changing regularly', 6);

INSERT INTO public.menu_items (category_id, name, description, price, display_order) VALUES
  ((SELECT id FROM public.categories WHERE slug='everyday-favourites'), 'Creamy Beef Sandwich', 'Toasted bread stacked with our creamy spiced beef filling', 1000, 1),
  ((SELECT id FROM public.categories WHERE slug='everyday-favourites'), 'Pancakes', 'Fluffy golden pancakes served with syrup', 1000, 2),
  ((SELECT id FROM public.categories WHERE slug='signature-dishes'), 'Stir Fry Noodles and Egg', 'Wok-tossed noodles with vegetables and fried egg', 1400, 1),
  ((SELECT id FROM public.categories WHERE slug='rice-dishes'), 'Smokey Jollof Rice', 'Party-style jollof with the deep smokey flavour Bayelsa loves', 2000, 1),
  ((SELECT id FROM public.categories WHERE slug='rice-dishes'), 'Stir-Fried Rice', 'Colourful vegetable stir-fried rice', 2000, 2),
  ((SELECT id FROM public.categories WHERE slug='rice-dishes'), 'Special Asun Rice', 'Jollof rice topped with our peppered asun goat meat', 3000, 3);

-- Soups with protein add-ons
INSERT INTO public.menu_items (category_id, name, description, price, protein_options, display_order) VALUES
  ((SELECT id FROM public.categories WHERE slug='soups'), 'Egusi Soup', 'Melon-seed soup, thick and hearty. Served with a swallow of your choice.', 2500,
    '[{"name":"Beef","price":500},{"name":"Goat Meat","price":1000},{"name":"Fish","price":800},{"name":"Assorted","price":1200}]'::jsonb, 1),
  ((SELECT id FROM public.categories WHERE slug='soups'), 'Okra Soup', 'Fresh okra draw soup with palm oil and spices.', 2500,
    '[{"name":"Beef","price":500},{"name":"Goat Meat","price":1000},{"name":"Fish","price":800},{"name":"Assorted","price":1200}]'::jsonb, 2),
  ((SELECT id FROM public.categories WHERE slug='soups'), 'Afang Soup', 'Cross-River style afang with waterleaf, seafood and meat.', 3000,
    '[{"name":"Beef","price":500},{"name":"Goat Meat","price":1000},{"name":"Fish","price":800},{"name":"Assorted","price":1200}]'::jsonb, 3);

INSERT INTO public.menu_items (category_id, name, description, price, display_order) VALUES
  ((SELECT id FROM public.categories WHERE slug='sauces'), 'Beef Curry Sauce', 'Rich curry sauce with tender beef. Perfect with rice.', 2000, 1),
  ((SELECT id FROM public.categories WHERE slug='sauces'), 'Chicken Curry Sauce', 'Creamy curry sauce loaded with chicken.', 2200, 2),
  ((SELECT id FROM public.categories WHERE slug='sauces'), 'Goat Meat Curry Sauce', 'Slow-cooked goat meat in aromatic curry.', 2800, 3);
