import React from 'react';
import { FitLifeLogo } from './FitLifeLogo';

/** A small, original kettlebell illustration with a gentle lifting rep. */
export const FitnessLoader: React.FC = () => (
  <div className="fitlife-splash" role="status" aria-label="Opening FitLife">
    <div className="splash-logo"><FitLifeLogo /></div>
    <div className="splash-wordmark">fitlife<span>.</span></div>
    <span>MOVE WITH PURPOSE.</span>
    <div className="lift-loader-stage" aria-hidden="true">
      <svg viewBox="0 0 152 104" className="kettlebell-art" focusable="false">
        <circle className="lift-halo" cx="76" cy="50" r="39" />
        <path className="lift-floor" d="M42 91 H110" />
        <ellipse className="lift-shadow" cx="76" cy="87" rx="23" ry="3" />
        <g className="kettlebell-lift">
          <path className="kettlebell-handle" d="M62 43 V33 C62 24 67 19 76 19 C85 19 90 24 90 33 V43" />
          <path className="kettlebell-body" d="M60 38 C53 42 48 52 48 63 V67 C48 79 57 85 68 85 H84 C95 85 104 79 104 67 V63 C104 52 99 42 92 38 Z" />
          <path className="kettlebell-highlight" d="M60 52 C57 57 56 63 57 69" />
          <path className="kettlebell-detail" d="M70 73 V60 H80 M70 66 H77" />
        </g>
      </svg>
    </div>
    <p className="splash-loading-label">Getting FitLife ready<span className="loading-dots" aria-hidden="true"><i /><i /><i /></span></p>
  </div>
);
