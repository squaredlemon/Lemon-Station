(function() {
    var dialog = document.getElementById('commandPalette');
    var input = document.getElementById('commandPaletteInput');
    var results = document.getElementById('commandPaletteResults');
    var emptyState = document.getElementById('commandPaletteEmpty');
    var trigger = document.getElementById('openCommandPaletteButton');
    var selectedIndex = 0;
    var options = [];
    trigger.querySelector('kbd').textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';
    var commands = [
        { label: 'Home Base', detail: 'Your daily dashboard', icon: '⌂', target: 'navHome' },
        { label: 'Lemon Browser', detail: 'Search and browse the web', icon: '↗', target: 'navBrowser' },
        { label: 'Flow Timer', detail: 'Focus sessions and breaks', icon: '◷', target: 'navTimer' },
        { label: 'Spotify Lounge', detail: 'Find music and playlists', icon: '♫', target: 'navSpotify' },
        { label: 'Media', detail: 'Find a film or show', icon: '▣', target: 'navMedia' },
        { label: 'Clip History', detail: 'Recently copied items', icon: '▤', target: 'navClip' },
        { label: 'Tasks', detail: 'Plan and track your to-dos', icon: '✓', target: 'navTodo' },
        { label: 'Weather View', detail: 'Current conditions and forecast', icon: '☼', target: 'navWeather' },
        { label: 'Math Scratchpad', detail: 'Notes and quick calculations', icon: '∑', target: 'navNotes' },
        { label: 'Lemon AI', detail: 'Your everyday assistant', icon: '✳', target: 'navAssistant' },
        { label: 'Browser Store', detail: 'Browser extensions and sidebar apps', icon: '⊞', target: 'navBrowserStore' },
        { label: 'Theme Config', detail: 'Appearance, accounts, and backups', icon: '⚙', target: 'navSettings' }
    ];

    function currentCommands() {
        return commands.concat(Array.from(document.querySelectorAll('.browser-extension-button, .sidebar-app-nav-item')).map(function(item) {
            return {
                label: item.getAttribute('aria-label'),
                detail: item.classList.contains('sidebar-app-nav-item') ? 'Installed sidebar app' : 'Installed browser extension',
                icon: '✳',
                target: item.id
            };
        }));
    }

    function renderResults() {
        var query = input.value.trim().toLocaleLowerCase();
        var matches = currentCommands().filter(function(command) {
            return !query || (command.label + ' ' + command.detail).toLocaleLowerCase().includes(query);
        });
        results.replaceChildren();
        options = [];
        selectedIndex = Math.min(selectedIndex, Math.max(0, matches.length - 1));
        emptyState.hidden = matches.length > 0;

        matches.forEach(function(command, index) {
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'command-palette-option';
            button.id = 'command-palette-option-' + index;
            button.setAttribute('role', 'option');
            button.setAttribute('aria-selected', String(index === selectedIndex));

            var icon = document.createElement('span');
            icon.className = 'command-palette-option-icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = command.icon;
            var copy = document.createElement('span');
            copy.className = 'command-palette-option-copy';
            var label = document.createElement('strong');
            label.textContent = command.label;
            var detail = document.createElement('small');
            detail.textContent = command.detail;
            copy.append(label, detail);
            var arrow = document.createElement('span');
            arrow.className = 'command-palette-option-arrow';
            arrow.setAttribute('aria-hidden', 'true');
            arrow.textContent = '↵';
            button.append(icon, copy, arrow);
            button.addEventListener('mouseenter', function() {
                selectedIndex = index;
                updateSelection();
            });
            button.addEventListener('click', function() { openCommand(command); });
            results.appendChild(button);
            options.push(button);
        });
        updateSelection();
    }

    function updateSelection() {
        options.forEach(function(option, index) {
            option.setAttribute('aria-selected', String(index === selectedIndex));
        });
        var selected = options[selectedIndex];
        if (selected) {
            results.setAttribute('aria-activedescendant', selected.id);
        } else {
            results.removeAttribute('aria-activedescendant');
        }
    }

    function openCommand(command) {
        dialog.close();
        if (command.target) {
            var target = document.getElementById(command.target);
            if (target) target.click();
            return;
        }
        var view = document.getElementById(command.view);
        if (view) switchView(command.view, null);
    }

    function openPalette() {
        if (dialog.open || !document.getElementById('welcomeOverlay').hidden) return;
        input.value = '';
        selectedIndex = 0;
        renderResults();
        dialog.showModal();
        window.requestAnimationFrame(function() { input.focus(); });
    }

    trigger.addEventListener('click', openPalette);
    dialog.addEventListener('close', function() { trigger.focus(); });
    input.addEventListener('input', function() {
        selectedIndex = 0;
        renderResults();
    });
    input.addEventListener('keydown', function(event) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            selectedIndex = options.length ? (selectedIndex + 1) % options.length : 0;
            updateSelection();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            selectedIndex = options.length ? (selectedIndex - 1 + options.length) % options.length : 0;
            updateSelection();
        } else if (event.key === 'Enter' && options[selectedIndex]) {
            event.preventDefault();
            options[selectedIndex].click();
        }
    });
    dialog.addEventListener('click', function(event) {
        if (event.target === dialog) dialog.close();
    });
    document.addEventListener('keydown', function(event) {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            openPalette();
        }
    });
})();
