export function OFPPTLogo({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 540 260" 
      className={className} 
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Logo Officiel OFPPT"
    >
      {/* Diamonds - Institutional Colors and Alignment (Moved up slightly) */}
      <g stroke="none" transform="translate(0, -15)">
        {/* Green - Diamond 1 */}
        <path d="M70 100 L130 40 L190 100 L130 160 Z" fill="#00963f" />
        {/* Grey - Diamond 2 */}
        <path d="M165 100 L225 40 L285 100 L225 160 Z" fill="#929292" />
        {/* Blue - Diamond 3 */}
        <path d="M260 100 L320 40 L380 100 L320 160 Z" fill="#00508f" />
      </g>
      
      {/* OFPPT Text - Lowered for better breathing space */}
      <text 
        x="225" 
        y="235" 
        fontFamily="'Arial Black', 'Inter', sans-serif" 
        fontSize="115" 
        fill="#00508f" 
        fontWeight="900"
        letterSpacing="-5"
        textAnchor="middle"
      >
        OFPPT
      </text>
    </svg>
  );
}
