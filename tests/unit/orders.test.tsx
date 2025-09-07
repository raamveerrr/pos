import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { supabase } from '@/lib/supabase'

// Mock order creation function
const createOrder = async (orderData: any) => {
  const { data, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single()

  if (error) throw error
  return data
}

// Mock order items function
const addOrderItems = async (orderItems: any[]) => {
  const { data, error } = await supabase
    .from('order_items')
    .insert(orderItems)
    .select()

  if (error) throw error
  return data
}

// Mock component for testing order functionality
const TestOrderComponent = () => {
  const handleCreateOrder = async () => {
    try {
      const order = await createOrder({
        restaurant_id: 'test-restaurant',
        order_number: 'ORD001',
        status: 'pending',
        total_amount: 100.00,
        subtotal: 85.00,
        tax_amount: 15.00,
        service_charge: 0.00,
      })

      await addOrderItems([
        {
          order_id: order.id,
          menu_item_id: 'item-1',
          quantity: 2,
          unit_price: 42.50,
          total_price: 85.00,
        }
      ])

      return order
    } catch (error) {
      console.error('Order creation failed:', error)
      throw error
    }
  }

  return (
    <div>
      <button onClick={handleCreateOrder}>Create Order</button>
    </div>
  )
}

describe('Order Management', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful responses
    const mockFrom = jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'order-123',
              order_number: 'ORD001',
              status: 'pending',
              total_amount: 100.00,
            },
            error: null
          })
        })
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })
    })

    supabase.from = mockFrom
  })

  test('should create order successfully', async () => {
    const order = await createOrder({
      restaurant_id: 'test-restaurant',
      order_number: 'ORD001',
      status: 'pending',
      total_amount: 100.00,
    })

    expect(supabase.from).toHaveBeenCalledWith('orders')
    expect(order).toEqual({
      id: 'order-123',
      order_number: 'ORD001',
      status: 'pending',
      total_amount: 100.00,
    })
  })

  test('should calculate order totals correctly', () => {
    const items = [
      { price: 25.00, quantity: 2 },
      { price: 35.00, quantity: 1 },
    ]

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const taxRate = 0.18
    const taxAmount = subtotal * taxRate
    const total = subtotal + taxAmount

    expect(subtotal).toBe(85.00)
    expect(taxAmount).toBeCloseTo(15.30, 2)
    expect(total).toBeCloseTo(100.30, 2)
  })

  test('should validate order data before submission', () => {
    const validOrder = {
      restaurant_id: 'test-restaurant',
      order_number: 'ORD001',
      total_amount: 100.00,
      items: [{ menu_item_id: 'item-1', quantity: 1 }]
    }

    const invalidOrder = {
      restaurant_id: '',
      order_number: '',
      total_amount: -10,
      items: []
    }

    const validateOrder = (order: any) => {
      return (
        order.restaurant_id &&
        order.order_number &&
        order.total_amount > 0 &&
        order.items.length > 0
      )
    }

    expect(validateOrder(validOrder)).toBe(true)
    expect(validateOrder(invalidOrder)).toBe(false)
  })

  test('should handle order creation errors', async () => {
    // Mock error response
    supabase.from = jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      })
    })

    await expect(createOrder({
      restaurant_id: 'test-restaurant',
      order_number: 'ORD001',
      total_amount: 100.00,
    })).rejects.toThrow('Database error')
  })
})