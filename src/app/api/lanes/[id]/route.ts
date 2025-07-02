import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, hasRole } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser || !hasRole(currentUser.role, [UserRole.ADMIN])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, isActive } = await request.json()
    const laneId = params.id

    // Prepare update data
    const updateData: {
      name?: string
      description?: string
      isActive?: boolean
    } = {}
    
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (isActive !== undefined) updateData.isActive = isActive

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
