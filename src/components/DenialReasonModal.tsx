import { useState } from 'react';
import { X, Save } from 'lucide-react';

interface DenialReasonModalProps {
  attendeeName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function DenialReasonModal({ attendeeName, onConfirm, onCancel }: DenialReasonModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  function handleConfirm() {
    if (reason.trim().length < 10) {
      setError('Denial reason must be at least 10 characters');
      return;
    }
    onConfirm(reason.trim());
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Denial Reason Required
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Please provide a reason for denying <span className="font-semibold">{attendeeName}</span>
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Denial Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              rows={4}
              placeholder="Enter reason for denial (minimum 10 characters)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {reason.length} / 10 characters minimum
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={reason.trim().length < 10}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Reason
          </button>
        </div>
      </div>
    </div>
  );
}
