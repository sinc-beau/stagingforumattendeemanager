import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

const SINC_REPS = [
  { id: '59207503', name: 'James Hermann' },
  { id: '75919879', name: 'Tucker Mcgaugh' },
  { id: '76643189', name: 'Jack Gregory' },
  { id: '76699261', name: 'Julia Shoffner' },
  { id: '79447812', name: 'Leah Fairchild' },
  { id: '79447813', name: 'Beckett Soignier' },
  { id: '79447814', name: 'Hunter McClure' },
  { id: '80655731', name: 'Beau Horton' },
  { id: '81142709', name: 'Jared Bral' },
  { id: '83333527', name: 'Kaylee Chick' },
  { id: '117334291', name: 'Alicia Hinrichs' },
  { id: '226256489', name: 'Events SINC USA' },
  { id: '246749077', name: 'Kimberly Wright' },
  { id: '249871130', name: 'Barbara Cavazos' },
  { id: '254155041', name: 'Jillian Klumbach' },
  { id: '325421796', name: 'Ellie Trace' },
  { id: '405620310', name: 'Daniel Zierk' },
  { id: '446973483', name: 'Brian Richards' },
  { id: '452522995', name: 'Danny Riggs' },
  { id: '465765582', name: 'Dante Amigone' },
  { id: '477103320', name: 'Samara Cassuci' },
  { id: '680535117', name: 'Trevor Jackson' },
  { id: '752490040', name: 'Amir Patel' },
  { id: '816307166', name: 'Jessica Rongen' },
  { id: '859404638', name: 'Katherine Lerner' },
  { id: '1112781027', name: 'Laura Carmony' },
  { id: '1267850482', name: 'Ross Abbott' },
  { id: '1268435101', name: 'Raven Adan' },
  { id: '1562201038', name: 'Elisabeth Elsborg' },
  { id: '1657979770', name: 'Warren Miles' },
  { id: '1675270341', name: 'Rudy Garza' },
  { id: '1740878928', name: 'Mariana Kuri' },
]

const getSincRepId = (name: string | null): string | null => {
  if (!name || name.trim() === '') return null

  const searchName = name.trim().toLowerCase()

  const rep = SINC_REPS.find(rep =>
    rep.name.toLowerCase().includes(searchName) ||
    searchName.includes(rep.name.toLowerCase().split(' ')[0].toLowerCase())
  )

  return rep ? rep.id : null
}

interface DealRequest {
  attendeeId: string
  forumId: string
  status: 'approved' | 'denied' | 'waitlisted' | 'preliminary_approved'
}

interface AttendeeData {
  id: string
  first_name: string
  last_name: string
  email: string
  company: string
  title: string
  industry: string
  sinc_rep: string
  management_level: string
}

interface ForumData {
  id: string
  name: string
  brand: string
  date: string
  city: string
}

interface ForumSettingsData {
  deal_code: string | null
}

const getHubSpotDealStageAndPipeline = (status: string): { dealstage: string, pipeline: string } => {
  const pipeline = '90149250'
  let dealstage = '166944416'

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
      dealstage = '166944416'
  }

  return { dealstage, pipeline }
}

const getExecutiveAttendanceLevel = (managementLevel: string | null): string => {
  if (!managementLevel || managementLevel.trim() === '') {
    return 'Net New'
  }

  switch (managementLevel.trim()) {
    case 'C-Suite':
      return 'C-Level'
    case 'VP':
      return 'VP-Director'
    case 'Director':
      return 'VP-Director'
    case 'Manager':
      return 'Midmarket'
    default:
      return 'Net New'
  }
}

const findContactByEmail = async (
  email: string,
  hubspotApiKey: string
): Promise<string | null> => {
  try {
    console.log(`🔍 Searching for contact with email: ${email}`)
    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hubspotApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'email',
                  operator: 'EQ',
                  value: email,
                },
              ],
            },
          ],
          properties: ['id', 'email', 'firstname', 'lastname'],
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Failed to search for contact:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
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

const createContact = async (
  attendee: AttendeeData,
  hubspotApiKey: string
): Promise<string | null> => {
  try {
    console.log(`👤 Creating new contact for: ${attendee.email}`)
    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hubspotApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            email: attendee.email,
            firstname: attendee.first_name,
            lastname: attendee.last_name,
            company: attendee.company,
            jobtitle: attendee.title,
            industry: attendee.industry || '',
          },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Failed to create contact:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
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

const associateDealWithContact = async (
  dealId: string,
  contactId: string,
  hubspotApiKey: string
): Promise<boolean> => {
  try {
    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/deal_to_contact`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${hubspotApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.error(
        'Failed to associate deal with contact:',
        response.status,
        await response.text()
      )
      return false
    }

    console.log(
      `Successfully associated deal ${dealId} with contact ${contactId}`
    )
    return true
  } catch (error) {
    console.error('Error associating deal with contact:', error)
    return false
  }
}


const createDeal = async (
  attendee: AttendeeData,
  forum: ForumData,
  dealCode: string,
  status: string,
  contactId: string,
  hubspotApiKey: string
): Promise<string | null> => {
  try {
    const { dealstage, pipeline } = getHubSpotDealStageAndPipeline(status)

    const executiveLevel = getExecutiveAttendanceLevel(attendee.management_level)

    const dealProperties: any = {
      dealname: dealCode,
      dealstage: dealstage,
      pipeline: pipeline,
      closedate: new Date().toISOString(),
      company_name: attendee.company,
      contact_email: attendee.email,
      contact_name: `${attendee.first_name} ${attendee.last_name}`,
      industry: attendee.industry,
      sinc_deal_type: 'Forum Attendee',
      executive_attendance_level: executiveLevel
    }

    if (attendee.sinc_rep) {
      const ownerId = getSincRepId(attendee.sinc_rep)
      if (ownerId) {
        console.log(`Assigning HubSpot owner ID: ${ownerId} for SINC rep: ${attendee.sinc_rep}`)
        dealProperties.hubspot_owner_id = ownerId
      } else {
        console.warn(`Could not find HubSpot owner ID for SINC rep: ${attendee.sinc_rep}`)
      }
    }

    console.log(`Creating new deal: ${dealCode}`)
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
    console.log(`✅ Deal created successfully with ID: ${dealId}`)

    console.log(`Associating deal ${dealId} with contact ${contactId}...`)
    const associationSuccess = await associateDealWithContact(dealId, contactId, hubspotApiKey)

    if (associationSuccess) {
      console.log(`✅ Deal association successful`)
    } else {
      console.warn(`⚠️ Deal association failed but deal was created`)
    }

    return dealId
  } catch (error) {
    console.error('Error creating deal:', error)
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
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

    const { data: forumSettings, error: settingsError } = await supabaseClient
      .from('forum_settings')
      .select('deal_code')
      .eq('forum_id', forumId)
      .maybeSingle()

    if (settingsError || !forumSettings || !forumSettings.deal_code) {
      console.error('Forum settings or deal_code not found:', settingsError)
      throw new Error(`Forum settings or deal_code not found for forum: ${forumId}`)
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

    const dealId = await createDeal(attendee, forum, forumSettings.deal_code, status, contactId, hubspotApiKey)

    if (!dealId) {
      throw new Error('Failed to create deal in HubSpot')
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
