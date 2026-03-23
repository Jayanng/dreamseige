import React from 'react';
import { NavLink } from 'react-router-dom';
import { Castle, Swords, Trophy, History } from 'lucide-react';

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#080810]/90 backdrop-blur-lg border-t border-[#2A2A45] flex items-center justify-around px-4 z-50">
      <NavLink 
        to="/empire" 
        className={({ isActive }) => 
          `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary' : 'text-[#5A5880]'}`
        }
      >
        <Castle className="w-5 h-5" />
        <span className="text-[10px] uppercase font-bold tracking-tighter">Empire</span>
      </NavLink>
      
      <NavLink 
        to="/siege" 
        className={({ isActive }) => 
          `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary' : 'text-[#5A5880]'}`
        }
      >
        <Swords className="w-5 h-5" />
        <span className="text-[10px] uppercase font-bold tracking-tighter">Siege</span>
      </NavLink>
      
      <NavLink 
        to="/legends" 
        className={({ isActive }) => 
          `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary' : 'text-[#5A5880]'}`
        }
      >
        <Trophy className="w-5 h-5" />
        <span className="text-[10px] uppercase font-bold tracking-tighter">Hall</span>
      </NavLink>
      
      <NavLink 
        to="/battlelog" 
        className={({ isActive }) => 
          `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary' : 'text-[#5A5880]'}`
        }
      >
        <History className="w-5 h-5" />
        <span className="text-[10px] uppercase font-bold tracking-tighter">Log</span>
      </NavLink>
    </nav>
  );
}
