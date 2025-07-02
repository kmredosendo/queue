import { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } from 'node-thermal-printer'

export interface PrintQueueNumberOptions {
  queueNumber: number
  laneName: string
  customerName?: string
  currentTime?: Date
  estimatedWait?: number
  currentNumber?: number
  waitingCount?: number
}

export class QueuePrinter {
  private printer: ThermalPrinter

  constructor() {
    this.printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,  // EPSON TM-T88IV
      interface: 'ESDPRT001', // Actual EPSON printer port
      characterSet: CharacterSet.PC437_USA,
      removeSpecialCharacters: true,
      lineCharacter: '-',
      breakLine: BreakLine.WORD,
      options: {
        timeout: 15000 // Increased timeout for reliable communication
      }
    })
  }

  // Set custom printer interface (COM port, USB, or network)
  setPrinterInterface(interfaceString: string) {
    this.printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: interfaceString, // e.g., 'COM3', 'USB001', '192.168.1.100:9100'
      characterSet: CharacterSet.PC437_USA,
      removeSpecialCharacters: true,
      lineCharacter: '-',
      breakLine: BreakLine.WORD,
      options: {
        timeout: 15000 // Increased timeout for reliable communication
      }
    })
  }

  async printQueueNumber(options: PrintQueueNumberOptions): Promise<boolean> {
    try {
      // Use Windows printing as primary method (proven to work reliably)
      return await this.printQueueNumberFallback(options)
    } catch (error) {
      console.error('Queue number printing failed:', error)
      throw new Error(`Failed to print queue number: ${error}`)
    }
  }

  async printQueueNumberThermal(options: PrintQueueNumberOptions): Promise<boolean> {
    try {
      const { 
        queueNumber, 
        laneName, 
        customerName, 
        currentTime = new Date(), 
        estimatedWait = 0,
        currentNumber = 0,
        waitingCount = 0
      } = options

      // Clear any previous content
      this.printer.clear()

      // Initialize printer with raw ESC/POS command for better EPSON compatibility
      this.printer.raw(Buffer.from([0x1B, 0x40])) // ESC @ - Initialize printer

      // Header
      this.printer.alignCenter()
      this.printer.setTextSize(1, 1)
      this.printer.bold(true)
      this.printer.println('QUEUE TICKET')
      this.printer.bold(false)
      this.printer.setTextSize(0, 0)
      this.printer.println('Please keep this ticket until your number is called')
      this.printer.newLine()

      // Date and time (matching Dialog UI)
      this.printer.alignCenter()
      this.printer.setTextSize(0, 0)
      this.printer.println(currentTime.toLocaleDateString() + ' ' + currentTime.toLocaleTimeString())
      this.printer.newLine()

      // Dashed border effect (top)
      this.printer.println('- - - - - - - - - - - - - - - - - - - -')

      // Queue Number (Large, centered like Dialog)
      this.printer.alignCenter()
      this.printer.setTextSize(3, 3)
      this.printer.bold(true)
      this.printer.println(queueNumber.toString())
      this.printer.bold(false)
      this.printer.newLine()
      
      // Lane Name (matching Dialog UI)
      this.printer.setTextSize(1, 1)
      this.printer.bold(true)
      this.printer.println(laneName)
      this.printer.bold(false)
      this.printer.newLine()

      // Status information (matching Dialog layout)
      this.printer.alignLeft()
      this.printer.setTextSize(0, 0)
      
      this.printer.print('Now Serving:')
      this.printer.alignRight()
      this.printer.println(currentNumber === 0 ? '-' : currentNumber.toString())
      
      this.printer.alignLeft()
      this.printer.print('People Ahead:')
      this.printer.alignRight()
      this.printer.println(waitingCount.toString())
      
      this.printer.alignLeft()
      this.printer.print('Estimated Wait:')
      this.printer.alignRight()
      this.printer.println(this.formatEstimatedWait(estimatedWait))

      // Customer Name (if provided)
      if (customerName) {
        this.printer.newLine()
        this.printer.alignLeft()
        this.printer.bold(true)
        this.printer.println('Customer: ' + customerName)
        this.printer.bold(false)
      }

      // Dashed border effect (bottom)
      this.printer.newLine()
      this.printer.alignCenter()
      this.printer.println('- - - - - - - - - - - - - - - - - - - -')

      // Instructions (matching Dialog UI)
      this.printer.newLine()
      this.printer.alignCenter()
      this.printer.setTextSize(0, 0)
      this.printer.println('Please listen for your number or watch the display screen')
      this.printer.println('If you miss your call, please approach the service counter')

      // Footer spacing
      this.printer.newLine()
      this.printer.newLine()
      this.printer.newLine()

      // Full cut command for EPSON
      this.printer.raw(Buffer.from([0x1D, 0x56, 0x00])) // GS V 0 - Full cut

      // Execute print
      await this.printer.execute()
      return true
    } catch (error) {
      console.error('Thermal print error:', error)
      throw new Error(`Failed to print queue number via thermal: ${error}`)
    }
  }

  // Helper method to format estimated wait time (matching Dialog UI logic)
  private formatEstimatedWait(minutes: number): string {
    if (minutes < 1) return 'Less than 1 minute'
    if (minutes < 60) return `${minutes} minutes`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  async testPrint(): Promise<boolean> {
    try {
      // Test format optimized for 20-character width (Word printing)
      const dateTime = new Date().toLocaleString()
      
      const centerText = (text: string, width: number = 20): string => {
        if (text.length <= width) {
          const padding = Math.floor((width - text.length) / 2)
          return ' '.repeat(padding) + text
        }
        return text
      }
      
      const testContent = `${centerText('Printer Test')}

${centerText('EPSON TM-T88IV')}

${'-'.repeat(20)}

${centerText(dateTime.substring(0, 20))}
${dateTime.length > 20 ? centerText(dateTime.substring(20)) : ''}

${centerText('TEST')}

${centerText('Working!')}

${'-'.repeat(20)}

${centerText('Printer ready')}
${centerText('for 20-char width')}

`
      return await this.printViaWord(testContent)
    } catch (error) {
      console.error('Test print failed:', error)
      throw new Error(`Test print failed: ${error}`)
    }
  }

  // Windows printing method (primary method for EPSON TM-T88IV)
  // Windows printing method using Word for better width utilization (20+ chars per line)
  async printViaWord(content: string): Promise<boolean> {
    try {
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)
      
      const tempFile = 'temp-word-print.txt'
      const scriptFile = 'word-print.ps1'
      const fs = await import('fs')
      
      // Write content to temp file
      fs.writeFileSync(tempFile, content, 'utf8')
      
      // PowerShell script to print via Word with optimal margins (gives us 20+ characters per line)
      const wordScript = `
      try {
        $word = New-Object -ComObject Word.Application
        $word.Visible = $false
        $doc = $word.Documents.Open('${process.cwd().replace(/\\/g, '\\\\')}\\\\${tempFile}')
        
        # Set optimal margins for thermal printer (eliminates large left margin)
        $doc.PageSetup.TopMargin = 0
        $doc.PageSetup.BottomMargin = 0
        $doc.PageSetup.LeftMargin = $word.InchesToPoints(0.16)
        $doc.PageSetup.RightMargin = $word.InchesToPoints(0.15)
        
        # Set consistent monospace font for better character alignment
        $doc.Content.Font.Name = "Courier New"
        $doc.Content.Font.Size = 10
        
        $doc.PrintOut()
        $doc.Close()
        $word.Quit()
        Write-Output "Success"
      } catch {
        # Fallback to basic PowerShell printing if Word fails
        Get-Content '${tempFile}' | Out-Printer -Name 'EPSON TM-T88IV Receipt'
        Write-Output "Fallback Success"
      }
      `
      
      fs.writeFileSync(scriptFile, wordScript, 'utf8')
      
      await execAsync(`powershell -ExecutionPolicy Bypass -File "${scriptFile}"`)
      
      // Clean up files
      setTimeout(() => {
        try {
          fs.unlinkSync(tempFile)
          fs.unlinkSync(scriptFile)
        } catch (error) {
          // Ignore cleanup errors
        }
      }, 2000)
      
      return true
    } catch (error) {
      console.error('Word print error:', error)
      return false
    }
  }

  async printViaWindows(content: string): Promise<boolean> {
    try {
      // Try Word printing first (20+ characters per line)
      const wordResult = await this.printViaWord(content)
      if (wordResult) {
        return true
      }
      
      // Fallback to PowerShell if Word fails
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)
      
      const tempFile = 'temp-print.txt'
      const fs = await import('fs')
      
      // Write content to temp file
      fs.writeFileSync(tempFile, content, 'utf8')
      
      // Use PowerShell to print via Windows printer system
      const command = `powershell -Command "Get-Content '${tempFile}' | Out-Printer -Name 'EPSON TM-T88IV Receipt'"`
      
      await execAsync(command)
      
      // Clean up temp file
      fs.unlinkSync(tempFile)
      
      return true
    } catch (error) {
      console.error('Windows print error:', error)
      return false
    }
  }

  async printQueueNumberFallback(options: PrintQueueNumberOptions): Promise<boolean> {
    const { 
      queueNumber, 
      laneName, 
      currentTime = new Date()
    } = options

    // Create ticket optimized for 20-character width (Word printing method)
    const dateTime = `${currentTime.toLocaleDateString()} ${currentTime.toLocaleTimeString()}`
    const queueStr = queueNumber.toString()
    
    // Format for 20-character width with centering
    const centerText = (text: string, width: number = 20): string => {
      if (text.length <= width) {
        const padding = Math.floor((width - text.length) / 2)
        return ' '.repeat(padding) + text
      }
      return text // If text is longer, it will wrap naturally
    }
    
    // Split long text across multiple lines for 20-char width
    const wrapText = (text: string, width: number = 20): string[] => {
      const words = text.split(' ')
      const lines = []
      let currentLine = ''
      
      for (const word of words) {
        if ((currentLine + word).length <= width) {
          currentLine += (currentLine ? ' ' : '') + word
        } else {
          if (currentLine) lines.push(currentLine)
          currentLine = word
        }
      }
      if (currentLine) lines.push(currentLine)
      return lines
    }
    
    const ticket = `${centerText('Queue Ticket')}

${centerText('Keep this ticket')}
${centerText('until called')}

${'-'.repeat(20)}

${centerText(dateTime.substring(0, 20))}
${dateTime.length > 20 ? centerText(dateTime.substring(20)) : ''}

${centerText(queueStr)}

${wrapText(laneName, 20).map(line => centerText(line)).join('\n')}

${'-'.repeat(20)}

${centerText('Listen for your')}
${centerText('number or watch')}
${centerText('the display.')}

${centerText('If you miss your')}
${centerText('call, approach')}
${centerText('the counter.')}

`

    return this.printViaWord(ticket)
  }

  async checkPrinterStatus(): Promise<{ connected: boolean; error?: string }> {
    try {
      // Check Windows printer status instead of thermal printer connection
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)
      
      // Check if EPSON printer exists and is available
      const command = `powershell -Command "Get-Printer -Name 'EPSON TM-T88IV Receipt' | Select-Object PrinterStatus"`
      const result = await execAsync(command)
      
      if (result.stdout.includes('Normal') || result.stdout.includes('Idle')) {
        return { connected: true }
      } else {
        return { 
          connected: false, 
          error: 'Printer not available or offline'
        }
      }
      
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        errorMessage = 'EPSON TM-T88IV Receipt printer not found in Windows'
      } else if (errorMessage.includes('access') || errorMessage.includes('permission')) {
        errorMessage = 'Access denied - insufficient permissions to access printer'
      }
      
      return { 
        connected: false, 
        error: errorMessage
      }
    }
  }
}
