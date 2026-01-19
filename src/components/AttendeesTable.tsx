import { useEffect, useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Attendee, AttendeeStage } from '../types/database';
import { AttendeeModal } from './AttendeeModal';
import { AttendeeRow } from './AttendeeRow';

interface AttendeesTableProps {
  forumId: string;
}

const STAGE_OPTIONS: { value: AttendeeStage; label: string; color: string }[] = [
  { value: 'in_queue', label: 'In Queue', color: 'bg-gray-100 text-gray-800' },
  { value: 'preliminary_approved', label: 'Preliminary Approved', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800' },
  { value: 'denied', label: 'Denied', color: 'bg-red-100 text-red-800' },
  { value: 'waitlisted', label: 'Waitlisted', color: 'bg-orange-100 text-orange-800' }
];

export function AttendeesTable({ forumId }: AttendeesTableProps) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<AttendeeStage | 'all'>('all');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchAttendees();
  }, [forumId]);

  useEffect(() => {
    filterAttendees();
  }, [attendees, searchTerm, stageFilter]);

  async function fetchAttendees() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendees')
        .select('*')
        .eq('forum_id', forumId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttendees(data || []);
    } catch (err) {
      console.error('Error fetching attendees:', err);
    } finally {
      setLoading(false);
    }
  }

  function filterAttendees() {
    let filtered = [...attendees];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.first_name.toLowerCase().includes(term) ||
          a.last_name.toLowerCase().includes(term) ||
          a.email.toLowerCase().includes(term) ||
          a.company.toLowerCase().includes(term)
      );
    }

    if (stageFilter !== 'all') {
      filtered = filtered.filter((a) => a.stage === stageFilter);
    }

    // Sort: in_queue with exec profile first, then by created_at
    filtered.sort((a, b) => {
      // If both are in_queue, prioritize those with executive profile
      if (a.stage === 'in_queue' && b.stage === 'in_queue') {
        if (a.executive_profile_received && !b.executive_profile_received) return -1;
        if (!a.executive_profile_received && b.executive_profile_received) return 1;
      }

      // Otherwise maintain created_at order
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setFilteredAttendees(filtered);
  }

  function handleAddAttendee() {
    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    fetchAttendees();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or company..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as AttendeeStage | 'all')}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Stages</option>
              {STAGE_OPTIONS.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAddAttendee}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Attendee
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <button
            onClick={() => setStageFilter('all')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              stageFilter === 'all' ? 'bg-gray-200' : 'hover:bg-gray-100'
            }`}
          >
            <span className="font-medium text-gray-700">Total:</span>
            <span className="text-gray-900">{attendees.length}</span>
          </button>
          {STAGE_OPTIONS.map((stage) => {
            const count = attendees.filter((a) => a.stage === stage.value).length;
            return (
              <button
                key={stage.value}
                onClick={() => setStageFilter(stage.value)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  stageFilter === stage.value ? 'bg-gray-200' : 'hover:bg-gray-100'
                }`}
              >
                <span className="font-medium text-gray-700">{stage.label}:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${stage.color}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filteredAttendees.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchTerm || stageFilter !== 'all'
            ? 'No attendees match your filters'
            : 'No attendees yet. Click "Add Attendee" to get started.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-12">
                  Profile
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAttendees.map((attendee) => (
                <AttendeeRow
                  key={attendee.id}
                  attendee={attendee}
                  onRefresh={fetchAttendees}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AttendeeModal
          forumId={forumId}
          attendee={null}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
