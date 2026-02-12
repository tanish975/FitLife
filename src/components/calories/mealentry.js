import React from 'react';
import { Trash, Clock, Fire } from 'react-bootstrap-icons';
import { motion } from 'framer-motion';

export default function MealEntry({ meal, onDelete }) {
    // Format creation time if available
    const time = meal.created_at ? new Date(meal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today';

    return (
        <motion.div
            whileHover={{ x: 5 }}
            className="p-3 rounded-4 bg-white bg-opacity-40 border border-white border-opacity-50 shadow-sm d-flex justify-content-between align-items-center transition-all mb-2"
        >
            <div className="d-flex align-items-center">
                {/* Food Icon / Circle */}
                <div
                    className="rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm"
                    style={{
                        width: '48px',
                        height: '48px',
                        background: 'linear-gradient(135deg, #ffffff, #f1f5f9)',
                        fontSize: '1.2rem'
                    }}
                >
                    🥗
                </div>

                <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                        <h6 className="fw-800 mb-0 text-dark">{meal.meal_name}</h6>
                        {meal.type && (
                            <span className="badge bg-primary bg-opacity-10 text-primary x-small fw-800 rounded-pill">
                                {meal.type.toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="d-flex align-items-center text-muted" style={{ fontSize: '0.75rem' }}>
                        <Clock size={12} className="me-1" />
                        {time}
                    </div>
                </div>
            </div>

            <div className="d-flex align-items-center gap-4">
                <div className="text-end">
                    <div className="h5 fw-800 mb-0 text-primary">
                        {meal.calories}
                        <span className="small fw-normal ms-1 text-muted" style={{ fontSize: '0.7rem' }}>KCAL</span>
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onDelete(meal.id)}
                    className="btn border-0 p-2 rounded-circle text-danger"
                    title="Remove entry"
                >
                    <Trash size={18} />
                </motion.button>
            </div>
        </motion.div>
    );
}
