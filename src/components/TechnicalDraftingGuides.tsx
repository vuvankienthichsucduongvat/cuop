import React from 'react';
import { CREATURE_SPEC } from '../data/componentsData';

interface TechnicalDraftingGuidesProps {
  wingspan: string;
}

export const TechnicalDraftingGuides: React.FC<TechnicalDraftingGuidesProps> = ({
  wingspan,
}) => {
  const primaryStroke = 'rgba(30, 41, 59, 0.22)';
  const secondaryStroke = 'rgba(30, 41, 59, 0.08)';
  const textFill = '#64748b';

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0">
      {/* Top Left Aeronautical Drawing Header */}
      <div className="absolute top-22 md:top-24 left-6 md:left-10 font-mono-tech text-[10px] space-y-0.5" style={{ color: textFill }}>
        <p className="tracking-widest font-semibold opacity-90">ISO-128 / AEROSPACE DRAFTING</p>
        <p className="opacity-70">DESIGNATION: {CREATURE_SPEC.name.toUpperCase()}</p>
        <p className="opacity-70">PROJECTION: FIRST-ANGLE ORTHOGRAPHIC / 3D ISOMETRIC</p>
        <p className="opacity-70">TOLERANCE: CLASS MICRON (±0.001mm)</p>
      </div>

      {/* Top Right Specifications */}
      <div className="absolute top-22 md:top-24 right-6 md:right-10 text-right font-mono-tech text-[10px] space-y-0.5" style={{ color: textFill }}>
        <p className="tracking-widest font-semibold opacity-90">AERODYNAMIC GEOMETRY</p>
        <p className="opacity-70">WINGSPAN: {wingspan}</p>
        <p className="opacity-70">MASS: {CREATURE_SPEC.mass} · CADENCE: 5 HZ</p>
        <p className="opacity-70">ENERGY CORE: QUAD MAINSPRING</p>
      </div>

      {/* SVG Drafting Grid & Precision Reticle */}
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* Outer Corner brackets */}
        <g stroke={primaryStroke} strokeWidth="1" fill="none">
          <path d="M 24 75 L 24 24 L 75 24" />
          <path d="M calc(100% - 24px) 75 L calc(100% - 24px) 24 L calc(100% - 75px) 24" />
          <path d="M 24 calc(100% - 140px) L 24 calc(100% - 24px) L 75 calc(100% - 24px)" />
          <path d="M calc(100% - 24px) calc(100% - 140px) L calc(100% - 24px) calc(100% - 24px) L calc(100% - 75px) calc(100% - 24px)" />
        </g>

        {/* Central Fine Cross-hairs */}
        <g stroke={secondaryStroke} strokeWidth="0.75" strokeDasharray="4 4">
          <line x1="50%" y1="10%" x2="50%" y2="90%" />
          <line x1="10%" y1="50%" x2="90%" y2="50%" />
        </g>

        {/* Coordinate Center Cross-mark */}
        <g stroke={primaryStroke} strokeWidth="1" fill="none">
          <line x1="calc(50% - 20px)" y1="50%" x2="calc(50% + 20px)" y2="50%" />
          <line x1="50%" y1="calc(50% - 20px)" x2="50%" y2="calc(50% + 20px)" />
          <circle cx="50%" cy="50%" r="36" stroke={secondaryStroke} strokeWidth="0.75" />
          <circle cx="50%" cy="50%" r="140" stroke={secondaryStroke} strokeWidth="0.5" strokeDasharray="3 6" />
        </g>

        {/* Bottom Left Metric Scale Bar */}
        <g transform="translate(32, calc(100% - 60))">
          <line x1="0" y1="0" x2="120" y2="0" stroke={primaryStroke} strokeWidth="1.5" />
          <line x1="0" y1="-5" x2="0" y2="5" stroke={primaryStroke} strokeWidth="1.5" />
          <line x1="60" y1="-3" x2="60" y2="3" stroke={primaryStroke} strokeWidth="1" />
          <line x1="120" y1="-5" x2="120" y2="5" stroke={primaryStroke} strokeWidth="1.5" />
          <text x="0" y="16" fill={textFill} fontSize="9" fontFamily="monospace">0m</text>
          <text x="50" y="16" fill={textFill} fontSize="9" fontFamily="monospace">1.5m</text>
          <text x="110" y="16" fill={textFill} fontSize="9" fontFamily="monospace">3.0m</text>
        </g>
      </svg>
    </div>
  );
};
