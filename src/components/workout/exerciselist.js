import React, { useState } from 'react';
import { CheckCircleFill, ChevronDown, ListCheck, PersonCheck } from 'react-bootstrap-icons';
import { motion, AnimatePresence } from 'framer-motion';
import StickFigure from './StickFigure';
import { getBMIScaledPlan, getFormTips } from '../../utils/fitnessLogic';

export default function ExerciseList({ exercises, completedExercises, onToggle, profile }) {
    const [expandedId, setExpandedId] = useState(null);

    if (!exercises) return null;

    const handleToggle = (id) => {
        // Force state update to trigger re-render
        setExpandedId(prev => prev === id ? null : id);
    };

    return (
        <div className="exercise-list d-flex flex-column gap-3 pb-5">
            {exercises.map((exercise) => {
                const isCompleted = completedExercises.includes(exercise.id);
                const isExpanded = expandedId === exercise.id;

                // Get Plan Details
                const scaledPlan = getBMIScaledPlan(exercise, profile) || { reps: 10, sets: 3, rest: '60s', bmiCategory: 'Normal' };
                const formTips = getFormTips(exercise.name);

                return (
                    <div
                        key={exercise.id}
                        className={`exercise-card glass-panel border-0 overflow-hidden ${isExpanded ? 'shadow-lg' : ''}`}
                        style={{
                            borderRadius: '24px',
                            background: isCompleted ? 'rgba(16, 185, 129, 0.05)' : 'var(--glass-bg)',
                            transition: 'all 0.3s ease',
                            border: isExpanded ? '2px solid var(--primary-color)' : '1px solid var(--glass-border)'
                        }}
                    >
                        {/* THE HEADER - Click here to open */}
                        <div
                            className="p-3 d-flex align-items-center justify-content-between"
                            onClick={() => handleToggle(exercise.id)}
                            style={{
                                cursor: 'pointer',
                                minHeight: '80px',
                                background: isExpanded ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                            }}
                        >
                            <div className="d-flex align-items-center gap-3">
                                <div className="position-relative">
                                    <StickFigure
                                        pose={exercise.pose || 'standing'}
                                        color={isCompleted ? '#10b981' : 'var(--text-muted)'}
                                        size={45}
                                    />
                                    {isCompleted && (
                                        <div className="position-absolute top-0 start-100 translate-middle">
                                            <CheckCircleFill size={18} className="text-success bg-white rounded-circle shadow-sm" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h6 className={`mb-0 fw-bold ${isCompleted ? 'text-decoration-line-through text-muted' : ''}`}>
                                        {exercise.name}
                                    </h6>
                                    <div className="small text-muted">{exercise.muscle}</div>
                                </div>
                            </div>

                            <div className="d-flex align-items-center gap-2">
                                <span className="badge bg-primary bg-opacity-10 text-primary border-0 rounded-pill px-2 py-1 x-small fw-800">
                                    {scaledPlan.sets} SETS
                                </span>
                                <span className="badge bg-primary bg-opacity-10 text-primary border-0 rounded-pill px-2 py-1 x-small fw-800">
                                    {scaledPlan.reps} REPS
                                </span>
                                <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                                    <ChevronDown className="text-muted" size={18} />
                                </motion.div>
                            </div>
                        </div>

                        {/* THE BODY - Slides down when open */}
                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.4, ease: "anticipate" }}
                                >
                                    <div className="px-4 pb-4 pt-2 border-top border-dark border-opacity-5">
                                        <div className="row g-4 pt-3">
                                            {/* Column 1: AI Plan & Visual */}
                                            <div className="col-md-5">
                                                <div className="p-4 rounded-4 bg-white bg-opacity-40 text-center mb-3">
                                                    <StickFigure
                                                        pose={exercise.pose || 'standing'}
                                                        color="var(--primary-color)"
                                                        size={110}
                                                    />
                                                </div>

                                                <div className="p-3 rounded-4 bg-primary bg-opacity-10 border border-primary border-opacity-10">
                                                    <div className="d-flex align-items-center mb-3 text-primary">
                                                        <PersonCheck className="me-2" size={18} />
                                                        <span className="fw-bold small text-uppercase ls-1">AI Optimized Plan</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between text-center">
                                                        <div className="flex-fill bg-white bg-opacity-50 rounded-3 py-2 mx-1 shadow-sm">
                                                            <div className="h4 mb-0 fw-800 text-primary">{scaledPlan.reps}</div>
                                                            <div className="text-muted fw-bold" style={{ fontSize: '0.7rem' }}>REPS</div>
                                                        </div>
                                                        <div className="flex-fill bg-white bg-opacity-50 rounded-3 py-2 mx-1 shadow-sm">
                                                            <div className="h4 mb-0 fw-800 text-primary">{scaledPlan.sets}</div>
                                                            <div className="text-muted fw-bold" style={{ fontSize: '0.7rem' }}>SETS</div>
                                                        </div>
                                                        <div className="flex-fill bg-white bg-opacity-50 rounded-3 py-2 mx-1 shadow-sm">
                                                            <div className="h4 mb-0 fw-800 text-primary">{scaledPlan.rest}</div>
                                                            <div className="text-muted fw-bold" style={{ fontSize: '0.7rem' }}>REST</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Column 2: Techniques & Action */}
                                            <div className="col-md-7">
                                                <div className="mb-4">
                                                    <div className="d-flex align-items-center mb-3 text-dark">
                                                        <ListCheck className="me-2 text-success" />
                                                        <h6 className="mb-0 fw-bold">Training Guidance</h6>
                                                    </div>
                                                    <ul className="list-unstyled mb-0">
                                                        {formTips.map((tip, i) => (
                                                            <li key={i} className="d-flex align-items-start mb-2 small text-muted">
                                                                <span className="text-success me-2">•</span>
                                                                {tip}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <button
                                                    className={`btn w-100 rounded-pill py-3 fw-bold shadow-sm ${isCompleted ? 'btn-outline-success' : 'btn-success text-white'}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onToggle(exercise.id);
                                                    }}
                                                >
                                                    {isCompleted ? 'Mark as Incomplete' : 'Complete Exercise'}
                                                </button>

                                                <div className="mt-3 text-center">
                                                    <button
                                                        className="btn btn-link text-muted small text-decoration-none"
                                                        onClick={() => setExpandedId(null)}
                                                    >
                                                        Collapse Details
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
}
