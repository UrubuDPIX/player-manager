import React, { memo, useEffect, useState } from 'react';
import { ServerContext } from '@/state/server';
import Can from '@/components/elements/Can';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import isEqual from 'react-fast-compare';
import Spinner from '@/components/elements/Spinner';
import Features from '@feature/Features';
import Console from '@/components/server/console/Console';
import StatGraphs from '@/components/server/console/StatGraphs';
import PowerButtons from '@/components/server/console/PowerButtons';
import { Alert } from '@/components/elements/alert';
import tw, { styled } from 'twin.macro';
import { bytesToString, ip as formatIp, mbToBytes } from '@/lib/formatters';
import * as Icon from 'react-feather';
import { formatDistanceToNow } from 'date-fns';
import useSWR from 'swr';
import http from '@/api/http';
import getServerResourceUsage, { ServerPowerState, ServerStats } from '@/api/server/getServerResourceUsage';
import { Responsive, WidthProvider } from 'react-grid-layout';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

export type PowerAction = 'start' | 'stop' | 'restart' | 'kill';

const StatusIndicator = styled.div<{ $status: any }>`
    ${tw`w-2 h-2 rounded-full mr-2`};
    ${(props) => (!props.$status || props.$status === 'offline' ? tw`bg-red-500` : props.$status === 'running' ? tw`bg-green-500` : tw`bg-yellow-500`)};
`;

// Widget components for Activity
const ActivityLogWidget = () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { data, error } = useSWR(`/api/client/servers/${uuid}/activity`, async (url) => {
        const { data } = await http.get(url);
        return data.data; // assuming paginated response
    });

    if (!data) return <div className="p-4 text-center text-gray-400"><Spinner size={'small'} /></div>;

    return (
        <div className="flex flex-col relative space-y-4">
            {/* Vertical Timeline Line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-700/50"></div>
            
            {data.slice(0, 15).map((activity: any, index: number) => (
                <div key={index} className="relative flex items-start group">
                    {/* Avatar over line */}
                    <div className="w-6 h-6 rounded border-2 border-gray-800 bg-gray-900 z-10 shrink-0 overflow-hidden mt-1 group-hover:border-indigo-500 transition-colors">
                        <img 
                            src={`https://minotar.net/avatar/${activity.attributes.user?.username || 'Steve'}/32.png`} 
                            alt="avatar" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                    {/* Content Box */}
                    <div className="flex-1 bg-gray-900/50 border border-gray-700/50 rounded-lg p-3 ml-3 shadow-sm hover:border-gray-600 transition-colors">
                        <div className="flex items-center space-x-2 mb-1">
                            <span className="font-semibold text-gray-200 text-sm">{activity.attributes.user?.username || 'System'}</span>
                            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full text-[10px] font-mono">
                                {activity.attributes.event}
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">
                            {activity.attributes.properties?.desc ? activity.attributes.properties.desc : 
                             activity.attributes.event.startsWith('server.file') ? `Modified files on the server` :
                             activity.attributes.event.startsWith('server.power') ? `Changed server power state` : 
                             'Performed an action'}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-2 font-medium">
                            {formatDistanceToNow(new Date(activity.attributes.timestamp), { addSuffix: true })}
                        </p>
                    </div>
                </div>
            ))}
            {(data.length === 0) && (
                <div className="text-center text-gray-500 text-xs py-4">No activity logs found.</div>
            )}
        </div>
    );
};

