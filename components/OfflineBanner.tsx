'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff } from 'lucide-react'
import { useOfflineSync } from '@/hooks/useRealtime'

export function OfflineBanner() {
  const { isOnline, pendingOrders } = useOfflineSync()

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 shadow-lg"
        >
          <div className="flex items-center justify-center space-x-2">
            <WifiOff className="w-5 h-5" />
            <span className="font-medium">
              You are offline
            </span>
            {pendingOrders.length > 0 && (
              <>
                <span className="mx-2">•</span>
                <span className="text-sm">
                  {pendingOrders.length} order{pendingOrders.length > 1 ? 's' : ''} pending sync
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
      
      {isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 shadow-lg"
        >
          <div className="flex items-center justify-center space-x-2">
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-medium">Connected</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}