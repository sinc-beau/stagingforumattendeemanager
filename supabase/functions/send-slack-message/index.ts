const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SlackRequest {
  message: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL')

    if (!slackWebhookUrl) {
      const errorMessage = 'SLACK_WEBHOOK_URL environment variable is not set.'
      console.error(errorMessage)
      return new Response(
        JSON.stringify({
          error: 'Slack webhook URL not configured',
          details: errorMessage
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const requestData: SlackRequest = await req.json()

    const slackPayload = {
      text: requestData.message
    }

    const slackResponse = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackPayload)
    })

    const responseText = await slackResponse.text()

    if (!slackResponse.ok) {
      throw new Error(`Slack API error: ${slackResponse.status} - ${responseText}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Message sent successfully to Slack',
        slackResponse: {
          status: slackResponse.status,
          statusText: slackResponse.statusText,
          body: responseText
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Slack function error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to send Slack message',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
