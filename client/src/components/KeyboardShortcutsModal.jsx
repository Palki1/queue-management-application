import React from 'react';
import { X, Command, Keyboard } from 'lucide-react';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space or N', desc: 'Call Next Token (#1 in queue) to service counter' },
    { key: 'C', desc: 'Complete currently active service session' },
    { key: 'A', desc: 'Open "Add Person / Token" modal' },
    { key: 'T', desc: 'Open Public TV / Kiosk Display screen' },
    { key: 'M', desc: 'Open Customer Live Mobile Tracker simulation' },
    { key: '?', desc: 'Toggle this keyboard shortcuts cheat-sheet' },
    { key: 'Esc', desc: 'Close any active modal' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-scale-up">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Desk Operator Keyboard Shortcuts
            </h3>
            <p className="text-xs text-slate-500">
              Rapid keyboard control for high-volume service counters
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {shortcuts.map((sc, idx) => (
            <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <span className="text-slate-600 font-medium">{sc.desc}</span>
              <kbd className="px-2 py-1 rounded-md bg-white border border-slate-300 font-mono font-bold text-slate-800 shadow-xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-5 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Got it
          </button>
        </div>

      </div>
    </div>
  );
}
