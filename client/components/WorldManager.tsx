import React, { useState, useEffect, useRef } from 'react';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import Button from '@/components/elements/Button';
import { getFileContents, saveFileContents, deleteFiles, compressFiles, uploadFile } from '../api/files';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe, faExclamationTriangle, faUpload, faCog, faArchive, faTrash, faSync, faCheck, faArrowLeft, faEdit } from '@fortawesome/free-solid-svg-icons';
import Spinner from '@/components/elements/Spinner';
// @ts-ignore
import pako from 'pako';
import { getFileDownloadUrl } from '../api/files';
// @ts-ignore
import nbt from './nbt.js';

const JAVA_SETTINGS = [
  { label: 'MOTD', key: 'motd', type: 'text' },
  { label: 'Server IP', key: 'server-ip', type: 'text' },
  { label: 'Server Port', key: 'server-port', type: 'text' },
  { label: 'Max Players', key: 'max-players', type: 'text' },
  { label: 'Online Mode', key: 'online-mode', type: 'toggle' },
  { label: 'Enforce Secure Profile', key: 'enforce-secure-profile', type: 'toggle' },
  { label: 'Prevent Proxy Connections', key: 'prevent-proxy-connections', type: 'toggle' },
  { label: 'Hide Online Players', key: 'hide-online-players', type: 'toggle' },
  { label: 'Enable Status', key: 'enable-status', type: 'toggle' },
  { label: 'Status Heartbeat Interval', key: 'status-heartbeat-interval', type: 'text' },
  { label: 'Game Mode', key: 'gamemode', type: 'text' },
  { label: 'Force Game Mode', key: 'force-gamemode', type: 'toggle' },
  { label: 'Difficulty', key: 'difficulty', type: 'text' },
  { label: 'Hardcore', key: 'hardcore', type: 'toggle' },
  { label: 'PVP', key: 'pvp', type: 'toggle' },
  { label: 'Allow Flight', key: 'allow-flight', type: 'toggle' },
  { label: 'Spawn Protection', key: 'spawn-protection', type: 'text' },
  { label: 'Idle Timeout', key: 'player-idle-timeout', type: 'text' },
  { label: 'Whitelist', key: 'white-list', type: 'toggle' },
  { label: 'Enforce Whitelist', key: 'enforce-whitelist', type: 'toggle' },
  { label: 'OP Permission Level', key: 'op-permission-level', type: 'text' },
  { label: 'Function Permission Level', key: 'function-permission-level', type: 'text' },
  { label: 'Spawn Monsters', key: 'spawn-monsters', type: 'toggle' },
  { label: 'Spawn Animals', key: 'spawn-animals', type: 'toggle' },
  { label: 'Spawn NPCs', key: 'spawn-npcs', type: 'toggle' },
  { label: 'Generate Structures', key: 'generate-structures', type: 'toggle' },
  { label: 'Level Name', key: 'level-name', type: 'text' },
  { label: 'Level Seed', key: 'level-seed', type: 'text' },
  { label: 'Level Type', key: 'level-type', type: 'text' },
  { label: 'Generator Settings', key: 'generator-settings', type: 'text' },
  { label: 'Initial Enabled Packs', key: 'initial-enabled-packs', type: 'text' },
  { label: 'Initial Disabled Packs', key: 'initial-disabled-packs', type: 'text' },
  { label: 'Max World Size', key: 'max-world-size', type: 'text' },
  { label: 'View Distance', key: 'view-distance', type: 'text' },
  { label: 'Simulation Distance', key: 'simulation-distance', type: 'text' },
  { label: 'Entity Broadcast Range', key: 'entity-broadcast-range-percentage', type: 'text' },
  { label: 'Max Tick Time', key: 'max-tick-time', type: 'text' },
  { label: 'Max Chained Neighbor Updates', key: 'max-chained-neighbor-updates', type: 'text' },
  { label: 'Sync Chunk Writes', key: 'sync-chunk-writes', type: 'toggle' },
  { label: 'Region File Compression', key: 'region-file-compression', type: 'text' },
  { label: 'Network Compression Threshold', key: 'network-compression-threshold', type: 'text' },
  { label: 'Native Transport', key: 'use-native-transport', type: 'toggle' },
  { label: 'Rate Limit', key: 'rate-limit', type: 'text' },
  { label: 'Log IPs', key: 'log-ips', type: 'toggle' },
  { label: 'Enable Query', key: 'enable-query', type: 'toggle' },
  { label: 'Query Port', key: 'query.port', type: 'text' },
  { label: 'Enable RCON', key: 'enable-rcon', type: 'toggle' },
  { label: 'RCON Port', key: 'rcon.port', type: 'text' },
  { label: 'RCON Password', key: 'rcon.password', type: 'text' },
  { label: 'Broadcast Console To OPs', key: 'broadcast-console-to-ops', type: 'toggle' },
  { label: 'Broadcast RCON To OPs', key: 'broadcast-rcon-to-ops', type: 'toggle' },
  { label: 'Resource Pack URL', key: 'resource-pack', type: 'text' },
  { label: 'Resource Pack ID', key: 'resource-pack-id', type: 'text' },
  { label: 'Resource Pack SHA1', key: 'resource-pack-sha1', type: 'text' },
  { label: 'Resource Pack Prompt', key: 'resource-pack-prompt', type: 'text' },
  { label: 'Require Resource Pack', key: 'require-resource-pack', type: 'toggle' },
  { label: 'Accepts Transfers', key: 'accepts-transfers', type: 'toggle' },
  { label: 'Code Of Conduct', key: 'enable-code-of-conduct', type: 'toggle' },
  { label: 'Bug Report Link', key: 'bug-report-link', type: 'text' },
  { label: 'Text Filtering Config', key: 'text-filtering-config', type: 'text' },
  { label: 'Text Filtering Version', key: 'text-filtering-version', type: 'text' },
  { label: 'Pause When Empty', key: 'pause-when-empty-seconds', type: 'text' },
  { label: 'Debug', key: 'debug', type: 'toggle' },
  { label: 'JMX Monitoring', key: 'enable-jmx-monitoring', type: 'toggle' },
  { label: 'Management Server', key: 'management-server-enabled', type: 'toggle' },
  { label: 'Management Host', key: 'management-server-host', type: 'text' },
  { label: 'Management Port', key: 'management-server-port', type: 'text' },
  { label: 'Management Secret', key: 'management-server-secret', type: 'text' },
  { label: 'Management TLS', key: 'management-server-tls-enabled', type: 'toggle' },
  { label: 'Management TLS Keystore', key: 'management-server-tls-keystore', type: 'text' },
  { label: 'Management TLS Password', key: 'management-server-tls-keystore-password', type: 'text' },
  { label: 'Management Allowed Origins', key: 'management-server-allowed-origins', type: 'text' },
];

