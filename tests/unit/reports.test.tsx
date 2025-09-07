import { render, screen } from '@testing-library/react'
import { subDays, startOfDay, endOfDay } from 'date-fns'

// Mock report calculation functions
const calculateRevenue = (orders: any[], startDate: Date, endDate: Date) => {
  const start = startOfDay(startDate)
  const end = endOfDay(endDate)
  
  return orders
    .filter(order => {
      const orderDate = new Date(order.created_at)
      return orderDate >= start && orderDate <= end && order.status === 'served'
    })
    .reduce((total, order) => total + order.total_amount, 0)
}

const calculateGrowthRate = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

const generateHourlyData = (orders: any[]) => {
  const hourlyMap = new Map()
  
  // Initialize all 24 hours with 0
  for (let i = 0; i < 24; i++) {
    hourlyMap.set(i, { hour: `${i}:00`, orders: 0, revenue: 0 })
  }

  orders.forEach(order => {
    if (order.status === 'served') {
      const hour = new Date(order.created_at).getHours()
      const existing = hourlyMap.get(hour)
      existing.orders += 1
      existing.revenue += order.total_amount
    }
  })

  return Array.from(hourlyMap.values())
}

const getTopSellingItems = (orderItems: any[]) => {
  const itemMap = new Map()
  
  orderItems.forEach(item => {
    const name = item.menu_item_name
    if (itemMap.has(name)) {
      const existing = itemMap.get(name)
      existing.quantity += item.quantity
      existing.revenue += item.total_price
    } else {
      itemMap.set(name, {
        name,
        quantity: item.quantity,
        revenue: item.total_price
      })
    }
  })

  return Array.from(itemMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)
}

describe('Reports and Analytics', () => {
  const mockOrders = [
    {
      id: 'order-1',
      created_at: new Date().toISOString(),
      total_amount: 150.00,
      status: 'served'
    },
    {
      id: 'order-2',
      created_at: subDays(new Date(), 1).toISOString(),
      total_amount: 200.00,
      status: 'served'
    },
    {
      id: 'order-3',
      created_at: subDays(new Date(), 2).toISOString(),
      total_amount: 175.00,
      status: 'cancelled'
    }
  ]

  const mockOrderItems = [
    {
      menu_item_name: 'Pizza Margherita',
      quantity: 3,
      total_price: 450.00
    },
    {
      menu_item_name: 'Pasta Carbonara',
      quantity: 2,
      total_price: 300.00
    },
    {
      menu_item_name: 'Pizza Margherita',
      quantity: 1,
      total_price: 150.00
    }
  ]

  test('should calculate daily revenue correctly', () => {
    const today = new Date()
    const todayRevenue = calculateRevenue(mockOrders, today, today)
    
    expect(todayRevenue).toBe(150.00) // Only served orders from today
  })

  test('should calculate revenue for date range', () => {
    const startDate = subDays(new Date(), 2)
    const endDate = new Date()
    const totalRevenue = calculateRevenue(mockOrders, startDate, endDate)
    
    expect(totalRevenue).toBe(350.00) // Only served orders (150 + 200)
  })

  test('should calculate growth rate correctly', () => {
    expect(calculateGrowthRate(150, 100)).toBe(50) // 50% growth
    expect(calculateGrowthRate(100, 150)).toBe(-33.333333333333336) // ~33% decline
    expect(calculateGrowthRate(100, 0)).toBe(100) // 100% growth from 0
    expect(calculateGrowthRate(0, 0)).toBe(0) // No change
  })

  test('should generate hourly order data', () => {
    const ordersWithHours = [
      {
        id: 'order-1',
        created_at: new Date(2024, 0, 1, 12, 30).toISOString(), // 12:30
        total_amount: 100,
        status: 'served'
      },
      {
        id: 'order-2',
        created_at: new Date(2024, 0, 1, 12, 45).toISOString(), // 12:45
        total_amount: 150,
        status: 'served'
      },
      {
        id: 'order-3',
        created_at: new Date(2024, 0, 1, 18, 15).toISOString(), // 18:15
        total_amount: 200,
        status: 'served'
      }
    ]

    const hourlyData = generateHourlyData(ordersWithHours)
    
    expect(hourlyData).toHaveLength(24)
    expect(hourlyData[12].orders).toBe(2) // 12:00 hour
    expect(hourlyData[12].revenue).toBe(250)
    expect(hourlyData[18].orders).toBe(1) // 18:00 hour
    expect(hourlyData[18].revenue).toBe(200)
    expect(hourlyData[0].orders).toBe(0) // 00:00 hour
  })

  test('should identify top selling items', () => {
    const topItems = getTopSellingItems(mockOrderItems)
    
    expect(topItems).toHaveLength(2)
    expect(topItems[0].name).toBe('Pizza Margherita')
    expect(topItems[0].quantity).toBe(4) // 3 + 1
    expect(topItems[0].revenue).toBe(600.00) // 450 + 150
    
    expect(topItems[1].name).toBe('Pasta Carbonara')
    expect(topItems[1].quantity).toBe(2)
    expect(topItems[1].revenue).toBe(300.00)
  })

  test('should calculate average order value', () => {
    const servedOrders = mockOrders.filter(order => order.status === 'served')
    const totalRevenue = servedOrders.reduce((sum, order) => sum + order.total_amount, 0)
    const averageOrderValue = servedOrders.length > 0 ? totalRevenue / servedOrders.length : 0
    
    expect(averageOrderValue).toBe(175.00) // (150 + 200) / 2
  })

  test('should calculate order completion rate', () => {
    const totalOrders = mockOrders.length
    const completedOrders = mockOrders.filter(order => order.status === 'served').length
    const completionRate = (completedOrders / totalOrders) * 100
    
    expect(completionRate).toBeCloseTo(66.67, 2) // 2/3 = 66.67%
  })

  test('should handle empty data gracefully', () => {
    expect(calculateRevenue([], new Date(), new Date())).toBe(0)
    expect(generateHourlyData([])).toHaveLength(24)
    expect(getTopSellingItems([])).toHaveLength(0)
    expect(calculateGrowthRate(0, 0)).toBe(0)
  })
})