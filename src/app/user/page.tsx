'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { LaneType } from '@prisma/client'

interface Lane {
  id: number
  name: string
  description?: string
  type: LaneType
  currentNumber: number
  lastServedNumber: number
  queueItems: Array<{
    number: number
    status: string
  }>
}

export default function UserPage() {
  const [lanes, setLanes] = useState<Lane[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOperating, setIsOperating] = useState<{[key: number]: boolean}>({})
  const router = useRouter()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const [previousLanes, setPreviousLanes] = useState<Lane[]>([])

  const fetchLanes = useCallback(async () => {
    try {
      // Fetch only assigned lanes for the current user
      const response = await fetch('/api/users/assigned-lanes')
      if (response.ok) {
        const data = await response.json()
        setLanes(data)
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
  }, [])

  useEffect(() => {
    fetchLanes()
    const interval = setInterval(fetchLanes, 2000) // Refresh every 2 seconds for real-time updates
    return () => clearInterval(interval)
  }, [fetchLanes])

  const handleOperation = async (action: string, laneId: number) => {
    setIsOperating(prev => ({ ...prev, [laneId]: true }))
    try {
      const response = await fetch('/api/queue/operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          laneId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const lane = lanes.find(l => l.id === laneId)
        
        // Immediate feedback for different actions
        switch (action) {
          case 'NEXT':
            if (data.currentNumber) {
              toast.success(`${lane?.name}: Now serving #${data.currentNumber}`, {
                duration: 4000,
              })
            }
            break
          case 'CALL':
            toast.success(`${lane?.name}: Called #${lane?.currentNumber} again`)
            break
          case 'BUZZ':
            toast.success(`${lane?.name}: Buzzed #${lane?.currentNumber}`)
            break
          case 'SERVE':
            toast.success(`${lane?.name}: Customer #${data.servedNumber} served`)
            break
        }
        
        // Force immediate refresh
        await fetchLanes()
      } else {
        const data = await response.json()
        toast.error(data.error || `Failed to perform ${action} operation`)
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error)
      toast.error('Network error. Please try again.')
    } finally {
      setIsOperating(prev => ({ ...prev, [laneId]: false }))
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

  // Notification sound logic (Web Audio API)
  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.volume = 0.8
    // Create notification sound using Web Audio API
    const playNotification = () => {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)
      const frequencies = [800, 1000, 1200]
      frequencies.forEach((freq, index) => {
        setTimeout(() => {
          const osc = audioContext.createOscillator()
          const gain = audioContext.createGain()
          osc.connect(gain)
          gain.connect(audioContext.destination)
          osc.frequency.setValueAtTime(freq, audioContext.currentTime)
          gain.gain.setValueAtTime(0.3, audioContext.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
          osc.start(audioContext.currentTime)
          osc.stop(audioContext.currentTime + 0.5)
        }, index * 200)
      })
    }
    (audioRef.current as HTMLAudioElement & { playNotification?: () => void }).playNotification = playNotification
  }, [])

  // SSE event listening for queue updates
  useEffect(() => {
    eventSourceRef.current = new EventSource('/api/queue/events')
    eventSourceRef.current.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (data && data.type === 'operation') {
          fetchLanes()
        }
      } catch {}
    }
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [fetchLanes])

  // Play notification when current number changes
  useEffect(() => {
    if (previousLanes.length > 0 && lanes.length > 0) {
      lanes.forEach((currentLane) => {
        const previousLane = previousLanes.find(pl => pl.id === currentLane.id)
        if (previousLane && previousLane.currentNumber !== currentLane.currentNumber && currentLane.currentNumber > 0) {
          const audio = audioRef.current as HTMLAudioElement & { playNotification?: () => void }
          if (audio && audio.playNotification) {
            setTimeout(() => {
              audio.playNotification!()
            }, 100)
          }
        }
      })
    }
    setPreviousLanes(lanes)
  }, [lanes, previousLanes])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">Cashier Interface</h1>
              {lanes.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {lanes.length} Lane{lanes.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {lanes.length === 0 ? (
          /* No assigned lanes */
          <div className="text-center py-8">
            <div className="mx-auto max-w-md">
              <div className="text-4xl mb-3">🚫</div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">No Assigned Lanes</h2>
              <p className="text-gray-600 mb-4 text-sm">
                You are not currently assigned to any service lanes. Please contact your administrator.
              </p>
              <Button onClick={handleLogout} variant="outline" size="sm">
                Logout
              </Button>
            </div>
          </div>
        ) : (
          /* All Lanes Management - Compact Grid Layout */
          <div className="space-y-4">
            {/* Compact Grid Layout for Multiple Lanes */}
            <div className={`grid gap-4 ${lanes.length === 1 ? 'grid-cols-1' : lanes.length === 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'}`}>
              {lanes.map((lane) => (
                <Card key={lane.id} className="shadow-md border-2">
                  {/* Compact Header */}
                  <CardHeader className="pb-3 pt-4 px-4 bg-gradient-to-r from-gray-50 to-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{lane.name}</CardTitle>
                        <Badge 
                          variant={lane.type === 'PRIORITY' ? 'secondary' : 'outline'}
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border border-border ${lane.type === 'PRIORITY' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}
                        >
                          {lane.type === 'PRIORITY' ? 'Priority' : 'Regular'}
                        </Badge>
                      </div>
                      <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                        Active
                      </Badge>
                    </div>
                    {lane.description && (
                      <CardDescription className="text-sm text-gray-600">
                        {lane.description}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="p-4">
                    {/* Compact Statistics Grid */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <div className="text-xl font-bold text-blue-600">{lane.currentNumber}</div>
                        <div className="text-xs text-blue-700">Current</div>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded">
                        <div className="text-xl font-bold text-green-600">{lane.lastServedNumber}</div>
                        <div className="text-xs text-green-700">Served</div>
                      </div>
                      <div className="text-center p-2 bg-orange-50 rounded">
                        <div className="text-xl font-bold text-orange-600">{getWaitingCount(lane)}</div>
                        <div className="text-xs text-orange-700">Waiting</div>
                      </div>
                      <div className="text-center p-2 bg-purple-50 rounded">
                        <div className="text-xl font-bold text-purple-600">{getCalledCount(lane)}</div>
                        <div className="text-xs text-purple-700">Called</div>
                      </div>
                    </div>

                    {/* Compact Control Buttons - 2x2 Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <Button
                        onClick={() => handleOperation('NEXT', lane.id)}
                        disabled={isOperating[lane.id] || getWaitingCount(lane) === 0}
                        className="h-14 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                        size="sm"
                      >
                        <div className="text-center">
                          <div className="text-lg">⏭️</div>
                          <div className="text-xs">Next</div>
                        </div>
                      </Button>
                      
                      <Button
                        onClick={() => handleOperation('CALL', lane.id)}
                        disabled={isOperating[lane.id] || lane.currentNumber === 0}
                        className="h-14 text-sm bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <div className="text-center">
                          <div className="text-lg">📢</div>
                          <div className="text-xs">Call</div>
                        </div>
                      </Button>
                      
                      <Button
                        onClick={() => handleOperation('BUZZ', lane.id)}
                        disabled={isOperating[lane.id] || lane.currentNumber === 0}
                        className="h-14 text-sm bg-orange-600 hover:bg-orange-700"
                        size="sm"
                      >
                        <div className="text-center">
                          <div className="text-lg">🔔</div>
                          <div className="text-xs">Buzz</div>
                        </div>
                      </Button>
                      
                      <Button
                        onClick={() => handleOperation('SERVE', lane.id)}
                        disabled={isOperating[lane.id] || lane.currentNumber === 0}
                        className="h-14 text-sm bg-purple-600 hover:bg-purple-700"
                        size="sm"
                      >
                        <div className="text-center">
                          <div className="text-lg">✅</div>
                          <div className="text-xs">Serve</div>
                        </div>
                      </Button>
                    </div>

                    {/* Priority Lane Warning - Compact */}
                    {lane.type === 'PRIORITY' && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-600 text-sm">⚠️</span>
                          <span className="text-xs text-yellow-800 font-medium">
                            Priority Lane
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Compact Instructions - Collapsible or Minimal */}
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <div className="grid md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <strong className="text-blue-600">⏭️ Next:</strong> Advance queue
                  </div>
                  <div>
                    <strong className="text-green-600">📢 Call:</strong> Re-announce number
                  </div>
                  <div>
                    <strong className="text-orange-600">🔔 Buzz:</strong> Send alert/notification
                  </div>
                  <div>
                    <strong className="text-purple-600">✅ Serve:</strong> Mark as served
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
