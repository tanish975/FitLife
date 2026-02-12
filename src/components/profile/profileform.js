import React from 'react';
import { Person, Calendar, Rulers, Speedometer2, GenderAmbiguous, CheckCircle, Bullseye } from 'react-bootstrap-icons';
import { motion } from 'framer-motion';

export default function ProfileForm({ profile, onChange, onSubmit, isLoading }) {
    const goals = [
        { id: 'lose', label: 'Lose Weight', icon: '🔥' },
        { id: 'maintain', label: 'Maintain', icon: '⚖️' },
        { id: 'gain', label: 'Build Muscle', icon: '💪' }
    ];

    return (
        <form onSubmit={onSubmit} className="p-4 h-100">
            <div className="mb-4">
                <h3 className="fw-800 mb-1">Update Vitals</h3>
                <p className="text-muted small">Your data is used to personalize AI coaching.</p>
            </div>

            <div className="row g-4">
                {/* Full Name */}
                <div className="col-12">
                    <label className="form-label text-muted small fw-bold text-uppercase tracking-wider">Full Name</label>
                    <div className="input-group">
                        <span className="input-group-text bg-white bg-opacity-40 border-0 text-primary rounded-start-3"><Person size={18} /></span>
                        <input
                            type="text"
                            className="form-control form-control-lg bg-white bg-opacity-40 border-0 rounded-end-3"
                            placeholder="Your Name"
                            value={profile.full_name || ''}
                            onChange={(e) => onChange({ ...profile, full_name: e.target.value })}
                        />
                    </div>
                </div>

                {/* Age & Gender Row */}
                <div className="col-md-6">
                    <label className="form-label text-muted small fw-bold text-uppercase tracking-wider">Age</label>
                    <div className="input-group">
                        <span className="input-group-text bg-white bg-opacity-40 border-0 text-muted rounded-start-3"><Calendar size={18} /></span>
                        <input
                            type="number"
                            className="form-control form-control-lg bg-white bg-opacity-40 border-0 rounded-end-3"
                            placeholder="Years"
                            value={profile.age || ''}
                            onChange={(e) => onChange({ ...profile, age: parseInt(e.target.value) || '' })}
                        />
                    </div>
                </div>

                <div className="col-md-6">
                    <label className="form-label text-muted small fw-bold text-uppercase tracking-wider">Gender</label>
                    <div className="input-group">
                        <span className="input-group-text bg-white bg-opacity-40 border-0 text-muted rounded-start-3"><GenderAmbiguous size={18} /></span>
                        <select
                            className="form-select form-select-lg bg-white bg-opacity-40 border-0 rounded-end-3"
                            value={profile.gender || ''}
                            onChange={(e) => onChange({ ...profile, gender: e.target.value })}
                        >
                            <option value="">Select...</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>
                </div>

                {/* Height & Weight Row */}
                <div className="col-md-6">
                    <label className="form-label text-muted small fw-bold text-uppercase tracking-wider">Height</label>
                    <div className="input-group">
                        <span className="input-group-text bg-white bg-opacity-40 border-0 text-muted rounded-start-3"><Rulers size={18} /></span>
                        <input
                            type="number"
                            className="form-control form-control-lg bg-white bg-opacity-40 border-0"
                            placeholder="cm"
                            value={profile.height || ''}
                            onChange={(e) => onChange({ ...profile, height: parseInt(e.target.value) || '' })}
                        />
                        <span className="input-group-text bg-white bg-opacity-40 border-0 text-muted small rounded-end-3">cm</span>
                    </div>
                </div>

                <div className="col-md-6">
                    <label className="form-label text-muted small fw-bold text-uppercase tracking-wider">Weight</label>
                    <div className="input-group">
                        <span className="input-group-text bg-white bg-opacity-40 border-0 text-muted rounded-start-3"><Speedometer2 size={18} /></span>
                        <input
                            type="number"
                            className="form-control form-control-lg bg-white bg-opacity-40 border-0"
                            placeholder="kg"
                            value={profile.weight || ''}
                            onChange={(e) => onChange({ ...profile, weight: parseInt(e.target.value) || '' })}
                        />
                        <span className="input-group-text bg-white bg-opacity-40 border-0 text-muted small rounded-end-3">kg</span>
                    </div>
                </div>

                {/* Goal Selection */}
                <div className="col-12">
                    <label className="form-label text-muted small fw-bold text-uppercase tracking-wider d-flex align-items-center">
                        <Bullseye size={16} className="me-2 text-primary" /> Fitness Goal
                    </label>
                    <div className="row g-2">
                        {goals.map(goal => (
                            <div key={goal.id} className="col-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="button"
                                    className={`btn w-100 py-3 d-flex flex-column align-items-center justify-content-center rounded-4 transition-all ${profile.goal === goal.id ? 'btn-primary shadow-lg border-0' : 'bg-white bg-opacity-30 border border-white border-opacity-40 text-muted'}`}
                                    onClick={() => onChange({ ...profile, goal: goal.id })}
                                >
                                    <span style={{ fontSize: '1.2rem' }}>{goal.icon}</span>
                                    <span className="small fw-bold mt-1" style={{ fontSize: '0.65rem' }}>{goal.label}</span>
                                </motion.button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-5">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary w-100 py-3 fw-800 d-flex align-items-center justify-content-center rounded-pill shadow-lg"
                >
                    {isLoading ? (
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    ) : (
                        <CheckCircle size={20} className="me-2" />
                    )}
                    {isLoading ? 'Processing...' : 'Save Health Profile'}
                </button>
            </div>
        </form>
    );
}
