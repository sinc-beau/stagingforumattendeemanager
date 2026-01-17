import { Mail, X } from 'lucide-react';

interface EmailConfirmModalProps {
  attendeeName: string;
  attendeeEmail: string;
  statusType: 'approved' | 'denied' | 'waitlisted';
  onConfirm: () => void;
  onCancel: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  approved: 'Approval',
  denied: 'Denial',
  waitlisted: 'Waitlist'
};

const STATUS_COLORS: Record<string, string> = {
  approved: 'bg-green-50 border-green-200',
  denied: 'bg-red-50 border-red-200',
  waitlisted: 'bg-orange-50 border-orange-200'
};

export function EmailConfirmModal({
  attendeeName,
  attendeeEmail,
  statusType,
  onConfirm,
  onCancel
}: EmailConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Send Status Email
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className={`rounded-lg border p-4 mb-4 ${STATUS_COLORS[statusType]}`}>
            <p className="text-sm font-medium text-gray-900 mb-1">Email Type:</p>
            <p className="text-lg font-semibold text-gray-900">{STATUS_LABELS[statusType]} Notification</p>
          </div>

          <div className="space-y-3 mb-6">
            <div>
              <p className="text-sm font-medium text-gray-700">Recipient:</p>
              <p className="text-gray-900">{attendeeName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Email Address:</p>
              <p className="text-gray-900">{attendeeEmail}</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            This will send an automated {STATUS_LABELS[statusType].toLowerCase()} email to the attendee using your configured SendGrid template.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              No, Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Yes, Send Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
