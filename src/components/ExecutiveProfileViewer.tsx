import { X } from 'lucide-react';

interface ProfileDataItem {
  question: string;
  answer: string | string[];
}

interface ExecutiveProfileViewerProps {
  profileData: ProfileDataItem[];
  attendeeName: string;
  onClose: () => void;
}

export function ExecutiveProfileViewer({ profileData, attendeeName, onClose }: ExecutiveProfileViewerProps) {
  const renderAnswer = (answer: string | string[]) => {
    if (Array.isArray(answer)) {
      return (
        <ul className="list-disc list-inside space-y-1">
          {answer.map((item, idx) => (
            <li key={idx} className="text-gray-700">{item}</li>
          ))}
        </ul>
      );
    }
    return <p className="text-gray-700 whitespace-pre-wrap">{answer}</p>;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">
            Executive Profile - {attendeeName}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {profileData.map((item, index) => (
              <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  {item.question}
                </h3>
                {renderAnswer(item.answer)}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
