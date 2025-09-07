'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sidebar } from '@/components/Sidebar'
import { useAuth } from '@/hooks/useAuth'
import { useRealtimeTables } from '@/hooks/useRealtime'
import { supabase } from '@/lib/supabase'
import { 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote,
  Users,
  Search,
  Filter,
  ShoppingCart,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { MenuItem, Table } from '@/types/database'

interface CartItem extends MenuItem {
  quantity: number
  specialInstructions?: string
}

export default function POSPage() {
  const { profile } = useAuth()
  const { tables } = useRealtimeTables(profile?.restaurant_id || null)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: ''
  })

  useEffect(() => {
    if (profile?.restaurant_id) {
      fetchMenuItems()
    }
  }, [profile])

  const fetchMenuItems = async () => {
    if (!profile?.restaurant_id) return

    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .eq('is_available', true)
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true })

      if (error) {
        toast.error('Failed to load menu items')
      } else {
        setMenuItems(data || [])
      }
    } catch (error) {
      console.error('Error fetching menu items:', error)
      toast.error('Failed to load menu items')
    }
  }

  const categories = ['All', ...new Set(menuItems.map(item => item.category))]

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const addToCart = (item: MenuItem) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id)
    
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ))
    } else {
      setCart([...cart, { ...item, quantity: 1 }])
    }
    
    toast.success(`${item.name} added to order`)
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId)
      return
    }
    
    setCart(cart.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    ))
  }

  const removeFromCart = (itemId: string) => {
    const item = cart.find(cartItem => cartItem.id === itemId)
    setCart(cart.filter(cartItem => cartItem.id !== itemId))
    if (item) {
      toast.info(`${item.name} removed from order`)
    }
  }

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const taxRate = 0.18 // 18% GST
    const serviceChargeRate = 0.10 // 10% service charge
    
    const taxAmount = subtotal * taxRate
    const serviceCharge = subtotal * serviceChargeRate
    const total = subtotal + taxAmount + serviceCharge

    return { subtotal, taxAmount, serviceCharge, total }
  }

  const generateOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-6)
    return `ORD${timestamp}`
  }

  const processPayment = async (method: 'cash' | 'razorpay') => {
    if (!profile?.restaurant_id || cart.length === 0) return
    
    setIsProcessingPayment(true)
    
    try {
      const orderNumber = generateOrderNumber()
      const { subtotal, taxAmount, serviceCharge, total } = calculateTotals()
      
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: profile.restaurant_id,
          table_id: selectedTable?.id || null,
          order_number: orderNumber,
          customer_name: customerInfo.name || null,
          customer_phone: customerInfo.phone || null,
          status: 'pending',
          subtotal,
          tax_amount: taxAmount,
          service_charge: serviceCharge,
          total_amount: total,
          created_by: profile.id
        })
        .select()
        .single()

      if (orderError) {
        throw new Error('Failed to create order')
      }

      // Add order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        special_instructions: item.specialInstructions || null
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        throw new Error('Failed to add order items')
      }

      // Update table status if table is selected
      if (selectedTable) {
        await supabase
          .from('tables')
          .update({ status: 'occupied' })
          .eq('id', selectedTable.id)
      }

      // Process payment
      const paymentResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          order_id: order.id,
          amount: total,
          method,
          customer_name: customerInfo.name,
          customer_phone: customerInfo.phone
        })
      })

      const paymentData = await paymentResponse.json()
      
      if (paymentData.success) {
        if (method === 'razorpay') {
          // Initialize Razorpay checkout
          const options = {
            key: paymentData.razorpay_key_id,
            amount: paymentData.amount * 100,
            currency: paymentData.currency,
            name: 'Restaurant Order',
            description: `Order #${orderNumber}`,
            order_id: paymentData.razorpay_order_id,
            handler: async (response: any) => {
              toast.success('Payment successful!')
              clearOrder()
            },
            prefill: {
              name: customerInfo.name,
              contact: customerInfo.phone
            },
            theme: {
              color: '#3B82F6'
            }
          }
          
          // Note: In production, you would load Razorpay SDK here
          toast.success('Payment initiated successfully!')
          clearOrder()
        } else {
          toast.success(`Order #${orderNumber} completed successfully!`)
          clearOrder()
        }
      } else {
        throw new Error(paymentData.error || 'Payment failed')
      }
      
    } catch (error) {
      console.error('Payment error:', error)
      toast.error(error.message || 'Payment processing failed')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const clearOrder = () => {
    setCart([])
    setCustomerInfo({ name: '', phone: '' })
    setSelectedTable(null)
  }

  const { subtotal, taxAmount, serviceCharge, total } = calculateTotals()

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex">
        {/* Menu Section */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white shadow-sm border-b p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
              
              {selectedTable && (
                <Badge variant="outline" className="text-sm">
                  <Users className="w-4 h-4 mr-1" />
                  Table {selectedTable.table_number}
                </Badge>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="transition-all duration-200"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Menu Grid */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence>
                {filteredItems.map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-white rounded-xl shadow-sm border hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => addToCart(item)}
                  >
                    <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-xl flex items-center justify-center overflow-hidden">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl">🍽️</span>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">
                          {item.name}
                        </h3>
                        <div className="flex gap-1 ml-2 flex-shrink-0">
                          {item.is_vegetarian && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                              Veg
                            </Badge>
                          )}
                          {item.is_spicy && (
                            <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                              🌶️
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {item.description && (
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-lg text-gray-900">
                          ₹{item.price}
                        </span>
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {item.preparation_time}m
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="w-96 bg-white border-l shadow-lg flex flex-col">
          {/* Order Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Current Order</h2>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </Badge>
            </div>

            {/* Table Selection */}
            <Select value={selectedTable?.id || ''} onValueChange={(value) => {
              const table = tables.find(t => t.id === value)
              setSelectedTable(table || null)
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select table (optional)" />
              </SelectTrigger>
              <SelectContent>
                {tables.filter(table => table.status === 'available').map(table => (
                  <SelectItem key={table.id} value={table.id}>
                    Table {table.table_number} (Cap: {table.capacity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-auto p-4">
            <AnimatePresence>
              {cart.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-64 text-gray-500"
                >
                  <ShoppingCart className="w-12 h-12 mb-2" />
                  <p>No items in order</p>
                  <p className="text-sm">Add items from the menu</p>
                </motion.div>
              ) : (
                cart.map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-gray-50 rounded-lg p-4 mb-3"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {item.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          ₹{item.price} each
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 p-0"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 p-0"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <span className="font-bold text-gray-900">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Customer Info & Checkout */}
          {cart.length > 0 && (
            <div className="p-6 border-t bg-gray-50">
              {/* Customer Info */}
              <div className="mb-4 space-y-3">
                <Input
                  placeholder="Customer name (optional)"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  placeholder="Phone number (optional)"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              {/* Order Summary */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (18%):</span>
                  <span>₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service (10%):</span>
                  <span>₹{serviceCharge.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => processPayment('cash')}
                  disabled={isProcessingPayment}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Banknote className="w-4 h-4 mr-2" />
                  Cash
                </Button>
                <Button
                  onClick={() => processPayment('razorpay')}
                  disabled={isProcessingPayment}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Card/UPI
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}