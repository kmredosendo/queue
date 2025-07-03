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

    // Get all user's assigned lanes with queue details
    const assignedLanes = await prisma.laneUser.findMany({
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
      },
      orderBy: {
        lane: {
          type: 'asc' // Regular lanes first, then PWD_SENIOR
        }
      }
    })

    // Transform the data to match the Lane interface
    const lanes = assignedLanes.map(assignment => ({
      id: assignment.lane.id,
      name: assignment.lane.name,
      description: assignment.lane.description,
      type: assignment.lane.type,
      currentNumber: assignment.lane.currentNumber,
      lastServedNumber: assignment.lane.lastServedNumber,
      queueItems: assignment.lane.queueItems.map((item: { number: number; status: string }) => ({
        number: item.number,
        status: item.status
      }))
    }))

    return NextResponse.json(lanes)
  } catch (error) {
    console.error('Error fetching assigned lanes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
