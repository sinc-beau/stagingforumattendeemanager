import { supabase } from '../lib/supabase';
import type { Attendee, ForumSettings } from '../types/database';
import type { Forum } from '../lib/supabase';
import type { EmailStatusType } from '../constants/emailTemplates';
import { getTemplateId } from '../constants/emailTemplates';

export interface EmailRequest {
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  forumName?: string;
  type: EmailStatusType;
  attendeeId: string;
  eventName?: string;
  eventDate?: string;
  eventCity?: string;
  eventVenue?: string;
  eventSponsor?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
}

export interface EmailAuditLog {
  id: string;
  attendee_id: string;
  email_type: EmailStatusType;
  recipient_email: string;
  recipient_name: string;
  status: 'sent' | 'failed' | 'pending';
  sent_at: string;
  created_at: string;
}

export async function sendStatusEmail(
  attendee: Attendee,
  forum: Forum,
  statusType: EmailStatusType,
  forumSettings?: ForumSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const templateId = getTemplateId(statusType, forumSettings);

    const dynamicTemplateData = {
      firstName: attendee.first_name,
      lastName: attendee.last_name,
      company: attendee.company || '',
      title: attendee.title || '',
      eventName: forum.name,
      eventDate: new Date(forum.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      eventCity: forum.city,
      eventVenue: forum.venue,
      eventSponsor: forum.brand,
      forumName: forum.name
    };

    const emailRequest: EmailRequest = {
      email: attendee.email,
      firstName: attendee.first_name,
      lastName: attendee.last_name,
      company: attendee.company,
      forumName: forum.name,
      type: statusType,
      attendeeId: attendee.id,
      eventName: forum.name,
      eventDate: dynamicTemplateData.eventDate,
      eventCity: forum.city,
      eventVenue: forum.venue,
      eventSponsor: forum.brand,
      templateId,
      dynamicTemplateData
    };

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const apiUrl = `${supabaseUrl}/functions/v1/send-email`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailRequest)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || errorData.error || 'Failed to send email');
    }

    const result = await response.json();
    return { success: true };
  } catch (error) {
    console.error('Error sending status email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getEmailAuditLogs(attendeeId: string): Promise<EmailAuditLog[]> {
  try {
    const { data, error } = await supabase
      .from('email_audit_log')
      .select('*')
      .eq('attendee_id', attendeeId)
      .order('sent_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching email audit logs:', error);
    return [];
  }
}

export async function hasEmailBeenSent(
  attendeeId: string,
  emailType: EmailStatusType
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('email_audit_log')
      .select('id')
      .eq('attendee_id', attendeeId)
      .eq('email_type', emailType)
      .eq('status', 'sent')
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('Error checking email status:', error);
    return false;
  }
}
