import { X } from 'lucide-react';

interface HubSpotSyncModalProps {
  onClose: () => void;
  onConfirm: () => void;
  attendeeName: string;
  missingFields?: string[];
}

export default function HubSpotSyncModal({ onClose, onConfirm, attendeeName, missingFields }: HubSpotSyncModalProps) {
  const hasMissingFields = missingFields && missingFields.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {hasMissingFields ? 'Missing Required Fields' : 'Confirm HubSpot Sync'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {hasMissingFields ? (
            <div>
              <p className="text-gray-700 mb-3">
                Cannot sync to HubSpot. The following required fields are missing:
              </p>
              <ul className="list-disc list-inside space-y-1 text-red-600 mb-4">
                {missingFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
              <p className="text-sm text-gray-600">
                Please fill in all required fields before syncing to HubSpot.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-gray-700 mb-2">
                Are you sure you want to sync <span className="font-semibold">{attendeeName}</span> to HubSpot?
              </p>
              <p className="text-sm text-gray-600">
                This will create or update a deal in HubSpot with the current attendee information.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            {hasMissingFields ? 'Close' : 'Cancel'}
          </button>
          {!hasMissingFields && (
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Confirm Sync
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
