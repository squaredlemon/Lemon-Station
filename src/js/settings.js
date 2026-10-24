    function saveConfigurationSettings() {
        var background = document.getElementById('backgroundStyleSelect').value;
        var wallpaper = document.getElementById('wallpaperUrlInput').value.trim();
        var accent = document.getElementById('primaryColorInput').value;
        var name = document.getElementById('displayNameInput').value.trim() || 'Lemon';

        if (background === 'custom') {
            try {
                var wallpaperUrl = new URL(wallpaper);
                if (!['http:', 'https:'].includes(wallpaperUrl.protocol)) throw new Error('Unsupported image URL protocol');
                wallpaper = wallpaperUrl.href;
            } catch (error) {
                var status = document.getElementById('settingsStatus');
                status.textContent = 'Enter a valid image URL starting with https:// or http://.';
                document.getElementById('wallpaperUrlInput').focus();
                return;
            }
        } else {
            wallpaper = '';
        }

        userSettings.accent = accent;
        userSettings.name = name;
        userSettings.clockFormat = document.getElementById('clockFormatSelect').value === '24' ? '24' : '12';
        userSettings.background = background;
        userSettings.wallpaper = wallpaper;
        applyThemePalette();
        applyBackgroundStyle();
        updateAccentLabel();
        updateClock();
        writeStorage('lemon_preferences', userSettings);
        localStorage.setItem('lemon_theme_color', accent);
        if (wallpaper) localStorage.setItem('lemon_wallpaper_url', wallpaper);
        else localStorage.removeItem('lemon_wallpaper_url');
        document.getElementById('settingsStatus').textContent = 'Your Lemon Station preferences are saved.';
    }

    function resetConfigurationSettings() {
        userSettings = Object.assign({}, defaultUserSettings);
        document.getElementById('primaryColorInput').value = userSettings.accent;
        document.getElementById('displayNameInput').value = userSettings.name;
        document.getElementById('clockFormatSelect').value = userSettings.clockFormat;
        document.getElementById('backgroundStyleSelect').value = userSettings.background;
        document.getElementById('wallpaperUrlInput').value = '';
        document.querySelectorAll('.theme-option').forEach(function(button) {
            button.setAttribute('aria-pressed', String(button.dataset.themeChoice === userSettings.theme));
        });
        updateWallpaperControl();
        applyThemePalette();
        applyBackgroundStyle();
        updateAccentLabel();
        updateClock();
        writeStorage('lemon_preferences', userSettings);
        localStorage.setItem('lemon_theme_color', userSettings.accent);
        localStorage.removeItem('lemon_wallpaper_url');
        document.getElementById('settingsStatus').textContent = 'Classic Lemon settings restored.';
    }

    document.getElementById('primaryColorInput').value = userSettings.accent;
    document.getElementById('displayNameInput').value = userSettings.name;
    document.getElementById('clockFormatSelect').value = userSettings.clockFormat;
    document.getElementById('backgroundStyleSelect').value = userSettings.background;
    document.getElementById('wallpaperUrlInput').value = userSettings.wallpaper;
    document.getElementById('primaryColorInput').addEventListener('input', function(event) {
        userSettings.accent = event.target.value;
        updateAccentLabel();
        document.querySelectorAll('.theme-option').forEach(function(button) {
            button.setAttribute('aria-pressed', 'false');
        });
    });
    document.getElementById('backgroundStyleSelect').addEventListener('change', updateWallpaperControl);
    document.querySelectorAll('.theme-option').forEach(function(button) {
        button.setAttribute('aria-pressed', String(button.dataset.themeChoice === userSettings.theme));
    });
    updateWallpaperControl();
    applyThemePalette();
    applyBackgroundStyle();
    updateAccentLabel();
