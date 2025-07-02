'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Lane {
  id: string
  name: string
  description?: string
  currentNumber: number
  lastServedNumber: number
  queueItems: Array<{
    number: number
    status: string
  }>
}

export default function UserPage() {
  const [lanes, setLanes] = useState<Lane[]>([])
  const [selectedLane, setSelectedLane] = useState<Lane | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOperating, setIsOperating] = useState(false)
  const router = useRouter()

  const fetchLanes = useCallback(async () => {
    try {
      // Fetch only assigned lanes for the current user
      const response = await fetch('/api/users/assigned-lanes')
      if (response.ok) {
        const data = await response.json()
        setLanes(data)
        
        // Auto-select the first assigned lane if none is selected
        if (!selectedLane && data.length > 0) {
          console.log('Auto-selecting first assigned lane:', data[0])
          setSelectedLane(data[0])
        }
        
        // Update selected lane with fresh data
        if (selectedLane) {
          const updatedSelectedLane = data.find((lane: Lane) => lane.id === selectedLane.id)
          if (updatedSelectedLane) {
            console.log('Updated selected lane:', updatedSelectedLane)
            setSelectedLane(updatedSelectedLane)
          }
        }
        
        setIsLoading(false)
      } else {
        toast.error('Failed to fetch assigned lanes')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error fetching assigned lanes:', error)
      toast.error('Error fetching assigned lanes')
      setIsLoading(false)
    }
  }, [selectedLane])

  useEffect(() => {
    fetchLanes()
    const interval = setInterval(fetchLanes, 2000) // Refresh every 2 seconds for more responsive updates
    return () => clearInterval(interval)
  }, [fetchLanes]) // Now fetchLanes is memoized

  const handleOperation = async (action: string) => {
    if (!selectedLane) return
    
    setIsOperating(true)
    try {
      const response = await fetch('/api/queue/operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          laneId: selectedLane.id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Immediate feedback for different actions
        switch (action) {
          case 'NEXT':
            if (data.currentNumber) {
              toast.success(`Now serving: ${data.currentNumber}`, {
                duration: 4000,
              })
            }
            break
          case 'CALL':
            toast.success(`Called number ${selectedLane.currentNumber} again`)
            break
          case 'BUZZ':
            toast.success(`Buzzed number ${selectedLane.currentNumber}`)
            break
          case 'SERVE':
            toast.success(`Customer ${data.servedNumber} has been served`)
            break
        }
        
        // Force immediate refresh
        await fetchLanes()
        
        // Additional debug logging
        console.log(`Operation ${action} completed for lane ${selectedLane.id}`)
      } else {
        const data = await response.json()
        toast.error(data.error || `Failed to perform ${action} operation`)
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error)
      toast.error('Network error. Please try again.')
    } finally {
      setIsOperating(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const getWaitingCount = (lane: Lane) => {
    return lane.queueItems.filter(item => item.status === 'WAITING').length
  }

  const getCalledCount = (lane: Lane) => {
    return lane.queueItems.filter(item => item.status === 'CALLED').length
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Cashier Interface</h1>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(!selectedLane && lanes.length > 1) ? (
          /* Lane Selection - only show if user has multiple assigned lanes */
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Your Lane</h2>
              <p className="text-gray-600 mb-6">You are assigned to multiple lanes. Choose the one you want to manage.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lanes.map((lane) => (
                <Card 
                  key={lane.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedLane(lane)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {lane.name}
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </CardTitle>
                    <CardDescription>{lane.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Current Number:</span>
                        <span className="font-medium text-2xl text-blue-600">{lane.currentNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Waiting:</span>
                        <span className="font-medium">{getWaitingCount(lane)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Called:</span>
                        <span className="font-medium">{getCalledCount(lane)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : lanes.length === 0 ? (
          /* No assigned lanes */
          <div className="text-center py-12">
            <div className="mx-auto max-w-md">
              <div className="text-6xl mb-4">🚫</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">No Assigned Lanes</h2>
              <p className="text-gray-600 mb-6">
                You are not currently assigned to any service lanes. Please contact your administrator to get assigned to a lane.
              </p>
              <Button onClick={handleLogout} variant="outline">
                Logout
              </Button>
            </div>
          </div>
        ) : selectedLane ? (
          /* Queue Management */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedLane.name}</h2>
                <p className="text-gray-600">{selectedLane.description}</p>
              </div>
              <Button onClick={handleLogout} variant="outline">
                Logout
              </Button>
            </div>

            {/* Current Status */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {selectedLane.currentNumber}
                  </div>
                  <div className="text-sm text-gray-500">Current Number</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {selectedLane.lastServedNumber}
                  </div>
                  <div className="text-sm text-gray-500">Last Served</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-4xl font-bold text-orange-600 mb-2">
                    {getWaitingCount(selectedLane)}
                  </div>
                  <div className="text-sm text-gray-500">Waiting</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-4xl font-bold text-purple-600 mb-2">
                    {getCalledCount(selectedLane)}
                  </div>
                  <div className="text-sm text-gray-500">Called</div>
                </CardContent>
              </Card>
            </div>

            {/* Queue Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Queue Controls</CardTitle>
                <CardDescription>
                  Manage your queue with the following operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button
                    onClick={() => handleOperation('NEXT')}
                    disabled={isOperating || getWaitingCount(selectedLane) === 0}
                    className="h-20 text-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">⏭️</div>
                      <div>Next Number</div>
                      {getWaitingCount(selectedLane) === 0 && (
                        <div className="text-xs text-gray-200">No waiting</div>
                      )}
                    </div>
                  </Button>
                  
                  <Button
                    onClick={() => handleOperation('CALL')}
                    disabled={isOperating || selectedLane.currentNumber === 0}
                    className="h-20 text-lg bg-green-600 hover:bg-green-700"
                    variant="default"
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">📢</div>
                      <div>Call Again</div>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={() => handleOperation('BUZZ')}
                    disabled={isOperating || selectedLane.currentNumber === 0}
                    className="h-20 text-lg bg-orange-600 hover:bg-orange-700"
                    variant="default"
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">🔔</div>
                      <div>Buzz Number</div>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={() => handleOperation('SERVE')}
                    disabled={isOperating || selectedLane.currentNumber === 0}
                    className="h-20 text-lg bg-purple-600 hover:bg-purple-700"
                    variant="default"
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">✅</div>
                      <div>Serve Customer</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Queue Operations:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li><strong>Next Number:</strong> Advance to the next customer in queue</li>
                      <li><strong>Call Again:</strong> Re-announce the current number</li>
                      <li><strong>Buzz Number:</strong> Send an alert/notification for current number</li>
                      <li><strong>Serve Customer:</strong> Mark current customer as served and update last served number</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Tips:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Use &ldquo;Serve Customer&rdquo; when you finish helping the current customer</li>
                      <li>• Use &ldquo;Call Again&rdquo; if customer doesn&apos;t respond initially</li>
                      <li>• Use &ldquo;Buzz&rdquo; for urgent notifications or if customer still doesn&apos;t respond</li>
                      <li>• Monitor the waiting count to manage queue flow</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  )
}
