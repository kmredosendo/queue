import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, hasRole } from '@/lib/auth'
import { UserRole, LaneType } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const currentUser = await getCurrentUser(request)
    if (!currentUser || !hasRole(currentUser.role, [UserRole.ADMIN])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, isActive, type } = await request.json()
    const laneId = parseInt(resolvedParams.id)

    if (isNaN(laneId)) {
      return NextResponse.json({ error: 'Invalid lane ID' }, { status: 400 })
    }

    // Prepare update data
    const updateData: {
      name?: string
      description?: string
      isActive?: boolean
      type?: LaneType
    } = {}
    
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (isActive !== undefined) updateData.isActive = isActive
    if (type !== undefined) updateData.type = type as LaneType

    const updatedLane = await prisma.lane.update({
      where: { id: laneId },
      data: updateData,
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
        },
        queueItems: {
          where: {
            status: {
              in: ['WAITING', 'CALLED']
            }
          },
          select: {
            number: true,
            status: true
          }
        }
      }
    })

    return NextResponse.json(updatedLane)
  } catch (error) {
    console.error('Error updating lane:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const currentUser = await getCurrentUser(request)
    if (!currentUser || !hasRole(currentUser.role, [UserRole.ADMIN])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const laneId = parseInt(resolvedParams.id)

    if (isNaN(laneId)) {
      return NextResponse.json({ error: 'Invalid lane ID' }, { status: 400 })
    }

    // Check if lane exists
    const lane = await prisma.lane.findUnique({
      where: { id: laneId },
      include: {
        assignedUsers: true,
        queueItems: {
          where: {
            status: {
              in: ['WAITING', 'CALLED']
            }
          }
        }
      }
    })

    if (!lane) {
      return NextResponse.json({ error: 'Lane not found' }, { status: 404 })
    }

    // Check if lane has active queue items
    if (lane.queueItems.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete lane with active queue items. Please complete or clear all queue items first.' },
        { status: 400 }
      )
    }

    // Delete lane assignments first (due to foreign key constraints)
    await prisma.laneUser.deleteMany({
      where: { laneId }
    })

    // Delete the lane
    await prisma.lane.delete({
      where: { id: laneId }
    })

    return NextResponse.json({ 
      message: 'Lane deleted successfully',
      deletedLaneId: laneId
    })
  } catch (error) {
    console.error('Error deleting lane:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
