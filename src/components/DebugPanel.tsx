import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, CheckCircle } from 'lucide-react';

interface DebugLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  section: string;
  message: string;
  data?: any;
}

interface DebugPanelProps {
  logs: DebugLog[];
  onClear: () => void;
}

export function DebugPanel({ logs, onClear }: DebugPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['all']));
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getLevelColor = (level: DebugLog['level']) => {
    switch (level) {
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'warning':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'success':
        return 'text-green-700 bg-green-50 border-green-200';
      default:
        return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  const getLevelBadgeColor = (level: DebugLog['level']) => {
    switch (level) {
      case 'error':
        return 'bg-red-600 text-white';
      case 'warning':
        return 'bg-amber-600 text-white';
      case 'success':
        return 'bg-green-600 text-white';
      default:
        return 'bg-blue-600 text-white';
    }
  };

  const groupedLogs = logs.reduce((acc, log) => {
    if (!acc[log.section]) {
      acc[log.section] = [];
    }
    acc[log.section].push(log);
    return acc;
  }, {} as Record<string, DebugLog[]>);

  if (logs.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <h3 className="text-white font-semibold">Debug Console</h3>
        <button
          onClick={onClear}
          className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
        >
          Clear Logs
        </button>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        {Object.entries(groupedLogs).map(([section, sectionLogs]) => {
          const isExpanded = expandedSections.has(section);

          return (
            <div key={section} className="border-b border-gray-700 last:border-b-0">
              <button
                onClick={() => toggleSection(section)}
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-800 hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-white font-medium">{section}</span>
                  <span className="text-gray-400 text-sm">({sectionLogs.length} logs)</span>
                </div>
              </button>

              {isExpanded && (
                <div className="bg-gray-900">
                  {sectionLogs.map((log, index) => {
                    const globalIndex = logs.indexOf(log);
                    return (
                      <div
                        key={globalIndex}
                        className={`border-l-4 ${getLevelColor(log.level)} border p-3 m-2 rounded`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded font-semibold ${getLevelBadgeColor(log.level)}`}>
                              {log.level.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-600 font-mono">
                              {log.timestamp}
                            </span>
                          </div>
                          {log.data && (
                            <button
                              onClick={() => copyToClipboard(JSON.stringify(log.data, null, 2), globalIndex)}
                              className="text-gray-600 hover:text-gray-800 transition-colors"
                              title="Copy to clipboard"
                            >
                              {copiedIndex === globalIndex ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>

                        <p className="text-sm font-medium mb-2">{log.message}</p>

                        {log.data && (
                          <pre className="text-xs bg-white border border-gray-300 rounded p-2 overflow-x-auto font-mono">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
