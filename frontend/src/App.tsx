import React, { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { publicClient } from './lib/somniaClients';
import { CONTRACT_ADDRESSES, PVP_ARENA_ABI, EMPIRE_REGISTRY_ABI } from './constants/contracts';

// Pages
import Landing from './pages/Landing';
import Empire from './pages/Empire';
import Siege from './pages/Siege';
import Legends from './pages/Legends';
import BattleLog from './pages/BattleLog';

// Layout Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import RightSidebar from './components/RightSidebar';
import MobileNav from './components/MobileNav';
import { useGame } from './context/GameContext';

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    className="h-full w-full"
  >
    {children}
  </motion.div>
);

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const hideRightSidebar = location.pathname !== '/empire';

  return (
    <div className="flex h-screen w-full bg-[#080810] text-[#F0EEFF] font-display overflow-hidden relative">
      <div className="absolute inset-0 nebula-bg pointer-events-none opacity-20" />
      
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 pb-16 md:pb-0">
        <Header />
        <section className="flex-1 overflow-y-auto custom-scrollbar relative">
          {children}
        </section>
      </main>

      {!hideRightSidebar && (
        <div className="hidden lg:block">
          <RightSidebar />
        </div>
      )}

      <MobileNav />
    </div>
  );
};

const IncomingRaidOverlay = () => {
  const { incomingRaid, setIncomingRaid } = useGame();
  const location = useLocation();
  const navigate = useNavigate();
  console.log('[IncomingRaidOverlay] Rendering, incomingRaid:', incomingRaid?.battleId?.toString());

  // Poll battle status — when resolved, clear overlay and navigate to /siege for the modal
  useEffect(() => {
    if (!incomingRaid || location.pathname === '/siege') return;
    const checkBattle = async () => {
      try {
        const battle = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.PVP_ARENA as `0x${string}`,
          abi: PVP_ARENA_ABI,
          functionName: 'getBattle',
          args: [incomingRaid.battleId]
        }) as any;
        console.log('[IncomingRaidOverlay] Battle status check:', battle.status, 'for battleId:', incomingRaid?.battleId?.toString());
        if (battle.status === 2 || battle.status === 3) {
          setIncomingRaid(null);
          const isWinner = battle.status === 3
            ? true  // defender always wins intercept
            : !battle.attackerWon; // defender wins if attacker lost
          navigate('/siege', {
            state: {
              immediateResult: {
                won: isWinner,
                loot: isWinner ? Number(battle.lootCredits) : -Number(battle.lootCredits),
                target: incomingRaid.attacker
              }
            }
          });
        }
      } catch (e) {}
    };
    const interval = setInterval(checkBattle, 2000);
    return () => clearInterval(interval);
  }, [incomingRaid?.battleId, location.pathname]);

  if (!incomingRaid || location.pathname === '/siege') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 p-6 rounded-2xl bg-[#0D0A18] border-2 border-[#F72585] shadow-[0_0_40px_rgba(247,37,133,0.4)]">
        {/* Pulsing border animation */}
        <div className="absolute inset-0 rounded-2xl border-2 border-[#F72585] animate-ping opacity-20 pointer-events-none" />

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[#F72585] text-2xl shrink-0">⚔️</span>
          <div className="min-w-0">
            <h2 className="font-fantasy text-xl sm:text-2xl text-[#F72585] uppercase tracking-widest">Incoming Raid!</h2>
            <p className="font-mono text-xs text-[#5A5880] uppercase tracking-widest">Neural Breach Detected</p>
          </div>
          <span className="ml-auto shrink-0 px-2 py-1 rounded text-[9px] font-bold bg-[#F72585]/20 border border-[#F72585]/40 text-[#F72585] uppercase">• Reactivity</span>
        </div>

        {/* Attacker info */}
        <div className="space-y-3 mb-5 p-4 rounded-xl bg-[#0A0A14] border border-[#F72585]/20">
          <div className="flex justify-between gap-2">
            <span className="font-mono text-xs text-[#5A5880] uppercase shrink-0">Attacker</span>
            <span className="font-mono text-sm text-[#F0EEFF] truncate text-right">{incomingRaid.attackerEmpire}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="font-mono text-xs text-[#5A5880] uppercase shrink-0">Troop Size</span>
            <span className="font-mono text-sm text-[#F72585] font-bold text-right">{incomingRaid.vanguard.toLocaleString()} Vanguard</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="font-mono text-xs text-[#5A5880] uppercase shrink-0">Time to Impact</span>
            <span className="font-mono text-sm text-[#FFD60A] font-bold eta-flash">
              {String(Math.floor(incomingRaid.etaSeconds / 60)).padStart(2, '0')}:{String(incomingRaid.etaSeconds % 60).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              console.log('[IncomingRaid] Intercept Now clicked');
              setIncomingRaid(null);
              navigate('/siege');
            }}
            className="flex-1 py-3 rounded-xl bg-[#F72585] text-white font-fantasy text-sm uppercase tracking-widest hover:bg-[#F72585]/80 transition-all"
          >
            ⚔ Intercept Now
          </button>
          <button
            onClick={() => {
              console.log('[IncomingRaid] Ignore clicked');
              setIncomingRaid(null);
            }}
            className="px-4 py-3 rounded-xl bg-[#2A2A45] text-[#6B68A0] font-mono text-xs uppercase tracking-widest hover:bg-[#3A3A55] transition-all"
          >
            Ignore
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const location = useLocation();

  return (
    <>
      <IncomingRaidOverlay />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
        {/* Public Landing Page */}
        <Route 
          path="/" 
          element={
            <PageWrapper>
              <Landing />
            </PageWrapper>
          } 
        />

        {/* Protected/Dashboard Routes */}
        <Route 
          path="/empire" 
          element={
            <DashboardLayout>
              <PageWrapper>
                <Empire />
              </PageWrapper>
            </DashboardLayout>
          } 
        />

        <Route 
          path="/siege" 
          element={
            <DashboardLayout>
              <PageWrapper>
                <Siege />
              </PageWrapper>
            </DashboardLayout>
          } 
        />

        <Route 
          path="/legends" 
          element={
            <DashboardLayout>
              <PageWrapper>
                <Legends />
              </PageWrapper>
            </DashboardLayout>
          } 
        />
        
        <Route 
          path="/battlelog" 
          element={
            <DashboardLayout>
              <PageWrapper>
                <BattleLog />
              </PageWrapper>
            </DashboardLayout>
          } 
        />

        {/* Fallback */}
        <Route path="*" element={<Landing />} />
      </Routes>
    </AnimatePresence>
    </>
  );
}

export default App;
