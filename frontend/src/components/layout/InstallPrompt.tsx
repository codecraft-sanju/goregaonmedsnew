//frontend/src/components/layout/installPrompt.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { cn } from '@/lib/cn'; // Assuming you have a cn utility, or just remove cn() if not

export function InstallPrompt() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      // Hide the prompt if the app is successfully installed
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    
    // We've used the prompt, and can't use it again, discard it
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-gray-200 shadow-sm animate-in slide-in-from-top-full duration-300">
      <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
        <div className="flex items-center gap-3">
          {/* Using your icon */}
          <div className="w-10 h-10 bg-[#156253] rounded-xl flex-shrink-0 overflow-hidden shadow-sm">
             <img src="/icon-192x192.png" alt="GoregaonMeds" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-ink leading-tight">Install GoregaonMeds</span>
            <span className="text-xs font-medium text-ink-muted leading-tight">Order faster & track easily</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleInstallClick}
            className="bg-[#156253] text-white text-xs font-bold px-4 py-2 rounded-full active:scale-95 transition-transform shadow-sm flex items-center gap-1.5"
          >
            <Download size={14} /> Install
          </button>
          <button
            onClick={() => setShowPrompt(false)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}