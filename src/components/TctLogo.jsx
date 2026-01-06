import React from 'react';

const TctLogo = ({ className }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer Glow Effect */}
      <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full animate-pulse"></div>
      
      <svg 
        viewBox="0 0 100 100" 
        className="relative z-10 w-full h-full fill-none stroke-white"
        strokeWidth="2"
      >
        {/* The Pyramid/A Shape from your logo */}
        <path d="M10 80 L50 20 L90 80" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* The Eye Outline */}
        <path 
          d="M30 65 Q50 45 70 65 Q50 85 30 65" 
          stroke="white" 
          fill="black"
        />
        
        {/* The Pupil (The glowing green part) */}
        <circle cx="50" cy="65" r="8" className="fill-green-500 shadow-lg shadow-green-500">
          <animate 
            attributeName="r" 
            values="7;9;7" 
            dur="3s" 
            repeatCount="indefinite" 
          />
        </circle>
        
        {/* Inner Light Reflection */}
        <circle cx="48" cy="63" r="2" fill="white" opacity="0.6" />
      </svg>
    </div>
  );
};

export default TctLogo;