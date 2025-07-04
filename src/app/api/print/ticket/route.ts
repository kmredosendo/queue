import { NextRequest, NextResponse } from 'next/server'

interface PrintTicketRequest {
  queueNumber: number
  laneName: string
  currentNumber: number
  timestamp: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('🎫 Ticket print request received')
    const { queueNumber, laneName, currentNumber, timestamp }: PrintTicketRequest = await request.json()
    console.log('📋 Ticket data:', { queueNumber, laneName, currentNumber, timestamp })

    if (typeof window === 'undefined') {
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)
      
      console.log('🖨️ Starting ticket print...')
      
      // Create a simple text file (no ESC/POS commands)
      const fs = await import('fs')
      const path = await import('path')
      const os = await import('os')
      
      const tempDir = os.tmpdir()
      const ticketFile = path.join(tempDir, `ticket-${Date.now()}.txt`)
      
      // Format timestamp to match your layout
      const formattedDate = new Date(timestamp).toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })

      // Create ticket data for structured printing (will be used in PowerShell)
      const ticketData = {
        title: "Queue Ticket",
        subtitle: "Please keep this ticket until your number is called",
        separator: "===============================",
        date: formattedDate,
        queueNumber: queueNumber.toString(),
        serviceName: laneName,
        instructions1: "Please listen to your number or watch the display screen",
        instructions2: "If you miss your call, please approach the service counter"
      }
      
      
      // Don't create a text file, we'll format directly in PowerShell
      console.log('📄 Preparing ticket data for PowerShell formatting')
      
      const epsonPrinter = 'EPSON TM-T88IV Receipt'
      
      try {
        // Create PowerShell script file with structured printing
        const psScriptFile = path.join(tempDir, `print-${Date.now()}.ps1`)
        
        const psScriptContent = `
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$printerName = "${epsonPrinter}"

# Ticket data from Node.js
$title = "${ticketData.title}"
$subtitle = "${ticketData.subtitle}" 
$separator = "${ticketData.separator}"
$date = "${ticketData.date}"
$queueNumber = "${ticketData.queueNumber}"
$serviceName = "${ticketData.serviceName}"
$instructions1 = "${ticketData.instructions1}"
$instructions2 = "${ticketData.instructions2}"

try {
    Write-Host "Setting up structured ticket printing..."
    
    $printDoc = New-Object System.Drawing.Printing.PrintDocument
    $printDoc.PrinterSettings.PrinterName = $printerName
    
    # Check if printer exists
    if (-not $printDoc.PrinterSettings.IsValid) {
        Write-Host "ERROR: Printer '$printerName' not found or not available"
        exit 1
    }
    
    $printDoc.add_PrintPage({
        param($sender, $e)
        
        # Define fonts according to your layout specs
        $titleFont = New-Object System.Drawing.Font("Arial", 14, [System.Drawing.FontStyle]::Bold)
        $subtitleFont = New-Object System.Drawing.Font("Arial", 8, [System.Drawing.FontStyle]::Regular)
        $dateFont = New-Object System.Drawing.Font("Arial", 12, [System.Drawing.FontStyle]::Regular)
        $queueNumberFont = New-Object System.Drawing.Font("Arial", 48, [System.Drawing.FontStyle]::Bold)
        $serviceFont = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Bold)
        $instructionFont = New-Object System.Drawing.Font("Arial", 8, [System.Drawing.FontStyle]::Regular)
        $separatorFont = New-Object System.Drawing.Font("Courier New", 10, [System.Drawing.FontStyle]::Regular)
        
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
        
        # Get paper width for centering (typical receipt width is about 280 points)
        $paperWidth = 280
        $leftMargin = 10
        $y = 20
        
        # Helper function to center text
        function Get-CenterX($text, $font, $graphics) {
            $textSize = $graphics.MeasureString($text, $font)
            return ($paperWidth - $textSize.Width) / 2
        }
        
        # 1. Title: "Queue Ticket" (Bold, 14, Center)
        $titleX = Get-CenterX $title $titleFont $e.Graphics
        $e.Graphics.DrawString($title, $titleFont, $brush, $titleX, $y)
        $y += 25
        
        # 2. Subtitle: "Please keep this ticket..." (8, Center) 
        $subtitleX = Get-CenterX $subtitle $subtitleFont $e.Graphics
        $e.Graphics.DrawString($subtitle, $subtitleFont, $brush, $subtitleX, $y)
        $y += 20
        
        # 3. Separator line
        $separatorX = Get-CenterX $separator $separatorFont $e.Graphics
        $e.Graphics.DrawString($separator, $separatorFont, $brush, $separatorX, $y)
        $y += 20
        
        # 4. Date (12, Center)
        $dateX = Get-CenterX $date $dateFont $e.Graphics
        $e.Graphics.DrawString($date, $dateFont, $brush, $dateX, $y)
        $y += 30
        
        # 5. Queue Number (Bold, 48, Center) - This is the big number
        $queueNumberX = Get-CenterX $queueNumber $queueNumberFont $e.Graphics
        $e.Graphics.DrawString($queueNumber, $queueNumberFont, $brush, $queueNumberX, $y)
        $y += 70
        
        # 6. Service Name (Bold, 16, Center)
        $serviceX = Get-CenterX $serviceName $serviceFont $e.Graphics
        $e.Graphics.DrawString($serviceName, $serviceFont, $brush, $serviceX, $y)
        $y += 25
        
        # 7. Separator line
        $separatorX = Get-CenterX $separator $separatorFont $e.Graphics
        $e.Graphics.DrawString($separator, $separatorFont, $brush, $separatorX, $y)
        $y += 20
        
        # 8. Instructions line 1 (8, Center)
        $inst1X = Get-CenterX $instructions1 $instructionFont $e.Graphics
        $e.Graphics.DrawString($instructions1, $instructionFont, $brush, $inst1X, $y)
        $y += 15
        
        # 9. Instructions line 2 (8, Center)
        $inst2X = Get-CenterX $instructions2 $instructionFont $e.Graphics
        $e.Graphics.DrawString($instructions2, $instructionFont, $brush, $inst2X, $y)
        
        $e.HasMorePages = $false
    })
    
    $printDoc.Print()
    Write-Host "SUCCESS: Formatted ticket sent to printer"
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    exit 1
}
`
        
        fs.writeFileSync(psScriptFile, psScriptContent, 'utf8')
        console.log('📜 PowerShell script file created:', psScriptFile)
        
        console.log('🖨️ Executing PowerShell script file...')
        const { stdout: psOut, stderr: psErr } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${psScriptFile}"`)
        
        console.log('📤 PowerShell stdout: "' + psOut.trim() + '"')
        console.log('📤 PowerShell stderr: "' + psErr.trim() + '"')
        
        // Clean up script file
        try {
          fs.unlinkSync(psScriptFile)
          console.log('🗑️ PowerShell script file cleaned up')
        } catch (cleanupError) {
          console.warn('⚠️ Could not clean up script file:', String(cleanupError))
        }
        
        if (psOut.includes('SUCCESS')) {
          console.log('✅ Ticket printed successfully!')
        } else if (psOut.includes('ERROR')) {
          console.error('❌ Ticket print failed:', psOut)
        } else {
          console.log('⚠️ Ticket print status unclear')
        }
        
      } catch (psError) {
        console.error('❌ PowerShell execution failed:', String(psError))
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Ticket printing completed',
        queueNumber: queueNumber
      })
    }
    
    return NextResponse.json({ 
      error: 'Printing can only run on server' 
    }, { status: 400 })
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('� Ticket printing error:', errorMessage)
    return NextResponse.json({
      error: 'Ticket printing failed',
      details: errorMessage
    }, { status: 500 })
  }
}
