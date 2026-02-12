import React from 'react';
import { Card } from 'react-bootstrap';
import MotionCard from '../animations/MotionCard';

export default function MetricCard({ title, value, unit, subtitle, color = 'primary', icon }) {
    return (
        <MotionCard className={`glass-card-${color} border-0`}>
            <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                    <Card.Title as="h6" className="text-uppercase opacity-75">{title}</Card.Title>
                    {icon}
                </div>
                <div className="d-flex align-items-baseline mt-3">
                    <span className="fw-bold" style={{ fontSize: '2.5rem' }}>{value}</span>
                    {unit && <span className="fs-5 ms-1">{unit}</span>}
                </div>
                {subtitle && (
                    <p className="mb-0 opacity-75">{subtitle}</p>
                )}
            </Card.Body>
        </MotionCard>
    );
}
