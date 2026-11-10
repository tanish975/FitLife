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

/**
 * Glassy Liquid Bottom Navigation.
 *
 * Liquid glass base: frosted backdrop with a thin gradient border and a soft inner glow.
 * Glowy animated icons: the active tab icon pulses with a colored outer glow; inactive
   icons fade in/out with a subtle halo on hover.
 * Liquid selection: an SVG blob that wavy-morphs between tab positions, stretching and
   squishing like a fluid droplet as it travels across the nav bar.
 *
 * Inspired by react-native-animated-nav-tab-bar (animated tab transitions) and
 * raw-ui (minimalist React component structure), adapted for FitLife's Vite + Tailwind stack.
 */
export const GlassBottomNav: React.FC<GlassBottomNavProps> = ({ activeTab, onSelectTab }) => {
  const activeIndex = Math.max(0, NAV_ITEMS.findIndex((item) => item.id === activeTab));
  return (
    <nav className="mobile-bottom-nav liquid-glass-nav" data-nav-style="liquid-glass" aria-label="Main navigation" style={{ '--nav-index': activeIndex } as React.CSSProperties}>
      {/* Liquid selection blob — wavy-morphs between tab positions */}
      <svg className="liquid-selection" aria-hidden="true" preserveAspectRatio="none">
        <path
          className="liquid-blob"
          d={`
            M ${activeIndex * 20 + 10},30
            C ${activeIndex * 20 - 40},30 ${activeIndex * 20 + 60},50 ${activeIndex * 20 + 10},70
            C ${activeIndex * 20 - 40},90 ${activeIndex * 20 + 60},90 ${activeIndex * 20 + 10},70
            Z
          `}
        />
      </svg>

      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const selected = activeTab === id;
        return (
          <button
            type="button"
            key={id}
            className={`mobile-bottom-item liquid-item ${selected ? 'is-active' : ''}`}
            onClick={() => onSelectTab(id)}
            aria-current={selected ? 'page' : undefined}
            aria-label={label}
          >
            <span className={`mobile-nav-icon ${selected ? 'is-active' : ''}`} aria-hidden="true">
              <Icon size={selected ? 26 : 22} strokeWidth={selected ? 2.5 : 1.8} />
            </span>
            <span className="mobile-nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
};
