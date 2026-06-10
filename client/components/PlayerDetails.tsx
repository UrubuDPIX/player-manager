import React, { useEffect, useState } from 'react';
import PageContentBlock from '@/components/elements/PageContentBlock';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faTrash, faCog, faGavel, faCrown, faUserSlash, faRunning, faWrench, faSkull, faShieldAlt } from '@fortawesome/free-solid-svg-icons';
import Button from '@/components/elements/Button';
import { getPlayerDataUrl, sendCommand } from '../api/files';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import pako from 'pako';
import * as nbt from 'prismarine-nbt';
import { Buffer } from 'buffer';

const InventorySlot = ({ item }: { item?: any }) => {
  if (!item) {
    return <div className="aspect-square bg-[#8b8b8b] border-2 border-[#373737] border-t-[#ffffff] border-l-[#ffffff]"></div>;
  }
  
  const id = item.id.value.replace('minecraft:', '');
  const count = item.Count.value;
  
  return (
    <div className="aspect-square bg-[#8b8b8b] border-2 border-[#373737] border-t-[#ffffff] border-l-[#ffffff] relative flex items-center justify-center p-1">
      <img 
        src={`https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.19.4/items/${id}.png`} 
        alt={id} 
        className="w-full h-full object-contain"
        style={{ imageRendering: 'pixelated' }}
        onError={(e) => {
           const target = e.target as HTMLImageElement;
           if (!target.src.includes('blocks')) {
             target.src = `https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.19.4/blocks/${id}.png`;
           }
        }}
      />
      {count > 1 && (
        <span className="absolute bottom-0 right-1 text-white font-bold" style={{ fontSize: '0.7rem', textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>
          {count}
        </span>
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

  const executeCommand = async (command: string, successMessage: string) => {
    try {
      clearFlashes('players');
      await sendCommand(server.uuid, command);
      addFlash({ type: 'success', key: 'players', message: successMessage });
    } catch (error) {
      console.error(error);
      addFlash({ type: 'error', key: 'players', message: `Failed to execute command: ${error}` });
    }
  };

  useEffect(() => {
    const fetchNbt = async () => {
      try {
        setLoadingNbt(true);
        const downloadUrl = await getPlayerDataUrl(server.uuid, player.uuid);
        
        // Fetch the binary file
        const res = await fetch(downloadUrl);
        const arrayBuffer = await res.arrayBuffer();
        
        // Decompress GZIP
        const decompressed = pako.inflate(new Uint8Array(arrayBuffer));
        
        // Parse NBT
        const { parsed } = await nbt.parseUncompressed(Buffer.from(decompressed));
        setNbtData(parsed);
      } catch (error) {
        console.error('Failed to parse NBT:', error);
      } finally {
        setLoadingNbt(false);
      }
    };

    fetchNbt();
  }, [server.uuid, player.uuid]);

  // Extract relevant NBT data safely
  const pos = nbtData?.value?.Pos?.value?.value || [0, 0, 0];
  const health = nbtData?.value?.Health?.value || player.health;
  const foodLevel = nbtData?.value?.foodLevel?.value || player.food;
  const inventory = nbtData?.value?.Inventory?.value?.value || [];
  
  return (
    <PageContentBlock title={`Player - ${player.name}`} showFlashKey={'players'}>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
          <FontAwesomeIcon icon={faChevronLeft} size="lg" />
        </button>
        <h1 className="text-2xl font-bold text-gray-50 flex items-center gap-4">
          <img src={`https://crafatar.com/avatars/${player.uuid}?overlay=true&size=32`} alt={player.name} className="w-8 h-8 rounded" />
          {player.name}
        </h1>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-sm text-gray-400 font-mono mb-2">{player.uuid}</div>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-green-900 text-green-300 text-xs rounded border border-green-700">Online</span>
              {player.isOp && <span className="px-2 py-1 bg-yellow-900 text-yellow-300 text-xs rounded border border-yellow-700">OP Lv.4</span>}
              <span className="px-2 py-1 bg-blue-900 text-blue-300 text-xs rounded border border-blue-700">Survival</span>
            </div>
            <div className="text-xs text-green-500 mt-2">Data in real time</div>
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
              <div className="flex flex-col gap-1">
                <InventorySlot item={inventory.find((i: any) => i.Slot.value === 103)} /> {/* Helmet */}
                <InventorySlot item={inventory.find((i: any) => i.Slot.value === 102)} /> {/* Chestplate */}
                <InventorySlot item={inventory.find((i: any) => i.Slot.value === 101)} /> {/* Leggings */}
                <InventorySlot item={inventory.find((i: any) => i.Slot.value === 100)} /> {/* Boots */}
              </div>

              {/* 3D Skin Preview Mockup */}
              <div className="flex-1 bg-black/20 rounded flex items-center justify-center p-2 relative">
                <img src={`https://crafatar.com/renders/body/${player.uuid}?overlay=true`} alt="Player Body" className="h-48 object-contain" />
              </div>

              {/* Shield/Offhand */}
              <div className="flex flex-col justify-end gap-1">
                <InventorySlot item={inventory.find((i: any) => i.Slot.value === -106)} />
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
                <InventorySlot key={`inv-${i}`} item={inventory.find((item: any) => item.Slot.value === i + 9)} />
              ))}
            </div>

            {/* Hotbar 1x9 */}
            <div className="grid grid-cols-9 gap-1">
              {Array.from({ length: 9 }).map((_, i) => (
                <InventorySlot key={`hotbar-${i}`} item={inventory.find((item: any) => item.Slot.value === i)} />
              ))}
            </div>
          </div>

          {/* Right Side: Ender Chest & Stats */}
          <div>
            <div className="bg-[#c6c6c6] p-4 rounded shadow-inner mb-6" style={{ imageRendering: 'pixelated' }}>
              {/* Ender Chest 3x9 */}
              <div className="grid grid-cols-9 gap-1">
                {Array.from({ length: 27 }).map((_, i) => (
                  <InventorySlot key={`ender-${i}`} item={nbtData?.value?.EnderItems?.value?.value?.find((item: any) => item.Slot.value === i)} />
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
    </PageContentBlock>
  );
};
