import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Trash2, Save, Maximize2, FileJson, FileText, CheckCircle2, Mail, Loader2 } from 'lucide-react';
import { supabase, forumsClient } from '../lib/supabase';
import type { Attendee, AttendeeStage, ForumSettings } from '../types/database';
import type { Forum } from '../lib/supabase';
import { AttendeeModal } from './AttendeeModal';
import { ExecutiveProfileViewer } from './ExecutiveProfileViewer';
import { EmailConfirmModal } from './EmailConfirmModal';
import { DenialReasonModal } from './DenialReasonModal';
import { sendStatusEmail, hasEmailBeenSent } from '../services/emailService';
import type { EmailStatusType } from '../constants/emailTemplates';
import { sendApprovalNotification, sendPreliminaryApprovalNotification } from '../services/slackService';
import { useAuth } from '../contexts/AuthContext';
import { canApproveAttendees, canSendEmails, canDeleteAttendees } from '../utils/permissions';

interface AttendeeRowProps {
  attendee: Attendee;
  onRefresh: () => void;
}

const STAGE_COLORS: Record<AttendeeStage, string> = {
  in_queue: 'bg-gray-100 text-gray-800',
  preliminary_approved: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  denied: 'bg-red-100 text-red-800',
  waitlisted: 'bg-orange-100 text-orange-800'
};

const STAGE_LABELS: Record<AttendeeStage, string> = {
  in_queue: 'In Queue',
  preliminary_approved: 'Preliminary Approved',
  approved: 'Approved',
  denied: 'Denied',
  waitlisted: 'Waitlisted'
};

