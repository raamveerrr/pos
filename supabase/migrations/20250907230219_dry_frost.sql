/*
  # Row Level Security Policies

  1. Security Rules
    - Owners: Full access to their restaurant data
    - Managers & Cashiers: Can manage menu, orders, payments for their restaurant
    - Waiters: Can view menu, create/view orders for their restaurant
    - Multi-tenant isolation by restaurant_id

  2. Policy Structure
    - All authenticated users can only see data from their assigned restaurant
    - Role-based permissions within restaurant scope
    - Special policies for user profile management
*/

-- Helper function to get user's restaurant_id
CREATE OR REPLACE FUNCTION auth.get_user_restaurant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT restaurant_id 
  FROM user_profiles 
  WHERE id = auth.uid()
$$;

-- Helper function to get user's role
CREATE OR REPLACE FUNCTION auth.get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role 
  FROM user_profiles 
  WHERE id = auth.uid()
$$;

-- Restaurants policies
CREATE POLICY "Users can read their restaurant"
  ON restaurants FOR SELECT
  TO authenticated
  USING (id = auth.get_user_restaurant_id());

CREATE POLICY "Owners can update their restaurant"
  ON restaurants FOR UPDATE
  TO authenticated
  USING (id = auth.get_user_restaurant_id() AND auth.get_user_role() = 'owner');

-- User profiles policies
CREATE POLICY "Users can read profiles from their restaurant"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (restaurant_id = auth.get_user_restaurant_id());

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Owners and managers can manage profiles"
  ON user_profiles FOR ALL
  TO authenticated
  USING (
    restaurant_id = auth.get_user_restaurant_id() 
    AND auth.get_user_role() IN ('owner', 'manager')
  );

-- Tables policies
CREATE POLICY "Users can read tables from their restaurant"
  ON tables FOR SELECT
  TO authenticated
  USING (restaurant_id = auth.get_user_restaurant_id());

CREATE POLICY "Managers and above can manage tables"
  ON tables FOR ALL
  TO authenticated
  USING (
    restaurant_id = auth.get_user_restaurant_id() 
    AND auth.get_user_role() IN ('owner', 'manager', 'cashier')
  );

-- Menu items policies
CREATE POLICY "Users can read menu items from their restaurant"
  ON menu_items FOR SELECT
  TO authenticated
  USING (restaurant_id = auth.get_user_restaurant_id());

CREATE POLICY "Managers and above can manage menu items"
  ON menu_items FOR ALL
  TO authenticated
  USING (
    restaurant_id = auth.get_user_restaurant_id() 
    AND auth.get_user_role() IN ('owner', 'manager', 'cashier')
  );

-- Orders policies
CREATE POLICY "Users can read orders from their restaurant"
  ON orders FOR SELECT
  TO authenticated
  USING (restaurant_id = auth.get_user_restaurant_id());

CREATE POLICY "All staff can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id = auth.get_user_restaurant_id()
    AND created_by = auth.uid()
  );

CREATE POLICY "Staff can update orders from their restaurant"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    restaurant_id = auth.get_user_restaurant_id()
    AND auth.get_user_role() IN ('owner', 'manager', 'cashier', 'waiter')
  );

-- Order items policies
CREATE POLICY "Users can read order items through orders"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.restaurant_id = auth.get_user_restaurant_id()
    )
  );

CREATE POLICY "Staff can manage order items"
  ON order_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.restaurant_id = auth.get_user_restaurant_id()
    )
  );

-- Payments policies
CREATE POLICY "Users can read payments from their restaurant"
  ON payments FOR SELECT
  TO authenticated
  USING (restaurant_id = auth.get_user_restaurant_id());

CREATE POLICY "Cashiers and above can manage payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    restaurant_id = auth.get_user_restaurant_id() 
    AND auth.get_user_role() IN ('owner', 'manager', 'cashier')
  );

-- Inventory policies
CREATE POLICY "Users can read inventory from their restaurant"
  ON inventory FOR SELECT
  TO authenticated
  USING (restaurant_id = auth.get_user_restaurant_id());

CREATE POLICY "Managers and above can manage inventory"
  ON inventory FOR ALL
  TO authenticated
  USING (
    restaurant_id = auth.get_user_restaurant_id() 
    AND auth.get_user_role() IN ('owner', 'manager')
  );

-- Create trigger to auto-create user profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();