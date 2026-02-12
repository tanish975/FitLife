import React from 'react';
import { Card, Row, Col, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { AwardFill, TrophyFill, StarFill, LightningFill, ShieldCheck } from 'react-bootstrap-icons';
import { motion } from 'framer-motion';
import MotionCard from '../animations/MotionCard';

export default function BadgeSystem() {
    const badges = [
        {
            id: 1,
            name: 'First Step',
            icon: <StarFill />,
            description: "Journey started! Created your profile.",
            unlocked: true,
            color: '#f59e0b', // Amber/Gold
            gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)'
        },
        {
            id: 2,
            name: 'Hydration',
            icon: <LightningFill />,
            description: "Water goal reached! Tracked daily intake.",
            unlocked: true,
            color: '#06b6d4', // Cyan
            gradient: 'linear-gradient(135deg, #22d3ee, #06b6d4)'
        },
        {
            id: 3,
            name: 'Warrior',
            icon: <TrophyFill />,
            description: "Power user! Completed 5 distinct workouts.",
            unlocked: false,
            color: '#6366f1', // Indigo
            gradient: 'linear-gradient(135deg, #818cf8, #6366f1)'
        },
        {
            id: 4,
            name: 'Consistency',
            icon: <ShieldCheck />,
            description: "Streak Master! Maintained focus for 7 days.",
            unlocked: false,
            color: '#10b981', // Emerald
            gradient: 'linear-gradient(135deg, #34d399, #10b981)'
        },
    ];

    const unlockedCount = badges.filter(b => b.unlocked).length;

    return (
        <MotionCard noTilt className="h-100 overflow-hidden border-0 shadow-sm">
            <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h5 className="mb-0 fw-800">Achievements</h5>
                        <p className="text-muted small mb-0">{unlockedCount} of {badges.length} unlocked</p>
                    </div>
                    <div className="bg-warning bg-opacity-10 p-2 rounded-3">
                        <TrophyFill className="text-warning" size={20} />
                    </div>
                </div>

                <div className="row g-3">
                    {badges.map((badge) => (
                        <div key={badge.id} className="col-6">
                            <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip id={`badge-${badge.id}`}>{badge.description}</Tooltip>}
                            >
                                <motion.div
                                    whileHover={badge.unlocked ? { scale: 1.05, y: -2 } : {}}
                                    className={`p-3 rounded-4 d-flex flex-column align-items-center text-center h-100 position-relative transition-all ${badge.unlocked ? 'bg-white bg-opacity-50 shadow-sm border border-white' : 'bg-light bg-opacity-30 border border-transparent'}`}
                                    style={{
                                        cursor: 'help',
                                        minHeight: '110px'
                                    }}
                                >
                                    <div
                                        className={`mb-2 rounded-circle d-flex align-items-center justify-content-center shadow-sm`}
                                        style={{
                                            width: '45px',
                                            height: '45px',
                                            background: badge.unlocked ? badge.gradient : 'rgba(100, 116, 139, 0.1)',
                                            color: badge.unlocked ? 'white' : '#94a3b8'
                                        }}
                                    >
                                        {React.cloneElement(badge.icon, { size: 20 })}
                                    </div>
                                    <span className={`fw-bold small ${badge.unlocked ? 'text-dark' : 'text-muted'}`} style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>
                                        {badge.name}
                                    </span>
                                    {!badge.unlocked && (
                                        <div className="position-absolute top-0 end-0 p-2">
                                            <div className="bg-secondary bg-opacity-10 rounded-circle" style={{ width: '6px', height: '6px' }}></div>
                                        </div>
                                    )}
                                </motion.div>
                            </OverlayTrigger>
                        </div>
                    ))}
                </div>

                {unlockedCount > 0 && (
                    <div className="mt-4 pt-3 border-top border-dark border-opacity-5">
                        <div className="progress rounded-pill overflow-hidden" style={{ height: '6px', backgroundColor: 'rgba(0,0,0,0.05)' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(unlockedCount / badges.length) * 100}%` }}
                                className="progress-bar bg-warning"
                                style={{ transition: 'width 1s ease-out' }}
                            />
                        </div>
                    </div>
                )}
            </Card.Body>
        </MotionCard>
    );
}
