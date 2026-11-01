import React from 'react';
import { BarChart3, Dumbbell, Home, UserRound, Utensils } from 'lucide-react';

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

/** One persistent nav layer and one transform-only highlight, even during rapid taps. */
export const GlassBottomNav: React.FC<GlassBottomNavProps> = ({ activeTab, onSelectTab }) => {
  const activeIndex = Math.max(0, NAV_ITEMS.findIndex((item) => item.id === activeTab));
  return (
    <nav className="mobile-bottom-nav" data-nav-style="glass" aria-label="Main navigation" style={{ '--nav-index': activeIndex } as React.CSSProperties}>
      <span className="mobile-nav-selection" aria-hidden="true" />
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const selected = activeTab === id;
        return (
          <button type="button" key={id} className={`mobile-bottom-item ${selected ? 'is-active' : ''}`}
            onClick={() => onSelectTab(id)} aria-current={selected ? 'page' : undefined} aria-label={label}>
            <span className="mobile-nav-icon" aria-hidden="true"><Icon size={22} strokeWidth={selected ? 2.45 : 1.9} /></span>
            <span className="mobile-nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
};
