const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

ipcMain.handle('vidcore:search-imdb', async (_event, query, mediaType) => {
    if (typeof query !== 'string' || !query.trim() || query.length > 100) {
        throw new Error('Enter a title up to 100 characters long.');
    }
    if (mediaType !== 'movie' && mediaType !== 'tv') {
        throw new Error('Choose movie or TV show search.');
    }
    const term = query.trim();
    const response = await fetch(
        `https://v2.sg.media-imdb.com/suggestion/${encodeURIComponent(term[0].toLowerCase())}/${encodeURIComponent(term)}.json`
    );
    if (!response.ok) throw new Error(`IMDb title search returned HTTP ${response.status}.`);
    const data = await response.json();
    return (Array.isArray(data.d) ? data.d : [])
        .filter((item) => /^tt\d{7,8}$/.test(item.id || '') && (
            mediaType === 'tv'
                ? item.qid === 'tvSeries' || item.qid === 'tvMiniSeries'
                : item.qid === 'movie' || item.q === 'feature'
        ))
        .slice(0, 8)
        .map((item) => ({ id: item.id, title: item.l || item.id, year: item.y || '' }));
});

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1366,
        height: 868,
        backgroundColor: '#050506',
        titleBarStyle: 'hiddenBackground', // Seamless Mac traffic-light buttons
        vibrancy: 'under-window',          // Frosted glass desktop texture blending
        visualEffectState: 'active',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,            // Bypasses Spotify cross-origin blocks
            webviewTag: true               // Enables full embedded browsing tabs
        }
    });

    // Directly loads the index.html sitting right next to it in this folder
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
