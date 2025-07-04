import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// Store active connections
const connections = new Set<ReadableStreamDefaultController>()

// Helper function to broadcast to all connections
export function broadcastQueueUpdate(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`
  connections.forEach(controller => {
    try {
      controller.enqueue(new TextEncoder().encode(message))
    } catch (error) {
      // Remove dead connections
      connections.delete(controller)
    }
  })
}

export async function GET(request: NextRequest) {
  // Set up Server-Sent Events headers
  const responseHeaders = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  })

  let controller: ReadableStreamDefaultController

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl
      connections.add(controller)

      // Send initial connection message
      const welcomeMessage = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`
      controller.enqueue(new TextEncoder().encode(welcomeMessage))

      // Send initial lane data
      fetchAndSendLaneData(controller)
    },
    cancel() {
      connections.delete(controller)
    }
  })

  return new Response(stream, { headers: responseHeaders })
}

async function fetchAndSendLaneData(controller: ReadableStreamDefaultController) {
  try {
    // Fetch current lane status
    const lanes = await prisma.lane.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        currentNumber: true,
        lastServedNumber: true,
      }
    })

    // Calculate queue statistics for each lane
    const laneStatuses = await Promise.all(
      lanes.map(async (lane) => {
        const [waitingCount, calledCount] = await Promise.all([
          prisma.queueItem.count({
            where: {
              laneId: lane.id,
              status: 'WAITING'
            }
          }),
          prisma.queueItem.count({
            where: {
              laneId: lane.id,
              status: 'CALLED'
            }
          })
        ])

        const nextQueueItem = await prisma.queueItem.findFirst({
          where: {
            laneId: lane.id,
            status: 'WAITING'
          },
          orderBy: { number: 'asc' }
        })

        return {
          id: lane.id.toString(),
          name: lane.name,
          description: lane.description,
          currentNumber: lane.currentNumber,
          lastServedNumber: lane.lastServedNumber,
          waitingCount,
          calledCount,
          nextNumber: nextQueueItem?.number || lane.currentNumber + 1
        }
      })
    )

    // Send lane data
    const message = `data: ${JSON.stringify({ 
      type: 'lanes_update', 
      lanes: laneStatuses,
      timestamp: new Date().toISOString()
    })}\n\n`
    
    controller.enqueue(new TextEncoder().encode(message))
  } catch (error) {
    console.error('Error fetching lane data for SSE:', error)
  }
}

// Export the broadcast function for use in other API routes
export { fetchAndSendLaneData }
