import React, { useState } from 'react';
import { Card, Button } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import MotionCard from '../animations/MotionCard';
import {
    EmojiSmile, EmojiFrown, EmojiNeutral, LightningFill, BatteryHalf,
    ThermometerHalf, Bullseye, Award, Bicycle, PersonWalking, Wind
} from 'react-bootstrap-icons';

export default function MoodTracker({ onMoodChange }) {
    const [selectedMood, setSelectedMood] = useState(null);

    const moods = [
        { id: 'energetic', icon: <LightningFill color="#ffc107" />, label: 'Energetic', message: "High power mode! Crush your goals today." },
        { id: 'good', icon: <EmojiSmile color="#198754" />, label: 'Good', message: "Positive energy detected. Keep it up!" },
        { id: 'determined', icon: <Award color="#6366f1" />, label: 'Driven', message: "Determination is half the battle. Go get it!" },
        { id: 'focused', icon: <Bullseye color="#0d6efd" />, label: 'Focused', message: "Perfect headspace for technique work." },
        { id: 'calm', icon: <Wind color="#20c997" />, label: 'Calm', message: "Great time for mobility and breathing." },
        { id: 'neutral', icon: <EmojiNeutral color="#6c757d" />, label: 'Neutral', message: "Steady as she goes. Stick to the plan." },
        { id: 'tired', icon: <BatteryHalf color="#fd7e14" />, label: 'Tired', message: "Low battery? Listen to your body today." },
        { id: 'lazy', icon: <Bicycle color="#6f42c1" />, label: 'Lazy', message: "Motivation low? Just start with 5 minutes." },
        { id: 'sore', icon: <PersonWalking color="#d63384" />, label: 'Sore', message: "Muscles recovering. Focus on active rest." },
        { id: 'stressed', icon: <EmojiFrown color="#dc3545" />, label: 'Stressed', message: "Breathe. High cortisol needs low intensity." },
        { id: 'sick', icon: <ThermometerHalf color="#a82222" />, label: 'Sick', message: "System shutdown. Prioritize total rest." },
    ];

    const handleMoodSelect = (mood) => {
        setSelectedMood(mood);
        if (onMoodChange) onMoodChange(mood);
    };

    const clearMood = () => {
        setSelectedMood(null);
        if (onMoodChange) onMoodChange(null);
    };

    return (
        <MotionCard noTilt className="h-100 border-0 shadow-sm" style={{ minHeight: '200px' }}>
            <Card.Body className="d-flex flex-column justify-content-center text-center p-4">
                <AnimatePresence mode="wait">
                    {!selectedMood ? (
                        <motion.div
                            key="selection"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <h6 className="fw-bold mb-3">How do you feel today?</h6>
                            <div className="d-flex justify-content-center gap-3 flex-wrap">
                                {moods.map((mood) => (
                                    <motion.button
                                        key={mood.id}
                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => handleMoodSelect(mood)}
                                        className="btn btn-light rounded-circle shadow-sm p-0 d-flex align-items-center justify-content-center"
                                        style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}
                                    >
                                        {mood.icon}
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="d-flex flex-column align-items-center"
                        >
                            <div className="mb-2" style={{ fontSize: '3rem' }}>
                                {selectedMood.icon}
                            </div>
                            <h5 className="fw-bold">{selectedMood.label}</h5>
                            <p className="text-muted small mb-3">{selectedMood.message}</p>
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                className="rounded-pill px-3"
                                onClick={clearMood}
                            >
                                Change
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card.Body>
        </MotionCard>
    );
}
