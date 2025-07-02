import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since')
    
    // Get recent queue operations (last 10 seconds if since is provided, otherwise last 30 seconds)
    const sinceTime = since ? new Date(since) : new Date(Date.now() - 30000)
    
    const recentOperations = await prisma.queueOperation.findMany({
      where: {
        createdAt: {
          gte: sinceTime
        }
      },
      include: {
        lane: {
          select: {
            id: true,
            name: true,
            currentNumber: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(recentOperations)
  } catch (error) {
    console.error('Error fetching queue operations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
