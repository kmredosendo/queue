import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, hasRole } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { QueuePrinter } from '@/lib/printer'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser || !hasRole(currentUser.role, [UserRole.USER, UserRole.ADMIN])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { printerInterface } = await request.json()

    try {
      const printer = new QueuePrinter()
      
      // Set custom printer interface if provided
      if (printerInterface) {
        printer.setPrinterInterface(printerInterface)
      }

      const success = await printer.testPrint()

      if (success) {
        return NextResponse.json({ 
          success: true, 
          message: 'Test print completed successfully'
        })
      } else {
        return NextResponse.json(
          { error: 'Test print failed' },
          { status: 500 }
        )
      }
    } catch (printError) {
      console.error('Test print error:', printError)
      return NextResponse.json(
        { 
          error: 'Printer error', 
          details: printError instanceof Error ? printError.message : 'Unknown printer error'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Test print API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
