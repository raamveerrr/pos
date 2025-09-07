'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sidebar } from '@/components/Sidebar'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts'
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Calendar as CalendarIcon,
  Download,
  Filter,
  Clock
} from 'lucide-react'

interface ReportsData {
  revenue: {
    today: number
    yesterday: number
    thisWeek: number
    lastWeek: number
    thisMonth: number
    lastMonth: number
  }
  orders: {
    today: number
    completed: number
    cancelled: number
    pending: number
  }
  topItems: Array<{
    name: string
    quantity: number
    revenue: number
  }>
  hourlyData: Array<{
    hour: string
    orders: number
    revenue: number
  }>
  dailyData: Array<{
    date: string
    orders: number
    revenue: number
  }>
  categoryData: Array<{
    name: string
    value: number
    color: string
  }>
}

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']

export default function ReportsPage() {
  const { profile } = useAuth()
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7days')
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7))
  const [endDate, setEndDate] = useState<Date>(new Date())

  useEffect(() => {
    if (profile?.restaurant_id) {
      fetchReportsData()
    }
  }, [profile, dateRange, startDate, endDate])

  const fetchReportsData = async () => {
    if (!profile?.restaurant_id) return

    setLoading(true)

    try {
      const now = new Date()
      const today = startOfDay(now)
      const yesterday = startOfDay(subDays(now, 1))

      // Fetch revenue data
      const { data: revenueData } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('restaurant_id', profile.restaurant_id)
        .eq('status', 'served')
        .gte('created_at', subDays(now, 90).toISOString())

      // Fetch order counts
      const { data: orderData } = await supabase
        .from('orders')
        .select('status, created_at')
        .eq('restaurant_id', profile.restaurant_id)
        .gte('created_at', today.toISOString())

      // Fetch top selling items
      const { data: topItemsData } = await supabase
        .from('order_items')
        .select(`
          quantity,
          total_price,
          menu_items (name)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endOfDay(endDate).toISOString())

      // Process data
      const processedData: ReportsData = {
        revenue: {
          today: revenueData?.filter(order => 
            new Date(order.created_at) >= today
          ).reduce((sum, order) => sum + order.total_amount, 0) || 0,
          yesterday: revenueData?.filter(order => 
            new Date(order.created_at) >= yesterday && 
            new Date(order.created_at) < today
          ).reduce((sum, order) => sum + order.total_amount, 0) || 0,
          thisWeek: revenueData?.filter(order => 
            new Date(order.created_at) >= subDays(now, 7)
          ).reduce((sum, order) => sum + order.total_amount, 0) || 0,
          lastWeek: revenueData?.filter(order => 
            new Date(order.created_at) >= subDays(now, 14) &&
            new Date(order.created_at) < subDays(now, 7)
          ).reduce((sum, order) => sum + order.total_amount, 0) || 0,
          thisMonth: revenueData?.filter(order => 
            new Date(order.created_at) >= subDays(now, 30)
          ).reduce((sum, order) => sum + order.total_amount, 0) || 0,
          lastMonth: revenueData?.filter(order => 
            new Date(order.created_at) >= subDays(now, 60) &&
            new Date(order.created_at) < subDays(now, 30)
          ).reduce((sum, order) => sum + order.total_amount, 0) || 0,
        },
        orders: {
          today: orderData?.length || 0,
          completed: orderData?.filter(order => order.status === 'served').length || 0,
          cancelled: orderData?.filter(order => order.status === 'cancelled').length || 0,
          pending: orderData?.filter(order => order.status === 'pending').length || 0,
        },
        topItems: processTopItems(topItemsData),
        hourlyData: generateHourlyData(revenueData),
        dailyData: generateDailyData(revenueData, startDate, endDate),
        categoryData: [
          { name: 'Completed', value: orderData?.filter(o => o.status === 'served').length || 0, color: COLORS[0] },
          { name: 'Pending', value: orderData?.filter(o => o.status === 'pending').length || 0, color: COLORS[1] },
          { name: 'Cancelled', value: orderData?.filter(o => o.status === 'cancelled').length || 0, color: COLORS[2] }
        ]
      }

      setData(processedData)
    } catch (error) {
      console.error('Error fetching reports data:', error)
    } finally {
      setLoading(false)
    }
  }

  const processTopItems = (itemsData: any[]) => {
    if (!itemsData) return []

    const itemMap = new Map()
    
    itemsData.forEach(item => {
      if (!item.menu_items?.name) return
      
      const name = item.menu_items.name
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

  const generateHourlyData = (revenueData: any[]) => {
    const hourlyMap = new Map()
    
    for (let i = 0; i < 24; i++) {
      hourlyMap.set(i, { hour: `${i}:00`, orders: 0, revenue: 0 })
    }

    revenueData?.forEach(order => {
      const hour = new Date(order.created_at).getHours()
      const existing = hourlyMap.get(hour)
      existing.orders += 1
      existing.revenue += order.total_amount
    })

    return Array.from(hourlyMap.values())
  }

  const generateDailyData = (revenueData: any[], start: Date, end: Date) => {
    const dailyMap = new Map()
    const current = new Date(start)

    while (current <= end) {
      const dateStr = format(current, 'MMM dd')
      dailyMap.set(dateStr, { date: dateStr, orders: 0, revenue: 0 })
      current.setDate(current.getDate() + 1)
    }

    revenueData?.forEach(order => {
      const orderDate = new Date(order.created_at)
      if (orderDate >= start && orderDate <= end) {
        const dateStr = format(orderDate, 'MMM dd')
        if (dailyMap.has(dateStr)) {
          const existing = dailyMap.get(dateStr)
          existing.orders += 1
          existing.revenue += order.total_amount
        }
      }
    })

    return Array.from(dailyMap.values())
  }

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            
            <div className="flex items-center space-x-4">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" className="flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              {
                title: "Today's Revenue",
                value: `₹${data?.revenue.today.toLocaleString()}`,
                change: `${((data?.revenue.today - data?.revenue.yesterday) / (data?.revenue.yesterday || 1) * 100).toFixed(1)}%`,
                changeType: data?.revenue.today >= data?.revenue.yesterday ? 'positive' : 'negative',
                icon: DollarSign,
                color: "bg-green-500"
              },
              {
                title: "Orders Today",
                value: data?.orders.today.toString() || '0',
                change: "Live tracking",
                changeType: 'neutral',
                icon: ShoppingCart,
                color: "bg-blue-500"
              },
              {
                title: "Completed Orders",
                value: data?.orders.completed.toString() || '0',
                change: `${data?.orders.cancelled} cancelled`,
                changeType: 'neutral',
                icon: Users,
                color: "bg-purple-500"
              },
              {
                title: "Avg Order Time",
                value: "18m",
                change: "-2m from yesterday",
                changeType: 'positive',
                icon: Clock,
                color: "bg-orange-500"
              }
            ].map((metric, index) => (
              <motion.div
                key={metric.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="bg-white shadow-sm border-0 hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">
                          {metric.title}
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {metric.value}
                        </p>
                        <p className={`text-xs mt-1 ${
                          metric.changeType === 'positive' 
                            ? 'text-green-600' 
                            : metric.changeType === 'negative'
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}>
                          {metric.change}
                        </p>
                      </div>
                      <div className={`w-12 h-12 rounded-xl ${metric.color} flex items-center justify-center`}>
                        <metric.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Revenue Trend */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="bg-white shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Revenue Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={data?.dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `₹${value}`} />
                      <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                      <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="url(#colorRevenue)" strokeWidth={2} />
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Orders by Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="bg-white shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Orders by Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data?.categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {data?.categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Additional Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Hourly Orders */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Card className="bg-white shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Orders by Hour
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data?.hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="hour" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="orders" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Top Selling Items */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Card className="bg-white shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Top Selling Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data?.topItems.slice(0, 5).map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${
                            index === 0 ? 'from-yellow-400 to-orange-500' :
                            index === 1 ? 'from-gray-400 to-gray-500' :
                            index === 2 ? 'from-orange-400 to-red-500' :
                            'from-blue-400 to-purple-500'
                          } flex items-center justify-center text-white font-bold text-sm mr-3`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-600">{item.quantity} sold</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">₹{item.revenue.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}