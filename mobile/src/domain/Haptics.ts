declare global {
  interface Window {
    AndroidHaptics?: {
      vibrate: (ms: number) => void;
    };
  }
}

/**
 * Triggers haptic feedback when enabled in Settings.
 * Supports:
 * 1) Native Android APK JavaScriptInterface (`window.AndroidHaptics.vibrate`)
 * 2) Web Vibration API (`navigator.vibrate`)
 * 3) Subtle Web Audio micro-tick fallback on desktop browsers
 */
export function triggerHaptic(type: 'light' | 'medium' | 'success' = 'light', enabled = true) {
  if (!enabled) return;

  const duration = type === 'success' ? 35 : type === 'medium' ? 18 : 10;

  try {
    if (window.AndroidHaptics && typeof window.AndroidHaptics.vibrate === 'function') {
      window.AndroidHaptics.vibrate(duration);
      return;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      if (type === 'success') {
        navigator.vibrate([15, 40, 25]);
      } else {
        navigator.vibrate(duration);
      }
    }
  } catch {
    // Ignore on restricted environments
  }
}
