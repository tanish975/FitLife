import React from 'react';
import { ArrowLeft, ArrowRight, Compass, LocateFixed, X } from 'lucide-react';
import { GuideId } from '../data/types';

type GuideStep = { title: string; description: string; target: string };
interface Guide { area: string; steps: GuideStep[] }

/** Short, point-of-need guidance: no blocking overlay and no mandatory tour. */
export const GUIDES: Record<GuideId, Guide> = {
  dashboard: { area: 'Home', steps: [
    { title: 'Your day at a glance', description: 'See your meals, movement and hydration here. Personal targets appear after you add your profile details.', target: 'home-overview' },
    { title: 'Log in a tap', description: 'Use these shortcuts to open workouts or meals. You can also add water further down the page.', target: 'home-actions' },
    { title: 'Explore at your own pace', description: 'Use the five tabs to explore. Settings and the day/night switch are up here.', target: 'home-settings' },
  ] },
  meals: { area: 'Meals', steps: [
    { title: 'Choose a meal', description: 'Pick breakfast, lunch, dinner or a snack before you add food.', target: 'meals-category' },
    { title: 'Describe and review', description: 'Type what you ate, then check the portions and nutrition. Unknown foods need your own details.', target: 'meals-quick' },
    { title: 'Browse or add your own', description: 'Search the food list, or use Custom meal for a label or recipe. You can edit a logged meal later.', target: 'meals-search' },
  ] },
  workouts: { area: 'Workouts', steps: [
    { title: 'Find a movement', description: 'Explore the catalog or filter for no-equipment home exercises.', target: 'workouts-home' },
    { title: 'Need a plan?', description: 'Try a session idea and use the rest timer at your own pace.', target: 'workouts-plan' },
    { title: 'Make each set yours', description: 'Open an exercise to review its instructions, adjust your sets and log it. Heart favorites for later.', target: 'workouts-catalog' },
  ] },
  progress: { area: 'Progress', steps: [
    { title: 'Log a check-in', description: 'Enter your weight when you want to. You can use the app without recording it.', target: 'progress-weight' },
    { title: 'Understand the numbers', description: 'BMI is a rough screening measure, not a diagnosis. Add your profile details to see it.', target: 'progress-bmi' },
    { title: 'Watch your trends', description: 'Your charts grow as you log. Touch a point to inspect an entry.', target: 'progress-chart' },
  ] },
  profile: { area: 'Profile', steps: [
    { title: 'Make it yours', description: 'Edit your profile whenever you want to add details and get estimated targets. It is optional.', target: 'profile-card' },
    { title: 'Find your milestones', description: 'Your activity earns experience and badges. Browse them here without any pressure to keep a streak.', target: 'profile-badges' },
    { title: 'Manage your account', description: 'Open Settings for themes, Google sync and encrypted backups.', target: 'profile-settings' },
  ] },
  settings: { area: 'Settings', steps: [
    { title: 'Choose your look', description: 'Change the palette, light or dark appearance and everyday preferences here.', target: 'settings-appearance' },
    { title: 'Protect your progress', description: 'Check your Google sync status or make an encrypted backup. Keep your backup passphrase safe.', target: 'settings-data' },
    { title: 'Updates and controls', description: 'Find update checks and data controls further down. Destructive actions ask for confirmation.', target: 'settings-updates' },
  ] },
  daily: { area: 'Daily dashboard', steps: [
    { title: 'A closer look at today', description: 'Your daily dashboard brings your logged activity together. Targets appear after profile setup.', target: 'daily-overview' },
    { title: 'Check in as you go', description: 'Track water and mood, then review your recent activity below.', target: 'daily-hydration' },
  ] },
  onboarding: { area: 'Profile details', steps: [
    { title: 'Only if you want to', description: 'Add your own measurements and goals to calculate estimates. You can go back without completing this form.', target: 'onboarding-details' },
    { title: 'Estimates, not advice', description: 'After you enter your details, review the estimated targets. You can change them later.', target: 'onboarding-preview' },
  ] },
};

export const ContextualGuide: React.FC<{
  id: GuideId;
  step: number;
  onStep: (next: number) => void;
  onClose: () => void;
}> = ({ id, step, onStep, onClose }) => {
  const guide = GUIDES[id];
  const item = guide.steps[Math.max(0, Math.min(step, guide.steps.length - 1))];
  const revealTarget = () => {
    onClose();
    window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`[data-guide-target="${item.target}"]`) || document.querySelector<HTMLElement>('main h1');
      if (!target) return;
      // Focus the actual page region, not a fake duplicate control. Reduce
      // motion and avoid browser-specific animated scrolling automatically.
      const alreadyFocusable = target.hasAttribute('tabindex');
      if (!alreadyFocusable) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
      if (!alreadyFocusable) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    });
  };

  return <section className="context-guide" role="region" aria-label={`${guide.area} guide`} data-guide-id={id} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
    <div className="guide-heading">
      <span className="guide-icon"><Compass size={20} aria-hidden="true" /></span>
      <div><p>FIRST TIME IN {guide.area.toUpperCase()}</p><strong>A quick look around</strong></div>
      <button type="button" className="guide-close" onClick={onClose} aria-label="Close guide"><X size={19} aria-hidden="true" /></button>
    </div>
    <div className="guide-copy" aria-live="polite" aria-atomic="true">
      <h2>{item.title}</h2><p>{item.description}</p>
    </div>
    <div className="guide-progress"><span>Tip {step + 1} of {guide.steps.length}</span><span className="guide-dots" aria-hidden="true">{guide.steps.map((_, i) => <i key={i} className={i === step ? 'is-current' : ''} />)}</span></div>
    <div className="guide-actions">
      <button type="button" className="guide-skip" onClick={onClose}>Skip guide</button>
      {step > 0 && <button type="button" className="guide-previous" onClick={() => onStep(step - 1)} aria-label="Previous tip"><ArrowLeft size={16} aria-hidden="true" /></button>}
      <button type="button" className="guide-show" onClick={revealTarget}><LocateFixed size={15} aria-hidden="true" /> Show me</button>
      <button type="button" className="guide-next" onClick={() => step + 1 < guide.steps.length ? onStep(step + 1) : onClose()}>
        {step + 1 < guide.steps.length ? <>Next <ArrowRight size={16} aria-hidden="true" /></> : 'Done'}
      </button>
    </div>
  </section>;
};
