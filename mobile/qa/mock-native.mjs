import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// QA ONLY: the production app still requires a real Android bridge on file:.
// This simulates its message protocol in Chromium; it is not Firebase,
// Credential Manager, Android WebView, or a real authentication test.
export const nativeApp = process.env.FITLIFE_NATIVE_URL || pathToFileURL(resolve('../FitLife-App.html')).href;
export async function installNativeFixture(page, options = {}) {
  const opts = { signedIn: true, demo: true, uid: 'qa-user', name: 'Tanish Patel', email: 'tanish@fitlife.app', ...options };
  await page.addInitScript(opts => {
    const ids = ['dashboard','meals','workouts','progress','profile','settings','daily','onboarding'];
    if (!localStorage.getItem('__fixture_seeded')) {
      localStorage.setItem('__fixture_seeded', '1');
      if (opts.demo) {
        // A genuine legacy fixture is deliberately different from the untouched
        // sample profile, so first-claim migration preserves the test history.
        localStorage.setItem('fitlife_profile_v1', JSON.stringify({ name:'Tanish Patel', email:'tanish@fitlife.app', sex:'male', age:24, heightCm:176, weightKg:73.4, goal:'lose_weight', activityLevel:'moderate', onboarded:true, uid:'qa-legacy' }));
        const settings = JSON.parse(localStorage.getItem('fitlife_settings_v2') || '{}');
        localStorage.setItem('fitlife_settings_v2', JSON.stringify({ ...settings, guidesSeen: ids }));
      }
      if (opts.signedIn) localStorage.setItem('__fixture_current', opts.uid);
      localStorage.setItem('__fixture_next', opts.uid);
    }
    const account = uid => ({ signedIn:true, uid, name:uid === opts.uid ? opts.name : `${uid} Athlete`, email:uid === opts.uid ? opts.email : `${uid}@example.test` });
    const respond = (requestId, ok, result, error) => setTimeout(() => window.dispatchEvent(new CustomEvent('fitlife-cloud-result', { detail:{ requestId, ok, result, error } })), 0);
    const current = () => localStorage.getItem('__fixture_current');
    const allowed = (id, expected) => {
      if (current() !== expected) { respond(id, false, null, 'Account changed; sync was stopped.'); return false; }
      if (localStorage.getItem('__fixture_offline') === '1') { respond(id, false, null, 'Cloud sync is offline. Your data stays on this device.'); return false; }
      return true;
    };
    window.FitLifeCloud = {
      session(id) {
        if (localStorage.getItem('__fixture_session_error') === '1') { respond(id, false, null, 'Session unavailable'); return; }
        const uid = current(); respond(id, true, uid ? account(uid) : { signedIn:false });
      },
      signIn(id) {
        if (localStorage.getItem('__fixture_signin_error') === '1') { respond(id, false, null, 'Google sign-in was cancelled.'); return; }
        const uid = localStorage.getItem('__fixture_next') || opts.uid; localStorage.setItem('__fixture_current', uid); respond(id, true, account(uid));
      },
      signOut(id) { localStorage.removeItem('__fixture_current'); respond(id, true, {}); },
      pull(id, expected) {
        if (!allowed(id, expected)) return;
        const db=JSON.parse(localStorage.getItem('__fixture_cloud') || '{}'), docs=db[expected] || {};
        respond(id, true, { uid:expected, deviceId:'c'.repeat(32), snapshots:Object.entries(docs).map(([deviceId,payload]) => ({deviceId,payload})) });
      },
      push(id, expected, payload) {
        if (!allowed(id, expected)) return;
        const db=JSON.parse(localStorage.getItem('__fixture_cloud') || '{}'); db[expected] ||= {}; db[expected]['c'.repeat(32)]=payload;
        localStorage.setItem('__fixture_cloud', JSON.stringify(db)); respond(id, true, { uid:expected });
      },
    };
  }, opts);
}
