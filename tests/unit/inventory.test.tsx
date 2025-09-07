import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock inventory management functions
const updateInventory = async (itemId: string, newStock: number) => {
  if (newStock < 0) {
    throw new Error('Stock cannot be negative')
  }
  
  return {
    id: itemId,
    current_stock: newStock,
    updated_at: new Date().toISOString()
  }
}

const checkLowStock = (items: any[]) => {
  return items.filter(item => item.current_stock <= item.minimum_stock)
}

const calculateInventoryValue = (items: any[]) => {
  return items.reduce((total, item) => {
    return total + (item.current_stock * item.unit_cost)
  }, 0)
}

describe('Inventory Management', () => {
  const mockInventoryItems = [
    {
      id: 'item-1',
      item_name: 'Tomatoes',
      current_stock: 5,
      minimum_stock: 10,
      maximum_stock: 50,
      unit_cost: 25.00,
      unit: 'kg'
    },
    {
      id: 'item-2',
      item_name: 'Onions',
      current_stock: 15,
      minimum_stock: 5,
      maximum_stock: 30,
      unit_cost: 20.00,
      unit: 'kg'
    },
    {
      id: 'item-3',
      item_name: 'Rice',
      current_stock: 0,
      minimum_stock: 2,
      maximum_stock: 10,
      unit_cost: 40.00,
      unit: 'kg'
    }
  ]

  test('should update inventory stock successfully', async () => {
    const result = await updateInventory('item-1', 20)
    
    expect(result.id).toBe('item-1')
    expect(result.current_stock).toBe(20)
    expect(result.updated_at).toBeDefined()
  })

  test('should reject negative stock values', async () => {
    await expect(updateInventory('item-1', -5))
      .rejects.toThrow('Stock cannot be negative')
  })

  test('should identify low stock items correctly', () => {
    const lowStockItems = checkLowStock(mockInventoryItems)
    
    expect(lowStockItems).toHaveLength(2)
    expect(lowStockItems.map(item => item.item_name))
      .toEqual(expect.arrayContaining(['Tomatoes', 'Rice']))
  })

  test('should calculate total inventory value correctly', () => {
    const totalValue = calculateInventoryValue(mockInventoryItems)
    
    // (5 * 25) + (15 * 20) + (0 * 40) = 125 + 300 + 0 = 425
    expect(totalValue).toBe(425)
  })

  test('should categorize items by stock status', () => {
    const categorizeByStock = (items: any[]) => {
      return {
        outOfStock: items.filter(item => item.current_stock === 0),
        lowStock: items.filter(item => 
          item.current_stock > 0 && item.current_stock <= item.minimum_stock
        ),
        inStock: items.filter(item => item.current_stock > item.minimum_stock)
      }
    }

    const categories = categorizeByStock(mockInventoryItems)

    expect(categories.outOfStock).toHaveLength(1)
    expect(categories.outOfStock[0].item_name).toBe('Rice')
    
    expect(categories.lowStock).toHaveLength(1)
    expect(categories.lowStock[0].item_name).toBe('Tomatoes')
    
    expect(categories.inStock).toHaveLength(1)
    expect(categories.inStock[0].item_name).toBe('Onions')
  })

  test('should validate restock quantity', () => {
    const validateRestock = (currentStock: number, restockAmount: number, maxStock: number) => {
      const newStock = currentStock + restockAmount
      return {
        isValid: restockAmount > 0 && newStock <= maxStock,
        newStock,
        exceedsMax: newStock > maxStock
      }
    }

    const result1 = validateRestock(5, 10, 50)
    expect(result1.isValid).toBe(true)
    expect(result1.newStock).toBe(15)

    const result2 = validateRestock(5, -5, 50)
    expect(result2.isValid).toBe(false)

    const result3 = validateRestock(45, 10, 50)
    expect(result3.isValid).toBe(false)
    expect(result3.exceedsMax).toBe(true)
  })

  test('should track inventory movements', () => {
    const movements: any[] = []
    
    const recordMovement = (itemId: string, type: 'in' | 'out' | 'adjust', quantity: number, reason?: string) => {
      const movement = {
        id: `mov-${Date.now()}`,
        item_id: itemId,
        type,
        quantity,
        reason,
        timestamp: new Date().toISOString()
      }
      movements.push(movement)
      return movement
    }

    recordMovement('item-1', 'in', 20, 'Purchase')
    recordMovement('item-1', 'out', 5, 'Order consumption')
    recordMovement('item-2', 'adjust', -2, 'Waste/spoilage')

    expect(movements).toHaveLength(3)
    expect(movements[0].type).toBe('in')
    expect(movements[1].type).toBe('out')
    expect(movements[2].type).toBe('adjust')
  })
})