const GAME_RULES = [
  { label: 'Announce Advancements', key: 'minecraft:announceAdvancements', type: 'toggle' },
  { label: 'Command Block Output', key: 'minecraft:commandBlockOutput', type: 'toggle' },
  { label: 'Disable Elytra Movement Check', key: 'minecraft:disableElytraMovementCheck', type: 'toggle' },
  { label: 'Disable Raids', key: 'minecraft:disableRaids', type: 'toggle' },
  { label: 'Do Daylight Cycle', key: 'minecraft:doDaylightCycle', type: 'toggle' },
  { label: 'Do Entity Drops', key: 'minecraft:doEntityDrops', type: 'toggle' },
  { label: 'Do Fire Tick', key: 'minecraft:doFireTick', type: 'toggle' },
  { label: 'Do Insomnia', key: 'minecraft:doInsomnia', type: 'toggle' },
  { label: 'Do Immediate Respawn', key: 'minecraft:doImmediateRespawn', type: 'toggle' },
  { label: 'Do Limited Crafting', key: 'minecraft:doLimitedCrafting', type: 'toggle' },
  { label: 'Do Mob Loot', key: 'minecraft:doMobLoot', type: 'toggle' },
  { label: 'Do Mob Spawning', key: 'minecraft:doMobSpawning', type: 'toggle' },
  { label: 'Do Patrol Spawning', key: 'minecraft:doPatrolSpawning', type: 'toggle' },
  { label: 'Do Tile Drops', key: 'minecraft:doTileDrops', type: 'toggle' },
  { label: 'Do Trader Spawning', key: 'minecraft:doTraderSpawning', type: 'toggle' },
  { label: 'Do Weather Cycle', key: 'minecraft:doWeatherCycle', type: 'toggle' },
  { label: 'Drowning Damage', key: 'minecraft:drowningDamage', type: 'toggle' },
  { label: 'Fall Damage', key: 'minecraft:fallDamage', type: 'toggle' },
  { label: 'Fire Damage', key: 'minecraft:fireDamage', type: 'toggle' },
  { label: 'Forgive Dead Players', key: 'minecraft:forgiveDeadPlayers', type: 'toggle' },
  { label: 'Keep Inventory', key: 'minecraft:keepInventory', type: 'toggle' },
  { label: 'Log Admin Commands', key: 'minecraft:logAdminCommands', type: 'toggle' },
  { label: 'Max Command Chain Length', key: 'minecraft:maxCommandChainLength', type: 'text' },
  { label: 'Max Entity Cramming', key: 'minecraft:maxEntityCramming', type: 'text' },
  { label: 'Mob Griefing', key: 'minecraft:mobGriefing', type: 'toggle' },
  { label: 'Natural Regeneration', key: 'minecraft:naturalRegeneration', type: 'toggle' },
  { label: 'Random Tick Speed', key: 'minecraft:randomTickSpeed', type: 'text' },
  { label: 'Reduced Debug Info', key: 'minecraft:reducedDebugInfo', type: 'toggle' },
  { label: 'Send Command Feedback', key: 'minecraft:sendCommandFeedback', type: 'toggle' },
  { label: 'Show Death Messages', key: 'minecraft:showDeathMessages', type: 'toggle' },
  { label: 'Spawn Radius', key: 'minecraft:spawnRadius', type: 'text' },
  { label: 'Spectators Generate Chunks', key: 'minecraft:spectatorsGenerateChunks', type: 'toggle' },
  { label: 'Universal Anger', key: 'minecraft:universalAnger', type: 'toggle' },
];

