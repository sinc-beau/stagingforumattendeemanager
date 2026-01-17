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

interface HubSpotFormField {
  name: string;
  label: string;
  fieldType: string;
  options?: Array<{
    label: string;
    value: string;
  }>;
  dependentFields?: Array<{
    dependentCondition: any;
    dependentField: HubSpotFormField;
  }>;
}

interface HubSpotFormDefinition {
  name: string;
  fieldGroups: Array<{
    fields?: HubSpotFormField[];
    groupType?: string;
    richTextType?: string;
    richText?: string;
  }>;
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

function buildRawProfileData(values: Record<string, string | string[]>): Array<{question: string, answer: string | string[]}> {
  return Object.entries(values).map(([question, answer]) => ({
    question,
    answer
  }));
}

function buildExecutiveProfileNotes(values: Record<string, string | string[]>): string {
  const sections: string[] = [];

  const getValue = (key: string): string => {
    const val = values[key];
    if (Array.isArray(val)) return val.join(', ');
    return val || '';
  };

  if (values.if_you_have_another_topic_in_mind__please_share_below) {
    sections.push(`Additional Speaking Topic: ${getValue('if_you_have_another_topic_in_mind__please_share_below')}`);
  }

  if (values.please_specify) {
    sections.push(`Additional Notes: ${getValue('please_specify')}`);
  }

  return sections.join('\n\n');
}

async function processExecutiveProfile(
  supabase: any,
  eventId: string,
  values: Record<string, string | string[]>,
  email: string,
  firstName: string,
  lastName: string,
  name: string,
  savedAttendees: SavedAttendee[],
  errors: SaveError[]
): Promise<void> {
  try {
    const getStringValue = (key: string): string => {
      const val = values[key];
      if (Array.isArray(val)) return val.join('; ');
      return val || '';
    };

    const title = getStringValue('jobtitle');

    const hotelRequired = getStringValue('hotel_accommodation_required_');
    const hotelValue = hotelRequired.toLowerCase() === 'yes' ? 'Required' : hotelRequired.toLowerCase() === 'no' ? 'Not Required' : hotelRequired;

    const rawProfileData = buildRawProfileData(values);

    const attendeeData: Record<string, any> = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      company: getStringValue('company'),
      title: title,
      industry: getStringValue('industry___exec_profile'),
      cellphone: getStringValue('mobilephone'),
      company_size: getStringValue('total_company_employees'),
      airport: getStringValue('departing_airport_preference__code___if_you_are_requesting_a_flight_'),
      gender: getStringValue('for_travelling_accommodations__choose_gender_as_listed_in_government_issued_id'),
      dietary_notes: getStringValue('dietary_restrictions'),
      hotel: hotelValue,
      notes: buildExecutiveProfileNotes(values),
      executive_profile_received: true,
      executive_profile_data: rawProfileData,
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
  } catch (error) {
    throw error;
  }
}

async function enrichAttendeeData(
  supabase: any,
  eventId: string,
  formId: string,
  apiKey: string
): Promise<{enriched: number, errors: string[]}> {
  try {
    const response = await fetch(`https://api.hubapi.com/marketing/v3/forms/${formId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { enriched: 0, errors: [`Failed to fetch form definition: ${response.status}`] };
    }

    const formDefinition: HubSpotFormDefinition = await response.json();

    if (!formDefinition.fieldGroups || !Array.isArray(formDefinition.fieldGroups)) {
      const errorMsg = 'Invalid form definition: fieldGroups is missing or not an array';
      return { enriched: 0, errors: [errorMsg] };
    }

    const fieldMap = new Map<string, HubSpotFormField>();
    const fieldMapLowercase = new Map<string, HubSpotFormField>();

    let totalFields = 0;

    function extractFields(field: HubSpotFormField) {
      fieldMap.set(field.name, field);
      fieldMapLowercase.set(field.name.toLowerCase(), field);
      totalFields++;

      if (field.dependentFields && Array.isArray(field.dependentFields)) {
        field.dependentFields.forEach((depFieldWrapper) => {
          if (depFieldWrapper.dependentField) {
            extractFields(depFieldWrapper.dependentField);
          }
        });
      }
    }

    formDefinition.fieldGroups.forEach(group => {
      if (group.fields && Array.isArray(group.fields)) {
        group.fields.forEach(field => {
          extractFields(field);
        });
      }
    });

    const { data: attendees, error: fetchError } = await supabase
      .from('attendees')
      .select('id, email, executive_profile_data')
      .eq('forum_id', eventId)
      .eq('executive_profile_received', true)
      .not('executive_profile_data', 'is', null);

    if (fetchError) {
      return { enriched: 0, errors: [fetchError.message] };
    }

    let enrichedCount = 0;
    const enrichmentErrors: string[] = [];

    for (const attendee of attendees || []) {
      try {
        const rawData = attendee.executive_profile_data as Array<{question: string, answer: string | string[]}>;

        const enrichedData: Array<{question: string, answer: string | string[]}> = [];

        for (const item of rawData) {
          const fieldName = item.question;
          const baseFieldName = fieldName.split(';')[0];

          let field = fieldMap.get(baseFieldName);

          if (!field) {
            field = fieldMapLowercase.get(baseFieldName.toLowerCase());
          }

          if (!field) {
            const normalizedFieldName = baseFieldName.replace(/[_-]/g, '').toLowerCase();
            for (const [key, value] of fieldMapLowercase.entries()) {
              if (key.replace(/[_-]/g, '') === normalizedFieldName) {
                field = value;
                break;
              }
            }
          }

          if (field) {
            let enrichedAnswer: string | string[];

            const decodeHtml = (html: string): string => {
              return html
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'")
                .replace(/<[^>]*>/g, '');
            };

            const formatAnswer = (ans: string): string => {
              let formatted = decodeHtml(ans);

              if (formatted.toLowerCase() === 'true') {
                formatted = 'Yes';
              } else if (formatted.toLowerCase() === 'false') {
                formatted = 'No';
              }

              if (/^\d{13}$/.test(formatted)) {
                const date = new Date(parseInt(formatted));
                formatted = date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
              }

              return formatted;
            };

            if (Array.isArray(item.answer)) {
              enrichedAnswer = item.answer.map(ans => {
                const formatted = formatAnswer(ans);
                if (field!.options) {
                  const option = field!.options.find(opt => opt.value === ans);
                  if (option) {
                    return decodeHtml(option.label);
                  }
                }
                return formatted;
              });
            } else if (typeof item.answer === 'string') {
              const answerStr = item.answer;

              if ((field.fieldType === 'booleancheckbox' || field.fieldType === 'checkbox' || field.fieldType === 'multiple_checkboxes') && answerStr.includes(';')) {
                const values = answerStr.split(';').map(v => v.trim()).filter(v => v);
                enrichedAnswer = values.map(val => {
                  const formatted = formatAnswer(val);
                  if (field!.options) {
                    const option = field!.options.find(opt => opt.value === val);
                    if (option) {
                      return decodeHtml(option.label);
                    }
                  }
                  return formatted;
                });
              } else {
                const formatted = formatAnswer(answerStr);
                if (field.options) {
                  const option = field.options.find(opt => opt.value === answerStr);
                  if (option) {
                    enrichedAnswer = decodeHtml(option.label);
                  } else {
                    enrichedAnswer = formatted;
                  }
                } else {
                  enrichedAnswer = formatted;
                }
              }
            } else {
              enrichedAnswer = String(item.answer);
            }

            enrichedData.push({
              question: decodeHtml(field.label),
              answer: enrichedAnswer
            });
          } else {
            enrichedData.push(item);
          }
        }

        const { error: updateError } = await supabase
          .from('attendees')
          .update({ executive_profile_data: enrichedData })
          .eq('id', attendee.id);

        if (updateError) {
          enrichmentErrors.push(`${attendee.email}: ${updateError.message}`);
        } else {
          enrichedCount++;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        enrichmentErrors.push(`${attendee.email}: ${errorMsg}`);
      }
    }

    return { enriched: enrichedCount, errors: enrichmentErrors };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { enriched: 0, errors: [errorMsg] };
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
    let enrichmentResults = null;

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
          const values: Record<string, string | string[]> = {};
          const fieldValueMap = new Map<string, string[]>();

          submission.values.forEach(field => {
            const fieldName = field.name;

            if (!fieldValueMap.has(fieldName)) {
              fieldValueMap.set(fieldName, []);
            }
            fieldValueMap.get(fieldName)!.push(field.value);
          });

          fieldValueMap.forEach((vals, fieldName) => {
            if (vals.length === 1) {
              values[fieldName] = vals[0];
            } else {
              values[fieldName] = vals;
            }
          });

          const email = (values.email || values.Email || values.EMAIL) as string;
          const firstName = (values.firstname || values.FirstName || values.first_name || '') as string;
          const lastName = (values.lastname || values.LastName || values.last_name || '') as string;
          const name = `${firstName} ${lastName}`.trim() || email;

          if (!email) {
            errors.push({
              submission: JSON.stringify(submission),
              error: 'No email field found',
            });
            continue;
          }

          await processExecutiveProfile(supabase, eventId, values, email, firstName, lastName, name, savedAttendees, errors);
        } catch (err) {
          errors.push({
            submission: JSON.stringify(submission),
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      saveResults = { savedAttendees, errors };

      // ALWAYS run enrichment after saving executive profiles
      enrichmentResults = await enrichAttendeeData(supabase, eventId, formId, apiKey);
    }

    return new Response(
      JSON.stringify({
        success: true,
        formId,
        totalSubmissions: submissions.length,
        submissions,
        saveResults,
        enrichmentResults,
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
