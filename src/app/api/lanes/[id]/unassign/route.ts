import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, hasRole } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const currentUser = await getCurrentUser(request)
    if (!currentUser || !hasRole(currentUser.role, [UserRole.ADMIN])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await request.json()
    const laneId = parseInt(resolvedParams.id)

    if (isNaN(laneId)) {
      return NextResponse.json({ error: 'Invalid lane ID' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if assignment exists
    const existingAssignment = await prisma.laneUser.findUnique({
      where: {
        userId_laneId: {
          userId: parseInt(userId),
          laneId
        }
      }
    })

    if (!existingAssignment) {
      return NextResponse.json(
        { error: 'User is not assigned to this lane' },
        { status: 404 }
      )
    }

    // Remove the assignment
    await prisma.laneUser.delete({
      where: {
        id: existingAssignment.id
      }
    })

    // Return updated lane with assignments
    const updatedLane = await prisma.lane.findUnique({
      where: { id: laneId },
      include: {
        assignedUsers: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                role: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ 
      message: 'User unassigned from lane successfully',
      lane: updatedLane
    })
  } catch (error) {
    console.error('Error unassigning user from lane:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
