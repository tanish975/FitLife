import React from 'react';
import { Card } from 'react-bootstrap';
import MotionCard from '../animations/MotionCard';

export default function BMIGauge({ bmi }) {
    const getBMICategory = (bmiValue) => {
        if (!bmiValue) return { label: 'Unknown', color: '#94a3b8', pct: 0 };
        if (bmiValue < 18.5) return { label: 'Underweight', color: '#0ea5e9', pct: 25 };
        if (bmiValue < 25) return { label: 'Healthy', color: '#10b981', pct: 50 };
        if (bmiValue < 30) return { label: 'Overweight', color: '#f59e0b', pct: 75 };
        return { label: 'Obese', color: '#ef4444', pct: 95 };
    };

    const category = getBMICategory(bmi);

    // Custom SVG Gauge Logic (Half Circle)
    const size = 200;
    const strokeWidth = 15;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * Math.PI; // Half circle
    const percentage = Math.min(Math.max(((bmi - 15) / 25) * 100, 0), 100);
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <MotionCard className="shadow-lg border-0 h-100" noTilt>
            <Card.Body className="p-4 d-flex flex-column align-items-center justify-content-center h-100">

                <div className="text-center mb-3">
                    <h5 className="fw-800 mb-0">BMI Analysis</h5>
                    <p className="text-muted small">Diagnostic health metric</p>
                </div>

                {/* SVG GAUGE */}
                <div className="position-relative" style={{ width: size, height: size / 2 + 20 }}>
                    <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2}`}>
                        {/* Background Track */}
                        <path
                            d={`M ${strokeWidth / 2},${size / 2} a ${radius},${radius} 0 0,1 ${size - strokeWidth},0`}
                            fill="none"
                            stroke="rgba(0,0,0,0.05)"
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                        />
                        {/* Progress Path */}
                        <path
                            d={`M ${strokeWidth / 2},${size / 2} a ${radius},${radius} 0 0,1 ${size - strokeWidth},0`}
                            fill="none"
                            stroke={category.color}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            style={{
                                strokeDasharray: circumference,
                                strokeDashoffset: offset,
                                transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), stroke 0.5s ease'
                            }}
                        />
                    </svg>

                    {/* Central Value */}
                    <div className="position-absolute bottom-0 start-50 translate-middle-x text-center" style={{ marginBottom: '5px' }}>
                        <div className="display-4 fw-800 mb-0" style={{ color: category.color }}>
                            {bmi.toFixed(1)}
                        </div>
                        <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.6rem', letterSpacing: '1px' }}>
                            BMI Units
                        </div>
                    </div>
                </div>

                {/* Status indicator */}
                <div className="mt-4 text-center w-100">
                    <div
                        className="rounded-pill px-4 py-2 fw-bold shadow-sm d-inline-block"
                        style={{ backgroundColor: category.color, color: 'white', fontSize: '0.85rem' }}
                    >
                        {category.label.toUpperCase()}
                    </div>

                    <div className="mt-3 d-flex justify-content-center gap-4 text-center">
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.6rem' }}>NORMAL RANGE</div>
                            <div className="fw-bold small">18.5 - 25.0</div>
                        </div>
                    </div>
                </div>

            </Card.Body>
        </MotionCard>
    );
}