export default () => {
  const server = ServerContext.useStoreState(state => state.server.data!);
  const status = ServerContext.useStoreState(state => state.status.value);
  const { clearFlashes, addFlash, clearAndAddHttpError } = useFlash();

  const [activeSeed, setActiveSeed] = useState('Unknown');
  const [newSeed, setNewSeed] = useState('');
  const [worldName, setWorldName] = useState('world');
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState('');
  const [propsMap, setPropsMap] = useState<Record<string, string>>({});
  const [gameruleMap, setGameruleMap] = useState<Record<string, string>>({});
  const [settingsSearch, setSettingsSearch] = useState('');
  const [gameruleSearch, setGameruleSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const [isEditingWorld, setIsEditingWorld] = useState(false);

  useEffect(() => {
    getFileContents(server.uuid, 'server.properties').then(async (content: string) => {
      if (content) {
        setProperties(content);
        const map: Record<string, string> = {};
        content.split('\n').forEach((line: string) => {
          if (line.startsWith('#') || line.trim() === '') return;
          const [k, ...v] = line.split('=');
          if (k) map[k.trim()] = v.join('=').trim();
        });
        setPropsMap(map);

        let activeWorldName = 'world';
        const nameMatch = content.match(/^level-name=(.*)$/m);
        if (nameMatch && nameMatch[1].trim() !== '') activeWorldName = nameMatch[1].trim();
        setWorldName(activeWorldName);

        // Try reading server.properties seed first
        let seed = 'Unknown';
        const seedMatch = content.match(/^level-seed=(.*)$/m);
        if (seedMatch && seedMatch[1].trim() !== '') {
          seed = seedMatch[1].trim();
        }
        
        // Always try to fetch level.dat to get the real active seed
        try {
          const downloadUrl = await getFileDownloadUrl(server.uuid, `/${activeWorldName}/level.dat`);
          if (downloadUrl) {
            const res = await fetch(downloadUrl);
            if (res.ok) {
              const buffer = await res.arrayBuffer();
              const decompressed = pako.inflate(new Uint8Array(buffer));
              nbt.parse(decompressed, (err: any, data: any) => {
                if (!err && data?.value?.Data?.value) {
                  const dataTag = data.value.Data.value;
                  const seedArr = dataTag.WorldGenSettings?.value?.seed?.value || dataTag.RandomSeed?.value;
                  
                  if (Array.isArray(seedArr) && seedArr.length === 2) {
                    const high = BigInt(seedArr[0]);
                    const low = BigInt(seedArr[1] >>> 0); // Unsigned right shift for correct bits
                    const trueSeed = (high * BigInt("4294967296")) + low;
                    seed = trueSeed.toString();
                  }
                }
              });
            }
          }
        } catch (e) {
          console.error("Failed to read level.dat for seed", e);
        }
        setActiveSeed(seed);
      }
    });
  }, [server.uuid]);

  const handleSaveWorldName = async () => {
    setIsEditingWorld(false);
    updateProperty('level-name', worldName);
    await saveAllProperties();
  };

  const handleApplySeed = async () => {
    if (!newSeed) return;
    setLoading(true);
    clearFlashes('world_manager');
    try {
      updateProperty('level-seed', newSeed);
      await saveAllProperties(true, newSeed);
    } catch (e) {
      clearAndAddHttpError({ error: e });
    }
    setLoading(false);
  };

  const updateProperty = (key: string, value: string) => {
    setPropsMap(prev => ({...prev, [key]: value}));
  };

  const updateGamerule = (key: string, value: string) => {
    setGameruleMap(prev => ({...prev, [key]: value}));
  };

  const saveAllProperties = async (isSeedUpdate = false, overrideSeed = '') => {
    setLoading(true);
    clearFlashes('world_manager');
    try {
      let lines = properties.split('\n');
      const handledKeys = new Set<string>();
      
      const currentMap = { ...propsMap };
      if (isSeedUpdate && overrideSeed) currentMap['level-seed'] = overrideSeed;

      lines = lines.map(line => {
        if (line.startsWith('#') || line.trim() === '') return line;
        const [k] = line.split('=');
        const key = k.trim();
        if (currentMap[key] !== undefined) {
           handledKeys.add(key);
           return `${key}=${currentMap[key]}`;
        }
        return line;
      });

      for (const [k, v] of Object.entries(currentMap)) {
         if (!handledKeys.has(k)) {
            lines.push(`${k}=${v}`);
         }
      }

      const newProps = lines.join('\n');
      await saveFileContents(server.uuid, 'server.properties', newProps);
      setProperties(newProps);
      
      if (isSeedUpdate) {
        setActiveSeed(overrideSeed);
        addFlash({ type: 'success', key: 'world_manager', message: 'Seed updated successfully. You need to wipe the world for it to take effect.' });
      } else {
        addFlash({ type: 'success', key: 'world_manager', message: 'Java Server Settings saved successfully. Restart the server to apply changes.' });
      }
    } catch(e) {
      clearAndAddHttpError({ error: e });
    }
    setLoading(false);
  };

  const handleRandomizeSeed = () => {
    setNewSeed(Math.floor(Math.random() * 999999999999999).toString());
  };

  const handleWipeWorld = async () => {
    if (!confirm(`Are you sure you want to permanently delete the world folder (${worldName})? This cannot be undone.`)) return;
    setLoading(true);
    clearFlashes('world_manager');
    try {
      await deleteFiles(server.uuid, '/', [worldName]);
      addFlash({ type: 'success', key: 'world_manager', message: 'World wiped successfully. Restart the server to generate a new one.' });
    } catch (e) {
      clearAndAddHttpError({ error: e });
    }
    setLoading(false);
  };

  const handleExportWorld = async () => {
    setLoading(true);
    clearFlashes('world_manager');
    try {
      await compressFiles(server.uuid, '/', [worldName]);
      addFlash({ type: 'success', key: 'world_manager', message: 'World archived successfully. Check the File Manager for the .tar.gz archive.' });
    } catch (e) {
      clearAndAddHttpError({ error: e });
    }
    setLoading(false);
  };

  const handleUploadZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.zip') && !file.name.endsWith('.tar.gz')) {
      alert('Please upload a .zip or .tar.gz file.');
      return;
    }
    setLoading(true);
    clearFlashes('world_manager');
    try {
      await uploadFile(server.uuid, '/', file.name, file);
      addFlash({ type: 'success', key: 'world_manager', message: 'World archive uploaded! Please extract it in the File Manager.' });
    } catch(err) {
      clearAndAddHttpError({ error: err });
    }
    setLoading(false);
  };

  const isOnline = status !== 'offline';

  if (showSettings) {
    return (
      <div className="mt-4 animate-fade-in">
        <div className="bg-gray-800 rounded-lg p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center border border-gray-700 shadow-md">
          <div className="flex items-center mb-4 md:mb-0">
            <Button color="grey" onClick={() => setShowSettings(false)} className="mr-4">
              <FontAwesomeIcon icon={faArrowLeft} />
            </Button>
            <div>
              <h2 className="text-xl font-bold text-gray-100">Management Options</h2>
              <p className="text-sm text-gray-400 uppercase tracking-wide">Currently editing: <span className="text-indigo-400 font-bold">WORLD JAVA</span></p>
            </div>
          </div>
          <Button color="green" onClick={() => saveAllProperties()}>
            Save Changes
          </Button>
        </div>

        <div className="bg-[#1e2532] rounded-lg border border-[#2b3544] p-6 shadow-xl">
          <div className="flex items-center mb-6 border-b border-[#2b3544] pb-4">
            <FontAwesomeIcon icon={faCog} className="mr-2 text-gray-400" />
            <h3 className="text-lg font-bold text-gray-200">JAVA SERVER SETTINGS</h3>
          </div>

          <div className="relative mb-8">
            <input 
              type="text" 
              placeholder="Search Java server settings..." 
              className="w-full bg-[#151a23] border border-[#2b3544] text-gray-200 px-10 py-3 rounded-lg focus:outline-none focus:border-indigo-500 shadow-inner"
              value={settingsSearch}
              onChange={(e) => setSettingsSearch(e.target.value)}
            />
            <FontAwesomeIcon icon={faCog} className="absolute left-4 top-3.5 text-gray-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {JAVA_SETTINGS.filter(s => s.label.toLowerCase().includes(settingsSearch.toLowerCase()) || s.key.includes(settingsSearch.toLowerCase())).map(setting => (
              <div key={setting.key} className="bg-[#151a23] border border-[#2b3544] rounded-xl p-5 hover:border-indigo-500/50 transition-colors">
                <h4 className="font-bold text-gray-100 text-sm">{setting.label}</h4>
                <p className="text-xs text-gray-500 font-mono mb-4 mt-1">{setting.key}</p>
                
                {setting.type === 'text' ? (
                  <input 
                    type="text"
                    className="w-full bg-[#1e2532] border border-[#2b3544] text-gray-200 px-4 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
                    value={propsMap[setting.key] || ''}
                    onChange={(e) => updateProperty(setting.key, e.target.value)}
                    placeholder="Unset"
                  />
                ) : (
                  <div className="flex items-center mt-2 cursor-pointer" onClick={() => updateProperty(setting.key, propsMap[setting.key] === 'true' ? 'false' : 'true')}>
                    <div className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${propsMap[setting.key] === 'true' ? 'bg-indigo-500' : 'bg-[#2b3544]'}`}>
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${propsMap[setting.key] === 'true' ? 'translate-x-6' : ''}`}></div>
                    </div>
                    <div className="ml-4 flex flex-col">
                      <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">{setting.label}</span>
                      <span className="text-xs text-gray-500">{propsMap[setting.key] === 'true' ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-[#2b3544] pt-6">
            <div className="flex items-center mb-6 pb-4">
              <FontAwesomeIcon icon={faCog} className="mr-2 text-gray-400" />
              <h3 className="text-lg font-bold text-gray-200 uppercase">ACTIVE GAME RULES</h3>
            </div>
            
            <div className="relative mb-6">
              <input 
                type="text" 
                placeholder="Search gamerules..." 
                className="w-full bg-[#151a23] border border-[#2b3544] text-gray-200 px-10 py-3 rounded-lg focus:outline-none focus:border-indigo-500 shadow-inner"
                value={gameruleSearch}
                onChange={(e) => setGameruleSearch(e.target.value)}
              />
              <FontAwesomeIcon icon={faCog} className="absolute left-4 top-3.5 text-gray-500" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {GAME_RULES.filter(s => s.label.toLowerCase().includes(gameruleSearch.toLowerCase()) || s.key.includes(gameruleSearch.toLowerCase())).map(setting => (
                <div key={setting.key} className="bg-[#151a23] border border-[#2b3544] rounded-xl p-5 hover:border-indigo-500/50 transition-colors">
                  <h4 className="font-bold text-gray-100 text-sm">{setting.label}</h4>
                  <p className="text-xs text-gray-500 font-mono mb-4 mt-1">{setting.key}</p>
                  
                  {setting.type === 'text' ? (
                    <input 
                      type="text"
                      className="w-full bg-[#1e2532] border border-[#2b3544] text-gray-200 px-4 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
                      value={gameruleMap[setting.key] || ''}
                      onChange={(e) => updateGamerule(setting.key, e.target.value)}
                      placeholder="Default"
                    />
                  ) : (
                    <div className="flex items-center mt-2 cursor-pointer" onClick={() => updateGamerule(setting.key, gameruleMap[setting.key] === 'true' ? 'false' : 'true')}>
                      <div className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${gameruleMap[setting.key] === 'true' ? 'bg-indigo-500' : 'bg-[#2b3544]'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${gameruleMap[setting.key] === 'true' ? 'translate-x-6' : ''}`}></div>
                      </div>
                      <div className="ml-4 flex flex-col">
                        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">{setting.label}</span>
                        <span className="text-xs text-gray-500">{gameruleMap[setting.key] === 'true' ? 'Active' : 'Disabled'}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-[#2b3544] pt-6">
            <div className="flex items-center mb-6 pb-4">
              <FontAwesomeIcon icon={faCog} className="mr-2 text-gray-400" />
              <h3 className="text-lg font-bold text-gray-200 uppercase">WORLD DATAPACKS</h3>
            </div>
            
            <div className="bg-[#151a23] border border-[#2b3544] rounded-lg p-4">
              <div className="flex gap-4 mb-4">
                <input 
                  type="text" 
                  placeholder="Search datapacks..." 
                  className="flex-1 bg-[#1e2532] border border-[#2b3544] text-gray-200 px-4 py-2 rounded focus:outline-none focus:border-indigo-500 shadow-inner"
                  disabled
                />
                <Button color="grey" disabled>
                  <FontAwesomeIcon icon={faSync} className="mr-2" /> Refresh
                </Button>
              </div>
              <div className="text-center p-8 border border-[#2b3544] rounded text-gray-500">
                No datapacks found in the world directory.
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <Spinner size="large" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 animate-fade-in">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6 flex justify-between items-center border border-gray-700 shadow-md">
        <div className="flex items-center">
          <div className="bg-indigo-600/20 p-3 rounded-lg mr-4">
            <FontAwesomeIcon icon={faGlobe} className="text-indigo-400 text-2xl" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-100">World Manager</h2>
            <p className="text-sm text-gray-400">Manage and configure Minecraft worlds for this server.</p>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded px-4 py-2 flex items-center">
          <span className="text-gray-400 text-sm mr-4">Target World:</span>
          {isEditingWorld ? (
            <div className="flex items-center">
              <input 
                type="text" 
                value={worldName} 
                onChange={e => setWorldName(e.target.value)} 
                className="bg-gray-800 text-white px-2 py-1 rounded border border-indigo-500 focus:outline-none w-32 font-mono text-sm"
              />
              <button onClick={handleSaveWorldName} className="ml-2 text-green-400 hover:text-green-300">
                <FontAwesomeIcon icon={faCheck} />
              </button>
            </div>
          ) : (
            <div className="flex items-center cursor-pointer group" onClick={() => setIsEditingWorld(true)}>
              <span className="text-gray-200 font-mono">{worldName}</span>
              <FontAwesomeIcon icon={faEdit} className="ml-3 text-gray-600 group-hover:text-indigo-400 transition-colors" />
            </div>
          )}
        </div>
      </div>

      {/* Online Warning */}
      {isOnline && (
        <div className="bg-red-500/10 border-l-4 border-red-500 rounded-r-lg p-4 mb-6 flex justify-between items-center">
          <div className="flex items-center text-red-400">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl mr-3" />
            <div>
              <h3 className="font-bold text-red-500">Server is currently online</h3>
              <p className="text-sm">Making world changes while the server is running might cause corruption. Current status: <span className="font-bold uppercase">{status}</span></p>
            </div>
          </div>
          <Button color="red" size="small" onClick={() => {/* force stop could go here */}}>
            Force Proceed
          </Button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        
        {/* Upload Box */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 flex flex-col">
          <h3 className="text-lg font-bold text-gray-200 mb-2 flex items-center">
            <FontAwesomeIcon icon={faUpload} className="mr-2 text-gray-400" /> World Upload
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Upload a <span className="font-mono bg-gray-900 px-1 rounded text-gray-300">.zip</span> or <span className="font-mono bg-gray-900 px-1 rounded text-gray-300">.tar.gz</span> archive of your Java world. Extract it manually in the File Manager after upload.
          </p>
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-600 rounded-lg hover:border-indigo-500 transition-colors bg-gray-900 relative group cursor-pointer">
            <input 
              type="file" 
              accept=".zip,.tar.gz" 
              onChange={handleUploadZip} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              disabled={loading}
            />
            <div className="text-center p-8">
              <FontAwesomeIcon icon={faUpload} className="text-4xl text-gray-500 group-hover:text-indigo-400 mb-4 transition-colors" />
              <p className="font-bold text-gray-300 group-hover:text-white transition-colors">Select World Archive</p>
              <p className="text-xs text-gray-500 mt-1">CLICK TO BROWSE YOUR FILES</p>
            </div>
          </div>
        </div>

        {/* Seed Management */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 flex flex-col">
          <h3 className="text-lg font-bold text-gray-200 mb-2 flex items-center">
            <FontAwesomeIcon icon={faSync} className="mr-2 text-gray-400" /> Seed Management
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Updating the seed will reset the world on next wipe. Adjust gamerules, difficulty, and advanced settings.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Active World Seed</label>
              <div className="bg-gray-900 border border-gray-700 p-3 rounded text-gray-300 font-mono w-full">
                {activeSeed}
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">New Generation Seed</label>
              <input 
                type="text" 
                value={newSeed}
                onChange={(e) => setNewSeed(e.target.value)}
                placeholder="Leave blank for random or enter a new seed"
                className="bg-gray-900 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 p-3 rounded text-gray-200 font-mono w-full outline-none transition-colors"
              />
            </div>
            
            <div className="flex gap-4 pt-2">
              <Button color="grey" isSecondary onClick={handleRandomizeSeed} disabled={loading} className="flex-1 flex justify-center">
                <FontAwesomeIcon icon={faSync} className="mr-2" /> Randomize
              </Button>
              <Button color="green" onClick={handleApplySeed} disabled={loading || !newSeed} className="flex-1 flex justify-center">
                <FontAwesomeIcon icon={faCheck} className="mr-2" /> Apply Seed
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel Grid */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-200 mb-4 flex items-center">
          <FontAwesomeIcon icon={faCog} className="mr-2 text-gray-400" /> World Control Panel
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-5 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-gray-200 mb-1">Server Properties</h4>
              <p className="text-sm text-gray-400 mb-4">Edit advanced Java server settings like MOTD, Max Players, etc.</p>
            </div>
            <Button color="primary" onClick={() => setShowSettings(true)} className="w-full justify-center">
              <FontAwesomeIcon icon={faCog} className="mr-2" /> Manage Settings
            </Button>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-5 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-gray-200 mb-1">Archive Export</h4>
              <p className="text-sm text-gray-400 mb-4">Create and download a full backup of the active world folder.</p>
            </div>
            <Button color="grey" onClick={handleExportWorld} disabled={loading} className="w-full justify-center">
              <FontAwesomeIcon icon={faArchive} className="mr-2" /> Export World
            </Button>
          </div>
          
          <div className="bg-gray-900 border border-red-900/50 rounded-lg p-5 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-red-400 mb-1">Factory Reset</h4>
              <p className="text-sm text-gray-400 mb-4">Permanently wipe all world data. This cannot be recovered.</p>
            </div>
            <Button color="red" onClick={handleWipeWorld} disabled={loading} className="w-full justify-center">
              <FontAwesomeIcon icon={faTrash} className="mr-2" /> Wipe World
            </Button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Spinner size="large" />
        </div>
      )}
    </div>
  );
};
