import React from 'react';
import { motion } from 'framer-motion';
import CircularProgress from '../common/CircularProgress';
import MotionCard from '../animations/MotionCard';
import { LightningChargeFill, ShieldCheck, InfoCircle } from 'react-bootstrap-icons';

export default function WeeklyHealthScore({ score, streak, onAskCoach }) {

    const getScoreColor = (s) => {
        if (s >= 80) return '#10b981'; // Emerald
        if (s >= 60) return '#6366f1'; // Indigo
        return '#f59e0b'; // Amber
    };

    const color = getScoreColor(score);

    return (
        <MotionCard className="glass-card-primary h-100 text-dark relative overflow-hidden">
            {/* Background Blob for aesthetic */}
            <div className="position-absolute top-0 end-0 p-5 rounded-circle bg-white opacity-10" style={{ transform: 'translate(30%, -30%)', width: '200px', height: '200px' }}></div>

            <div className="p-4 d-flex flex-column h-100 position-relative z-1">
                <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h4 className="fw-bold mb-0">Health Score</h4>
                        <p className="text-muted small mb-0">Weekly composite metric</p>
                    </div>
                    <div className="d-flex align-items-start gap-2">
                        {streak.protected && (
                            <div className="badge bg-white bg-opacity-50 text-dark border border-white border-opacity-50 d-flex align-items-center gap-1 shadow-sm px-2">
                                <ShieldCheck className="text-primary" size={14} />
                                <span style={{ fontSize: '0.7rem' }}>Protected</span>
                            </div>
                        )}
                        <button
                            onClick={() => onAskCoach && onAskCoach('healthScore')}
                            className="btn btn-link p-0 text-primary opacity-75 hover-opacity-100 transition-all"
                            title="How is this calculated?"
                        >
                            <InfoCircle size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex-grow-1 d-flex align-items-center justify-content-center my-2">
                    <div className="position-relative">
                        <CircularProgress
                            percentage={score}
                            color={color}
                            size={160}
                            strokeWidth={12}
                        />
                        <div className="position-absolute top-50 start-50 translate-middle text-center">
                            <motion.h1
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="display-4 fw-bolder mb-0 gradient-text"
                                style={{ background: `linear-gradient(135deg, ${color}, #8b5cf6)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                            >
                                {score}
                            </motion.h1>
                        </div>
                    </div>
                </div>

                <div className="mt-3 p-3 rounded-3 bg-white bg-opacity-20 border border-white border-opacity-40 d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                        <LightningChargeFill className="text-warning me-2" />
                        <div>
                            <div className="fw-bold lh-1">{streak.current} Day Streak</div>
                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>Keep it up!</small>
                        </div>
                    </div>
                </div>
            </div>
        </MotionCard>
    );
}
