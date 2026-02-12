import React from 'react';

const CircularProgress = ({ size = 120, strokeWidth = 10, percentage, color }) => {
    const viewBox = `0 0 ${size} ${size}`;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <svg
            width={size}
            height={size}
            viewBox={viewBox}
        >
            <circle
                className="circle-background"
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={`${strokeWidth}px`}
            />
            <circle
                className="circle-progress"
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={`${strokeWidth}px`}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{
                    strokeDasharray: circumference,
                    strokeDashoffset,
                    stroke: color,
                }}
            />
            <text
                className="circle-text"
                x="50%"
                y="50%"
                dy=".3em"
                textAnchor="middle"
            >
                {`${percentage}%`}
            </text>
        </svg>
    );
};

export default CircularProgress;
