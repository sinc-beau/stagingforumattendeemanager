import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DealRequest {
  attendeeId: string;
  forumId: string;
  status: "approved" | "denied" | "waitlisted";
}

interface AttendeeData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  title: string;
  industry: string;
  sinc_rep: string;
  management_level: string;
  company_size: string;
  hubspot_deal_id?: string;
}

const SINC_REP_HUBSPOT_IDS: Record<string, string> = {
  'Trevor': '680535117',
  'Jillian': '254155041',
  'Raven': '1268435101',
  'Julia': '76699261',
  'Kim': '246749077',
  'Dante': '465765582',
  'Tucker': '75919879',
  'Elisabeth': '1562201038',
  'Kaylee': '83333527',
  'Katherine': '859404638',
  'Joe': '1112781027',
  'Mariana': '1740878928',
  'Samara': '477103320',
  'Beau': '80655731',
  'Ross': '1267850482',
  'Amir': '752490040',
};

const FORUM_PIPELINE = "90169477";

const getHubSpotDealStage = (status: string): string => {
  switch (status) {
    case "approved":
      return "166990866";
    case "denied":
      return "166990871";
    case "waitlisted":
      return "166990868";
    default:
      return "166990866";
  }
};

const findContactByEmail = async (
  email: string,
  hubspotApiKey: string
): Promise<string | null> => {
  try {
    console.log(`🔍 Searching for contact with email: ${email}`);
    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hubspotApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "email",
                  operator: "EQ",
                  value: email,
                },
              ],
            },
          ],
          properties: ["id", "email", "firstname", "lastname"],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Failed to search for contact:", errorText);
      return null;
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      console.log(`✅ Found existing contact: ${data.results[0].id}`);
      return data.results[0].id;
    }

    console.log("ℹ️ No existing contact found");
    return null;
  } catch (error) {
    console.error("💥 Error searching for contact:", error);
    return null;
  }
};

const createContact = async (
  attendee: AttendeeData,
  hubspotApiKey: string
): Promise<string | null> => {
  try {
    console.log(`👤 Creating new contact for: ${attendee.email}`);
    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hubspotApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            email: attendee.email,
            firstname: attendee.first_name,
            lastname: attendee.last_name,
            company: attendee.company,
            jobtitle: attendee.title,
            industry: attendee.industry || "",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Failed to create contact:", errorText);
      return null;
    }

    const data = await response.json();
    console.log(`✅ Created new contact: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error("💥 Error creating contact:", error);
    return null;
  }
};

const createDeal = async (
  attendee: AttendeeData,
  dealCode: string,
  status: string,
  contactId: string,
  hubspotApiKey: string
): Promise<string | null> => {
  try {
    console.log(`💼 Creating deal: ${dealCode}`);

    const dealstage = getHubSpotDealStage(status);
    const ownerId = SINC_REP_HUBSPOT_IDS[attendee.sinc_rep];

    const dealProperties: Record<string, any> = {
      dealname: dealCode,
      dealstage: dealstage,
      pipeline: FORUM_PIPELINE,
      closedate: new Date().toISOString(),
      company_name: attendee.company,
      contact_email: attendee.email,
      contact_name: `${attendee.first_name} ${attendee.last_name}`,
      industry: attendee.industry || "",
      sinc_deal_type: "Forum Attendee",
    };

    if (ownerId) {
      dealProperties.hubspot_owner_id = ownerId;
    }

    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/deals`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hubspotApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: dealProperties,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to create deal:`, errorText);
      return null;
    }

    const data = await response.json();
    const dealId = data.id;
    console.log(`✅ Deal created: ${dealId}`);

    await associateDealWithContact(dealId, contactId, hubspotApiKey);

    return dealId;
  } catch (error) {
    console.error(`💥 Error creating deal:`, error);
    return null;
  }
};

const updateDeal = async (
  dealId: string,
  status: string,
  hubspotApiKey: string
): Promise<boolean> => {
  try {
    console.log(`🔄 Updating deal ${dealId} to status: ${status}`);

    const dealstage = getHubSpotDealStage(status);

    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${hubspotApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            dealstage: dealstage,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Failed to update deal:", errorText);
      return false;
    }

    console.log(`✅ Deal updated successfully`);
    return true;
  } catch (error) {
    console.error("💥 Error updating deal:", error);
    return false;
  }
};

const associateDealWithContact = async (
  dealId: string,
  contactId: string,
  hubspotApiKey: string
): Promise<boolean> => {
  try {
    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/deal_to_contact`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${hubspotApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to associate deal with contact");
      return false;
    }

    console.log(`✅ Associated deal with contact`);
    return true;
  } catch (error) {
    console.error("Error associating deal with contact:", error);
    return false;
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const hubspotApiKey = Deno.env.get("HUBSPOT_API_KEY");

    if (!hubspotApiKey) {
      console.error("❌ HUBSPOT_API_KEY not set");
      return new Response(
        JSON.stringify({
          error: "HubSpot API key not configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { attendeeId, forumId, status }: DealRequest = await req.json();

    if (!attendeeId || !status || !forumId) {
      return new Response(
        JSON.stringify({
          error: "Missing required parameters",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: attendee, error: attendeeError } = await supabaseClient
      .from("attendees")
      .select("*")
      .eq("id", attendeeId)
      .maybeSingle();

    if (attendeeError || !attendee) {
      console.error("Attendee not found:", attendeeError);
      throw new Error(`Attendee not found: ${attendeeId}`);
    }

    const { data: forumSettings, error: forumError } = await supabaseClient
      .from("forum_settings")
      .select("deal_code")
      .eq("forum_id", forumId)
      .maybeSingle();

    if (forumError) {
      console.error("Error fetching forum settings:", forumError);
    }

    const dealCode = forumSettings?.deal_code || `${forumId}-${attendeeId.substring(0, 8)}`;

    if (attendee.hubspot_deal_id) {
      const updated = await updateDeal(attendee.hubspot_deal_id, status, hubspotApiKey);

      if (updated) {
        return new Response(
          JSON.stringify({
            success: true,
            dealId: attendee.hubspot_deal_id,
            action: "updated",
            message: "HubSpot deal updated successfully",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    let contactId = await findContactByEmail(attendee.email, hubspotApiKey);

    if (!contactId) {
      contactId = await createContact(attendee, hubspotApiKey);

      if (!contactId) {
        throw new Error("Failed to find or create contact in HubSpot");
      }
    }

    const dealId = await createDeal(
      attendee,
      dealCode,
      status,
      contactId,
      hubspotApiKey
    );

    if (!dealId) {
      throw new Error("Failed to create deal in HubSpot");
    }

    await supabaseClient
      .from("attendees")
      .update({ hubspot_deal_id: dealId })
      .eq("id", attendeeId);

    return new Response(
      JSON.stringify({
        success: true,
        dealId,
        contactId,
        action: "created",
        message: "HubSpot deal created successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("HubSpot sync error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({
        error: "Failed to sync with HubSpot",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
