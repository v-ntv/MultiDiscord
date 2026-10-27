const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('screenShare', {
  state: () => ipcRenderer.invoke('screen-share:state'),
  choose: selection => ipcRenderer.invoke('screen-share:choose', selection)
});
