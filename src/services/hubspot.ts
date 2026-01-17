export interface HubSpotSubmission {
  submittedAt: string;
  values: Array<{
    name: string;
    value: string;
  }>;
  pageUrl?: string;
  pageName?: string;
}

export interface SavedAttendee {
  email: string;
  name: string;
  table: string;
  action: 'created' | 'updated';
}

export interface SaveError {
  submission: string;
  error: string;
}

export interface SaveResults {
  savedAttendees: SavedAttendee[];
  errors: SaveError[];
}

export interface EnrichmentResults {
  enriched: number;
  errors: string[];
}

export interface HubSpotResponse {
  success: boolean;
  formId: string;
  totalSubmissions: number;
  submissions: HubSpotSubmission[];
  saveResults?: SaveResults;
  enrichmentResults?: EnrichmentResults;
  error?: string;
}

export async function fetchInitialRegistration(
  formId: string,
  eventId: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
  hubspotApiKey: string,
  saveToDatabase: boolean = false
): Promise<HubSpotResponse> {
  const apiUrl = `${supabaseUrl}/functions/v1/fetch-initial-registration`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ formId, eventId, apiKey: hubspotApiKey, saveToDatabase }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return await response.json();
}

export async function fetchExecutiveProfile(
  formId: string,
  eventId: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
  hubspotApiKey: string,
  saveToDatabase: boolean = false
): Promise<HubSpotResponse> {
  const apiUrl = `${supabaseUrl}/functions/v1/fetch-executive-profile`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ formId, eventId, apiKey: hubspotApiKey, saveToDatabase }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return await response.json();
}
