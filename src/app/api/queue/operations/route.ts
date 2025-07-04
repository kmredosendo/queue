import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, hasRole } from '@/lib/auth'
import { UserRole, QueueItemStatus } from '@prisma/client'
import { broadcastQueueUpdate } from '@/lib/broadcast'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser || !hasRole(currentUser.role, [UserRole.USER, UserRole.ADMIN])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, laneId } = await request.json()

    if (!action || !laneId) {
      return NextResponse.json(
        { error: 'Action and lane ID are required' },
        { status: 400 }
      )
    }

    // Check if user is assigned to this lane (unless admin)
    if (currentUser.role !== UserRole.ADMIN) {
      const isAssigned = currentUser.assignedLanes.some(
        (assignment) => assignment.laneId === laneId
      )
      if (!isAssigned) {
        return NextResponse.json(
          { error: 'Not assigned to this lane' },
          { status: 403 }
        )
      }
    }

    const lane = await prisma.lane.findUnique({
      where: { id: laneId }
    })

    if (!lane) {
      return NextResponse.json(
        { error: 'Lane not found' },
        { status: 404 }
      )
    }

    let result: { currentNumber?: number; servedNumber?: number } = {}

    switch (action) {
      case 'NEXT':
        // Advance to next number
        const nextNumber = lane.currentNumber + 1
        
        await prisma.$transaction(async (tx) => {
          // Update lane current number
          await tx.lane.update({
            where: { id: laneId },
            data: { currentNumber: nextNumber }
          })

          // Mark current queue item as called
          const queueItem = await tx.queueItem.findFirst({
            where: {
              laneId,
              number: nextNumber
            }
          })

          if (queueItem) {
            await tx.queueItem.update({
              where: { id: queueItem.id },
              data: {
                status: QueueItemStatus.CALLED,
                calledAt: new Date()
              }
            })
          }

          // Log operation
          await tx.queueOperation.create({
            data: {
              userId: currentUser.id,
              laneId,
              action: 'NEXT',
              number: nextNumber
            }
          })
        })

        result = { currentNumber: nextNumber }
        break

      case 'CALL':
        // Re-call current number
        await prisma.queueOperation.create({
          data: {
            userId: currentUser.id,
            laneId,
            action: 'CALL',
            number: lane.currentNumber
          }
        })
        result = { currentNumber: lane.currentNumber }
        break

      case 'BUZZ':
        // Buzz current number
        await prisma.queueOperation.create({
          data: {
            userId: currentUser.id,
            laneId,
            action: 'BUZZ',
            number: lane.currentNumber
          }
        })
        result = { currentNumber: lane.currentNumber }
        break

      case 'SERVE':
        // Mark current number as served
        await prisma.$transaction(async (tx) => {
          const queueItem = await tx.queueItem.findFirst({
            where: {
              laneId,
              number: lane.currentNumber
            }
          })

          if (queueItem) {
            await tx.queueItem.update({
              where: { id: queueItem.id },
              data: {
                status: QueueItemStatus.SERVED,
                servedAt: new Date()
              }
            })
          }

          await tx.lane.update({
            where: { id: laneId },
            data: { lastServedNumber: lane.currentNumber }
          })

          await tx.queueOperation.create({
            data: {
              userId: currentUser.id,
              laneId,
              action: 'SERVE',
              number: lane.currentNumber
            }
          })
        })

        result = { servedNumber: lane.currentNumber }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Broadcast the update to all connected display clients
    try {
      broadcastQueueUpdate({
        type: 'operation',
        action,
        laneId,
        result,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to broadcast queue update:', error)
      // Don't fail the operation if broadcast fails
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Queue operation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
