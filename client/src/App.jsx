import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { QueueProvider, useQueue } from './context/QueueContext';

import Navbar from './components/Navbar';
import QueueSelector from './components/QueueSelector';
import NowServingHero from './components/NowServingHero';
import TokenList from './components/TokenList';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import AddTokenModal from './components/AddTokenModal';
import CreateQueueModal from './components/CreateQueueModal';
import CustomerTicketModal from './components/CustomerTicketModal';
import PublicDisplayModal from './components/PublicDisplayModal';
import LoginModal from './components/LoginModal';
import Toast from './components/Toast';

import { Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

function MainApp() {
  const { isAuthenticated, demoLogin, isLoading } = useAuth();
  const { activeQueue } = useQueue();

  const [activeTab, setActiveTab] = useState('operations'); // 'operations' | 'analytics'
  const [isAddTokenOpen, setIsAddTokenOpen] = useState(false);
  const [isCreateQueueOpen, setIsCreateQueueOpen] = useState(false);
  const [isPublicDisplayOpen, setIsPublicDisplayOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const handleOpenTicket = (token) => {
    setSelectedTicket(token);
  };

  const handleTokenCreated = (token) => {
    // Open the ticket receipt right away for the new person
    setSelectedTicket(token);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-300">Loading Rugas QueueFlow...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/80 text-slate-900">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreateQueue={() => setIsCreateQueueOpen(true)}
        onOpenAddToken={() => setIsAddTokenOpen(true)}
        onOpenPublicDisplay={() => setIsPublicDisplayOpen(true)}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Guest Banner if not authenticated */}
        {!isAuthenticated && (
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-indigo-200 backdrop-blur-sm mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Manager Authentication Required for Queue Actions</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome to Rugas QueueFlow
              </h2>
              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                Log in as a Queue Manager to create queues, add persons, reorder waiting tokens, call next for service, and explore live analytics.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={demoLogin}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-white text-indigo-950 hover:bg-indigo-50 active:scale-95 shadow-lg shadow-white/10 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>1-Click Demo Login</span>
                <ArrowRight className="w-4 h-4 text-indigo-600" />
              </button>

              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="px-4 py-3 rounded-xl font-semibold text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
              >
                Sign In / Register
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Live Queue Operations View */}
        {activeTab === 'operations' ? (
          <div className="space-y-6">
            {/* Queue Selector & Switcher (Requirements 1 & 2) */}
            <QueueSelector
              onOpenCreateQueue={() => setIsCreateQueueOpen(true)}
            />

            {/* "Now Serving" Counter & Call Next Token Hero (Requirement 6) */}
            <NowServingHero
              onOpenAddToken={() => setIsAddTokenOpen(true)}
              onOpenTicket={handleOpenTicket}
            />

            {/* Waiting Queue List & Reordering Controls (Requirements 4, 5, 6, 7) */}
            <TokenList
              onOpenAddToken={() => setIsAddTokenOpen(true)}
              onOpenTicket={handleOpenTicket}
            />
          </div>
        ) : (
          /* Tab 2: Analytics & Trends View (Requirement 8) */
          <AnalyticsDashboard />
        )}

      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-slate-200/80 bg-white/60 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>Rugas QueueFlow</strong> • Full-Stack Queue & Token Management Platform
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Built with React + Express + SQLite + Tailwind</span>
            <span>•</span>
            <button
              onClick={() => setIsPublicDisplayOpen(true)}
              className="text-indigo-600 hover:underline font-medium"
            >
              Public TV Kiosk View
            </button>
          </div>
        </div>
      </footer>

      {/* Floating Toast Notification Container */}
      <Toast />

      {/* Modals */}
      <AddTokenModal
        isOpen={isAddTokenOpen}
        onClose={() => setIsAddTokenOpen(false)}
        onCreated={handleTokenCreated}
      />

      <CreateQueueModal
        isOpen={isCreateQueueOpen}
        onClose={() => setIsCreateQueueOpen(false)}
      />

      <CustomerTicketModal
        token={selectedTicket}
        queueName={activeQueue?.name}
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
      />

      <PublicDisplayModal
        isOpen={isPublicDisplayOpen}
        onClose={() => setIsPublicDisplayOpen(false)}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QueueProvider>
        <MainApp />
      </QueueProvider>
    </AuthProvider>
  );
}
