import React, { useEffect, useRef, useState } from 'react';
import { Download, LockKeyhole, Upload, X } from 'lucide-react';
import { decryptBackup, encryptBackup } from '../domain/EncryptedBackup';
import { useFitLife } from '../data/FitLifeStore';

type NativeBackup = { beginExport: (length: number) => boolean; appendExport: (part: string) => boolean; finishExport: () => boolean; chooseImport: () => void; abortExport?: () => void };
const nativeBackup = () => (window as Window & { FitLifeBackup?: NativeBackup }).FitLifeBackup;
const MAX_FILE = 4_000_000;

/** Optional local encrypted backup; no account, network or plain-text export. */
export const EncryptedBackupPanel: React.FC = () => {
  const { makeBackupSnapshot, restoreBackupSnapshot } = useFitLife();
  const [action, setAction] = useState<'export' | 'import' | null>(null);
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [encryptedFile, setEncryptedFile] = useState('');
  const [fileName, setFileName] = useState('');
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [confirmedReplace, setConfirmedReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const nativeParts = useRef('');
  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ type: string; value: string }>).detail;
      if (!detail) return;
      if (detail.type === 'start') nativeParts.current = '';
      if (detail.type === 'chunk') {
        nativeParts.current += detail.value;
        if (nativeParts.current.length > MAX_FILE) nativeParts.current = '';
      }
      if (detail.type === 'done') { setEncryptedFile(nativeParts.current); setFileName('Selected backup'); setStatus(nativeParts.current ? 'Backup selected. Enter its passphrase.' : 'Backup is empty or too large.'); setBusy(false); nativeParts.current = ''; }
      if (detail.type === 'saved') { setStatus(detail.value); setBusy(false); }
      if (detail.type === 'cancel') { setStatus('File selection cancelled.'); setBusy(false); }
      if (detail.type === 'error') { setStatus(detail.value || 'Could not access that file.'); setBusy(false); }
    };
    window.addEventListener('fitlife-backup-part', listener);
    return () => window.removeEventListener('fitlife-backup-part', listener);
  }, []);
  const close = () => { setAction(null); setPass(''); setConfirm(''); setEncryptedFile(''); setFileName(''); setRestoreMode('merge'); setConfirmedReplace(false); setStatus(''); setBusy(false); };
  const open = (next: 'export' | 'import') => { close(); setAction(next); };
  const save = async () => {
    if (pass !== confirm) { setStatus('The passphrases do not match.'); return; }
    setBusy(true); setStatus('Encrypting on this device…');
    try {
      const encrypted = await encryptBackup(makeBackupSnapshot(), pass);
      const bridge = nativeBackup();
      if (bridge) {
        if (!bridge.beginExport(encrypted.length)) throw new Error('Could not prepare the backup.');
        try {
          for (let start = 0; start < encrypted.length; start += 32000) if (!bridge.appendExport(encrypted.slice(start, start + 32000))) throw new Error('Could not prepare the backup.');
          if (!bridge.finishExport()) throw new Error('Could not open the file picker.');
        } catch (error) { bridge.abortExport?.(); throw error; }
        setStatus('Choose where to save your encrypted backup.');
      } else {
        const url = URL.createObjectURL(new Blob([encrypted], { type: 'application/octet-stream' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = `FitLife-backup-${new Date().toISOString().slice(0, 10)}.fitlife`; document.body.appendChild(anchor); anchor.click(); anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setStatus('Encrypted backup download started.'); setBusy(false);
      }
      setPass(''); setConfirm('');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Backup could not be created.'); setBusy(false); }
  };
  const chooseFile = () => {
    const bridge = nativeBackup();
    if (bridge) { setBusy(true); setStatus('Choose an encrypted backup.'); bridge.chooseImport(); }
  };
  const readFile = async (file?: File) => {
    setEncryptedFile(''); setFileName('');
    if (!file) return;
    if (file.size > MAX_FILE) { setStatus('That file is too large.'); return; }
    try { setEncryptedFile(await file.text()); setFileName(file.name); setStatus('Backup selected. Enter its passphrase.'); }
    catch { setStatus('Could not read that file.'); }
  };
  const restore = async () => {
    if (!encryptedFile) { setStatus('Choose a backup first.'); return; }
    if (restoreMode === 'replace' && !confirmedReplace) { setStatus('Confirm that you want to replace the data on this device.'); return; }
    setBusy(true); setStatus('Decrypting on this device…');
    try {
      const snapshot = await decryptBackup(encryptedFile, pass);
      await restoreBackupSnapshot(snapshot, restoreMode);
      setPass(''); setEncryptedFile(''); setFileName(''); setStatus(restoreMode === 'merge' ? 'Activity merged. Your current profile, settings, and water remain unchanged.' : 'Backup restored to this device.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Backup could not be restored.'); }
    setBusy(false);
  };
  return <section className="backup-panel" aria-labelledby="backup-title">
    <div className="backup-title"><LockKeyhole size={17} /><div><h3 id="backup-title">Encrypted local backup</h3><p>Save or restore a file. This is not cloud sync.</p></div></div>
    {!action ? <div className="backup-actions"><button type="button" onClick={() => open('export')}><Download size={15} /> Create backup</button><button type="button" onClick={() => open('import')}><Upload size={15} /> Import backup</button></div> : <div className="backup-form">
      <div className="backup-form-heading"><strong>{action === 'export' ? 'Create encrypted backup' : 'Import encrypted backup'}</strong><button type="button" aria-label="Close backup" onClick={close} disabled={busy}><X size={17} /></button></div>
      {action === 'export' ? <p>Use a unique passphrase of at least 12 characters. FitLife cannot recover it. Keep the file and passphrase somewhere safe.</p> : <><p>Choose a FitLife backup. It is decrypted only on this device.</p>
        {nativeBackup() ? <button type="button" className="backup-secondary" disabled={busy} onClick={chooseFile}>Choose backup file</button> : <label className="backup-file">Choose backup file<input type="file" accept=".fitlife,application/octet-stream" onChange={event => readFile(event.target.files?.[0])} /></label>}
        {fileName && <span className="backup-file-name">{fileName}</span>}</>}
      <label>Backup passphrase<input type="password" autoComplete={action === 'export' ? 'new-password' : 'off'} value={pass} onChange={event => setPass(event.target.value)} disabled={busy} /></label>
      {action === 'export' ? <label>Confirm passphrase<input type="password" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} disabled={busy} /></label> : <fieldset><legend>How to restore</legend>
        <label className="backup-option"><input type="radio" name="backup-mode" checked={restoreMode === 'merge'} onChange={() => { setRestoreMode('merge'); setConfirmedReplace(false); }} /> <span><b>Merge activity</b><small>Keep this device’s profile, settings, and water.</small></span></label>
        <label className="backup-option"><input type="radio" name="backup-mode" checked={restoreMode === 'replace'} onChange={() => setRestoreMode('replace')} /> <span><b>Replace device data</b><small>Overwrites the current profile, settings and activity.</small></span></label>
        {restoreMode === 'replace' && <label className="backup-option"><input type="checkbox" checked={confirmedReplace} onChange={event => setConfirmedReplace(event.target.checked)} /> <span>I understand this replaces my current data.</span></label>}
      </fieldset>}
      <button type="button" className="backup-primary" disabled={busy || !pass || (action === 'import' && (!encryptedFile || (restoreMode === 'replace' && !confirmedReplace)))} onClick={action === 'export' ? save : restore}>{busy ? 'Please wait…' : action === 'export' ? 'Encrypt and save' : 'Decrypt and restore'}</button>
      {status && <p className="backup-status" role="status">{status}</p>}
    </div>}
  </section>;
};
