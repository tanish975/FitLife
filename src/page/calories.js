import React from 'react';
import { base44 } from 'api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { PlusCircle, Fire, Activity, BarChartFill, ClockHistory, LightningFill } from 'react-bootstrap-icons';

import CalorieProgress from 'components/calories/calorieprogress';
import AddMealForm from 'components/calories/addmealform';
import MealEntry from 'components/calories/mealentry';
import PageTransition from 'components/animations/PageTransition';
import { StaggerContainer, itemVariants } from 'components/animations/StaggerContainer';
import MotionCard from 'components/animations/MotionCard';

import { getTargetCalories, getDietStatus, getWeeklyStats } from 'utils/dietLogic';

export default function Calories() {
    const queryClient = useQueryClient();
    const today = new Date().toISOString().split('T')[0];

    // Data Fetching
    const { data: profiles = [] } = useQuery({
        queryKey: ['userProfile'],
        queryFn: () => base44.entities.UserProfile.list()
    });

    const { data: calorieEntries = [], isLoading } = useQuery({
        queryKey: ['calorieEntries'],
        queryFn: () => base44.entities.CalorieEntry.list('-created_at')
    });

    // Mutations
    const addMealMutation = useMutation({
        mutationFn: (data) => base44.entities.CalorieEntry.create({ ...data, date: today }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calorieEntries'] })
    });

    const deleteMealMutation = useMutation({
        mutationFn: (id) => base44.entities.CalorieEntry.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calorieEntries'] })
    });

    // Logic
    const profile = profiles[0];
    const targetCalories = getTargetCalories(profile);

    const todayMeals = calorieEntries.filter(e => e.date === today);
    const todayCalories = todayMeals.reduce((sum, e) => sum + e.calories, 0);

    // Status Logic
    const { status, remaining, excess } = getDietStatus(todayCalories, targetCalories);
    const weeklyStats = getWeeklyStats(calorieEntries);

    return (
        <PageTransition>
            <div className="container-fluid p-3 p-md-5">
                {/* --- HEADER SECTION --- */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-5 animate-fade-in">
                    <div>
                        <div className="d-inline-flex align-items-center px-3 py-1 rounded-pill bg-primary bg-opacity-10 text-primary small fw-800 mb-2 border border-primary border-opacity-10">
                            <Activity className="me-2" size={14} />
                            NUTRITION LOG
                        </div>
                        <h1 className="fw-800 display-5 mb-1 gradient-text">Fuel Your Body</h1>
                        <p className="text-muted lead mb-0" style={{ maxWidth: '600px' }}>
                            {status === 'under' && "Fuel up! You're currently within your calorie budget."}
                            {status === 'on-track' && "Perfect balance. You're hitting your targets precisely."}
                            {status === 'over' && "Daily limit reached. Focus on high-volume, low-kcal snacks."}
                        </p>
                    </div>

                    <div className="text-md-end mt-4 mt-md-0">
                        <div className="text-muted small fw-800 text-uppercase tracking-wider mb-1">Target Intake</div>
                        <div className="h2 fw-800 mb-0 text-primary">
                            {targetCalories.toLocaleString()}
                            <span className="fs-5 text-muted ms-2 fw-normal">kcal / day</span>
                        </div>
                    </div>
                </div>

                {/* --- TOP ROW: TRACKER & STATS --- */}
                <div className="row g-4 mb-5">
                    {/* Visual Tracker */}
                    <div className="col-xl-4 col-lg-5 col-12">
                        <CalorieProgress consumed={todayCalories} target={targetCalories} />
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="col-xl-8 col-lg-7 col-12">
                        <div className="row g-4 h-100">
                            <div className="col-md-6">
                                <MotionCard className={`h-100 p-4 border-0 ${status === 'over' ? 'glass-card-danger' : 'glass-card-primary'}`}>
                                    <div className="d-flex flex-column justify-content-between h-100">
                                        <div className="bg-primary bg-opacity-20 rounded-3 p-2 w-auto align-self-start mb-4">
                                            <LightningFill size={20} className="text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-uppercase small fw-800 text-muted mb-1 tracking-wider">Remaining Budget</p>
                                            <h3 className="fw-800 mb-1 display-6 text-dark">
                                                {status === 'over' ? `${excess} Over` : `${remaining}`}
                                                <span className="fs-5 fw-normal opacity-75 ms-2">kcal</span>
                                            </h3>
                                            <div className="progress mt-3 bg-dark bg-opacity-10 rounded-pill" style={{ height: '6px' }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min((todayCalories / targetCalories) * 100, 100)}%` }}
                                                    className="progress-bar bg-primary"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </MotionCard>
                            </div>

                            <div className="col-md-6">
                                <MotionCard className="h-100 p-4 border-0 glass-card-info">
                                    <div className="d-flex flex-column justify-content-between h-100">
                                        <div className="bg-info bg-opacity-20 rounded-3 p-2 w-auto align-self-start mb-4">
                                            <BarChartFill size={20} className="text-info" />
                                        </div>
                                        <div>
                                            <p className="text-uppercase small fw-800 text-muted mb-1 tracking-wider">Weekly Consistency</p>
                                            <h3 className="fw-800 mb-1 display-6 text-dark">
                                                {weeklyStats.avgDaily.toFixed(0)}
                                                <span className="fs-5 fw-normal opacity-75 ms-2">avg kcal</span>
                                            </h3>
                                            <p className="mb-0 mt-3 text-muted small">System analyzed last 7 entries</p>
                                        </div>
                                    </div>
                                </MotionCard>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- MIDDLE ROW: ADD MEAL --- */}
                <div className="row g-4 mb-5">
                    <div className="col-12">
                        <MotionCard className="p-4 border-0 bg-white bg-opacity-30 shadow-sm" noTilt>
                            <div className="d-flex align-items-center mb-4">
                                <PlusCircle className="text-primary me-2" size={24} />
                                <h4 className="fw-800 mb-0">Record New Fuel</h4>
                            </div>
                            <AddMealForm onAdd={addMealMutation.mutateAsync} isLoading={addMealMutation.isPending} />
                        </MotionCard>
                    </div>
                </div>

                {/* --- BOTTOM ROW: HISTORY --- */}
                <div className="row g-4">
                    <div className="col-12">
                        <div className="p-4 rounded-4 bg-white bg-opacity-20 border border-white border-opacity-30">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <div className="d-flex align-items-center">
                                    <ClockHistory className="text-muted me-2" size={20} />
                                    <h4 className="fw-800 mb-0">Consumption Timeline</h4>
                                </div>
                                <span className="badge bg-light text-dark rounded-pill px-3">Today</span>
                            </div>

                            {isLoading ? (
                                <div className="text-center py-5 text-muted">
                                    <div className="spinner-border spinner-border-sm me-2"></div>
                                    Analyzing logs...
                                </div>
                            ) : todayMeals.length === 0 ? (
                                <div className="text-center py-5 opacity-50">
                                    <div className="fs-1 mb-2">🍱</div>
                                    <p className="fw-bold">No meals recorded yet.</p>
                                    <small>Your nutrition history for today will appear here.</small>
                                </div>
                            ) : (
                                <StaggerContainer className="row g-3">
                                    {todayMeals.map((meal) => (
                                        <div className="col-md-6 col-xl-4" key={meal.id}>
                                            <motion.div variants={itemVariants}>
                                                <MealEntry
                                                    meal={meal}
                                                    onDelete={deleteMealMutation.mutate}
                                                />
                                            </motion.div>
                                        </div>
                                    ))}
                                </StaggerContainer>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
