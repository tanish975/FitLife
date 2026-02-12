import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DropletFill, Plus, Dash } from 'react-bootstrap-icons';
import MotionCard from '../animations/MotionCard';

export default function HydrationTracker() {
    const [intake, setIntake] = useState(0);
    const target = 2500;
    const percentage = Math.min((intake / target) * 100, 100);

    const addWater = (amount) => setIntake(prev => Math.min(prev + amount, 5000));
    const removeWater = (amount) => setIntake(prev => Math.max(prev - amount, 0));

    return (
        <MotionCard className="h-100 border-0 shadow-sm overflow-hidden" noTilt>
            <div className="position-relative h-100 d-flex flex-column justify-content-between p-4" style={{ zIndex: 1, minHeight: '220px' }}>

                {/* --- HEADER --- */}
                <div className="d-flex justify-content-between align-items-start" style={{ zIndex: 2 }}>
                    <div>
                        <h5 className="fw-800 mb-0">Hydration</h5>
                        <p className="text-muted small mb-0">Goal: {target}ml</p>
                    </div>
                    <div className="bg-info bg-opacity-10 p-2 rounded-3 text-info">
                        <DropletFill size={18} />
                    </div>
                </div>

                {/* --- CENTRAL COUNTER --- */}
                <div className="text-center my-2" style={{ zIndex: 2 }}>
                    <motion.div
                        key={intake}
                        initial={{ scale: 0.9, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="display-6 fw-800 text-dark"
                    >
                        {intake}
                        <span className="fs-6 text-muted ms-1 fw-bold">ml</span>
                    </motion.div>
                </div>

                {/* --- CONTROLS --- */}
                <div className="d-flex justify-content-center gap-2 mt-auto" style={{ zIndex: 2 }}>
                    <motion.button
                        whileTap={{ scale: 0.8 }}
                        className="btn btn-light rounded-circle shadow-sm d-flex align-items-center justify-content-center p-0"
                        style={{ width: '32px', height: '32px' }}
                        onClick={() => removeWater(250)}
                        disabled={intake === 0}
                    >
                        <Dash size={18} />
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn btn-info text-white px-3 shadow-sm fw-bold rounded-pill border-0 d-flex align-items-center btn-sm"
                        style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)' }}
                        onClick={() => addWater(250)}
                    >
                        <Plus size={18} className="me-1" />
                        250ml
                    </motion.button>
                </div>

                {/* --- WATER LAYER --- */}
                <motion.div
                    className="position-absolute bottom-0 start-0 w-100"
                    initial={{ height: '0%' }}
                    animate={{ height: `${percentage}%` }}
                    transition={{ type: "spring", stiffness: 20, damping: 10 }}
                    style={{
                        backgroundColor: 'rgba(186, 230, 253, 0.4)',
                        zIndex: 0
                    }}
                >
                    <div className="position-absolute w-100" style={{ top: '-15px', height: '15px' }}>
                        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ width: '100%', height: '100%', fill: 'rgba(186, 230, 253, 0.4)' }}>
                            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" />
                        </svg>
                    </div>
                </motion.div>
            </div>
        </MotionCard>
    );
}
