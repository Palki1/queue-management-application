import React from 'react';
import { X, Printer, Ticket, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { formatDateTime, formatDuration } from '../utils/formatters';

export default function CustomerTicketModal({ token, queueName, isOpen, onClose }) {
  if (!isOpen || !token) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in print:bg-white print:p-0">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative animate-scale-up print:shadow-none print:border-none print:w-full">
        
        {/* Close Button (Hidden when printing) */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors print:hidden"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Digital Ticket Card */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider mb-3">
            <Ticket className="w-3.5 h-3.5" />
            <span>Digital Queue Pass</span>
          </div>

          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            {queueName || 'Service Queue'}
          </h3>

          {/* Big Token Number */}
          <div className="my-3 py-4 bg-slate-900 rounded-2xl text-white shadow-inner">
            <div className="text-xs uppercase font-medium text-slate-400">Your Token Number</div>
            <div className="text-4xl sm:text-5xl font-mono font-extrabold tracking-tight mt-1 text-white">
              {token.token_number}
            </div>
            {token.status === 'WAITING' && token.position > 0 && (
              <div className="mt-2 text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1">
                <span>Position in Queue:</span>
                <span className="font-mono text-sm font-bold bg-emerald-400/20 px-2 py-0.5 rounded">
                  #{token.position}
                </span>
              </div>
            )}
          </div>

          {/* Customer & Ticket Info */}
          <div className="space-y-2.5 text-xs text-left bg-slate-50 p-3.5 rounded-xl border border-slate-100 my-4">
            <div className="flex justify-between">
              <span className="text-slate-500">Customer Name:</span>
              <span className="font-bold text-slate-800">{token.customer_name}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Service:</span>
              <span className="font-medium text-slate-700">{token.service_type || 'General'}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="font-bold text-indigo-600">{token.status}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Est. Wait Time:</span>
              <span className="font-bold text-amber-600">
                ~{token.estimated_wait_minutes || 5} Minutes
              </span>
            </div>

            <div className="flex justify-between pt-1 border-t border-slate-200/60 text-[11px] text-slate-400">
              <span>Issued At:</span>
              <span>{formatDateTime(token.created_at)}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-snug">
            Please watch the main lobby screen or listen for your token announcement chime.
          </p>

          {/* Action Buttons (Hidden during print) */}
          <div className="flex items-center gap-2 mt-5 print:hidden">
            <button
              onClick={handlePrint}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Ticket</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
            >
              Done
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
