import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBlockNumber } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import ConnectWalletButton from '../components/ConnectWalletButton';
import { CONTRACT_ADDRESSES, BASE_CONTRACT_ABI, LEADERBOARD_CONTRACT_ABI } from '../constants/contracts';
import * as THREE from 'three';

const ParticleField = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: 'low-power'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // Canvas explicit styling
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.pointerEvents = 'none';
    renderer.domElement.style.zIndex = '1';
    renderer.domElement.style.willChange = 'transform';
    renderer.domElement.style.transform = 'translateZ(0)';

    // Create particles
    const particleCount = 400;
    console.log('[ParticleField] Three.js initialized, particles:', particleCount);
    
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorPalette = [
      new THREE.Color('#9B5DE5'), // purple
      new THREE.Color('#F72585'), // pink
      new THREE.Color('#00F5D4'), // teal
      new THREE.Color('#FFD60A'), // yellow
    ];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Create a circular sprite texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      map: texture,
      alphaTest: 0.01,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    camera.position.z = 25;

    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    let animationId: number;
    let lastTime = 0;
    const targetFPS = 24;
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime: number) => {
      animationId = requestAnimationFrame(animate);
      const delta = currentTime - lastTime;
      if (delta < frameInterval) return;
      lastTime = currentTime - (delta % frameInterval);

      particles.rotation.x += 0.00015;
      particles.rotation.y += 0.00025;

      // Smooth camera movement following mouse (subtle)
      camera.position.x += (mouseX * 1.5 - camera.position.x) * 0.01;
      camera.position.y += (-mouseY * 1.5 - camera.position.y) * 0.01;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };
    animate(0);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
};

