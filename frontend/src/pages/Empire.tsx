import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { CONTRACT_ADDRESSES, BASE_CONTRACT_ABI, EMPIRE_REGISTRY_ABI } from '../constants/contracts';
import { useGame } from '../context/GameContext';
import { usePlaceBuilding, useStartUpgrade } from '../hooks/useGame';
import { useReactivity } from '../hooks/useReactivity';

// FIX 3 — Map building type numbers to images
const BUILDING_IMAGES: Record<number, string> = {
  0: '', // EMPTY
  1: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCxsLiuxtuXCyhLZ4shNvPnW0i2PLiXpiaXs5u2wJys5F8F_A4r9jt4ksn5dRRQ3nl5IWkrdcVA460awJ5S3UhhDCwcQ7gPTNN55qnbac0uPOgjOuJ7qXtu73szk_QWIfly6JtLstvg9XR7x0EzHlJg-Ntq34MtXOMoE3e7HHwVGA4xDYuQoEs7MP08dY4rfQxZapCuXWY4U3AFqrDNnB9mLLwya4-msf6OI1pZajZLT6D2HbSPXeZU8oQubkCItzFgXKHxJWaMA0gI', // Credits Forge
  2: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXqk0UGMoedSaN6-7MnleQO-bkresQPDRvCbRYDqNu_vFGTUAf8HbZS-SreDjWC-5u8DN9daW35XPXCl6SWVLqBYXZwp2WGrD6WaA63VmO5tjjb4mkbAOBJnAqsOLPIPMxOrD903zeIPYlsj1rqKVL2z57EAM_DeP2nVrq1nt3vch5kt5n30jDQ--riHODvqHs4bV7kerM16wJybRJx0MfNugWt3_oLOi3VeyGQp0nWQuAvxCRiDheQtdOruzZniIFCg4Ym3VZffTg', // Biomass Farm
  8: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAd1kBE7irmHKZoY9GuDGr9Lb-vZtBmXwHPd7mn-8NJOpAtRA0wHn-AVsvBr5mm3A9qBhsKOfSzMXT4sQwzeybxvdEyTC4bIFmWZEVk_0Fkzl98ezkTidrbB2w4fRhO0OzwpJ75rQCJ5PoH4HBc8sC_7qvvYaVmaM5WxGwgvzxUIFUvxv9TUSjOVY2Cqaz6uouxprhFIMmO6FPpu9nfGQIjP8iX-zfC7GsX2Yzj7ryESw38nM4Oh-bI-4hD0X64p-Ch53YeMETejLGF', // Citadel Base
  3: '/assets/buildings/minera_extractor.png',
  4: '/assets/buildings/vanguard_barracks.png',
  5: '/assets/buildings/defense_tower.png',
  6: '/assets/buildings/shield_wall.png',
};

const BUILDING_NAMES: Record<number, string> = {
  0: 'Empty Slot',
  1: 'Credits Forge',
  2: 'Biomass Farm',
  3: 'Minera Extractor',
  4: 'Vanguard Barracks',
  5: 'Defense Tower',
  6: 'Shield Wall',
  7: 'Void Gate',
  8: 'Citadel Base'
};

// FIX 4 — Add transaction feedback toast with info style
const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  const colors = {
    success: 'bg-[#00F5D4]/20 border-[#00F5D4]/40 text-[#00F5D4] shadow-[0_0_40px_rgba(0,245,212,0.3)]',
    error:   'bg-[#F72585]/20 border-[#F72585]/40 text-[#F72585] shadow-[0_0_40px_rgba(247,37,133,0.3)]',
    info:    'bg-[#9B5DE5]/20 border-[#9B5DE5]/40 text-[#C084FC] shadow-[0_0_40px_rgba(155,93,229,0.3)]',
  };

  const toast = document.createElement('div');
  toast.className = `fixed top-20 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-xl
    font-mono text-sm font-bold uppercase tracking-wide border backdrop-blur-md transition-all duration-300
    ${colors[type]}`;
  toast.innerText = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%, -20px)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
};

