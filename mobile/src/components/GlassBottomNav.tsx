import React from 'react';
import { BarChart3, Dumbbell, Home, UserRound, Utensils } from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';

export type MainTabId = 'dashboard' | 'meals' | 'workouts' | 'progress' | 'profile';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'meals', label: 'Meals', icon: Utensils },
  { id: 'workouts', label: 'Workouts', icon: Dumbbell },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'profile', label: 'Profile', icon: UserRound },
] as const;

interface GlassBottomNavProps {
  activeTab: MainTabId;
  onSelectTab: (tab: MainTabId) => void;
}

/** A single transform-only highlight travels between the five destinations. */
export const GlassBottomNav: React.FC<GlassBottomNavProps> = ({ activeTab, onSelectTab }) => {
  const { settings } = useFitLife();
  const activeIndex = Math.max(0, NAV_ITEMS.findIndex((item) => item.id === activeTab));
  return (
    <nav className="mobile-bottom-nav" data-nav-style={settings.navStyle} aria-label="Main navigation" style={{ '--nav-index': activeIndex } as React.CSSProperties}>
      <span className="mobile-nav-selection" aria-hidden="true" />
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const selected = activeTab === id;
        return (
          <button type="button" key={id} className={`mobile-bottom-item ${selected ? 'is-active' : ''}`}
            onClick={() => onSelectTab(id)} aria-current={selected ? 'page' : undefined} aria-label={label}>
            {id === 'profile'
              ? <span className="mobile-nav-avatar"><UserRound size={19} strokeWidth={selected ? 2.4 : 1.8} /></span>
              : <Icon size={22} strokeWidth={selected ? 2.5 : 1.8} />}
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
};
