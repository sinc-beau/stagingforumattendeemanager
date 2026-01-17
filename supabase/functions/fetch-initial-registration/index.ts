import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface HubSpotSubmission {
  submittedAt: string;
  values: Array<{
    name: string;
    value: string;
  }>;
  pageUrl?: string;
  pageName?: string;
}

interface SavedAttendee {
  email: string;
  name: string;
  table: string;
  action: 'created' | 'updated';
}

interface SaveError {
  submission: string;
  error: string;
}

async function processInitialRegistration(
  supabase: any,
  eventId: string,
  values: Record<string, string>,
  email: string,
  firstName: string,
  lastName: string,
  name: string,
  savedAttendees: SavedAttendee[],
  errors: SaveError[]
): Promise<void> {
  const availability = values.please_provide_3_or_4_dates_and_time_slots_that_you_are_available_during_the_next_one_to_two_weeks || '';
  const title = values.jobtitle || values.JobTitle || values.job_title || '';

  const attendeeData: Record<string, any> = {
    first_name: firstName,
    last_name: lastName,
    email: email,
    company: values.company || values.Company || '',
    title: title,
    industry: values.industry || values.Industry || '',
    cellphone: values.phone || values.Phone || values.cellphone || '',
    notes: availability ? `Availability: ${availability}` : '',
  };

  const { data: existing } = await supabase
    .from('attendees')
    .select('id, stage')
    .eq('forum_id', eventId)
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    attendeeData.stage = existing.stage;

    const { error } = await supabase
      .from('attendees')
      .update(attendeeData)
      .eq('id', existing.id);

    if (error) throw error;

    savedAttendees.push({
      email,
      name,
      table: 'attendees',
      action: 'updated',
    });
  } else {
    attendeeData.stage = 'in_queue';

    const { error } = await supabase
      .from('attendees')
      .insert({
        forum_id: eventId,
        ...attendeeData,
      });

    if (error) throw error;

    savedAttendees.push({
      email,
      name,
      table: 'attendees',
      action: 'created',
    });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { formId, eventId, apiKey, saveToDatabase } = await req.json();

    if (!formId || !apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: formId and apiKey"
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const submissions: HubSpotSubmission[] = [];
    let after: string | undefined = undefined;
    let hasMore = true;
    let pageCount = 0;
    const paginationDebug: any[] = [];

    while (hasMore && pageCount < 20) {
      pageCount++;
      const url = new URL(`https://api.hubapi.com/form-integrations/v1/submissions/forms/${formId}`);
      url.searchParams.append('limit', '50');
      if (after) {
        url.searchParams.append('after', after);
      }

      const hubspotResponse = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!hubspotResponse.ok) {
        const errorText = await hubspotResponse.text();
        return new Response(
          JSON.stringify({
            success: false,
            error: `HubSpot API error: ${hubspotResponse.status} - ${errorText}`,
            paginationDebug
          }),
          {
            status: hubspotResponse.status,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const hubspotData = await hubspotResponse.json();
      const pageResults = hubspotData.results || [];
      submissions.push(...pageResults);

      paginationDebug.push({
        page: pageCount,
        resultsCount: pageResults.length,
        totalSoFar: submissions.length,
        hasPaging: !!hubspotData.paging,
        hasNext: !!(hubspotData.paging && hubspotData.paging.next),
        nextAfter: hubspotData.paging?.next?.after,
      });

      if (hubspotData.paging && hubspotData.paging.next && hubspotData.paging.next.after) {
        after = hubspotData.paging.next.after;
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        hasMore = false;
      }
    }

    let saveResults = null;

    if (saveToDatabase && eventId) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Missing authorization header"
          }),
          {
            status: 401,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabase = createClient(
        supabaseUrl,
        authHeader.replace('Bearer ', '')
      );

      const savedAttendees: SavedAttendee[] = [];
      const errors: SaveError[] = [];

      for (const submission of submissions) {
        try {
          const values: Record<string, string> = {};
          submission.values.forEach(field => {
            values[field.name] = field.value;
          });

          const email = values.email || values.Email || values.EMAIL;
          const firstName = values.firstname || values.FirstName || values.first_name || '';
          const lastName = values.lastname || values.LastName || values.last_name || '';
          const name = `${firstName} ${lastName}`.trim() || email;

          if (!email) {
            errors.push({
              submission: JSON.stringify(submission),
              error: 'No email field found',
            });
            continue;
          }

          await processInitialRegistration(supabase, eventId, values, email, firstName, lastName, name, savedAttendees, errors);
        } catch (err) {
          errors.push({
            submission: JSON.stringify(submission),
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      saveResults = { savedAttendees, errors };
    }

    return new Response(
      JSON.stringify({
        success: true,
        formId,
        totalSubmissions: submissions.length,
        submissions,
        saveResults,
        paginationDebug,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : String(err)
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
