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
import { Sidebar } from '@/components/Sidebar'
import { useAuth } from '@/hooks/useAuth'
import { useRealtimeTables } from '@/hooks/useRealtime'
import { supabase } from '@/lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  Users,
  Edit,
  Trash2,
  Coffee,
  AlertCircle,
  CheckCircle,
  Clock,
  Wrench
} from 'lucide-react'
import { toast } from 'sonner'
import { Table, TableStatus } from '@/types/database'

const tableSchema = z.object({
  table_number: z.string().min(1, 'Table number is required'),
  capacity: z.number().min(1, 'Capacity must be at least 1'),
  status: z.enum(['available', 'occupied', 'reserved', 'maintenance']),
})

type TableForm = z.infer<typeof tableSchema>

const statusConfig = {
  available: { 
    label: 'Available', 
    color: 'bg-green-500', 
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    icon: CheckCircle 
  },
  occupied: { 
    label: 'Occupied', 
    color: 'bg-red-500', 
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    icon: Coffee 
  },
  reserved: { 
    label: 'Reserved', 
    color: 'bg-yellow-500', 
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    icon: Clock 
  },
  maintenance: { 
    label: 'Maintenance', 
    color: 'bg-gray-500', 
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    icon: Wrench 
  }
}

export default function TablesPage() {
  const { profile } = useAuth()
  const { tables, loading } = useRealtimeTables(profile?.restaurant_id || null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<TableForm>({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      status: 'available',
      capacity: 4,
    }
  })

  const onSubmit = async (data: TableForm) => {
    if (!profile?.restaurant_id) return

    try {
      const tableData = {
        ...data,
        restaurant_id: profile.restaurant_id,
      }

      if (editingTable) {
        // Update existing table
        const { error } = await supabase
          .from('tables')
          .update(tableData)
          .eq('id', editingTable.id)

        if (error) {
          throw error
        }

        toast.success('Table updated successfully!')
      } else {
        // Create new table
        const { error } = await supabase
          .from('tables')
          .insert(tableData)

        if (error) {
          throw error
        }

        toast.success('Table added successfully!')
      }

      // Reset form and close dialog
      reset()
      setEditingTable(null)
      setIsDialogOpen(false)

    } catch (error: any) {
      console.error('Error saving table:', error)
      if (error.code === '23505') {
        toast.error('Table number already exists')
      } else {
        toast.error('Failed to save table')
      }
    }
  }

  const handleEdit = (table: Table) => {
    setEditingTable(table)
    setValue('table_number', table.table_number)
    setValue('capacity', table.capacity)
    setValue('status', table.status)
    setIsDialogOpen(true)
  }

  const handleDelete = async (table: Table) => {
    if (!confirm(`Are you sure you want to delete Table ${table.table_number}?`)) return

    try {
      const { error } = await supabase
        .from('tables')
        .delete()
        .eq('id', table.id)

      if (error) {
        throw error
      }

      toast.success('Table deleted successfully!')

    } catch (error) {
      console.error('Error deleting table:', error)
      toast.error('Failed to delete table')
    }
  }

  const updateTableStatus = async (table: Table, newStatus: TableStatus) => {
    try {
      const { error } = await supabase
        .from('tables')
        .update({ status: newStatus })
        .eq('id', table.id)

      if (error) {
        throw error
      }

      toast.success(`Table ${table.table_number} status updated to ${statusConfig[newStatus].label}`)

    } catch (error) {
      console.error('Error updating table status:', error)
      toast.error('Failed to update table status')
    }
  }

  const getStatusCounts = () => {
    return tables.reduce((counts, table) => {
      counts[table.status] = (counts[table.status] || 0) + 1
      return counts
    }, {} as Record<TableStatus, number>)
  }

  const statusCounts = getStatusCounts()

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
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Table Management</h1>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={() => {
                    reset()
                    setEditingTable(null)
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Table
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingTable ? 'Edit Table' : 'Add New Table'}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="table_number">Table Number</Label>
                    <Input
                      id="table_number"
                      {...register('table_number')}
                      placeholder="e.g., T01, Table 1"
                    />
                    {errors.table_number && (
                      <p className="text-red-500 text-sm">{errors.table_number.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capacity">Seating Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min="1"
                      max="20"
                      {...register('capacity', { valueAsNumber: true })}
                    />
                    {errors.capacity && (
                      <p className="text-red-500 text-sm">{errors.capacity.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      defaultValue="available"
                      onValueChange={(value: TableStatus) => setValue('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([status, config]) => (
                          <SelectItem key={status} value={status}>
                            <div className="flex items-center">
                              <config.icon className="w-4 h-4 mr-2" />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      {editingTable ? 'Update Table' : 'Add Table'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(statusConfig).map(([status, config]) => (
              <Card key={status} className="shadow-sm">
                <CardContent className="flex items-center p-4">
                  <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center mr-3`}>
                    <config.icon className={`w-6 h-6 ${config.textColor}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {statusCounts[status as TableStatus] || 0}
                    </p>
                    <p className="text-sm text-gray-600">{config.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Tables Grid */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            <AnimatePresence>
              {tables.map(table => {
                const config = statusConfig[table.status]
                const StatusIcon = config.icon
                
                return (
                  <motion.div
                    key={table.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ y: -2, scale: 1.02 }}
                    className="bg-white rounded-xl shadow-sm border hover:shadow-lg transition-all duration-300"
                  >
                    <CardContent className="p-6">
                      {/* Table Header */}
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg text-gray-900">
                          {table.table_number}
                        </h3>
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(table)}
                            className="w-8 h-8 p-0"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(table)}
                            className="w-8 h-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Table Visual */}
                      <div className="relative mb-4">
                        <div className={`w-20 h-20 mx-auto rounded-xl ${config.bgColor} border-2 border-dashed border-gray-300 flex items-center justify-center`}>
                          <StatusIcon className={`w-8 h-8 ${config.textColor}`} />
                        </div>
                        <Badge 
                          className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 ${config.color} text-white`}
                        >
                          {config.label}
                        </Badge>
                      </div>

                      {/* Table Info */}
                      <div className="text-center space-y-2">
                        <div className="flex items-center justify-center text-sm text-gray-600">
                          <Users className="w-4 h-4 mr-1" />
                          Seats {table.capacity}
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Select 
                          value={table.status}
                          onValueChange={(value: TableStatus) => updateTableStatus(table, value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([status, statusConfig]) => (
                              <SelectItem key={status} value={status}>
                                <div className="flex items-center">
                                  <statusConfig.icon className="w-3 h-3 mr-2" />
                                  {statusConfig.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {table.status === 'available' && (
                          <Button
                            size="sm"
                            onClick={() => updateTableStatus(table, 'occupied')}
                            className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                          >
                            Occupy
                          </Button>
                        )}
                        
                        {table.status === 'occupied' && (
                          <Button
                            size="sm"
                            onClick={() => updateTableStatus(table, 'available')}
                            className="h-8 text-xs bg-green-600 hover:bg-green-700"
                          >
                            Free
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {tables.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg font-medium">No tables added yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Add your first table to start managing seating
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}