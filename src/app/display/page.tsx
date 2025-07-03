'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface QueueOperation {
  id: string
  action: string
  laneId: string
  number: number | null
  createdAt: string
  lane: {
    id: string
    name: string
    currentNumber: number
  }
}

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

interface ExtendedAudioElement extends HTMLAudioElement {
  playNotification?: () => void
}

interface ExtendedWindow extends Window {
  webkitAudioContext?: typeof AudioContext
}

export default function DisplayPage() {
  const [lanes, setLanes] = useState<LaneStatus[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [previousLanes, setPreviousLanes] = useState<LaneStatus[]>([])
  const [recentlyUpdatedLanes, setRecentlyUpdatedLanes] = useState<Set<string>>(new Set())
  const [lastOperationCheck, setLastOperationCheck] = useState(new Date())
  const audioRef = useRef<ExtendedAudioElement | null>(null)

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio() as ExtendedAudioElement
    audioRef.current.volume = 0.8
    
    // Create notification sound using Web Audio API
    const playNotification = () => {
      const extWindow = window as ExtendedWindow
      const audioContext = new (window.AudioContext || extWindow.webkitAudioContext!)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Pleasant notification sound - three chimes
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
    
    // Store playNotification function on the audio ref for later use
    if (audioRef.current) {
      audioRef.current.playNotification = playNotification
    }
  }, [])

  // Play notification when current number changes
  useEffect(() => {
    if (previousLanes.length > 0 && lanes.length > 0) {
      const updatedLaneIds = new Set<string>()
      
      lanes.forEach((currentLane) => {
        const previousLane = previousLanes.find(pl => pl.id === currentLane.id)
        if (previousLane && previousLane.currentNumber !== currentLane.currentNumber && currentLane.currentNumber > 0) {
          updatedLaneIds.add(currentLane.id)
          
          // Play notification sound when number changes
          if (audioRef.current && audioRef.current.playNotification) {
            setTimeout(() => {
              audioRef.current!.playNotification!()
            }, 100)
          }
        }
      })
      
      // Set recently updated lanes for visual feedback
      if (updatedLaneIds.size > 0) {
        setRecentlyUpdatedLanes(updatedLaneIds)
        // Clear the highlight after 3 seconds
        setTimeout(() => {
          setRecentlyUpdatedLanes(new Set())
        }, 3000)
      }
    }
    setPreviousLanes(lanes)
  }, [lanes, previousLanes])

  // Check for recent queue operations (CALL and BUZZ)
  const checkRecentOperations = useCallback(async () => {
    try {
      const response = await fetch(`/api/queue/recent-operations?since=${lastOperationCheck.toISOString()}`)
      if (response.ok) {
        const operations = await response.json()
        
        // Play notification for CALL and BUZZ operations
        const soundOperations = operations.filter((op: QueueOperation) => 
          ['CALL', 'BUZZ'].includes(op.action) && 
          new Date(op.createdAt) > lastOperationCheck
        )
        
        if (soundOperations.length > 0 && audioRef.current && audioRef.current.playNotification) {
          setTimeout(() => {
            audioRef.current!.playNotification!()
          }, 100)
          
          // Add visual feedback for the affected lanes
          const affectedLaneIds = new Set<string>(soundOperations.map((op: QueueOperation) => op.laneId))
          setRecentlyUpdatedLanes(prev => new Set([...prev, ...affectedLaneIds]))
          
          // Clear highlights after 3 seconds
          setTimeout(() => {
            setRecentlyUpdatedLanes(prev => {
              const newSet = new Set(prev)
              affectedLaneIds.forEach((id: string) => newSet.delete(id))
              return newSet
            })
          }, 3000)
        }
        
        setLastOperationCheck(new Date())
      }
    } catch (error) {
      console.error('Error checking recent operations:', error)
    }
  }, [lastOperationCheck])

  useEffect(() => {
    // Fetch lane status immediately and then every 3 seconds
    fetchLaneStatus()
    const statusInterval = setInterval(fetchLaneStatus, 3000)
    
    // Check for recent operations every 2 seconds
    checkRecentOperations()
    const operationsInterval = setInterval(checkRecentOperations, 2000)

    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => {
      clearInterval(statusInterval)
      clearInterval(operationsInterval)
      clearInterval(timeInterval)
    }
  }, [checkRecentOperations])

  const fetchLaneStatus = async () => {
    try {
      const response = await fetch('/api/queue/reservation')
      if (response.ok) {
        const data = await response.json()
        setLanes(data)
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error fetching lane status:', error)
      setIsLoading(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
          <p className="mt-3 text-lg">Loading Display...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 text-white">
      {/* Compact Header */}
      <header className="bg-black bg-opacity-20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Queue Status Display</h1>
              <p className="text-blue-200 text-sm">Real-time monitoring</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-mono font-bold">
                {formatTime(currentTime)}
              </div>
              <div className="text-blue-200 text-sm">
                {formatDate(currentTime)}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {lanes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏢</div>
            <h2 className="text-2xl font-bold mb-3">No Active Services</h2>
            <p className="text-lg text-blue-200">All service lanes are currently closed</p>
          </div>
        ) : (
          /* Responsive Grid - More Lanes Fit On Screen */
          <div className={`grid gap-4 ${
            lanes.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' :
            lanes.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
            lanes.length === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
            lanes.length === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            {lanes.map((lane) => (
              <Card key={lane.id} className="bg-white bg-opacity-10 backdrop-blur-md border-white border-opacity-20 hover:bg-opacity-20 transition-all duration-300">
                <CardContent className="p-4">
                  {/* Compact Lane Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">
                        {lane.name}
                      </h3>
                      {lane.description && (
                        <p className="text-blue-200 text-xs">
                          {lane.description}
                        </p>
                      )}
                    </div>
                    <Badge className="bg-green-500 text-white text-xs px-2 py-1">
                      OPEN
                    </Badge>
                  </div>

                  {/* Compact Current Number Display */}
                  <div className={`bg-black bg-opacity-30 rounded-lg p-4 mb-4 text-center transition-all duration-1000 ${
                    recentlyUpdatedLanes.has(lane.id) ? 'ring-2 ring-yellow-400 ring-opacity-75 bg-yellow-400 bg-opacity-20' : ''
                  }`}>
                    <div className="text-blue-200 text-xs mb-1">NOW SERVING</div>
                    <div className={`text-4xl font-bold mb-1 font-mono transition-all duration-500 ${
                      recentlyUpdatedLanes.has(lane.id) ? 'text-yellow-300 animate-pulse' : 'text-yellow-400'
                    }`}>
                      {lane.currentNumber === 0 ? '---' : lane.currentNumber.toString().padStart(3, '0')}
                    </div>
                    {lane.currentNumber > 0 && (
                      <div className={`${recentlyUpdatedLanes.has(lane.id) ? 'animate-bounce' : 'animate-pulse'}`}>
                        <div className="text-xs text-green-400">
                          🔔 Please proceed to {lane.name}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Compact Queue Statistics */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-black bg-opacity-20 rounded p-2 text-center">
                      <div className="text-lg font-bold text-green-400">
                        {lane.lastServedNumber}
                      </div>
                      <div className="text-blue-200 text-xs">
                        Last
                      </div>
                    </div>
                    
                    <div className="bg-black bg-opacity-20 rounded p-2 text-center">
                      <div className="text-lg font-bold text-orange-400">
                        {lane.waitingCount}
                      </div>
                      <div className="text-blue-200 text-xs">
                        Waiting
                      </div>
                    </div>
                    
                    <div className="bg-black bg-opacity-20 rounded p-2 text-center">
                      <div className="text-lg font-bold text-purple-400">
                        {lane.nextNumber}
                      </div>
                      <div className="text-blue-200 text-xs">
                        Next
                      </div>
                    </div>
                  </div>

                  {/* Compact Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs text-blue-200 mb-1">
                      <span>Progress</span>
                      <span>{lane.waitingCount} waiting</span>
                    </div>
                    <div className="w-full bg-black bg-opacity-30 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: lane.nextNumber > 0 
                            ? `${Math.min((lane.currentNumber / lane.nextNumber) * 100, 100)}%` 
                            : '0%' 
                        }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Compact Footer Notice */}
        <div className="mt-4 text-center">
          <div className="bg-black bg-opacity-20 backdrop-blur-sm rounded-lg p-3 max-w-4xl mx-auto">
            <div className="flex flex-wrap justify-center gap-6 text-sm text-blue-200">
              <span>🔔 Listen for your number</span>
              <span>👀 Watch this screen</span>
              <span>❓ Missed call? Approach counter</span>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Live Updates Indicator */}
      <div className="fixed bottom-3 right-3 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg">
        <div className="flex items-center">
          <div className="animate-pulse w-2 h-2 bg-green-400 rounded-full mr-2"></div>
          <span className="text-xs">Live</span>
        </div>
      </div>

      {/* Compact Sound Notification */}
      {recentlyUpdatedLanes.size > 0 && (
        <div className="fixed bottom-3 left-3 bg-yellow-500 bg-opacity-90 text-black px-4 py-2 rounded-lg animate-bounce">
          <div className="flex items-center">
            <div className="text-lg mr-2">🔔</div>
            <span className="font-bold text-sm">New Number!</span>
          </div>
        </div>
      )}
    </div>
  )
}
