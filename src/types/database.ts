export type AttendeeStage =
  | 'in_queue'
  | 'preliminary_approved'
  | 'approved'
  | 'denied'
  | 'waitlisted';

export interface ProfileQuestion {
  question: string;
  answer: string | string[];
}

export interface Attendee {
  id: string;
  forum_id: string;
  stage: AttendeeStage;
  approval_date: string | null;
  pre_event_call_scheduled: boolean;
  intro_email_sent_date: string | null;
  speaker: boolean;
  wishlist: string;
  rebook: boolean;
  council_member: boolean;
  call_setter: string;
  sinc_rep: string;
  first_name: string;
  last_name: string;
  company: string;
  title: string;
  management_level: string;
  linkedin_title: string;
  email: string;
  company_email: string;
  cellphone: string;
  linkedin: string;
  company_size: string;
  industry: string;
  company_based_out_of: string;
  city: string;
  state: string;
  flight: string;
  airport: string;
  hotel: string;
  arriving: string | null;
  departing: string | null;
  dietary_notes: string;
  gender: string;
  notes: string;
  denial_reason: string | null;
  executive_profile_received: boolean;
  executive_profile_data: ProfileQuestion[] | null;
  created_at: string;
  updated_at: string;
}

export interface ForumSettings {
  id: string;
  forum_id: string;
  initial_registration_form_id: string;
  executive_profile_form_id: string;
  approved_email_template_id: string;
  denied_email_template_id: string;
  waitlisted_email_template_id: string;
  preliminary_approved_email_template_id: string;
  created_at: string;
  updated_at: string;
}

export interface EmailAuditLog {
  id: string;
  attendee_id: string;
  email_type: 'approved' | 'denied' | 'waitlisted' | 'preliminary_approved';
  recipient_email: string;
  recipient_name: string;
  status: 'sent' | 'failed' | 'pending';
  sent_at: string;
  created_at: string;
}
