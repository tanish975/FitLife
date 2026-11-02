import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// QA ONLY: the production app still requires a real Android bridge on file:.
// This simulates its message protocol in Chromium; it is not Firebase,
// Credential Manager, Android WebView, or a real authentication test.
export const nativeApp = process.env.FITLIFE_NATIVE_URL || pathToFileURL(resolve('../FitLife-App.html')).href;
export async function installNativeFixture(page, options = {}) {
  const opts = { signedIn: true, demo: true, uid: 'qa-user', name: 'Tanish Patel', email: 'tanish@fitlife.app', ...options };
  await page.addInitScript(opts => {
    // The reload helper carries only simulated native state in window.name.
    // Capture application-owned storage first; it is never restored by QA.
    const marker='__fitlife_qa_native_v1:';
    if (window.name.startsWith(marker)) {
      const saved=JSON.parse(window.name.slice(marker.length)); window.name='';
      if (saved.prefix === '__fixture_') {
        const owner=localStorage.getItem('fitlife_cloud_owner_v1');
        const raw=owner && localStorage.getItem(`fitlife_cloud_partition_v1:${owner}`);
        window.__qaBeforeFixtureReload={owner,partition:raw ? JSON.parse(raw) : null};
        for (const [key,value] of Object.entries(saved.fake || {})) {
          if (key.startsWith('__fixture_') && typeof value === 'string') localStorage.setItem(key,value);
        }
      }
    }
    const ids = ['dashboard','meals','workouts','progress','profile','settings','daily','onboarding'];
    // A native Firebase session and remote database live outside WebView
    // storage. Some restart tests can restore ONLY these simulated bridge
    // keys; FitLife profile, settings and account partitions are never seeded.
    if (opts.resumeFixture) {
      for (const key of ['__fixture_seeded','__fixture_current','__fixture_next','__fixture_cloud','__fixture_offline']) {
        const value = opts.resumeFixture[key];
        if (typeof value === 'string' && localStorage.getItem(key) === null) localStorage.setItem(key, value);
      }
    }
    if (!localStorage.getItem('__fixture_seeded')) {
      localStorage.setItem('__fixture_seeded', '1');
      if (opts.demo) {
        // A genuine legacy fixture is deliberately different from the untouched
        // sample profile, so first-claim migration preserves the test history.
        const profile = opts.demoProfile || { name:'Tanish Patel', email:'tanish@fitlife.app', sex:'male', age:24, heightCm:176, weightKg:73.4, goal:'lose_weight', activityLevel:'moderate', onboarded:true, uid:'qa-legacy' };
        localStorage.setItem('fitlife_profile_v1', JSON.stringify(profile));
        // Visual tests may intentionally begin with a known profile and no
        // weight history. This seeds a new fixture, not an app-data restore.
        if (opts.emptyWeights) localStorage.setItem('fitlife_weights_v1', '[]');
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
    if (opts.steps) {
      const emitSteps=(requestId,ok,result,error)=>setTimeout(()=>window.dispatchEvent(new CustomEvent('fitlife-steps-result',{detail:{requestId,ok,result,error}})), Number(localStorage.getItem('__fixture_steps_delay')||0));
      const daysAgo=(delta=0)=>{const d=new Date();d.setDate(d.getDate()-delta);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
      const stepState=uid=>JSON.parse(localStorage.getItem(`__fixture_steps_${uid}`)||'{"phone":false,"health":false}');
      const saveSteps=(uid,s)=>localStorage.setItem(`__fixture_steps_${uid}`,JSON.stringify(s));
      const ensure=(id,uid)=>{if(current()!==uid){emitSteps(id,false,null,'Account changed.');return false;}return true;};
      const deviceId='d'.repeat(32);
      window.FitLifeSteps={
        snapshot(id,uid,days) {
          if(!ensure(id,uid))return;
          localStorage.setItem(`__fixture_step_reads_${uid}`,String(Number(localStorage.getItem(`__fixture_step_reads_${uid}`)||0)+1));
          const s=stepState(uid), now=Date.now();
          const row=(source,count,dateKey=daysAgo())=>({deviceId,source,count,updatedAt:now,partial:source==='phone',dateKey});
          const records=[...(s.phone?[row('phone',6200),row('phone',3300,daysAgo(1))]:[]),...(s.health?[row('health',4500),row('health',3000,daysAgo(1))]:[])];
          emitSteps(id,true,{deviceId,phoneAvailable:true,phonePermission:true,phoneEnabled:s.phone,phoneRunning:s.phone,phoneNotificationVisible:true,healthEnabled:s.health,healthAvailability:'available',healthState:s.health?'ready':'disabled',records});
        },
        connectHealth(id,uid){if(!ensure(id,uid))return;const s=stepState(uid);s.health=true;saveSteps(uid,s);emitSteps(id,true,{});},
        disconnectHealth(id,uid){if(!ensure(id,uid))return;const s=stepState(uid);s.health=false;saveSteps(uid,s);emitSteps(id,true,{});},
        connectPhone(id,uid){if(!ensure(id,uid))return;const s=stepState(uid);s.phone=true;saveSteps(uid,s);emitSteps(id,true,{});},
        disconnectPhone(id,uid){if(!ensure(id,uid))return;const s=stepState(uid);s.phone=false;saveSteps(uid,s);emitSteps(id,true,{});},
      };
    }
    if (opts.reminders) {
      const emitReminder=(requestId,ok,result,error)=>setTimeout(()=>window.dispatchEvent(new CustomEvent('fitlife-reminder-result',{detail:{requestId,ok,result,error}})),0);
      const get=uid=>JSON.parse(localStorage.getItem(`__fixture_reminders_${uid}`)||'{"workout":{"enabled":false,"hour":8,"minute":0},"water":{"enabled":false,"hour":12,"minute":0}}');
      const allowedReminder=(id,uid)=>{if(current()!==uid){emitReminder(id,false,null,'Account changed.');return false;}return true;};
      const snapshot=uid=>({...get(uid),notificationsEnabled:localStorage.getItem('__fixture_notifications_denied')!=='1'});
      window.FitLifeReminders={
        snapshot(id,uid){if(allowedReminder(id,uid))emitReminder(id,true,snapshot(uid));},
        configure(id,uid,kind,enabled,hour,minute){if(!allowedReminder(id,uid))return;if(enabled&&localStorage.getItem('__fixture_notifications_denied')==='1'){emitReminder(id,false,null,'Notification permission was not granted.');return;}const s=get(uid);s[kind]={enabled,hour,minute};localStorage.setItem(`__fixture_reminders_${uid}`,JSON.stringify(s));emitReminder(id,true,snapshot(uid));},
        openSettings(id,uid){if(allowedReminder(id,uid))emitReminder(id,true,{});},
      };
    }
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
