import React from 'react';
import { PieChart, Pie, Cell } from 'recharts';

const ProgressionRing = ({ percentage = 0, label, isPositive = true }) => {
  // We gebruiken hier harde kleuren om zeker te weten dat Recharts ze snapt
  const color = isPositive ? '#34C759' : '#FF3B30'; // Apple Groen of Rood
  const grayColor = '#E5E5EA'; // Apple Grijs

  // Veiligheidscheck: Zorg dat het getal tussen 0 en 100 blijft
  const safePercentage = Math.max(0, Math.min(100, percentage));
  
  const data = [
    { name: 'Score', value: safePercentage },
    { name: 'Rest', value: 100 - safePercentage }
  ];

  return (
    <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      
      {/* De Grafiek */}
      <PieChart width={140} height={140}>
        <Pie
          data={data}
          cx="50%"        // Precies in het midden
          cy="50%"
          innerRadius={45}
          outerRadius={60}
          startAngle={90}
          endAngle={-270} // Maakt de cirkel rond
          dataKey="value"
          stroke="none"   // Geen lelijke randjes
        >
          {/* De gekleurde balk */}
          <Cell fill={color} />
          {/* De grijze achtergrond balk */}
          <Cell fill={grayColor} />
        </Pie>
      </PieChart>

      {/* De Tekst in het midden */}
      <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1D1D1F' }}>
          {safePercentage}%
        </div>
        <div style={{ fontSize: '0.75rem', color: '#86868B', fontWeight: 600, marginTop: -2 }}>
          {label}
        </div>
      </div>
    </div>
  );
};

export default ProgressionRing;