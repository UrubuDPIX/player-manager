import React, { useState, useEffect } from 'react';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import Button from '@/components/elements/Button';
import { getFileContents, saveFileContents, deleteFiles, compressFiles, uploadFile } from '../api/files';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe, faExclamationTriangle, faUpload, faCog, faArchive, faTrash, faSync, faCheck } from '@fortawesome/free-solid-svg-icons';
import Spinner from '@/components/elements/Spinner';

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
  const [settingsSearch, setSettingsSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    getFileContents(server.uuid, 'server.properties').then((content: string) => {
      if (content) {
        setProperties(content);
        const map: Record<string, string> = {};
        content.split('\n').forEach((line: string) => {
          if (line.startsWith('#') || line.trim() === '') return;
          const [k, ...v] = line.split('=');
          if (k) map[k.trim()] = v.join('=').trim();
        });
        setPropsMap(map);

        const seedMatch = content.match(/^level-seed=(.*)$/m);
        if (seedMatch && seedMatch[1].trim() !== '') setActiveSeed(seedMatch[1].trim());
        
        const nameMatch = content.match(/^level-name=(.*)$/m);
        if (nameMatch && nameMatch[1].trim() !== '') setWorldName(nameMatch[1].trim());
      }
    });
  }, [server.uuid]);

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
          <span className="text-gray-200 font-mono">{worldName}</span>
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
            <Button color="primary" onClick={() => setShowSettings(!showSettings)} className="w-full justify-center">
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

      {/* Java Server Settings */}
      {showSettings && (
        <div className="bg-[#1e2532] rounded-lg border border-[#2b3544] p-6 mb-6 animate-fade-in shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-200 flex items-center">
              <FontAwesomeIcon icon={faCog} className="mr-2 text-gray-400" /> JAVA SERVER SETTINGS
            </h3>
            <Button color="green" size="small" onClick={() => saveAllProperties()}>Save Changes</Button>
          </div>

          <input 
            type="text" 
            placeholder="Search Java server settings..." 
            className="w-full bg-[#151a23] border border-[#2b3544] text-gray-200 px-4 py-2 rounded mb-6 focus:outline-none focus:border-indigo-500"
            value={settingsSearch}
            onChange={(e) => setSettingsSearch(e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'MOTD', key: 'motd', type: 'text' },
              { label: 'Server IP', key: 'server-ip', type: 'text' },
              { label: 'Server Port', key: 'server-port', type: 'text' },
              { label: 'Max Players', key: 'max-players', type: 'text' },
              { label: 'Online Mode', key: 'online-mode', type: 'toggle' },
              { label: 'Enforce Secure Profile', key: 'enforce-secure-profile', type: 'toggle' },
              { label: 'Prevent Proxy Connections', key: 'prevent-proxy-connections', type: 'toggle' },
              { label: 'Hide Online Players', key: 'hide-online-players', type: 'toggle' },
              { label: 'Enable Status', key: 'enable-status', type: 'toggle' }
            ].filter(s => s.label.toLowerCase().includes(settingsSearch.toLowerCase()) || s.key.includes(settingsSearch.toLowerCase())).map(setting => (
              <div key={setting.key} className="bg-[#151a23] border border-[#2b3544] rounded-lg p-4">
                <h4 className="font-bold text-gray-200 text-sm">{setting.label}</h4>
                <p className="text-xs text-gray-500 font-mono mb-4 mt-1">{setting.key}</p>
                
                {setting.type === 'text' ? (
                  <input 
                    type="text"
                    className="w-full bg-[#1e2532] border border-[#2b3544] text-gray-200 px-3 py-2 rounded text-sm focus:outline-none focus:border-indigo-500"
                    value={propsMap[setting.key] || ''}
                    onChange={(e) => updateProperty(setting.key, e.target.value)}
                  />
                ) : (
                  <div className="flex items-center mt-2 cursor-pointer" onClick={() => updateProperty(setting.key, propsMap[setting.key] === 'true' ? 'false' : 'true')}>
                    <div className={`w-10 h-5 flex items-center bg-gray-600 rounded-full p-1 duration-300 ease-in-out ${propsMap[setting.key] === 'true' ? 'bg-indigo-500' : 'bg-gray-600'}`}>
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${propsMap[setting.key] === 'true' ? 'translate-x-4' : ''}`}></div>
                    </div>
                    <div className="ml-3">
                      <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">{setting.label}</span>
                      <p className="text-xs text-gray-500">{propsMap[setting.key] === 'true' ? 'Enabled' : 'Disabled'}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Spinner size="large" />
        </div>
      )}
    </div>
  );
};
