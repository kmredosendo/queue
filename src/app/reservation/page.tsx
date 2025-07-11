'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface LaneStatus {
  id: string
  name: string
  description?: string
  currentNumber: number
  lastServedNumber: number
  waitingCount: number
  calledCount: number
  nextNumber: number
}

interface QueueTicket {
  queueNumber: number
  laneName: string
  currentNumber: number
  waitingCount: number
  estimatedWait: number
}

export default function ReservationPage() {
  const [lanes, setLanes] = useState<LaneStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGettingNumber, setIsGettingNumber] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  // Removed unused previousLanes state

  useEffect(() => {
    fetchLaneStatus()
    const interval = setInterval(fetchLaneStatus, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchLaneStatus = async () => {
    try {
      const response = await fetch('/api/queue/reservation')
      if (response.ok) {
        const data = await response.json()
        setLanes(data)
        setIsLoading(false)
      } else {
        toast.error('Failed to fetch lane status')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error fetching lane status:', error)
      toast.error('Error fetching lane status')
      setIsLoading(false)
    }
  }

  const printTicket = async (ticketData: QueueTicket) => {
    try {
      console.log('🖨️ Attempting to print ticket:', ticketData)
      const currentTime = new Date()
      const timestamp = currentTime.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })

      const response = await fetch('/api/print/ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queueNumber: ticketData.queueNumber,
          laneName: ticketData.laneName,
          currentNumber: ticketData.currentNumber,
          timestamp: timestamp
        }),
      })

      if (response.ok) {
        console.log('✅ Print request successful')
        toast.success('Physical ticket printed successfully!')
      } else {
        const errorData = await response.json()
        console.error('❌ Print request failed:', errorData)
        if (response.status === 404) {
          toast.error('Printer not connected. Please check EPSON TM-T88IV connection.')
        } else {
          toast.error(`Printing failed: ${errorData.details || errorData.error}`)
        }
      }
    } catch (error) {
      console.error('💥 Print error:', error)
      toast.error('Failed to print ticket. Please check printer connection.')
    }
  }

  const getQueueNumber = async (laneId: string) => {
    setIsGettingNumber(true)
    try {
      const response = await fetch('/api/queue/reservation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ laneId }),
      })

      if (response.ok) {
        const data = await response.json()
        // Always use the queueNumber from the POST response for ticket and confirmation
        await printTicket({
          queueNumber: data.queueNumber,
          laneName: data.laneName,
          currentNumber: data.currentNumber,
          waitingCount: data.waitingCount,
          estimatedWait: data.estimatedWait
        })
        toast.success(`Queue number ${data.queueNumber} assigned for ${data.laneName}! Ticket printing...`)
        fetchLaneStatus() // Refresh status
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to get queue number')
      }
    } catch (error) {
      console.error('Error getting queue number:', error)
      toast.error('Network error. Please try again.')
    } finally {
      setIsGettingNumber(false)
    }
  }

  // SSE event listening for queue updates
  useEffect(() => {
    eventSourceRef.current = new EventSource('/api/queue/events')
    eventSourceRef.current.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (data && data.type === 'operation') {
          fetchLaneStatus()
        }
      } catch {}
    }
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading services...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Compact Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Get Your Queue Number</h1>
              <p className="text-gray-600 text-sm">Select a service to join the queue</p>
            </div>
            <Button onClick={() => window.location.href = '/'} variant="outline" size="sm">
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Compact Service Selection - Responsive Grid */}
        <div className={`grid gap-3 ${
          lanes.length === 1 ? 'grid-cols-1 max-w-md mx-auto' :
          lanes.length === 2 ? 'grid-cols-2' :
          lanes.length === 3 ? 'grid-cols-2 lg:grid-cols-3' :
          lanes.length === 4 ? 'grid-cols-2 lg:grid-cols-4' :
          'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}>
          {lanes.map((lane) => (
            <Card 
              key={lane.id}
              className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer border-2"
              onClick={() => getQueueNumber(lane.id)}
            >
              <CardHeader className="pb-2 pt-3 px-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">{lane.name}</CardTitle>
                  <Badge className="bg-green-100 text-green-800 text-xs">Open</Badge>
                </div>
                {lane.description && (
                  <CardDescription className="text-xs text-gray-600">
                    {lane.description}
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent className="p-3 pt-0">
                {/* Compact Status Grid */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {lane.currentNumber === 0 ? '-' : lane.currentNumber}
                      </div>
                      <div className="text-xs text-gray-600">Now Serving</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">{lane.nextNumber}</div>
                      <div className="text-xs text-gray-600">Your Number</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-sm font-medium text-orange-600">{lane.waitingCount}</div>
                      <div className="text-xs text-gray-500">Waiting</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-green-600">{lane.calledCount}</div>
                      <div className="text-xs text-gray-500">Called</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-indigo-600">
                        {lane.waitingCount < 3 ? '< 15m' : `${Math.ceil(lane.waitingCount * 5 / 15) * 15}m`}
                      </div>
                      <div className="text-xs text-gray-500">Wait</div>
                    </div>
                  </div>
                </div>

                {/* Compact Get Number Button */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation() // Prevent card click
                    getQueueNumber(lane.id)
                  }}
                  disabled={isGettingNumber}
                  className="w-full h-10 text-sm font-medium"
                >
                  {isGettingNumber ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                      Getting...
                    </div>
                  ) : (
                    <>🎫 Get Number</>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {lanes.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🏢</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Services Available</h3>
            <p className="text-gray-600 text-sm">All service lanes are currently closed. Please check back later.</p>
          </div>
        )}

        {/* Compact Instructions */}
        <Card className="mt-4 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-xs text-blue-700">
              <div className="text-center">
                <div className="text-lg mb-1">1️⃣</div>
                <h4 className="font-medium mb-1">Choose Service</h4>
                <p>Select your needed service</p>
              </div>
              <div className="text-center">
                <div className="text-lg mb-1">2️⃣</div>
                <h4 className="font-medium mb-1">Get Number</h4>
                <p>Receive your queue number</p>
              </div>
              <div className="text-center">
                <div className="text-lg mb-1">3️⃣</div>
                <h4 className="font-medium mb-1">Wait for Call</h4>
                <p>Listen for your number</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
