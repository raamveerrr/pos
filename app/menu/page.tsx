'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Sidebar } from '@/components/Sidebar'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Upload,
  DollarSign,
  Clock,
  Leaf,
  Flame
} from 'lucide-react'
import { toast } from 'sonner'
import { MenuItem } from '@/types/database'

const menuItemSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  price: z.number().min(0.01, 'Price must be greater than 0'),
  cost_price: z.number().min(0, 'Cost price must be non-negative').optional(),
  preparation_time: z.number().min(1, 'Preparation time must be at least 1 minute'),
  calories: z.number().min(0).optional(),
  is_vegetarian: z.boolean(),
  is_spicy: z.boolean(),
  is_available: z.boolean(),
  allergens: z.string().optional(),
  tags: z.string().optional(),
})

type MenuItemForm = z.infer<typeof menuItemSchema>

export default function MenuPage() {
  const { profile } = useAuth()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<MenuItemForm>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      is_vegetarian: false,
      is_spicy: false,
      is_available: true,
      preparation_time: 15,
      cost_price: 0,
    }
  })

  useEffect(() => {
    if (profile?.restaurant_id) {
      fetchMenuItems()
    }
  }, [profile])

  useEffect(() => {
    let filtered = menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
      return matchesSearch && matchesCategory
    })
    setFilteredItems(filtered)
  }, [menuItems, searchQuery, selectedCategory])

  const fetchMenuItems = async () => {
    if (!profile?.restaurant_id) return

    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
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

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!profile?.restaurant_id) return null
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.restaurant_id}/${Date.now()}.${fileExt}`
      const filePath = `menu-items/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image')
      return null
    }
  }

  const onSubmit = async (data: MenuItemForm) => {
    if (!profile?.restaurant_id) return

    setUploading(true)

    try {
      let imageUrl = editingItem?.image_url || null

      // Upload new image if provided
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile)
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        }
      }

      const menuItemData = {
        ...data,
        restaurant_id: profile.restaurant_id,
        image_url: imageUrl,
        allergens: data.allergens ? data.allergens.split(',').map(s => s.trim()) : null,
        tags: data.tags ? data.tags.split(',').map(s => s.trim()) : null,
      }

      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('menu_items')
          .update(menuItemData)
          .eq('id', editingItem.id)

        if (error) {
          throw error
        }

        toast.success('Menu item updated successfully!')
      } else {
        // Create new item
        const { error } = await supabase
          .from('menu_items')
          .insert(menuItemData)

        if (error) {
          throw error
        }

        toast.success('Menu item added successfully!')
      }

      // Reset form and close dialog
      reset()
      setImageFile(null)
      setEditingItem(null)
      setIsDialogOpen(false)
      fetchMenuItems()

    } catch (error) {
      console.error('Error saving menu item:', error)
      toast.error('Failed to save menu item')
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item)
    setValue('name', item.name)
    setValue('description', item.description || '')
    setValue('category', item.category)
    setValue('price', item.price)
    setValue('cost_price', item.cost_price)
    setValue('preparation_time', item.preparation_time)
    setValue('calories', item.calories || 0)
    setValue('is_vegetarian', item.is_vegetarian)
    setValue('is_spicy', item.is_spicy)
    setValue('is_available', item.is_available)
    setValue('allergens', item.allergens?.join(', ') || '')
    setValue('tags', item.tags?.join(', ') || '')
    setIsDialogOpen(true)
  }

  const handleDelete = async (item: MenuItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', item.id)

      if (error) {
        throw error
      }

      toast.success('Menu item deleted successfully!')
      fetchMenuItems()

    } catch (error) {
      console.error('Error deleting menu item:', error)
      toast.error('Failed to delete menu item')
    }
  }

  const toggleAvailability = async (item: MenuItem) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !item.is_available })
        .eq('id', item.id)

      if (error) {
        throw error
      }

      toast.success(`${item.name} ${item.is_available ? 'disabled' : 'enabled'}`)
      fetchMenuItems()

    } catch (error) {
      console.error('Error updating availability:', error)
      toast.error('Failed to update availability')
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={() => {
                    reset()
                    setEditingItem(null)
                    setImageFile(null)
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Menu Item
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Item Name</Label>
                      <Input
                        id="name"
                        {...register('name')}
                        placeholder="e.g., Margherita Pizza"
                      />
                      {errors.name && (
                        <p className="text-red-500 text-sm">{errors.name.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        {...register('category')}
                        placeholder="e.g., Main Course"
                      />
                      {errors.category && (
                        <p className="text-red-500 text-sm">{errors.category.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      {...register('description')}
                      placeholder="Describe the dish..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (₹)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        {...register('price', { valueAsNumber: true })}
                      />
                      {errors.price && (
                        <p className="text-red-500 text-sm">{errors.price.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cost_price">Cost Price (₹)</Label>
                      <Input
                        id="cost_price"
                        type="number"
                        step="0.01"
                        {...register('cost_price', { valueAsNumber: true })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="preparation_time">Prep Time (min)</Label>
                      <Input
                        id="preparation_time"
                        type="number"
                        {...register('preparation_time', { valueAsNumber: true })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Image Upload</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="allergens">Allergens (comma-separated)</Label>
                      <Input
                        id="allergens"
                        {...register('allergens')}
                        placeholder="e.g., nuts, dairy, gluten"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags (comma-separated)</Label>
                      <Input
                        id="tags"
                        {...register('tags')}
                        placeholder="e.g., popular, chef-special"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_vegetarian"
                        {...register('is_vegetarian')}
                        checked={watch('is_vegetarian')}
                        onCheckedChange={(checked) => setValue('is_vegetarian', checked)}
                      />
                      <Label htmlFor="is_vegetarian" className="flex items-center">
                        <Leaf className="w-4 h-4 mr-1 text-green-600" />
                        Vegetarian
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_spicy"
                        {...register('is_spicy')}
                        checked={watch('is_spicy')}
                        onCheckedChange={(checked) => setValue('is_spicy', checked)}
                      />
                      <Label htmlFor="is_spicy" className="flex items-center">
                        <Flame className="w-4 h-4 mr-1 text-red-600" />
                        Spicy
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_available"
                        {...register('is_available')}
                        checked={watch('is_available')}
                        onCheckedChange={(checked) => setValue('is_available', checked)}
                      />
                      <Label htmlFor="is_available">Available</Label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={uploading}
                      className="bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      {uploading ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Filter */}
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
            
            <div className="flex gap-2">
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Menu Items Table */}
        <div className="flex-1 p-6 overflow-auto">
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredItems.map(item => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-gray-50"
                      >
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                              {item.image_url ? (
                                <img 
                                  src={item.image_url} 
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-lg">🍽️</span>
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {item.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                {item.is_vegetarian && (
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                    <Leaf className="w-3 h-3 mr-1" />
                                    Veg
                                  </Badge>
                                )}
                                {item.is_spicy && (
                                  <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                                    <Flame className="w-3 h-3 mr-1" />
                                    Spicy
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1 text-gray-500" />
                            ₹{item.price}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={item.is_available ? 'default' : 'secondary'}
                              className={item.is_available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
                            >
                              {item.is_available ? 'Available' : 'Unavailable'}
                            </Badge>
                            <Switch
                              checked={item.is_available}
                              onCheckedChange={() => toggleAvailability(item)}
                              size="sm"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(item)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
              
              {filteredItems.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No menu items found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {searchQuery || selectedCategory !== 'All' 
                      ? 'Try adjusting your search or filter'
                      : 'Add your first menu item to get started'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}