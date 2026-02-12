import React from 'react';
import CircularProgress from '../common/CircularProgress';
import MotionCard from '../animations/MotionCard';
import { motion } from 'framer-motion';
import { Fire, Bullseye, ArrowRightCircleFill } from 'react-bootstrap-icons';

export default function CalorieProgress({ consumed, target }) {
    const percentage = Math.min((consumed / target) * 100, 100);
    const remaining = Math.max(target - consumed, 0);
    const isOver = consumed > target;

    const getProgressColor = () => {
        if (isOver) return '#ef4444';
        if (percentage > 85) return '#f59e0b';
        return '#6366f1'; // Premium Indigo instead of standard green
    };

    const color = getProgressColor();

    return (
        <MotionCard className="glass-card-primary h-100 border-0 overflow-hidden">
            <div className="p-4 d-flex flex-column h-100 position-relative z-1">

                {/* Header Area */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <h5 className="fw-800 mb-0 d-flex align-items-center">
                            Calories
                            <Fire className="ms-2 text-danger animate-pulse" style={{ animation: 'pulse 2s infinite' }} />
                        </h5>
                        <p className="text-muted small mb-0">Daily Energy Balance</p>
                    </div>
                </div>

                {/* Main Content: Split Row */}
                <div className="flex-grow-1 d-flex align-items-center justify-content-between gap-3">
                    {/* Circle Portion */}
                    <div className="position-relative" style={{ width: '130px', height: '130px' }}>
                        <CircularProgress
                            percentage={percentage.toFixed(0)}
                            color={color}
                            size={130}
                            strokeWidth={10}
                        />
                        <div className="position-absolute top-50 start-50 translate-middle text-center">
                            <span className="h4 fw-bold mb-0">{percentage.toFixed(0)}%</span>
                        </div>
                    </div>

                    {/* Stats Portion */}
                    <div className="flex-grow-1">
                        <div className="mb-3">
                            <div className="d-flex align-items-center text-muted small mb-1">
                                <Bullseye className="me-2" size={14} />
                                GOAL
                            </div>
                            <div className="h5 fw-800 mb-0">{target} <span className="small fw-normal opacity-50">kcal</span></div>
                        </div>

                        <div>
                            <div className="d-flex align-items-center text-muted small mb-1">
                                <ArrowRightCircleFill className={`me-2 ${isOver ? 'text-danger' : 'text-primary'}`} size={14} />
                                {isOver ? 'SURPLUS' : 'REMAINING'}
                            </div>
                            <div className={`h5 fw-800 mb-0 ${isOver ? 'text-danger' : 'text-primary'}`}>
                                {isOver ? consumed - target : remaining}
                                <span className="small fw-normal opacity-50"> kcal</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar: Total Consumed */}
                <div className="mt-3 p-2 px-3 rounded-pill bg-white bg-opacity-20 border border-white border-opacity-30 d-flex justify-content-between align-items-center">
                    <span className="small fw-bold opacity-75">CONSISTENCY</span>
                    <div className="fw-800 small text-primary">
                        {consumed} / {target} Total
                    </div>
                </div>
            </div>

            {/* Aesthetic Glow */}
            <div className="position-absolute bottom-0 start-0 w-100 h-25 bg-primary opacity-5" style={{ filter: 'blur(40px)' }}></div>
        </MotionCard>
    );
}
