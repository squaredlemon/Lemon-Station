const path = require('path');
const packager = require('electron-packager');

const root = path.resolve(__dirname, '..');

packager({
    dir: root,
    name: 'Lemon Station',
    platform: 'win32',
    arch: 'x64',
    icon: process.platform === 'win32'
        ? path.join(root, 'assets', 'lemon-station-icon.ico')
        : undefined,
    out: path.join(root, 'dist'),
    overwrite: true,
    prune: true,
    ignore: [
        /(^|[\\/])dist([\\/]|$)/,
        /\.zip$/i,
        /(^|[\\/])Users([\\/]|$)/,
        /lemon-station\.iconset/
    ]
}).then(function(paths) {
    paths.forEach(function(appPath) {
        console.log('Windows app created at ' + appPath);
    });
}).catch(function(error) {
    console.error('Windows packaging failed:', error);
    process.exitCode = 1;
});
