const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('multiDiscord', {
  state: () => ipcRenderer.invoke('accounts:state'),
  action: (action, id, value) => ipcRenderer.invoke('accounts:action', { action, id, value }),
  subscribe: callback => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('accounts:changed', listener);
    return () => ipcRenderer.removeListener('accounts:changed', listener);
  }
});
