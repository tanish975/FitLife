import React, { useState, useEffect } from 'react';
import { base44 } from 'api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from 'utils';
import { Button, Row, Col, Alert } from 'react-bootstrap';
import Skeleton from 'react-loading-skeleton';
import { Person, Speedometer2, ArrowRight, Heart } from 'react-bootstrap-icons';
import { motion } from 'framer-motion';

// Components
import MetricCard from 'components/health/metriccard';
import WeeklyHealthScore from 'components/health/WeeklyHealthScore';
import QuickActions from 'components/dashboard/QuickActions';
import CalorieProgress from 'components/calories/calorieprogress';
import HydrationTracker from 'components/health/HydrationTracker';
import MoodTracker from 'components/health/MoodTracker';
import AnalyticsCharts from 'components/analytics/AnalyticsCharts';
import BadgeSystem from 'components/profile/BadgeSystem';
import SmartRecommendations from 'components/health/SmartRecommendations';
import ExportReportButton from 'components/analytics/ExportReportButton';

// Animations
import PageTransition from 'components/animations/PageTransition';
import { StaggerContainer, itemVariants } from 'components/animations/StaggerContainer';
import MotionCard from 'components/animations/MotionCard';

// Logic
import { calculateHealthScore, getStreakData } from 'utils/scoreLogic';
import { getDailyCoachMessage } from 'utils/fitnessLogic';
import { getCalorieChartData } from 'utils/dietLogic';

// Simple Activity Icon for the UI
const ActivityIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className={`bi bi-activity ${className}`} viewBox="0 0 16 16">
        <path fillRule="evenodd" d="M6 2a.5.5 0 0 1 .47.345l.555 2.062 1.95-6.32a.5.5 0 0 1 .908-.06l2.19 5.38 1.488-3.923a.5.5 0 1 1 .939.34l-2 5.25a.5.5 0 0 1-.926.04L8.79 3.55 6.47 9.87a.5.5 0 0 1-.941-.05L2.345 3.19 1.155 7.42a.5.5 0 1 1-.963-.29l1.5-5a.5.5 0 0 1 .931.25L5.756 7.47 7.02 2.52A.5.5 0 0 1 7.47 2h-1.42z" />
    </svg>
);

