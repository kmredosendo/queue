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

    // Get today's date range (start and end of day)
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    // Get all user's assigned lanes with queue details (today only)
    const assignedLanes = await prisma.laneUser.findMany({
      where: {
        userId: currentUser.id,
        lane: {
          isActive: true
        }
      },
      include: {
        lane: {
          include: {
            queueItems: {
              where: {
                createdAt: {
                  gte: startOfDay,
                  lt: endOfDay
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
          type: 'asc'
        }
      }
    })

    // Transform the data to match the Lane interface, computing numbers from today's queue items
    const lanes = assignedLanes.map(assignment => {
      const queueItems = assignment.lane.queueItems
      const calledItems = queueItems.filter(item => item.status === 'CALLED')
      // currentNumber: highest CALLED number today, or 0 if none
      const calledNumbers = calledItems.map(item => item.number)
      const currentNumber = calledNumbers.length > 0 ? Math.max(...calledNumbers) : 0
      // lastServedNumber: highest number today with any status except WAITING, or 0 if none
      const nonWaitingNumbers = queueItems.filter(item => item.status !== 'WAITING').map(item => item.number)
      const lastServedNumber = nonWaitingNumbers.length > 0 ? Math.max(...nonWaitingNumbers) : 0
      return {
        id: assignment.lane.id,
        name: assignment.lane.name,
        description: assignment.lane.description,
        type: assignment.lane.type,
        currentNumber,
        lastServedNumber,
        queueItems: queueItems.map((item: { number: number; status: string }) => ({
          number: item.number,
          status: item.status
        }))
      }
    })

    return NextResponse.json(lanes)
  } catch (error) {
    console.error('Error fetching assigned lanes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
