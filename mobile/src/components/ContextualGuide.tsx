import React from 'react';
import { ArrowLeft, ArrowRight, Compass, LocateFixed, X } from 'lucide-react';
import { GuideId } from '../data/types';
import { MotionEntry } from './MotionEntry';

type GuideStep = { title: string; description: string; target: string };
interface Guide { area: string; steps: GuideStep[] }

/** Short, point-of-need guidance: no blocking overlay and no mandatory tour. */
export const GUIDES: Record<GuideId, Guide> = {
  dashboard: { area: 'Home', steps: [
    { title: 'Your day at a glance', description: 'See your meals, movement and hydration here. Adult estimates may appear after profile setup; no adult calorie targets are provided under 18.', target: 'home-overview' },
    { title: 'Log in a tap', description: 'Use these shortcuts to open workouts or meals. You can also add water further down the page.', target: 'home-actions' },
    { title: 'Connect your steps', description: 'Optionally connect Health Connect or your phone sensor. Counts are not added together, and readings can sync to your account.', target: 'home-steps' },
    { title: 'Explore at your own pace', description: 'Use the five tabs to explore. Settings and the day/night switch are up here.', target: 'home-settings' },
  ] },
  meals: { area: 'Meals', steps: [
    { title: 'Choose a meal', description: 'Pick breakfast, lunch, dinner or a snack before you add food.', target: 'meals-category' },
    { title: 'Describe and review', description: 'Type what you ate, then check the food and portion. Unclear matches need your own nutrition details.', target: 'meals-quick' },
    { title: 'Favorite and repeat', description: 'Heart a logged meal to save it. Use Log again to adjust the portion and review its nutrition.', target: 'meals-shortcuts' },
    { title: 'Browse or add your own', description: 'Search the food list, or use Custom meal for a label or recipe. You can edit a logged meal later.', target: 'meals-search' },
  ] },
  workouts: { area: 'Workouts', steps: [
    { title: 'Start a guided workout', description: 'Choose a session for step-by-step sets, form cues and rest. Pause or skip anytime.', target: 'workouts-guided' },
    { title: 'Plan your week', description: 'Choose workout or rest days and see your weekly progress. Change the plan anytime.', target: 'workouts-plan' },
    { title: 'Find home movements', description: 'Explore no-equipment exercises. Open one for form cues and easier alternatives.', target: 'workouts-home' },
    { title: 'Log and save exercises', description: 'Search by movement, target or equipment. Review the form cue, log your work, or heart a favorite.', target: 'workouts-catalog' },
  ] },
  progress: { area: 'Progress', steps: [
    { title: 'Log a check-in', description: 'Enter your weight when you want to. You can use the app without recording it.', target: 'progress-weight' },
    { title: 'Understand the numbers', description: 'BMI is a rough screening measure, not a diagnosis. Add your profile details to see it.', target: 'progress-bmi' },
    { title: 'Watch your trends', description: 'Touch a point or open the data table. Days without food logs are gaps, not zero intake.', target: 'progress-chart' },
  ] },
  profile: { area: 'Profile', steps: [
    { title: 'Make it yours', description: 'Edit your profile whenever you want to add details and get estimated targets. It is optional.', target: 'profile-card' },
    { title: 'Find your milestones', description: 'Your activity earns experience and badges. Browse them here without any pressure to keep a streak.', target: 'profile-badges' },
    { title: 'Manage your account', description: 'Open Settings for themes, Google sync and encrypted backups.', target: 'profile-settings' },
  ] },
  settings: { area: 'Settings', steps: [
    { title: 'Sync and backup', description: 'See your last sync, retry changes, or export an encrypted backup. Keep its passphrase safe.', target: 'settings-data' },
    { title: 'Reminders on this phone', description: 'Choose water times or an hourly window, or set a workout reminder. Android may delay these optional alerts.', target: 'settings-reminders' },
    { title: 'Comfort and appearance', description: 'Turn on larger text or reduce motion here. Open Appearance below for palettes and day/night mode.', target: 'settings-accessibility' },
    { title: 'Replay these tips', description: 'Review any guide again here; app updates and data controls are below.', target: 'settings-guide-replay' },
  ] },
  daily: { area: 'Daily dashboard', steps: [
    { title: 'A closer look at today', description: 'Your daily dashboard brings your logged activity together. Adult targets depend on profile details.', target: 'daily-overview' },
    { title: 'Check in as you go', description: 'Track water and mood, then review your recent activity below.', target: 'daily-hydration' },
  ] },
  onboarding: { area: 'Profile details', steps: [
    { title: 'Only if you want to', description: 'Add your own measurements and goals to calculate estimates. You can go back without completing this form.', target: 'onboarding-details' },
    { title: 'Estimates, not advice', description: 'Adults can review estimates here. Under 18, ask a qualified health professional for individual advice.', target: 'onboarding-preview' },
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
      <MotionEntry className="guide-step-content" key={`${id}:${step}`}><h2>{item.title}</h2><p>{item.description}</p></MotionEntry>
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
