    function switchWorkspace(workspaceId) {
        var profile = workspaceProfiles.find(function(item) { return item.id === workspaceId; });
        if (!profile || profile.id === activeWorkspaceId) return;

        writeStorage('lemon_shortcuts', shortcuts);
        writeStorage('lemon_todos', todos);
        writeWorkspaceText('lemon_notepad_text', notepad.value);

        activeWorkspaceId = profile.id;
        document.body.dataset.workspace = workspaceTokens[activeWorkspaceId];
        localStorage.setItem('lemon_active_workspace', activeWorkspaceId);
        applyThemePalette();
        applyBackgroundStyle();

        var profileShortcuts = getDefaultShortcuts();
        var savedShortcuts = readStorage('lemon_shortcuts', profileShortcuts);
        shortcuts = Array.isArray(savedShortcuts) ? savedShortcuts : profileShortcuts.slice();
        var savedTodos = readStorage('lemon_todos', []);
        todos = Array.isArray(savedTodos) ? savedTodos : [];
        notepad.value = readWorkspaceText('lemon_notepad_text');
        document.getElementById('todoInput').value = '';
        document.getElementById('todoStatus').textContent = '';
        document.getElementById('workspaceProfileSelect').value = activeWorkspaceId;

        renderShortcuts();
        renderTodos();
        evaluateScratchpadMath();
    }

    document.getElementById('workspaceProfileSelect').value = activeWorkspaceId;
