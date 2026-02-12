import React from 'react';
import { motion } from 'framer-motion';

const pageVariants = {
    initial: {
        opacity: 0,
        y: 20,
        filter: "blur(10px)",
        scale: 0.98
    },
    in: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        scale: 1
    },
    out: {
        opacity: 0,
        y: -20,
        filter: "blur(10px)",
        scale: 1.02
    }
};

const pageTransition = {
    type: 'tween',
    ease: [0.4, 0, 0.2, 1], // material design cubic bezier
    duration: 0.5
};

const PageTransition = ({ children }) => {
    return (
        <motion.div
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            style={{ width: '100%', height: '100%' }}
        >
            {children}
        </motion.div>
    );
};

export default PageTransition;
