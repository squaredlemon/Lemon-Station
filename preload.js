const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lemonAI', Object.freeze({
    request: function(workerUrl, accessCode, action, payload) {
        return ipcRenderer.invoke('lemon-ai:request', workerUrl, accessCode, action, payload);
    }
}));
