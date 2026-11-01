import React, { useEffect, useState } from 'react';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { FitLifeProvider, useFitLife } from './data/FitLifeStore';
import { GlassBottomNav, MainTabId } from './components/GlassBottomNav';
import { DesktopNavigation, WellnessSidebar, FitLifeBrand } from './components/FitnessSidebars';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { InstallPhoneModal } from './components/InstallPhoneModal';
import { FitnessHomeScreen } from './screens/FitnessHomeScreen';
import { MuscleGroup } from './data/types';
import { DashboardScreen } from './screens/DashboardScreen';
import { MealsScreen } from './screens/MealsScreen';
import { WorkoutsScreen } from './screens/WorkoutsScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { AuthScreen } from './screens/AuthScreen';
import { triggerHaptic } from './domain/Haptics';
import { useMediaQuery } from './hooks/useMediaQuery';
import { FitLifeLogo } from './components/FitLifeLogo';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const TAB_ORDER: MainTabId[] = ['dashboard', 'meals', 'workouts', 'progress', 'profile'];

const FitLifeShell: React.FC = () => {
  const { profile, settings, isAuthenticated, celebration, toastMessage, dismissCelebration } = useFitLife();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<MainTabId>('dashboard');
  const [workoutGroup, setWorkoutGroup] = useState<MuscleGroup>('All');
  const [tabDirection, setTabDirection] = useState<'left' | 'right'>('right');
  const [subScreen, setSubScreen] = useState<'none' | 'settings' | 'onboarding' | 'daily'>('none');
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const showDesktopNavigation = useMediaQuery('(min-width: 651px)');
  const showWellnessSidebar = useMediaQuery('(min-width: 1151px)');

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 550);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const handler = (event: Event) => { event.preventDefault(); setDeferredPrompt(event as InstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'auto' });
  const handlePwaInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => undefined);
    setDeferredPrompt(null);
  };
  const handleSelectTab = (nextTab: MainTabId, group?: MuscleGroup) => {
    if (nextTab === 'workouts') setWorkoutGroup(group ?? 'All');
    triggerHaptic('light', settings.hapticsEnabled);
    setTabDirection(TAB_ORDER.indexOf(nextTab) >= TAB_ORDER.indexOf(activeTab) ? 'right' : 'left');
    setSubScreen('none');
    setActiveTab(nextTab);
    scrollToTop();
  };
  const openDaily = () => { setActiveTab('dashboard'); setSubScreen('daily'); scrollToTop(); };
  const openSettings = () => { setSubScreen('settings'); scrollToTop(); };
  const closeSubScreen = () => { setSubScreen('none'); scrollToTop(); };

  const renderScreen = () => {
    if (showSplash) return (
      <div className="fitlife-splash" role="status" aria-label="Opening FitLife"><div className="splash-logo"><FitLifeLogo /></div><div className="splash-wordmark">fitlife<span>.</span></div><span>MOVE WITH PURPOSE.</span><div className="splash-loader" aria-hidden="true"><i></i><i></i><i></i></div></div>
    );
    if (!isAuthenticated) return <div className="legacy-screen"><AuthScreen onCompleteAuth={(isNew) => { setActiveTab('dashboard'); setSubScreen(isNew || !profile.onboarded ? 'onboarding' : 'none'); scrollToTop(); }} /></div>;
    if (!profile.onboarded || subScreen === 'onboarding') return <div className="legacy-screen"><OnboardingScreen onFinish={closeSubScreen} onCancel={profile.onboarded ? closeSubScreen : undefined} /></div>;
    if (subScreen === 'settings') return <div className="legacy-screen"><SettingsScreen onBack={closeSubScreen} onOpenInstall={() => setIsInstallOpen(true)} /></div>;
    if (subScreen === 'daily') return (
      <div className="legacy-screen">
        <div className="daily-back-bar"><button onClick={closeSubScreen} aria-label="Back to home"><ArrowLeft size={20} /></button><span>Your daily dashboard</span><button onClick={openSettings} aria-label="Open settings"><Settings2 size={20} /></button></div>
        <DashboardScreen onNavigateTab={handleSelectTab} onOpenInstall={() => setIsInstallOpen(true)} onOpenSettings={openSettings} />
      </div>
    );
    return (
      <div key={activeTab} className={tabDirection === 'right' ? 'animate-tab-right' : 'animate-tab-left'}>
        {activeTab === 'dashboard' && <FitnessHomeScreen onNavigateTab={handleSelectTab} onOpenDaily={openDaily} onOpenSettings={openSettings} onOpenWorkouts={(group) => handleSelectTab('workouts', group)} />}
        {activeTab === 'meals' && <div className="legacy-screen"><MealsScreen /></div>}
        {activeTab === 'workouts' && <div className="legacy-screen"><WorkoutsScreen key={workoutGroup} initialGroup={workoutGroup} /></div>}
        {activeTab === 'progress' && <div className="legacy-screen"><ProgressScreen /></div>}
        {activeTab === 'profile' && <div className="legacy-screen"><ProfileScreen onOpenSettings={openSettings} onEditOnboarding={() => { setSubScreen('onboarding'); scrollToTop(); }} onOpenInstall={() => setIsInstallOpen(true)} /></div>}
      </div>
    );
  };

  const showNavigation = !showSplash && isAuthenticated && profile.onboarded && subScreen !== 'onboarding';
  return (
    <div className={showNavigation ? 'app-shell' : 'app-entry-shell'}>
      {showNavigation && showDesktopNavigation && <DesktopNavigation activeTab={activeTab} onSelectTab={handleSelectTab} onOpenDaily={openDaily} onOpenSettings={openSettings} onOpenInstall={() => setIsInstallOpen(true)} />}
      <main className="app-main" id="main-content">{renderScreen()}</main>
      {showNavigation && showWellnessSidebar && <WellnessSidebar onOpenDaily={openDaily} onSelectTab={handleSelectTab} />}
      {showNavigation && <GlassBottomNav activeTab={activeTab} onSelectTab={handleSelectTab} />}
      {toastMessage && <div className="app-toast" role="status">{toastMessage}</div>}
      <CelebrationOverlay celebration={celebration} onDismiss={dismissCelebration} />
      <InstallPhoneModal isOpen={isInstallOpen} onClose={() => setIsInstallOpen(false)} deferredPrompt={deferredPrompt} onTriggerPwaInstall={handlePwaInstall} />
    </div>
  );
};

export const App: React.FC = () => <FitLifeProvider><FitLifeShell /></FitLifeProvider>;
export default App;
