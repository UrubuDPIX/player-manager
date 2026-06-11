import React, { useState, useEffect } from 'react';
import PageContentBlock from '@/components/elements/PageContentBlock';
import { getUserCache, listPlayerData } from '../api/files';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan, faPlus, faStar, faGlobe, faUsers } from '@fortawesome/free-solid-svg-icons';
import Button from '@/components/elements/Button';
import PlayerDetails from './PlayerDetails';
import WorldManager from './WorldManager';

interface Player {
  uuid: string;
  name: string;
  health: number;
  food: number;
  isOp: boolean;
  online: boolean;
}

export default () => {
  const server = ServerContext.useStoreState(state => state.server.data!);
  const { clearFlashes, clearAndAddHttpError } = useFlash();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeMainTab, setActiveMainTab] = useState<'players' | 'worlds'>('players');

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        const [cache, { files, serverTime }] = await Promise.all([
          getUserCache(server.uuid),
          listPlayerData(server.uuid)
        ]);

        const fileMods: Record<string, number> = {};
        const datFiles: string[] = [];
        files.forEach((f: any) => {
          if (f.attributes?.name?.endsWith('.dat')) {
            const uuid = f.attributes.name.replace('.dat', '');
            fileMods[uuid] = new Date(f.attributes.modified_at).getTime();
            datFiles.push(uuid);
          }
        });

        const cacheMap = new Map<string, string>();
        cache.forEach(entry => cacheMap.set(entry.uuid, entry.name));

        const mappedPlayers: Player[] = datFiles.map(uuid => {
          const lastMod = fileMods[uuid] || 0;
          // Math.abs to prevent time drift issues if client time is behind server time
          const isOnline = Math.abs(serverTime - lastMod) < 25000;
          
          return {
            uuid: uuid,
            name: cacheMap.get(uuid) || uuid,
            health: 20.0,
            food: 20.0,
            isOp: false,
            online: isOnline
          };
        });
        
        setPlayers(mappedPlayers);
      } catch (error) {
        console.error(error);
        clearAndAddHttpError({ error });
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlayers();
  }, [server.uuid]);

  if (selectedPlayer) {
    return <PlayerDetails player={selectedPlayer} onBack={() => setSelectedPlayer(null)} />;
  }

  const filteredPlayers = players.filter(p => {
    if (filterStatus === 'online' && !p.online) return false;
    if (filterStatus === 'offline' && p.online) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const onlinePlayers = filteredPlayers.filter(p => p.online);
  const offlinePlayers = filteredPlayers.filter(p => !p.online);

  const PlayerCard = ({ player }: { player: Player }) => (
    <div 
      onClick={() => setSelectedPlayer(player)}
      className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center cursor-pointer hover:border-indigo-500 transition-colors"
    >
      <div className="relative mr-4">
        <img 
          src={`https://mc-heads.net/avatar/${player.uuid}/64`} 
          alt={player.name} 
          className="w-16 h-16 rounded"
        />
        {player.online && (
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-gray-800 rounded-full"></div>
        )}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg font-bold text-gray-100">{player.name}</span>
          {player.health !== 20 && <span className="text-red-400 text-sm">♥ {player.health}</span>}
          {player.food !== 20 && <span className="text-yellow-600 text-sm">🍗 {player.food}</span>}
        </div>
        <div className="text-xs text-gray-400 font-mono">{player.uuid}</div>
      </div>
      
      {player.isOp && (
        <div className="ml-4 bg-yellow-600 text-yellow-100 text-xs font-bold px-2 py-1 rounded">
          OP
        </div>
      )}
    </div>
  );

  return (
    <PageContentBlock title={'Players & Worlds'} showFlashKey={'players'}>
      <div className="flex space-x-6 mb-6 border-b border-gray-700">
        <button 
          onClick={() => setActiveMainTab('players')} 
          className={`font-bold pb-3 px-2 border-b-2 text-sm tracking-wide uppercase transition-colors ${activeMainTab === 'players' ? 'text-indigo-500 border-indigo-500' : 'text-gray-400 border-transparent hover:text-gray-200'}`}
        >
          <FontAwesomeIcon icon={faUsers} className="mr-2" /> Players
        </button>
        <button 
          onClick={() => setActiveMainTab('worlds')} 
          className={`font-bold pb-3 px-2 border-b-2 text-sm tracking-wide uppercase transition-colors ${activeMainTab === 'worlds' ? 'text-indigo-500 border-indigo-500' : 'text-gray-400 border-transparent hover:text-gray-200'}`}
        >
          <FontAwesomeIcon icon={faGlobe} className="mr-2" /> World Manager
        </button>
      </div>

      {activeMainTab === 'players' ? (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-50">Players ({players.length}) - Online: {players.filter(p => p.online).length}</h1>
            <div className="flex gap-4">
              <input 
                type="text" 
                placeholder="Search players" 
                className="bg-gray-800 border border-gray-700 text-gray-200 px-4 py-2 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select 
                className="bg-gray-800 border border-gray-700 text-gray-200 px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All players</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>

          {onlinePlayers.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-green-500 mb-4">Online Players ({onlinePlayers.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {onlinePlayers.map(player => (
                  <PlayerCard key={player.uuid} player={player} />
                ))}
              </div>
            </div>
          )}

          {offlinePlayers.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-400 mb-4">Offline Players ({offlinePlayers.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {offlinePlayers.map(player => (
                  <PlayerCard key={player.uuid} player={player} />
                ))}
              </div>
            </div>
          )}

          {filteredPlayers.length === 0 && (
            <div className="text-center text-gray-500 mt-10">
              No players found matching your filters.
            </div>
          )}
        </div>
      ) : (
        <WorldManager />
      )}
    </PageContentBlock>
  );
};