const STAGE_OPTIONS: { value: AttendeeStage; label: string }[] = [
  { value: 'in_queue', label: 'In Queue' },
  { value: 'preliminary_approved', label: 'Preliminary Approved' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
  { value: 'waitlisted', label: 'Waitlisted' }
];

export function AttendeeRow({ attendee, onRefresh }: AttendeeRowProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [showProfileViewer, setShowProfileViewer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(attendee);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState<Record<EmailStatusType, boolean>>({
    approved: false,
    denied: false,
    waitlisted: false
  });
  const [forum, setForum] = useState<Forum | null>(null);
  const [forumSettings, setForumSettings] = useState<ForumSettings | null>(null);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [pendingEmailStatus, setPendingEmailStatus] = useState<EmailStatusType | null>(null);
  const [pendingStageChange, setPendingStageChange] = useState<AttendeeStage | null>(null);
  const [showDenialReasonModal, setShowDenialReasonModal] = useState(false);

  const userCanApprove = user ? canApproveAttendees(user.role) : false;
  const userCanSendEmails = user ? canSendEmails(user.role) : false;
  const userCanDelete = user ? canDeleteAttendees(user.role) : false;

  useEffect(() => {
    setFormData(attendee);
  }, [attendee]);

  useEffect(() => {
    fetchForumAndSettings();
    checkEmailStatus();
  }, [attendee.id, attendee.forum_id]);

  async function fetchForumAndSettings(): Promise<{ success: boolean; forumData: Forum | null }> {
    try {
      const { data: forumData, error: forumError } = await forumsClient
        .from('forums')
        .select('*')
        .eq('id', attendee.forum_id)
        .maybeSingle();

      if (forumError) {
        console.error('Error fetching forum:', forumError);
        return { success: false, forumData: null };
      } else if (forumData) {
        setForum(forumData);
      } else {
        console.warn('No forum data found for forum_id:', attendee.forum_id);
        return { success: false, forumData: null };
      }

      const { data: settingsData, error: settingsError } = await supabase
        .from('forum_settings')
        .select('*')
        .eq('forum_id', attendee.forum_id)
        .maybeSingle();

      if (settingsError) {
        console.error('Error fetching forum settings:', settingsError);
      } else if (settingsData) {
        setForumSettings(settingsData);
      }

      return { success: true, forumData };
    } catch (err) {
      console.error('Error fetching forum data:', err);
      return { success: false, forumData: null };
    }
  }

  async function checkEmailStatus() {
    const statuses: EmailStatusType[] = ['approved', 'denied', 'waitlisted'];
    const results: Record<EmailStatusType, boolean> = {
      approved: false,
      denied: false,
      waitlisted: false
    };

    for (const status of statuses) {
      results[status] = await hasEmailBeenSent(attendee.id, status);
    }

    setEmailSent(results);
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete ${attendee.first_name} ${attendee.last_name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('attendees')
        .delete()
        .eq('id', attendee.id);

      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error('Error deleting attendee:', err);
      alert('Failed to delete attendee');
    }
  }

  async function handleStageChange(newStage: AttendeeStage) {
    const emailableStages: AttendeeStage[] = ['approved', 'denied', 'waitlisted'];

    if (emailableStages.includes(newStage)) {
      let currentForum = forum;

      if (!currentForum) {
        console.log('Forum data not loaded yet, attempting to fetch...');
        const result = await fetchForumAndSettings();
        if (!result.success || !result.forumData) {
          console.error('Unable to load forum information');
          return;
        }
        currentForum = result.forumData;
      }

      const alreadySent = await hasEmailBeenSent(attendee.id, newStage as EmailStatusType);

      if (!alreadySent) {
        setPendingStageChange(newStage);
        setPendingEmailStatus(newStage as EmailStatusType);
        setShowEmailConfirm(true);
        return;
      }
    }

    await saveStageChange(newStage);
  }

  async function saveStageChange(newStage: AttendeeStage) {
    try {
      const { error } = await supabase
        .from('attendees')
        .update({ stage: newStage, updated_at: new Date().toISOString() })
        .eq('id', attendee.id);

      if (error) throw error;
      setFormData({ ...formData, stage: newStage });

      if (forum) {
        if (newStage === 'approved') {
          const slackResult = await sendApprovalNotification(attendee, forum);
          if (!slackResult.success) {
            console.error('Failed to send Slack notification:', slackResult.error);
          }
        } else if (newStage === 'preliminary_approved') {
          const slackResult = await sendPreliminaryApprovalNotification(attendee, forum);
          if (!slackResult.success) {
            console.error('Failed to send Slack notification:', slackResult.error);
          }
        }
      }

      onRefresh();
    } catch (err) {
      console.error('Error updating stage:', err);
      alert('Failed to update stage');
    }
  }

  async function handleConfirmEmail() {
    if (!pendingEmailStatus || !forum || !pendingStageChange) return;

    setShowEmailConfirm(false);
    setSendingEmail(true);

    try {
      await saveStageChange(pendingStageChange);

      const result = await sendStatusEmail(attendee, forum, pendingEmailStatus, forumSettings || undefined);

      if (result.success) {
        alert(`Email sent successfully to ${attendee.email}`);
        await checkEmailStatus();

        if (pendingEmailStatus === 'denied') {
          setShowDenialReasonModal(true);
        } else {
          setPendingEmailStatus(null);
          setPendingStageChange(null);
        }
      } else {
        alert(`Failed to send email: ${result.error}`);
        setPendingEmailStatus(null);
        setPendingStageChange(null);
      }
    } catch (err) {
      console.error('Error sending email:', err);
      alert('Failed to send email. Please try again.');
      setPendingEmailStatus(null);
      setPendingStageChange(null);
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleCancelEmail() {
    if (pendingStageChange) {
      await saveStageChange(pendingStageChange);
    }
    setShowEmailConfirm(false);
    setPendingEmailStatus(null);
    setPendingStageChange(null);
  }

  async function handleDenialReasonSubmit(reason: string) {
    try {
      const { error } = await supabase
        .from('attendees')
        .update({
          denial_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', attendee.id);

      if (error) throw error;

      setShowDenialReasonModal(false);
      setPendingEmailStatus(null);
      setPendingStageChange(null);
      onRefresh();
    } catch (err) {
      console.error('Error saving denial reason:', err);
      alert('Failed to save denial reason');
    }
  }

  function handleDenialReasonCancel() {
    setShowDenialReasonModal(false);
    setPendingEmailStatus(null);
    setPendingStageChange(null);
  }

  async function handleSave() {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('attendees')
        .update({
          ...formData,
          approval_date: formData.approval_date || null,
          intro_email_sent_date: formData.intro_email_sent_date || null,
          arriving: formData.arriving || null,
          departing: formData.departing || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', attendee.id);

      if (error) throw error;
      onRefresh();
      setIsExpanded(false);
    } catch (err) {
      console.error('Error saving attendee:', err);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  async function handleSendEmail() {
    if (!forum) {
      alert('Forum information not loaded. Please try again.');
      return;
    }

    setPendingEmailStatus(formData.stage as EmailStatusType);
    setShowEmailConfirm(true);
  }

  const canSendEmail = (stage: AttendeeStage): boolean => {
    return ['approved', 'denied', 'waitlisted'].includes(stage);
  };

  const isEmailAlreadySent = (): boolean => {
    return emailSent[formData.stage as EmailStatusType] || false;
  };

  const rowClassName = `hover:bg-gray-50 transition-colors border-b border-gray-200 ${
    attendee.stage === 'in_queue' && attendee.executive_profile_received ? 'bg-yellow-50' : ''
  }`;

  return (
    <>
      <tr className={rowClassName}>
        <td className="px-4 py-3 text-center">
          {attendee.executive_profile_data ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" title="Executive Profile Received" />
          ) : (
            <div className="w-5 h-5 border-2 border-gray-300 rounded mx-auto" title="No Executive Profile" />
          )}
        </td>
        <td className="px-4 py-3">
          {userCanApprove ? (
            <select
              value={formData.stage}
              onChange={(e) => handleStageChange(e.target.value as AttendeeStage)}
              className={`px-2 py-1 text-xs font-medium rounded border-0 focus:ring-2 focus:ring-blue-500 ${STAGE_COLORS[formData.stage]}`}
              onClick={(e) => e.stopPropagation()}
            >
              {STAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <span className={`px-2 py-1 text-xs font-medium rounded ${STAGE_COLORS[formData.stage]}`}>
              {STAGE_LABELS[formData.stage]}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="text-sm font-medium text-gray-900">
            {attendee.first_name} {attendee.last_name}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-700">{attendee.title}</td>
        <td className="px-4 py-3 text-sm text-gray-700">{attendee.email}</td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            {userCanSendEmails && canSendEmail(formData.stage) && (
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || isEmailAlreadySent()}
                className={`p-2 rounded transition-colors ${
                  isEmailAlreadySent()
                    ? 'text-green-600 bg-green-50 cursor-not-allowed'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
                title={
                  isEmailAlreadySent()
                    ? `${STAGE_LABELS[formData.stage]} email already sent`
                    : `Send ${STAGE_LABELS[formData.stage]} email`
                }
              >
                {sendingEmail ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isEmailAlreadySent() ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowJsonModal(true)}
              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
              title="View JSON"
            >
              <FileJson className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Open in Modal"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            {userCanDelete && (
              <button
                onClick={handleDelete}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-4 py-3 bg-gray-50">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {attendee.executive_profile_data && (
                    <button
                      type="button"
                      onClick={() => setShowProfileViewer(true)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      <FileText className="w-3 h-3" />
                      View Exec Profile
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {}}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                  title="Create HubSpot Deal"
                >
                  Create HubSpot Deal
                </button>
              </div>

              <div className="grid grid-cols-6 gap-2.5 text-xs">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">First Name</label>
                  <input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Last Name</label>
                  <input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Company Email</label>
                  <input type="email" value={formData.company_email} onChange={(e) => setFormData({ ...formData, company_email: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Cellphone</label>
                  <input type="tel" value={formData.cellphone} onChange={(e) => setFormData({ ...formData, cellphone: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Gender</label>
                  <input type="text" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Company</label>
                  <input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Title</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">LinkedIn Title</label>
                  <input type="text" value={formData.linkedin_title} onChange={(e) => setFormData({ ...formData, linkedin_title: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">LinkedIn URL</label>
                  <input type="url" value={formData.linkedin} onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Management Level</label>
                  <select value={formData.management_level} onChange={(e) => setFormData({ ...formData, management_level: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded">
                    <option value="">Select...</option>
                    <option value="C-Suite">C-Suite</option>
                    <option value="VP">VP</option>
                    <option value="Director">Director</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Company Size</label>
                  <input type="text" value={formData.company_size} onChange={(e) => setFormData({ ...formData, company_size: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Industry</label>
                  <input type="text" value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div className="col-span-2">
                  <label className="block font-medium text-gray-700 mb-1">Company Based Out Of</label>
                  <input type="text" value={formData.company_based_out_of} onChange={(e) => setFormData({ ...formData, company_based_out_of: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">City</label>
                  <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">State</label>
                  <input type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Flight</label>
                  <input type="text" value={formData.flight} onChange={(e) => setFormData({ ...formData, flight: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Airport</label>
                  <input type="text" value={formData.airport} onChange={(e) => setFormData({ ...formData, airport: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Hotel</label>
                  <input type="text" value={formData.hotel} onChange={(e) => setFormData({ ...formData, hotel: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Arriving</label>
                  <input type="date" value={formData.arriving || ''} onChange={(e) => setFormData({ ...formData, arriving: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Departing</label>
                  <input type="date" value={formData.departing || ''} onChange={(e) => setFormData({ ...formData, departing: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Dietary Notes</label>
                  <input type="text" value={formData.dietary_notes} onChange={(e) => setFormData({ ...formData, dietary_notes: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Approval Date</label>
                  <input type="date" value={formData.approval_date || ''} onChange={(e) => setFormData({ ...formData, approval_date: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Intro Email Sent</label>
                  <input type="date" value={formData.intro_email_sent_date || ''} onChange={(e) => setFormData({ ...formData, intro_email_sent_date: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Call Setter</label>
                  <select value={formData.call_setter} onChange={(e) => setFormData({ ...formData, call_setter: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded">
                    <option value="">Select...</option>
                    <option value="Trevor">Trevor</option>
                    <option value="Jillian">Jillian</option>
                    <option value="Raven">Raven</option>
                    <option value="Julia">Julia</option>
                    <option value="Kim">Kim</option>
                    <option value="Dante">Dante</option>
                    <option value="Tucker">Tucker</option>
                    <option value="Elisabeth">Elisabeth</option>
                    <option value="Kaylee">Kaylee</option>
                    <option value="Katherine">Katherine</option>
                    <option value="Joe">Joe</option>
                    <option value="Mariana">Mariana</option>
                    <option value="Samara">Samara</option>
                    <option value="Beau">Beau</option>
                    <option value="Ross">Ross</option>
                    <option value="Amir">Amir</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-2.5 text-xs mt-3 pt-3 border-t border-gray-200">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">SINC Rep</label>
                  <select value={formData.sinc_rep} onChange={(e) => setFormData({ ...formData, sinc_rep: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded">
                    <option value="">Select...</option>
                    <option value="Trevor">Trevor</option>
                    <option value="Jillian">Jillian</option>
                    <option value="Raven">Raven</option>
                    <option value="Julia">Julia</option>
                    <option value="Kim">Kim</option>
                    <option value="Dante">Dante</option>
                    <option value="Tucker">Tucker</option>
                    <option value="Elisabeth">Elisabeth</option>
                    <option value="Kaylee">Kaylee</option>
                    <option value="Katherine">Katherine</option>
                    <option value="Joe">Joe</option>
                    <option value="Mariana">Mariana</option>
                    <option value="Samara">Samara</option>
                    <option value="Beau">Beau</option>
                    <option value="Ross">Ross</option>
                    <option value="Amir">Amir</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Wishlist</label>
                  <select value={formData.wishlist} onChange={(e) => setFormData({ ...formData, wishlist: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded">
                    <option value="">Select...</option>
                    <option value="SINC">SINC</option>
                    <option value="Client">Client</option>
                    <option value="Both">Both</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div className="col-span-4 flex gap-6 items-center pt-6">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.pre_event_call_scheduled} onChange={(e) => setFormData({ ...formData, pre_event_call_scheduled: e.target.checked })} className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded" />
                    <span className="text-gray-700">Pre Event Call</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.speaker} onChange={(e) => setFormData({ ...formData, speaker: e.target.checked })} className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded" />
                    <span className="text-gray-700">Speaker</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.rebook} onChange={(e) => setFormData({ ...formData, rebook: e.target.checked })} className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded" />
                    <span className="text-gray-700">Rebook</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.council_member} onChange={(e) => setFormData({ ...formData, council_member: e.target.checked })} className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded" />
                    <span className="text-gray-700">Council Member</span>
                  </label>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <label className="block font-medium text-gray-700 mb-1 text-xs">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded" />
              </div>

              {formData.stage === 'denied' && attendee.denial_reason && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <label className="block font-medium text-gray-700 mb-1 text-xs">Denial Reason</label>
                  <div className="w-full px-2 py-1.5 bg-red-50 border border-red-200 rounded text-xs text-gray-900">{attendee.denial_reason}</div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setIsExpanded(false)} className="px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 rounded transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded transition-colors">
                  <Save className="w-3 h-3" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
      {showModal && (
        <AttendeeModal
          forumId={attendee.forum_id}
          attendee={attendee}
          onClose={() => {
            setShowModal(false);
            onRefresh();
          }}
        />
      )}
      {showJsonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900">
                Attendee Data (JSON)
              </h2>
              <button
                onClick={() => setShowJsonModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto border border-gray-200">
                {JSON.stringify(attendee, null, 2)}
              </pre>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(attendee, null, 2));
                  alert('JSON copied to clipboard!');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => setShowJsonModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showProfileViewer && attendee.executive_profile_data && (
        <ExecutiveProfileViewer
          profileData={attendee.executive_profile_data as Array<{question: string, answer: string | string[]}>}
          attendeeName={`${attendee.first_name} ${attendee.last_name}`}
          onClose={() => setShowProfileViewer(false)}
        />
      )}
      {showEmailConfirm && pendingEmailStatus && (
        <EmailConfirmModal
          attendeeName={`${attendee.first_name} ${attendee.last_name}`}
          attendeeEmail={attendee.email}
          statusType={pendingEmailStatus}
          onConfirm={handleConfirmEmail}
          onCancel={handleCancelEmail}
        />
      )}
      {showDenialReasonModal && (
        <DenialReasonModal
          attendeeName={`${attendee.first_name} ${attendee.last_name}`}
          onConfirm={handleDenialReasonSubmit}
          onCancel={handleDenialReasonCancel}
        />
      )}
    </>
  );
}
