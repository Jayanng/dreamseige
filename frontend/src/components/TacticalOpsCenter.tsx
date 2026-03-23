import React from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldCheck, Sword, Zap } from 'lucide-react';

const TacticalOpsCenter: React.FC = () => {
  const stats = [
    { label: 'Raid Success', value: '74%', color: 'text-accent-teal', icon: Sword },
    { label: 'Base Defense', value: '92%', color: 'text-primary', icon: ShieldCheck },
    { label: 'Energy Flow', value: '1.2M', color: 'text-accent-pink', icon: Zap },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-fantasy font-black uppercase tracking-[0.25em] text-white italic">Tactical Status</h2>
        <div className="p-2 rounded-lg bg-slate-900 border border-white/5 transition-transform hover:rotate-90">
          <Activity className="w-3 h-3 text-accent-teal" />
        </div>
      </div>

      <div className="space-y-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-panel-dark/40 border border-white/5 p-4 rounded-xl flex items-center justify-between group hover:border-white/20 transition-all cursor-default"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-white/5 ${stat.color} group-hover:scale-110 transition-transform duration-500`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-mono font-bold text-slate-500 small-caps tracking-widest">{stat.label}</span>
            </div>
            <span className={`text-sm font-mono font-black italic tracking-tighter ${stat.color}`}>
              {stat.value}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="p-6 glass-card border-dashed border-white/10 flex flex-col items-center justify-center text-center group hover:border-primary/40 transition-all cursor-pointer">
         <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-all">
            <span className="material-symbols-outlined text-primary">analytics</span>
         </div>
         <span className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest mb-1">COMMAND UPLINK</span>
         <p className="text-[11px] font-fantasy font-black text-white italic tracking-wider">GENERATE BATTLE REPORT</p>
      </div>
    </div>
  );
};

export default TacticalOpsCenter;
