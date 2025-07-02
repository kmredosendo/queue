import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, hasRole } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { QueuePrinter } from '@/lib/printer'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser || !hasRole(currentUser.role, [UserRole.USER, UserRole.ADMIN])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const printerInterface = searchParams.get('interface')

    try {
      const printer = new QueuePrinter()
      
      // Set custom printer interface if provided
      if (printerInterface) {
        printer.setPrinterInterface(printerInterface)
      }

      const status = await printer.checkPrinterStatus()

      return NextResponse.json(status)
    } catch (error) {
      console.error('Printer status check error:', error)
      return NextResponse.json({
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  } catch (error) {
    console.error('Printer status API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
