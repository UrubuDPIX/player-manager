import React, { useEffect, useState } from 'react';
import PageContentBlock from '@/components/elements/PageContentBlock';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faTrash, faCog, faGavel, faCrown, faUserSlash, faRunning, faWrench, faSkull, faShieldAlt, faSync } from '@fortawesome/free-solid-svg-icons';
import Button from '@/components/elements/Button';
import { getPlayerDataUrl, sendCommand, getServerLog } from '../api/files';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import { Buffer } from 'buffer';
const pako = require('pako');
const nbt = require('./nbt');

const InventorySlot = ({ item, className = "" }: { item?: any, className?: string }) => {
  const [isHovered, setIsHovered] = useState(false);

  if (!item) {
    return <div className={`aspect-square bg-[#8b8b8b] border-2 border-[#373737] border-t-[#ffffff] border-l-[#ffffff] ${className}`}></div>;
  }
  
  const id = item.id?.value?.replace('minecraft:', '');
  const count = item.Count?.value ?? item.count?.value ?? 1;
  const isEnchanted = item.components?.value?.['minecraft:enchantments'] || item.tag?.value?.Enchantments || item.components?.value?.['minecraft:enchantment_glint_override']?.value === 1;
  
  const getEnchants = () => {
    let enchs: string[] = [];
    if (item.tag?.value?.Enchantments?.value?.value) {
      const list = item.tag.value.Enchantments.value.value;
      list.forEach((e: any) => {
        const eid = e.id?.value?.replace('minecraft:', '');
        const lvl = e.lvl?.value;
        if (eid) enchs.push(`${eid} ${lvl}`);
      });
    } else if (item.components?.value?.['minecraft:enchantments']?.value?.levels?.value) {
      const levels = item.components.value['minecraft:enchantments'].value.levels.value;
      for (const [key, val] of Object.entries(levels)) {
        enchs.push(`${key.replace('minecraft:', '')} ${(val as any).value}`);
      }
    }
    
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    return enchs.map(e => {
      const parts = e.split(' ');
      const name = parts[0].split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const lvlStr = parseInt(parts[1]) <= 10 ? roman[parseInt(parts[1])] : parts[1];
      return `${name} ${lvlStr}`.trim();
    });
  };

  const getCustomName = () => {
    try {
      const customNameStr = item.components?.value?.['minecraft:custom_name']?.value || item.tag?.value?.display?.value?.Name?.value;
      if (customNameStr) {
        if (customNameStr.startsWith('{')) {
          const parsed = JSON.parse(customNameStr);
          return parsed.text || parsed.extra?.[0]?.text || customNameStr;
        }
        return customNameStr;
      }
    } catch(e) {}
    return null;
  };

  const formatName = (str: string) => {
    return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const enchants = getEnchants();
  const displayName = getCustomName() || formatName(id);

  return (
    <div 
      className={`aspect-square bg-[#8b8b8b] border-2 border-[#373737] border-t-[#ffffff] border-l-[#ffffff] relative flex items-center justify-center p-1 ${className} ${isEnchanted ? 'enchanted' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <style>{`
        @keyframes glint {
          0% { background-position: -100% -100%; }
          100% { background-position: 200% 200%; }
        }
        .enchanted::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, rgba(128,64,255,0) 0%, rgba(128,64,255,0) 35%, rgba(128,64,255,0.6) 50%, rgba(128,64,255,0) 65%, rgba(128,64,255,0) 100%);
          background-size: 200% 200%;
          animation: glint 3s linear infinite;
          mix-blend-mode: screen;
          pointer-events: none;
          z-index: 10;
        }
      `}</style>
      <img 
        src={`https://api.minecraftitems.xyz/api/item/${id}`} 
        alt={id} 
        className="w-full h-full object-contain"
        style={{ imageRendering: 'pixelated' }}
      />
      {count > 1 && (
        <span className="absolute bottom-0 right-1 text-white font-bold z-10" style={{ fontSize: '0.7rem', textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>
          {count}
        </span>
      )}

      {isHovered && (
        <div className="absolute z-50 bottom-[110%] left-1/2 transform -translate-x-1/2 w-max bg-[#110011]/95 border-2 border-[#3b00b8] p-2 rounded shadow-[0_0_10px_rgba(0,0,0,0.8)] pointer-events-none text-left" style={{ fontFamily: 'monospace' }}>
          <div className={`text-base font-bold ${isEnchanted ? 'text-[#55FFFF]' : 'text-white'}`}>
            {displayName}
          </div>
          {enchants.length > 0 && (
            <div className="text-[#AAAAAA] text-sm mt-1">
              {enchants.map((e, idx) => (
                <div key={idx}>{e}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface Player {
  uuid: string;
  name: string;
  health: number;
  food: number;
  isOp: boolean;
  online: boolean;
}

interface Props {
  player: Player;
  onBack: () => void;
}

export default ({ player, onBack }: Props) => {
  const server = ServerContext.useStoreState(state => state.server.data!);
  const { addFlash, clearFlashes } = useFlash();
  const [nbtData, setNbtData] = useState<any>(null);
  const [loadingNbt, setLoadingNbt] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'manage' | 'details' | 'logs'>('inventory');
  
  const [playerLogs, setPlayerLogs] = useState<string[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const executeCommand = async (command: string, successMessage: string) => {
    try {
      clearFlashes('players');
      await sendCommand(server.uuid, command);
      addFlash({ type: 'success', key: 'players', message: successMessage });
    } catch (error) {
      console.error(error);
      addFlash({ type: 'danger', key: 'players', message: `Failed to execute command: ${error}` });
    }
  };

  const fetchNbt = async (isBackground = false, forceSave = false) => {
    try {
      if (!isBackground) setLoadingNbt(true);
      
      if (forceSave) {
        await sendCommand(server.uuid, 'save-all');
        await new Promise(resolve => setTimeout(resolve, 1500)); // wait for file flush
      }

      const downloadUrl = await getPlayerDataUrl(server.uuid, player.uuid);
      
      // Fetch the binary file
      const res = await fetch(downloadUrl);
      const arrayBuffer = await res.arrayBuffer();
      
      // Decompress GZIP
      const decompressed = pako.inflate(new Uint8Array(arrayBuffer));
      
      // Parse NBT using nbt library
      const parsed = await new Promise((resolve, reject) => {
        nbt.parse(Buffer.from(decompressed), (error: any, data: any) => {
          if (error) reject(error);
          else resolve(data);
        });
      });
      
      setNbtData(parsed);
    } catch (error) {
      console.error('Failed to parse NBT:', error);
    } finally {
      if (!isBackground) setLoadingNbt(false);
    }
  };

  useEffect(() => {
    fetchNbt(false);
    const interval = setInterval(() => fetchNbt(true), 10000);
    return () => clearInterval(interval);
  }, [server.uuid, player.uuid]);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    const logData = await getServerLog(server.uuid);
    
    // Split by newline and filter for this player
    const lines = logData.split('\n');
    const filtered = lines
      .filter(line => 
        line.includes('INFO') && 
        line.includes(player.name) && 
        (
          line.includes('<' + player.name + '>') || 
          line.includes('issued') || 
          line.includes('command') || 
          line.includes('[Not Secure]') || 
          line.includes('Async Chat Thread')
        )
      )
      .map(line => {
        // Remove the thread/class noise: [10Jun2026 01:13:55.391] [Server thread/INFO] [net.minecraft.server.MinecraftServer/]: <Okairu> msg
        // Becomes: [10Jun2026 01:13:55.391] <Okairu> msg
        let clean = line.replace(/\] \[[^\]]+\](?: \[[^\]]+\])?: /, '] ');
        clean = clean.replace('[Not Secure] ', ''); // clean up non-secure chat warnings
        return clean;
      })
      .slice(-100); // Get last 100 entries
    
    setPlayerLogs(filtered);
    setLoadingLogs(false);
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab, server.uuid, player.name]);

  // Extract relevant NBT data safely
  const pos = nbtData?.value?.Pos?.value?.value || [0, 0, 0];
  const gamemode = nbtData?.value?.playerGameType?.value ?? 0;
  const health = nbtData?.value?.Health?.value || player.health;
  const foodLevel = nbtData?.value?.foodLevel?.value || player.food;
  const inventory = nbtData?.value?.Inventory?.value?.value || [];

  const showStats = gamemode !== 1 && gamemode !== 3; // Hide in Creative and Spectator

  const HealthBar = ({ health }: { health: number }) => {
    const maxHearts = Math.max(10, Math.ceil(health / 2));
    return (
      <div className="flex gap-0.5 items-center" title={`${health}/20 Health`}>
        {Array.from({ length: maxHearts }).map((_, i) => {
          const value = health - i * 2;
          let type = 'empty';
          if (value >= 2) type = 'full';
          else if (value > 0) type = 'half';
          
          return (
            <div key={i} className="relative w-4 h-4 text-[15px] leading-none flex items-center justify-center">
              <span className="absolute text-gray-700">♥</span>
              {type === 'full' && <span className="absolute text-red-500 drop-shadow-[0_0_2px_rgba(239,68,68,0.8)]">♥</span>}
              {type === 'half' && (
                <span className="absolute text-red-500 drop-shadow-[0_0_2px_rgba(239,68,68,0.8)] overflow-hidden" style={{ width: '50%', left: 0 }}>
                  ♥
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const FoodBar = ({ food }: { food: number }) => {
    const maxFood = 10;
    return (
      <div className="flex gap-0.5 items-center" title={`${food}/20 Hunger`}>
        {Array.from({ length: maxFood }).map((_, i) => {
          const value = food - i * 2;
          let type = 'empty';
          if (value >= 2) type = 'full';
          else if (value > 0) type = 'half';
          
          return (
            <div key={i} className="relative w-4 h-4 text-[13px] leading-none flex items-center justify-center transform scale-x-[-1]">
              <span className="absolute text-gray-700 opacity-50 grayscale">🍗</span>
              {type === 'full' && <span className="absolute text-orange-400 drop-shadow-[0_0_2px_rgba(251,146,60,0.8)]">🍗</span>}
              {type === 'half' && (
                <span className="absolute text-orange-400 drop-shadow-[0_0_2px_rgba(251,146,60,0.8)] overflow-hidden flex justify-end" style={{ width: '50%', right: 0 }}>
                  🍗
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <PageContentBlock title={`Player - ${player.name}`} showFlashKey={'players'}>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
          <FontAwesomeIcon icon={faChevronLeft} size="lg" />
        </button>
        <h1 className="text-2xl font-bold text-gray-50 flex items-center gap-4">
          <img src={`https://mc-heads.net/avatar/${player.uuid}/32`} alt={player.name} className="w-8 h-8 rounded" />
          {player.name}
        </h1>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-sm text-gray-400 font-mono mb-2">{player.uuid}</div>
            <div className="flex gap-2">
              <span className={`px-2 py-1 text-xs rounded border ${player.online ? 'bg-green-900 text-green-300 border-green-700' : 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                {player.online ? 'Online' : 'Offline'}
              </span>
              {isOp && <span className="px-2 py-1 bg-yellow-900 text-yellow-300 text-xs rounded border border-yellow-700">OP</span>}
              <span className="px-2 py-1 bg-blue-900 text-blue-300 text-xs rounded border border-blue-700">
                {gamemode === 1 ? 'Creative' : gamemode === 2 ? 'Adventure' : gamemode === 3 ? 'Spectator' : 'Survival'}
              </span>
            </div>
            {showStats && (
              <div className="mt-3 flex flex-col gap-1">
                <HealthBar health={health} />
                <FoodBar food={foodLevel} />
              </div>
            )}
            <div className="text-xs text-green-500 mt-2 flex items-center gap-2">
              <span>Auto-syncing every 10s</span>
              <button onClick={() => fetchNbt(false, true)} className="hover:text-white transition-colors cursor-pointer" title="Force Save & Sync">
                <FontAwesomeIcon icon={faSync} className={loadingNbt ? "animate-spin text-gray-400" : ""} />
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button className={activeTab === 'inventory' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-700 hover:bg-gray-600'} onClick={() => setActiveTab('inventory')}>Inventory</Button>
            <Button className={activeTab === 'manage' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-700 hover:bg-gray-600'} onClick={() => setActiveTab('manage')}>Manage</Button>
            <Button className={activeTab === 'details' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-700 hover:bg-gray-600'} onClick={() => setActiveTab('details')}>Details</Button>
            <Button className={activeTab === 'logs' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-700 hover:bg-gray-600'} onClick={() => setActiveTab('logs')}>Logs</Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 text-center border-t border-gray-700 pt-6">
          <div>
            <div className="text-sm text-gray-400">First Played</div>
            <div className="font-semibold text-gray-200">21.01.1970, 13:15:40</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Last Login</div>
            <div className="font-semibold text-gray-200">21.01.1970, 13:22:45</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Last Seen</div>
            <div className="font-semibold text-gray-200">21.01.1970, 13:22:46</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Playtime</div>
            <div className="font-semibold text-gray-200">1h 26m</div>
          </div>
        </div>
      </div>

      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side: Avatar & Hotbar/Armor */}
          <div className="bg-[#c6c6c6] p-4 rounded shadow-inner" style={{ imageRendering: 'pixelated' }}>
            <div className="flex gap-4 mb-4">
              {/* Armor Slots */}
              <div className="flex flex-col gap-1 w-12 shrink-0">
                <InventorySlot item={inventory.find((i: any) => (i.Slot?.value ?? i.slot?.value) === 103)} /> {/* Helmet */}
                <InventorySlot item={inventory.find((i: any) => (i.Slot?.value ?? i.slot?.value) === 102)} /> {/* Chestplate */}
                <InventorySlot item={inventory.find((i: any) => (i.Slot?.value ?? i.slot?.value) === 101)} /> {/* Leggings */}
                <InventorySlot item={inventory.find((i: any) => (i.Slot?.value ?? i.slot?.value) === 100)} /> {/* Boots */}
              </div>

              {/* 3D Skin Preview Mockup */}
              <div className="flex-1 bg-black/20 rounded flex items-center justify-center p-2 relative">
                <img src={`https://nmsr.nickac.dev/fullbody/${player.uuid}`} alt="Player Body" className="h-48 object-contain" />
              </div>

              {/* Shield/Offhand */}
              <div className="flex flex-col justify-end gap-1 w-12 shrink-0">
                <InventorySlot item={inventory.find((i: any) => (i.Slot?.value ?? i.slot?.value) === -106)} />
              </div>
              
              {/* Location Info */}
              <div className="flex-1 flex flex-col items-end">
                 <div className="text-gray-800 font-bold mb-4 text-sm text-right">
                   Player Location<br/>
                   X: {loadingNbt ? '...' : pos[0]?.toFixed(1)}<br/>
                   Y: {loadingNbt ? '...' : pos[1]?.toFixed(1)}<br/>
                   Z: {loadingNbt ? '...' : pos[2]?.toFixed(1)}<br/>
                   Dimension: {nbtData?.value?.Dimension?.value?.replace('minecraft:', '') || 'World'}
                 </div>
                 <div className="flex gap-2">
                   <button className="bg-red-500 w-10 h-10 rounded flex items-center justify-center text-white hover:bg-red-600 shadow border-2 border-red-700">
                     <FontAwesomeIcon icon={faTrash} />
                   </button>
                   <button className="bg-purple-500 w-10 h-10 rounded flex items-center justify-center text-white hover:bg-purple-600 shadow border-2 border-purple-700">
                     <FontAwesomeIcon icon={faCog} />
                   </button>
                 </div>
              </div>
            </div>

            {/* Main Inventory 3x9 */}
            <div className="grid grid-cols-9 gap-1 mb-2">
              {Array.from({ length: 27 }).map((_, i) => (
                <InventorySlot key={`inv-${i}`} item={inventory.find((item: any) => (item.Slot?.value ?? item.slot?.value) === i + 9)} />
              ))}
            </div>

            {/* Hotbar 1x9 */}
            <div className="grid grid-cols-9 gap-1">
              {Array.from({ length: 9 }).map((_, i) => (
                <InventorySlot key={`hotbar-${i}`} item={inventory.find((item: any) => (item.Slot?.value ?? item.slot?.value) === i)} />
              ))}
            </div>
          </div>

          {/* Right Side: Ender Chest & Stats */}
          <div>
            <div className="bg-[#c6c6c6] p-4 rounded shadow-inner mb-6" style={{ imageRendering: 'pixelated' }}>
              {/* Ender Chest 3x9 */}
              <div className="grid grid-cols-9 gap-1">
                {Array.from({ length: 27 }).map((_, i) => (
                  <InventorySlot key={`ender-${i}`} item={nbtData?.value?.EnderItems?.value?.value?.find((item: any) => (item.Slot?.value ?? item.slot?.value) === i)} />
                ))}
              </div>
            </div>
            
            <div className="flex justify-between items-center bg-black/40 p-4 rounded">
              <div className="text-red-500 text-xl" title={`Health: ${health}`}>
                {loadingNbt ? 'Loading...' : '♥'.repeat(Math.ceil(health / 2))}
              </div>
              <div className="text-green-500 font-bold text-center">
                Level {loadingNbt ? '...' : nbtData?.value?.XpLevel?.value || 0}
              </div>
              <div className="text-yellow-600 text-xl" title={`Food: ${foodLevel}`}>
                {loadingNbt ? 'Loading...' : '🍗'.repeat(Math.ceil(foodLevel / 2))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'details' && (
        <div className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-gray-400 text-sm font-semibold mb-2">Current Position</h3>
              <div className="text-gray-200 text-sm space-y-1">
                <div><span className="text-red-400">X:</span> {loadingNbt ? '...' : pos[0]?.toFixed(2)}</div>
                <div><span className="text-red-400">Y:</span> {loadingNbt ? '...' : pos[1]?.toFixed(2)}</div>
                <div><span className="text-red-400">Z:</span> {loadingNbt ? '...' : pos[2]?.toFixed(2)}</div>
                <div className="text-indigo-400 mt-2">Dimension: {nbtData?.value?.Dimension?.value?.replace('minecraft:', '') || 'World'}</div>
              </div>
            </div>
            <div>
              <h3 className="text-gray-400 text-sm font-semibold mb-2">Respawn Location (Bed/Anchor)</h3>
              <div className="text-gray-200 text-sm space-y-1">
                <div><span className="text-red-400">X:</span> {nbtData?.value?.SpawnX?.value ?? 'N/A'}</div>
                <div><span className="text-red-400">Y:</span> {nbtData?.value?.SpawnY?.value ?? 'N/A'}</div>
                <div><span className="text-red-400">Z:</span> {nbtData?.value?.SpawnZ?.value ?? 'N/A'}</div>
                <div className="text-indigo-400 mt-2">Dimension: {nbtData?.value?.SpawnDimension?.value?.replace('minecraft:', '') || 'N/A'}</div>
              </div>
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-gray-200 mb-6 border-b border-gray-700 pb-2">Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-4 text-sm">
            <div className="flex justify-between border-b border-gray-700/50 pb-2">
              <span className="text-gray-400">Time Since Rest</span>
              <span className="text-gray-200">{(nbtData?.value?.SleepTimer?.value || 0)} ticks</span>
            </div>
            <div className="flex justify-between border-b border-gray-700/50 pb-2">
              <span className="text-gray-400">Game Mode</span>
              <span className="text-gray-200">{nbtData?.value?.playerGameType?.value === 1 ? 'Creative' : 'Survival'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-700/50 pb-2">
              <span className="text-gray-400">Score</span>
              <span className="text-gray-200">{nbtData?.value?.Score?.value || 0}</span>
            </div>
            <div className="flex justify-between border-b border-gray-700/50 pb-2">
              <span className="text-gray-400">Fall Distance</span>
              <span className="text-gray-200">{nbtData?.value?.FallDistance?.value?.toFixed(2) || '0.00'} m</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-200 mb-6 border-b border-gray-700 pb-2">Player Management Actions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Moderation Card */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faGavel} className="text-red-500" /> Moderation
              </h3>
              <div className="space-y-3">
                <Button color="red" className="w-full justify-start" onClick={() => executeCommand(`kick ${player.name} Kicked by panel admin`, 'Player kicked successfully.')}>
                  <FontAwesomeIcon icon={faRunning} className="mr-3 w-4" /> Kick Player
                </Button>
                <Button color="red" className="w-full justify-start" onClick={() => executeCommand(`ban ${player.name} Banned from the panel`, 'Player banned successfully.')}>
                  <FontAwesomeIcon icon={faUserSlash} className="mr-3 w-4" /> Ban Player
                </Button>
                <Button className="w-full justify-start bg-gray-600 hover:bg-gray-500" onClick={() => executeCommand(`pardon ${player.name}`, 'Player unbanned successfully.')}>
                  <FontAwesomeIcon icon={faUserSlash} className="mr-3 w-4 text-green-400" /> Unban (Pardon)
                </Button>
              </div>
            </div>

            {/* Privileges Card */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faCrown} className="text-yellow-500" /> Privileges
              </h3>
              <div className="space-y-3">
                <Button className="w-full justify-start bg-indigo-600 hover:bg-indigo-500" onClick={() => executeCommand(`op ${player.name}`, 'Player is now a server operator.')}>
                  <FontAwesomeIcon icon={faCrown} className="mr-3 w-4" /> Make Operator
                </Button>
                <Button className="w-full justify-start bg-gray-600 hover:bg-gray-500" onClick={() => executeCommand(`deop ${player.name}`, 'Player operator status revoked.')}>
                  <FontAwesomeIcon icon={faCrown} className="mr-3 w-4 text-gray-400" /> Revoke Operator
                </Button>
                <Button className="w-full justify-start bg-green-700 hover:bg-green-600" onClick={() => executeCommand(`whitelist add ${player.name}`, 'Player added to whitelist.')}>
                  <FontAwesomeIcon icon={faShieldAlt} className="mr-3 w-4" /> Add to Whitelist
                </Button>
                <Button className="w-full justify-start bg-gray-600 hover:bg-gray-500" onClick={() => executeCommand(`whitelist remove ${player.name}`, 'Player removed from whitelist.')}>
                  <FontAwesomeIcon icon={faShieldAlt} className="mr-3 w-4 text-gray-400" /> Remove from Whitelist
                </Button>
              </div>
            </div>

            {/* Utilities Card */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faWrench} className="text-blue-400" /> Gameplay Utility
              </h3>
              <div className="space-y-3">
                <Button className="w-full justify-start bg-blue-600 hover:bg-blue-500" onClick={() => executeCommand(`gamemode creative ${player.name}`, 'Game mode set to Creative.')}>
                  <FontAwesomeIcon icon={faWrench} className="mr-3 w-4" /> Set Creative Mode
                </Button>
                <Button className="w-full justify-start bg-green-600 hover:bg-green-500" onClick={() => executeCommand(`gamemode survival ${player.name}`, 'Game mode set to Survival.')}>
                  <FontAwesomeIcon icon={faWrench} className="mr-3 w-4" /> Set Survival Mode
                </Button>
                <Button className="w-full justify-start bg-gray-600 hover:bg-gray-500" onClick={() => executeCommand(`clear ${player.name}`, 'Player inventory cleared.')}>
                  <FontAwesomeIcon icon={faTrash} className="mr-3 w-4 text-red-400" /> Clear Inventory
                </Button>
                <Button className="w-full justify-start bg-gray-600 hover:bg-gray-500" onClick={() => executeCommand(`kill ${player.name}`, 'Player killed.')}>
                  <FontAwesomeIcon icon={faSkull} className="mr-3 w-4 text-red-400" /> Kill Player
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-200 mb-6 border-b border-gray-700 pb-2 flex justify-between items-center">
            Player Logs & Commands
            <button onClick={fetchLogs} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded cursor-pointer transition-colors">
              Refresh Logs
            </button>
          </h2>
          
          <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-4 font-mono text-sm overflow-y-auto max-h-[500px]">
            {loadingLogs ? (
              <div className="text-gray-400 animate-pulse">Loading logs from server...</div>
            ) : playerLogs.length === 0 ? (
              <div className="text-gray-500 italic">No chat messages or commands found for this player in the latest log.</div>
            ) : (
              <ul className="space-y-2">
                {playerLogs.map((log, i) => {
                  const isCommand = log.includes('issued') || log.includes('command');
                  return (
                    <li key={i} className={`border-l-2 pl-3 py-1 ${isCommand ? 'border-yellow-500 text-yellow-200 bg-yellow-900/10' : 'border-blue-500 text-gray-100 bg-gray-800/30'}`}>
                      {log}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </PageContentBlock>
  );
};
