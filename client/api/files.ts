import http from '@/api/http';

export interface UserCacheEntry {
  name: string;
  uuid: string;
  expiresOn: string;
}

export const getUserCache = async (uuid: string): Promise<UserCacheEntry[]> => {
  try {
    const { data } = await http.get(`/api/client/servers/${uuid}/files/contents`, {
      params: { file: 'usercache.json' },
    });
    
    // Sometimes the data comes as a string, sometimes as JSON depending on axios parsing
    if (typeof data === 'string') {
      return JSON.parse(data);
    }
    
    return data;
  } catch (error) {
    console.error('Failed to fetch usercache.json:', error);
    return [];
  }
};

export const getPlayerDataUrl = async (uuid: string, playerUuid: string, worldName: string = 'world'): Promise<string> => {
  const { data } = await http.get(`/api/client/servers/${uuid}/files/download`, {
    params: { file: `${worldName}/playerdata/${playerUuid}.dat` },
  });
  
  return data.attributes.url;
};

export const sendCommand = async (uuid: string, command: string): Promise<void> => {
  await http.post(`/api/client/servers/${uuid}/command`, { command });
};
