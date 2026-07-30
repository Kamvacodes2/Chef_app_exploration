-- 0002 - Purchase-flow catalog, pricing plans and bookings.
--
-- First customer-facing domain tables. This migration keeps checkout anchored to
-- the four Chefmate pricing plans; mains carry no customer price, while side
-- overages and desserts are stored as booking items for chef/platform splits.

CREATE TABLE app.catalog_categories (
  slug       text PRIMARY KEY,
  name       text NOT NULL,
  palette_id text NOT NULL,
  mood       text NOT NULL,
  sort_order integer NOT NULL UNIQUE CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.catalog_items (
  slug          text PRIMARY KEY,
  category_slug text NOT NULL REFERENCES app.catalog_categories(slug),
  kind          text NOT NULL CHECK (kind IN ('main', 'side', 'dessert')),
  name          text NOT NULL,
  description   text NOT NULL,
  price_display text NOT NULL,
  image_src     text NOT NULL,
  image_alt     text NOT NULL,
  image_width   integer NOT NULL DEFAULT 1200 CHECK (image_width > 0),
  image_height  integer NOT NULL DEFAULT 900 CHECK (image_height > 0),
  is_hot        boolean NOT NULL DEFAULT false,
  has_cutlery   boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL UNIQUE CHECK (sort_order >= 0),
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX catalog_items_category_idx ON app.catalog_items(category_slug, sort_order);
CREATE INDEX catalog_items_kind_idx ON app.catalog_items(kind, sort_order);

CREATE TABLE app.pricing_plans (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  sessions    text NOT NULL,
  recurring   boolean NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  sort_order  integer NOT NULL UNIQUE CHECK (sort_order >= 0),
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.plan_aliases (
  alias text PRIMARY KEY,
  plan_id text NOT NULL REFERENCES app.pricing_plans(id)
);

CREATE SEQUENCE app.booking_reference_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE app.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN (
    'REQUESTED', 'NEEDS_REVIEW', 'CONFIRMED', 'AWAITING_CHEF',
    'CHEF_MATCHED', 'EN_ROUTE', 'CANCELLED', 'COMPLETED'
  )),
  source text NOT NULL,
  goal_id text,
  main_slug text NOT NULL,
  side_slugs text[] NOT NULL DEFAULT '{}',
  dessert_slug text,
  custom_request text,
  scheduled_date date,
  time_slot text,
  address jsonb NOT NULL,
  contact jsonb,
  gift_code text,
  plan_id text REFERENCES app.pricing_plans(id),
  plan_selection jsonb,
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  discount_cents integer NOT NULL CHECK (discount_cents >= 0),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  chef_payable_cents integer NOT NULL CHECK (chef_payable_cents >= 0),
  platform_revenue_cents integer NOT NULL CHECK (platform_revenue_cents >= 0),
  idempotency_key text NOT NULL UNIQUE,
  request_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bookings_created_at_idx ON app.bookings(created_at DESC);
CREATE INDEX bookings_status_idx ON app.bookings(status, created_at DESC);
CREATE INDEX bookings_contact_email_idx ON app.bookings((lower(contact->>'email'))) WHERE contact IS NOT NULL;

CREATE TABLE app.booking_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES app.bookings(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('main', 'side', 'dessert')),
  slug text NOT NULL,
  name text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  chef_payable_cents integer NOT NULL CHECK (chef_payable_cents >= 0),
  platform_revenue_cents integer NOT NULL CHECK (platform_revenue_cents >= 0),
  sort_order integer NOT NULL CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, sort_order)
);

CREATE INDEX booking_items_booking_idx ON app.booking_items(booking_id, sort_order);

