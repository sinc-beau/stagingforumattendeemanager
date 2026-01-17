export const DEFAULT_APPROVED_TEMPLATE_ID = 'd-2c170632a3744050b42a7b9133910a89';
export const DEFAULT_DENIED_TEMPLATE_ID = 'd-1b0a1b0ffda74f8e83cb92ecef704ac0';
export const DEFAULT_WAITLISTED_TEMPLATE_ID = 'd-e8dfbd20fcf64f379c3786b3713a3c4a';

export type EmailStatusType = 'approved' | 'denied' | 'waitlisted';

export function getTemplateId(
  statusType: EmailStatusType,
  forumSettings?: {
    approved_email_template_id?: string;
    denied_email_template_id?: string;
    waitlisted_email_template_id?: string;
  }
): string {
  if (!forumSettings) {
    return getDefaultTemplateId(statusType);
  }

  switch (statusType) {
    case 'approved':
      return forumSettings.approved_email_template_id || DEFAULT_APPROVED_TEMPLATE_ID;
    case 'denied':
      return forumSettings.denied_email_template_id || DEFAULT_DENIED_TEMPLATE_ID;
    case 'waitlisted':
      return forumSettings.waitlisted_email_template_id || DEFAULT_WAITLISTED_TEMPLATE_ID;
    default:
      return getDefaultTemplateId(statusType);
  }
}

function getDefaultTemplateId(statusType: EmailStatusType): string {
  switch (statusType) {
    case 'approved':
      return DEFAULT_APPROVED_TEMPLATE_ID;
    case 'denied':
      return DEFAULT_DENIED_TEMPLATE_ID;
    case 'waitlisted':
      return DEFAULT_WAITLISTED_TEMPLATE_ID;
  }
}
