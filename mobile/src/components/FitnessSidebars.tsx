import React from 'react';
import { ArrowRight, CalendarDays, ChevronRight, Droplets, Dumbbell, Leaf, Plus, Settings2, Smartphone, Sparkles, Utensils } from 'lucide-react';
import { AnimatedRing } from './AnimatedRing';
import { MainTabId, NAV_ITEMS } from './GlassBottomNav';
import { useFitLife } from '../data/FitLifeStore';

interface SidebarProps {
  activeTab: MainTabId;
  onSelectTab: (tab: MainTabId) => void;
  onOpenDaily: () => void;
  onOpenSettings: () => void;
  onOpenInstall: () => void;
}

export const FitLifeBrand: React.FC = () => (
  <span className="fitlife-brand" aria-label="FitLife">
    <span className="fitlife-brand-mark"><Leaf size={17} strokeWidth={2.2} /></span>
    <span>fitlife<span className="fitlife-brand-dot">.</span></span>
  </span>
);

export function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'FL';
}

export const DesktopNavigation: React.FC<SidebarProps> = ({ activeTab, onSelectTab, onOpenDaily, onOpenSettings, onOpenInstall }) => {
  const { profile } = useFitLife();
  return (
    <aside className="desktop-navigation" aria-label="Desktop navigation">
      <button className="desktop-brand-button" onClick={() => onSelectTab('dashboard')} aria-label="FitLife home"><FitLifeBrand /></button>
      <p className="rail-eyebrow">YOUR FITNESS</p>
      <nav className="desktop-nav-list" aria-label="Fitness navigation">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`desktop-nav-item ${activeTab === id ? 'is-active' : ''}`} onClick={() => onSelectTab(id)} aria-current={activeTab === id ? 'page' : undefined} title={label}>
            <Icon size={20} strokeWidth={activeTab === id ? 2.4 : 1.8} />
            <span>{label}</span>
            {activeTab === id && <span className="desktop-nav-dot" aria-hidden="true" />}
          </button>
        ))}
      </nav>
      <div className="rail-divider" />
      <p className="rail-eyebrow">TOOLS</p>
      <div className="desktop-nav-list">
        <button className="desktop-nav-item" onClick={onOpenDaily} title="Your daily dashboard"><CalendarDays size={20} strokeWidth={1.8} /><span>Your day</span></button>
        <button className="desktop-nav-item" onClick={onOpenSettings} title="Settings"><Settings2 size={20} strokeWidth={1.8} /><span>Settings</span></button>
        <button className="desktop-nav-item" onClick={onOpenInstall} title="Install FitLife"><Smartphone size={20} strokeWidth={1.8} /><span>Get the app</span></button>
      </div>
      <div className="rail-bottom">
        <div className="rail-note"><span className="rail-note-icon"><Sparkles size={15} /></span><div><strong>Keep it consistent.</strong><span>Track at your own pace.</span></div></div>
        <button className="rail-profile" onClick={() => onSelectTab('profile')} title="Open profile">
          <span className="initial-avatar">{initials(profile.name)}</span>
          <span className="rail-profile-copy"><strong>{profile.name}</strong><small>Your profile</small></span>
          <ChevronRight size={16} />
        </button>
      </div>
    </aside>
  );
};

export const WellnessSidebar: React.FC<Pick<SidebarProps, 'onOpenDaily' | 'onSelectTab'>> = ({ onOpenDaily, onSelectTab }) => {
  const { profile, todayMeals, todayWorkouts, macroTargets, gamification, waterTodayMl, settings, addWaterMl } = useFitLife();
  const consumed = todayMeals.reduce((sum, item) => sum + item.calories, 0);
  const remaining = Math.max(0, macroTargets.calories - consumed);
  const firstName = profile.name.trim().split(/\s+/)[0] || 'friend';
  return (
    <aside className="wellness-aside" aria-label="Daily wellness summary">
      <div className="aside-welcome">
        <button className="aside-avatar initial-avatar" onClick={() => onSelectTab('profile')} aria-label="Open your profile">{initials(profile.name)}</button>
        <div><p>YOUR PROFILE</p><strong>Hey, {firstName} <span aria-hidden="true">✳</span></strong></div>
        <button className="aside-profile-link" onClick={() => onSelectTab('profile')}>Profile</button>
      </div>
      <section className="aside-card">
        <div className="aside-card-title"><div><p className="eyebrow">TODAY</p><h2>Today’s summary</h2></div><span className="tiny-leaf"><Leaf size={15} /></span></div>
        <div className="aside-ring-row">
          <AnimatedRing size={110} strokeWidth={8} progress={macroTargets.calories > 0 ? consumed / macroTargets.calories : 0}>
            <strong className="aside-ring-number">{remaining.toLocaleString()}</strong><span className="aside-ring-label">kcal left</span>
          </AnimatedRing>
          <div className="aside-ring-copy"><strong>Daily calorie<br />target.</strong><span>{consumed.toLocaleString()} of {macroTargets.calories.toLocaleString()} kcal</span><small>Logged today</small></div>
        </div>
        <div className="aside-stat-grid">
          <div><span>STREAK</span><strong>{gamification.currentStreak} <small>days</small></strong></div>
          <div><span>EXERCISE LOGS</span><strong>{todayWorkouts.length} <small>today</small></strong></div>
        </div>
        <button className="aside-main-action" onClick={onOpenDaily}>View your dashboard <ArrowRight size={16} /></button>
      </section>
      {settings.dashboardWidgets.showHydration && (
        <section className="aside-water">
          <span className="aside-water-icon"><Droplets size={19} /></span>
          <div><strong>Stay hydrated</strong><small>{(waterTodayMl / 1000).toFixed(2).replace(/0$/, '')} / {(settings.waterGoalMl / 1000).toFixed(1)} L today</small></div>
          <button onClick={() => addWaterMl(250)} aria-label="Add 250 milliliters of water"><Plus size={16} /></button>
        </section>
      )}
      <div className="aside-quick-title"><span>QUICK ACTIONS</span><span>✳</span></div>
      <button className="aside-quick-action" onClick={() => onSelectTab('workouts')}><span className="aside-quick-number"><Dumbbell size={17} /></span><span><strong>Move your body</strong><small>Find your next workout</small></span><ChevronRight size={17} /></button>
      <button className="aside-quick-action" onClick={() => onSelectTab('meals')}><span className="aside-quick-number"><Utensils size={17} /></span><span><strong>Fuel your day</strong><small>Log something nourishing</small></span><ChevronRight size={17} /></button>
      <p className="aside-footer">Saved on this device. <span>© FitLife</span></p>
    </aside>
  );
};
