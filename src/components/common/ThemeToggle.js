import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from 'react-bootstrap';
import { MoonFill, SunFill } from 'react-bootstrap-icons';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className={`btn btn-${theme === 'light' ? 'light' : 'dark'} rounded-circle shadow-sm d-flex align-items-center justify-content-center border-0`}
            style={{ width: '40px', height: '40px' }}
        >
            <motion.div
                initial={false}
                animate={{ rotate: theme === 'light' ? 0 : 180 }}
                transition={{ duration: 0.3 }}
            >
                {theme === 'light' ? <MoonFill /> : <SunFill className="text-warning" />}
            </motion.div>
        </motion.button>
    );
}
