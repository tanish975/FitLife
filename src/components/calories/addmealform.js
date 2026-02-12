import React, { useState } from 'react';
import { Plus, Fire, Trash } from 'react-bootstrap-icons';
import { motion } from 'framer-motion';

export default function AddMealForm({ onAdd, isLoading }) {
    const [mealName, setMealName] = useState('');
    const [calories, setCalories] = useState('');
    const [mealType, setMealType] = useState('Breakfast');

    const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!mealName || !calories) return;

        await onAdd({
            meal_name: mealName,
            calories: parseInt(calories),
            type: mealType
        });
        setMealName('');
        setCalories('');
    };

    return (
        <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-5">
                <label className="form-label text-muted small fw-800 text-uppercase tracking-wider">Meal Description</label>
                <div className="input-group">
                    <span className="input-group-text bg-white bg-opacity-40 border-0 text-primary rounded-start-4">
                        <Plus size={20} />
                    </span>
                    <input
                        type="text"
                        className="form-control form-control-lg bg-white bg-opacity-40 border-0 rounded-end-4"
                        placeholder="e.g., Avocado Toast"
                        value={mealName}
                        onChange={(e) => setMealName(e.target.value)}
                        required
                    />
                </div>
            </div>

            <div className="col-md-3">
                <label className="form-label text-muted small fw-800 text-uppercase tracking-wider">Meal Type</label>
                <select
                    className="form-select form-select-lg bg-white bg-opacity-40 border-0 rounded-4"
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                >
                    {mealTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
            </div>

            <div className="col-md-2">
                <label className="form-label text-muted small fw-800 text-uppercase tracking-wider">Calories</label>
                <div className="input-group">
                    <span className="input-group-text bg-white bg-opacity-40 border-0 text-warning rounded-start-4">
                        <Fire size={18} />
                    </span>
                    <input
                        type="number"
                        className="form-control form-control-lg bg-white bg-opacity-40 border-0"
                        placeholder="0"
                        value={calories}
                        onChange={(e) => setCalories(e.target.value)}
                        required
                    />
                    <span className="input-group-text bg-white bg-opacity-40 border-0 text-muted small rounded-end-4">kcal</span>
                </div>
            </div>

            <div className="col-md-2 d-flex align-items-end">
                <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading || !mealName || !calories}
                    className="btn btn-primary w-100 py-3 fw-800 d-flex justify-content-center align-items-center rounded-4 shadow-lg border-0"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
                >
                    {isLoading ? (
                        <div className="spinner-border spinner-border-sm" role="status"></div>
                    ) : (
                        <Plus size={24} />
                    )}
                </motion.button>
            </div>
        </form>
    );
}
