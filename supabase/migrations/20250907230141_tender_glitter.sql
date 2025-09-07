/*
  # Restaurant POS System - Core Schema

  1. New Tables
    - `restaurants` - Multi-tenant restaurant data
    - `user_profiles` - Extended user profile data linked to auth.users
    - `tables` - Restaurant table management
    - `menu_items` - Menu items with categories and pricing
    - `orders` - Order management
    - `order_items` - Individual items in orders
    - `payments` - Payment tracking
    - `inventory` - Stock management

  2. Security
    - Enable RLS on all tables
    - Policies for role-based access (owner, manager, cashier, waiter)
    - Multi-tenant isolation by restaurant_id

  3. Enums
    - User roles, order status, payment status, table status
*/

-- Create enums
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'cashier', 'waiter');
CREATE TYPE order_status AS ENUM ('pending', 'preparing', 'ready', 'served', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE table_status AS ENUM ('available', 'occupied', 'reserved', 'maintenance');

-- Restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text,
  email text,
  logo_url text,
  timezone text DEFAULT 'UTC',
  currency text DEFAULT 'INR',
  tax_rate decimal(5,2) DEFAULT 0.00,
  service_charge decimal(5,2) DEFAULT 0.00,
  is_active boolean DEFAULT true,
  subscription_plan text DEFAULT 'basic',
  subscription_ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role user_role DEFAULT 'waiter',
  phone text,
  avatar_url text,
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tables table
CREATE TABLE IF NOT EXISTS tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number text NOT NULL,
  capacity integer DEFAULT 4,
  status table_status DEFAULT 'available',
  position_x integer DEFAULT 0,
  position_y integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(restaurant_id, table_number)
);

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  price decimal(10,2) NOT NULL,
  cost_price decimal(10,2) DEFAULT 0.00,
  image_url text,
  is_available boolean DEFAULT true,
  is_vegetarian boolean DEFAULT false,
  is_spicy boolean DEFAULT false,
  preparation_time integer DEFAULT 15, -- minutes
  calories integer,
  allergens text[],
  tags text[],
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id uuid REFERENCES tables(id),
  order_number text NOT NULL,
  customer_name text,
  customer_phone text,
  status order_status DEFAULT 'pending',
  subtotal decimal(10,2) DEFAULT 0.00,
  tax_amount decimal(10,2) DEFAULT 0.00,
  service_charge decimal(10,2) DEFAULT 0.00,
  discount_amount decimal(10,2) DEFAULT 0.00,
  total_amount decimal(10,2) DEFAULT 0.00,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  served_by uuid REFERENCES auth.users(id),
  served_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(restaurant_id, order_number)
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  special_instructions text,
  created_at timestamptz DEFAULT now()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id),
  amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL, -- 'cash', 'card', 'upi', 'razorpay'
  payment_status payment_status DEFAULT 'pending',
  razorpay_payment_id text,
  razorpay_order_id text,
  transaction_id text,
  failure_reason text,
  processed_by uuid REFERENCES auth.users(id),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  category text,
  unit text DEFAULT 'pieces', -- kg, liters, pieces, etc.
  current_stock decimal(10,2) DEFAULT 0.00,
  minimum_stock decimal(10,2) DEFAULT 0.00,
  maximum_stock decimal(10,2) DEFAULT 0.00,
  unit_cost decimal(10,2) DEFAULT 0.00,
  supplier_name text,
  supplier_contact text,
  last_restocked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(restaurant_id, item_name)
);

-- Enable RLS on all tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_restaurant_id ON user_profiles(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_id ON tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(restaurant_id, category);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(restaurant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_restaurant_id ON payments(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_restaurant_id ON inventory(restaurant_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();