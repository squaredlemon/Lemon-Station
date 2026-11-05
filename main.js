const { app, BrowserWindow, session, shell, ipcMain } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

let mainWindow = null;

function allowWebUrl(url) {
    try {
        return ['http:', 'https:'].includes(new URL(url).protocol);
    } catch (error) {
        return false;
    }
}

function openExternalUrl(url) {
    if (!allowWebUrl(url)) return;
    shell.openExternal(url).catch((error) => {
        console.error('Could not open external link:', error);
    });
}

function validateAIWorkerUrl(value) {
    let url;
    try {
        url = new URL(value);
    } catch (error) {
        throw new Error('Enter a valid Lemon AI Worker URL.');
    }
    const localWorker = url.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(url.hostname) &&
        url.port === '8787';
    if ((!localWorker && (url.protocol !== 'https:' || !url.hostname.endsWith('.workers.dev'))) ||
        url.username || url.password || url.search || url.hash ||
        (url.pathname !== '/' && url.pathname !== '')) {
        throw new Error('Use an HTTPS Cloudflare workers.dev URL.');
    }
    return url.origin;
}

ipcMain.handle('lemon-ai:request', async (event, workerUrl, accessCode, action, payload) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) {
        throw new Error('Lemon AI requests are only available from the app window.');
    }
    const endpoint = validateAIWorkerUrl(workerUrl);
    if (typeof accessCode !== 'string' || accessCode.length < 32 || accessCode.length > 128) {
        throw new Error('Enter the private access code for this Worker.');
    }
    if (!['health', 'chat'].includes(action)) throw new Error('Unsupported Lemon AI request.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
        const response = await fetch(endpoint + (action === 'health' ? '/health' : '/api/chat'), {
            method: action === 'health' ? 'GET' : 'POST',
            headers: {
                Authorization: 'Bearer ' + accessCode,
                ...(action === 'chat' ? { 'Content-Type': 'application/json' } : {})
            },
            body: action === 'chat' ? JSON.stringify(payload) : undefined,
            signal: controller.signal
        });
        const data = await response.json();
        return { ok: response.ok, status: response.status, data };
    } finally {
        clearTimeout(timeout);
    }
});

function createWindow() {
    const windowOptions = {
        width: 1366,
        height: 868,
        backgroundColor: '#050506',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
            webviewTag: true,
            preload: path.join(__dirname, 'preload.js')
        }
    };

    if (process.platform === 'darwin') {
        Object.assign(windowOptions, {
            titleBarStyle: 'hidden',
            vibrancy: 'under-window',
            visualEffectState: 'active'
        });
    } else {
        windowOptions.icon = path.join(__dirname, 'assets', process.platform === 'win32'
            ? 'lemon-station-icon.ico'
            : 'lemon-station-icon.png');
    }

    mainWindow = new BrowserWindow(windowOptions);
    mainWindow.on('closed', () => { mainWindow = null; });
    mainWindow.webContents.on('dom-ready', () => {
        mainWindow.webContents.executeJavaScript("document.body.classList.add('electron-app')").catch((error) => {
            console.error('Could not apply Electron window layout:', error);
        });
    });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        openExternalUrl(url);
        return { action: 'deny' };
    });
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (url !== pathToFileURL(path.join(__dirname, 'index.html')).href) event.preventDefault();
    });
    mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
        if (params.src !== 'about:blank' && !allowWebUrl(params.src || '')) {
            event.preventDefault();
            return;
        }
        delete webPreferences.preload;
        webPreferences.nodeIntegration = false;
        webPreferences.contextIsolation = true;
        webPreferences.sandbox = true;
        webPreferences.webSecurity = true;
        webPreferences.allowRunningInsecureContent = false;
        params.allowpopups = false;
        const webviewSession = params.partition
            ? session.fromPartition(params.partition)
            : session.defaultSession;
        webviewSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    });

    // Directly loads the index.html sitting right next to it in this folder
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
