import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

import { QueueItemStatus } from '@prisma/client'
import { broadcastAllLaneData } from '@/lib/broadcast'

export async function POST(request: NextRequest) {
  try {
    let { laneId } = await request.json();
    // Ensure laneId is an integer (Prisma expects Int, not string)
    if (typeof laneId === 'string') laneId = parseInt(laneId, 10);

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

    // Use queueDate (UTC midnight) for daily queue logic
    const now = new Date();
    const queueDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));


    // Find the highest queue number for today for this lane (using queueDate)
    const lastQueueItemToday = await prisma.queueItem.findFirst({
      where: {
        laneId: laneId,
        queueDate: queueDate
      },
      orderBy: { number: 'desc' }
    });

    // Calculate next number with daily reset and 999 max limit (wraps to 1)
    let nextNumber = 1;
    if (lastQueueItemToday) {
      if (lastQueueItemToday.number >= 999) {
        nextNumber = 1;
      } else {
        nextNumber = lastQueueItemToday.number + 1;
      }
    }


    // Ensure the next number is not already used for today (handle rare race conditions)
    let attempts = 0;
    let createdItem = null;
    while (attempts < 999) {
      try {
        createdItem = await prisma.queueItem.create({
          data: {
            laneId,
            number: nextNumber,
            queueDate: queueDate,
            status: QueueItemStatus.WAITING
          }
        });
        break; // Success
      } catch (error) {
        // Prisma error type
        if ((error as { code?: string }).code === 'P2002') {
          // Unique constraint failed, try next number
          nextNumber = nextNumber >= 999 ? 1 : nextNumber + 1;
          attempts++;
        } else {
          throw error;
        }
      }
    }
    if (!createdItem) {
      return NextResponse.json({ error: 'All queue numbers for today are in use. Please contact admin.' }, { status: 400 });
    }

    // Broadcast full lane update to all display clients (SSE)
    await broadcastAllLaneData();

    // Calculate waiting count (people ahead of this person in today's queue)
    const waitingCount = await prisma.queueItem.count({
      where: {
        laneId,
        status: QueueItemStatus.WAITING,
        number: {
          lt: nextNumber
        },
        queueDate: queueDate
      }
    })

    const responseObj = {
      queueNumber: nextNumber,
      laneName: lane.name,
      currentNumber: lane.currentNumber,
      waitingCount: waitingCount,
      estimatedWait: waitingCount * 5 // Assume 5 minutes per person
    };
    return NextResponse.json(responseObj, { status: 201 })
  } catch (error) {
    console.error('Get queue number error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Use queueDate (UTC midnight) for daily queue logic
    const now = new Date();
    const queueDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Get current queue status for all active lanes (today's data only)
    const lanes = await prisma.lane.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        queueItems: {
          where: {
            queueDate: queueDate
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
      // Only consider today's queue items
      const waitingItems = lane.queueItems.filter(item => item.status === QueueItemStatus.WAITING)
      const calledItems = lane.queueItems.filter(item => item.status === QueueItemStatus.CALLED)
      const allNumbers = lane.queueItems.map(item => item.number)
      // currentNumber: highest CALLED number today, or 0 if none
      const calledNumbers = lane.queueItems.filter(item => item.status === QueueItemStatus.CALLED).map(item => item.number)
      const currentNumber = calledNumbers.length > 0 ? Math.max(...calledNumbers) : 0
      // lastServedNumber: highest number today with any status except WAITING, or 0 if none
      const nonWaitingNumbers = lane.queueItems.filter(item => item.status !== QueueItemStatus.WAITING).map(item => item.number)
      const lastServedNumber = nonWaitingNumbers.length > 0 ? Math.max(...nonWaitingNumbers) : 0
      // Calculate next number with simple cycling (1-999, then back to 1)
      const maxNumberToday = allNumbers.length > 0 ? Math.max(...allNumbers) : 0
      let nextNumber = maxNumberToday + 1
      if (nextNumber > 999) {
        nextNumber = 1
      }

      return {
        id: lane.id,
        name: lane.name,
        description: lane.description,
        currentNumber,
        lastServedNumber,
        waitingCount: waitingItems.length,
        calledCount: calledItems.length,
        nextNumber
      }
    })

    return NextResponse.json(laneStatus)
  } catch (error) {
    console.error('Get queue status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
