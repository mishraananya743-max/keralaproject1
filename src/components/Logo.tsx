interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = '', size = 48 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle with gradient */}
      <defs>
        <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f766e" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>
        <linearGradient id="truckBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
        <linearGradient id="truckCab" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="dustbin" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="trunk" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a16207" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <radialGradient id="window" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#bfdbfe" />
          <stop offset="100%" stopColor="#93c5fd" />
        </radialGradient>
      </defs>

      {/* Outer ring */}
      <circle cx="100" cy="100" r="96" fill="url(#logoBg)" />
      <circle cx="100" cy="100" r="96" fill="none" stroke="#fbbf24" strokeWidth="3" />

      {/* Left coconut tree */}
      <g transform="translate(8, 30)">
        {/* Trunk */}
        <path d="M18 120 Q16 90 20 60 Q22 40 24 30" stroke="url(#trunk)" strokeWidth="6" fill="none" strokeLinecap="round" />
        {/* Trunk segments */}
        <ellipse cx="19" cy="100" rx="4" ry="2" fill="#78350f" opacity="0.5" />
        <ellipse cx="20" cy="85" rx="4" ry="2" fill="#78350f" opacity="0.5" />
        <ellipse cx="21" cy="70" rx="4" ry="2" fill="#78350f" opacity="0.5" />
        <ellipse cx="22" cy="55" rx="3.5" ry="2" fill="#78350f" opacity="0.5" />
        {/* Coconuts */}
        <circle cx="18" cy="35" r="3" fill="#78350f" />
        <circle cx="26" cy="36" r="3" fill="#78350f" />
        {/* Palm leaves */}
        <g transform="translate(22, 30)">
          <path d="M0 0 Q-15 -5 -28 2 Q-20 -8 0 -3 Z" fill="#16a34a" />
          <path d="M0 0 Q-12 -12 -22 -18 Q-10 -18 2 -8 Z" fill="#22c55e" />
          <path d="M0 0 Q-5 -15 -8 -28 Q0 -18 4 -8 Z" fill="#16a34a" />
          <path d="M0 0 Q5 -15 8 -28 Q12 -16 6 -5 Z" fill="#22c55e" />
          <path d="M0 0 Q12 -12 22 -18 Q18 -5 2 -3 Z" fill="#16a34a" />
          <path d="M0 0 Q15 -5 28 2 Q20 -8 0 -3 Z" fill="#22c55e" />
        </g>
      </g>

      {/* Right coconut tree (mirror) */}
      <g transform="translate(142, 30) scale(-1, 1)">
        <path d="M18 120 Q16 90 20 60 Q22 40 24 30" stroke="url(#trunk)" strokeWidth="6" fill="none" strokeLinecap="round" />
        <ellipse cx="19" cy="100" rx="4" ry="2" fill="#78350f" opacity="0.5" />
        <ellipse cx="20" cy="85" rx="4" ry="2" fill="#78350f" opacity="0.5" />
        <ellipse cx="21" cy="70" rx="4" ry="2" fill="#78350f" opacity="0.5" />
        <ellipse cx="22" cy="55" rx="3.5" ry="2" fill="#78350f" opacity="0.5" />
        <circle cx="18" cy="35" r="3" fill="#78350f" />
        <circle cx="26" cy="36" r="3" fill="#78350f" />
        <g transform="translate(22, 30)">
          <path d="M0 0 Q-15 -5 -28 2 Q-20 -8 0 -3 Z" fill="#16a34a" />
          <path d="M0 0 Q-12 -12 -22 -18 Q-10 -18 2 -8 Z" fill="#22c55e" />
          <path d="M0 0 Q-5 -15 -8 -28 Q0 -18 4 -8 Z" fill="#16a34a" />
          <path d="M0 0 Q5 -15 8 -28 Q12 -16 6 -5 Z" fill="#22c55e" />
          <path d="M0 0 Q12 -12 22 -18 Q18 -5 2 -3 Z" fill="#16a34a" />
          <path d="M0 0 Q15 -5 28 2 Q20 -8 0 -3 Z" fill="#22c55e" />
        </g>
      </g>

      {/* Road */}
      <rect x="10" y="150" width="180" height="6" fill="#64748b" rx="3" />
      <line x1="20" y1="153" x2="40" y2="153" stroke="#fbbf24" strokeWidth="2" strokeDasharray="6 4" />
      <line x1="60" y1="153" x2="80" y2="153" stroke="#fbbf24" strokeWidth="2" strokeDasharray="6 4" />
      <line x1="100" y1="153" x2="120" y2="153" stroke="#fbbf24" strokeWidth="2" strokeDasharray="6 4" />
      <line x1="140" y1="153" x2="160" y2="153" stroke="#fbbf24" strokeWidth="2" strokeDasharray="6 4" />

      {/* Garbage Truck */}
      <g transform="translate(48, 75)">
        {/* Truck body (cargo compartment) */}
        <rect x="0" y="20" width="55" height="40" rx="4" fill="url(#truckBody)" />
        {/* Truck body details - panels */}
        <line x1="15" y1="22" x2="15" y2="58" stroke="#15803d" strokeWidth="1.5" />
        <line x1="30" y1="22" x2="30" y2="58" stroke="#15803d" strokeWidth="1.5" />
        <line x1="45" y1="22" x2="45" y2="58" stroke="#15803d" strokeWidth="1.5" />
        {/* Recycling symbol on truck body */}
        <g transform="translate(27, 35)">
          <circle cx="0" cy="0" r="7" fill="none" stroke="white" strokeWidth="1.5" opacity="0.8" />
          <path d="M-3 -3 L0 -5 L3 -3 M0 -5 L0 -1" stroke="white" strokeWidth="1.5" fill="none" opacity="0.8" />
          <path d="M-4 2 L-2 4 L1 3 M-2 4 L-3 1" stroke="white" strokeWidth="1.5" fill="none" opacity="0.8" />
          <path d="M4 2 L3 4 L0 4 M3 4 L4 1" stroke="white" strokeWidth="1.5" fill="none" opacity="0.8" />
        </g>

        {/* Truck cab */}
        <path d="M55 25 L55 60 L90 60 L90 38 L80 25 Z" fill="url(#truckCab)" />
        {/* Window */}
        <path d="M62 28 L78 28 L88 40 L62 40 Z" fill="url(#window)" />
        {/* Headlight */}
        <rect x="86" y="44" width="5" height="6" rx="1" fill="#fef08a" />
        {/* Bumper */}
        <rect x="55" y="58" width="38" height="4" rx="1" fill="#1e3a5f" />

        {/* Dustbin on top of truck (being collected) */}
        <g transform="translate(12, 2)">
          <path d="M0 6 L2 18 L18 18 L20 6 Z" fill="url(#dustbin)" />
          <rect x="-1" y="3" width="22" height="4" rx="1" fill="#1e40af" />
          <line x1="10" y1="1" x2="10" y2="3" stroke="#1e40af" strokeWidth="1.5" />
          <ellipse cx="10" cy="0" rx="3" ry="1.5" fill="#1e40af" />
          {/* Bin lines */}
          <line x1="6" y1="8" x2="6" y2="16" stroke="#1e40af" strokeWidth="0.5" opacity="0.5" />
          <line x1="14" y1="8" x2="14" y2="16" stroke="#1e40af" strokeWidth="0.5" opacity="0.5" />
        </g>

        {/* Wheels */}
        <circle cx="18" cy="62" r="8" fill="#1e293b" />
        <circle cx="18" cy="62" r="4" fill="#64748b" />
        <circle cx="18" cy="62" r="2" fill="#334155" />
        <circle cx="72" cy="62" r="8" fill="#1e293b" />
        <circle cx="72" cy="62" r="4" fill="#64748b" />
        <circle cx="72" cy="62" r="2" fill="#334155" />
      </g>

      {/* Kerala text */}
      <text x="100" y="185" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#fbbf24" fontFamily="sans-serif">
        SUCHITWA KERALA
      </text>
    </svg>
  );
}

export function LogoFull({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Logo size={48} />
      <div className="flex flex-col leading-tight">
        <span className="text-lg font-bold text-teal-800">Suchitwa Kerala</span>
        <span className="text-xs text-teal-600">Waste Management System</span>
      </div>
    </div>
  );
}
