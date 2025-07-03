'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  const [showTicket, setShowTicket] = useState(false)
  const [currentTicket, setCurrentTicket] = useState<QueueTicket | null>(null)

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
        setCurrentTicket(data)
        setShowTicket(true)
        
        // Show success message
        toast.success(`Queue number ${data.queueNumber} assigned for ${data.laneName}`)
        
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

  const formatEstimatedWait = (minutes: number) => {
    if (minutes < 1) return 'Less than 1 minute'
    if (minutes < 60) return `${minutes} minutes`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
          <p className="mt-3 text-gray-600 text-sm">Loading services...</p>
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
          lanes.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
          lanes.length === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
          lanes.length === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' :
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}>
          {lanes.map((lane) => (
            <Card 
              key={lane.id}
              className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer border-2"
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
                  onClick={() => getQueueNumber(lane.id)}
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

      {/* Queue Ticket Modal */}
      <Dialog open={showTicket} onOpenChange={setShowTicket}>
        <DialogContent className="max-w-md print:shadow-none print:border-0">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">Queue Ticket</DialogTitle>
            <DialogDescription className="text-center">
              Please keep this ticket until your number is called
            </DialogDescription>
          </DialogHeader>
          
          {currentTicket && (
            <div className="space-y-6 print:text-black">
              {/* Ticket Content */}
              <div className="text-center border-2 border-dashed border-gray-300 rounded-lg p-6 print:border-black">
                <div className="text-sm text-gray-600 mb-2 print:text-black">
                  {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                </div>
                
                <div className="text-6xl font-bold text-blue-600 mb-2 print:text-black">
                  {currentTicket.queueNumber}
                </div>
                
                <div className="text-xl font-semibold text-gray-900 mb-4">
                  {currentTicket.laneName}
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 print:text-black">
                  <div className="flex justify-between">
                    <span>Now Serving:</span>
                    <span className="font-medium">{currentTicket.currentNumber || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>People Ahead:</span>
                    <span className="font-medium">{currentTicket.waitingCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Wait:</span>
                    <span className="font-medium">{formatEstimatedWait(currentTicket.estimatedWait)}</span>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="text-xs text-gray-500 text-center space-y-1 print:text-black">
                <p>Please listen for your number or watch the display screen</p>
                <p>If you miss your call, please approach the service counter</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 print:hidden">
                <Button onClick={() => setShowTicket(false)} className="flex-1">
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
