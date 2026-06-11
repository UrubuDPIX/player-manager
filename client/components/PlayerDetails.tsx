import React, { useEffect, useState } from 'react';
import PageContentBlock from '@/components/elements/PageContentBlock';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faTrash, faCog, faGavel, faCrown, faUserSlash, faRunning, faWrench, faSkull, faShieldAlt, faSync, faBox } from '@fortawesome/free-solid-svg-icons';
import Button from '@/components/elements/Button';
import { getPlayerDataUrl, sendCommand, getServerLog, getPlayerStats, listPlayerData, uploadFile } from '../api/files';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import { Buffer } from 'buffer';
const pako = require('pako');
const nbt = require('./nbt');

const InventorySlot = ({ item, slotIndex, onMoveItem, isTransparent = false, isHotbarSlot = false, className = "" }: { item?: any, slotIndex?: number, onMoveItem?: (from: number, to: number) => void, isTransparent?: boolean, isHotbarSlot?: boolean, className?: string }) => {
  const [isHovered, setIsHovered] = useState(false);

  const sizeClasses = isHotbarSlot ? 'w-[32px] h-[32px] min-w-[32px] min-h-[32px]' : 'w-10 h-10 md:w-12 md:h-12 min-w-[40px] min-h-[40px] md:min-w-[48px] md:min-h-[48px]';
  const bgClasses = isTransparent ? 'bg-transparent' : 'bg-[#8b8b8b] border-2 border-[#373737] border-t-[#ffffff] border-l-[#ffffff]';

  if (!item) {
    return (
      <div 
        className={`${sizeClasses} shrink-0 aspect-square ${bgClasses} ${className}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (slotIndex !== undefined && onMoveItem) {
            const fromSlot = parseInt(e.dataTransfer.getData('text/plain'));
            if (!isNaN(fromSlot) && fromSlot !== slotIndex) {
              onMoveItem(fromSlot, slotIndex);
            }
          }
        }}
      ></div>
    );
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

  const getMaxDurability = (id: string) => {
    if (!id) return 0;
    if (id.includes('netherite')) return 2031;
    if (id.includes('diamond')) return 1561;
    if (id.includes('iron')) return 250;
    if (id.includes('golden')) return 32;
    if (id.includes('stone')) return 131;
    if (id.includes('wooden') || id.includes('leather')) return 59;
    if (id.includes('bow')) return 384;
    if (id.includes('trident')) return 250;
    if (id.includes('shield')) return 336;
    if (id.includes('elytra')) return 432;
    if (id.includes('fishing_rod')) return 64;
    if (id.includes('shears')) return 238;
    if (id.includes('flint_and_steel')) return 64;
    return 0;
  };

  const damage = item.components?.value?.['minecraft:damage']?.value ?? item.tag?.value?.Damage?.value;
  const maxDurability = getMaxDurability(id);
  const durabilityPercent = maxDurability > 0 && damage !== undefined ? Math.max(0, (maxDurability - damage) / maxDurability) : null;

  const formatName = (str: string) => {
    return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const enchants = getEnchants();
  const displayName = getCustomName() || formatName(id);

  return (
    <div 
      className={`${sizeClasses} shrink-0 ${bgClasses} relative flex items-center justify-center ${className} ${isEnchanted ? 'enchanted' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable={item ? true : false}
      onDragStart={(e) => {
        if (slotIndex !== undefined) e.dataTransfer.setData('text/plain', slotIndex.toString());
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (slotIndex !== undefined && onMoveItem) {
          const fromSlot = parseInt(e.dataTransfer.getData('text/plain'));
          if (!isNaN(fromSlot) && fromSlot !== slotIndex) {
            onMoveItem(fromSlot, slotIndex);
          }
        }
      }}
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
        className="absolute inset-0 m-auto w-[85%] h-[85%] object-contain"
        style={{ imageRendering: 'pixelated' }}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (!target.dataset.fallback) {
             target.dataset.fallback = "1";
             target.src = `https://minecraft-api.vercel.app/images/blocks/${id}.png`;
          } else if (target.dataset.fallback === "1") {
             target.dataset.fallback = "2";
             target.src = `https://minecraft-api.vercel.app/images/items/${id}.png`;
          } else {
             target.style.opacity = '0';
          }
        }}
      />
      {count > 1 && (
        <span className="absolute bottom-0 right-1 text-white font-bold z-10" style={{ fontSize: '0.7rem', textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>
          {count}
        </span>
      )}
      
      {/* Durability Bar */}
      {durabilityPercent !== null && (
        <div className="absolute bottom-[2px] left-[2px] right-[2px] h-[2px] bg-black z-10">
          <div 
            className="h-full" 
            style={{ 
              width: `${durabilityPercent * 100}%`,
              backgroundColor: durabilityPercent > 0.5 ? '#00ff00' : durabilityPercent > 0.2 ? '#ffff00' : '#ff0000'
            }} 
          />
        </div>
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
          {durabilityPercent !== null && (
            <div className="text-gray-400 mt-1">Durability: {maxDurability - damage} / {maxDurability}</div>
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
  const [statsData, setStatsData] = useState<any>(null);
  const [firstPlayed, setFirstPlayed] = useState<string>('Unknown');
  const [lastSeen, setLastSeen] = useState<string>('Unknown');
  const [isOnline, setIsOnline] = useState(player.online);
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

  const handleMoveItem = async (fromSlot: number, toSlot: number) => {
    if (isOnline) {
      addFlash({ key: 'players', type: 'warning', message: 'O jogador está online! Para mover itens, ele precisa deslogar.' });
      return;
    }

    if (!nbtData || !nbtData.value || !nbtData.value.Inventory || !nbtData.value.Inventory.value || !nbtData.value.Inventory.value.value) return;
    
    // Create a new NBT tree reference
    const newNbtData = { ...nbtData };
    const inventoryList = [...newNbtData.value.Inventory.value.value];
    
    const fromItemIndex = inventoryList.findIndex((i: any) => i.Slot.value === fromSlot);
    const toItemIndex = inventoryList.findIndex((i: any) => i.Slot.value === toSlot);

    if (fromItemIndex !== -1) {
      // Clone items to avoid mutating old state directly
      const fromItem = { ...inventoryList[fromItemIndex], Slot: { type: 'byte', value: toSlot } };
      
      if (toItemIndex !== -1) {
        const toItem = { ...inventoryList[toItemIndex], Slot: { type: 'byte', value: fromSlot } };
        inventoryList[fromItemIndex] = fromItem;
        inventoryList[toItemIndex] = toItem;
      } else {
        inventoryList[fromItemIndex] = fromItem;
      }
      
      newNbtData.value.Inventory.value.value = inventoryList;
      setNbtData(newNbtData);

      try {
        // nbt library supports writeUncompressed natively (prismarine-nbt)
        const buffer = nbt.writeUncompressed(newNbtData);
        const gzipped = pako.gzip(buffer);
        await uploadFile(server.uuid, 'world/playerdata', `${player.uuid}.dat`, gzipped);
        
        clearFlashes('players');
        addFlash({ key: 'players', type: 'success', message: 'Inventário atualizado e salvo no servidor!' });
      } catch (e) {
        console.error('Failed to upload NBT:', e);
        addFlash({ key: 'players', type: 'danger', message: 'Erro ao salvar o inventário no servidor.' });
      }
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
      
      const stats = await getPlayerStats(server.uuid, player.uuid);
      const { files, serverTime } = await listPlayerData(server.uuid);
      
      const playerFile = files.find((f: any) => f.attributes.name === `${player.uuid}.dat`);
      if (playerFile) {
        const modTime = new Date(playerFile.attributes.modified_at).getTime();
        setIsOnline(Math.abs(serverTime - modTime) < 25000);
        
        const spZone = 'America/Sao_Paulo';
        const formatOptions: Intl.DateTimeFormatOptions = { 
          timeZone: spZone, day: '2-digit', month: '2-digit', year: 'numeric', 
          hour: '2-digit', minute: '2-digit', second: '2-digit' 
        };
        
        try {
          // Fallback creation time se o Linux não manter (algumas VMs perdem BTime)
          setFirstPlayed(new Date(playerFile.attributes.created_at).toLocaleString('pt-BR', formatOptions));
          setLastSeen(new Date(playerFile.attributes.modified_at).toLocaleString('pt-BR', formatOptions));
        } catch (e) {}
      } else {
        setIsOnline(false);
      }

      setNbtData(parsed);
      setStatsData(stats);
    } catch (error) {
      console.error('Failed to parse NBT:', error);
    } finally {
      if (!isBackground) setLoadingNbt(false);
    }
  };

  useEffect(() => {
    fetchNbt(false);
    // Removemos o fetchNbt(true) daqui para não floodar o servidor com /save-all.
    // O plugin de sync já escreve o arquivo .dat a cada 5 segundos de forma leve.
    const interval = setInterval(() => fetchNbt(false), 10000);
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
        !line.includes('logged in with entity id') && // Remove coordenada login
        !line.includes('UUID of player') && // Remove hash UUID
        !line.includes('lost connection: Disconnected') // Limpa spam normal de disconnect
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
  const isOp = player.isOp;

  const playtimeTicks = statsData?.stats?.['minecraft:custom']?.['minecraft:play_time'] || 0;
  const playtimeSeconds = Math.floor(playtimeTicks / 20);
  const hours = Math.floor(playtimeSeconds / 3600);
  const minutes = Math.floor((playtimeSeconds % 3600) / 60);
  const playtimeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const HealthBar = ({ health }: { health: number }) => {
    const maxHearts = Math.max(10, Math.ceil(health / 2));
    return (
      <div className="flex items-center" style={{ gap: '-1px' }} title={`${health}/20 Health`}>
        {Array.from({ length: maxHearts }).map((_, i) => {
          const value = health - i * 2;
          let bgPos = '-32px 0px'; // empty
          if (value >= 2) bgPos = '-104px 0px';
          else if (value > 0) bgPos = '-122px 0px';
          
          return (
            <div key={i} style={{
                width: '18px',
                height: '18px',
                backgroundImage: 'url(https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/gui/icons.png)',
                backgroundSize: '512px 512px',
                backgroundPosition: bgPos,
                imageRendering: 'pixelated'
            }} />
          );
        })}
      </div>
    );
  };

  const FoodBar = ({ food }: { food: number }) => {
    const maxFood = 10;
    return (
      <div className="flex items-center" style={{ gap: '-1px' }} title={`${food}/20 Hunger`}>
        {Array.from({ length: maxFood }).map((_, i) => {
          const value = food - (9 - i) * 2;
          let bgPos = '-32px -54px'; // empty
          if (value >= 2) bgPos = '-104px -54px';
          else if (value > 0) bgPos = '-122px -54px';
          
          return (
            <div key={i} style={{
                width: '18px',
                height: '18px',
                backgroundImage: 'url(https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/gui/icons.png)',
                backgroundSize: '512px 512px',
                backgroundPosition: bgPos,
                imageRendering: 'pixelated'
            }} />
          );
        })}
      </div>
    );
  };

  const getStat = (category: string, key: string) => statsData?.stats?.[category]?.[key] || 0;
  const getCustomStat = (key: string) => getStat('minecraft:custom', key);

  const deaths = getCustomStat('minecraft:deaths');
  const playerKills = getCustomStat('minecraft:player_kills');
  const kdr = deaths === 0 ? playerKills.toFixed(1) : (playerKills / deaths).toFixed(1);
  const timeSinceDeathTicks = getCustomStat('minecraft:time_since_death');
  
  const formatTime = (ticks: number) => {
    const seconds = Math.floor(ticks / 20);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const blocksTravelled = {
    Walk: Math.floor(getCustomStat('minecraft:walk_one_cm') / 100),
    Sprint: Math.floor(getCustomStat('minecraft:sprint_one_cm') / 100),
    Crouch: Math.floor(getCustomStat('minecraft:crouch_one_cm') / 100),
    Swim: Math.floor(getCustomStat('minecraft:swim_one_cm') / 100),
    Fly: Math.floor(getCustomStat('minecraft:fly_one_cm') / 100)
  };

  const itemsPickedUp = Object.entries(statsData?.stats?.['minecraft:picked_up'] || {})
    .sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 10);
  const itemsUsed = Object.entries(statsData?.stats?.['minecraft:used'] || {})
    .sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 10);
  const mobsKilled = Object.entries(statsData?.stats?.['minecraft:killed'] || {})
    .sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 10);

  const formatStatName = (str: string) => str.replace('minecraft:', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  
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
              <span className={`px-2 py-1 text-xs rounded border ${isOnline ? 'bg-green-900 text-green-300 border-green-700' : 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
              {isOp && <span className="px-2 py-1 bg-yellow-900 text-yellow-300 text-xs rounded border border-yellow-700">OP</span>}
              <span className="px-2 py-1 bg-blue-900 text-blue-300 text-xs rounded border border-blue-700">
                {gamemode === 1 ? 'Creative' : gamemode === 2 ? 'Adventure' : gamemode === 3 ? 'Spectator' : 'Survival'}
              </span>
            </div>
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
            <div className="font-semibold text-gray-200">{firstPlayed}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Last Login</div>
            <div className="font-semibold text-gray-200">{lastSeen}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Last Seen</div>
            <div className="font-semibold text-gray-200">{lastSeen}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Playtime</div>
            <div className="font-semibold text-gray-200">{playtimeString}</div>
          </div>
        </div>
      </div>

      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Side: Avatar & Armor & Main Inventory */}
          <div className="bg-[#c6c6c6] border-[4px] border-[#555555] border-t-white border-l-white p-4 w-max mx-auto" style={{ imageRendering: 'pixelated' }}>
            <div className="flex gap-4 mb-4">
              {/* Armor Slots */}
              <div className="flex flex-col gap-1 w-12 shrink-0">
                <InventorySlot item={inventory.find((i: any) => (i.Slot?.value ?? i.slot?.value) === 103)} slotIndex={103} onMoveItem={handleMoveItem} /> {/* Helmet */}
                <InventorySlot item={inventory.find((i: any) => (i.Slot?.value ?? i.slot?.value) === 102)} slotIndex={102} onMoveItem={handleMoveItem} /> {/* Chestplate */}
                <InventorySlot item={inventory.find((i: any) => (i.Slot?.value ?? i.slot?.value) === 101)} slotIndex={101} onMoveItem={handleMoveItem} /> {/* Leggings */}
                <InventorySlot item={inventory.find((i: any) => (i.Slot?.value ?? i.slot?.value) === 100)} slotIndex={100} onMoveItem={handleMoveItem} /> {/* Boots */}
              </div>

              {/* 3D Skin Preview Mockup */}
              <div className="flex-1 bg-black/20 rounded flex items-center justify-center p-2 relative">
                <img src={`https://nmsr.nickac.dev/fullbody/${player.uuid}`} alt="Player Body" className="h-48 object-contain" />
              </div>

              {/* Shield/Offhand */}
              <div className="flex flex-col justify-end gap-1 w-12 shrink-0">
                <InventorySlot item={inventory.find((i: any) => (i.Slot?.value ?? i.slot?.value) === -106)} slotIndex={-106} onMoveItem={handleMoveItem} />
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
                <InventorySlot key={`inv-${i}`} item={inventory.find((item: any) => (item.Slot?.value ?? item.slot?.value) === i + 9)} slotIndex={i + 9} onMoveItem={handleMoveItem} />
              ))}
            </div>
          </div>

          {/* Right Side: Ender Chest & Stats & Hotbar */}
          <div className="flex flex-col items-center">
            {/* Ender Chest 3x9 */}
            <div className="bg-[#c6c6c6] border-[4px] border-[#555555] border-t-white border-l-white p-2 mb-6 w-max" style={{ imageRendering: 'pixelated' }}>
              <div className="grid grid-cols-9 gap-1">
                {Array.from({ length: 27 }).map((_, i) => (
                  <InventorySlot key={`ender-${i}`} item={nbtData?.value?.EnderItems?.value?.value?.find((item: any) => (item.Slot?.value ?? item.slot?.value) === i)} />
                ))}
              </div>
            </div>
            
            {showStats && (
              <div className="w-[416px] md:w-[488px] mb-1 px-1">
                {/* Health & Food Row */}
                <div className="flex justify-between items-end w-full mb-1">
                  <HealthBar health={health} />
                  <FoodBar food={foodLevel} />
                </div>
                
                {/* XP Bar */}
                <div 
                  className="relative mx-auto mt-4 mb-2"
                  style={{
                    width: '364px',
                    height: '10px',
                    backgroundImage: 'url(https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/gui/icons.png)',
                    backgroundSize: '512px 512px',
                    backgroundPosition: '0px -128px',
                    imageRendering: 'pixelated'
                  }}
                >
                  <div 
                    className="absolute top-0 left-0 h-full" 
                    style={{ 
                      width: `${(nbtData?.value?.XpP?.value || 0) * 100}%`,
                      backgroundImage: 'url(https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/gui/icons.png)',
                      backgroundSize: '512px 512px',
                      backgroundPosition: '0px -138px',
                      imageRendering: 'pixelated'
                    }}
                  ></div>
                  <span className="absolute w-full text-center font-bold z-10 text-[#80ff20]" style={{ fontSize: '16px', textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000', top: '-18px' }}>
                    {loadingNbt ? '...' : nbtData?.value?.XpLevel?.value || 0}
                  </span>
                </div>
              </div>
            )}

            {/* Hotbar 1x9 */}
            <div className="bg-[#c6c6c6] border-[4px] border-[#555555] border-t-white border-l-white p-2 mt-1 w-max mx-auto" style={{ imageRendering: 'pixelated' }}>
              <div className="grid grid-cols-9 gap-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <InventorySlot key={`hotbar-${i}`} item={inventory.find((item: any) => (item.Slot?.value ?? item.slot?.value) === i)} slotIndex={i} onMoveItem={handleMoveItem} />
                ))}
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
          <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6b7280; }
          `}</style>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
             <div className="bg-[#2a303c] rounded p-4 border border-gray-700 flex flex-col justify-center">
                <div className="text-gray-400 text-xs mb-1 flex items-center gap-2"><FontAwesomeIcon icon={faCog} /> Gamemode</div>
                <div className="text-white font-bold">{gamemode === 1 ? 'Creative' : gamemode === 2 ? 'Adventure' : gamemode === 3 ? 'Spectator' : 'Survival'}</div>
             </div>
             <div className="bg-[#2a303c] rounded p-4 border border-gray-700 flex flex-col justify-center">
                <div className="text-gray-400 text-xs mb-1 flex items-center gap-2"><FontAwesomeIcon icon={faSkull} /> Last Death</div>
                <div className="text-white font-bold">{formatTime(timeSinceDeathTicks)}</div>
             </div>
             <div className="bg-[#2a303c] rounded p-4 border border-gray-700 flex flex-col justify-center">
                <div className="text-gray-400 text-xs mb-1 flex items-center gap-2"><FontAwesomeIcon icon={faShieldAlt} /> KDR</div>
                <div className="text-white font-bold">{kdr}</div>
             </div>
             <div className="bg-[#2a303c] rounded p-4 border border-gray-700 flex flex-col justify-center">
                <div className="text-gray-400 text-xs mb-1 flex items-center gap-2"><FontAwesomeIcon icon={faSkull} /> Deaths</div>
                <div className="text-white font-bold">{deaths}</div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
             <div className="bg-[#2a303c] rounded p-4 border border-gray-700 overflow-hidden">
                <h3 className="text-white text-sm font-bold mb-4 flex items-center gap-2"><FontAwesomeIcon icon={faBox} className="text-gray-400" /> Items Picked Up</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                   {itemsPickedUp.map(([key, val]) => (
                      <div key={key} className="flex justify-between items-center text-xs">
                         <div className="flex items-center gap-2 text-gray-300">
                            <img src={`https://api.minecraftitems.xyz/api/item/${key.replace('minecraft:', '')}`} className="w-4 h-4" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                            {formatStatName(key)}
                         </div>
                         <div className="text-white font-mono">{val as number}</div>
                      </div>
                   ))}
                </div>
             </div>
             
             <div className="bg-[#2a303c] rounded p-4 border border-gray-700 overflow-hidden">
                <h3 className="text-white text-sm font-bold mb-4 flex items-center gap-2"><FontAwesomeIcon icon={faWrench} className="text-gray-400" /> Items Used</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                   {itemsUsed.map(([key, val]) => (
                      <div key={key} className="flex justify-between items-center text-xs">
                         <div className="flex items-center gap-2 text-gray-300">
                            <img src={`https://api.minecraftitems.xyz/api/item/${key.replace('minecraft:', '')}`} className="w-4 h-4" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                            {formatStatName(key)}
                         </div>
                         <div className="text-white font-mono">{val as number}</div>
                      </div>
                   ))}
                </div>
             </div>

             <div className="bg-[#2a303c] rounded p-4 border border-gray-700 overflow-hidden">
                <h3 className="text-white text-sm font-bold mb-4 flex items-center gap-2"><FontAwesomeIcon icon={faSkull} className="text-gray-400" /> Mobs Killed</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                   {mobsKilled.map(([key, val]) => (
                      <div key={key} className="flex justify-between items-center text-xs">
                         <div className="flex items-center gap-2 text-gray-300">
                            <img src={`https://api.minecraftitems.xyz/api/item/${key.replace('minecraft:', '')}_spawn_egg`} className="w-4 h-4" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                            {formatStatName(key)}
                         </div>
                         <div className="text-white font-mono">{val as number}</div>
                      </div>
                   ))}
                </div>
             </div>

             <div className="bg-[#2a303c] rounded p-4 border border-gray-700 overflow-hidden">
                <h3 className="text-white text-sm font-bold mb-4 flex items-center gap-2"><FontAwesomeIcon icon={faRunning} className="text-gray-400" /> Blocks Travelled</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                   {Object.entries(blocksTravelled).map(([key, val]) => (
                      <div key={key} className="flex justify-between items-center text-xs">
                         <div className="text-gray-300">{key}</div>
                         <div className="text-white font-mono">{val}</div>
                      </div>
                   ))}
                </div>
             </div>
          </div>

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
                  const isAchievement = log.includes('has made the advancement') || log.includes('has completed the challenge');
                  const isServerAction = log.includes('[Server:');
                  
                  let colorClass = 'border-blue-500 text-gray-100 bg-gray-800/30'; // Normal Chat / Action
                  if (isCommand) colorClass = 'border-yellow-500 text-yellow-200 bg-yellow-900/10';
                  if (isAchievement) colorClass = 'border-green-500 text-green-300 bg-green-900/10 font-bold';
                  if (isServerAction) colorClass = 'border-purple-500 text-purple-300 bg-purple-900/10 italic';

                  return (
                    <li key={i} className={`border-l-2 pl-3 py-1 ${colorClass}`}>
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
