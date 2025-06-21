import React, { useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

const HeroSection: React.FC<{ onStart: () => void; onHowItWorks: () => void }> = ({ onStart, onHowItWorks }) => {
  return (
    <section className="relative min-h-[70vh] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-500 to-purple-500 animate-gradient-move">
      {/* Animated SVG Blobs */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <svg width="100%" height="100%" className="absolute top-0 left-0 opacity-30 animate-blob-move" style={{zIndex:0}}>
          <defs>
            <radialGradient id="blobGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.2" />
            </radialGradient>
          </defs>
          <ellipse cx="60%" cy="40%" rx="320" ry="180" fill="url(#blobGradient)" />
          <ellipse cx="30%" cy="70%" rx="180" ry="120" fill="#f472b6" fillOpacity="0.15" />
        </svg>
      </div>
      {/* Mascot/Logo */}
      <div className="z-10 flex flex-col items-center">
        <Image src="/logo.png" alt="Fillable Logo" width={80} height={80} className="rounded-2xl shadow-lg mb-4 animate-float" />
        {/* Mascot SVG */}
        <div className="mb-2 animate-wave">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="24" fill="#fff" fillOpacity="0.7" />
            <ellipse cx="24" cy="30" rx="10" ry="4" fill="#a5b4fc" />
            <circle cx="18" cy="22" r="2" fill="#6366f1" />
            <circle cx="30" cy="22" r="2" fill="#6366f1" />
            <path d="M20 28c1.5 2 6.5 2 8 0" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-lg mb-3 animate-slide-up text-center">
          Fillable
        </h1>
        <p className="text-xl md:text-2xl font-medium text-white/90 mb-8 animate-fade-in text-center max-w-2xl">
          Instantly generate, manage, and share pre-filled forms. No more manual entry. No more errors.
        </p>
        <div className="flex gap-4 justify-center animate-fade-in">
          <Button size="lg" className="bg-white text-primary font-bold px-8 py-3 rounded-full shadow-lg hover:scale-105 transition-transform" onClick={onStart}>
            Start Prefilling
          </Button>
          <Button variant="outline" size="lg" className="border-white text-white px-8 py-3 rounded-full hover:bg-white/10" onClick={onHowItWorks}>
            See How It Works
          </Button>
        </div>
      </div>
      {/* Animations */}
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
      `}</style>
    </section>
  );
};

export default HeroSection; 