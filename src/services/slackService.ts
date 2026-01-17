import type { Attendee } from '../types/database';
import type { Forum } from '../lib/supabase';

interface SlackNotificationResult {
  success: boolean;
  error?: string;
}

export async function sendApprovalNotification(
  attendee: Attendee,
  forum: Forum
): Promise<SlackNotificationResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase configuration not found');
    return { success: false, error: 'Supabase configuration not found' };
  }

  const attendeeName = `${attendee.first_name} ${attendee.last_name}`;
  const forumName = forum.name;

  const messageText = `An approval was issued for ${attendeeName} for ${forumName}. Please visit the forum backoffice to fill in details about this attendee so the deal can be created in HubSpot.`;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-slack-message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: messageText }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Slack API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending Slack notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendPreliminaryApprovalNotification(
  attendee: Attendee,
  forum: Forum
): Promise<SlackNotificationResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase configuration not found');
    return { success: false, error: 'Supabase configuration not found' };
  }

  const attendeeName = `${attendee.first_name} ${attendee.last_name}`;
  const forumName = forum.name;

  const urgencyMessages = [
    'Strike while the iron\'s hot!',
    'Time to move fast!',
    'Act now while they\'re engaged!',
    'Don\'t let this opportunity cool off!',
    'Momentum is key - follow up ASAP!',
    'The timing is perfect - reach out now!',
    'Capture their interest while it\'s fresh!',
    'Speed matters - connect immediately!',
    'Hot lead alert - engage quickly!',
    'Window of opportunity - act fast!'
  ];

  const randomUrgency = urgencyMessages[Math.floor(Math.random() * urgencyMessages.length)];

  const messageText = `A preliminary approval was issued for ${attendeeName} for ${forumName} and their registration is pending submission of their full Executive Profile. ${randomUrgency}`;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-slack-message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: messageText }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Slack API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending Slack notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
