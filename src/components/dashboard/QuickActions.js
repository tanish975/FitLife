import React from 'react';
import { Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { EggFried, Speedometer2, EmojiSmile } from 'react-bootstrap-icons';
import { createPageUrl } from 'utils';
import { motion } from 'framer-motion';

export default function QuickActions() {
    const actions = [
        { icon: Speedometer2, label: 'Workout', link: 'Workouts', color: 'btn-primary' },
        { icon: EggFried, label: 'Log Meal', link: 'Calories', color: 'btn-outline-primary' },
        { icon: EmojiSmile, label: 'Mood', link: 'Dashboard', color: 'btn-light text-primary' }, // Link to dashboard anchor? For now just visual group
    ];

    return (
        <div className="d-flex gap-2">
            {actions.map((action, idx) => (
                <motion.div key={idx} whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}>
                    <Button
                        as={Link}
                        to={createPageUrl(action.link)}
                        className={`d-inline-flex align-items-center shadow-sm ${action.color}`}
                        style={{ borderRadius: '12px' }}
                    >
                        <action.icon className="me-2" />
                        <span className="d-none d-md-inline">{action.label}</span>
                    </Button>
                </motion.div>
            ))}
        </div>
    );
}
