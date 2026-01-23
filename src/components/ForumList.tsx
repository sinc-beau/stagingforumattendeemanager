import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Building2, Tag, ArrowRight, CheckCircle, Clock, XCircle } from 'lucide-react';
import { forumsClient, supabase, type Forum } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { syncForumToLocal } from '../utils/forumSync';

interface ForumStats {
  approved: number;
  inQueue: number;
  denied: number;
}

export function ForumList() {
  const [forums, setForums] = useState<Forum[]>([]);
  const [stats, setStats] = useState<Record<string, ForumStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchForums();
  }, []);

  useEffect(() => {
    if (isAuthenticated && forums.length > 0) {
      fetchStats(forums.map(f => f.id));
    }
  }, [isAuthenticated, forums.length]);

  async function fetchForums() {
    try {
      setLoading(true);
      const { data, error } = await forumsClient
        .from('forums')
        .select(`
          id,
          name,
          brand,
          date,
          city,
          venue,
          forum_settings (
            deal_code
          )
        `)
        .order('date', { ascending: true });

      if (error) throw error;
      setForums(data || []);

      if (data && data.length > 0) {
        await Promise.all(data.map(forum => syncForumToLocal(forum.id)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats(forumIds: string[]) {
    try {
      const { data, error } = await supabase
        .from('attendees')
        .select('forum_id, stage')
        .in('forum_id', forumIds);

      if (error) throw error;

      // Group by forum_id and count statuses
      const statsMap: Record<string, ForumStats> = {};

      forumIds.forEach(id => {
        statsMap[id] = { approved: 0, inQueue: 0, denied: 0 };
      });

      data?.forEach(attendee => {
        const forumId = attendee.forum_id;
        if (!statsMap[forumId]) {
          statsMap[forumId] = { approved: 0, inQueue: 0, denied: 0 };
        }

        switch (attendee.stage) {
          case 'approved':
            statsMap[forumId].approved++;
            break;
          case 'in_queue':
            statsMap[forumId].inQueue++;
            break;
          case 'denied':
            statsMap[forumId].denied++;
            break;
        }
      });

      setStats(statsMap);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        Error loading forums: {error}
      </div>
    );
  }

  if (forums.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-600">
        No forums found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {forums.map((forum) => {
        const forumStats = stats[forum.id] || { approved: 0, inQueue: 0, denied: 0 };
        const dealCode = (forum as any).forum_settings?.[0]?.deal_code;

        return (
          <div
            key={forum.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer group"
            onClick={() => navigate(`/forum/${forum.id}`)}
          >
            <div className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {forum.name}
                    </h3>
                    {dealCode && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {dealCode}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{forum.brand}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>
                        {new Date(forum.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{forum.city}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{forum.venue}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">{forumStats.approved}</span>
                      <span className="text-gray-500">approved</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-600">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">{forumStats.inQueue}</span>
                      <span className="text-gray-500">in queue</span>
                    </div>
                    <div className="flex items-center gap-1 text-red-600">
                      <XCircle className="w-4 h-4" />
                      <span className="font-medium">{forumStats.denied}</span>
                      <span className="text-gray-500">denied</span>
                    </div>
                  </div>

                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
