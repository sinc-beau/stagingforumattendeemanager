import { useState, useEffect } from 'react';
import { Download, Database, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchInitialRegistration, fetchExecutiveProfile, type HubSpotResponse } from '../services/hubspot';
import type { ForumSettings } from '../types/database';

interface HubSpotSyncProps {
  forumId: string;
  onSyncComplete?: () => void;
}

interface FetchResults {
  data: HubSpotResponse;
  newCount: number;
  duplicateCount: number;
}

export function HubSpotSync({ forumId, onSyncComplete }: HubSpotSyncProps) {
  const [settings, setSettings] = useState<ForumSettings | null>(null);
  const [execFetchResults, setExecFetchResults] = useState<FetchResults | null>(null);
  const [initFetchResults, setInitFetchResults] = useState<FetchResults | null>(null);
  const [execLoading, setExecLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [execSyncing, setExecSyncing] = useState(false);
  const [initSyncing, setInitSyncing] = useState(false);
  const [execError, setExecError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [execSuccess, setExecSuccess] = useState<string | null>(null);
  const [initSuccess, setInitSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [forumId]);

  async function fetchSettings() {
    try {
      const { data, error } = await supabase
        .from('forum_settings')
        .select('*')
        .eq('forum_id', forumId)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  }

  async function analyzeSubmissions(formId: string, type: 'executive' | 'initial'): Promise<{ newCount: number; duplicateCount: number }> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const fetchFunction = type === 'executive' ? fetchExecutiveProfile : fetchInitialRegistration;
    const response = await fetchFunction(
      formId,
      forumId,
      supabaseUrl,
      supabaseAnonKey,
      false
    );

    const emails = response.submissions.map(sub => {
      const values: Record<string, string> = {};
      sub.values.forEach(field => {
        values[field.name] = field.value;
      });
      return values.email || values.Email || values.EMAIL;
    }).filter(Boolean);

    const { data: existingAttendees } = await supabase
      .from('attendees')
      .select('email')
      .eq('forum_id', forumId)
      .in('email', emails);

    const existingEmails = new Set(existingAttendees?.map(a => a.email) || []);
    const duplicateCount = emails.filter(email => existingEmails.has(email)).length;
    const newCount = emails.length - duplicateCount;

    return { newCount, duplicateCount };
  }

  async function handleFetch(type: 'executive' | 'initial') {
    const formId = type === 'executive' ? settings?.executive_profile_form_id : settings?.initial_registration_form_id;

    if (!formId) {
      const setError = type === 'executive' ? setExecError : setInitError;
      setError('Form ID not configured. Please configure it in the settings tab.');
      return;
    }

    const setLoading = type === 'executive' ? setExecLoading : setInitLoading;
    const setError = type === 'executive' ? setExecError : setInitError;
    const setResults = type === 'executive' ? setExecFetchResults : setInitFetchResults;
    const setSuccess = type === 'executive' ? setExecSuccess : setInitSuccess;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setResults(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const fetchFunction = type === 'executive' ? fetchExecutiveProfile : fetchInitialRegistration;
      const response = await fetchFunction(
        formId,
        forumId,
        supabaseUrl,
        supabaseAnonKey,
        false
      );

      const { newCount, duplicateCount } = await analyzeSubmissions(formId, type);

      setResults({
        data: response,
        newCount,
        duplicateCount
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleSync(type: 'executive' | 'initial') {
    const formId = type === 'executive' ? settings?.executive_profile_form_id : settings?.initial_registration_form_id;

    if (!formId) return;

    const setSyncing = type === 'executive' ? setExecSyncing : setInitSyncing;
    const setError = type === 'executive' ? setExecError : setInitError;
    const setSuccess = type === 'executive' ? setExecSuccess : setInitSuccess;
    const setResults = type === 'executive' ? setExecFetchResults : setInitFetchResults;

    setSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const fetchFunction = type === 'executive' ? fetchExecutiveProfile : fetchInitialRegistration;
      const response = await fetchFunction(
        formId,
        forumId,
        supabaseUrl,
        supabaseAnonKey,
        true
      );

      if (response.saveResults) {
        const { savedAttendees, errors } = response.saveResults;

        if (errors.length > 0) {
          console.error('Sync errors:', errors);
          setError(
            `Synced ${savedAttendees.length} attendees but ${errors.length} errors occurred. First error: ${errors[0]?.error || 'Unknown error'}`
          );
        } else {
          let successMessage = `Successfully synced ${savedAttendees.length} attendees (${savedAttendees.filter(a => a.action === 'created').length} new, ${savedAttendees.filter(a => a.action === 'updated').length} updated)`;

          if (type === 'executive' && response.enrichmentResults) {
            successMessage += ` • Enriched ${response.enrichmentResults.enriched} profiles`;
          }

          setSuccess(successMessage);
        }

        setResults(null);
        if (onSyncComplete) {
          onSyncComplete();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSyncing(false);
    }
  }

  function FormSection({
    type,
    title,
    description,
    loading,
    syncing,
    error,
    success,
    fetchResults,
    onFetch,
    onSync
  }: {
    type: 'executive' | 'initial';
    title: string;
    description: string;
    loading: boolean;
    syncing: boolean;
    error: string | null;
    success: string | null;
    fetchResults: FetchResults | null;
    onFetch: () => void;
    onSync: () => void;
  }) {
    const formId = type === 'executive' ? settings?.executive_profile_form_id : settings?.initial_registration_form_id;
    const hasFormId = !!formId;

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
            {formId && (
              <p className="text-xs text-gray-500 mt-1 font-mono">Form ID: {formId}</p>
            )}
          </div>
        </div>

        {!hasFormId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-800 text-sm">
                Form ID not configured. Please configure it in the Settings tab.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3 mb-4">
          <button
            onClick={onFetch}
            disabled={loading || syncing || !hasFormId}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-300 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            {loading ? 'Fetching...' : 'Fetch'}
          </button>

          {fetchResults && (
            <button
              onClick={onSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              <Database className="w-4 h-4" />
              {syncing ? 'Syncing...' : 'Sync to Database'}
            </button>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          </div>
        )}

        {fetchResults && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-900 font-medium text-sm">
                    Found {fetchResults.data.totalSubmissions} submission{fetchResults.data.totalSubmissions !== 1 ? 's' : ''}
                  </p>
                  <p className="text-blue-800 text-sm mt-1">
                    {fetchResults.newCount} new • {fetchResults.duplicateCount} duplicate{fetchResults.duplicateCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <p className="text-blue-700 text-sm">
                Click "Sync to Database" to proceed with importing these submissions.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Debug Data:</h4>
              <pre className="text-xs text-gray-600 overflow-auto max-h-96 bg-white p-3 rounded border border-gray-200">
                {JSON.stringify(fetchResults.data, null, 2)}
              </pre>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FormSection
        type="executive"
        title="Executive Profile"
        description="Fetch and sync executive profile form submissions"
        loading={execLoading}
        syncing={execSyncing}
        error={execError}
        success={execSuccess}
        fetchResults={execFetchResults}
        onFetch={() => handleFetch('executive')}
        onSync={() => handleSync('executive')}
      />

      <FormSection
        type="initial"
        title="Initial Registration"
        description="Fetch and sync initial registration form submissions"
        loading={initLoading}
        syncing={initSyncing}
        error={initError}
        success={initSuccess}
        fetchResults={initFetchResults}
        onFetch={() => handleFetch('initial')}
        onSync={() => handleSync('initial')}
      />
    </div>
  );
}
