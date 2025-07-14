import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resetLaneNumbersOncePerDay } from '@/lib/laneReset'
import { getCurrentUser, hasRole } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    await resetLaneNumbersOncePerDay();
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lanes = await prisma.lane.findMany({
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
          orderBy: {
            number: 'asc'
          }
        }
      },
      orderBy: [
        { name: 'asc' }
      ]
    })

    return NextResponse.json(lanes)
  } catch (error) {
    console.error('Get lanes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser || !hasRole(currentUser.role, [UserRole.ADMIN])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Lane name is required' },
        { status: 400 }
      )
    }

    const lane = await prisma.lane.create({
      data: {
        name,
        description
      },
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

    return NextResponse.json(lane, { status: 201 })
  } catch (error) {
    console.error('Create lane error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