export default function Dashboard() {
    const [user, setUser] = useState(null);
    const [currentMood, setCurrentMood] = useState(null);
    const [coachExplanation, setCoachExplanation] = useState(null);

    useEffect(() => {
        base44.auth.me().then(setUser);
    }, []);

    const { data: profiles = [], isLoading: isLoadingProfiles } = useQuery({
        queryKey: ['userProfile'],
        queryFn: () => base44.entities.UserProfile.list(),
        refetchInterval: 30000,
    });

    const { data: calorieEntries = [], isLoading: isLoadingCalories } = useQuery({
        queryKey: ['calorieEntries'],
        queryFn: () => base44.entities.CalorieEntry.list(),
        refetchInterval: 30000,
    });

    // Derived Data
    const profile = profiles[0];
    const today = new Date().toISOString().split('T')[0];
    const todayCalories = calorieEntries
        .filter(e => e.date === today)
        .reduce((sum, e) => sum + e.calories, 0);

    // AI/Logic
    const healthScore = calculateHealthScore(profile, calorieEntries, []);
    const streakData = getStreakData();
    const dailyMessage = getDailyCoachMessage(profile);
    const chartData = getCalorieChartData(calorieEntries);

    const handleAskCoach = (topic) => {
        if (topic === 'healthScore') {
            setCoachExplanation("Your Health Score is a composite of 3 pillars: Consistency (30%), Diet Adherence (40%), and Activity Level (30%). I use these to grade your weekly performance. Keep logging to see it rise!");
        }
    };

    // Helpers (Keep simple ones inline or extract if too big)
    const calculateBMI = () => {
        if (!profile?.height || !profile?.weight) return null;
        const h = profile.height / 100;
        return profile.weight / (h * h);
    };
    const bmi = calculateBMI();

    const calculateBMR = () => {
        if (!profile?.height || !profile?.weight || !profile?.age || !profile?.gender) return null;
        if (profile.gender === 'male') return 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
        return 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
    };
    const bmr = calculateBMR();

    // TDEE Target
    const getTargetCalories = () => {
        if (!bmr || !profile?.goal) return 2000;
        const tdee = bmr * 1.55;
        if (profile.goal === 'lose') return Math.round(tdee - 500);
        if (profile.goal === 'gain') return Math.round(tdee + 500);
        return Math.round(tdee);
    };
    const targetCalories = getTargetCalories();


    if (isLoadingProfiles) {
        return (
            <PageTransition>
                <div className="container-fluid p-3 p-md-5">
                    <Skeleton height={200} className="mb-4 rounded-4" />
                    <div className="row g-4">
                        {[1, 2, 3].map(i => <div key={i} className="col-md-4"><Skeleton height={300} className="rounded-4" /></div>)}
                    </div>
                </div>
            </PageTransition>
        );
    }

    if (!profile) {
        return (
            <PageTransition>
                <div className="container-fluid p-3 p-md-5 d-flex align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
                    <MotionCard className="p-5 text-center" style={{ maxWidth: '500px' }}>
                        <div className="mb-4">
                            <span className="display-1">👋</span>
                        </div>
                        <h2 className="fw-bold mb-3">Welcome to Prime</h2>
                        <p className="text-muted mb-4 lead">
                            Your personal consistency coach. Let's start by understanding your goals.
                        </p>
                        <Button as={Link} to={createPageUrl('Profile')} variant="primary" size="lg" className="rounded-pill px-5 shadow">
                            Setup Profile
                        </Button>
                    </MotionCard>
                </div>
            </PageTransition>
        );
    }

    const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening';

    return (
        <PageTransition>
            <div className="container-fluid p-3 p-md-5" id="dashboard-content">

                {/* --- HEADER SECTION --- */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-5 animate-fade-in">
                    <div className="mb-3 mb-md-0 position-relative">
                        <h1 className="fw-800 display-5 mb-1 gradient-text">
                            {greeting}{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
                        </h1>
                        <motion.div
                            key={coachExplanation ? 'explanation' : 'daily'}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-muted lead mb-0 d-flex align-items-start gap-2"
                            style={{ maxWidth: '600px' }}
                        >
                            {coachExplanation && (
                                <div className="badge bg-primary bg-opacity-10 text-primary small py-1 px-2 mt-1">AI Agent</div>
                            )}
                            <p className="mb-0">
                                {coachExplanation || dailyMessage}
                                {coachExplanation && (
                                    <button
                                        onClick={() => setCoachExplanation(null)}
                                        className="btn btn-link btn-sm p-0 ms-2 text-primary text-decoration-none fw-800"
                                    >
                                        [Close]
                                    </button>
                                )}
                            </p>
                        </motion.div>
                    </div>
                    <div>
                        <div className="d-flex align-items-center gap-3 mb-2 justify-content-md-end">
                            <ExportReportButton targetId="dashboard-content" />
                        </div>
                        <QuickActions />
                    </div>
                </div>

                {/* --- SMART RECOMMENDATIONS --- */}
                <SmartRecommendations mood={currentMood} />

                {/* --- HERO METRICS ROW --- */}
                <StaggerContainer className="row g-4 mb-5">
                    {/* 1. Health Score */}
                    <Col lg={4} md={6} as={motion.div} variants={itemVariants}>
                        <WeeklyHealthScore
                            score={healthScore}
                            streak={streakData}
                            onAskCoach={handleAskCoach}
                        />
                    </Col>

                    {/* 2. Calories Consumed */}
                    <Col lg={4} md={6} as={motion.div} variants={itemVariants}>
                        <CalorieProgress consumed={todayCalories} target={targetCalories} />
                    </Col>

                    {/* 3. Hydration Level */}
                    <Col lg={4} md={12} as={motion.div} variants={itemVariants}>
                        <HydrationTracker />
                    </Col>
                </StaggerContainer>

                {/* --- BIO METRICS ROW --- */}
                <h4 className="fw-bold mb-3 d-flex align-items-center opacity-75">
                    <ActivityIcon className="me-2" />
                    Bio-Metrics
                </h4>
                <StaggerContainer className="row g-4 mb-5">
                    <Col md={3} sm={6} as={motion.div} variants={itemVariants}>
                        <MetricCard
                            title="BMI"
                            value={bmi?.toFixed(1) || '--'}
                            subtitle={bmi ? (bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese') : 'Update'}
                            color="info"
                            icon={<Person size={24} />}
                        />
                    </Col>
                    <Col md={3} sm={6} as={motion.div} variants={itemVariants}>
                        <MetricCard
                            title="BMR"
                            value={bmr?.toFixed(0) || '--'}
                            unit="kcal"
                            subtitle="Metabolic Rate"
                            color="warning"
                            icon={<Heart size={24} />}
                        />
                    </Col>
                    <Col md={3} sm={6} as={motion.div} variants={itemVariants}>
                        <MetricCard
                            title="Target Weight"
                            value={calculateBMI() ? (22 * Math.pow(profile.height / 100, 2)).toFixed(1) : '--'}
                            unit="kg"
                            subtitle="Ideal for height"
                            color="success"
                            icon={<Speedometer2 size={24} />}
                        />
                    </Col>
                    <Col md={3} sm={6} as={motion.div} variants={itemVariants}>
                        <MetricCard
                            title="Current"
                            value={profile.weight}
                            unit="kg"
                            subtitle={profile.goal === 'lose' ? 'Goal: Lose' : 'Goal: Gain'}
                            color="primary"
                            icon={<ArrowRight size={24} />}
                        />
                    </Col>
                </StaggerContainer>

                {/* --- ACTIVITY & ANALYTICS ROW --- */}
                <div className="row g-4">
                    {/* 1. Mood Tracker */}
                    <Col lg={4} md={6} as={motion.div} variants={itemVariants}>
                        <MoodTracker onMoodChange={setCurrentMood} />
                    </Col>

                    {/* 2. Achievements */}
                    <Col lg={4} md={6} as={motion.div} variants={itemVariants}>
                        <BadgeSystem />
                    </Col>

                    {/* 3. Calorie Consistency (Analytics) */}
                    <Col lg={4} md={12} as={motion.div} variants={itemVariants}>
                        <AnalyticsCharts data={chartData} />
                    </Col>
                </div>

            </div>
        </PageTransition>
    );
}
