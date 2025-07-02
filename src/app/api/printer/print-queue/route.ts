import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, hasRole } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { QueuePrinter } from '@/lib/printer'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser || !hasRole(currentUser.role, [UserRole.USER, UserRole.ADMIN, UserRole.RESERVATION])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { queueNumber, laneName, customerName, estimatedWait, currentNumber, waitingCount, printerInterface } = await request.json()

    if (!queueNumber || !laneName) {
      return NextResponse.json(
        { error: 'Queue number and lane name are required' },
        { status: 400 }
      )
    }

    try {
      const printer = new QueuePrinter()
      
      // Set custom printer interface if provided
      if (printerInterface) {
        printer.setPrinterInterface(printerInterface)
      }

      const success = await printer.printQueueNumber({
        queueNumber,
        laneName,
        customerName,
        currentTime: new Date(),
        estimatedWait,
        currentNumber,
        waitingCount
      })

      if (success) {
        return NextResponse.json({ 
          success: true, 
          message: 'Queue number printed successfully',
          queueNumber,
          laneName
        })
      } else {
        return NextResponse.json(
          { error: 'Failed to print queue number' },
          { status: 500 }
        )
      }
    } catch (printError) {
      console.error('Print error:', printError)
      return NextResponse.json(
        { 
          error: 'Printer error', 
          details: printError instanceof Error ? printError.message : 'Unknown printer error'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Print queue number API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
