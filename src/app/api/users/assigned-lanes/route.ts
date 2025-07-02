import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, hasRole } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser || !hasRole(currentUser.role, [UserRole.USER, UserRole.ADMIN])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's assigned lane (single lane only) with queue details
    const assignedLane = await prisma.laneUser.findFirst({
      where: {
        userId: currentUser.id,
        lane: {
          isActive: true  // Only active lanes
        }
      },
      include: {
        lane: {
          include: {
            queueItems: {
              where: {
                status: {
                  in: ['WAITING', 'CALLED']
                }
              },
              orderBy: {
                number: 'asc'
              }
            }
          }
        }
      }
    })

    // Transform the data to match the Lane interface - return array for consistency  
    const lanes = assignedLane ? [{
      id: assignedLane.lane.id,
      name: assignedLane.lane.name,
      description: assignedLane.lane.description,
      currentNumber: assignedLane.lane.currentNumber,
      lastServedNumber: assignedLane.lane.lastServedNumber,
      queueItems: assignedLane.lane.queueItems.map((item: { number: number; status: string }) => ({
        number: item.number,
        status: item.status
      }))
    }] : []

    return NextResponse.json(lanes)
  } catch (error) {
    console.error('Error fetching assigned lanes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
