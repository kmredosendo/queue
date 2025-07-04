'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
  const [isPageVisible, setIsPageVisible] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionRetries, setConnectionRetries] = useState(0)
  const audioRef = useRef<ExtendedAudioElement | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

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

  const fetchLaneStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/queue/reservation', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setLanes(data)
        setIsLoading(false)
      } else {
        console.warn('Failed to fetch lane status:', response.status)
      }
    } catch (error) {
      console.error('Error fetching lane status:', error)
      // Don't set loading to false on error to keep trying
    }
  }, [])

  // Fallback polling for when SSE fails
  const startFallbackPolling = useCallback(() => {
    console.log('Starting fallback polling mode')
    const interval = setInterval(() => {
      if (isPageVisible) {
        fetchLaneStatus()
      }
    }, 2000) // Reasonable fallback interval

    return () => clearInterval(interval)
  }, [isPageVisible, fetchLaneStatus])

  // Server-Sent Events connection for real-time updates
  useEffect(() => {
    if (!isPageVisible) return // Don't connect when page is hidden

    const connectSSE = () => {
      try {
        eventSourceRef.current = new EventSource('/api/queue/events')

        eventSourceRef.current.onopen = () => {
          console.log('SSE connection opened')
          setIsConnected(true)
          setConnectionRetries(0)
          setIsLoading(false)
        }

        eventSourceRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            if (data.type === 'lanes_update') {
              setLanes(data.lanes)
            } else if (data.type === 'operation') {
              // Handle real-time operation updates
              if (['CALL', 'BUZZ'].includes(data.action)) {
                // Play notification sound
                if (audioRef.current && audioRef.current.playNotification) {
                  setTimeout(() => {
                    audioRef.current!.playNotification!()
                  }, 50)
                }
                
                // Add visual feedback
                setRecentlyUpdatedLanes(prev => new Set([...prev, data.laneId.toString()]))
                setTimeout(() => {
                  setRecentlyUpdatedLanes(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(data.laneId.toString())
                    return newSet
                  })
                }, 3000)
              }
              
              // Refresh lane data after operation
              fetchLaneStatus()
            }
          } catch (error) {
            console.error('Error parsing SSE data:', error)
          }
        }

        eventSourceRef.current.onerror = (error) => {
          console.error('SSE connection error:', error)
          setIsConnected(false)
          
          // Retry connection with exponential backoff
          if (connectionRetries < 5) {
            const retryDelay = Math.min(1000 * Math.pow(2, connectionRetries), 30000)
            setTimeout(() => {
              setConnectionRetries(prev => prev + 1)
              connectSSE()
            }, retryDelay)
          } else {
            // Fall back to polling if SSE keeps failing
            console.warn('SSE failed multiple times, falling back to polling')
            startFallbackPolling()
          }
        }
      } catch (error) {
        console.error('Failed to create SSE connection:', error)
        startFallbackPolling()
      }
    }

    connectSSE()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [isPageVisible, connectionRetries, startFallbackPolling])

  // Handle window focus for immediate updates
  useEffect(() => {
    const handleFocus = () => {
      // Reconnect SSE if needed when window gains focus
      if (!isConnected && isPageVisible) {
        window.location.reload() // Simple reconnection strategy
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [isConnected, isPageVisible])

  // Simple time update interval (low resource usage)
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timeInterval)
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchLaneStatus()
  }, [fetchLaneStatus])

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

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Loading display...</p>
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
              <h1 className="text-4xl font-bold">Queue Status Display</h1>
              <p className="text-blue-200 text-lg">Real-time monitoring</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-mono font-bold">
                {formatTime(currentTime)}
              </div>
              <div className="text-blue-200 text-lg">
                {formatDate(currentTime)}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {lanes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-8xl mb-6">🏢</div>
            <h2 className="text-4xl font-bold mb-4">No Active Services</h2>
            <p className="text-2xl text-blue-200">All service lanes are currently closed</p>
          </div>
        ) : (
          /* Responsive Grid - More Lanes Fit On Screen */
          <div className={`grid gap-4 ${
            lanes.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' :
            lanes.length === 2 ? 'grid-cols-2' :
            lanes.length === 3 ? 'grid-cols-2 lg:grid-cols-3' :
            lanes.length === 4 ? 'grid-cols-2 lg:grid-cols-4' :
            'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            {lanes.map((lane) => (
              <Card key={lane.id} className="bg-white bg-opacity-10 backdrop-blur-md border-white border-opacity-20 hover:bg-opacity-20 transition-all duration-300">
                <CardContent className="p-4">
                  {/* Compact Lane Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {lane.name}
                      </h3>
                      {lane.description && (
                        <p className="text-blue-200 text-base">
                          {lane.description}
                        </p>
                      )}
                    </div>
                    <Badge className="bg-green-500 text-white text-sm px-3 py-1">
                      OPEN
                    </Badge>
                  </div>

                  {/* Compact Current Number Display */}
                  <div className={`bg-black bg-opacity-30 rounded-lg p-6 mb-4 text-center transition-all duration-1000 ${
                    recentlyUpdatedLanes.has(lane.id) ? 'ring-2 ring-yellow-400 ring-opacity-75 bg-yellow-400 bg-opacity-20' : ''
                  }`}>
                    <div className="text-blue-200 text-base mb-2">NOW SERVING</div>
                    <div className={`font-bold mb-2 font-mono transition-all duration-500 ${
                      recentlyUpdatedLanes.has(lane.id) ? 'text-yellow-300 animate-pulse' : 'text-yellow-400'
                    }`} style={{ fontSize: '8rem', lineHeight: '1' }}>
                      {lane.currentNumber === 0 ? '---' : lane.currentNumber.toString().padStart(3, '0')}
                    </div>
                    {lane.currentNumber > 0 && (
                      <div className={`${recentlyUpdatedLanes.has(lane.id) ? 'animate-bounce' : 'animate-pulse'}`}>
                        <div className="text-base text-green-400">
                          🔔 Please proceed to {lane.name}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Compact Queue Statistics */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-black bg-opacity-20 rounded p-3 text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {lane.lastServedNumber}
                      </div>
                      <div className="text-blue-200 text-sm">
                        Last
                      </div>
                    </div>
                    
                    <div className="bg-black bg-opacity-20 rounded p-3 text-center">
                      <div className="text-2xl font-bold text-orange-400">
                        {lane.waitingCount}
                      </div>
                      <div className="text-blue-200 text-sm">
                        Waiting
                      </div>
                    </div>
                    
                    <div className="bg-black bg-opacity-20 rounded p-3 text-center">
                      <div className="text-2xl font-bold text-purple-400">
                        {lane.nextNumber}
                      </div>
                      <div className="text-blue-200 text-sm">
                        Next
                      </div>
                    </div>
                  </div>

                  {/* Compact Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm text-blue-200 mb-2">
                      <span>Progress</span>
                      <span>{lane.waitingCount} waiting</span>
                    </div>
                    <div className="w-full bg-black bg-opacity-30 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-500"
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
        <div className="mt-6 text-center">
          <div className="bg-black bg-opacity-20 backdrop-blur-sm rounded-lg p-4 max-w-4xl mx-auto">
            <div className="flex flex-wrap justify-center gap-8 text-lg text-blue-200">
              <span>🔔 Listen for your number</span>
              <span>👀 Watch this screen</span>
              <span>❓ Missed call? Approach counter</span>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status Indicator */}
      <div className="fixed bottom-3 right-3 bg-black bg-opacity-50 text-white px-4 py-3 rounded-lg">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${
            isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
          }`}></div>
          <span className="text-sm">
            {isConnected ? 'Live' : 'Reconnecting...'}
          </span>
        </div>
      </div>

      {/* Compact Sound Notification */}
      {recentlyUpdatedLanes.size > 0 && (
        <div className="fixed bottom-3 left-3 bg-yellow-500 bg-opacity-90 text-black px-6 py-3 rounded-lg animate-bounce">
          <div className="flex items-center">
            <div className="text-2xl mr-3">🔔</div>
            <span className="font-bold text-lg">New Number!</span>
          </div>
        </div>
      )}
    </div>
  )
}
