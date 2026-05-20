// Cute owl mascot — pure inline SVG, no external deps.
// Props: size (px), waving (bool), mood ('happy' | 'thinking' | 'sleepy')
export default function Mascot({ size = 120, waving = false, mood = 'happy' }) {
  const eyeAnim = { animation: 'blink 4s ease-in-out infinite', transformOrigin: 'center' }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label="School mascot owl"
      style={{ animation: 'bob 3.5s ease-in-out infinite' }}
    >
      <defs>
        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="bellyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>
        <radialGradient id="cheekGrad" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#FB7185" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FB7185" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Body */}
      <ellipse cx="100" cy="115" rx="62" ry="68" fill="url(#bodyGrad)" />
      {/* Belly */}
      <ellipse cx="100" cy="130" rx="38" ry="44" fill="url(#bellyGrad)" />

      {/* Ear tufts */}
      <path d="M52 62 L48 38 L72 56 Z" fill="#7C3AED" />
      <path d="M148 62 L152 38 L128 56 Z" fill="#7C3AED" />

      {/* Eye whites */}
      <circle cx="78" cy="92" r="20" fill="white" />
      <circle cx="122" cy="92" r="20" fill="white" />

      {/* Pupils (blink animation) */}
      <g style={eyeAnim}>
        <circle cx="78" cy="94" r="9" fill="#2A1D45" />
        <circle cx="122" cy="94" r="9" fill="#2A1D45" />
        {/* Eye sparkles */}
        <circle cx="81" cy="90" r="3" fill="white" />
        <circle cx="125" cy="90" r="3" fill="white" />
      </g>

      {/* Beak */}
      <path d="M95 112 L100 124 L105 112 Z" fill="#F59E0B" />

      {/* Cheeks */}
      <circle cx="62" cy="118" r="9" fill="url(#cheekGrad)" />
      <circle cx="138" cy="118" r="9" fill="url(#cheekGrad)" />

      {/* Feet */}
      <ellipse cx="82" cy="178" rx="10" ry="5" fill="#F59E0B" />
      <ellipse cx="118" cy="178" rx="10" ry="5" fill="#F59E0B" />

      {/* Wing (optional waving) */}
      <g
        style={
          waving
            ? { animation: 'wiggle 1.4s ease-in-out infinite', transformOrigin: '160px 120px' }
            : {}
        }
      >
        <ellipse cx="158" cy="125" rx="14" ry="22" fill="#6D28D9" />
      </g>
      <ellipse cx="42" cy="125" rx="14" ry="22" fill="#6D28D9" />

      {/* Graduation cap */}
      <g transform="translate(100, 30)">
        <rect x="-26" y="-4" width="52" height="6" fill="#2A1D45" rx="1" />
        <polygon points="-30,-4 30,-4 0,-20" fill="#2A1D45" />
        <circle cx="0" cy="-12" r="2.5" fill="#FBBF24" />
        <line x1="0" y1="-12" x2="22" y2="0" stroke="#FBBF24" strokeWidth="2" />
        <circle cx="22" cy="0" r="3" fill="#FBBF24" />
      </g>
    </svg>
  )
}
