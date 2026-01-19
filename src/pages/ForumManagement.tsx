import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Users as UsersIcon, Download } from 'lucide-react';
import { forumsClient, type Forum } from '../lib/supabase';
import { ForumSettings } from '../components/ForumSettings';
import { AttendeesTable } from '../components/AttendeesTable';
import { HubSpotSync } from '../components/HubSpotSync';
import { AppHeader } from '../components/AppHeader';

export function ForumManagement() {
  const { forumId } = useParams<{ forumId: string }>();
  const navigate = useNavigate();
  const [forum, setForum] = useState<Forum | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (forumId) {
      fetchForum();
    }
  }, [forumId]);

  async function fetchForum() {
    try {
      setLoading(true);
      const { data, error } = await forumsClient
        .from('forums')
        .select('*')
        .eq('id', forumId)
        .maybeSingle();

      if (error) throw error;
      setForum(data);
    } catch (err) {
      console.error('Error fetching forum:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSyncComplete() {
    setRefreshKey(prev => prev + 1);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!forum) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Forum not found</p>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-700"
          >
            Return to forums
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Forums
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{forum.name}</h1>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Brand:</span>
                  <p className="font-medium text-gray-900">{forum.brand}</p>
                </div>
                <div>
                  <span className="text-gray-500">Date:</span>
                  <p className="font-medium text-gray-900">
                    {new Date(forum.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">City:</span>
                  <p className="font-medium text-gray-900">{forum.city}</p>
                </div>
                <div>
                  <span className="text-gray-500">Venue:</span>
                  <p className="font-medium text-gray-900">{forum.venue}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="mb-6">
            <ForumSettings forumId={forum.id} />
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Download className="w-4 h-4 text-gray-700" />
            <h2 className="text-base font-semibold text-gray-900">Sync Registrations</h2>
          </div>
          <HubSpotSync forumId={forum.id} onSyncComplete={handleSyncComplete} />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <UsersIcon className="w-5 h-5 text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-900">Attendees</h2>
          </div>
          <AttendeesTable key={refreshKey} forumId={forum.id} />
        </div>
        </div>
      </div>
    </>
  );
}
