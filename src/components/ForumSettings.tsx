import { useEffect, useState } from 'react';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ForumSettings as ForumSettingsType } from '../types/database';

interface ForumSettingsProps {
  forumId: string;
}

export function ForumSettings({ forumId }: ForumSettingsProps) {
  const [settings, setSettings] = useState<ForumSettingsType | null>(null);
  const [initialFormId, setInitialFormId] = useState('');
  const [executiveFormId, setExecutiveFormId] = useState('');
  const [approvedTemplateId, setApprovedTemplateId] = useState('');
  const [deniedTemplateId, setDeniedTemplateId] = useState('');
  const [waitlistedTemplateId, setWaitlistedTemplateId] = useState('');
  const [preliminaryApprovedTemplateId, setPreliminaryApprovedTemplateId] = useState('');
  const [dealCode, setDealCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [forumId]);

  async function fetchSettings() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('forum_settings')
        .select('*')
        .eq('forum_id', forumId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setInitialFormId(data.initial_registration_form_id);
        setExecutiveFormId(data.executive_profile_form_id);
        setApprovedTemplateId(data.approved_email_template_id || '');
        setDeniedTemplateId(data.denied_email_template_id || '');
        setWaitlistedTemplateId(data.waitlisted_email_template_id || '');
        setPreliminaryApprovedTemplateId(data.preliminary_approved_email_template_id || '');
        setDealCode(data.deal_code || '');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const { error } = await supabase
        .from('forum_settings')
        .upsert({
          forum_id: forumId,
          initial_registration_form_id: initialFormId,
          executive_profile_form_id: executiveFormId,
          approved_email_template_id: approvedTemplateId,
          denied_email_template_id: deniedTemplateId,
          waitlisted_email_template_id: waitlistedTemplateId,
          preliminary_approved_email_template_id: preliminaryApprovedTemplateId,
          deal_code: dealCode,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'forum_id'
        });

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message);
      }

      await fetchSettings();
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">HubSpot Form Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Initial Registration Form ID
          </label>
          <input
            type="text"
            value={initialFormId}
            onChange={(e) => setInitialFormId(e.target.value)}
            placeholder="Enter HubSpot form ID"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Form used for initial attendee registration
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Executive Profile Form ID
          </label>
          <input
            type="text"
            value={executiveFormId}
            onChange={(e) => setExecutiveFormId(e.target.value)}
            placeholder="Enter HubSpot form ID"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Form used for executive profile submission (required for full approval)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deal Code
          </label>
          <input
            type="text"
            value={dealCode}
            onChange={(e) => setDealCode(e.target.value)}
            placeholder="Enter deal code"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            HubSpot deal code for this forum
          </p>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-4">Email Template Settings</h3>
      <p className="text-sm text-gray-600 mb-4">
        Configure SendGrid email template IDs for status notifications. Leave blank to use default templates.
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Approved Status Email Template ID
          </label>
          <input
            type="text"
            value={approvedTemplateId}
            onChange={(e) => setApprovedTemplateId(e.target.value)}
            placeholder="d-xxxxxxxxxxxxx (optional)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Sent when an attendee is approved for the forum
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preliminary Approved Status Email Template ID
          </label>
          <input
            type="text"
            value={preliminaryApprovedTemplateId}
            onChange={(e) => setPreliminaryApprovedTemplateId(e.target.value)}
            placeholder="d-xxxxxxxxxxxxx (optional)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Sent when an attendee is preliminary approved (pending executive profile)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Waitlisted Status Email Template ID
          </label>
          <input
            type="text"
            value={waitlistedTemplateId}
            onChange={(e) => setWaitlistedTemplateId(e.target.value)}
            placeholder="d-xxxxxxxxxxxxx (optional)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Sent when an attendee is placed on the waitlist
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Denied Status Email Template ID
          </label>
          <input
            type="text"
            value={deniedTemplateId}
            onChange={(e) => setDeniedTemplateId(e.target.value)}
            placeholder="d-xxxxxxxxxxxxx (optional)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Sent when an attendee application is denied
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