export default function Empire() {
  const { address, isConnected } = useAccount();
  const { 
    buildings, 
    base, 
    refreshEmpireState, 
    selectedBuilding, 
    setSelectedBuilding, 
    buildModalSlot, 
    setBuildModalSlot, 
    addEvent 
  } = useGame();
  
  const publicClient = usePublicClient();
  const { subscribeToUpgradeComplete, subscribeToBuildingPlaced } = useReactivity();
  const { startUpgrade, isPending: upgradePending } = useStartUpgrade();
  const { placeBuilding, isPending: buildPending, isSuccess: buildConfirmed, error: buildError } = usePlaceBuilding();

  const [pendingSlot, setPendingSlot] = useState<number | null>(null);



  // ⌬ REGISTRATION CORE ⌬
  const [regName, setRegName] = useState('');
  const [regBadge, setRegBadge] = useState('🐉');
  const badges = ['🐉', '⚔️', '🛡️', '🔥', '⚡', '🌑'];

  const { data: hasBase } = useReadContract({
    address: CONTRACT_ADDRESSES.BASE_CONTRACT,
    abi: BASE_CONTRACT_ABI,
    functionName: 'hasBase',
    args: [address!],
    query: { enabled: !!address }
  });

  const { data: hasEmpire, refetch: refetchEmpire } = useReadContract({
    address: CONTRACT_ADDRESSES.EMPIRE_REGISTRY,
    abi: EMPIRE_REGISTRY_ABI,
    functionName: 'hasEmpire',
    args: [address!],
    query: { enabled: !!address }
  });

  const { writeContract: register, data: regHash, isPending: regPending } = useWriteContract();
  const { isLoading: regConfirming, isSuccess: regConfirmed } = useWaitForTransactionReceipt({ hash: regHash });

  useEffect(() => {
    if (regConfirmed) refetchEmpire();
  }, [regConfirmed, refetchEmpire]);

  const handleRegister = () => {
    if (!regName) return;
    register({
      address: CONTRACT_ADDRESSES.EMPIRE_REGISTRY,
      abi: EMPIRE_REGISTRY_ABI,
      functionName: 'registerEmpire',
      args: [regName, regBadge],
      gas: 5_000_000n,
      gasPrice: 1_000_000_000n,
      type: 'legacy' as const,
    });
  };

  const handleSlotClick = (b: any, i: number) => {
    const buildingType = Number(b?.buildingType ?? 0);
    
    if (buildingType === 0) {
      // EMPTY slot — open build modal
      setBuildModalSlot(i);
      setSelectedBuilding(null);
    } else {
      // OCCUPIED slot — show upgrade panel
      const buildingName = BUILDING_NAMES[buildingType] ?? 'Unknown';
      const level = Number(b.level);
      setSelectedBuilding({ buildingType, level, slot: i });
      setBuildModalSlot(null);

      // Show a clear message that this slot is already deployed
      showToast(`⚔ ${buildingName} — Level ${level} · Click Upgrade to improve`, 'info');
    }
  };

  // Fix 4 — Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      refreshEmpireState();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshEmpireState]);



  // Fix 2 — Handle the reactivity subscriptions
  useEffect(() => {
    if (!base?.id) return;
    
    // Subscribe to UpgradeComplete
    const unsubUpgrade = subscribeToUpgradeComplete(base.id as bigint, (slot, newLevel, jobId) => {
      showToast(`⬆ Upgrade complete on slot ${slot}!`);
      addEvent('upgrade', `Upgrade finished: <span class="text-accent-teal">${BUILDING_NAMES[buildings[slot]?.buildingType as keyof typeof BUILDING_NAMES] || 'Structure'}</span> is now Level ${newLevel}`, 'high');
      refreshEmpireState();
    });

    // Subscribe to BuildingPlaced via hook
    const unsubPlaced = subscribeToBuildingPlaced(base.id as bigint, (slot, buildingType) => {
      console.log(`Building placed on slot ${slot}: type ${buildingType}`);
      refreshEmpireState();
    });

    return () => {
      unsubUpgrade();
      unsubPlaced();
    };
  }, [base?.id, subscribeToUpgradeComplete, subscribeToBuildingPlaced, refreshEmpireState, addEvent, buildings]);

  // Handle construction success
  useEffect(() => {
    if (buildConfirmed && pendingSlot !== null) {
      const type = buildings[pendingSlot]?.buildingType;
      const buildingName = BUILDING_NAMES[type as keyof typeof BUILDING_NAMES] || 'Structure';
      
      showToast(`✅ ${buildingName} deployed successfully`);
      addEvent('build', `Building confirmed: <span class="text-accent-teal">${buildingName}</span> on slot ${pendingSlot}`, 'high');
      
      refreshEmpireState();
      setPendingSlot(null);
      setBuildModalSlot(null);
    }
  }, [buildConfirmed, pendingSlot, refreshEmpireState, addEvent, buildings]);

  // Handle construction error
  useEffect(() => {
    if (buildError) {
      showToast('❌ Transaction failed — check console', 'error');
      setPendingSlot(null);
    }
  }, [buildError]);


  // Expose for RightSidebar to call after startUpgrade succeeds
  // (this is a fallback — reactivity subscription in useReactivity will handle it too)

  const handleBuildStructure = async (buildingType: number) => {
    if (buildModalSlot === null) return;
    const name = BUILDING_NAMES[buildingType as keyof typeof BUILDING_NAMES];
    
    try {
      setPendingSlot(buildModalSlot);
      await placeBuilding(buildModalSlot, buildingType);
      addEvent('build', `Deployment sequence initiated for <span class="text-accent-teal">${name}</span>...`, 'medium');
      setBuildModalSlot(null); // Close modal while pending
    } catch (error) {
      console.error('Build failed:', error);
      setPendingSlot(null);
    }
  };


  return (
    <div className="flex flex-col h-full bg-[#080810]">
      <style>{`
        .grid-bg {
          background-image:
            linear-gradient(rgba(155,93,229,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(155,93,229,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          background-color: #080810;
        }
      `}</style>

      {/* CHANGE 2 — Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 md:px-8 py-3 md:py-4 border-b border-[#2A2A45] shrink-0 gap-2">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-fantasy text-lg md:text-xl text-[#F0EEFF] tracking-wide">Citadel Core</h1>
          <p className="text-[10px] font-mono text-[#5A5880] uppercase tracking-widest">
            Your persistent on-chain empire · Somnia Testnet
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#0F0F1E] border border-[#00F5D4]/20">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00F5D4] animate-pulse"></span>
            <span className="text-[10px] font-mono text-[#00F5D4] uppercase tracking-widest">Sync</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#0F0F1E] border border-[#2A2A45]">
            <span className="text-[10px] font-mono text-[#A09DC0]">
              ATK: <span className="text-[#F72585] font-bold">{base?.attackPower || 0}</span>
            </span>
            <span className="text-[#2A2A45]">|</span>
            <span className="text-[10px] font-mono text-[#A09DC0]">
              DEF: <span className="text-[#00F5D4] font-bold">{base?.defensePower || 0}</span>
            </span>
          </div>
        </div>
      </div>

      <section className="flex-1 overflow-y-auto custom-scrollbar grid-bg pt-6">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          
          {/* FIX 4 — Grid Legend */}
          <div className="flex items-center gap-4 mb-3 px-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm border border-dashed border-[#2A2A45]"></div>
              <span className="text-[9px] font-mono text-[#5A5880] uppercase tracking-widest">Empty</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm border border-[#9B5DE5]/60 bg-[#9B5DE5]/10"></div>
              <span className="text-[9px] font-mono text-[#5A5880] uppercase tracking-widest">Deployed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm border border-[#FFD60A]/60 bg-[#FFD60A]/10"></div>
              <span className="text-[9px] font-mono text-[#5A5880] uppercase tracking-widest">Upgrading</span>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 px-2 pb-2">
            {['A', 'B', 'C', 'D', 'E'].map(l => (
              <div key={l} className="text-center text-[9px] font-mono text-[#2A2A45] uppercase tracking-widest leading-none">{l}</div>
            ))}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 w-full">
            {buildings.map((b, i) => (
              <motion.div 
                key={i} 
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSlotClick(b, i)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center p-2 relative group cursor-pointer transition-all duration-300 overflow-hidden ${
                  b.buildingType === 0 
                    ? 'bg-[#080810] border border-dashed border-[#2A2A45] hover:border-[#9B5DE5]/40 hover:bg-[#9B5DE5]/5'
                    : 'bg-[#0F0F1E] border border-[#2A2A45] hover:border-[#9B5DE5]/60 hover:shadow-lg hover:shadow-[#9B5DE5]/20'
                } ${
                  (selectedBuilding?.slot === i || buildModalSlot === i) 
                    ? 'border-[#9B5DE5] shadow-[0_0_15px_rgba(155,93,229,0.3)]' 
                    : pendingSlot === i 
                      ? 'border-[#9B5DE5]/40 bg-[#9B5DE5]/10 animate-pulse'
                      : ''
                }`}
              >
                {b.buildingType === 0 && (
                  <span className="absolute top-1 left-1 text-[7px] font-mono text-[#2A2A45]">
                    {String.fromCharCode(65 + (i % 5))}{Math.floor(i / 5) + 1}
                  </span>
                )}

                {pendingSlot === i ? (
                  <div className="flex flex-col items-center gap-1">
                    <span className="material-symbols-outlined text-[#9B5DE5] animate-spin text-xl">refresh</span>
                    <span className="text-[7px] font-mono text-[#9B5DE5] uppercase tracking-widest animate-pulse">Building...</span>
                  </div>
                ) : b.buildingType !== 0 ? (
                  <>
                    <div className="w-full h-full bg-center bg-no-repeat bg-contain opacity-100 mix-blend-luminosity filter brightness-90 contrast-110" 
                         style={{ backgroundImage: `url('${(BUILDING_IMAGES as any)[b.buildingType] || BUILDING_IMAGES[8]}')`, backgroundColor: 'transparent' }}>
                    </div>
                    <span className="absolute bottom-1 right-2 text-[8px] font-mono text-[#9B5DE5] font-bold">LV.{b.level}</span>
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-[#9B5DE5] text-white text-[10px] px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-20 font-mono font-bold shadow-lg shadow-primary/30">
                      {BUILDING_NAMES[b.buildingType as keyof typeof BUILDING_NAMES]} · Lv.{b.level}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#9B5DE5]"></div>
                    </div>
                  </>
                ) : (
                  <span className="material-symbols-outlined text-[#2A2A45] text-2xl opacity-20 group-hover:opacity-100 transition-opacity">add</span>
                )}
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-[#9B5DE5]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Build Modal */}
      <AnimatePresence>
        {buildModalSlot !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#0F0F1E] border border-[#9B5DE5]/40 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl shadow-[#9B5DE5]/20"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-fantasy text-sm text-[#C084FC] uppercase tracking-widest">Build Structure</h3>
                <button onClick={() => setBuildModalSlot(null)} className="text-[#5A5880] hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
              <p className="text-[10px] font-mono text-[#5A5880] uppercase tracking-widest">
                Select structure for slot <span className="text-[#9B5DE5]">{String.fromCharCode(65 + (buildModalSlot % 5))}{Math.floor(buildModalSlot / 5) + 1}</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: 1, icon: '⚡', name: 'Credits Forge', desc: 'Produces Credits' },
                  { type: 2, icon: '🌿', name: 'Biomass Farm', desc: 'Produces Biomass' },
                  { type: 3, icon: '💎', name: 'Minera Extractor', desc: 'Produces Minera' },
                  { type: 4, icon: '⚔️', name: 'Vanguard Barracks', desc: 'Produces Vanguard' },
                  { type: 5, icon: '🗼', name: 'Defense Tower', desc: 'Boosts DEF + ATK' },
                  { type: 6, icon: '🛡️', name: 'Shield Wall', desc: 'Boosts DEF' },
                ].map(opt => (
                  <button 
                    key={opt.type}
                    disabled={buildPending}
                    onClick={() => handleBuildStructure(opt.type)}
                    className="p-3 bg-[#080810] hover:bg-[#9B5DE5]/20 border border-[#2A2A45] hover:border-[#9B5DE5]/60 rounded-xl text-left transition-all group disabled:opacity-50"
                  >
                    <div className="text-xl mb-1">{opt.icon}</div>
                    <div className="text-[11px] font-bold text-[#F0EEFF] uppercase">{opt.name}</div>
                    <div className="text-[9px] text-[#5A5880] font-mono mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-[#5A5880] font-mono text-center">Transaction sent to Somnia Testnet · Gas: 2,000,000</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Registration Modal omitted for brevity, keeping existing logic */}
      <AnimatePresence>
        {address && hasBase && hasEmpire === false && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-[#080810]/95 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              className="w-full max-w-md bg-[#0F0F1E] border border-[#2A2A45] rounded-2xl p-4 sm:p-8 shadow-[0_0_50px_rgba(155,93,229,0.2)]"
            >
              <div className="flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 rounded-full bg-[#9B5DE5]/20 flex items-center justify-center border border-[#9B5DE5]/40">
                  <span className="material-symbols-outlined text-3xl text-[#9B5DE5]">auto_fix_high</span>
                </div>
                <div>
                  <h2 className="font-fantasy text-2xl text-[#F0EEFF] tracking-wide mb-2">Empire Registration</h2>
                  <p className="text-sm text-[#A09DC0]">Your citadel is ready. Now, establish your empire identity on the Somnia Testnet.</p>
                </div>
                <div className="w-full space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-mono text-[#5A5880] uppercase tracking-widest pl-1">Empire Name</label>
                    <input type="text" value={regName} onChange={(e) => setRegName(e.target.value.slice(0, 20))} placeholder="Enter empire name..." className="w-full px-4 py-3 rounded-xl bg-[#080810] border border-[#2A2A45] text-[#F0EEFF] focus:border-[#9B5DE5] focus:outline-none transition-all placeholder:text-[#2A2A45] font-fantasy tracking-wide" />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-mono text-[#5A5880] uppercase tracking-widest pl-1">Choose Badge</label>
                    <div className="grid grid-cols-6 gap-2">
                      {badges.map(b => (
                        <button key={b} onClick={() => setRegBadge(b)} className={`aspect-square rounded-lg flex items-center justify-center text-xl transition-all ${regBadge === b ? 'bg-[#9B5DE5] shadow-[0_0_12px_rgba(155,93,229,0.4)]' : 'bg-[#080810] border border-[#2A2A45] hover:border-[#9B5DE5]/50'}`}>{b}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <button disabled={!regName || regPending || regConfirming} onClick={handleRegister} className={`w-full py-4 rounded-xl font-fantasy font-black text-lg tracking-widest transition-all duration-300 ${(!regName || regPending || regConfirming) ? 'bg-[#161628] text-[#2A2A45] cursor-not-allowed' : 'bg-[#9B5DE5] text-white hover:shadow-[0_0_20px_rgba(155,93,229,0.5)] active:scale-[0.98]'}`}>{regPending ? 'TRANSACTING...' : regConfirming ? 'CONFIRMING...' : 'REGISTER EMPIRE'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
