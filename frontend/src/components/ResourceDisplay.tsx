import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { useGame } from '../context/GameContext'
import { useReactivity } from '../hooks/useReactivity'
import { CONTRACT_ADDRESSES, RESOURCE_VAULT_ABI, BASE_CONTRACT_ABI } from '../constants/contracts'

const ResourceDisplay = () => {
  const { address } = useAccount();
  const { resources, base } = useGame();
  
  // Simulate tick-up for visual flair on load or updates
  const [tickKey, setTickKey] = useState(0);

  useEffect(() => {
    setTickKey(prev => prev + 1);
  }, [resources.timestamp]);

  const resourceTypes = [
    { label: 'Credits', value: resources.gold },
    { label: 'Biomass', value: resources.wood },
    { label: 'Minera', value: resources.stone },
    { label: 'Vanguard', value: resources.vanguard }
  ]

  return (
    <div className="flex flex-wrap items-center gap-y-2">
      {resourceTypes.map((res, i) => (
        <div key={res.label} className="flex items-center shrink-0">
          <div className="flex flex-col">
            <span className="label-text">{res.label}</span>
            <AnimatePresence mode="wait">
              <motion.div 
                key={`${res.label}-${tickKey}`}
                className="flex items-center gap-1 resource-tick"
              >
                <span className="resource-value leading-tight">
                  {res.value.toLocaleString()}
                </span>
                {!!address && <span className="text-[8px] text-accent-teal opacity-40">+</span>}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="w-px h-6 border-l border-[#2A2A45] mx-2 md:mx-4"></div>
        </div>
      ))}

      <div className="flex items-center gap-2 shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-accent-teal live-dot"></span>
        <span className="text-[9px] font-mono text-accent-teal uppercase tracking-widest leading-none">
          Reactivity Live
        </span>
      </div>
    </div>
  )
}

export default ResourceDisplay;
