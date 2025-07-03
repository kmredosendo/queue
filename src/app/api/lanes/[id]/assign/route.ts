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

    // Check if user exists and has USER role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.role !== UserRole.USER) {
      return NextResponse.json(
        { error: 'Only users with USER role can be assigned to lanes' },
        { status: 400 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Cannot assign inactive user to lane' },
        { status: 400 }
      )
    }

    // Check if lane exists
    const lane = await prisma.lane.findUnique({
      where: { id: laneId }
    })

    if (!lane) {
      return NextResponse.json(
        { error: 'Lane not found' },
        { status: 404 }
      )
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.laneUser.findUnique({
      where: {
        userId_laneId: {
          userId,
          laneId
        }
      }
    })

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'User is already assigned to this lane' },
        { status: 409 }
      )
    }

    // Create the assignment
    await prisma.laneUser.create({
      data: {
        userId: parseInt(userId),
        laneId
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
      message: 'User assigned to lane successfully',
      lane: updatedLane
    })
  } catch (error) {
    console.error('Error assigning user to lane:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