const ServerConsoleHyper = () => {
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const name = server.name;
    const description = server.description;
    const isInstalling = ServerContext.useStoreState((state) => state.server.isInstalling);
    const isTransferring = server.isTransferring;
    const eggFeatures = server.eggFeatures;
    const isNodeUnderMaintenance = server.isNodeUnderMaintenance;
    
    const [stats, setStats] = useState<any>(null);
    const status = ServerContext.useStoreState((state) => state.status.value);
    const instance = ServerContext.useStoreState((state) => state.socket.instance);
    const [isEditing, setIsEditing] = useState(false);
    
    // Default Layouts v2 (Taller widgets to prevent cutoff)
    const defaultLayout = [
        { i: 'console', x: 0, y: 0, w: 8, h: 5 },
        { i: 'actions', x: 8, y: 0, w: 4, h: 1 },
        { i: 'info', x: 8, y: 1, w: 4, h: 2 },
        { i: 'activity', x: 8, y: 3, w: 4, h: 2 },
        { i: 'graphs', x: 0, y: 5, w: 12, h: 3 }
    ];
    
    const [layouts, setLayouts] = useState(() => {
        const saved = localStorage.getItem('hyper_layout_v2_' + server.uuid);
        return saved ? JSON.parse(saved) : { lg: defaultLayout };
    });

    const onLayoutChange = (layout: any, layouts: any) => {
        setLayouts(layouts);
        localStorage.setItem('hyper_layout_v2_' + server.uuid, JSON.stringify(layouts));
    };

    // Listen to real-time stats via WebSocket
    useEffect(() => {
        if (!instance) return;
        
        const listener = (data: string) => {
            try {
                const parsed = JSON.parse(data);
                setStats(parsed);
            } catch (e) {
                // Ignore parse errors
            }
        };
        
        // Pterodactyl uses 'stats' as the event name
        instance.addListener('stats', listener);
        
        return () => {
            instance.removeListener('stats', listener);
        };
    }, [instance]);

    const cpuLimit = server.limits.cpu === 0 ? 100 : server.limits.cpu;
    const ramLimit = server.limits.memory === 0 ? 0 : server.limits.memory;
    const diskLimit = server.limits.disk === 0 ? 0 : server.limits.disk;

    const anyStats = stats as any;
    
    // Extract values dynamically to support both Pterodactyl Socket format and API format
    const cpuRaw = anyStats ? (anyStats.cpu_absolute ?? anyStats.cpuAbsolute ?? anyStats.cpuUsage ?? anyStats.resources?.cpu_absolute ?? 0) : 0;
    const ramRaw = anyStats ? (anyStats.memory_bytes ?? anyStats.memoryUsageInBytes ?? anyStats.memoryBytes ?? anyStats.resources?.memory_bytes ?? 0) : 0;
    const diskRaw = anyStats ? (anyStats.disk_bytes ?? anyStats.diskUsageInBytes ?? anyStats.diskBytes ?? anyStats.resources?.disk_bytes ?? 0) : 0;

    const cpuPercent = ((cpuRaw) / cpuLimit * 100).toFixed(2);
    const ramPercent = ramLimit > 0 ? ((ramRaw) / mbToBytes(ramLimit) * 100).toFixed(2) : '0.00';
    const diskPercent = diskLimit > 0 ? ((diskRaw) / mbToBytes(diskLimit) * 100).toFixed(2) : '0.00';

    const getEggBg = () => {
        const srv = server as any;
        const eggStr = [srv.eggName, srv.egg_name, srv.name, srv.description, srv.nestName].join(' ').toLowerCase();
        if (eggStr.includes('minecraft') || eggStr.includes('java') || eggStr.includes('paper') || eggStr.includes('forge') || eggStr.includes('spigot')) {
            return 'https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-minecraft.png';
        }
        if (eggStr.includes('fivem') || eggStr.includes('redm') || eggStr.includes('gta')) {
            return 'https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-fivem.jpg';
        }
        if (eggStr.includes('node') || eggStr.includes('js') || eggStr.includes('discord')) {
            return 'https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-node.jpg';
        }
        if (eggStr.includes('python') || eggStr.includes('bot')) {
            return 'https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-python.jpg';
        }
        return 'https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-minecraft.png';
    };

    return (
        <ServerContentBlock title={'Workspace'} showFlashKey={'console:events'}>
            {(isNodeUnderMaintenance || isInstalling || isTransferring) && (
                <Alert type={'warning'} className={'mb-4'}>
                    {isNodeUnderMaintenance
                        ? 'The node of this server is currently under maintenance and all actions are unavailable.'
                        : isInstalling
                        ? 'This server is currently running its installation process and most actions are unavailable.'
                        : 'This server is currently being transferred to another node and all actions are unavailable.'}
                </Alert>
            )}

            {/* Hyper Workspace Header */}
            <div className="mb-4">
                <div className="flex items-center mb-2">
                    <Icon.Grid className="w-5 h-5 mr-2 text-indigo-400" />
                    <div>
                        <h1 className="text-xl font-bold text-gray-50">Workspace</h1>
                        <p className="text-xs text-gray-400">Build your own server overview from widgets.</p>
                    </div>
                </div>
            </div>

            {/* Large Server Card Widget */}
            <div className="bg-gray-800 border border-indigo-500/30 rounded-xl mb-4 overflow-hidden shadow-lg shadow-indigo-900/10 flex flex-col md:flex-row relative">
                {/* Background glow overlay */}
                <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: `url(${getEggBg()})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(8px)' }} />
                
                {/* Left: Info */}
                <div className="p-4 flex items-center w-full md:w-1/3 z-10 border-b md:border-b-0 md:border-r border-gray-700/50">
                    <div className="w-16 h-16 rounded-lg shadow-md bg-gray-900 border border-gray-700 overflow-hidden shrink-0 mr-4">
                        <img src={getEggBg()} alt="Server Bg" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-50">{name}</h2>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 mb-2 inline-block">
                            {(server as any).eggName || 'SERVER'}
                        </span>
                        <div className="flex items-center text-xs text-gray-400 bg-gray-900/50 px-2 py-1 rounded-full border border-gray-700/50 w-max">
                            <Icon.Share2 className="w-3 h-3 mr-1 text-indigo-400" />
                            IP : {server.allocations.filter(a => a.isDefault).map(a => formatIp(a.alias || a.ip) + ':' + a.port).join(', ')}
                        </div>
                    </div>
                </div>

                {/* Middle: CPU/RAM */}
                <div className="p-4 flex flex-col justify-center w-full md:w-1/3 z-10 border-b md:border-b-0 md:border-r border-gray-700/50 space-y-3">
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="flex items-center text-gray-300"><Icon.Cpu className="w-3 h-3 mr-1 text-indigo-400" /> Cpu : {stats ? cpuPercent : '0.00'}%</span>
                        </div>
                        <div className="w-full bg-gray-900 rounded-full h-1.5 border border-gray-700/50 overflow-hidden">
                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(parseFloat(cpuPercent), 100)}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                            <span>0%</span>
                            <span>{cpuLimit === 100 ? 'No Limit' : `${cpuLimit}%`}</span>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="flex items-center text-gray-300"><Icon.HardDrive className="w-3 h-3 mr-1 text-indigo-400" /> Ram : {bytesToString(ramRaw)}</span>
                        </div>
                        <div className="w-full bg-gray-900 rounded-full h-1.5 border border-gray-700/50 overflow-hidden">
                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(parseFloat(ramPercent), 100)}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                            <span>0 GB</span>
                            <span>{ramLimit === 0 ? 'No Limit' : bytesToString(mbToBytes(ramLimit))}</span>
                        </div>
                    </div>
                </div>

                {/* Right: Disk & Controls */}
                <div className="p-4 flex flex-col justify-between w-full md:w-1/3 z-10">
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="flex items-center text-gray-300"><Icon.Database className="w-3 h-3 mr-1 text-indigo-400" /> DISK : {bytesToString(diskRaw)}</span>
                            <div className="flex items-center bg-gray-900/80 px-2 py-0.5 rounded-full border border-gray-700">
                                <StatusIndicator $status={status} />
                                <span className="text-[10px] uppercase font-bold text-gray-300">{status || 'OFFLINE'}</span>
                            </div>
                        </div>
                        <div className="w-full bg-gray-900 rounded-full h-1.5 border border-gray-700/50 overflow-hidden">
                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(parseFloat(diskPercent), 100)}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                            <span>0 GB</span>
                            <span>{diskLimit === 0 ? 'No Limit' : bytesToString(mbToBytes(diskLimit))}</span>
                        </div>
                    </div>

                    <div className="flex space-x-2 mt-4 self-end">
                        <Can action={['control.start', 'control.stop', 'control.restart']} matchAny>
                            <PowerButtons className="flex space-x-2" />
                        </Can>
                    </div>
                </div>
            </div>

            {/* Config Bar */}
            <div className="flex items-center justify-between bg-gray-800/80 border border-gray-700/50 rounded-lg p-3 mb-4 backdrop-blur">
                <div className="flex space-x-2">
                    <button className="flex items-center px-3 py-1.5 text-xs text-gray-300 bg-gray-900 hover:bg-gray-700 rounded-md border border-gray-600 transition">
                        <Icon.Download className="w-3 h-3 mr-1" /> Export
                    </button>
                    <button className="flex items-center px-3 py-1.5 text-xs text-gray-300 bg-gray-900 hover:bg-gray-700 rounded-md border border-gray-600 transition">
                        <Icon.Upload className="w-3 h-3 mr-1" /> Import
                    </button>
                </div>
                <div className="flex space-x-2">
                    <button onClick={() => setIsEditing(!isEditing)} className={`flex items-center px-3 py-1.5 text-xs rounded-md border transition ${isEditing ? 'text-white bg-green-500 border-green-400' : 'text-green-400 bg-green-500/10 hover:bg-green-500/20 border-green-500/50'}`}>
                        <Icon.Edit2 className="w-3 h-3 mr-1" /> {isEditing ? 'Save Layout' : 'Edit Mode'}
                    </button>
                    <button onClick={() => setLayouts({ lg: defaultLayout })} className="flex items-center px-3 py-1.5 text-xs text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-md border border-indigo-500/50 transition">
                        <Icon.RotateCcw className="w-3 h-3 mr-1" /> Reset
                    </button>
                    <button className="flex items-center px-3 py-1.5 text-xs text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 rounded-md border border-purple-500/50 transition">
                        <Icon.Save className="w-3 h-3 mr-1" /> Save As Preset
                    </button>
                </div>
            </div>

            {/* Main Console & Widgets Grid */}
            <div className={isEditing ? '[&>.react-grid-item]:border [&>.react-grid-item]:border-dashed [&>.react-grid-item]:border-purple-500 [&>.react-grid-item]:bg-purple-500/5' : ''}>
                <ResponsiveGridLayout
                    className="layout"
                    layouts={layouts}
                    onLayoutChange={onLayoutChange}
                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                    cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                    rowHeight={100}
                    isDraggable={isEditing}
                    isResizable={isEditing}
                    margin={[16, 16]}
                >
                    {/* Console Window */}
                    <div key="console" className={`flex flex-col bg-gray-800/80 border border-indigo-500/30 rounded-xl overflow-hidden shadow-lg ${isEditing ? 'cursor-move' : ''} h-full`}>
                        <div className="flex items-center justify-between p-2 bg-gray-900/50 border-b border-gray-700/50 shrink-0">
                        <div className="flex items-center space-x-2">
                            <span className="flex items-center px-2 py-1 text-xs text-green-400 bg-green-500/10 rounded-full border border-green-500/30">
                                <Icon.Menu className="w-3 h-3 mr-1" /> Wrap
                            </span>
                            <span className="flex items-center px-2 py-1 text-xs text-gray-300 bg-gray-800 rounded-full border border-gray-600">
                                - <span className="mx-2">13px</span> +
                            </span>
                        </div>
                        <div className="flex space-x-2 text-indigo-400">
                            <Icon.Square className="w-4 h-4 cursor-pointer hover:text-indigo-300" />
                            <Icon.Copy className="w-4 h-4 cursor-pointer hover:text-indigo-300" />
                            <Icon.ExternalLink className="w-4 h-4 cursor-pointer hover:text-indigo-300" />
                            <Icon.Maximize2 className="w-4 h-4 cursor-pointer hover:text-indigo-300" />
                        </div>
                        </div>
                        {/* Console Output Area */}
                        <div className="flex-1 relative min-h-0 bg-[#0f0f15]">
                            <div className="absolute inset-0 p-2 [&>div]:h-full [&>div>div]:h-full">
                                <Spinner.Suspense>
                                    <Console />
                                </Spinner.Suspense>
                            </div>
                        </div>
                        {/* Console Input Bar */}
                        <div className="flex items-center bg-gray-900/80 border-t border-gray-700 p-2 shrink-0 z-20">
                            <div className="flex items-center bg-[#0f0f15] rounded-lg px-3 py-2 w-full border border-gray-800 focus-within:border-indigo-500/50 transition">
                                <Icon.ChevronsRight className="w-4 h-4 text-indigo-400 mr-2" />
                                <input 
                                    type="text" 
                                    placeholder="Type a command..." 
                                    className="bg-transparent border-none outline-none text-sm text-gray-200 w-full font-mono"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.currentTarget.value && instance) {
                                            instance.send('send command', e.currentTarget.value);
                                            e.currentTarget.value = '';
                                        }
                                    }}
                                />
                                <button className="ml-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-1.5 rounded-md font-bold transition flex items-center">
                                    <Icon.Send className="w-3 h-3 mr-1" /> Send
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Big Action Buttons */}
                    <div key="actions" className={`flex flex-col justify-center items-center h-full w-full ${isEditing ? 'cursor-move' : ''}`}>
                        <div className="w-full flex justify-center items-center scale-90 md:scale-100 origin-center [&>div]:flex [&>div]:space-x-3 [&_button]:flex-1 [&_button]:px-6 [&_button]:py-3 [&_button]:text-sm [&_button]:font-semibold [&_button]:shadow-lg hover:[&_button]:scale-105 [&_button]:transition-transform [&_button]:rounded-lg">
                            <Can action={['control.start', 'control.stop', 'control.restart']} matchAny>
                                <PowerButtons />
                            </Can>
                        </div>
                    </div>

                    {/* Server Info Chips */}
                    <div key="info" className={`flex flex-col justify-center space-y-3 h-full ${isEditing ? 'cursor-move' : ''}`}>
                        <div className="flex items-center bg-gray-800/80 border border-gray-700 rounded-lg p-3">
                            <div className="bg-indigo-500/20 p-2 rounded-lg mr-3">
                                <Icon.Wifi className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-100 text-sm">{server.allocations.filter(a => a.isDefault).map(a => formatIp(a.alias || a.ip) + ':' + a.port).join(', ')}</h3>
                                <p className="text-xs text-indigo-400">Address</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center bg-gray-800/80 border border-gray-700 rounded-lg p-3">
                                <div className="bg-purple-500/20 p-2 rounded-lg mr-2">
                                    <Icon.Server className="w-4 h-4 text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-100 text-xs truncate max-w-[80px]">{server.node}</h3>
                                    <p className="text-[10px] text-purple-400">Node</p>
                                </div>
                            </div>
                            <div className="flex items-center bg-gray-800/80 border border-gray-700 rounded-lg p-3">
                                <div className="bg-green-500/20 p-2 rounded-lg mr-2">
                                    <Icon.Hash className="w-4 h-4 text-green-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-100 text-xs">{server.id}</h3>
                                    <p className="text-[10px] text-green-400">Server ID</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Activity Log Widget */}
                    <div key="activity" className={`bg-gray-800/80 border border-gray-700 rounded-lg overflow-hidden flex flex-col h-full ${isEditing ? 'cursor-move' : ''}`}>
                        <div className="flex justify-between items-center bg-gray-900/50 p-2 border-b border-gray-700/50">
                            <span className="flex items-center text-xs font-bold text-gray-300">
                                <Icon.Activity className="w-3 h-3 mr-1 text-indigo-400" /> Activity Log
                            </span>
                            <span className="text-[10px] text-indigo-400 cursor-pointer hover:underline">View all →</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0">
                            <ActivityLogWidget />
                        </div>
                    </div>

                    {/* Bottom Graph Cards */}
                    <div key="graphs" className={`flex flex-col h-full ${isEditing ? 'cursor-move' : ''}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full [&>div]:bg-gray-800/50 [&>div]:border [&>div]:border-gray-700/50 [&>div]:rounded-xl [&>div]:shadow-lg [&>div]:p-2 [&>div]:backdrop-blur">
                            <Spinner.Suspense>
                                <StatGraphs />
                            </Spinner.Suspense>
                        </div>
                    </div>
                </ResponsiveGridLayout>
            </div>
            
            <Features enabled={eggFeatures} />
        </ServerContentBlock>
    );
};

export default memo(ServerConsoleHyper, isEqual);
