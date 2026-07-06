interface MascotProps {
  size?: number;
  className?: string;
  /** Adds a gentle floating animation. */
  animated?: boolean;
}

/**
 * Original abstract "Professor Pokéball" mascot — a friendly pokéball-ish orb
 * wearing spectacles. No copyrighted characters; pure inline SVG.
 */
export function Mascot({ size = 160, className, animated = true }: MascotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label="The AI Professor mascot"
      style={animated ? { animation: 'float 4s ease-in-out infinite' } : undefined}
    >
      <defs>
        <radialGradient id="mascot-top" cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#ff8a86" />
          <stop offset="100%" stopColor="#ef5350" />
        </radialGradient>
        <radialGradient id="mascot-bot" cx="40%" cy="65%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e6ebf2" />
        </radialGradient>
        <linearGradient id="mascot-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* soft ground shadow */}
      <ellipse cx="100" cy="182" rx="52" ry="9" fill="#000" opacity="0.12" />

      {/* body */}
      <circle cx="100" cy="100" r="82" fill="url(#mascot-bot)" />
      <path d="M18 100a82 82 0 0 1 164 0z" fill="url(#mascot-top)" />
      <rect x="18" y="92" width="164" height="16" rx="8" fill="#1f2430" />

      {/* sparkle sheen */}
      <path d="M56 44a70 70 0 0 1 60-8 62 62 0 0 0-70 40z" fill="url(#mascot-sheen)" />

      {/* center button */}
      <circle cx="100" cy="100" r="26" fill="#ffffff" stroke="#1f2430" strokeWidth="9" />
      <circle cx="100" cy="100" r="11" fill="#f8fafc" stroke="#1f2430" strokeWidth="4" />

      {/* spectacles — the "professor" touch */}
      <g stroke="#1f2430" strokeWidth="5" fill="none" strokeLinecap="round">
        <circle cx="74" cy="72" r="16" fill="#ffffff" fillOpacity="0.9" />
        <circle cx="126" cy="72" r="16" fill="#ffffff" fillOpacity="0.9" />
        <path d="M90 72h20" />
        <path d="M58 68l-12-6M142 68l12-6" />
      </g>
      {/* friendly eyes */}
      <circle cx="74" cy="73" r="4" fill="#1f2430" />
      <circle cx="126" cy="73" r="4" fill="#1f2430" />

      {/* little sparkles */}
      <g fill="#f8d030">
        <path d="M160 40l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
        <path d="M36 132l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
      </g>
    </svg>
  );
}
