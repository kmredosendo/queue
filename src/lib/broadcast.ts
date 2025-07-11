// Broadcast full lane data to all connections
export async function broadcastAllLaneData() {
  for (const controller of connections) {
    await fetchAndSendLaneData(controller);
  }
}
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
    // Use queueDate (UTC midnight) for daily queue logic
    const now = new Date();
    const queueDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

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
    });

    // Calculate queue statistics for each lane (today only)
    const laneStatuses = await Promise.all(
      lanes.map(async (lane) => {
        const [waitingCount, calledCount] = await Promise.all([
          prisma.queueItem.count({
            where: {
              laneId: lane.id,
              status: 'WAITING',
              queueDate: queueDate
            }
          }),
          prisma.queueItem.count({
            where: {
              laneId: lane.id,
              status: 'CALLED',
              queueDate: queueDate
            }
          })
        ]);

        // Find the lowest waiting number for today
        // ...existing code...

        // Find the highest number for today
        const lastQueueItemToday = await prisma.queueItem.findFirst({
          where: {
            laneId: lane.id,
            queueDate: queueDate
          },
          orderBy: { number: 'desc' }
        });

        let nextNumber = 1;
        if (lastQueueItemToday) {
          if (lastQueueItemToday.number >= 999) {
            nextNumber = 1;
          } else {
            nextNumber = lastQueueItemToday.number + 1;
          }
        }

        return {
          id: lane.id.toString(),
          name: lane.name,
          description: lane.description,
          currentNumber: lane.currentNumber,
          lastServedNumber: lane.lastServedNumber,
          waitingCount,
          calledCount,
          nextNumber
        };
      })
    );

    const message = `data: ${JSON.stringify({ type: 'lanes_update', lanes: laneStatuses })}\n\n`
    controller.enqueue(new TextEncoder().encode(message))
  } catch (error) {
    console.error('Error fetching lane data for SSE:', error)
    const errorMessage = `data: ${JSON.stringify({ type: 'error', message: 'Failed to fetch lane data' })}\n\n`
    controller.enqueue(new TextEncoder().encode(errorMessage))
  }
}
