// Vercel serverless function to proxy Ollama API requests
// This solves CORS issues when calling Ollama from the browser

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get Ollama URL from environment variable
    // In production, this should point to a publicly accessible Ollama instance
    // For local development, use http://127.0.0.1:11434
    // For remote, use https://your-ollama-server.com or http://your-ip:11434
    const ollamaUrl = process.env.OLLAMA_BASE_URL || process.env.VITE_LLM_BASE_URL || 'http://127.0.0.1:11434'
    
    // Remove /api/chat if present (we'll add it)
    const baseUrl = ollamaUrl.replace(/\/api\/chat$/, '').replace(/\/$/, '')
    const endpoint = `${baseUrl}/api/chat`

    console.log(`[Ollama Proxy] Forwarding to: ${endpoint}`)

    // Forward the request to Ollama
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      console.error(`[Ollama Proxy] Error ${response.status}: ${errorText}`)
      
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      
      return res.status(response.status).json({ 
        error: `Ollama API error: ${errorText}`,
        status: response.status
      })
    }

    const data = await response.json()

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Content-Type', 'application/json')

    return res.status(200).json(data)
  } catch (error) {
    console.error('[Ollama Proxy] Error:', error)
    
    // Set CORS headers even for errors
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    
    return res.status(500).json({ 
      error: 'Failed to proxy request to Ollama',
      message: error.message,
      hint: 'Make sure OLLAMA_BASE_URL is set correctly in Vercel environment variables'
    })
  }
}

