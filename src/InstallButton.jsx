import React, { useEffect, useRef, useState } from 'react';
import { Check, Download, Share, SquarePlus, X } from 'lucide-react';

const displayMode = '(display-mode: standalone)';

function isStandalone() {
  return window.matchMedia?.(displayMode).matches || navigator.standalone === true;
}

function SafariSteps() {
  return (
    <ol className="install-steps" role="list">
      <li><span className="step-icon"><Share size={20} aria-hidden="true" /></span><span>Tap <strong>Share</strong></span></li>
      <li><span className="step-icon"><SquarePlus size={20} aria-hidden="true" /></span><span>Choose <strong>Add to Home Screen</strong></span></li>
      <li><span className="step-icon"><Check size={20} aria-hidden="true" /></span><span>Tap <strong>Add</strong></span></li>
    </ol>
  );
}

function InstallInstructions() {
  const device = navigator.userAgent;
  const isAppleMobile = /iPhone|iPad|iPod/i.test(device) ||
    (/Macintosh/i.test(device) && navigator.maxTouchPoints > 1);

  if (isAppleMobile) {
    return <SafariSteps />;
  }
  if (/Android/i.test(device)) {
    return <p>Open your browser’s menu and tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</p>;
  }
  return <p>Look for <strong>Install</strong> in your browser’s address bar or menu. On Safari for Mac, choose <strong>File → Add to Dock</strong>.</p>;
}

export default function InstallButton() {
  const [installed, setInstalled] = useState(isStandalone);
  const prompt = useRef(null);
  const instructions = useRef(null);

  useEffect(() => {
    const media = window.matchMedia?.(displayMode);
    function capturePrompt(event) {
      event.preventDefault();
      prompt.current = event;
    }
    function finishInstall() {
      prompt.current = null;
      instructions.current?.close();
      setInstalled(true);
    }
    function updateDisplayMode() {
      setInstalled(isStandalone());
    }

    window.addEventListener('beforeinstallprompt', capturePrompt);
    window.addEventListener('appinstalled', finishInstall);
    media?.addEventListener('change', updateDisplayMode);
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt);
      window.removeEventListener('appinstalled', finishInstall);
      media?.removeEventListener('change', updateDisplayMode);
    };
  }, []);

  async function install() {
    const deferredPrompt = prompt.current;
    if (deferredPrompt) {
      prompt.current = null;
      try {
        await deferredPrompt.prompt();
        return;
      } catch {
        // Use the browser-menu instructions if the saved prompt has expired.
      }
    }
    instructions.current?.showModal();
  }

  if (installed) return null;

  return (
    <>
      <button className="install-button" type="button" onClick={install}>
        <Download size={17} aria-hidden="true" /> Add to Home screen
      </button>
      <dialog ref={instructions} className="detail install-dialog" aria-labelledby="install-title"
        onClick={(event) => { if (event.target === event.currentTarget) instructions.current.close(); }}>
        <div className="detail-inner">
          <div className="install-heading">
            <h2 id="install-title">Add to Home screen</h2>
            <button className="icon-button" type="button" aria-label="Close installation instructions"
              onClick={() => instructions.current.close()}><X size={22} aria-hidden="true" /></button>
          </div>
          <InstallInstructions />
        </div>
      </dialog>
    </>
  );
}
