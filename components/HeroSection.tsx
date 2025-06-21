import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import UsageGuide from '@/components/UsageGuide';

const HeroSection: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  return (
    <section className="relative min-h-[80vh] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-700 via-blue-600 to-purple-700 animate-gradient-move">
      {/* Animated SVG Blobs - Parallax Layers */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <svg width="100%" height="100%" className="absolute top-0 left-0 opacity-30 animate-blob-move" style={{zIndex:0}}>
          <defs>
            <radialGradient id="blobGradient1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.2" />
            </radialGradient>
            <radialGradient id="blobGradient2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f472b6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f472b6" stopOpacity="0.1" />
            </radialGradient>
          </defs>
          <ellipse cx="60%" cy="40%" rx="340" ry="180" fill="url(#blobGradient1)" />
          <ellipse cx="30%" cy="70%" rx="200" ry="120" fill="url(#blobGradient2)" />
          <ellipse cx="80%" cy="80%" rx="120" ry="80" fill="#fff" fillOpacity="0.08" />
        </svg>
      </div>
      {/* Horizontal Flex Container */}
      <div className="z-10 flex flex-col md:flex-row items-center justify-center w-full max-w-5xl px-6 py-12 md:py-20 gap-10 md:gap-20">
        {/* Left: Mascot/Logo and Illustration */}
        <div className="flex flex-col items-center md:items-center justify-center flex-shrink-0 h-full md:h-auto md:justify-center">
          <Image src="/logo.png" alt="Fillable Logo" width={110} height={110} className="rounded-2xl shadow-lg mb-4 animate-float" />
          {/* Mascot SVG */}
          <div className="mb-2 animate-wave">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="30" cy="30" r="30" fill="#fff" fillOpacity="0.8" />
              <ellipse cx="30" cy="38" rx="14" ry="6" fill="#a5b4fc" />
              <circle cx="22" cy="28" r="3" fill="#6366f1" />
              <circle cx="38" cy="28" r="3" fill="#6366f1" />
              <path d="M25 36c2.5 3 10 3 12.5 0" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        {/* Right: Headline, Description, CTAs */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-xl">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-lg mb-4 animate-slide-up">
            Fillable
          </h1>
          <p className="text-lg md:text-2xl font-medium text-white/90 mb-8 animate-fade-in max-w-xl">
            Instantly generate, manage, and share pre-filled forms.<br className="hidden md:block" />
            <span className="text-white/80">No more manual entry. No more errors. Just seamless automation.</span>
          </p>
          <div className="flex gap-4 mb-6 animate-fade-in">
            <Button size="lg" className="bg-white text-primary font-bold px-8 py-3 rounded-full shadow-lg hover:scale-105 hover:shadow-xl transition-transform focus:ring-4 focus:ring-indigo-300 animate-cta-glow" onClick={onStart}>
              Start Prefilling
            </Button>
            {/* See How It Works button as UsageGuide large trigger */}
            <UsageGuide large />
          </div>
        </div>
      </div>
      {/* Animations & Styles */}
      <style jsx>{`
        .animate-gradient-move {
          background-size: 200% 200%;
          animation: gradientMove 8s ease-in-out infinite;
        }
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        .animate-wave {
          animation: wave 2.5s infinite linear;
          transform-origin: 70% 80%;
        }
        @keyframes wave {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
        .animate-slide-up {
          animation: slideUp 0.8s cubic-bezier(0.4,0,0.2,1) both;
        }
        @keyframes slideUp {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 1.2s cubic-bezier(0.4,0,0.2,1) both;
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .animate-blob-move {
          animation: blobMove 12s ease-in-out infinite alternate;
        }
        @keyframes blobMove {
          0% { transform: scale(1) translateY(0); }
          100% { transform: scale(1.1) translateY(20px); }
        }
        .animate-cta-glow {
          box-shadow: 0 0 0 0 rgba(99,102,241,0.7);
          animation: ctaGlow 2.5s infinite alternate;
        }
        @keyframes ctaGlow {
          0% { box-shadow: 0 0 0 0 rgba(99,102,241,0.7); }
          100% { box-shadow: 0 0 24px 8px rgba(99,102,241,0.25); }
        }
      `}</style>
    </section>
  );
};

export default HeroSection; 