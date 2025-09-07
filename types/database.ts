export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string
          name: string
          address: string | null
          phone: string | null
          email: string | null
          logo_url: string | null
          timezone: string
          currency: string
          tax_rate: number
          service_charge: number
          is_active: boolean
          subscription_plan: string
          subscription_ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          phone?: string | null
          email?: string | null
          logo_url?: string | null
          timezone?: string
          currency?: string
          tax_rate?: number
          service_charge?: number
          is_active?: boolean
          subscription_plan?: string
          subscription_ends_at?: string | null
        }
        Update: {
          name?: string
          address?: string | null
          phone?: string | null
          email?: string | null
          logo_url?: string | null
          timezone?: string
          currency?: string
          tax_rate?: number
          service_charge?: number
          is_active?: boolean
          subscription_plan?: string
          subscription_ends_at?: string | null
        }
      }
      user_profiles: {
        Row: {
          id: string
          restaurant_id: string | null
          email: string
          full_name: string | null
          role: 'owner' | 'manager' | 'cashier' | 'waiter'
          phone: string | null
          avatar_url: string | null
          is_active: boolean
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          restaurant_id?: string | null
          email: string
          full_name?: string | null
          role?: 'owner' | 'manager' | 'cashier' | 'waiter'
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          last_login?: string | null
        }
        Update: {
          restaurant_id?: string | null
          email?: string
          full_name?: string | null
          role?: 'owner' | 'manager' | 'cashier' | 'waiter'
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          last_login?: string | null
        }
      }
      tables: {
        Row: {
          id: string
          restaurant_id: string
          table_number: string
          capacity: number
          status: 'available' | 'occupied' | 'reserved' | 'maintenance'
          position_x: number
          position_y: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          table_number: string
          capacity?: number
          status?: 'available' | 'occupied' | 'reserved' | 'maintenance'
          position_x?: number
          position_y?: number
          is_active?: boolean
        }
        Update: {
          table_number?: string
          capacity?: number
          status?: 'available' | 'occupied' | 'reserved' | 'maintenance'
          position_x?: number
          position_y?: number
          is_active?: boolean
        }
      }
      menu_items: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          description: string | null
          category: string
          price: number
          cost_price: number
          image_url: string | null
          is_available: boolean
          is_vegetarian: boolean
          is_spicy: boolean
          preparation_time: number
          calories: number | null
          allergens: string[] | null
          tags: string[] | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          description?: string | null
          category: string
          price: number
          cost_price?: number
          image_url?: string | null
          is_available?: boolean
          is_vegetarian?: boolean
          is_spicy?: boolean
          preparation_time?: number
          calories?: number | null
          allergens?: string[] | null
          tags?: string[] | null
          sort_order?: number
        }
        Update: {
          name?: string
          description?: string | null
          category?: string
          price?: number
          cost_price?: number
          image_url?: string | null
          is_available?: boolean
          is_vegetarian?: boolean
          is_spicy?: boolean
          preparation_time?: number
          calories?: number | null
          allergens?: string[] | null
          tags?: string[] | null
          sort_order?: number
        }
      }
      orders: {
        Row: {
          id: string
          restaurant_id: string
          table_id: string | null
          order_number: string
          customer_name: string | null
          customer_phone: string | null
          status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
          subtotal: number
          tax_amount: number
          service_charge: number
          discount_amount: number
          total_amount: number
          notes: string | null
          created_by: string | null
          served_by: string | null
          served_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          table_id?: string | null
          order_number: string
          customer_name?: string | null
          customer_phone?: string | null
          status?: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
          subtotal?: number
          tax_amount?: number
          service_charge?: number
          discount_amount?: number
          total_amount?: number
          notes?: string | null
          created_by?: string | null
          served_by?: string | null
          served_at?: string | null
        }
        Update: {
          table_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          status?: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
          subtotal?: number
          tax_amount?: number
          service_charge?: number
          discount_amount?: number
          total_amount?: number
          notes?: string | null
          served_by?: string | null
          served_at?: string | null
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          menu_item_id: string
          quantity: number
          unit_price: number
          total_price: number
          special_instructions: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          menu_item_id: string
          quantity?: number
          unit_price: number
          total_price: number
          special_instructions?: string | null
        }
        Update: {
          quantity?: number
          unit_price?: number
          total_price?: number
          special_instructions?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          restaurant_id: string
          order_id: string
          amount: number
          payment_method: string
          payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
          razorpay_payment_id: string | null
          razorpay_order_id: string | null
          transaction_id: string | null
          failure_reason: string | null
          processed_by: string | null
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          order_id: string
          amount: number
          payment_method: string
          payment_status?: 'pending' | 'completed' | 'failed' | 'refunded'
          razorpay_payment_id?: string | null
          razorpay_order_id?: string | null
          transaction_id?: string | null
          failure_reason?: string | null
          processed_by?: string | null
          processed_at?: string | null
        }
        Update: {
          payment_status?: 'pending' | 'completed' | 'failed' | 'refunded'
          razorpay_payment_id?: string | null
          transaction_id?: string | null
          failure_reason?: string | null
          processed_at?: string | null
        }
      }
      inventory: {
        Row: {
          id: string
          restaurant_id: string
          item_name: string
          category: string | null
          unit: string
          current_stock: number
          minimum_stock: number
          maximum_stock: number
          unit_cost: number
          supplier_name: string | null
          supplier_contact: string | null
          last_restocked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          item_name: string
          category?: string | null
          unit?: string
          current_stock?: number
          minimum_stock?: number
          maximum_stock?: number
          unit_cost?: number
          supplier_name?: string | null
          supplier_contact?: string | null
          last_restocked_at?: string | null
        }
        Update: {
          item_name?: string
          category?: string | null
          unit?: string
          current_stock?: number
          minimum_stock?: number
          maximum_stock?: number
          unit_cost?: number
          supplier_name?: string | null
          supplier_contact?: string | null
          last_restocked_at?: string | null
        }
      }
    }
  }
}

// Type helpers
export type Restaurant = Database['public']['Tables']['restaurants']['Row']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type Table = Database['public']['Tables']['tables']['Row']
export type MenuItem = Database['public']['Tables']['menu_items']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type Inventory = Database['public']['Tables']['inventory']['Row']

export type UserRole = 'owner' | 'manager' | 'cashier' | 'waiter'
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'maintenance'