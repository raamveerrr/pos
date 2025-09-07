/*
  # Razorpay Payment Edge Function
  
  Handles secure payment processing with Razorpay API
  - Creates Razorpay orders
  - Processes payments
  - Updates payment records
  - Never exposes API keys to frontend
*/

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PaymentRequest {
  order_id: string
  amount: number
  currency?: string
  method: 'razorpay' | 'cash' | 'card'
  customer_name?: string
  customer_phone?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Get user from token
    const { data: user, error: userError } = await supabaseClient.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { order_id, amount, currency = 'INR', method, customer_name, customer_phone }: PaymentRequest = await req.json()

    // Validate request
    if (!order_id || !amount || amount <= 0) {
      throw new Error('Invalid payment request')
    }

    // Get order details and verify user has access
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select(`
        *,
        user_profiles!inner(restaurant_id)
      `)
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      throw new Error('Order not found')
    }

    // Verify user belongs to the same restaurant
    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('restaurant_id, role')
      .eq('id', user.user.id)
      .single()

    if (!userProfile || userProfile.restaurant_id !== order.user_profiles.restaurant_id) {
      throw new Error('Access denied')
    }

    let paymentResult: any = {}

    if (method === 'razorpay') {
      // Create Razorpay order
      const razorpayKey = Deno.env.get('RAZORPAY_KEY_ID')
      const razorpaySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

      if (!razorpayKey || !razorpaySecret) {
        throw new Error('Razorpay credentials not configured')
      }

      const razorpayOrder = {
        amount: Math.round(amount * 100), // Convert to paise
        currency,
        receipt: `order_${order_id}`,
        notes: {
          order_id,
          customer_name: customer_name || '',
          customer_phone: customer_phone || ''
        }
      }

      const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${razorpayKey}:${razorpaySecret}`)}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(razorpayOrder)
      })

      if (!razorpayResponse.ok) {
        const errorData = await razorpayResponse.json()
        throw new Error(`Razorpay error: ${errorData.error?.description || 'Payment failed'}`)
      }

      paymentResult = await razorpayResponse.json()
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        restaurant_id: userProfile.restaurant_id,
        order_id,
        amount,
        payment_method: method,
        payment_status: method === 'cash' ? 'completed' : 'pending',
        razorpay_order_id: paymentResult.id || null,
        processed_by: user.user.id,
        processed_at: method === 'cash' ? new Date().toISOString() : null
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Payment record error:', paymentError)
      throw new Error('Failed to create payment record')
    }

    // Update order status if cash payment
    if (method === 'cash') {
      await supabaseClient
        .from('orders')
        .update({ 
          status: 'served',
          served_by: user.user.id,
          served_at: new Date().toISOString()
        })
        .eq('id', order_id)
    }

    const response = {
      success: true,
      payment_id: payment.id,
      razorpay_order_id: paymentResult.id || null,
      razorpay_key_id: method === 'razorpay' ? Deno.env.get('RAZORPAY_KEY_ID') : null,
      amount,
      currency,
      method,
      status: payment.payment_status
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Payment function error:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Payment processing failed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})