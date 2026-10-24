    const defaultShortcuts = [
        { title: 'Linktree', url: 'https://linktr.ee', icon: '🔗' },
        { title: 'GitHub', url: 'https://github.com', icon: '💻' },
        { title: 'Modrinth', url: 'https://modrinth.com', icon: '🟢' },
        { title: 'PS Store', url: 'https://playstation.com', icon: '🎮' }
    ];
    const defaultGameShortcuts = [
        { title: 'Steam', url: 'steam://open/main', icon: '🎮' },
        { title: 'Minecraft', url: 'minecraft://', icon: '⛏️' }
    ];
    const gameShortcutProtocols = ['steam:', 'minecraft:'];

    function getDefaultShortcuts() {
        return document.body.dataset.workspace === 'game' ? defaultGameShortcuts : defaultShortcuts;
    }

    function isNativeGameShortcut(url) {
        try {
            return gameShortcutProtocols.includes(new URL(url).protocol);
        } catch (error) {
            return false;
        }
    }

    let shortcuts = readStorage('lemon_shortcuts', getDefaultShortcuts());
    function renderShortcuts() {
        const grid = document.getElementById('shortcutsGrid');
        grid.innerHTML = '';
        if (document.body.dataset.workspace === 'game') {
            shortcuts = shortcuts.filter(function(item) { return item && isNativeGameShortcut(item.url); });
            if (!shortcuts.length && !localStorage.getItem('lemon_game_shortcuts_initialized')) {
                shortcuts = defaultGameShortcuts.slice();
            }
            localStorage.setItem('lemon_game_shortcuts_initialized', '1');
            writeStorage('lemon_shortcuts', shortcuts);
        }
        shortcuts.forEach(function(item, index) {
            var card = document.createElement('div');
            card.className = 'card';
            card.addEventListener('click', function(event) {
                if (!event.target.closest('.delete-btn') && (document.body.dataset.workspace !== 'game' || isNativeGameShortcut(item.url))) {
                    window.open(item.url, '_blank', 'noopener,noreferrer');
                }
            });
            var remove = document.createElement('button');
            remove.className = 'delete-btn';
            remove.type = 'button';
            remove.textContent = '✕';
            remove.setAttribute('aria-label', 'Delete ' + item.title);
            remove.addEventListener('click', function() { deleteShortcut(index); });
            var icon = document.createElement('div');
            icon.className = 'card-icon';
            icon.textContent = item.icon || '🌐';
            var title = document.createElement('div');
            title.className = 'card-title';
            title.textContent = item.title;
            card.append(remove, icon, title);
            grid.appendChild(card);
        });

        renderWorkspaceBackgroundTools(grid);
        var addCard = document.createElement('div');
        addCard.className = 'card add-card';
        addCard.onclick = addShortcut;
        addCard.innerHTML = '<div class="card-icon">+</div><div class="card-title">Add Link</div>';
        grid.appendChild(addCard);
    }

    var profilePingTimer = null;
    var profilePingInProgress = false;
    var hubPingTargets = [
        { label: 'Cloudflare', url: 'https://www.cloudflare.com/cdn-cgi/trace' },
        { label: 'GitHub', url: 'https://github.com/favicon.ico' }
    ];

    function renderWorkspaceBackgroundTools(grid) {
        clearInterval(profilePingTimer);
        profilePingTimer = null;
        profilePingInProgress = false;
        if (document.body.dataset.workspace !== 'hub') return;

        var matrix = document.createElement('div');
        matrix.className = 'card';
        matrix.setAttribute('aria-label', 'Network connectivity ping matrix');
        var icon = document.createElement('div');
        icon.className = 'card-icon';
        icon.textContent = '● ●';
        var title = document.createElement('div');
        title.className = 'card-title';
        title.textContent = 'Connectivity';
        var rows = hubPingTargets.map(function(target) {
            var row = document.createElement('div');
            row.setAttribute('aria-live', 'polite');
            row.textContent = '● ' + target.label + ': checking';
            row.style.fontSize = '0.75rem';
            row.style.marginTop = '6px';
            matrix.appendChild(row);
            return row;
        });
        matrix.prepend(icon, title);
        grid.appendChild(matrix);

        async function updatePingMatrix() {
            if (profilePingInProgress || document.body.dataset.workspace !== 'hub') return;
            profilePingInProgress = true;
            await Promise.all(hubPingTargets.map(async function(target, index) {
                var startedAt = performance.now();
                var controller = new AbortController();
                var timeout = setTimeout(function() { controller.abort(); }, 3500);
                try {
                    await fetch(target.url, { mode: 'no-cors', cache: 'no-store', signal: controller.signal });
                    var latency = Math.round(performance.now() - startedAt);
                    rows[index].textContent = '● ' + target.label + ': ' + latency + ' ms';
                    rows[index].style.color = latency < 150 ? '#24834c' : latency < 400 ? '#a87900' : '#c44646';
                } catch (error) {
                    rows[index].textContent = '● ' + target.label + ': offline';
                    rows[index].style.color = '#c44646';
                } finally {
                    clearTimeout(timeout);
                }
            }));
            profilePingInProgress = false;
        }

        updatePingMatrix();
        profilePingTimer = setInterval(updatePingMatrix, 30000);
    }

    function addShortcut() {
        var title = prompt('Enter website name:');
        if (!title) return;
        var url = prompt('Enter website URL:');
        if (!url) return;
        if (document.body.dataset.workspace === 'game') {
            if (!isNativeGameShortcut(url)) {
                alert('Use a native steam:// or minecraft:// game link.');
                return;
            }
        } else if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }
        var icon = prompt('Enter an emoji icon:') || '🌐';
        shortcuts.push({ title: title, url: url, icon: icon });
        writeStorage('lemon_shortcuts', shortcuts);
        renderShortcuts();
    }

    function deleteShortcut(index) {
        shortcuts.splice(index, 1);
        writeStorage('lemon_shortcuts', shortcuts);
        renderShortcuts();
    }
