import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { QueueItemStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const { laneId } = await request.json()

    if (!laneId) {
      return NextResponse.json(
        { error: 'Lane ID is required' },
        { status: 400 }
      )
    }

    const lane = await prisma.lane.findUnique({
      where: { id: laneId }
    })

    if (!lane || !lane.isActive) {
      return NextResponse.json(
        { error: 'Lane not found or inactive' },
        { status: 404 }
      )
    }

    // Get the next queue number
    const lastQueueItem = await prisma.queueItem.findFirst({
      where: { laneId },
      orderBy: { number: 'desc' }
    })

    const nextNumber = (lastQueueItem?.number || 0) + 1

    // Create queue item
    await prisma.queueItem.create({
      data: {
        laneId,
        number: nextNumber,
        status: QueueItemStatus.WAITING
      }
    })

    // Calculate waiting count (people ahead of this person)
    const waitingCount = await prisma.queueItem.count({
      where: {
        laneId,
        status: QueueItemStatus.WAITING,
        number: {
          lt: nextNumber
        }
      }
    })

    return NextResponse.json({
      queueNumber: nextNumber,
      laneName: lane.name,
      currentNumber: lane.currentNumber,
      waitingCount: waitingCount,
      estimatedWait: waitingCount * 5 // Assume 5 minutes per person
    }, { status: 201 })
  } catch (error) {
    console.error('Get queue number error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get current queue status for all active lanes
    const lanes = await prisma.lane.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        currentNumber: true,
        lastServedNumber: true,
        queueItems: {
          where: {
            status: {
              in: [QueueItemStatus.WAITING, QueueItemStatus.CALLED]
            }
          },
          select: {
            number: true,
            status: true
          },
          orderBy: {
            number: 'asc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    const laneStatus = lanes.map(lane => ({
      id: lane.id,
      name: lane.name,
      description: lane.description,
      currentNumber: lane.currentNumber,
      lastServedNumber: lane.lastServedNumber,
      waitingCount: lane.queueItems.filter(item => item.status === QueueItemStatus.WAITING).length,
      calledCount: lane.queueItems.filter(item => item.status === QueueItemStatus.CALLED).length,
      nextNumber: Math.max(...lane.queueItems.map(item => item.number), 0) + 1
    }))

    return NextResponse.json(laneStatus)
  } catch (error) {
    console.error('Get queue status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
