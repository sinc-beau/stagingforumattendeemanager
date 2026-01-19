import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface DealRequest {
  attendeeId: string
  forumId: string
  status: 'approved' | 'denied' | 'waitlisted'
}

interface AttendeeData {
  id: string
  first_name: string
  last_name: string
  email: string
  company: string
  title: string
  industry: string
}

interface ForumData {
  id: string
  forum_name: string
  forum_date: string
  city: string
  state: string
  event_type: string
  deal_code: string
}

const getHubSpotDealStageAndPipeline = (status: string, eventType: string): { dealstage: string, pipeline: string } => {
  let pipeline = '90149250'
  let dealstage = '166944416'

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
      pipeline = '90149250'
  }

  if (eventType.toUpperCase() === 'FORUM') {
    switch (status) {
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
        dealstage = '166944415'
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
        dealstage = '166990866'
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
        dealstage = '167042459'
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
        dealstage = '167095399'
    }
  }

  return { dealstage, pipeline }
}

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
      return 'Forum Attendee'
  }
}

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

const createContact = async (attendee: AttendeeData, hubspotApiKey: string): Promise<string | null> => {
  try {
    console.log(`👤 Creating new contact for: ${attendee.email}`)
    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hubspotApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          email: attendee.email,
          firstname: attendee.first_name,
          lastname: attendee.last_name,
          company: attendee.company,
          jobtitle: attendee.title,
          industry: attendee.industry
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

const createOrUpdateDeal = async (
  attendee: AttendeeData,
  forum: ForumData,
  contactId: string,
  status: string,
  hubspotApiKey: string
): Promise<string | null> => {
  try {
    const { dealstage, pipeline } = getHubSpotDealStageAndPipeline(status, forum.event_type)
    const dealName = forum.deal_code
    const sincDealType = getSincDealType(forum.event_type)

    const dealProperties = {
      dealname: dealName,
      dealstage: dealstage,
      pipeline: pipeline,
      closedate: new Date().toISOString(),
      company_name: attendee.company,
      contact_email: attendee.email,
      contact_name: `${attendee.first_name} ${attendee.last_name}`,
      industry: attendee.industry,
      sinc_deal_type: sincDealType
    }

    console.log(`Creating new deal: ${dealName}`)
    console.log(`Deal properties:`, JSON.stringify(dealProperties, null, 2))

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
      const errorText = await response.text()
      console.error('Failed to create deal:', response.status, errorText)
      return null
    }

    const data = await response.json()
    const dealId = data.id

    await associateDealWithContact(dealId, contactId, hubspotApiKey)

    return dealId
  } catch (error) {
    console.error('Error creating/updating deal:', error)
    return null
  }
}

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
    const hubspotApiKey = Deno.env.get('HUBSPOT_API_KEY')
    console.log('🔧 HubSpot API Key available:', !!hubspotApiKey)

    if (!hubspotApiKey) {
      console.error('❌ HUBSPOT_API_KEY environment variable is not set')
      return new Response(
        JSON.stringify({
          error: 'HubSpot API key not configured',
          details: 'HUBSPOT_API_KEY environment variable is missing'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

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

    const { attendeeId, status, forumId }: DealRequest = await req.json()

    if (!attendeeId || !status || !forumId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: attendeeId, status, forumId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing HubSpot deal for attendee ${attendeeId} with status ${status}`)

    const { data: attendee, error: attendeeError } = await supabaseClient
      .from('attendees')
      .select('*')
      .eq('id', attendeeId)
      .maybeSingle()

    if (attendeeError || !attendee) {
      console.error('Attendee not found:', attendeeError)
      throw new Error(`Attendee not found: ${attendeeId}`)
    }

    const { data: forum, error: forumError } = await supabaseClient
      .from('forums')
      .select('*')
      .eq('id', forumId)
      .maybeSingle()

    if (forumError || !forum) {
      console.error('Forum not found:', forumError)
      throw new Error(`Forum not found: ${forumId}`)
    }

    let contactId = await findContactByEmail(attendee.email, hubspotApiKey)

    if (!contactId) {
      console.log(`Contact not found for ${attendee.email}, creating new contact`)
      contactId = await createContact(attendee, hubspotApiKey)

      if (!contactId) {
        throw new Error('Failed to find or create contact in HubSpot')
      }
    }

    console.log(`Found/created contact: ${contactId}`)

    const dealId = await createOrUpdateDeal(attendee, forum, contactId, status, hubspotApiKey)

    if (!dealId) {
      throw new Error('Failed to create or update deal in HubSpot')
    }

    await supabaseClient
      .from('attendees')
      .update({ hubspot_deal_id: dealId })
      .eq('id', attendeeId)

    console.log(`Successfully processed deal: ${dealId}`)

    return new Response(
      JSON.stringify({
        success: true,
        dealId,
        contactId,
        message: 'HubSpot deal processed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('HubSpot deal manager error:', error instanceof Error ? error.message : error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let detailedError = errorMessage;

    if (errorMessage.includes('API key')) {
      detailedError = 'HubSpot API key is invalid or missing';
    } else if (errorMessage.includes('rate limit')) {
      detailedError = 'HubSpot API rate limit exceeded';
    } else if (errorMessage.includes('Failed to fetch')) {
      detailedError = 'Network error connecting to HubSpot API';
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
