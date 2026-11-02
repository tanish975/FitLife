// Chromium's file: origin can briefly lose the storage keys used by our fake
// bridge during a fast navigation. A real Android/Firebase bridge persists
// outside WebView storage, so carry ONLY the explicitly namespaced fake bridge
// keys through the reload. This never copies, seeds, or restores FitLife data.
export async function reloadSimulatedNative(page, prefix, options = {}) {
  if (!['__fixture_', '__qa_'].includes(prefix)) throw new Error('Unexpected fake bridge prefix');
  await page.evaluate(async prefix => {
    const fake = {};
    for (let i=0; i<localStorage.length; i++) {
      const key=localStorage.key(i);
      if (key?.startsWith(prefix)) fake[key]=localStorage.getItem(key);
    }
    if (fake[`${prefix}seeded`] !== '1') throw new Error('Fake bridge was not initialized');
    window.name='__fitlife_qa_native_v1:' + JSON.stringify({prefix,fake});
    // Confirm that Chromium's storage service has observed preceding writes
    // before navigating. The fence is test-only and contains no app data.
    const frame=document.createElement('iframe'); frame.style.display='none'; document.body.appendChild(frame);
    let listener, timer;
    try {
      const value=String(Date.now()) + Math.random();
      const ack=new Promise((resolve,reject)=>{
        listener=event=>{if(event.key==='__fitlife_qa_storage_fence'&&event.newValue===value)resolve();};
        window.addEventListener('storage',listener);
        timer=setTimeout(()=>reject(new Error('Storage acknowledgement timed out')),5000);
      });
      frame.contentWindow.localStorage.setItem('__fitlife_qa_storage_fence',value);
      await ack;
    } finally { clearTimeout(timer); window.removeEventListener('storage',listener); frame.remove(); }
  }, prefix);
  return page.reload(options);
}
