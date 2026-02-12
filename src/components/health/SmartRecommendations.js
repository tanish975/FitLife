import React from 'react';
import { Card, Button } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lightbulb, MusicNoteBeamed, CupHot, Activity,
    Trophy, Bullseye, Wind, ListTask, HeartPulse, ShieldLock
} from 'react-bootstrap-icons';
import MotionCard from '../animations/MotionCard';

export default function SmartRecommendations({ mood }) {
    if (!mood) return null;

    const recommendations = {
        energetic: {
            title: "Crush a HIIT Workout!",
            text: "You're full of energy. Use it to burn maximum calories today.",
            icon: <Activity size={24} />,
            color: 'success',
            action: "Start HIIT"
        },
        determined: {
            title: "Beat Your Record",
            text: "You're in the zone. Try increasing weight or reps on your main lifts.",
            icon: <Trophy size={24} />,
            color: 'primary',
            action: "View PRs"
        },
        focused: {
            title: "Technique Workshop",
            text: "Great focus. Spend 15 minutes perfecting your squat or deadlift form.",
            icon: <Bullseye size={24} />,
            color: 'info',
            action: "Form Tips"
        },
        calm: {
            title: "Mindful Mobility",
            text: "Perfect state for a slow-paced mobility flow or yoga session.",
            icon: <Wind size={24} />,
            color: 'success',
            action: "View Yoga"
        },
        neutral: {
            title: "Steady Routine",
            text: "Standard day. Follow your programmed workout to maintain momentum.",
            icon: <ListTask size={24} />,
            color: 'primary',
            action: "My Plan"
        },
        tired: {
            title: "Active Recovery",
            text: "Low energy? A light 10-min walk will help your circulation without draining you.",
            icon: <MusicNoteBeamed size={24} />,
            color: 'info',
            action: "Light Walk"
        },
        lazy: {
            title: "The 5-Minute Rule",
            text: "Motivation is low. Just commit to 5 minutes of any movement.",
            icon: <Activity size={24} />,
            color: 'warning',
            action: "5min Power"
        },
        sore: {
            title: "Foam Roll & Stretch",
            text: "Muscle soreness detected. Focus on recovery and light stretching.",
            icon: <HeartPulse size={24} />,
            color: 'danger',
            action: "Recovery"
        },
        stressed: {
            title: "Decompression Walk",
            text: "High stress increases cortisol. A slow walk in nature or steady breathing is best.",
            icon: <CupHot size={24} />,
            color: 'warning',
            action: "Guided Breathe"
        },
        sick: {
            title: "Total Recovery",
            text: "Your body needs energy to heal. Skip the workout and double your water intake.",
            icon: <ShieldLock size={24} />,
            color: 'danger',
            action: "Health Log"
        },
        good: {
            title: "Hypertrophy session",
            text: "Good vibes detected. Perfect day for a standard strength training session.",
            icon: <Activity size={24} />,
            color: 'primary',
            action: "View Routine"
        }
    };

    const rec = recommendations[mood.id] || recommendations.good;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={mood.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
            >
                <MotionCard noTilt className={`border-${rec.color} border-2`}>
                    <Card.Body className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                            <div className={`bg-${rec.color} bg-opacity-10 p-3 rounded-circle me-3 text-${rec.color}`}>
                                {rec.icon}
                            </div>
                            <div>
                                <h6 className="fw-bold mb-1 d-flex align-items-center">
                                    <Lightbulb className="text-warning me-2" size={16} />
                                    Smart Coach Suggestion
                                </h6>
                                <h5 className={`mb-1 fw-bold text-${rec.color}`}>{rec.title}</h5>
                                <p className="mb-0 text-muted small">{rec.text}</p>
                            </div>
                        </div>
                        <Button variant={`outline-${rec.color}`} className="rounded-pill fw-bold" size="sm">
                            {rec.action}
                        </Button>
                    </Card.Body>
                </MotionCard>
            </motion.div>
        </AnimatePresence>
    );
}
