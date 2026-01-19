import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface DealRequest {
  submissionId: string
  status: 'approved' | 'denied' | 'waitlisted' | 'preliminary_approved'
  eventId: string
  sincRepId?: string
}

interface SubmissionData {
  id: string
  firstname: string
  lastname: string
  email: string
  company: string
  jobtitle: string
  industry: string
  deal_code: string
  event_id: string
  status: string
}

interface EventData {
  id: string
  event_name: string
  event_date: string
  event_city: string
  state: string
}

// Map status and event type to HubSpot deal stage and pipeline
const getHubSpotDealStageAndPipeline = (status: string, eventType: string): { dealstage: string, pipeline: string } => {
  // Default to FORUM pipeline and stages
  let pipeline = '90149250' // FORUM pipeline ID
  let dealstage = '166944416' // FORUM preliminary_approved stage

  // Set pipeline based on event type
  switch (eventType.toUpperCase()) {
    case 'FORUM':
      pipeline = '90149250'
      break
    case 'DINNER':
      pipeline = '90169477'
      break
    case 'VEB':
      pipeline = '90213999'
      break
    case 'VRT':
      pipeline = '90168587'
      break
    default:
      pipeline = '90149250' // Default to FORUM pipeline
  }

  // Set dealstage based on event type and status
  if (eventType.toUpperCase() === 'FORUM') {
    switch (status) {
      case 'preliminary_approved':
        dealstage = '166944416'
        break
      case 'approved':
        dealstage = '166944415'
        break
      case 'denied':
        dealstage = '166990894'
        break
      case 'waitlisted':
        dealstage = '166990898'
        break
      default:
        dealstage = '166944416' // Default to preliminary_approved
    }
  } else if (eventType.toUpperCase() === 'DINNER') {
    switch (status) {
      case 'approved':
        dealstage = '166990866'
        break
      case 'denied':
        dealstage = '166990871'
        break
      case 'waitlisted':
        dealstage = '166990868'
        break
      default:
        dealstage = '166990866' // Default to approved
    }
  } else if (eventType.toUpperCase() === 'VEB') {
    switch (status) {
      case 'approved':
        dealstage = '167042459'
        break
      case 'denied':
        dealstage = '167042457'
        break
      case 'waitlisted':
        dealstage = '167042458'
        break
      default:
        dealstage = '167042459' // Default to approved
    }
  } else if (eventType.toUpperCase() === 'VRT') {
    switch (status) {
      case 'approved':
        dealstage = '167095399'
        break
      case 'denied':
        dealstage = '167095400'
        break
      case 'waitlisted':
        dealstage = '167095396'
        break
      default:
        dealstage = '167095399' // Default to approved
    }
  }

  return { dealstage, pipeline }
}

// Map event type to SINC Deal Type property
const getSincDealType = (eventType: string): string => {
  switch (eventType.toUpperCase()) {
    case 'FORUM':
      return 'Forum Attendee'
    case 'DINNER':
      return 'Dinner Attendee'
    case 'VEB':
      return 'VEB Attendee'
    case 'VRT':
      return 'vRoundtable Attendee'
    default:
      return 'Forum Attendee' // Default to Forum Attendee
  }
}

// Search for contact by email in HubSpot
const findContactByEmail = async (email: string, hubspotApiKey: string): Promise<string | null> => {
  try {
    console.log(`🔍 Searching for contact with email: ${email}`)
    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hubspotApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: email
          }]
        }],
        properties: ['id', 'email', 'firstname', 'lastname']
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Failed to search for contact:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      return null
    }

    const data = await response.json()
    if (data.results && data.results.length > 0) {
      console.log(`✅ Found existing contact: ${data.results[0].id}`)
      return data.results[0].id
    }

    console.log('ℹ️ No existing contact found')
    return null
  } catch (error) {
    console.error('💥 Error searching for contact:', error)
    return null
  }
}

