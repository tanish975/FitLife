import React, { useState, useEffect } from 'react';
import { base44 } from 'api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Activity, Fire, ChevronLeft, Trophy } from 'react-bootstrap-icons';

import WorkoutCard from 'components/workout/workoutcard';
import ExerciseList from 'components/workout/exerciselist';
import PageTransition from 'components/animations/PageTransition';
import MotionCard from 'components/animations/MotionCard';
import { StaggerContainer } from 'components/animations/StaggerContainer';

import { workoutPlans } from 'data/workoutPlans';
import { getRecommendedWorkouts, getDailyCoachMessage } from 'utils/fitnessLogic';

export default function Workouts() {
    const [location, setLocation] = useState('home');
    const [selectedWorkout, setSelectedWorkout] = useState(null);
    const [completedExercises, setCompletedExercises] = useState(() => {
        const saved = localStorage.getItem('completedExercises');
        return saved ? JSON.parse(saved) : [];
    });

    const { data: profiles = [] } = useQuery({
        queryKey: ['userProfile'],
        queryFn: () => base44.entities.UserProfile.list()
    });

    const profile = profiles[0];
    const recommendedWorkouts = getRecommendedWorkouts(profile, location);
    const dailyMessage = getDailyCoachMessage(profile);
    const allWorkouts = [...workoutPlans[location].cardio, ...workoutPlans[location].strength];

    useEffect(() => {
        localStorage.setItem('completedExercises', JSON.stringify(completedExercises));
    }, [completedExercises]);

    const handleToggleExercise = (exerciseId) => {
        setCompletedExercises(prev =>
            prev.includes(exerciseId)
                ? prev.filter(id => id !== exerciseId)
                : [...prev, exerciseId]
        );
    };

    // --- Active Workout View ---
    if (selectedWorkout) {
        const progress = selectedWorkout.exercises.filter(e => completedExercises.includes(e.id)).length;
        const totalExercises = selectedWorkout.exercises.length;
        const progressPercentage = (progress / totalExercises) * 100;
        const isComplete = progress === totalExercises;

        return (
            <PageTransition>
                <div className="container-fluid p-3 p-md-5">
                    <button
                        className="btn btn-link text-decoration-none mb-4 ps-0 d-flex align-items-center text-muted"
                        onClick={() => {
                            setSelectedWorkout(null);
                        }}
                    >
                        <ChevronLeft className="me-2" /> Back to Plans
                    </button>

                    <div className="row g-4">
                        <div className="col-lg-4">
                            <MotionCard className="glass-card-primary h-100 text-dark">
                                <div className="p-4">
                                    <h1 className="display-6 fw-bold mb-3">{selectedWorkout.name}</h1>
                                    <p className="text-muted mb-4">{selectedWorkout.description}</p>

                                    <div className="d-flex justify-content-between mb-4 p-3 rounded-3" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                                        <div className="text-center">
                                            <div className="text-muted small mb-1">Time</div>
                                            <div className="fw-bold d-flex align-items-center justify-content-center">
                                                <Clock className="me-2 text-primary" /> {selectedWorkout.duration}
                                            </div>
                                        </div>
                                        <div className="vr opacity-25"></div>
                                        <div className="text-center">
                                            <div className="text-muted small mb-1">Burn</div>
                                            <div className="fw-bold d-flex align-items-center justify-content-center">
                                                <Fire className="me-2 text-danger" /> {selectedWorkout.calories}
                                            </div>
                                        </div>
                                        <div className="vr opacity-25"></div>
                                        <div className="text-center">
                                            <div className="text-muted small mb-1">Level</div>
                                            <div className="fw-bold text-capitalize">{selectedWorkout.difficulty}</div>
                                        </div>
                                    </div>

                                    <div className="mb-2 d-flex justify-content-between align-items-end">
                                        <span className="fw-bold text-primary">Progress</span>
                                        <span className="text-muted small">{Math.round(progressPercentage)}%</span>
                                    </div>
                                    <div className="progress" style={{ height: '10px', borderRadius: '10px', background: 'rgba(0,0,0,0.05)' }}>
                                        <motion.div
                                            className="progress-bar bg-gradient-primary"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progressPercentage}%` }}
                                            transition={{ duration: 0.5 }}
                                            style={{ borderRadius: '10px', background: 'linear-gradient(90deg, var(--primary-color), var(--accent-color))' }}
                                        />
                                    </div>

                                    <AnimatePresence>
                                        {isComplete && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="mt-4 p-3 rounded-3 bg-success bg-opacity-10 border border-success border-opacity-25 text-success d-flex align-items-center"
                                            >
                                                <Trophy className="me-3 fs-4" />
                                                <div>
                                                    <div className="fw-bold">Workout Complete!</div>
                                                    <div className="small">Great consistency today. Keep it up!</div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </MotionCard>
                        </div>

                        <div className="col-lg-8">
                            <h3 className="mb-4 fw-bold">Exercises</h3>
                            <ExerciseList
                                exercises={selectedWorkout.exercises}
                                completedExercises={completedExercises}
                                onToggle={handleToggleExercise}
                                profile={profile}
                            />
                        </div>
                    </div>
                </div>
            </PageTransition>
        );
    }

    // --- Main Dashboard View ---
    return (
        <PageTransition>
            <div className="container-fluid p-3 p-md-5">
                {/* Header Section with Glass Effect */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-5">
                    <div className="mb-3 mb-md-0">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="d-inline-block px-3 py-1 rounded-pill bg-primary bg-opacity-10 text-primary small fw-bold mb-2 border border-primary border-opacity-10"
                        >
                            <Activity className="me-2" />
                            AI Coach Active
                        </motion.div>
                        <h1 className="fw-800 display-5 mb-2 gradient-text">Workout Plans</h1>
                        <p className="text-muted lead mb-0" style={{ maxWidth: '600px' }}>
                            {dailyMessage}
                        </p>
                    </div>

                    <div className="glass-panel p-1 d-inline-flex rounded-pill">
                        <button
                            className={`btn btn-sm rounded-pill px-4 ${location === 'home' ? 'btn-primary shadow-sm' : 'text-muted hover-bg-light'}`}
                            onClick={() => setLocation('home')}
                        >
                            Home
                        </button>
                        <button
                            className={`btn btn-sm rounded-pill px-4 ${location === 'gym' ? 'btn-primary shadow-sm' : 'text-muted hover-bg-light'}`}
                            onClick={() => setLocation('gym')}
                        >
                            Gym
                        </button>
                    </div>
                </div>

                {/* Recommended Section */}
                <StaggerContainer className="mb-5">
                    <div className="d-flex align-items-center mb-4">
                        <div className="icon-box bg-primary bg-opacity-10 text-primary rounded-circle p-2 me-3">
                            <Fire />
                        </div>
                        <div>
                            <h2 className="h4 fw-bold mb-0">Recommended for You</h2>
                            <span className="text-muted small">Based on your BMI & Goals</span>
                        </div>
                    </div>

                    <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
                        {recommendedWorkouts.map((workout) => (
                            <div className="col" key={workout.id}>
                                <WorkoutCard
                                    workout={workout}
                                    onClick={() => setSelectedWorkout(workout)}
                                />
                            </div>
                        ))}
                    </div>
                </StaggerContainer>

                {/* All Workouts Section */}
                <div className="mt-5">
                    <h2 className="h5 fw-bold text-muted mb-4 ps-1">All {location === 'home' ? 'Home' : 'Gym'} Workouts</h2>
                    <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 g-4 opacity-75">
                        {allWorkouts.map((workout) => (
                            <div className="col" key={workout.id}>
                                <WorkoutCard
                                    workout={workout}
                                    onClick={() => setSelectedWorkout(workout)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
