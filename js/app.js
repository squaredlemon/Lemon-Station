// ... existing code ...

document.addEventListener('DOMContentLoaded', () => {
  // ... existing code ...

  // Update Spotify shortcut behavior
  document.getElementById('spotify-button').addEventListener('click', () => {
    const webview = document.getElementById('webview-container');
    webview.src = 'https://open.spotify.com';
    webview.addEventListener('loadend', () => {
      // Trigger fluid transition animation
      document.getElementById('transition-animation').classList.add('active');
    });
  });

  // Configure target='_blank' or window.open() overrides
  const webview = document.getElementById('webview-container');
  webview.addEventListener('new-window', (e) => {
    e.preventDefault();
  });

  // ... existing code ...
//