CREATE TABLE app.booking_payments (
  booking_id uuid PRIMARY KEY REFERENCES app.bookings(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method = 'BANK_TRANSFER'),
  status text NOT NULL CHECK (status IN ('PENDING', 'SUBMITTED', 'VERIFIED', 'DECLINED')),
  bank_transfer jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  available_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX outbox_events_pending_idx ON app.outbox_events(status, available_at, created_at);

INSERT INTO app.catalog_categories (slug, name, palette_id, mood, sort_order) VALUES
  ('chefmate-signatures', 'Chefmate Signatures', 'blood-red', 'Popular this week', 0),
  ('healthy', 'Healthy', 'olive', 'Light and balanced', 1),
  ('chicken', 'Chicken', 'persimmon', 'Weeknight favourites', 2),
  ('beef-premium', 'Beef and Premium', 'espresso', 'Hearty plates', 3),
  ('pasta-bakes', 'Pasta and Bakes', 'strawberry', 'Comfort food', 4),
  ('sides', 'Sides', 'warm-linen', 'Add-ons', 5),
  ('desserts', 'Desserts', 'vanilla', 'Sweet finishes', 6);

INSERT INTO app.pricing_plans (id, name, sessions, recurring, price_cents, sort_order) VALUES
  ('tonight', 'chefmate tonight', 'Once-off', false, 52785, 0),
  ('rhythm', 'chefmate rhythm', '4 sessions', true, 199900, 1),
  ('family', 'chefmate family', '8 sessions', true, 379900, 2),
  ('premium', 'chefmate premium', '12 sessions', true, 505500, 3);

INSERT INTO app.plan_aliases (alias, plan_id) VALUES ('full-house', 'premium');

INSERT INTO app.catalog_items (slug, category_slug, kind, name, description, price_display, image_src, image_alt, is_hot, has_cutlery, sort_order) VALUES
  ('winter-oxtail-stew', 'chefmate-signatures', 'main', 'Oxtail Stew', 'Slow-braised oxtail in a rich, hearty gravy.', 'Included in plan', '/images/meals/beef-premium/oxtail-stew.webp', 'Oxtail stew', true, true, 0),
  ('sa-roast-chicken-seven-colours', 'chefmate-signatures', 'main', 'Roast Chicken Seven Colours', 'Roast chicken with seven vibrant sides.', 'Included in plan', '/images/meals/sunday-lunch/roast-chicken-seven-colours.webp', 'Roast chicken seven colours', true, true, 1),
  ('winter-lamb-chops', 'chefmate-signatures', 'main', 'Char-Grilled Lamb Chops', 'Herb-seasoned lamb chops, char-grilled.', 'Included in plan', '/images/meals/beef-premium/lamb-chops.webp', 'Lamb chops', true, true, 2),
  ('healthy-chicken-gyro-bowl', 'healthy', 'main', 'Chicken Gyro Bowl', 'Grilled chicken, fresh greens and a light tzatziki drizzle.', 'Included in plan', '/images/meals/healthy/chicken-gyro-bowl.webp', 'Chicken gyro bowl', false, true, 3),
  ('healthy-burger-bowl', 'healthy', 'main', 'Burger Bowl', 'Deconstructed burger flavours over crisp greens.', 'Included in plan', '/images/meals/healthy/burger-bowl.webp', 'Burger bowl', false, true, 4),
  ('healthy-chicken-salad-bowl', 'healthy', 'main', 'Chicken Salad Bowl', 'Lean chicken breast with a colourful vegetable medley.', 'Included in plan', '/images/meals/healthy/chicken-salad-bowl.webp', 'Chicken salad bowl', false, true, 5),
  ('chicken-peri-peri', 'chicken', 'main', 'Peri-Peri Chicken', 'Flame-grilled chicken basted in peri-peri sauce.', 'Included in plan', '/images/meals/chicken/peri-peri-chicken.webp', 'Peri-peri chicken', true, true, 6),
  ('chicken-bbq', 'chicken', 'main', 'BBQ Chicken', 'Smoky BBQ glazed chicken, grilled to perfection.', 'Included in plan', '/images/meals/chicken/bbq-chicken.webp', 'BBQ chicken', false, true, 7),
  ('chicken-roasted', 'chicken', 'main', 'Roasted Chicken', 'Slow-roasted chicken with golden crispy skin.', 'Included in plan', '/images/meals/chicken/roasted-chicken.webp', 'Roasted chicken', false, true, 8),
  ('beef-steak-chips', 'beef-premium', 'main', 'Steak and Chips', 'Tender grilled steak served with crispy golden chips.', 'Included in plan', '/images/meals/beef-premium/steak-and-chips.webp', 'Steak and chips', false, true, 9),
  ('sa-oxtail-seven-colours', 'chefmate-signatures', 'main', 'Oxtail Seven Colours', 'Rich oxtail served the traditional Sunday way.', 'Included in plan', '/images/meals/sunday-lunch/oxtail-seven-colours.webp', 'Oxtail seven colours', true, true, 10),
  ('breakfast-overnight-oats', 'healthy', 'main', 'Overnight Oats', 'Creamy oats soaked overnight with fruit and honey.', 'Included in plan', '/images/meals/breakfast/overnight-oats.webp', 'Overnight oats', false, true, 11),
  ('pasta-beef-lasagne', 'pasta-bakes', 'main', 'Beef Lasagne', 'Layers of pasta, beef ragu and melted cheese.', 'Included in plan', '/images/meals/pasta-bakes/beef-lasagne.webp', 'Beef lasagne', false, true, 12),
  ('pasta-meatball', 'pasta-bakes', 'main', 'Meatball Pasta', 'Juicy meatballs tossed in rich tomato pasta.', 'Included in plan', '/images/meals/pasta-bakes/meatball-pasta.webp', 'Meatball pasta', false, true, 13),
  ('pasta-cheesy-mince', 'pasta-bakes', 'main', 'Cheesy Mince Pasta', 'Kid-friendly cheesy mince pasta bake.', 'Included in plan', '/images/meals/pasta-bakes/cheesy-mince-pasta.webp', 'Cheesy mince pasta', false, true, 14),
  ('sa-chicken-seven-colours', 'chefmate-signatures', 'main', 'Chicken Seven Colours', 'Classic chicken Sunday lunch with seven colourful sides.', 'Included in plan', '/images/meals/sunday-lunch/chicken-seven-colours.webp', 'Chicken seven colours', true, true, 15),
  ('side-beetroot-salad', 'sides', 'side', 'Beetroot Salad', 'Earthy beetroot with a bright, tangy finish.', 'First two included', '/images/menu/sides/beetroot.jpg', 'Beetroot salad', false, true, 100),
  ('side-coleslaw', 'sides', 'side', 'Coleslaw', 'Crunchy, creamy slaw for a cool, classic side.', 'First two included', '/images/menu/sides/coleslaw.jpg', 'Coleslaw', false, true, 101),
  ('side-creamed-spinach', 'sides', 'side', 'Creamed Spinach', 'Velvety creamed spinach, warm and savoury.', 'First two included', '/images/menu/sides/creamed-spinach.jpg', 'Creamed spinach', false, true, 102),
  ('side-green-salad', 'sides', 'side', 'Green Salad', 'Fresh seasonal greens with a light dressing.', 'First two included', '/images/menu/sides/green-salad.jpg', 'Green salad', false, true, 103),
  ('side-mielies', 'sides', 'side', 'Mielies', 'Sweet, tender mielies with a buttery finish.', 'First two included', '/images/menu/sides/mielies.jpg', 'Mielies', false, true, 104),
  ('side-tuna-pasta-salad', 'sides', 'side', 'Tuna Pasta Salad', 'Tuna, pasta and crisp vegetables in a creamy dressing.', 'First two included', '/images/menu/sides/tuna-pasta-salad.jpg', 'Tuna pasta salad', false, true, 105),
  ('side-potato-salad', 'sides', 'side', 'Potato Salad', 'Classic creamy potato salad.', 'First two included', '/images/menu/sides/potato-salad.jpg', 'Potato salad', false, true, 106),
  ('side-pumpkin-rocket-salad', 'sides', 'side', 'Pumpkin and Rocket Salad', 'Roasted pumpkin with peppery rocket leaves.', 'First two included', '/images/menu/sides/pumpkin-rocket-salad.jpg', 'Pumpkin and rocket salad', false, true, 107),
  ('dessert-malva', 'desserts', 'dessert', 'Malva Pudding', 'Warm, sticky apricot sponge with cream.', 'R90', '/images/loop/meal-9.webp', 'Malva pudding', false, true, 200),
  ('dessert-milk-tart', 'desserts', 'dessert', 'Milk Tart', 'Silky cinnamon-dusted custard tart.', 'R90', '/images/loop/meal-7.webp', 'Milk tart', false, true, 201),
  ('dessert-berry-oats', 'desserts', 'dessert', 'Berry Oat Crumble', 'Baked berries under a golden oat crumble.', 'R90', '/images/loop/meal-4.webp', 'Berry oat crumble', false, true, 202);
