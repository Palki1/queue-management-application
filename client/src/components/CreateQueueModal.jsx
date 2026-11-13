import React, { useState } from 'react';
import { useQueue } from '../context/QueueContext';
import { X, Layers, AlertCircle } from 'lucide-react';

export default function CreateQueueModal({ isOpen, onClose }) {
  const { createQueue } = useQueue();

  const [name, setName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Queue name is required and cannot be empty.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await createQueue(
        name.trim(),
        prefix.trim().toUpperCase(),
        description.trim()
      );

      setName('');
      setPrefix('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create queue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-scale-up">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Create New Service Queue
            </h3>
            <p className="text-xs text-slate-500">
              Set up a named queue with a custom token prefix
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Queue Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Queue Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                // Auto-suggest prefix if not set
                if (!prefix) {
                  const suggested = e.target.value.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
                  setPrefix(suggested);
                }
              }}
              placeholder="e.g. VIP Consultation Desk"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Token Prefix */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Token Number Prefix (e.g. VIP, CS, EXP)
            </label>
            <input
              type="text"
              maxLength={5}
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="e.g. VIP"
              className="w-full px-3.5 py-2 text-sm font-mono uppercase bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Tokens in this queue will appear as <strong className="font-mono text-slate-700">{prefix || 'TK'}-001</strong>, <strong className="font-mono text-slate-700">{prefix || 'TK'}-002</strong>...
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. High priority advisory and customer inquiries..."
              className="w-full px-3.5 py-2 text-sm bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-md shadow-indigo-600/30 transition-all"
            >
              {isSubmitting ? 'Creating...' : 'Create Queue'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
