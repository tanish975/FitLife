import React from 'react';
import { motion } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import { itemVariants } from './StaggerContainer';

const MotionCard = ({ children, className = '', noTilt = false, onClick }) => {
    // Base card content with Framer Motion
    const CardContent = (
        <motion.div
            variants={itemVariants}
            className={`glass-panel ${className}`} // Removed p-4 to let usage decide padding, default kept in glass-panel if needed or passed
            whileHover={{ y: -5 }} // Simple lift if tilt is disabled
            onClick={onClick}
        >
            {children}
        </motion.div>
    );

    // If tilt is disabled, just return the motion div
    if (noTilt) return CardContent;

    // Otherwise wrap in Tilt
    return (
        <Tilt
            tiltMaxAngleX={3}
            tiltMaxAngleY={3}
            perspective={1000}
            scale={1.02}
            transitionSpeed={1000}
            gyroscope={true}
            className={`h-100 ${className ? '' : ''}`} // Pass classes if needed, but usually applied to inner div
            style={{ transformStyle: "preserve-3d" }}
        >
            <motion.div
                variants={itemVariants}
                className={`glass-panel h-100 ${className}`}
                style={{ transform: "translateZ(20px)" }} // Pop effect
                onClick={onClick}
            >
                {children}
            </motion.div>
        </Tilt>
    );
};


export default MotionCard;
