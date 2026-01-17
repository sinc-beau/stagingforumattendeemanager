import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface EmailRequest {
  email: string
  firstName: string
  lastName: string
  company?: string
  forumName?: string
  type: 'approved' | 'denied' | 'waitlisted'
  attendeeId: string
  eventName?: string
  eventDate?: string
  eventCity?: string
  eventVenue?: string
  eventSponsor?: string
  templateId: string
  dynamicTemplateData: Record<string, any>
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
    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY')
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'registrations@mail.sincusa.com'

    console.log('🔧 SendGrid Email Service - Environment check:')
    console.log('- SendGrid API Key available:', !!sendGridApiKey)
    console.log('- SendGrid API Key length:', sendGridApiKey?.length || 0)
    console.log('- SendGrid API Key prefix:', sendGridApiKey?.substring(0, 10) + '...' || 'N/A')
    console.log('- From email:', fromEmail)
    console.log('- All environment variables:', Object.keys(Deno.env.toObject()))

    if (!sendGridApiKey) {
      const errorMessage = `❌ SENDGRID_API_KEY environment variable is not set.

To fix this:
1. Go to your Supabase Dashboard
2. Navigate to Edge Functions
3. Select the 'send-email' function
4. Add environment variable: SENDGRID_API_KEY with your SendGrid API key
5. Your SendGrid API key should start with 'SG.' and be found in your SendGrid dashboard
6. Also add FROM_EMAIL with a verified sender email address

Available environment variables: ${Object.keys(Deno.env.toObject()).join(', ')}`

      console.error(errorMessage)
      return new Response(
        JSON.stringify({
          error: 'SendGrid API key not configured',
          details: 'SENDGRID_API_KEY environment variable is missing. Please configure it in Supabase Edge Functions settings.',
          instructions: [
            'Go to Supabase Dashboard → Edge Functions',
            'Select send-email function',
            'Add SENDGRID_API_KEY environment variable',
            'Add FROM_EMAIL environment variable',
            'Use your SendGrid API key (starts with SG.)',
            'Use a verified sender email address'
          ]
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!sendGridApiKey.startsWith('SG.')) {
      console.error('❌ SendGrid API key format is invalid. It should start with "SG."')
      return new Response(
        JSON.stringify({
          error: 'Invalid SendGrid API key format',
          details: 'SendGrid API key should start with "SG.". Please check your API key.',
          currentKeyPrefix: sendGridApiKey.substring(0, 10) + '...'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const emailData: EmailRequest = await req.json()
    console.log('📧 SendGrid email request:', emailData.type, 'for', emailData.email)

    if (!emailData.templateId) {
      throw new Error('Template ID is required')
    }

    if (!emailData.dynamicTemplateData) {
      throw new Error('Dynamic template data is required')
    }

    console.log('📧 Sending email via SendGrid API...')
    console.log('- From:', fromEmail)
    console.log('- To:', emailData.email)
    console.log('- Template ID:', emailData.templateId)
    console.log('- Dynamic Data:', emailData.dynamicTemplateData)

    const sendGridPayload = {
      personalizations: [
        {
          to: [{ email: emailData.email, name: `${emailData.firstName} ${emailData.lastName}` }],
          dynamic_template_data: emailData.dynamicTemplateData
        }
      ],
      from: { email: fromEmail, name: 'SINC USA' },
      template_id: emailData.templateId
    }

    const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendGridPayload)
    })

    if (!sendGridResponse.ok) {
      const errorText = await sendGridResponse.text()
      console.error('❌ SendGrid API error:', sendGridResponse.status, errorText)

      if (sendGridResponse.status === 403) {
        throw new Error(`SendGrid Authentication Error (403): The from address "${fromEmail}" is not verified in SendGrid. Please verify this sender identity in your SendGrid account at https://sendgrid.com/docs/for-developers/sending-email/sender-identity/`)
      } else if (sendGridResponse.status === 401) {
        throw new Error(`SendGrid API Key Error (401): Invalid or expired API key. Please check your SENDGRID_API_KEY environment variable.`)
      } else {
        throw new Error(`SendGrid API error: ${sendGridResponse.status} - ${errorText}`)
      }
    }

    console.log('✅ Email sent successfully via SendGrid to:', emailData.email)

    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      await supabaseClient
        .from('email_audit_log')
        .insert({
          attendee_id: emailData.attendeeId,
          email_type: emailData.type,
          recipient_email: emailData.email,
          recipient_name: `${emailData.firstName} ${emailData.lastName}`,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
    } catch (auditError) {
      console.warn('⚠️ Failed to log email to audit table:', auditError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        type: emailData.type,
        recipient: emailData.email,
        fromEmail: fromEmail
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('💥 SendGrid function error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
