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
  const [settingsError, setSettingsError] = useState<string | null>(null);
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
      setSettingsError(null);
      const { data, error } = await supabase
        .from('forum_settings')
        .select('*')
        .eq('forum_id', forumId)
        .maybeSingle();

      if (error) {
        console.error('Forum settings error:', error);
        setSettingsError(`Failed to load settings: ${error.message}`);
        throw error;
      }

      console.log('Loaded settings:', data);
      setSettings(data);
    } catch (err) {
      console.error('Error fetching settings:', err);
      if (err instanceof Error && !settingsError) {
        setSettingsError(`Error: ${err.message}`);
      }
    }
  }

  async function analyzeSubmissions(formId: string, type: 'executive' | 'initial'): Promise<{ newCount: number; duplicateCount: number }> {
    const supabaseUrl = import.meta.env.VITE_EXTERNAL_FORUMS_URL;
    const supabaseAnonKey = import.meta.env.VITE_EXTERNAL_FORUMS_ANON_KEY;

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
      const supabaseUrl = import.meta.env.VITE_EXTERNAL_FORUMS_URL;
      const supabaseAnonKey = import.meta.env.VITE_EXTERNAL_FORUMS_ANON_KEY;

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
      const supabaseUrl = import.meta.env.VITE_EXTERNAL_FORUMS_URL;
      const supabaseAnonKey = import.meta.env.VITE_EXTERNAL_FORUMS_ANON_KEY;

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
      <div className="bg-gray-50 border border-gray-200 rounded p-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {formId && (
              <p className="text-xs text-gray-500 mt-0.5 font-mono">Form ID: {formId}</p>
            )}
          </div>
        </div>

        {!hasFormId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-800 text-xs">
                Form ID not configured. Please configure it in the Settings tab.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-2">
          <button
            onClick={onFetch}
            disabled={loading || syncing || !hasFormId}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-600 hover:bg-slate-700 disabled:bg-slate-300 text-white rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            {loading ? 'Fetching...' : 'Fetch'}
          </button>

          {fetchResults && (
            <button
              onClick={onSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded transition-colors"
            >
              <Database className="w-3.5 h-3.5" />
              {syncing ? 'Syncing...' : 'Sync to Database'}
            </button>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-xs">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded p-2 mb-2">
            <div className="flex items-start gap-1.5">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-800 text-xs">{success}</p>
            </div>
          </div>
        )}

        {fetchResults && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
              <div className="flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-900 font-medium text-xs">
                    Found {fetchResults.data.totalSubmissions} submission{fetchResults.data.totalSubmissions !== 1 ? 's' : ''}: {fetchResults.newCount} new • {fetchResults.duplicateCount} duplicate{fetchResults.duplicateCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            <details className="bg-gray-50 border border-gray-200 rounded">
              <summary className="text-xs font-semibold text-gray-700 p-2 cursor-pointer hover:bg-gray-100">Debug Data</summary>
              <pre className="text-xs text-gray-600 overflow-auto max-h-48 bg-white p-2 border-t border-gray-200">
                {JSON.stringify(fetchResults.data, null, 2)}
              </pre>
            </details>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {settingsError && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-900 font-medium text-sm">Settings Error</p>
              <p className="text-red-800 text-sm mt-1">{settingsError}</p>
            </div>
          </div>
        </div>
      )}

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
