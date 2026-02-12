import React from 'react';
import { Clock, Activity, Fire } from 'react-bootstrap-icons';
import MotionCard from '../animations/MotionCard';

export default function WorkoutCard({ workout, onClick }) {
    const difficultyColors = {
        easy: 'glass-card-success',
        medium: 'glass-card-warning',
        hard: 'glass-card-danger'
    };

    return (
        <MotionCard
            className={`cursor-pointer ${difficultyColors[workout.difficulty]}`}
            onClick={onClick}
        >
            <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                    <h5 className="card-title fw-bold mb-0">{workout.name}</h5>
                    <span className="badge bg-white bg-opacity-25 text-dark fw-normal border border-white border-opacity-25 text-capitalize">
                        {workout.difficulty}
                    </span>
                </div>
                <p className="card-text text-muted mb-4">{workout.description}</p>

                <div className="d-flex justify-content-between align-items-center text-muted small">
                    <div className="d-flex align-items-center">
                        <Clock className="me-2" />
                        {workout.duration}
                    </div>
                    <div className="d-flex align-items-center">
                        <Activity className="me-2" />
                        {workout.sets} sets
                    </div>
                    <div className="d-flex align-items-center">
                        <Fire className="me-2" />
                        {workout.calories}
                    </div>
                </div>
            </div>
        </MotionCard>
    );
}
