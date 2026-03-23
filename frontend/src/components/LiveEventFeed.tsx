import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Shield, Zap, Skull, Trophy, Hammer } from 'lucide-react';
import { useReactivity } from '../hooks/useReactivity';
import { useGame, GameEvent as Event } from '../context/GameContext';

const LiveEventFeed: React.FC = () => {
  const { subscribeToAllResolutions } = useReactivity();
  const { events: contextEvents, addEvent } = useGame();

  useEffect(() => {
    const unsub = subscribeToAllResolutions((id, winner, attackerWon) => {
      addEvent(attackerWon ? 'attack' : 'defense', 
        attackerWon ? `RAID SUCCESSFUL: ${winner.slice(0, 6)} DOMINATED` : `DEFENSE HELD: ${winner.slice(0, 6)} REPELLED`,
        attackerWon ? 'medium' : 'high'
      );
    });

    return () => unsub();
  }, [subscribeToAllResolutions, addEvent]);

  // Combine and sort
  const allEvents = [...contextEvents].sort((a, b) => b.timestamp - a.timestamp);

  const getIcon = (type: Event['type']) => {
    switch (type) {
      case 'attack': return <Sword className="w-4 h-4" />;
      case 'defense': return <Shield className="w-4 h-4" />;
      case 'upgrade': return <Zap className="w-4 h-4" />;
      case 'resource': return <Skull className="w-4 h-4" />;
      case 'build': return <Hammer className="w-4 h-4" />;
      case 'system': return <Zap className="w-4 h-4" />;
      default: return <Trophy className="w-4 h-4" />;
    }
  };

  const getBorderColor = (type: Event['type']) => {
    switch (type) {
      case 'attack': return 'border-event-raid';
      case 'defense': return 'border-primary';
      case 'resource': return 'border-accent-teal';
      case 'upgrade': return 'border-accent-teal';
      case 'build': return 'border-primary-light';
      case 'system': return 'border-accent-pink';
      default: return 'border-event-victory';
    }
  };

  const getBadgeColor = (type: Event['type']) => {
    switch (type) {
      case 'attack': return 'bg-event-raid/20 text-event-raid border-event-raid/30';
      case 'defense': return 'bg-primary/20 text-primary border-primary/30';
      case 'resource': return 'bg-accent-teal/20 text-accent-teal border-accent-teal/30';
      case 'upgrade': return 'bg-accent-teal/20 text-accent-teal border-accent-teal/30';
      case 'build': return 'bg-primary-light/20 text-primary-light border-primary-light/30';
      case 'system': return 'bg-accent-pink/20 text-accent-pink border-accent-pink/30';
      default: return 'bg-event-victory/20 text-event-victory border-event-victory/30';
    }
  };

  const getRelativeTime = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 5) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    return `${Math.floor(diff/60)}m ago`;
  };

  return (
    <div className="flex flex-col gap-6">
      <AnimatePresence mode="popLayout">
        {allEvents.map((event) => (
          <motion.div
            key={event.id}
            layout
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`flex flex-col gap-1 border-l-2 pl-3 py-1 transition-all event-new ${getBorderColor(event.type)}`}
          >
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold border uppercase tracking-widest ${getBadgeColor(event.type)}`}>
                {event.type}
              </span>
              <span className="text-[9px] font-mono text-slate-500">
                {getRelativeTime(event.timestamp)}
              </span>
            </div>
            <p className="text-[10px] text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: event.message }} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default LiveEventFeed;
