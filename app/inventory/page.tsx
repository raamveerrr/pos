'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
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
  AlertTriangle,
  TrendingUp,
  Package,
  DollarSign,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import { Inventory } from '@/types/database'

const inventorySchema = z.object({
  item_name: z.string().min(2, 'Item name must be at least 2 characters'),
  category: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  current_stock: z.number().min(0, 'Current stock must be non-negative'),
  minimum_stock: z.number().min(0, 'Minimum stock must be non-negative'),
  maximum_stock: z.number().min(0, 'Maximum stock must be non-negative'),
  unit_cost: z.number().min(0, 'Unit cost must be non-negative'),
  supplier_name: z.string().optional(),
  supplier_contact: z.string().optional(),
})

type InventoryForm = z.infer<typeof inventorySchema>

export default function InventoryPage() {
  const { profile } = useAuth()
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [filteredInventory, setFilteredInventory] = useState<Inventory[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Inventory | null>(null)
  const [restockDialogOpen, setRestockDialogOpen] = useState(false)
  const [restockItem, setRestockItem] = useState<Inventory | null>(null)
  const [restockQuantity, setRestockQuantity] = useState<number>(0)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<InventoryForm>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      unit: 'pieces',
      current_stock: 0,
      minimum_stock: 0,
      maximum_stock: 100,
      unit_cost: 0,
    }
  })

  useEffect(() => {
    if (profile?.restaurant_id) {
      fetchInventory()
    }
  }, [profile])

  useEffect(() => {
    let filtered = inventory.filter(item => {
      const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.category?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
      
      let matchesStatus = true
      if (filterStatus === 'Low Stock') {
        matchesStatus = item.current_stock <= item.minimum_stock
      } else if (filterStatus === 'Out of Stock') {
        matchesStatus = item.current_stock === 0
      } else if (filterStatus === 'In Stock') {
        matchesStatus = item.current_stock > item.minimum_stock
      }
      
      return matchesSearch && matchesCategory && matchesStatus
    })
    setFilteredInventory(filtered)
  }, [inventory, searchQuery, selectedCategory, filterStatus])

  const fetchInventory = async () => {
    if (!profile?.restaurant_id) return

    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .order('item_name', { ascending: true })

      if (error) {
        toast.error('Failed to load inventory')
      } else {
        setInventory(data || [])
      }
    } catch (error) {
      console.error('Error fetching inventory:', error)
      toast.error('Failed to load inventory')
    }
  }

  const categories = ['All', ...new Set(inventory.map(item => item.category).filter(Boolean))]

  const onSubmit = async (data: InventoryForm) => {
    if (!profile?.restaurant_id) return

    try {
      const inventoryData = {
        ...data,
        restaurant_id: profile.restaurant_id,
      }

      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('inventory')
          .update(inventoryData)
          .eq('id', editingItem.id)

        if (error) {
          throw error
        }

        toast.success('Inventory item updated successfully!')
      } else {
        // Create new item
        const { error } = await supabase
          .from('inventory')
          .insert(inventoryData)

        if (error) {
          throw error
        }

        toast.success('Inventory item added successfully!')
      }

      // Reset form and close dialog
      reset()
      setEditingItem(null)
      setIsDialogOpen(false)
      fetchInventory()

    } catch (error: any) {
      console.error('Error saving inventory item:', error)
      if (error.code === '23505') {
        toast.error('Item name already exists')
      } else {
        toast.error('Failed to save inventory item')
      }
    }
  }

  const handleEdit = (item: Inventory) => {
    setEditingItem(item)
    setValue('item_name', item.item_name)
    setValue('category', item.category || '')
    setValue('unit', item.unit)
    setValue('current_stock', item.current_stock)
    setValue('minimum_stock', item.minimum_stock)
    setValue('maximum_stock', item.maximum_stock)
    setValue('unit_cost', item.unit_cost)
    setValue('supplier_name', item.supplier_name || '')
    setValue('supplier_contact', item.supplier_contact || '')
    setIsDialogOpen(true)
  }

  const handleDelete = async (item: Inventory) => {
    if (!confirm(`Are you sure you want to delete "${item.item_name}"?`)) return

    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', item.id)

      if (error) {
        throw error
      }

      toast.success('Inventory item deleted successfully!')
      fetchInventory()

    } catch (error) {
      console.error('Error deleting inventory item:', error)
      toast.error('Failed to delete inventory item')
    }
  }

  const handleRestock = async () => {
    if (!restockItem || restockQuantity <= 0) return

    try {
      const newStock = restockItem.current_stock + restockQuantity
      
      const { error } = await supabase
        .from('inventory')
        .update({ 
          current_stock: newStock,
          last_restocked_at: new Date().toISOString()
        })
        .eq('id', restockItem.id)

      if (error) {
        throw error
      }

      toast.success(`${restockItem.item_name} restocked successfully!`)
      setRestockDialogOpen(false)
      setRestockItem(null)
      setRestockQuantity(0)
      fetchInventory()

    } catch (error) {
      console.error('Error restocking item:', error)
      toast.error('Failed to restock item')
    }
  }

  const getStockStatus = (item: Inventory) => {
    if (item.current_stock === 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-800', severity: 'critical' }
    } else if (item.current_stock <= item.minimum_stock) {
      return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800', severity: 'warning' }
    } else {
      return { label: 'In Stock', color: 'bg-green-100 text-green-800', severity: 'good' }
    }
  }

  const getStockPercentage = (item: Inventory) => {
    if (item.maximum_stock === 0) return 0
    return Math.min((item.current_stock / item.maximum_stock) * 100, 100)
  }

  const lowStockCount = inventory.filter(item => item.current_stock <= item.minimum_stock).length
  const outOfStockCount = inventory.filter(item => item.current_stock === 0).length
  const totalValue = inventory.reduce((sum, item) => sum + (item.current_stock * item.unit_cost), 0)

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={() => {
                    reset()
                    setEditingItem(null)
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Inventory Item
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="item_name">Item Name</Label>
                      <Input
                        id="item_name"
                        {...register('item_name')}
                        placeholder="e.g., Tomatoes"
                      />
                      {errors.item_name && (
                        <p className="text-red-500 text-sm">{errors.item_name.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        {...register('category')}
                        placeholder="e.g., Vegetables"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit</Label>
                      <Select onValueChange={(value) => setValue('unit', value)} defaultValue="pieces">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pieces">Pieces</SelectItem>
                          <SelectItem value="kg">Kilograms</SelectItem>
                          <SelectItem value="liters">Liters</SelectItem>
                          <SelectItem value="packets">Packets</SelectItem>
                          <SelectItem value="boxes">Boxes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="current_stock">Current Stock</Label>
                      <Input
                        id="current_stock"
                        type="number"
                        step="0.01"
                        {...register('current_stock', { valueAsNumber: true })}
                      />
                      {errors.current_stock && (
                        <p className="text-red-500 text-sm">{errors.current_stock.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="unit_cost">Unit Cost (₹)</Label>
                      <Input
                        id="unit_cost"
                        type="number"
                        step="0.01"
                        {...register('unit_cost', { valueAsNumber: true })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minimum_stock">Minimum Stock</Label>
                      <Input
                        id="minimum_stock"
                        type="number"
                        step="0.01"
                        {...register('minimum_stock', { valueAsNumber: true })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="maximum_stock">Maximum Stock</Label>
                      <Input
                        id="maximum_stock"
                        type="number"
                        step="0.01"
                        {...register('maximum_stock', { valueAsNumber: true })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="supplier_name">Supplier Name</Label>
                      <Input
                        id="supplier_name"
                        {...register('supplier_name')}
                        placeholder="e.g., ABC Suppliers"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="supplier_contact">Supplier Contact</Label>
                      <Input
                        id="supplier_contact"
                        {...register('supplier_contact')}
                        placeholder="Phone or email"
                      />
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
                      className="bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      {editingItem ? 'Update Item' : 'Add Item'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="shadow-sm">
              <CardContent className="flex items-center p-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mr-3">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
                  <p className="text-sm text-gray-600">Total Items</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm">
              <CardContent className="flex items-center p-4">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mr-3">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{lowStockCount}</p>
                  <p className="text-sm text-gray-600">Low Stock</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm">
              <CardContent className="flex items-center p-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mr-3">
                  <TrendingUp className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{outOfStockCount}</p>
                  <p className="text-sm text-gray-600">Out of Stock</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm">
              <CardContent className="flex items-center p-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mr-3">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">₹{totalValue.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total Value</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search inventory items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="In Stock">In Stock</SelectItem>
                  <SelectItem value="Low Stock">Low Stock</SelectItem>
                  <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="flex-1 p-6 overflow-auto">
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredInventory.map(item => {
                      const status = getStockStatus(item)
                      const percentage = getStockPercentage(item)
                      
                      return (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-gray-50"
                        >
                          <TableCell>
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {item.item_name}
                              </h4>
                              {item.category && (
                                <p className="text-sm text-gray-600">{item.category}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span>{item.current_stock} {item.unit}</span>
                                <span className="text-gray-500">
                                  {percentage.toFixed(0)}%
                                </span>
                              </div>
                              <Progress value={percentage} className="h-2" />
                              <div className="text-xs text-gray-500">
                                Min: {item.minimum_stock} / Max: {item.maximum_stock}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">₹{item.unit_cost}</span>
                            <span className="text-gray-500">/{item.unit}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-gray-900">
                              ₹{(item.current_stock * item.unit_cost).toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={status.color}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setRestockItem(item)
                                  setRestockDialogOpen(true)
                                }}
                                disabled={item.current_stock >= item.maximum_stock}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
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
                      )
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
              
              {filteredInventory.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No inventory items found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {searchQuery || selectedCategory !== 'All' || filterStatus !== 'All'
                      ? 'Try adjusting your search or filters'
                      : 'Add your first inventory item to get started'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Restock Dialog */}
      <Dialog open={restockDialogOpen} onOpenChange={setRestockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Restock Item</DialogTitle>
          </DialogHeader>
          
          {restockItem && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">{restockItem.item_name}</h3>
                <p className="text-sm text-gray-600">
                  Current stock: {restockItem.current_stock} {restockItem.unit}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="restock_quantity">Quantity to Add</Label>
                <Input
                  id="restock_quantity"
                  type="number"
                  min="1"
                  value={restockQuantity}
                  onChange={(e) => setRestockQuantity(Number(e.target.value))}
                  placeholder="Enter quantity"
                />
              </div>
              
              <div className="text-sm text-gray-600">
                New stock level: {restockItem.current_stock + restockQuantity} {restockItem.unit}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRestockDialogOpen(false)
                    setRestockQuantity(0)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRestock}
                  disabled={restockQuantity <= 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Restock
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}