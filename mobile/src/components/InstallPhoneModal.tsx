import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, QrCode, Share, Smartphone, Sparkles, X } from 'lucide-react';
import { PressScale } from './PressScale';
import { FITLIFE_LATEST_APK_URL } from '../domain/Updates';

interface InstallPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onTriggerPwaInstall: () => void;
}

export const InstallPhoneModal: React.FC<InstallPhoneModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onTriggerPwaInstall,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeGuide, setActiveGuide] = useState<'apk' | 'pwa' | 'ios'>('apk');

  const appUrl = typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol) ? window.location.origin + window.location.pathname : '';
  const isLoopback = typeof window !== 'undefined' && /^(localhost|127(?:\.\d+){3}|\[?::1\]?)$/i.test(window.location.hostname);
  const isNativeAsset = typeof window !== 'undefined' && window.location.protocol === 'file:' && window.location.pathname.startsWith('/android_asset/');

  useEffect(() => {
    if (!isOpen || !appUrl) return;
    QRCode.toDataURL(appUrl, {
      width: 220,
      margin: 1,
      color: {
        dark: '#151A17',
        light: '#F4F1EA',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [isOpen, appUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => document.getElementById('close-install-modal')?.focus(), 50);
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => { window.clearTimeout(timer); document.removeEventListener('keydown', handleKey); if (previous?.isConnected) previous.focus(); };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0E120F]/80 p-0 sm:p-4 animate-fade-in"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-[30px] sm:rounded-[30px] border border-[#2F3A33] bg-[#181E1A] p-5 sm:p-6 shadow-2xl max-h-[90dvh] overflow-y-auto animate-slide-up"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#2F3A33]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#528B67] text-[#F4F1EA]">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 id="install-modal-title" className="font-heading text-base font-bold text-[#F4F1EA]">Install FitLife on Phone</h3>
              <p className="text-xs text-[#84877F]">Android APK · Instant QR · iOS & Android PWA</p>
            </div>
          </div>
          <button
            id="close-install-modal"
            onClick={onClose}
            className="rounded-full bg-[#242E27] p-2 text-[#B8B5AD] hover:text-[#F4F1EA]"
            aria-label="Close install modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Direct Android APK Download CTA */}
        <div className="mt-4 rounded-[22px] bg-[#213026] border border-[#3E634B] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#2B4234] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7BB38F]">
                <Sparkles className="h-3 w-3" /> Native Android Package
              </span>
              <h4 className="mt-1.5 font-heading text-sm font-bold text-[#F4F1EA]">
                FitLife.apk (signed Android release)
              </h4>
              <p className="mt-0.5 text-xs text-[#B8B5AD]">
                Package <code className="text-[#7BB38F]">com.tanish.fitlife</code> · Designed for offline use on Android 8.0+. The latest release is available from the FitLife GitHub repository.
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            {!isNativeAsset && <a
              href={FITLIFE_LATEST_APK_URL}
              target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#528B67] hover:bg-[#5E9A74] px-4 py-2.5 text-xs font-bold text-[#F4F1EA] transition active:scale-95"
            >
              <Download className="h-4 w-4" />
              Download FitLife.apk
            </a>}

            {deferredPrompt && (
              <PressScale
                onClick={onTriggerPwaInstall}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#497A5B] bg-[#151A17] px-3 py-2.5 text-xs font-semibold text-[#7BB38F]"
              >
                <Smartphone className="h-4 w-4" />
                1-Tap Web Install
              </PressScale>
            )}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-[#B8B5AD]">Updates signed with the same key install over the app. A differently signed older APK may require uninstalling it, which can erase local data.</p>
        </div>

        {/* Scan QR Code with Phone Camera */}
        <div className="mt-4 rounded-[22px] border border-[#2F3A33] bg-[#1E2520] p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#D8C39E] mb-2">
            <QrCode className="h-4 w-4" />
            <span>Scan with Phone Camera to Open & Install</span>
          </div>
          {!appUrl ? (
            <p className="mx-auto max-w-xs py-4 text-xs leading-relaxed text-[#B8B5AD]">A QR link is available when FitLife is hosted over HTTP or HTTPS. This local file cannot be opened by another phone.</p>
          ) : qrDataUrl ? (
            <div className="mx-auto inline-block rounded-2xl bg-[#F4F1EA] p-2.5 shadow-md">
              <img src={qrDataUrl} alt="Scan QR Code to open FitLife on phone" className="h-36 w-36" />
            </div>
          ) : (
            <div className="mx-auto h-36 w-36 rounded-2xl bg-[#262F2A] animate-pulse" />
          )}
          {appUrl && isLoopback && <p className="mt-2 text-[11px] leading-relaxed text-[#B8B5AD]">This address points to this device only. Host FitLife at a phone-accessible URL before scanning from another device.</p>}
          {appUrl && <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#141916] p-2 border border-[#2F3A33]">
            <input
              type="text"
              readOnly
              value={appUrl}
              className="w-full bg-transparent text-[11px] text-[#B8B5AD] outline-none truncate px-1"
            />
            <button
              onClick={handleCopy}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-[#242E27] px-2.5 py-1.5 text-[11px] font-semibold text-[#7BB38F] hover:bg-[#2E3A32]"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>}
        </div>

        {/* Platform Guide Tabs */}
        <div className="mt-4">
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#141916] p-1 border border-[#2F3A33] text-xs">
            <button
              onClick={() => setActiveGuide('apk')}
              className={`rounded-lg py-1.5 font-semibold transition ${
                activeGuide === 'apk'
                  ? 'bg-[#528B67] text-[#F4F1EA]'
                  : 'text-[#84877F] hover:text-[#F4F1EA]'
              }`}
            >
              Android APK
            </button>
            <button
              onClick={() => setActiveGuide('pwa')}
              className={`rounded-lg py-1.5 font-semibold transition ${
                activeGuide === 'pwa'
                  ? 'bg-[#528B67] text-[#F4F1EA]'
                  : 'text-[#84877F] hover:text-[#F4F1EA]'
              }`}
            >
              Android Chrome
            </button>
            <button
              onClick={() => setActiveGuide('ios')}
              className={`rounded-lg py-1.5 font-semibold transition ${
                activeGuide === 'ios'
                  ? 'bg-[#528B67] text-[#F4F1EA]'
                  : 'text-[#84877F] hover:text-[#F4F1EA]'
              }`}
            >
              iPhone (iOS)
            </button>
          </div>

          <div className="mt-2.5 rounded-2xl border border-[#2F3A33] bg-[#1E2520] p-3.5 text-xs text-[#B8B5AD] space-y-1.5">
            {activeGuide === 'apk' && (
              <>
                <p className="font-semibold text-[#F4F1EA]">Direct Android APK Installation:</p>
                <p>1. Download the latest FitLife.apk from GitHub Releases on your Android phone.</p>
                <p>2. Open the downloaded <code className="text-[#7BB38F]">FitLife.apk</code> notification and tap <strong>Install</strong>.</p>
                <p>3. Launch <strong>FitLife</strong> from your app drawer. Data is stored locally on the device.</p>
              </>
            )}
            {activeGuide === 'pwa' && (
              <>
                <p className="font-semibold text-[#F4F1EA]">Instant Android Home Screen App:</p>
                <p>1. Scan the QR code above to open FitLife in <strong>Chrome</strong> on your phone.</p>
                <p>2. Tap <strong>Install App</strong> on the banner (or tap the <strong>⋮</strong> menu → <strong>Add to Home screen / Install app</strong>).</p>
                <p>3. Opens full-screen without browser bars, just like a Play Store app.</p>
              </>
            )}
            {activeGuide === 'ios' && (
              <>
                <p className="font-semibold text-[#F4F1EA]">Instant iPhone (iOS Safari) Installation:</p>
                <p>1. Scan the QR code with your iPhone camera to open in <strong>Safari</strong>.</p>
                <p className="flex items-center gap-1 flex-wrap">
                  2. Tap the <strong>Share</strong> icon <Share className="inline h-3.5 w-3.5 text-[#D8C39E]" /> at the bottom of Safari.
                </p>
                <p>3. Scroll down and tap <strong>Add to Home Screen</strong> → <strong>Add</strong>.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
