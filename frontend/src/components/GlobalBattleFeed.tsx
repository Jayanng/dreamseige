import { RocketIcon, ShieldAlert, Swords } from 'lucide-react'
import { useReactivity } from '../hooks/useReactivity'
import { useState, useEffect } from 'react'

interface BattleEvent {
  id: string
  attacker: string
  defender: string
  winner?: string
  timestamp: number
  isVictory: boolean
  totalLoot?: string
}

const GlobalBattleFeed = () => {
  const { subscribeToGlobalBattleEvents } = useReactivity()
  const [events, setEvents] = useState<BattleEvent[]>([])

  useEffect(() => {
    // Initial events for flair
    const initialEvents = [
      { id: '1', attacker: '0x32A...B4E', defender: '0x99B...C21', winner: '0x32A...B4E', timestamp: Date.now() - 3000, isVictory: true },
      { id: '2', attacker: '0xF11...882', defender: '0x092...11D', winner: '0x092...11D', timestamp: Date.now() - 15000, isVictory: false },
    ]
    setEvents(initialEvents)

    const unsub = subscribeToGlobalBattleEvents((id, atkEmpire, defEmpire, attackerWon, totalLoot, timestamp) => {
      const newEvent = {
        id: id.toString(),
        attacker: atkEmpire,
        defender: defEmpire,
        timestamp: timestamp * 1000,
        isVictory: attackerWon,
        totalLoot: (Number(totalLoot) / 1000).toFixed(1) + 'K'
      }
      setEvents(prev => [newEvent, ...prev].slice(0, 10))
    })

    return () => unsub()
  }, [subscribeToGlobalBattleEvents])

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <footer className="w-full bg-background-dark/80 backdrop-blur-md border-t border-slate-800/50 py-4 px-6 flex flex-col md:flex-row items-center justify-between gap-4 pointer-events-auto">
        <div className="flex items-center gap-4 flex-1 overflow-hidden">
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-full border border-slate-800 shrink-0">
            <span className="w-2 h-2 rounded-full bg-nebula-teal animate-pulse-teal"></span>
            <span className="text-[10px] font-mono font-bold text-nebula-teal uppercase">SOMNIA LIVE</span>
          </div>
          
          <div className="relative flex-1 overflow-hidden h-6">
            <div className="marquee font-mono text-sm text-slate-400 tracking-tight flex items-center gap-8 animate-[marquee_30s_linear_infinite]">
              {events.length > 0 ? (
                <>
                  {[...events, ...events].map((event, i) => (
                    <div key={`${event.id}-${i}`} className="flex items-center gap-4 shrink-0 px-4">
                      {event.isVictory ? (
                        <Swords className="w-4 h-4 text-primary" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-accent" />
                      )}
                      <span className="uppercase italic">
                        {event.attacker.slice(0, 6)} ATTACKED {event.defender.slice(0, 6)} → {event.isVictory ? 'VICTORY' : 'REPELLED'}
                      </span>
                      <span className="text-slate-600">·</span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex items-center gap-4 shrink-0 px-4">
                   <RocketIcon className="w-4 h-4 text-nebula-teal" />
                   <span className="uppercase italic">SYNCHRONIZING BATTLE NODES...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-primary/20 border border-primary/40 px-3 py-1 rounded-full flex items-center gap-2 group hover:bg-primary/30 transition-all cursor-crosshair">
            <span className="material-symbols-outlined text-[16px] text-primary">hub</span>
            <span className="text-[11px] font-mono font-bold text-slate-200">SOMNIA TESTNET</span>
          </div>
          
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-slate-800/50 border border-white/5 flex items-center justify-center hover:bg-primary/20 hover:border-primary/40 transition-all cursor-pointer">
                <span className="material-symbols-outlined text-sm text-slate-400">share</span>
             </div>
             <div className="w-8 h-8 rounded-full bg-slate-800/50 border border-white/5 flex items-center justify-center hover:bg-accent/20 hover:border-accent/40 transition-all cursor-pointer">
                <span className="material-symbols-outlined text-sm text-slate-400">forum</span>
             </div>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee {
          display: flex;
          width: fit-content;
        }
      `}} />
    </div>
  )
}

export default GlobalBattleFeed
