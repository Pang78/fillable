import React, { useRef } from 'react';

interface MascotProps {
  size?: number;
  animateOnLoad?: boolean;
  animateOnHover?: boolean;
  className?: string;
  logoSrc?: string;
}

const Mascot: React.FC<MascotProps> = ({ size = 80, animateOnLoad = true, animateOnHover = true, className = '', logoSrc }) => {
  // For blinking animation
  const eyeRef = useRef<SVGRectElement>(null);

  return (
    <span
      className={`inline-block ${className}`}
      aria-label="Fillable mascot, a friendly waving character with a pen"
      tabIndex={-1}
      style={{ textAlign: 'center' }}
    >
      {logoSrc && (
        <img
          src={logoSrc}
          alt="Fillable Logo"
          style={{ width: size * 0.55, height: size * 0.55, margin: '0 auto 0.5rem auto', display: 'block', borderRadius: 16, boxShadow: '0 2px 12px rgba(99,102,241,0.10)' }}
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`mascot-svg ${animateOnLoad ? 'mascot-wave-onload' : ''} ${animateOnHover ? 'mascot-wave-hover' : ''}`}
        style={{ display: 'block' }}
      >
        {/* Face background */}
        <circle cx="40" cy="40" r="36" fill="#fff" fillOpacity="0.95" stroke="#a5b4fc" strokeWidth="2" />
        {/* Left arm (waving, holding pen) */}
        <g className="mascot-arm">
          <path
            d="M12 38 Q2 28 18 22"
            stroke="#6366f1"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          {/* Pen (animated) */}
          <g className="mascot-pen">
            {/* Pen body */}
            <rect x="6" y="19" width="14" height="4" rx="2" fill="#6366f1" transform="rotate(-25 6 19)" />
            {/* Pen tip */}
            <polygon points="18,18 22,20 18,22" fill="#fbbf24" className="mascot-pen-tip" />
            {/* Pen tip glow */}
            <circle cx="20" cy="20" r="3" fill="#fde68a" fillOpacity="0.7" className="mascot-pen-glow" />
          </g>
        </g>
        {/* Body shadow */}
        <ellipse cx="40" cy="68" rx="18" ry="6" fill="#a5b4fc" fillOpacity="0.18" />
        {/* Eyes */}
        <ellipse cx="30" cy="38" rx="3" ry="4" fill="#6366f1" className="mascot-eye mascot-eye-left" />
        <ellipse cx="50" cy="38" rx="3" ry="4" fill="#6366f1" className="mascot-eye mascot-eye-right" />
        {/* Blinking eyelids */}
        <rect
          ref={eyeRef}
          x="27"
          y="38"
          width="6"
          height="0.1"
          fill="#fff"
          className="mascot-eyelid mascot-eyelid-left"
        />
        <rect
          x="47"
          y="38"
          width="6"
          height="0.1"
          fill="#fff"
          className="mascot-eyelid mascot-eyelid-right"
        />
        {/* Smile */}
        <path
          d="M32 50 Q40 58 48 50"
          stroke="#6366f1"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        {/* Raised right hand (static) */}
        <path
          d="M68 38 Q78 28 62 22"
          stroke="#6366f1"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <style jsx>{`
        .mascot-arm {
          transform-origin: 18px 22px;
          transition: transform 0.3s;
        }
        .mascot-wave-onload {
          animation: mascot-wave 1.2s 0.2s 1 cubic-bezier(0.4,0,0.2,1);
        }
        .mascot-wave-hover:hover .mascot-arm {
          animation: mascot-wave 1s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes mascot-wave {
          0% { transform: rotate(0deg); }
          20% { transform: rotate(-18deg); }
          40% { transform: rotate(12deg); }
          60% { transform: rotate(-12deg); }
          80% { transform: rotate(8deg); }
          100% { transform: rotate(0deg); }
        }
        .mascot-eye {
          transition: all 0.2s;
        }
        .mascot-eyelid {
          animation: mascot-blink 4s infinite;
          transform-origin: center top;
        }
        .mascot-eyelid-left {
          animation-delay: 0s;
        }
        .mascot-eyelid-right {
          animation-delay: 0.2s;
        }
        @keyframes mascot-blink {
          0%, 92% { height: 0.1px; }
          94%, 96% { height: 8px; }
          98%, 100% { height: 0.1px; }
        }
        /* Pen wiggle */
        .mascot-pen {
          transform-origin: 18px 22px;
          animation: mascot-pen-wiggle 2.5s infinite;
        }
        @keyframes mascot-pen-wiggle {
          0%, 90%, 100% { transform: rotate(0deg); }
          92% { transform: rotate(-10deg); }
          94% { transform: rotate(8deg); }
          96% { transform: rotate(-6deg); }
          98% { transform: rotate(0deg); }
        }
        .mascot-pen-tip {
          filter: drop-shadow(0 0 4px #fde68a);
        }
        .mascot-pen-glow {
          opacity: 0.7;
          animation: mascot-pen-glow 2.5s infinite;
        }
        @keyframes mascot-pen-glow {
          0%, 90%, 100% { opacity: 0.7; r: 3px; }
          95% { opacity: 1; r: 5px; }
        }
      `}</style>
    </span>
  );
};

export default Mascot; 