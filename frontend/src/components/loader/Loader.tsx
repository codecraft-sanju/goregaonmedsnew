import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="loader-wrapper">
      <div className="loader">
        <svg height={0} width={0} viewBox="0 0 64 64" className="absolute">
          <defs className="s-xJBuHA073rTt" xmlns="http://www.w3.org/2000/svg">
            {/* Emerald to Soft Green */}
            <linearGradient className="s-xJBuHA073rTt" gradientUnits="userSpaceOnUse" y2={2} x2={0} y1={62} x1={0} id="b">
              <stop className="s-xJBuHA073rTt" stopColor="#34D399" />
              <stop className="s-xJBuHA073rTt" stopColor="#10B981" offset={1} />
            </linearGradient>
            
            {/* Mint Green to Deep Emerald */}
            <linearGradient className="s-xJBuHA073rTt" gradientUnits="userSpaceOnUse" y2={0} x2={0} y1={64} x1={0} id="c">
              <stop className="s-xJBuHA073rTt" stopColor="#6EE7B7" />
              <stop className="s-xJBuHA073rTt" stopColor="#059669" offset={1} />
              <animateTransform repeatCount="indefinite" keySplines=".42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1" keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1" dur="8s" values="0 32 32;-270 32 32;-270 32 32;-540 32 32;-540 32 32;-810 32 32;-810 32 32;-1080 32 32;-1080 32 32" type="rotate" attributeName="gradientTransform" />
            </linearGradient>
            
            {/* Teal to Medical Cyan */}
            <linearGradient className="s-xJBuHA073rTt" gradientUnits="userSpaceOnUse" y2={2} x2={0} y1={62} x1={0} id="d">
              <stop className="s-xJBuHA073rTt" stopColor="#2DD4BF" />
              <stop className="s-xJBuHA073rTt" stopColor="#0D9488" offset={1} />
            </linearGradient>
          </defs>
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 64 64" height={64} width={64} className="inline-block">
          <path strokeLinejoin="round" strokeLinecap="round" strokeWidth={8} stroke="url(#b)" d="M 54.722656,3.9726563 A 2.0002,2.0002 0 0 0 54.941406,4 h 5.007813 C 58.955121,17.046124 49.099667,27.677057 36.121094,29.580078 a 2.0002,2.0002 0 0 0 -1.708985,1.978516 V 60 H 29.587891 V 31.558594 A 2.0002,2.0002 0 0 0 27.878906,29.580078 C 14.900333,27.677057 5.0448787,17.046124 4.0507812,4 H 9.28125 c 1.231666,11.63657 10.984383,20.554048 22.6875,20.734375 a 2.0002,2.0002 0 0 0 0.02344,0 c 11.806958,0.04283 21.70649,-9.003371 22.730469,-20.7617187 z" className="dash" id="y" pathLength={360} />
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" style={{ '--rotationDuration': '0ms', '--rotationDirection': 'normal' } as React.CSSProperties} viewBox="0 0 64 64" height={64} width={64} className="inline-block">
          <path strokeLinejoin="round" strokeLinecap="round" strokeWidth={10} stroke="url(#c)" d="M 32 32
        m 0 -27
        a 27 27 0 1 1 0 54
        a 27 27 0 1 1 0 -54" className="spin" id="o" pathLength={360} />
        </svg>
        <div className="w-2" />
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" style={{ '--rotationDuration': '0ms', '--rotationDirection': 'normal' } as React.CSSProperties} viewBox="0 0 64 64" height={64} width={64} className="inline-block">
          <path strokeLinejoin="round" strokeLinecap="round" strokeWidth={8} stroke="url(#d)" d="M 4,4 h 4.6230469 v 25.919922 c -0.00276,11.916203 9.8364941,21.550422 21.7500001,21.296875 11.616666,-0.240651 21.014356,-9.63894 21.253906,-21.25586 a 2.0002,2.0002 0 0 0 0,-0.04102 V 4 H 56.25 v 25.919922 c 0,14.33873 -11.581192,25.919922 -25.919922,25.919922 a 2.0002,2.0002 0 0 0 -0.0293,0 C 15.812309,56.052941 3.998433,44.409961 4,29.919922 Z" className="dash" id="u" pathLength={360} />
        </svg>
      </div>

      {/* Inline styles replace styled-components completely */}
      <style>{`
        .loader-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
          min-height: 200px;
        }

        .absolute {
          position: absolute;
        }

        .inline-block {
          display: inline-block;
        }

        .loader {
          display: flex;
          margin: 0.25em 0;
        }

        .w-2 {
          width: 0.5em;
        }

        .dash {
          animation: dashArray 2s ease-in-out infinite,
            dashOffset 2s linear infinite;
        }

        .spin {
          animation: spinDashArray 2s ease-in-out infinite,
            spin 8s ease-in-out infinite,
            dashOffset 2s linear infinite;
          transform-origin: center;
        }

        @keyframes dashArray {
          0% { stroke-dasharray: 0 1 359 0; }
          50% { stroke-dasharray: 0 359 1 0; }
          100% { stroke-dasharray: 359 1 0 0; }
        }

        @keyframes spinDashArray {
          0% { stroke-dasharray: 270 90; }
          50% { stroke-dasharray: 0 360; }
          100% { stroke-dasharray: 270 90; }
        }

        @keyframes dashOffset {
          0% { stroke-dashoffset: 365; }
          100% { stroke-dashoffset: 5; }
        }

        @keyframes spin {
          0% { rotate: 0deg; }
          12.5%, 25% { rotate: 270deg; }
          37.5%, 50% { rotate: 540deg; }
          62.5%, 75% { rotate: 810deg; }
          87.5%, 100% { rotate: 1080deg; }
        }
      `}</style>
    </div>
  );
};

export default Loader;