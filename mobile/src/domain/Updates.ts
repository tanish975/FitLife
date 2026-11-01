export const FITLIFE_RELEASES_URL = 'https://github.com/tanish975/FitLife/releases/latest';
export const FITLIFE_LATEST_APK_URL = `${FITLIFE_RELEASES_URL}/download/FitLife.apk`;

declare global {
  interface Window {
    /** Present only in the trusted, locally bundled Android WebView. */
    FitLifeAndroid?: {
      versionName: () => string;
      automaticUpdateChecksEnabled: () => boolean;
      setAutomaticUpdateChecks: (enabled: boolean) => void;
      checkForUpdates: () => void;
    };
  }
}

export function getNativeUpdateBridge() {
  if (typeof window === 'undefined') return undefined;
  const bridge = window.FitLifeAndroid;
  return bridge && typeof bridge.checkForUpdates === 'function' && typeof bridge.versionName === 'function'
    && typeof bridge.automaticUpdateChecksEnabled === 'function' && typeof bridge.setAutomaticUpdateChecks === 'function'
    ? bridge : undefined;
}
