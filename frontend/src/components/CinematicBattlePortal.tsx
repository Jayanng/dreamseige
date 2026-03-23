import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ShieldAlert, X, Zap, Database, Cpu } from 'lucide-react';

interface CinematicBattlePortalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

const CinematicBattlePortal: React.FC<CinematicBattlePortalProps> = ({ isOpen, onClose, data }) => {
  if (!data) return null;

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
            className="glass-card max-w-2xl w-full relative z-10 border border-white/10 p-12 overflow-hidden"
          >
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex flex-col items-center text-center gap-10">
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className={`w-24 h-24 rounded-[2rem] flex items-center justify-center border-2 ${
                    data.attackerWon ? 'border-primary/50 bg-primary/10 shadow-[0_0_40px_rgba(123,63,228,0.3)]' : 'border-accent/50 bg-accent/10 shadow-[0_0_40px_rgba(228,0,122,0.3)]'
                  }`}
                >
                  {data.attackerWon ? <Trophy className="w-12 h-12 text-primary" /> : <ShieldAlert className="w-12 h-12 text-accent" />}
                </motion.div>
                <div className={`absolute -bottom-2 px-6 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.3em] backdrop-blur-md border ${
                  data.attackerWon ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-accent/20 border-accent/40 text-accent'
                }`}>
                  {data.attackerWon ? 'VICTORY' : 'DEFEAT'}
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-5xl font-fantasy font-black italic tracking-tighter uppercase text-white leading-none">
                  SIEGE <span className={data.attackerWon ? 'text-primary' : 'text-accent'}>RESOLVED</span>
                </h2>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-[0.4em]">
                  ENCOUNTER ID: {data.attackId.toString().slice(0, 8)}...
                </p>
              </div>

              {data.attackerWon && (
                <div className="w-full grid grid-cols-3 gap-6">
                  {[
                    { label: 'CREDITS', value: data.lootGold, icon: Database, color: 'text-primary' },
                    { label: 'BIOMASS', value: data.lootWood, icon: Zap, color: 'text-nebula-teal' },
                    { label: 'MINERA', value: data.lootStone, icon: Cpu, color: 'text-accent' },
                  ].map((res, i) => (
                    <motion.div
                      key={res.label}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="bg-slate-900 border border-white/5 p-6 rounded-2xl flex flex-col items-center gap-2 group hover:border-white/20 transition-all"
                    >
                      <res.icon className={`w-5 h-5 ${res.color} mb-1`} />
                      <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">{res.label}</span>
                      <span className="text-lg font-mono font-black text-white tracking-tighter">+{res.value.toLocaleString()}</span>
                    </motion.div>
                  ))}
                </div>
              )}

              {!data.attackerWon && (
                <div className="bg-accent/5 border border-accent/20 p-8 rounded-2xl max-w-md">
                   <p className="text-accent text-sm font-fantasy font-bold uppercase tracking-widest leading-relaxed">
                      YOUR DEFENSIVE GRID HELD FIRM. THE AGGRESSOR HAS BEEN REPELLED FROM THE CITADEL.
                   </p>
                </div>
              )}

              <button
                onClick={onClose}
                className="btn-ghost-gradient px-12 py-4 rounded-xl text-white font-black uppercase tracking-widest text-xs"
              >
                RETURN TO COMMAND
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CinematicBattlePortal;
