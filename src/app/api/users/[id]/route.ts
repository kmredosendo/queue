import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, hasRole } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser || !hasRole(currentUser.role, [UserRole.ADMIN])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, email, role, password, isActive } = await request.json()
    const userId = params.id

    // Prepare update data
    const updateData: {
      name?: string
      email?: string
      role?: UserRole
      password?: string
      isActive?: boolean
    } = {}
    
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (role !== undefined) updateData.role = role
    if (isActive !== undefined) updateData.isActive = isActive
    
    // Only hash and update password if provided
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        assignedLanes: {
          include: {
            lane: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userResponse } = updatedUser

    return NextResponse.json(userResponse)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
