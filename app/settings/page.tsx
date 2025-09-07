'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Sidebar } from '@/components/Sidebar'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Settings,
  Building,
  User,
  Percent,
  Bell,
  Palette,
  Save,
  Upload
} from 'lucide-react'
import { toast } from 'sonner'
import { Restaurant } from '@/types/database'

const restaurantSchema = z.object({
  name: z.string().min(2, 'Restaurant name must be at least 2 characters'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  timezone: z.string(),
  currency: z.string(),
  tax_rate: z.number().min(0).max(100),
  service_charge: z.number().min(0).max(100),
})

const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email'),
})

type RestaurantForm = z.infer<typeof restaurantSchema>
type ProfileForm = z.infer<typeof profileSchema>

export default function SettingsPage() {
  const { profile } = useAuth()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)

  const restaurantForm = useForm<RestaurantForm>({
    resolver: zodResolver(restaurantSchema),
    defaultValues: {
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      tax_rate: 18,
      service_charge: 10,
    }
  })

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  })

  useEffect(() => {
    if (profile?.restaurant_id) {
      fetchRestaurantData()
    }
    if (profile) {
      profileForm.setValue('full_name', profile.full_name || '')
      profileForm.setValue('phone', profile.phone || '')
      profileForm.setValue('email', profile.email)
    }
  }, [profile])

  const fetchRestaurantData = async () => {
    if (!profile?.restaurant_id) return

    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', profile.restaurant_id)
        .single()

      if (error) {
        console.error('Error fetching restaurant:', error)
      } else if (data) {
        setRestaurant(data)
        restaurantForm.setValue('name', data.name)
        restaurantForm.setValue('address', data.address || '')
        restaurantForm.setValue('phone', data.phone || '')
        restaurantForm.setValue('email', data.email || '')
        restaurantForm.setValue('timezone', data.timezone)
        restaurantForm.setValue('currency', data.currency)
        restaurantForm.setValue('tax_rate', data.tax_rate)
        restaurantForm.setValue('service_charge', data.service_charge)
      }
    } catch (error) {
      console.error('Error fetching restaurant data:', error)
    } finally {
      setLoading(false)
    }
  }

  const onRestaurantSubmit = async (data: RestaurantForm) => {
    if (!profile?.restaurant_id || !restaurant) return

    try {
      const { error } = await supabase
        .from('restaurants')
        .update(data)
        .eq('id', profile.restaurant_id)

      if (error) {
        throw error
      }

      toast.success('Restaurant settings updated successfully!')
      fetchRestaurantData()

    } catch (error) {
      console.error('Error updating restaurant:', error)
      toast.error('Failed to update restaurant settings')
    }
  }

  const onProfileSubmit = async (data: ProfileForm) => {
    if (!profile?.id) return

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: data.full_name,
          phone: data.phone,
          email: data.email,
        })
        .eq('id', profile.id)

      if (error) {
        throw error
      }

      toast.success('Profile updated successfully!')

    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    }
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-600">
              Manage your restaurant and account preferences
            </p>
          </motion.div>

          <Tabs defaultValue="restaurant" className="space-y-8">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="restaurant" className="flex items-center">
                <Building className="w-4 h-4 mr-2" />
                Restaurant
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center">
                <User className="w-4 h-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center">
                <Percent className="w-4 h-4 mr-2" />
                Billing
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </TabsTrigger>
            </TabsList>

            {/* Restaurant Settings */}
            <TabsContent value="restaurant" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Restaurant Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={restaurantForm.handleSubmit(onRestaurantSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name">Restaurant Name</Label>
                          <Input
                            id="name"
                            {...restaurantForm.register('name')}
                          />
                          {restaurantForm.formState.errors.name && (
                            <p className="text-red-500 text-sm">{restaurantForm.formState.errors.name.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            {...restaurantForm.register('phone')}
                            placeholder="+91 9876543210"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            {...restaurantForm.register('email')}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="currency">Currency</Label>
                          <Select 
                            value={restaurantForm.watch('currency')} 
                            onValueChange={(value) => restaurantForm.setValue('currency', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                              <SelectItem value="USD">US Dollar ($)</SelectItem>
                              <SelectItem value="EUR">Euro (€)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                          id="address"
                          {...restaurantForm.register('address')}
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                          <Input
                            id="tax_rate"
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            {...restaurantForm.register('tax_rate', { valueAsNumber: true })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="service_charge">Service Charge (%)</Label>
                          <Input
                            id="service_charge"
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            {...restaurantForm.register('service_charge', { valueAsNumber: true })}
                          />
                        </div>
                      </div>

                      <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600">
                        <Save className="w-4 h-4 mr-2" />
                        Save Restaurant Settings
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Profile Settings */}
            <TabsContent value="profile" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                      <div className="flex items-center space-x-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                          {profile?.full_name?.charAt(0) || profile?.email.charAt(0)}
                        </div>
                        <div>
                          <Button variant="outline">
                            <Upload className="w-4 h-4 mr-2" />
                            Change Avatar
                          </Button>
                          <p className="text-sm text-gray-500 mt-1">JPG, PNG up to 2MB</p>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="full_name">Full Name</Label>
                          <Input
                            id="full_name"
                            {...profileForm.register('full_name')}
                          />
                          {profileForm.formState.errors.full_name && (
                            <p className="text-red-500 text-sm">{profileForm.formState.errors.full_name.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="profile_phone">Phone Number</Label>
                          <Input
                            id="profile_phone"
                            {...profileForm.register('phone')}
                            placeholder="+91 9876543210"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="profile_email">Email Address</Label>
                          <Input
                            id="profile_email"
                            type="email"
                            {...profileForm.register('email')}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Input
                            value={profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1)}
                            disabled
                            className="bg-gray-50"
                          />
                        </div>
                      </div>

                      <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600">
                        <Save className="w-4 h-4 mr-2" />
                        Update Profile
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Billing Settings */}
            <TabsContent value="billing" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Billing & Subscription</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-900 mb-2">Current Plan: Basic</h3>
                      <p className="text-blue-700 text-sm">
                        Perfect for small restaurants with up to 20 tables and basic features.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900">Plan Features</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>✓ Up to 20 tables</li>
                        <li>✓ Unlimited menu items</li>
                        <li>✓ Basic reporting</li>
                        <li>✓ Payment processing</li>
                        <li>✓ Email support</li>
                      </ul>
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-900">Next billing date</p>
                        <p className="text-sm text-gray-600">March 15, 2024</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">₹2,999/month</p>
                        <p className="text-sm text-gray-600">Auto-renew enabled</p>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <Button variant="outline">Manage Subscription</Button>
                      <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                        Upgrade Plan
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {[
                      {
                        title: 'New Orders',
                        description: 'Get notified when new orders are placed',
                        enabled: true,
                      },
                      {
                        title: 'Low Stock Alerts',
                        description: 'Alert when inventory items are running low',
                        enabled: true,
                      },
                      {
                        title: 'Payment Notifications',
                        description: 'Notifications for successful and failed payments',
                        enabled: true,
                      },
                      {
                        title: 'Daily Reports',
                        description: 'Receive daily sales and performance reports via email',
                        enabled: false,
                      },
                      {
                        title: 'System Updates',
                        description: 'Get notified about system maintenance and updates',
                        enabled: true,
                      },
                    ].map((notification, index) => (
                      <div key={notification.title} className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{notification.title}</h4>
                          <p className="text-sm text-gray-600">{notification.description}</p>
                        </div>
                        <Switch defaultChecked={notification.enabled} />
                      </div>
                    ))}

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900">Notification Channels</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Email Notifications</span>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">SMS Notifications</span>
                          <Switch />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Browser Push Notifications</span>
                          <Switch defaultChecked />
                        </div>
                      </div>
                    </div>

                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                      <Save className="w-4 h-4 mr-2" />
                      Save Notification Settings
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}