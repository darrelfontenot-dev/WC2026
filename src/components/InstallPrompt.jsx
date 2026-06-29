import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

const DISMISS_KEY = 'wc2026_install_dismissed';

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    // Already running as an installed app? Then there is nothing to prompt.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (standalone) return;

    // Respect a previous dismissal.
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      localStorage.setItem(DISMISS_KEY, '1');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // iOS Safari never fires beforeinstallprompt, so show a manual hint.
    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    if (isIOS && isSafari) {
      setIosHint(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
    if (outcome !== 'accepted') localStorage.setItem(DISMISS_KEY, '1');
  };

  if (!visible) return null;

  return (
    <div className="install-banner" role="dialog" aria-label="Install app">
      <img src="/app-icon.svg" alt="" className="install-icon" />
      <div className="install-text">
        <strong>Install World Cup 2026</strong>
        {iosHint ? (
          <span>
            Tap <Share size={13} style={{ verticalAlign: 'middle' }} /> then “Add to Home Screen”.
          </span>
        ) : (
          <span>Add it to your home screen for quick access.</span>
        )}
      </div>
      {!iosHint && (
        <button className="install-btn" onClick={install}>
          <Download size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Install
        </button>
      )}
      <button className="install-close" onClick={dismiss} aria-label="Dismiss">
        <X size={18} />
      </button>
    </div>
  );
}
