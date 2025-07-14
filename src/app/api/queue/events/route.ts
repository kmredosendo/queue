import { NextRequest } from 'next/server'
import { addConnection, removeConnection, fetchAndSendLaneData } from '@/lib/broadcast'
import { resetLaneNumbersOncePerDay } from '@/lib/laneReset'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
  await resetLaneNumbersOncePerDay();
  // Set up Server-Sent Events headers
  const responseHeaders = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  })

  let controller: ReadableStreamDefaultController

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl
      addConnection(controller)

      // Send initial connection message
      const welcomeMessage = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`
      controller.enqueue(new TextEncoder().encode(welcomeMessage))

      // Send initial lane data
      fetchAndSendLaneData(controller)
    },
    cancel() {
      removeConnection(controller)
    }
  })

  return new Response(stream, { headers: responseHeaders })
}
