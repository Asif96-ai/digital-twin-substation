import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Cylinder, Text, Html } from '@react-three/drei';

const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0]?.includes?.('THREE.Clock') || 
      (args[0]?.includes?.('Clock') && args[0]?.includes?.('deprecated'))) {
    return;
  }
  originalWarn(...args);
};

const Transformer = ({ position, data, isAnomaly }) => {
  const meshRef = useRef();
  const [hovered, setHover] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
    }
  });

  const color = isAnomaly ? '#e53e3e' : hovered ? '#4299e1' : '#48bb78';
  const glowIntensity = isAnomaly ? 0.5 : 0.1;

  return (
    <group 
      position={position}
      onPointerOver={() => { setHover(true); setShowInfo(true); }}
      onPointerOut={() => { setHover(false); setShowInfo(false); }}
    >
      <Box ref={meshRef} args={[1.5, 1.5, 1.5]}>
        <meshStandardMaterial 
          color={color} 
          metalness={0.3} 
          roughness={0.6}
          emissive={isAnomaly ? '#e53e3e' : '#48bb78'}
          emissiveIntensity={glowIntensity}
        />
      </Box>
      <Cylinder args={[0.8, 0.8, 0.3]} position={[0, 1, 0]} color="#a0aec0" />
      <Cylinder args={[0.3, 0.3, 0.5]} position={[0, -1.1, 0]} color="#718096" />
      
      {data && (
        <Text position={[0, -1.8, 0]} fontSize={0.25} color="white" anchorX="center" anchorY="middle" fillOpacity={0.8}>
          {data.id}
        </Text>
      )}
      
      {showInfo && data && (
        <Html distanceFactor={10}>
          <div className="tooltip-3d">
            <strong>{data.id}</strong>
            <div>Load: {Math.round(data.load || 0)}%</div>
            <div>Temp: {Math.round(data.temperature || 0)}°C</div>
            <div>Voltage: {data.voltage || 0} kV</div>
            <div>Current: {data.current || 0} A</div>
            <div>AI Score: {((data.aiPrediction?.anomalyScore || 0) * 100).toFixed(0)}%</div>
          </div>
        </Html>
      )}
    </group>
  );
};

const Busbar = ({ position }) => (
  <Box args={[4, 0.15, 0.15]} position={position} color="#ed8936">
    <meshStandardMaterial emissive="#ed8936" emissiveIntensity={0.3} />
  </Box>
);

const FeederLine = ({ startPos, endPos, current }) => {
  const points = [
    [startPos[0], startPos[1], startPos[2]],
    [endPos[0], endPos[1], endPos[2]]
  ];
  return (
    <line>
      <bufferGeometry>
        <float32BufferAttribute attach="attributes-position" args={[points.flat(), 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={current > 60 ? '#f6ad55' : '#68d391'} linewidth={2} />
    </line>
  );
};

const Substation3D = ({ data }) => {
  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#a0aec0' }}>
      <div className="ai-loading" style={{ height: 'auto' }}>
        <div className="ai-spinner"></div>
        <p>Loading 3D Model...</p>
      </div>
    </div>
  );

  return (
    <Canvas camera={{ position: [10, 8, 10], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true, alpha: false, powerPreference: "default" }}>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-10, 10, -10]} intensity={0.3} />
      <OrbitControls enablePan={true} enableZoom={true} autoRotate={false} minDistance={3} maxDistance={30} />
      
      <Box args={[20, 0.1, 20]} position={[0, -1.2, 0]} color="#2d3748">
        <meshStandardMaterial roughness={0.8} metalness={0.2} />
      </Box>
      
      {[-6, -3, 0, 3, 6].map((pos) => (
        <React.Fragment key={pos}>
          <Box args={[20, 0.02, 0.02]} position={[pos, -1.1, 0]} color="#4a5568" />
          <Box args={[0.02, 0.02, 20]} position={[0, -1.1, pos]} color="#4a5568" />
        </React.Fragment>
      ))}
      
      {data.transformers && data.transformers.map((t, idx) => (
        <Transformer key={t.id} position={[-3 + idx * 3, 0, 0]} data={t} isAnomaly={t.aiPrediction?.isAnomaly || false} />
      ))}
      
      <Busbar position={[-1.5, -0.5, 4.5]} />
      <Busbar position={[-1.5, -0.5, -4.5]} />
      
      <FeederLine startPos={[-3, 0.5, 0]} endPos={[-3, 1.5, 4.5]} current={45} />
      <FeederLine startPos={[0, 0.5, 0]} endPos={[0, 1.5, 4.5]} current={52} />
      <FeederLine startPos={[3, 0.5, 0]} endPos={[3, 1.5, 4.5]} current={38} />
      <FeederLine startPos={[-3, 0.5, 0]} endPos={[-3, 1.5, -4.5]} current={40} />
      <FeederLine startPos={[0, 0.5, 0]} endPos={[0, 1.5, -4.5]} current={48} />
      <FeederLine startPos={[3, 0.5, 0]} endPos={[3, 1.5, -4.5]} current={35} />
      
      <Text position={[0, 2.5, 6]} fontSize={0.3} color="#a0aec0" anchorX="center">Busbar A</Text>
      <Text position={[0, 2.5, -6]} fontSize={0.3} color="#a0aec0" anchorX="center">Busbar B</Text>
      
      <axesHelper args={[5]} />
    </Canvas>
  );
};

export default Substation3D;