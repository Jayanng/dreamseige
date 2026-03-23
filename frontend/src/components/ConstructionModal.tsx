import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hammer, Pickaxe, Trees, Mountain, Swords, Shield, TowerControl, Vault, X, Zap, Database, Cpu, Loader2, ArrowUpCircle, CheckCircle2 } from 'lucide-react';
import { BUILDING_NAMES, type BuildingType } from '../constants/contracts';

interface ConstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: number;
  onBuild: (type: number) => void;
  onUpgrade: () => void;
  onClaim: (jobId: bigint) => void;
  buildings?: any[];
  isPlacing: boolean;
  isUpgrading: boolean;
  isClaiming: boolean;
}

const ConstructionModal: React.FC<ConstructionModalProps> = ({ 
  isOpen, 
  onClose, 
  slot,
  onBuild, 
  onUpgrade,
  onClaim,
  buildings,
  isPlacing,
  isUpgrading,
  isClaiming 
}) => {
  const building = buildings?.[slot];
  const isOccupied = building && building.buildingType !== 0;
  const isJobActive = building?.jobId !== 0n;
  const isJobComplete = isJobActive && building?.jobEndTime <= BigInt(Math.floor(Date.now() / 1000));

  const buildingData = [
    { type: 1, name: 'CITADEL CORE', icon: Hammer, desc: 'CENTRAL COMMAND HUB', cost: { gold: 500, wood: 200, stone: 100 }, color: 'text-primary' },
    { type: 2, name: 'MINERA EXTRACTOR', icon: Pickaxe, desc: 'ORE HARVESTING FACILITY', cost: { gold: 200, wood: 100, stone: 0 }, color: 'text-accent' },
    { type: 3, name: 'BIOMASS LAB', icon: Trees, desc: 'SYNTHETIC LUMBER LAB', cost: { gold: 200, wood: 0, stone: 100 }, color: 'text-nebula-teal' },
    { type: 4, name: 'CREDIT MINE', icon: Mountain, desc: 'CURRENCY GENERATOR', cost: { gold: 0, wood: 150, stone: 150 }, color: 'text-primary' },
    { type: 5, name: 'WAR ROOM', icon: Swords, desc: 'BATTLE STRATEGY HUB', cost: { gold: 1000, wood: 500, stone: 500 }, color: 'text-accent' },
    { type: 6, name: 'NEBULA WALL', icon: Shield, desc: 'THERMAL DEFENSE GRID', cost: { gold: 300, wood: 300, stone: 300 }, color: 'text-primary' },
    { type: 7, name: 'PULSE TOWER', icon: TowerControl, desc: 'RAILGUN TURRET', cost: { gold: 600, wood: 400, stone: 400 }, color: 'text-nebula-teal' },
    { type: 8, name: 'VAULT', icon: Vault, desc: 'SECURE ASSET STORAGE', cost: { gold: 800, wood: 600, stone: 600 }, color: 'text-accent' },
  ];

  const currentBuilding = isOccupied ? buildingData.find(b => b.type === building.buildingType) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background-dark/95 backdrop-blur-2xl"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="glass-card max-w-lg md:max-w-4xl w-full relative z-10 border border-white/10 p-10 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-10">
              <div className="flex flex-col text-left">
                <h2 className="text-3xl font-fantasy font-black italic uppercase tracking-wider text-white">
                  {isOccupied ? 'FACILITY MANAGEMENT' : 'COLONY EXPANSION'}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                   <div className="w-1.5 h-1.5 bg-nebula-teal rounded-full animate-pulse shadow-[0_0_8px_#00f2ff]" />
                   <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                     SLOT {String(slot).padStart(2, '0')} INTERFACE ACTIVE
                   </span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isOccupied ? (
              <div className="flex flex-col items-center gap-8 py-10">
                <div className="relative">
                  <div className={`p-8 rounded-[2.5rem] bg-white/5 border-2 border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.05)] ${currentBuilding?.color}`}>
                    {currentBuilding && <currentBuilding.icon className="w-16 h-16" />}
                  </div>
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-background-dark border border-white/10 text-xs font-fantasy font-black italic text-white tracking-widest whitespace-nowrap shadow-xl">
                    LEVEL {building.level} {currentBuilding?.name}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl mt-8">
                  <button
                    disabled={isUpgrading || isJobActive}
                    onClick={onUpgrade}
                    className="group relative flex flex-col items-center gap-4 p-8 rounded-3xl bg-slate-900/50 border border-white/5 hover:border-primary/40 transition-all disabled:opacity-50"
                  >
                    <div className="p-4 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                      <ArrowUpCircle className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-fantasy font-black italic text-white tracking-widest block mb-1">UPGRADE UNIT</span>
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">INCREASE EFFICIENCY & DURABILITY</span>
                    </div>
                    {isJobActive && !isJobComplete && (
                      <div className="absolute inset-0 bg-background-dark/60 backdrop-blur-[2px] rounded-3xl flex items-center justify-center">
                         <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] italic">UPGRADE IN PROGRESS</span>
                      </div>
                    )}
                  </button>

                  <button
                    disabled={isClaiming || !isJobComplete}
                    onClick={() => onClaim(building.jobId)}
                    className="group relative flex flex-col items-center gap-4 p-8 rounded-3xl bg-slate-900/50 border border-white/5 hover:border-nebula-teal/40 transition-all disabled:opacity-50"
                  >
                    <div className="p-4 rounded-2xl bg-nebula-teal/10 text-nebula-teal group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-fantasy font-black italic text-white tracking-widest block mb-1">COMPLETE JOB</span>
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">FINALIZE PENDING UPGRADES</span>
                    </div>
                    {!isJobComplete && isJobActive && (
                       <div className="absolute inset-x-8 bottom-8 h-1 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 10, repeat: Infinity }}
                            className="h-full bg-nebula-teal"
                          />
                       </div>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {buildingData.map((b) => (
                  <motion.div
                    key={b.type}
                    whileHover={{ scale: 1.02, y: -4 }}
                    onClick={() => onBuild(b.type)}
                    className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl flex flex-col items-center group cursor-pointer hover:border-primary/40 transition-all duration-300 relative overflow-hidden"
                  >
                    <div className={`p-4 rounded-2xl bg-white/5 mb-4 group-hover:scale-110 transition-transform duration-500 ${b.color}`}>
                      <b.icon className="w-6 h-6" />
                    </div>
                    
                    <h3 className="text-[11px] font-fantasy font-black text-white text-center mb-1 tracking-widest leading-tight uppercase">
                      {b.name}
                    </h3>
                    <p className="text-[9px] text-slate-600 font-mono text-center mb-6 uppercase tracking-tight">
                      {b.desc}
                    </p>

                    <div className="mt-auto w-full space-y-2 border-t border-white/5 pt-4">
                      <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-1.5 opacity-60">
                           <Database className="w-2.5 h-2.5 text-primary" />
                           <span className="text-[9px] text-slate-400 font-black">CRED</span>
                        </div>
                        <span className="text-[10px] font-mono font-black text-white">{b.cost.gold}</span>
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-1.5 opacity-60">
                           <Zap className="w-2.5 h-2.5 text-nebula-teal" />
                           <span className="text-[9px] text-slate-400 font-black">BIO</span>
                        </div>
                        <span className="text-[10px] font-mono font-black text-white">{b.cost.wood}</span>
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-1.5 opacity-60">
                           <Cpu className="w-2.5 h-2.5 text-accent" />
                           <span className="text-[9px] text-slate-400 font-black">MIN</span>
                        </div>
                        <span className="text-[10px] font-mono font-black text-white">{b.cost.stone}</span>
                      </div>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </motion.div>
                ))}
              </div>
            )}

            {(isPlacing || isUpgrading || isClaiming) && (
              <div className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <div className="absolute inset-0 w-12 h-12 border-2 border-nebula-teal/20 rounded-full animate-pulse" />
                  </div>
                  <span className="text-[10px] text-primary font-black uppercase tracking-[0.3em] italic">SYNCING GRID...</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConstructionModal;
