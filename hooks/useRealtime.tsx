'use client'

import { useEffect, useState } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Order, Table } from '@/types/database'
import { toast } from 'sonner'

export function useRealtimeOrders(restaurantId: string | null) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!restaurantId) return

    let channel: RealtimeChannel

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching orders:', error)
        toast.error('Failed to load orders')
      } else {
        setOrders(data || [])
      }
      setLoading(false)
    }

    const setupRealtimeSubscription = () => {
      channel = supabase
        .channel(`orders:${restaurantId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `restaurant_id=eq.${restaurantId}`
          },
          (payload) => {
            console.log('Order realtime update:', payload)
            
            if (payload.eventType === 'INSERT') {
              setOrders(prev => [payload.new as Order, ...prev])
              toast.success(`New order #${(payload.new as Order).order_number} received!`)
            } else if (payload.eventType === 'UPDATE') {
              setOrders(prev => prev.map(order => 
                order.id === payload.new.id ? payload.new as Order : order
              ))
              
              const updatedOrder = payload.new as Order
              if (updatedOrder.status === 'ready') {
                toast.success(`Order #${updatedOrder.order_number} is ready!`)
              }
            } else if (payload.eventType === 'DELETE') {
              setOrders(prev => prev.filter(order => order.id !== payload.old.id))
            }
          }
        )
        .subscribe()
    }

    fetchOrders()
    setupRealtimeSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [restaurantId])

  return { orders, loading, setOrders }
}

export function useRealtimeTables(restaurantId: string | null) {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!restaurantId) return

    let channel: RealtimeChannel

    const fetchTables = async () => {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('table_number')

      if (error) {
        console.error('Error fetching tables:', error)
        toast.error('Failed to load tables')
      } else {
        setTables(data || [])
      }
      setLoading(false)
    }

    const setupRealtimeSubscription = () => {
      channel = supabase
        .channel(`tables:${restaurantId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tables',
            filter: `restaurant_id=eq.${restaurantId}`
          },
          (payload) => {
            console.log('Table realtime update:', payload)
            
            if (payload.eventType === 'INSERT') {
              setTables(prev => [...prev, payload.new as Table])
            } else if (payload.eventType === 'UPDATE') {
              setTables(prev => prev.map(table => 
                table.id === payload.new.id ? payload.new as Table : table
              ))
            } else if (payload.eventType === 'DELETE') {
              setTables(prev => prev.filter(table => table.id !== payload.old.id))
            }
          }
        )
        .subscribe()
    }

    fetchTables()
    setupRealtimeSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [restaurantId])

  return { tables, loading, setTables }
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingOrders, setPendingOrders] = useState<any[]>([])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncPendingOrders()
      toast.success('Back online! Syncing data...')
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast.warning('You are offline. Data will sync when connection is restored.')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load pending orders from localStorage
    const stored = localStorage.getItem('pendingOrders')
    if (stored) {
      setPendingOrders(JSON.parse(stored))
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const syncPendingOrders = async () => {
    const pending = JSON.parse(localStorage.getItem('pendingOrders') || '[]')
    
    for (const order of pending) {
      try {
        const { error } = await supabase
          .from('orders')
          .insert(order)
          
        if (error) {
          console.error('Error syncing order:', error)
        }
      } catch (error) {
        console.error('Sync error:', error)
      }
    }
    
    // Clear pending orders after sync
    localStorage.removeItem('pendingOrders')
    setPendingOrders([])
    toast.success('All offline orders synced!')
  }

  const addOfflineOrder = (order: any) => {
    const updated = [...pendingOrders, order]
    setPendingOrders(updated)
    localStorage.setItem('pendingOrders', JSON.stringify(updated))
    toast.info('Order saved offline. Will sync when online.')
  }

  return {
    isOnline,
    pendingOrders,
    addOfflineOrder,
    syncPendingOrders
  }
}