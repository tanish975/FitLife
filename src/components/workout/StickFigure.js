import React from 'react';
import { motion } from 'framer-motion';

export default function StickFigure({ pose = 'standing', color = 'currentColor', size = 50 }) {
    // Simple SVG Stick Figures
    const strokes = {
        stroke: color,
        strokeWidth: "3",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        fill: "none"
    };

    const headCoords = { cx: "50", cy: "20", r: "8" };

    const variants = {
        standing: (
            <>
                <circle {...headCoords} {...strokes} />
                <path d="M50 28 L50 60" {...strokes} /> {/* Body */}
                <path d="M50 35 L20 45" {...strokes} /> {/* Left Arm */}
                <path d="M50 35 L80 45" {...strokes} /> {/* Right Arm */}
                <path d="M50 60 L35 90" {...strokes} /> {/* Left Leg */}
                <path d="M50 60 L65 90" {...strokes} /> {/* Right Leg */}
            </>
        ),
        run: (
            <>
                <circle cx="55" cy="20" r="8" {...strokes} />
                <path d="M55 28 L45 55" {...strokes} /> {/* Body */}
                <path d="M50 35 L25 40" {...strokes} /> {/* Left Arm Back */}
                <path d="M50 35 L75 30" {...strokes} /> {/* Right Arm Forward */}
                <path d="M45 55 L25 75 L20 65" {...strokes} /> {/* Left Leg Back */}
                <path d="M45 55 L65 70 L75 90" {...strokes} /> {/* Right Leg Forward */}
            </>
        ),
        squat: (
            <>
                <circle cx="50" cy="35" r="8" {...strokes} />
                <path d="M50 43 L40 65" {...strokes} /> {/* Body */}
                <path d="M45 48 L25 50" {...strokes} /> {/* Arms */}
                <path d="M45 48 L75 50" {...strokes} />
                <path d="M40 65 L25 80 L35 95" {...strokes} /> {/* Legs */}
                <path d="M40 65 L65 80 L55 95" {...strokes} />
            </>
        ),
        pushup: (
            <>
                <circle cx="85" cy="70" r="8" {...strokes} />
                <path d="M77 72 L40 75" {...strokes} /> {/* Body */}
                <path d="M70 73 L70 90 L85 90" {...strokes} /> {/* Arms */}
                <path d="M40 75 L15 85" {...strokes} /> {/* Legs */}
            </>
        ),
        plank: (
            <>
                <circle cx="85" cy="75" r="8" {...strokes} />
                <path d="M77 78 L30 82" {...strokes} /> {/* Body (flatter) */}
                <path d="M70 80 L75 95" {...strokes} /> {/* Arms */}
                <path d="M30 82 L10 90" {...strokes} /> {/* Legs */}
            </>
        ),
        jumping: (
            <>
                <circle cx="50" cy="20" r="8" {...strokes} />
                <path d="M50 28 L50 60" {...strokes} /> {/* Body */}
                <path d="M50 35 L20 20" {...strokes} /> {/* Left Arm Up */}
                <path d="M50 35 L80 20" {...strokes} /> {/* Right Arm Up */}
                <path d="M50 60 L20 85" {...strokes} /> {/* Left Leg Out */}
                <path d="M50 60 L80 85" {...strokes} /> {/* Right Leg Out */}
            </>
        ),
        situp: (
            <>
                <circle cx="30" cy="30" r="8" {...strokes} />
                <path d="M35 36 L60 60" {...strokes} /> {/* Body */}
                <path d="M35 40 L50 45" {...strokes} /> {/* Arms */}
                <path d="M60 60 L80 50 L90 80" {...strokes} /> {/* Legs */}
            </>
        ),
        stretch: (
            <>
                <circle cx="50" cy="30" r="8" {...strokes} />
                <path d="M50 38 L50 65" {...strokes} />
                <path d="M50 45 L20 30" {...strokes} />
                <path d="M50 45 L80 30" {...strokes} />
                <path d="M50 65 L30 90" {...strokes} />
                <path d="M50 65 L70 90" {...strokes} />
            </>
        ),
        lunge: (
            <>
                <circle cx="50" cy="20" r="8" {...strokes} />
                <path d="M50 28 L50 55" {...strokes} /> {/* Body */}
                <path d="M50 35 L30 45" {...strokes} /> {/* Arms */}
                <path d="M50 35 L70 45" {...strokes} />
                <path d="M50 55 L20 85" {...strokes} /> {/* Front Leg */}
                <path d="M50 55 L80 85" {...strokes} /> {/* Back Leg */}
                <path d="M20 85 L20 60" {...strokes} /> {/* Knee bend hint */}
            </>
        ),
        sitting: (
            <>
                <circle cx="50" cy="25" r="8" {...strokes} />
                <path d="M50 33 L50 60" {...strokes} /> {/* Body */}
                <path d="M50 40 L80 45" {...strokes} /> {/* Hands forward */}
                <path d="M50 60 L80 60" {...strokes} /> {/* Thighs */}
                <path d="M80 60 L80 90" {...strokes} /> {/* Legs down */}
            </>
        )
    };

    return (
        <motion.div
            className="bg-light rounded-circle shadow-sm d-flex align-items-center justify-content-center p-1"
            style={{ width: size, height: size, minWidth: size }}
            whileHover={{ scale: 1.1, rotate: 5 }}
        >
            <svg viewBox="0 0 100 100" width="100%" height="100%">
                {variants[pose] || variants.standing}
            </svg>
        </motion.div>
    );
}
