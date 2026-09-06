import React, { useState } from 'react';
import { Download, Share, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Hide if already running in installed standalone mode
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        id="pwa-install-btn"
        onClick={install}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-950/20 transition-all cursor-pointer"
        title="Install PWA to Home Screen"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          id="pwa-ios-install-btn"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer"
          title="Install on iOS device"
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-400" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div
            id="ios-install-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in"
          >
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl">♟️</span>
                  <h3 className="text-base font-semibold text-white">Install on iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 mt-0.5">
                    <Share className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-white block">Step 1:</strong>
                    Tap the <strong>Share</strong> button in the bottom Safari toolbar.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-white block">Step 2:</strong>
                    Scroll down and tap <strong>Add to Home Screen</strong>.
                  </div>
                </div>
              </div>

              <button
                id="close-ios-guide-btn"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-sm font-medium text-slate-200 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
