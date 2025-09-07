'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sidebar } from '@/components/Sidebar'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  ShoppingCart,
  Clock,
  Package,
  Star
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

interface DashboardStats {
  todayRevenue: number
  weeklyRevenue: number
  monthlyRevenue: number
  todayOrders: number
  averageOrderValue: number
  lowStockItems: number
  activeOrders: number
  topSellingItems: any[]
  revenueChart: any[]
  ordersChart: any[]
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    todayOrders: 0,
    averageOrderValue: 0,
    lowStockItems: 0,
    activeOrders: 0,
    topSellingItems: [],
    revenueChart: [],
    ordersChart: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.restaurant_id) {
      fetchDashboardData()
    }
  }, [profile])

  const fetchDashboardData = async () => {
    if (!profile?.restaurant_id) return

    try {
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Fetch today's revenue and orders
      const { data: todayData } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('restaurant_id', profile.restaurant_id)
        .gte('created_at', todayStr)
        .eq('status', 'served')

      const todayRevenue = todayData?.reduce((sum, order) => sum + order.total_amount, 0) || 0
      const todayOrders = todayData?.length || 0

      // Fetch weekly revenue
      const { data: weeklyData } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('restaurant_id', profile.restaurant_id)
        .gte('created_at', weekAgo.toISOString())
        .eq('status', 'served')

      const weeklyRevenue = weeklyData?.reduce((sum, order) => sum + order.total_amount, 0) || 0

      // Fetch monthly revenue
      const { data: monthlyData } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('restaurant_id', profile.restaurant_id)
        .gte('created_at', monthAgo.toISOString())
        .eq('status', 'served')

      const monthlyRevenue = monthlyData?.reduce((sum, order) => sum + order.total_amount, 0) || 0

      // Fetch active orders
      const { data: activeOrdersData } = await supabase
        .from('orders')
        .select('id')
        .eq('restaurant_id', profile.restaurant_id)
        .in('status', ['pending', 'preparing', 'ready'])

      const activeOrders = activeOrdersData?.length || 0

      // Fetch low stock items
      const { data: lowStockData } = await supabase
        .from('inventory')
        .select('id')
        .eq('restaurant_id', profile.restaurant_id)
        .lt('current_stock', supabase.rpc('minimum_stock'))

      const lowStockItems = lowStockData?.length || 0

      // Generate chart data (mock data for demo)
      const revenueChart = Array.from({ length: 7 }, (_, i) => ({
        name: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en', { weekday: 'short' }),
        revenue: Math.floor(Math.random() * 5000) + 1000
      }))

      const ordersChart = Array.from({ length: 24 }, (_, i) => ({
        name: `${i}:00`,
        orders: Math.floor(Math.random() * 20) + 5
      }))

      setStats({
        todayRevenue,
        weeklyRevenue,
        monthlyRevenue,
        todayOrders,
        averageOrderValue: todayOrders > 0 ? todayRevenue / todayOrders : 0,
        lowStockItems,
        activeOrders,
        topSellingItems: [], // Would fetch from aggregated order_items
        revenueChart,
        ordersChart
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: "Today's Revenue",
      value: `₹${stats.todayRevenue.toLocaleString()}`,
      change: "+12.5%",
      changeType: "positive" as const,
      icon: DollarSign,
      color: "bg-green-500"
    },
    {
      title: "Active Orders",
      value: stats.activeOrders.toString(),
      change: "Real-time",
      changeType: "neutral" as const,
      icon: ShoppingCart,
      color: "bg-blue-500"
    },
    {
      title: "Today's Orders",
      value: stats.todayOrders.toString(),
      change: "+8.2%",
      changeType: "positive" as const,
      icon: Users,
      color: "bg-purple-500"
    },
    {
      title: "Avg Order Value",
      value: `₹${stats.averageOrderValue.toFixed(0)}`,
      change: "+5.4%",
      changeType: "positive" as const,
      icon: TrendingUp,
      color: "bg-orange-500"
    },
    {
      title: "Low Stock Items",
      value: stats.lowStockItems.toString(),
      change: "Needs attention",
      changeType: "negative" as const,
      icon: AlertTriangle,
      color: "bg-red-500"
    }
  ]

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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {profile?.full_name || 'User'}!
            </h1>
            <p className="text-gray-600">
              Here's what's happening at your restaurant today.
            </p>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8"
          >
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="transform transition-all duration-200"
              >
                <Card className="bg-white shadow-sm border-0 hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">
                          {stat.title}
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {stat.value}
                        </p>
                        <p className={`text-xs mt-1 ${
                          stat.changeType === 'positive' 
                            ? 'text-green-600' 
                            : stat.changeType === 'negative'
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}>
                          {stat.change}
                        </p>
                      </div>
                      <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Revenue Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="bg-white shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Weekly Revenue Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.revenueChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#6b7280"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        fontSize={12}
                        tickFormatter={(value) => `₹${value}`}
                      />
                      <Tooltip 
                        formatter={(value) => [`₹${value}`, 'Revenue']}
                        labelStyle={{ color: '#374151' }}
                      />
                      <Bar 
                        dataKey="revenue" 
                        fill="url(#colorRevenue)"
                        radius={[4, 4, 0, 0]}
                      />
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={1}/>
                          <stop offset="95%" stopColor="#1d4ed8" stopOpacity={1}/>
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Orders Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="bg-white shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Orders by Hour (Today)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats.ordersChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#6b7280"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        fontSize={12}
                      />
                      <Tooltip 
                        formatter={(value) => [`${value}`, 'Orders']}
                        labelStyle={{ color: '#374151' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="orders" 
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-8"
          >
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Create Order', icon: ShoppingCart, href: '/pos' },
                    { label: 'View Menu', icon: Clock, href: '/menu' },
                    { label: 'Check Inventory', icon: Package, href: '/inventory' },
                    { label: 'View Reports', icon: Star, href: '/reports' }
                  ].map((action, index) => (
                    <motion.a
                      key={action.label}
                      href={action.href}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center space-x-3 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                    >
                      <action.icon className="w-6 h-6 text-blue-600" />
                      <span className="font-medium text-gray-900">{action.label}</span>
                    </motion.a>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}