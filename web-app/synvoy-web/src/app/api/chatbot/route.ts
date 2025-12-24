import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Log the request body for debugging
    console.log('Chatbot API received request:', JSON.stringify(body, null, 2))
    
    // Get n8n webhook URL from environment or use default
    // Try different possible webhook URL formats
    const webhookId = process.env.N8N_WEBHOOK_ID || '9e5a7186-a856-4ce7-ad7c-4eeeed6213ed'
    
    // Determine n8n base URL
    // In Docker, use service name. In local dev, use localhost
    let n8nBaseUrl = process.env.N8N_WEBHOOK_URL || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL
    
    if (!n8nBaseUrl) {
      // Check if we're in Docker (service name) or local dev (localhost)
      // In Docker, Next.js can access n8n via service name on the same network
      // In local dev, use localhost
      const isDocker = process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV === 'true'
      n8nBaseUrl = isDocker ? 'http://n8n:5678' : 'http://localhost:5678'
    }
    
    // Build webhook URL - use /chat path as confirmed by user
    let n8nWebhookUrl = n8nBaseUrl.includes('/webhook/') 
      ? n8nBaseUrl 
      : `${n8nBaseUrl}/webhook/${webhookId}/chat`
    
    console.log('Attempting to connect to n8n webhook:', n8nWebhookUrl)
    console.log('Sending to n8n:', JSON.stringify(body, null, 2))
    
    // Forward the request to n8n webhook
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    console.log('n8n response status:', response.status, response.statusText)

    if (!response.ok) {
      
      let errorText = ''
      let errorData = null
      try {
        errorText = await response.text()
        try {
          errorData = JSON.parse(errorText)
        } catch {
          // Not JSON, use as text
        }
      } catch {
        errorText = response.statusText
      }
      
      console.error(`n8n webhook error: ${response.status} ${response.statusText}`, errorText)
      
      // Extract more detailed error message from n8n response
      const errorMessage = errorData?.message || errorData?.error || errorText || response.statusText
      throw new Error(`n8n webhook error: ${errorMessage}`)
    }

    const data = await response.json()
    
    // Log the response for debugging
    console.log('n8n response data:', JSON.stringify(data, null, 2))
    
    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error('Chatbot API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to connect to chatbot',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

