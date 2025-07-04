import { prisma } from '@/lib/prisma'

// SSE broadcast utility for real-time queue updates
// Store active connections
const connections = new Set<ReadableStreamDefaultController>()

// Helper function to broadcast to all connections
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function broadcastQueueUpdate(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`
  connections.forEach(controller => {
    try {
      controller.enqueue(new TextEncoder().encode(message))
    } catch {
      // Remove dead connections
      connections.delete(controller)
    }
  })
}

// Add connection to broadcast list
export function addConnection(controller: ReadableStreamDefaultController) {
  connections.add(controller)
}

// Remove connection from broadcast list
export function removeConnection(controller: ReadableStreamDefaultController) {
  connections.delete(controller)
}

// Get current connection count
export function getConnectionCount() {
  return connections.size
}

// Fetch and send lane data to a specific connection
export async function fetchAndSendLaneData(controller: ReadableStreamDefaultController) {
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
          nextNumber: nextQueueItem?.number || (lane.currentNumber === 0 ? 1 : lane.currentNumber + 1)
        }
      })
    )

    const message = `data: ${JSON.stringify({ type: 'lanes_update', lanes: laneStatuses })}\n\n`
    controller.enqueue(new TextEncoder().encode(message))
  } catch (error) {
    console.error('Error fetching lane data for SSE:', error)
    const errorMessage = `data: ${JSON.stringify({ type: 'error', message: 'Failed to fetch lane data' })}\n\n`
    controller.enqueue(new TextEncoder().encode(errorMessage))
  }
}
