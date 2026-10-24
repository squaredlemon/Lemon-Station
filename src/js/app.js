    var notepad = document.getElementById('notepad');
    notepad.value = readWorkspaceText('lemon_notepad_text');
    notepad.oninput = function() {
        writeWorkspaceText('lemon_notepad_text', notepad.value);
        evaluateScratchpadMath();
    };

    var browserPageViewport = document.getElementById('browserPageViewport');
    browserPageViewport.insertBefore(document.getElementById('dashboard'), browserPageViewport.firstChild);

    renderShortcuts();
    renderBucketLinks();
    renderTodos();
    renderClipHistory();
    renderDailyHabits();
    evaluateScratchpadMath();
