import React, { useState, useEffect } from 'react';
import { base44 } from 'api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProfileForm from 'components/profile/profileform';
import MetricCard from 'components/health/metriccard';
import BMIGauge from 'components/health/bmigauge';
import { PersonCircle, LightningFill, CalculatorFill, InfoCircleFill } from 'react-bootstrap-icons';
import PageTransition from 'components/animations/PageTransition';
import { StaggerContainer, itemVariants } from 'components/animations/StaggerContainer';
import { motion } from 'framer-motion';
import MotionCard from 'components/animations/MotionCard';
import { getAiCoachAdvice } from 'utils/aiCoachLogic';

export default function Profile() {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        full_name: '',
        age: '',
        gender: '',
        height: '',
        weight: '',
        goal: ''
    });

    const { data: profiles = [], isLoading: isProfileLoading } = useQuery({
        queryKey: ['userProfile'],
        queryFn: () => base44.entities.UserProfile.list()
    });

    const existingProfile = profiles[0];

    useEffect(() => {
        if (existingProfile) {
            setFormData({
                full_name: existingProfile.full_name || '',
                age: existingProfile.age || '',
                gender: existingProfile.gender || '',
                height: existingProfile.height || '',
                weight: existingProfile.weight || '',
                goal: existingProfile.goal || ''
            });
        }
    }, [existingProfile]);

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.UserProfile.create(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    });

    const updateMutation = useMutation({
        mutationFn: (data) => base44.entities.UserProfile.update(existingProfile.id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (existingProfile) {
            await updateMutation.mutateAsync(formData);
        } else {
            await createMutation.mutateAsync(formData);
        }
    };

    // Use effective data (form data or existing profile) for calculations to avoid delay
    const effectiveHeight = formData.height || existingProfile?.height;
    const effectiveWeight = formData.weight || existingProfile?.weight;
    const effectiveAge = formData.age || existingProfile?.age;
    const effectiveGender = formData.gender || existingProfile?.gender;
    const effectiveGoal = formData.goal || existingProfile?.goal;

    const calculateBMI = () => {
        if (!effectiveHeight || !effectiveWeight) return null;
        const h = effectiveHeight / 100;
        return effectiveWeight / (h * h);
    };

    const calculateBMR = () => {
        if (!effectiveHeight || !effectiveWeight || !effectiveAge || !effectiveGender) return null;
        if (effectiveGender === 'male') return 10 * effectiveWeight + 6.25 * effectiveHeight - 5 * effectiveAge + 5;
        return 10 * effectiveWeight + 6.25 * effectiveHeight - 5 * effectiveAge - 161;
    };

    const calculateIdealWeight = () => {
        if (!effectiveHeight || !effectiveGender) return null;
        if (effectiveGender === 'male') return 50 + 2.3 * ((effectiveHeight / 2.54) - 60);
        return 45.5 + 2.3 * ((effectiveHeight / 2.54) - 60);
    };

    const getTargetCalories = () => {
        const bmr = calculateBMR();
        if (!bmr || !effectiveGoal) return null;
        const tdee = bmr * 1.55;
        if (effectiveGoal === 'lose') return Math.round(tdee - 500);
        if (effectiveGoal === 'gain') return Math.round(tdee + 500);
        return Math.round(tdee);
    };

    const bmi = calculateBMI();
    const bmr = calculateBMR();
    const idealWeight = calculateIdealWeight();
    const targetCalories = getTargetCalories();

    // Body Fat Estimate
    const bodyFat = bmi && effectiveAge ? (effectiveGender === 'male'
        ? (1.20 * bmi) + (0.23 * effectiveAge) - 16.2
        : (1.20 * bmi) + (0.23 * effectiveAge) - 5.4) : null;

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <PageTransition>
            <div className="container-fluid p-3 p-md-5">
                {/* --- HEADER --- */}
                <div className="d-flex align-items-center mb-5 animate-fade-in">
                    <div className="me-4 bg-primary bg-opacity-10 p-3 rounded-circle text-primary shadow-sm">
                        <PersonCircle size={40} />
                    </div>
                    <div>
                        <h1 className="fw-800 display-5 mb-1 gradient-text">My Health Profile</h1>
                        <p className="text-muted lead mb-0">Fine-tune your AI coach by keeping your vitals updated.</p>
                    </div>
                </div>

                {/* --- MAIN CONTENT GRID --- */}
                <StaggerContainer className="row g-4 lg-g-5">
                    {/* LEFT COLUMN: THE FORM */}
                    <div className="col-lg-5">
                        <MotionCard className="h-100 border-0" noTilt>
                            <ProfileForm
                                profile={formData}
                                onChange={setFormData}
                                onSubmit={handleSubmit}
                                isLoading={isLoading}
                            />
                        </MotionCard>
                    </div>

                    {/* RIGHT COLUMN: THE DASHBOARD */}
                    <div className="col-lg-7">
                        <div className="row g-4">
                            {/* 1. BMI Gauge (Full Width Hero) */}
                            <div className="col-12">
                                {isProfileLoading ? (
                                    <div className="placeholder-glow">
                                        <div className="placeholder col-12 rounded-4" style={{ height: '280px' }}></div>
                                    </div>
                                ) : bmi ? (
                                    <BMIGauge bmi={bmi} />
                                ) : (
                                    <MotionCard className="p-5 text-center text-muted border-dashed" noTilt>
                                        <CalculatorFill size={48} className="mb-3 opacity-20" />
                                        <p className="lead">Please enter your height and weight to generate your health analysis.</p>
                                    </MotionCard>
                                )}
                            </div>

                            {/* 2. Secondary Metrics (2x2 Grid) */}
                            <div className="col-md-6">
                                <MetricCard
                                    title="BMR"
                                    value={bmr?.toFixed(0) || '--'}
                                    unit="kcal"
                                    subtitle="Metabolic Energy"
                                    color="warning"
                                    icon={<LightningFill size={20} />}
                                />
                            </div>
                            <div className="col-md-6">
                                <MetricCard
                                    title="Target"
                                    value={targetCalories || '--'}
                                    unit="kcal"
                                    subtitle={effectiveGoal === 'lose' ? 'Deficit' : effectiveGoal === 'gain' ? 'Surplus' : 'Maintenance'}
                                    color="success"
                                    icon={<LightningFill size={20} />}
                                />
                            </div>
                            <div className="col-md-6">
                                <MetricCard
                                    title="Ideal Weight"
                                    value={idealWeight?.toFixed(1) || '--'}
                                    unit="kg"
                                    subtitle="Scientific Ideal"
                                    color="info"
                                    icon={<PersonCircle size={20} />}
                                />
                            </div>
                            <div className="col-md-6">
                                <MetricCard
                                    title="Est. Body Fat"
                                    value={bodyFat?.toFixed(1) || '--'}
                                    unit="%"
                                    subtitle="Formula Estimate"
                                    color="danger"
                                    icon={<PersonCircle size={20} />}
                                />
                            </div>

                            {/* COACH MESSAGE */}
                            <div className="col-12">
                                <motion.div
                                    variants={itemVariants}
                                    className="p-4 rounded-4 bg-white bg-opacity-30 border border-white border-opacity-40 d-flex gap-3"
                                >
                                    <InfoCircleFill className="text-primary mt-1" size={20} />
                                    <div>
                                        <h6 className="fw-bold mb-1">AI Coach Perspective:</h6>
                                        <p className="text-muted small mb-0">
                                            {getAiCoachAdvice(bmi, effectiveGoal, effectiveAge, effectiveGender, bodyFat)}
                                        </p>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </StaggerContainer>
            </div>
        </PageTransition>
    );
}
