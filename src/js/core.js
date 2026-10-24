    var workspaceProfiles = [
        { id: 'default', label: '🌐 Default Hub' },
        { id: 'development', label: '💻 Development' },
        { id: 'entertainment', label: '🎮 Entertainment' }
    ];
    var workspaceTokens = {
        default: 'hub',
        development: 'dev',
        entertainment: 'game'
    };
    var workspaceStorageKeys = {
        lemon_shortcuts: 'shortcuts',
        lemon_todos: 'todos',
        lemon_notepad_text: 'notes'
    };
    var savedWorkspaceId = localStorage.getItem('lemon_active_workspace');
    var activeWorkspaceId = workspaceProfiles.some(function(profile) { return profile.id === savedWorkspaceId; })
        ? savedWorkspaceId
        : 'default';
    document.body.dataset.workspace = workspaceTokens[activeWorkspaceId];

    function getWorkspaceStorageKey(key) {
        var dataKey = workspaceStorageKeys[key];
        return dataKey ? 'lemon_workspace_' + activeWorkspaceId + '_' + dataKey : key;
    }

    function readWorkspaceText(key) {
        var storageKey = getWorkspaceStorageKey(key);
        var value = localStorage.getItem(storageKey);
        if (value === null && activeWorkspaceId === 'default') {
            value = localStorage.getItem(key);
            if (value !== null) localStorage.setItem(storageKey, value);
        }
        return value || '';
    }

    function writeWorkspaceText(key, value) {
        localStorage.setItem(getWorkspaceStorageKey(key), value);
    }

    function removeWorkspaceValue(key) {
        localStorage.removeItem(getWorkspaceStorageKey(key));
    }

    function readStorage(key, fallback) {
        try {
            const storageKey = getWorkspaceStorageKey(key);
            var value = localStorage.getItem(storageKey);
            if (value === null && activeWorkspaceId === 'default' && workspaceStorageKeys[key]) {
                value = localStorage.getItem(key);
                if (value !== null) localStorage.setItem(storageKey, value);
            }
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function writeStorage(key, value) {
        try {
            localStorage.setItem(getWorkspaceStorageKey(key), JSON.stringify(value));
        } catch (error) {
            console.warn('Storage unavailable:', error);
        }
    }

    var themePalettes = {
        lemon: {
            accent: '#f5cf36', green: '#426e45', deep: '#315b38',
            hero: ['#f7e77a', '#e8ed9c', '#dbe8bd'],
            page: ['#fffdf4', '#f8f3dc']
        },
        lime: {
            accent: '#b8d957', green: '#4d7542', deep: '#365c37',
            hero: ['#e0ed9b', '#d6e9a0', '#c5dfb1'],
            page: ['#fbfdeF', '#eef5df']
        },
        blossom: {
            accent: '#efb6a5', green: '#6f7650', deep: '#535d3c',
            hero: ['#f8d7bd', '#f4dfb1', '#e7e9c6'],
            page: ['#fff9f3', '#f8eee4']
        }
    };
    var defaultUserSettings = {
        theme: 'lemon',
        accent: '#f5cf36',
        name: 'Lemon',
        clockFormat: '12',
        background: 'citrus',
        wallpaper: ''
    };
    var savedPreferences = readStorage('lemon_preferences', null);
    var legacyAccent = localStorage.getItem('lemon_theme_color');
    var legacyWallpaper = localStorage.getItem('lemon_wallpaper_url');
    var userSettings = Object.assign(
        {},
        defaultUserSettings,
        savedPreferences || {
            accent: /^#[0-9a-f]{6}$/i.test(legacyAccent || '') ? legacyAccent : defaultUserSettings.accent,
            background: legacyWallpaper ? 'custom' : defaultUserSettings.background,
            wallpaper: legacyWallpaper || ''
        }
    );
    if (!themePalettes[userSettings.theme]) userSettings.theme = 'lemon';
    if (!/^#[0-9a-f]{6}$/i.test(userSettings.accent)) userSettings.accent = themePalettes[userSettings.theme].accent;
    if (userSettings.clockFormat !== '24') userSettings.clockFormat = '12';
    if (!['citrus', 'grove', 'custom'].includes(userSettings.background)) userSettings.background = 'citrus';
    if (typeof userSettings.name !== 'string') userSettings.name = 'Lemon';
    if (typeof userSettings.wallpaper !== 'string') userSettings.wallpaper = '';



    var todos = readStorage('lemon_todos', []);
    if (!Array.isArray(todos)) todos = [];
    function applyThemePalette() {
        var palette = themePalettes[userSettings.theme];
        var root = document.documentElement;
        root.style.setProperty('--lemon-yellow', userSettings.accent);
        root.style.setProperty('--lemon-accent', userSettings.accent);
        root.style.setProperty('--garden-green', palette.green);
        root.style.setProperty('--garden-deep', palette.deep);
        root.style.setProperty('--hero-lemon', palette.hero[0]);
        root.style.setProperty('--hero-citrus', palette.hero[1]);
        root.style.setProperty('--hero-leaf', palette.hero[2]);
        root.style.setProperty('--page-start', palette.page[0]);
        root.style.setProperty('--page-end', palette.page[1]);
    }

    function applyBackgroundStyle() {
        var palette = themePalettes[userSettings.theme];
        if (document.body.dataset.workspace !== 'hub') {
            document.body.style.removeProperty('background-image');
            return;
        }
        if (userSettings.background === 'custom' && /^https?:\/\//i.test(userSettings.wallpaper)) {
            document.body.style.backgroundImage = 'linear-gradient(rgba(255, 252, 231, 0.76), rgba(255, 252, 231, 0.76)), url(' + JSON.stringify(userSettings.wallpaper) + ')';
        } else if (userSettings.background === 'grove') {
            document.body.style.backgroundImage = 'radial-gradient(ellipse at 80% 5%, ' + palette.hero[0] + ' 0, transparent 28%), radial-gradient(ellipse at 8% 60%, ' + palette.hero[2] + ' 0, transparent 34%), linear-gradient(135deg, ' + palette.page[0] + ', ' + palette.page[1] + ')';
        } else {
            document.body.style.backgroundImage = 'radial-gradient(ellipse at 84% 4%, ' + userSettings.accent + '33, transparent 25%), radial-gradient(ellipse at 8% 45%, ' + palette.hero[2] + ' 0, transparent 28%), linear-gradient(135deg, ' + palette.page[0] + ', ' + palette.page[1] + ')';
        }
    }

    function selectTheme(themeName) {
        if (!themePalettes[themeName]) return;
        userSettings.theme = themeName;
        userSettings.accent = themePalettes[themeName].accent;
        document.getElementById('primaryColorInput').value = userSettings.accent;
        updateAccentLabel();
        document.querySelectorAll('.theme-option').forEach(function(button) {
            button.setAttribute('aria-pressed', String(button.dataset.themeChoice === themeName));
        });
    }

    function updateAccentLabel() {
        document.getElementById('accentColorValue').textContent = userSettings.accent.toUpperCase();
    }

    function updateWallpaperControl() {
        var custom = document.getElementById('backgroundStyleSelect').value === 'custom';
        document.getElementById('wallpaperSettingRow').hidden = !custom;
    }

    function toggleSidebar() {
        var sidebar = document.getElementById('sidebar');
        var menuButton = document.querySelector('.menu-toggle');
        var isOpen = sidebar.classList.toggle('open');
        menuButton.classList.toggle('sidebar-active', isOpen);
        menuButton.setAttribute('aria-expanded', String(isOpen));
        menuButton.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
        menuButton.textContent = isOpen ? '×' : '☰';
    }

    var viewLeaveTimers = new WeakMap();

    function switchView(viewId, navItem) {
        var showHomeBase = viewId === 'dashboard';
        if (showHomeBase) viewId = 'browserView';
        var nextPanel = document.getElementById(viewId);
        var currentPanel = document.querySelector('.view-panel.active');
        document.querySelectorAll('.view-panel').forEach(function(panel) {
            if (panel === nextPanel) return;
            var leaveTimer = viewLeaveTimers.get(panel);
            if (leaveTimer) {
                window.clearTimeout(leaveTimer);
                viewLeaveTimers.delete(panel);
            }
            panel.classList.remove('active', 'is-entering', 'is-leaving');
            if (panel === currentPanel) {
                panel.classList.add('is-leaving');
                viewLeaveTimers.set(panel, window.setTimeout(function() {
                    panel.classList.remove('is-leaving');
                    viewLeaveTimers.delete(panel);
                }, 350));
            }
        });
        document.querySelectorAll('.nav-item').forEach(function(item) {
            item.classList.remove('active');
        });
        if (currentPanel !== nextPanel) {
            var nextLeaveTimer = viewLeaveTimers.get(nextPanel);
            if (nextLeaveTimer) {
                window.clearTimeout(nextLeaveTimer);
                viewLeaveTimers.delete(nextPanel);
            }
            nextPanel.classList.remove('is-leaving');
            nextPanel.classList.add('active', 'is-entering');
            void nextPanel.offsetWidth;
            window.requestAnimationFrame(function() {
                nextPanel.classList.remove('is-entering');
            });
        } else {
            nextPanel.classList.add('active');
        }
        if (navItem) navItem.classList.add('active');
        document.body.classList.toggle('browser-view-active', viewId === 'browserView');
        document.getElementById('sidebar').classList.remove('open');
        var menuButton = document.querySelector('.menu-toggle');
        menuButton.classList.remove('sidebar-active');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', 'Open navigation');
        menuButton.textContent = '☰';
        if (viewId === 'browserView') {
            if (!getActiveEmbeddedBrowserTab()) createEmbeddedBrowserTab();
            if (showHomeBase) {
                showBrowserHome();
            } else {
                window.requestAnimationFrame(function() {
                    document.getElementById('browserAddressInput').focus();
                    document.getElementById('browserAddressInput').select();
                });
            }
        }
    }

    function searchSpotify(event) {
        if (event) event.preventDefault();
        var input = document.getElementById('spotifySearchInput');
        searchSpotifyQuery(input.value);
    }

    function searchSpotifyQuery(query) {
        var searchTerm = query.trim();
        if (!searchTerm) {
            document.getElementById('spotifySearchInput').focus();
            return;
        }
        window.open('https://open.spotify.com/search/' + encodeURIComponent(searchTerm), '_blank', 'noopener,noreferrer');
    }

    var lastDate = localDateKey(new Date());
    function updateClock() {
        var now = new Date();
        document.getElementById('clock').textContent = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: userSettings.clockFormat !== '24' });
        document.getElementById('date').textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
        var hour = now.getHours();
        var displayName = userSettings.name.trim() || 'Lemon';
        document.getElementById('greeting').textContent = (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening') + ', ' + displayName + ' — welcome to Lemon Station.';

        if (localDateKey(now) !== lastDate) {
            localStorage.removeItem('lemon_bucket');
            lastDate = localDateKey(now);
            bucket = readStorage('lemon_bucket', []);
            renderBucketLinks();
            renderDailyHabits();
        }
    }
    setInterval(updateClock, 1000);
    updateClock();

    var dailyHabits = [
        { id: 'water', label: 'Drink a glass of water', icon: '💧' },
        { id: 'move', label: 'Stretch or move a little', icon: '🌱' },
        { id: 'outside', label: 'Step outside for fresh air', icon: '☀️' },
        { id: 'plan', label: 'Choose one priority for today', icon: '🍋' }
    ];

    function localDateKey(date) {
        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    }

    function renderDailyHabits() {
        var key = 'lemon_habits_' + localDateKey(new Date());
        var completed = readStorage(key, {});
        var list = document.getElementById('habitList');
        list.innerHTML = '';

        dailyHabits.forEach(function(habit) {
            var label = document.createElement('label');
            label.className = 'habit-item';
            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = Boolean(completed[habit.id]);
            checkbox.onchange = function() {
                completed[habit.id] = checkbox.checked;
                writeStorage(key, completed);
                updateHabitProgress(completed);
            };
            var text = document.createElement('span');
            text.textContent = habit.icon + '  ' + habit.label;
            label.appendChild(checkbox);
            label.appendChild(text);
            list.appendChild(label);
        });

        updateHabitProgress(completed);
    }

    function updateHabitProgress(completed) {
        var count = dailyHabits.filter(function(habit) { return Boolean(completed[habit.id]); }).length;
        var percent = Math.round(count / dailyHabits.length * 100);
        document.getElementById('habitProgressLabel').textContent = count + ' of ' + dailyHabits.length + ' done';
        document.getElementById('habitProgressPercent').textContent = percent + '%';
        document.getElementById('habitProgressFill').style.width = percent + '%';
        document.getElementById('habitProgress').setAttribute('aria-valuenow', count);
    }

    function openTasks() {
        switchView('todoView', document.getElementById('navTodo'));
        document.getElementById('todoInput').focus();
    }
