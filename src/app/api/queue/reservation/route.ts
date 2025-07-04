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

    // Get today's date range (start and end of day)
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    // Get the highest queue number from today only
    const lastQueueItemToday = await prisma.queueItem.findFirst({
      where: { 
        laneId,
        createdAt: {
          gte: startOfDay,
          lt: endOfDay
        }
      },
      orderBy: { number: 'desc' }
    })

    // Calculate next number with daily reset and 999 max limit (simple cycling)
    let nextNumber = 1
    if (lastQueueItemToday) {
      if (lastQueueItemToday.number >= 999) {
        // After 999, cycle back to 1
        nextNumber = 1
      } else {
        nextNumber = lastQueueItemToday.number + 1
      }
    }

    // Create queue item
    await prisma.queueItem.create({
      data: {
        laneId,
        number: nextNumber,
        status: QueueItemStatus.WAITING
      }
    })

    // Calculate waiting count (people ahead of this person in today's queue)
    const waitingCount = await prisma.queueItem.count({
      where: {
        laneId,
        status: QueueItemStatus.WAITING,
        number: {
          lt: nextNumber
        },
        createdAt: {
          gte: startOfDay,
          lt: endOfDay
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
    // Get today's date range (start and end of day)
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    // Get current queue status for all active lanes (today's data only)
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
            },
            createdAt: {
              gte: startOfDay,
              lt: endOfDay
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

    const laneStatus = lanes.map(lane => {
      const waitingItems = lane.queueItems.filter(item => item.status === QueueItemStatus.WAITING)
      const calledItems = lane.queueItems.filter(item => item.status === QueueItemStatus.CALLED)
      
      // Calculate next number with simple cycling (1-999, then back to 1)
      const maxNumberToday = Math.max(...lane.queueItems.map(item => item.number), 0)
      let nextNumber = maxNumberToday + 1
      
      // If we would exceed 999, cycle back to 1
      if (nextNumber > 999) {
        nextNumber = 1
      }

      return {
        id: lane.id,
        name: lane.name,
        description: lane.description,
        currentNumber: lane.currentNumber,
        lastServedNumber: lane.lastServedNumber,
        waitingCount: waitingItems.length,
        calledCount: calledItems.length,
        nextNumber: nextNumber
      }
    })

    return NextResponse.json(laneStatus)
  } catch (error) {
    console.error('Get queue status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