export default function Landing() {
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const { data: topPlayersData } = useReadContract({
    address: CONTRACT_ADDRESSES.LEADERBOARD_CONTRACT as `0x${string}`,
    abi: LEADERBOARD_CONTRACT_ABI,
    functionName: 'getTopPlayers',
    args: [Number(50)],
    query: { refetchInterval: 10000 },
  });

  const empiresActive = topPlayersData ? (topPlayersData as any)[0].length : 0;
  const raidsToday = topPlayersData
    ? (topPlayersData as any)[1].reduce((sum: number, wins: number) => sum + Number(wins), 0)
    : 0;

  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { writeContract, data: hash, isPending, isSuccess } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Check if player already has a base
  const { data: hasBase, isLoading: isCheckingBase } = useReadContract({
    address: CONTRACT_ADDRESSES.BASE_CONTRACT,
    abi: BASE_CONTRACT_ABI,
    functionName: 'hasBase',
    args: [address!],
    query: { 
      enabled: !!address,
      refetchOnWindowFocus: true 
    }
  });

  // Robust base check
  const isActuallyNewPlayer = isConnected && hasBase === false && !isCheckingBase;
  const isAlreadyPlayer = isConnected && hasBase === true;

  // Handle transaction confirmation — only auto-navigate after a new base is initialized
  useEffect(() => {
    if (isConfirmed || isSuccess) {
      // Small delay for testnet sync
      const timer = setTimeout(() => navigate('/empire'), 1200);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, isSuccess, navigate]);

  const handleEnterSiege = () => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    if (isAlreadyPlayer) {
      navigate('/empire');
      return;
    }
    
    // Safety: Only call if we are SURE they don't have a base
    if (isActuallyNewPlayer) {
      writeContract({
        address: CONTRACT_ADDRESSES.BASE_CONTRACT,
        abi: BASE_CONTRACT_ABI,
        functionName: 'initializeBase',
        gas: 3_000_000n,
        gasPrice: 1_000_000_000n, // 1 gwei
        type: 'legacy' as const,
      });
    }
  };

  const handleEnterEmpire = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/empire');
  };

  const isDeploying = isPending || isConfirming;

  return (
    <div className="relative min-h-screen w-full bg-transparent flex flex-col items-center justify-between overflow-hidden font-display text-slate-100 antialiased">
      <ParticleField />
      <style>{`
        .nebula-bg {
          background: radial-gradient(circle at 20% 30%, rgba(123, 63, 228, 0.15) 0%, transparent 40%),
                      radial-gradient(circle at 80% 70%, rgba(0, 242, 255, 0.1) 0%, transparent 40%),
                      #0A0A0F;
        }
        .text-glow {
          text-shadow: 0 0 15px rgba(123, 63, 228, 0.6);
        }

        @keyframes marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee-scroll 18s linear infinite;
          will-change: transform;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }

        @keyframes btn-pulse {
          0%   { box-shadow: 0 0 0px rgba(123, 63, 228, 0); }
          50%  { box-shadow: 0 0 28px rgba(123, 63, 228, 0.7), 0 0 60px rgba(228, 0, 122, 0.3); }
          100% { box-shadow: 0 0 0px rgba(123, 63, 228, 0); }
        }
        .btn-siege {
          background: linear-gradient(#0A0A0F, #0A0A0F) padding-box,
                      linear-gradient(to right, #7B3FE4, #E4007A) border-box;
          border: 2px solid transparent;
          animation: btn-pulse 2.5s ease-in-out infinite;
        }
        .btn-siege:hover {
          animation: none;
          box-shadow: 0 0 30px rgba(123, 63, 228, 0.6);
        }

        @keyframes pulse-teal {
          0%   { opacity: 1; transform: scale(1); }
          50%  { opacity: 0.4; transform: scale(1.3); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-pulse-teal { animation: pulse-teal 1.5s infinite ease-in-out; }

        @keyframes tick {
          0%   { opacity: 0.4; transform: scale(0.96); }
          50%  { opacity: 1;   transform: scale(1.02); }
          100% { opacity: 0.8; transform: scale(1); }
        }
        .block-tick { animation: tick 1s ease-in-out; }

        /* ── BACKGROUND ANIMATIONS ── */
        @keyframes drift1 {
          0%   { transform: translate3d(0px, 0px, 0); }
          25%  { transform: translate3d(40px, -60px, 0); }
          50%  { transform: translate3d(-30px, -20px, 0); }
          75%  { transform: translate3d(-50px, 40px, 0); }
          100% { transform: translate3d(0px, 0px, 0); }
        }
        @keyframes drift2 {
          0%   { transform: translate3d(0px, 0px, 0); }
          33%  { transform: translate3d(-60px, 50px, 0); }
          66%  { transform: translate3d(40px, -30px, 0); }
          100% { transform: translate3d(0px, 0px, 0); }
        }
        @keyframes drift3 {
          0%   { transform: translate3d(0px, 0px, 0); }
          50%  { transform: translate3d(60px, 60px, 0); }
          100% { transform: translate3d(0px, 0px, 0); }
        }
        @keyframes hexRotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes hexRotateReverse {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes gridBreath {
          0%, 100% { opacity: 0.025; }
          50%       { opacity: 0.06; }
        }
        @keyframes particleDrift {
          0%   { transform: translate3d(0px, 900px, 0); opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 0.6; }
          100% { transform: translate3d(30px, -20px, 0); opacity: 0; }
        }
      `}</style>

      {/* ── CINEMATIC BACKGROUND ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" style={{ contain: 'strict' }}>

        {/* Deep space base — layered radial voids */}
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 20%, rgba(123,63,228,0.18) 0%, transparent 55%),
            radial-gradient(ellipse 60% 70% at 85% 75%, rgba(247,37,133,0.12) 0%, transparent 50%),
            radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,245,212,0.06) 0%, transparent 60%),
            #05050D`
        }} />

        {/* Animated grid — breathing tactical overlay */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(155,93,229,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(155,93,229,0.12) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
          animation: 'gridBreath 5s ease-in-out infinite'
        }} />

        {/* Hexagonal outer ring — slow rotate */}
        <div className="absolute" style={{
          top: '50%', left: '50%',
          width: '900px', height: '900px',
          marginLeft: '-450px', marginTop: '-450px',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpolygon points='50,2 93,26 93,74 50,98 7,74 7,26' fill='none' stroke='rgba(155,93,229,0.5)' stroke-width='0.5'/%3E%3Cpolygon points='50,12 83,31 83,69 50,88 17,69 17,31' fill='none' stroke='rgba(0,245,212,0.3)' stroke-width='0.3'/%3E%3Cpolygon points='50,22 73,36 73,64 50,78 27,64 27,36' fill='none' stroke='rgba(247,37,133,0.25)' stroke-width='0.3'/%3E%3C/svg%3E")`,
          backgroundSize: '100% 100%',
          animation: 'hexRotate 40s linear infinite',
          filter: 'blur(0.5px)',
          willChange: 'transform',
          opacity: 0.06
        }} />

        {/* Inner hex ring — reverse rotate */}
        <div className="absolute" style={{
          top: '50%', left: '50%',
          width: '550px', height: '550px',
          marginLeft: '-275px', marginTop: '-275px',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpolygon points='50,2 93,26 93,74 50,98 7,74 7,26' fill='none' stroke='rgba(0,245,212,0.4)' stroke-width='0.6'/%3E%3Cpolygon points='50,15 80,32 80,68 50,85 20,68 20,32' fill='none' stroke='rgba(155,93,229,0.3)' stroke-width='0.4'/%3E%3C/svg%3E")`,
          backgroundSize: '100% 100%',
          animation: 'hexRotateReverse 28s linear infinite',
          willChange: 'transform',
          opacity: 0.05
        }} />

        {/* Orb 1 — large purple nebula, slow drift */}
        <div className="absolute" style={{
          top: '5%', left: '8%',
          width: '520px', height: '520px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(123,63,228,0.28) 0%, rgba(155,93,229,0.1) 40%, transparent 70%)',
          filter: 'blur(55px)',
          animation: 'drift1 18s ease-in-out infinite',
          willChange: 'transform'
        }} />

        {/* Orb 2 — pink/magenta, medium drift */}
        <div className="absolute" style={{
          top: '35%', right: '5%',
          width: '440px', height: '440px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(247,37,133,0.22) 0%, rgba(228,0,122,0.08) 45%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'drift2 14s ease-in-out infinite',
          willChange: 'transform'
        }} />

        {/* Orb 3 — teal accent, bottom drift */}
        <div className="absolute" style={{
          bottom: '10%', left: '25%',
          width: '380px', height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,245,212,0.18) 0%, rgba(0,245,212,0.06) 40%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'drift3 22s ease-in-out infinite',
          willChange: 'transform'
        }} />

        {/* Orb 4 — deep blue micro-orb center */}
        <div className="absolute" style={{
          top: '45%', left: '42%',
          width: '200px', height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
          filter: 'blur(30px)',
          animation: 'drift1 11s ease-in-out infinite reverse',
          willChange: 'transform'
        }} />

        {/* Rising particles */}
        {[
          { left: '12%', dur: '9s', delay: '0s',   size: 3, color: 'rgba(155,93,229,0.7)' },
          { left: '28%', dur: '12s', delay: '2s',  size: 2, color: 'rgba(0,245,212,0.6)' },
          { left: '45%', dur: '10s', delay: '4s',  size: 2, color: 'rgba(247,37,133,0.6)' },
          { left: '62%', dur: '14s', delay: '1s',  size: 3, color: 'rgba(155,93,229,0.5)' },
          { left: '78%', dur: '8s',  delay: '6s',  size: 2, color: 'rgba(0,245,212,0.7)' },
          { left: '90%', dur: '11s', delay: '3s',  size: 2, color: 'rgba(247,37,133,0.4)' },
        ].map((p, i) => (
          <div key={i} className="absolute rounded-full" style={{
            left: p.left, bottom: '-10px',
            width: p.size + 'px', height: p.size + 'px',
            backgroundColor: p.color,
            boxShadow: `0 0 6px ${p.color}`,
            animation: `particleDrift ${p.dur} ease-in-out infinite`,
            animationDelay: p.delay,
            willChange: 'transform, opacity'
          }} />
        ))}

        {/* Corner accent glows — static, no animation to avoid repaints */}
        <div className="absolute top-0 left-0 w-48 h-48" style={{
          background: 'radial-gradient(circle at 0% 0%, rgba(155,93,229,0.22) 0%, transparent 70%)',
          opacity: 0.7
        }} />
        <div className="absolute bottom-0 right-0 w-48 h-48" style={{
          background: 'radial-gradient(circle at 100% 100%, rgba(247,37,133,0.18) 0%, transparent 70%)',
          opacity: 0.7
        }} />

        {/* Vignette — static */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 40%, rgba(5,5,13,0.75) 100%)'
        }} />
      </div>

      {/* HEADER */}
      <header className="relative z-10 w-full max-w-7xl px-3 py-4 md:px-6 md:py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-3xl">fort</span>
          <h2 className="font-fantasy text-2xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent tracking-wider">
            DREAMSIEGE
          </h2>
        </div>
        <ConnectWalletButton />
      </header>

      {/* MAIN HERO */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full px-3 md:px-6 text-center">
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
          <div 
            className="relative w-full max-w-4xl aspect-video bg-center bg-no-repeat bg-contain"
            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBS8C9UMsxcffR7FEDDhvHB3y9v3sIXUO5cBS8l7xdJm1S8EY5Ky46yjgY145N4UBowC0GMXVp10ELMxcyCLJbBwgroIbpBayVqEcMboNJbT1m_CNjSdMSbB45PytunnOlDAG1ir95mCsyD1OTYcug8OaPJKcPe0OM4GdpWAW2QFZCO-cBC4UGbkN6RRWPpu0g3PkO9sSQuXP1iJohL4BMZThGAvbaHWCB1xfpflI8wOJToSDXscUDMKzHzNfIXs3uB1vavaD6tK-L9')" }}
          >
          </div>
        </div>

        <div className="z-10 flex flex-col items-center gap-8 max-w-3xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h1 className="font-fantasy text-4xl sm:text-6xl md:text-8xl font-black leading-tight tracking-tight text-glow">
              <span className="bg-gradient-to-br from-white via-primary to-accent bg-clip-text text-transparent uppercase">DREAMSIEGE</span>
            </h1>
            <p className="text-slate-400 text-sm md:text-lg lg:text-xl font-medium max-w-xl mx-auto leading-relaxed">
              Siege your dream empire in real-time. Build. Raid. Defend. All on-chain.
            </p>
          </motion.div>

          <div className="flex gap-4 flex-wrap justify-center">
            <motion.div 
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-900/60 border border-slate-700/50 rounded-xl px-5 py-3 flex flex-col items-center gap-1 min-w-[110px]"
            >
              <span className="text-2xl font-fantasy font-black text-primary transition-colors duration-300">{empiresActive}</span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Empires Active</span>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-slate-900/60 border border-slate-700/50 rounded-xl px-5 py-3 flex flex-col items-center gap-1 min-w-[110px]"
            >
              <span className="text-2xl font-fantasy font-black text-accent transition-colors duration-300">{raidsToday}</span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Raids Today</span>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-slate-900/60 border border-slate-700/50 rounded-xl px-5 py-3 flex flex-col items-center gap-1 min-w-[110px]"
            >
              <span className="text-2xl font-black text-dot-teal font-mono">
                #{blockNumber ? Number(blockNumber).toLocaleString() : '...'}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Latest Block</span>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 mt-2"
          >
            <button
              onClick={handleEnterSiege}
              className={`btn-siege w-full sm:w-auto px-6 sm:px-10 py-4 sm:py-5 text-white rounded-xl font-bold text-base sm:text-lg tracking-wide transition-all duration-300 uppercase ${isDeploying || isCheckingBase ? 'opacity-70 pointer-events-none' : ''}`}
            >
              {isCheckingBase ? 'SCANNING...' : isPending ? 'TRANSACTING...' : isConfirming ? 'CONFIRMING...' : isAlreadyPlayer ? 'ENTER CORE' : 'INITIALIZE CITADEL'}
            </button>
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 mt-4 text-xs font-mono uppercase tracking-[0.2em] text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-dot-teal animate-pulse-teal shadow-[0_0_8px_rgba(0,229,204,0.6)]"></span>
              SOMNIA REACTIVITY POWERED
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-teal shadow-[0_0_8px_rgba(123,63,228,0.6)]"></span>
              LIVE ON SOMNIA TESTNET
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full bg-background-dark/80 backdrop-blur-md border-t border-slate-800/50 py-3 px-3 md:px-6 md:py-4 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
        <div className="flex items-center gap-4 flex-1 overflow-hidden">
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-full border border-slate-800 shrink-0">
            <span className="w-2 h-2 rounded-full bg-nebula-teal animate-pulse-teal"></span>
            <span className="text-[10px] font-mono font-bold text-nebula-teal">SOMNIA LIVE</span>
          </div>

          <div className="overflow-hidden flex-1 scale-x-100">
            <div 
              className="marquee-track font-mono text-sm text-slate-400 tracking-tight"
              style={{ willChange: 'transform' }}
            >
              {/* Mapping identical content for seamless loop */}
              {[1, 2].map((i) => (
                <React.Fragment key={i}>
                  <span className="inline-block px-4">⚔️ {raidsToday} RAIDS LAUNCHED</span>
                  <span className="inline-block px-4 text-slate-600">·</span>
                  <span className="inline-block px-4">👥 {empiresActive} EMPIRES ACTIVE</span>
                  <span className="inline-block px-4 text-slate-600">·</span>
                  <span className="inline-block px-4">⛓ BLOCK #{blockNumber ? Number(blockNumber).toLocaleString() : '...'}</span>
                  <span className="inline-block px-4 text-slate-600">·</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-primary/20 border border-primary/40 px-3 py-1 rounded-full flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">hub</span>
            <span className="text-[11px] font-mono font-bold text-slate-200">SOMNIA TESTNET</span>
          </div>
          <div className="flex gap-3">
            <a className="text-slate-500 hover:text-primary transition-colors" href="#">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"></path></svg>
            </a>
            <a className="text-slate-500 hover:text-primary transition-colors" href="#">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.069.069 0 0 0-.032.027C.533 9.048-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"></path></svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