// Create contact if not found
const createContact = async (submission: SubmissionData, hubspotApiKey: string): Promise<string | null> => {
  try {
    console.log(`👤 Creating new contact for: ${submission.email}`)
    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hubspotApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          email: submission.email,
          firstname: submission.firstname,
          lastname: submission.lastname,
          company: submission.company,
          jobtitle: submission.jobtitle,
          industry: submission.industry
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Failed to create contact:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      return null
    }

    const data = await response.json()
    console.log(`✅ Created new contact: ${data.id}`)
    return data.id
  } catch (error) {
    console.error('💥 Error creating contact:', error)
    return null
  }
}

// Search for existing deal by deal code
const findDealByDealCode = async (dealCode: string, hubspotApiKey: string): Promise<string | null> => {
  try {
    console.log(`🔍 Searching for existing deal: ${dealCode}`)
    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hubspotApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{
            propertyName: 'dealname',
            operator: 'EQ',
            value: dealCode
          }]
        }],
        properties: ['id', 'dealname', 'dealstage']
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Failed to search for deal:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      return null
    }

    const data = await response.json()
    if (data.results && data.results.length > 0) {
      console.log(`✅ Found existing deal: ${data.results[0].id}`)
      return data.results[0].id
    }

    console.log('ℹ️ No existing deal found')
    return null
  } catch (error) {
    console.error('💥 Error searching for deal:', error)
    return null
  }
}

