'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Menu, 
  Users, 
  BarChart3, 
  Package, 
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Store
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const menuItems = [
  { 
    label: 'Dashboard', 
    icon: LayoutDashboard, 
    href: '/dashboard',
    roles: ['owner', 'manager', 'cashier', 'waiter']
  },
  { 
    label: 'POS', 
    icon: ShoppingCart, 
    href: '/pos',
    roles: ['owner', 'manager', 'cashier', 'waiter']
  },
  { 
    label: 'Menu', 
    icon: Menu, 
    href: '/menu',
    roles: ['owner', 'manager', 'cashier']
  },
  { 
    label: 'Tables', 
    icon: Users, 
    href: '/tables',
    roles: ['owner', 'manager', 'cashier', 'waiter']
  },
  { 
    label: 'Reports', 
    icon: BarChart3, 
    href: '/reports',
    roles: ['owner', 'manager']
  },
  { 
    label: 'Inventory', 
    icon: Package, 
    href: '/inventory',
    roles: ['owner', 'manager']
  },
  { 
    label: 'Settings', 
    icon: Settings, 
    href: '/settings',
    roles: ['owner', 'manager']
  },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { profile, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  const visibleMenuItems = menuItems.filter(item => 
    profile && item.roles.includes(profile.role)
  )

  return (
    <motion.div
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={cn(
        'bg-white border-r border-gray-200 shadow-sm h-screen flex flex-col',
        className
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <motion.div
            animate={{ opacity: collapsed ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="flex items-center space-x-3"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="font-bold text-lg text-gray-900">RestoPOS</h2>
                <p className="text-sm text-gray-500">Restaurant Management</p>
              </div>
            )}
          </motion.div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 p-0"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer',
                  isActive 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <motion.span
                  animate={{ opacity: collapsed ? 0 : 1 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'font-medium',
                    collapsed && 'sr-only'
                  )}
                >
                  {item.label}
                </motion.span>
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        {!collapsed && profile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {profile.full_name?.charAt(0) || profile.email.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile.full_name || profile.email}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {profile.role}
                </p>
              </div>
            </div>
          </motion.div>
        )}
        
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={cn(
            'w-full justify-start text-gray-700 hover:text-red-700 hover:bg-red-50',
            collapsed && 'justify-center px-0'
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="ml-3">Sign Out</span>}
        </Button>
      </div>
    </motion.div>
  )
}