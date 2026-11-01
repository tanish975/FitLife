import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { FitLifeProvider, useFitLife } from './data/FitLifeStore';
import { GlassBottomNav, MainTabId } from './components/GlassBottomNav';
import { DesktopNavigation, WellnessSidebar, FitLifeBrand } from './components/FitnessSidebars';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { InstallPhoneModal } from './components/InstallPhoneModal';
import { FitnessHomeScreen } from './screens/FitnessHomeScreen';
import { GuideId, MuscleGroup } from './data/types';
import { ContextualGuide } from './components/ContextualGuide';
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
import { FitnessLoader } from './components/FitnessLoader';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const TAB_ORDER: MainTabId[] = ['dashboard', 'meals', 'workouts', 'progress', 'profile'];
type SubScreen = 'none' | 'settings' | 'onboarding' | 'daily';
declare global { interface Window { __fitlifeHandleBack?: () => boolean } }

const FitLifeShell: React.FC = () => {
  const { settings, isAuthenticated, authRestoring, guidesReady, markGuideSeen, localOwnerId, celebration, toastMessage, dismissCelebration } = useFitLife();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<MainTabId>('dashboard');
  const [workoutGroup, setWorkoutGroup] = useState<MuscleGroup>('All');
  const [tabDirection, setTabDirection] = useState<'left' | 'right'>('right');
  const [subScreen, setSubScreen] = useState<SubScreen>('none');
  const tabTrail = useRef<MainTabId[]>([]);
  const subTrail = useRef<SubScreen[]>([]);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const showDesktopNavigation = useMediaQuery('(min-width: 651px)');
  const showWellnessSidebar = useMediaQuery('(min-width: 1151px)');
  const [guide, setGuide] = useState<{ id: GuideId; step: number } | null>(null);
  const lastGuideRoute = useRef<string | null>(null);
  const requestedGuide = useRef<GuideId | null>(null);
  const guideId: GuideId = subScreen === 'none' ? activeTab : subScreen;

  // The first visit opens a small, non-blocking guide just for this area.
  // Mark on display, so Skip, navigation away, Back and reload cannot nag.
  // Progress belongs to the active Google partition, not the device's last user.
  useEffect(() => {
    if (showSplash || authRestoring || !isAuthenticated || !guidesReady) {
      lastGuideRoute.current = null;
      setGuide(null);
      return;
    }
    const route = `${localOwnerId || 'unknown'}:${guideId}`;
    if (lastGuideRoute.current === route) return;
    lastGuideRoute.current = route;
    setGuide(null);
    const requested = requestedGuide.current === guideId;
    requestedGuide.current = null;
    if (requested || !(settings.guidesSeen || []).includes(guideId)) {
      setGuide({ id: guideId, step: 0 });
      if (!(settings.guidesSeen || []).includes(guideId)) markGuideSeen(guideId);
    }
  }, [showSplash, authRestoring, isAuthenticated, guidesReady, localOwnerId, guideId, settings.guidesSeen]);

  useEffect(() => {
    const reduced = settings.motionStyle === 'reduced' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setShowSplash(false), reduced ? 350 : 1350);
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
    if (nextTab === 'dashboard') tabTrail.current = [];
    else if (nextTab !== activeTab) tabTrail.current = [...tabTrail.current, activeTab].slice(-20);
    subTrail.current = [];
    setTabDirection(TAB_ORDER.indexOf(nextTab) >= TAB_ORDER.indexOf(activeTab) ? 'right' : 'left');
    setSubScreen('none');
    setActiveTab(nextTab);
    scrollToTop();
  };
  const openDaily = () => { subTrail.current.push(subScreen); setSubScreen('daily'); scrollToTop(); };
  const openSettings = () => { if (subScreen !== 'settings') subTrail.current.push(subScreen); setSubScreen('settings'); scrollToTop(); };
  const closeSubScreen = () => { setSubScreen(subTrail.current.pop() || 'none'); scrollToTop(); };
  const openOnboarding = () => { subTrail.current.push(subScreen); setSubScreen('onboarding'); scrollToTop(); };

  // Explicit replay is available in Settings; it never clears the once-only flags.
  const reviewGuide = (id: GuideId) => {
    if (id === guideId) { setGuide({ id, step: 0 }); scrollToTop(); return; }
    requestedGuide.current = id;
    if (TAB_ORDER.includes(id as MainTabId)) { handleSelectTab(id as MainTabId); return; }
    tabTrail.current = [];
    subTrail.current = ['none'];
    setActiveTab(id === 'onboarding' ? 'profile' : 'dashboard');
    setSubScreen(id === 'daily' ? 'daily' : id === 'onboarding' ? 'onboarding' : 'settings');
    scrollToTop();
  };

  // The Android wrapper calls this synchronously inside evaluateJavascript.
  // Modal children may cancel the event to consume Back before the screen does.
  useLayoutEffect(() => {
    const handleBack = () => {
      if (isInstallOpen) { setIsInstallOpen(false); return true; }
      if (!window.dispatchEvent(new CustomEvent('fitlife-back', { cancelable: true }))) return true;
      if (celebration) { dismissCelebration(); return true; }
      if (subScreen !== 'none') { closeSubScreen(); return true; }
      if (isAuthenticated && activeTab !== 'dashboard') {
        const previous = tabTrail.current.pop() || 'dashboard';
        setTabDirection(TAB_ORDER.indexOf(previous) >= TAB_ORDER.indexOf(activeTab) ? 'right' : 'left');
        setActiveTab(previous);
        if (previous === 'dashboard') tabTrail.current = [];
        scrollToTop();
        return true;
      }
      // At Home (or before a profile exists), Android may exit normally.
      return false;
    };
    window.__fitlifeHandleBack = handleBack;
    return () => { if (window.__fitlifeHandleBack === handleBack) delete window.__fitlifeHandleBack; };
  }, [activeTab, subScreen, isInstallOpen, celebration, isAuthenticated]);

  const renderScreen = () => {
    if (showSplash || authRestoring) return (
      <FitnessLoader />
    );
    if (!isAuthenticated) return <div className="legacy-screen"><AuthScreen onCompleteAuth={() => { tabTrail.current = []; subTrail.current = []; setActiveTab('dashboard'); setSubScreen('none'); scrollToTop(); }} /></div>;
    if (subScreen === 'onboarding') return <div className="legacy-screen"><OnboardingScreen onFinish={closeSubScreen} onCancel={closeSubScreen} /></div>;
    if (subScreen === 'settings') return <div className="legacy-screen"><SettingsScreen onBack={closeSubScreen} onReviewGuide={reviewGuide} /></div>;
    if (subScreen === 'daily') return (
      <div className="legacy-screen">
        <div className="daily-back-bar"><button onClick={closeSubScreen} aria-label="Back to home"><ArrowLeft size={20} /></button><span>Your daily dashboard</span><button onClick={openSettings} aria-label="Open settings"><Settings2 size={20} /></button></div>
        <DashboardScreen onNavigateTab={handleSelectTab} onOpenInstall={() => setIsInstallOpen(true)} onOpenSettings={openSettings} onEditProfile={openOnboarding} />
      </div>
    );
    return (
      <div key={activeTab} className={tabDirection === 'right' ? 'animate-tab-right' : 'animate-tab-left'}>
        {activeTab === 'dashboard' && <FitnessHomeScreen onNavigateTab={handleSelectTab} onOpenDaily={openDaily} onOpenSettings={openSettings} onEditProfile={openOnboarding} onOpenWorkouts={(group) => handleSelectTab('workouts', group)} />}
        {activeTab === 'meals' && <div className="legacy-screen"><MealsScreen /></div>}
        {activeTab === 'workouts' && <div className="legacy-screen"><WorkoutsScreen key={workoutGroup} initialGroup={workoutGroup} /></div>}
        {activeTab === 'progress' && <div className="legacy-screen"><ProgressScreen onEditProfile={openOnboarding} /></div>}
        {activeTab === 'profile' && <div className="legacy-screen"><ProfileScreen onOpenSettings={openSettings} onEditOnboarding={openOnboarding} onOpenInstall={() => setIsInstallOpen(true)} /></div>}
      </div>
    );
  };

  const showNavigation = !showSplash && !authRestoring && isAuthenticated && subScreen !== 'onboarding';
  return (
    <div className={showNavigation ? 'app-shell' : 'app-entry-shell'}>
      {showNavigation && showDesktopNavigation && <DesktopNavigation activeTab={activeTab} onSelectTab={handleSelectTab} onOpenDaily={openDaily} onOpenSettings={openSettings} onOpenInstall={() => setIsInstallOpen(true)} />}
      <main className="app-main" id="main-content">
        {guide && guide.id === guideId && !showSplash && !authRestoring && isAuthenticated && <ContextualGuide id={guide.id} step={guide.step} onStep={step => setGuide({ id: guide.id, step })} onClose={() => setGuide(null)} />}
        {renderScreen()}
      </main>
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