// Create or update deal in HubSpot
const createOrUpdateDeal = async (
  submission: SubmissionData,
  event: EventData,
  contactId: string,
  sincRepId: string | undefined,
  hubspotApiKey: string
): Promise<string | null> => {
  try {
    const { dealstage, pipeline } = getHubSpotDealStageAndPipeline(submission.status, event.event_type)
    const dealName = submission.deal_code
    const sincDealType = getSincDealType(event.event_type)

    const dealProperties = {
      dealname: dealName,
      dealstage: dealstage,
      pipeline: pipeline,
      closedate: new Date().toISOString(), // Use current date/time
      // Map submission data to deal properties using correct property names
      company_name: submission.company,
      contact_email: submission.email,
      contact_name: `${submission.firstname} ${submission.lastname}`,
      industry: submission.industry,
      sinc_deal_type: sincDealType
    }

    // Add hubspot_owner_id if sincRepId is provided
    if (sincRepId) {
      // HubSpot expects owner IDs as numbers, but our IDs are stored as strings
      // We need to convert them to numbers for the API
      console.log(`Assigning HubSpot owner ID: ${sincRepId}`);
      Object.assign(dealProperties, { hubspot_owner_id: parseInt(sincRepId, 10) });
    } else {
      console.log('ℹ️ No SINC Rep ID provided. Skipping owner assignment.');
    }

    let dealId: string

    // Create new deal
    console.log(`Creating new deal: ${dealName}`)
    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/deals`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hubspotApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: dealProperties
      })
    })

    if (!response.ok) {
      console.error('Failed to create deal:', response.status, await response.text())
      return null
    }

    const data = await response.json()
    dealId = data.id

    // Associate deal with contact
    await associateDealWithContact(dealId, contactId, hubspotApiKey)

    return dealId
  } catch (error) {
    console.error('Error creating/updating deal:', error)
    return null
  }
}

// Associate deal with contact
const associateDealWithContact = async (dealId: string, contactId: string, hubspotApiKey: string): Promise<boolean> => {
  try {
    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/deal_to_contact`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${hubspotApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('Failed to associate deal with contact:', response.status, await response.text())
      return false
    }

    console.log(`Successfully associated deal ${dealId} with contact ${contactId}`)
    return true
  } catch (error) {
    console.error('Error associating deal with contact:', error)
    return false
  }
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
    // Get HubSpot API key
    const hubspotApiKey = Deno.env.get('HUBSPOT_API_KEY')
    console.log('🔧 HubSpot Deal Manager - Environment check:')
    console.log('- HubSpot API Key available:', !!hubspotApiKey)
    console.log('- HubSpot API Key length:', hubspotApiKey?.length || 0)
    console.log('- All environment variables:', Object.keys(Deno.env.toObject()))

    if (!hubspotApiKey) {
      const errorMessage = `❌ HUBSPOT_API_KEY environment variable is not set.

To fix this:
1. Go to your Supabase Dashboard
2. Navigate to Edge Functions
3. Select the 'hubspot-deal-manager' function
4. Add environment variable: HUBSPOT_API_KEY with your HubSpot private app token
5. Your HubSpot API key should start with 'pat-' and be found in your HubSpot app settings

Available environment variables: ${Object.keys(Deno.env.toObject()).join(', ')}`

      console.error(errorMessage)
      return new Response(
        JSON.stringify({
          error: 'HubSpot API key not configured',
          details: 'HUBSPOT_API_KEY environment variable is missing. Please configure it in Supabase Edge Functions settings.',
          instructions: [
            'Go to Supabase Dashboard → Edge Functions',
            'Select hubspot-deal-manager function',
            'Add HUBSPOT_API_KEY environment variable',
            'Use your HubSpot private app token (starts with pat-)'
          ]
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate HubSpot API key format
    if (!hubspotApiKey.startsWith('pat-')) {
      console.error('❌ HubSpot API key format is invalid. It should start with "pat-"')
      return new Response(
        JSON.stringify({
          error: 'Invalid HubSpot API key format',
          details: 'HubSpot API key should start with "pat-". Please check your private app token.',
          currentKeyPrefix: hubspotApiKey.substring(0, 10) + '...'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { submissionId, status, eventId, sincRepId }: DealRequest = await req.json()

    if (!submissionId || !status || !eventId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: submissionId, status, eventId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing HubSpot deal for submission ${submissionId} with status ${status}`)

    // Get submission data
    const { data: submission, error: submissionError } = await supabaseClient
      .from('hubspot_submissions')
      .select('*')
      .eq('id', submissionId.toString())
      .single()

    if (submissionError || !submission) {
      console.error('Submission not found:', submissionError)
      throw new Error(`Submission not found: ${submissionId}`)
    }

    // Get event data
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('*')
      .eq('id', eventId.toString())
      .single()

    if (eventError || !event) {
      console.error('Event not found:', eventError)
      throw new Error(`Event not found: ${eventId}`)
    }

    // Find or create contact in HubSpot
    let contactId = await findContactByEmail(submission.email, hubspotApiKey)

    if (!contactId) {
      console.log(`Contact not found for ${submission.email}, creating new contact`)
      contactId = await createContact(submission, hubspotApiKey)

      if (!contactId) {
        throw new Error('Failed to find or create contact in HubSpot')
      }
    }

    console.log(`Found/created contact: ${contactId}`)

    // Create or update deal
    const dealId = await createOrUpdateDeal(submission, event, contactId, sincRepId, hubspotApiKey)

    if (!dealId) {
      throw new Error('Failed to create or update deal in HubSpot')
    }

    console.log(`Successfully processed deal: ${dealId}`)

    return new Response(
      JSON.stringify({
        success: true,
        dealId,
        contactId,
        message: 'HubSpot deal processed successfully',
        details: {
          dealName: submission.deal_code,
          dealStage: getHubSpotDealStageAndPipeline(submission.status, event.event_type).dealstage,
          eventName: event.event_name,
          submissionEmail: submission.email,
          sincRepId: sincRepId
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('HubSpot deal manager error:', error instanceof Error ? error.message : error)

    // Check for specific HubSpot API errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let detailedError = errorMessage;

    if (errorMessage.includes('API key')) {
      detailedError = 'HubSpot API key is invalid or missing. Please check your environment variables.';
    } else if (errorMessage.includes('rate limit')) {
      detailedError = 'HubSpot API rate limit exceeded. Please try again later.';
    } else if (errorMessage.includes('Failed to fetch')) {
      detailedError = 'Network error connecting to HubSpot API. Please check your API key and network connectivity.';
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to process HubSpot deal',
        details: detailedError,
        originalError: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
