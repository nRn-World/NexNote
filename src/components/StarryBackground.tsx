import React from 'react';

const generateStars = (n: number) => {
  let value = `${Math.floor(Math.random() * 2000)}px ${Math.floor(Math.random() * 2000)}px #FFF`;
  for (let i = 2; i <= n; i++) {
    value += `, ${Math.floor(Math.random() * 2000)}px ${Math.floor(Math.random() * 2000)}px #FFF`;
  }
  return value;
};

export default function StarryBackground() {
  const shadowsSmall = React.useMemo(() => generateStars(700), []);
  const shadowsMedium = React.useMemo(() => generateStars(200), []);
  const shadowsBig = React.useMemo(() => generateStars(100), []);

  return (
    <div className="fixed inset-0 z-0 bg-[#090A0F] overflow-hidden pointer-events-none">
      <style>{`
        #stars {
          width: 1px;
          height: 1px;
          background: transparent;
          box-shadow: ${shadowsSmall};
          animation: animStar 50s linear infinite;
        }
        #stars:after {
          content: " ";
          position: absolute;
          top: 2000px;
          width: 1px;
          height: 1px;
          background: transparent;
          box-shadow: ${shadowsSmall};
        }
        
        #stars2 {
          width: 2px;
          height: 2px;
          background: transparent;
          box-shadow: ${shadowsMedium};
          animation: animStar 100s linear infinite;
        }
        #stars2:after {
          content: " ";
          position: absolute;
          top: 2000px;
          width: 2px;
          height: 2px;
          background: transparent;
          box-shadow: ${shadowsMedium};
        }
        
        #stars3 {
          width: 3px;
          height: 3px;
          background: transparent;
          box-shadow: ${shadowsBig};
          animation: animStar 150s linear infinite;
        }
        #stars3:after {
          content: " ";
          position: absolute;
          top: 2000px;
          width: 3px;
          height: 3px;
          background: transparent;
          box-shadow: ${shadowsBig};
        }
        
        @keyframes animStar {
          from { transform: translateY(0px); }
          to { transform: translateY(-2000px); }
        }
      `}</style>
      <div id="stars"></div>
      <div id="stars2"></div>
      <div id="stars3"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#1B2735] to-[#090A0F] opacity-50" />
    </div>
  );
}
