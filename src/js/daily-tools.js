    var bucket = readStorage('lemon_bucket', []);
    function renderBucketLinks() {
        var out = document.getElementById('bucketLinks');
        out.innerHTML = '';
        bucket.forEach(function(url, i) {
            var div = document.createElement('div');
            div.className = 'bucket-item';

            var link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = url;

            var button = document.createElement('button');
            button.type = 'button';
            button.textContent = '✕';
            button.onclick = function() { removeBucketLink(i); };

            div.appendChild(link);
            div.appendChild(button);
            out.appendChild(div);
        });
    }

    function addBucketLink() {
        var inp = document.getElementById('bucketInput');
        var url = inp.value.trim();
        if (!url) return;
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        bucket.push(url);
        writeStorage('lemon_bucket', bucket);
        inp.value = '';
        renderBucketLinks();
    }

    function removeBucketLink(i) {
        bucket.splice(i, 1);
        writeStorage('lemon_bucket', bucket);
        renderBucketLinks();
    }

    var audioCtx = null, noiseNode = null, audioPlaying = false;
    function toggleAmbientBeats() {
        var btn = document.getElementById('audioToggleBtn');
        var glow = document.getElementById('visualizerGlow');

        if (!audioPlaying) {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }

            var bufferSize = 2 * audioCtx.sampleRate;
            var noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            var output = noiseBuffer.getChannelData(0);
            for (var i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            noiseNode = audioCtx.createBufferSource();
            noiseNode.buffer = noiseBuffer;
            noiseNode.loop = true;

            var filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 430;

            var gain = audioCtx.createGain();
            gain.gain.value = 0.14;

            noiseNode.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);
            noiseNode.start();

            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            audioPlaying = true;
            btn.textContent = 'Stop Ambient Loop';
            glow.classList.add('active');
        } else {
            if (noiseNode) {
                noiseNode.stop();
                noiseNode.disconnect();
                noiseNode = null;
            }
            if (audioCtx && audioCtx.state === 'running') {
                audioCtx.suspend();
            }
            audioPlaying = false;
            btn.textContent = 'Play Lo-Fi Noise Loop';
            glow.classList.remove('active');
        }
    }

    var timerInterval = null, timerSeconds = 1500, timerDuration = 1500, timerEndsAt = null;
    var timerMode = 'Focus session';
    function paintTimer() {
        var minutes = Math.floor(timerSeconds / 60), seconds = timerSeconds % 60;
        document.getElementById('timerDisplay').textContent = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
        document.getElementById('timerDial').style.setProperty('--timer-progress', ((timerDuration - timerSeconds) / timerDuration * 360) + 'deg');
        document.getElementById('timerRemainingLabel').textContent = timerInterval ? 'Stay with this moment' : timerSeconds === timerDuration ? 'Ready when you are' : 'Paused — resume when ready';
        updateExtraHomeWidgets();
    }
    function setTimerPreset(minutes, label, button) {
        clearInterval(timerInterval);
        timerInterval = null;
        timerEndsAt = null;
        timerMode = label;
        timerDuration = minutes * 60;
        timerSeconds = timerDuration;
        document.getElementById('timerModeLabel').textContent = label;
        document.getElementById('timerControlBtn').textContent = minutes === 5 ? 'Start break' : 'Start focus';
        document.getElementById('timerStatus').textContent = 'Choose a session and press start.';
        document.querySelectorAll('.timer-preset').forEach(function(preset) { preset.classList.toggle('active', preset === button); });
        paintTimer();
    }
    function toggleSprintTimer() {
        var btn = document.getElementById('timerControlBtn');
        if (timerInterval) {
            timerSeconds = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
            clearInterval(timerInterval);
            timerInterval = null;
            timerEndsAt = null;
            btn.textContent = 'Resume timer';
            document.getElementById('timerStatus').textContent = 'Paused. Your time is saved until you reset or change the session.';
        } else {
            if (timerSeconds <= 0) timerSeconds = timerDuration;
            document.getElementById('timerStatus').textContent = timerMode + ' in progress.';
            btn.textContent = 'Pause timer';
            timerEndsAt = Date.now() + timerSeconds * 1000;
            timerInterval = setInterval(function() {
                timerSeconds = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
                paintTimer();
                if (timerSeconds === 0) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                    timerEndsAt = null;
                    btn.textContent = 'Start again';
                    document.getElementById('timerRemainingLabel').textContent = 'Session complete';
                    document.getElementById('timerStatus').textContent = 'Lovely work — take a moment to reset.';
                    if ('Notification' in window && Notification.permission === 'granted') new Notification('Lemon Station timer', { body: timerMode + ' complete.' });
                }
            }, 1000);
        }
        paintTimer();
    }
    function resetSprintTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
        timerEndsAt = null;
        timerSeconds = timerDuration;
        document.getElementById('timerControlBtn').textContent = timerDuration <= 300 ? 'Start break' : 'Start focus';
        document.getElementById('timerStatus').textContent = 'Timer reset. Ready when you are.';
        paintTimer();
    }

    var clipHistory = readStorage('lemon_clips', []);
    if (!Array.isArray(clipHistory)) clipHistory = [];
    var clipLoggingEnabled = false;
    function renderClipHistory() {
        var reel = document.getElementById('clipHistoryReel');
        var count = clipHistory.length;
        reel.replaceChildren();
        document.getElementById('clipCount').textContent = count ? count + ' of 10 snippets saved' : 'No snippets saved yet';
        document.getElementById('clearClipsButton').disabled = count === 0;
        if (!count) {
            var empty = document.createElement('div');
            empty.className = 'clip-empty';
            empty.textContent = 'Your shelf is clear. Capture a text snippet to keep it handy.';
            reel.appendChild(empty);
            return;
        }
        clipHistory.forEach(function(text) {
            var card = document.createElement('button');
            card.type = 'button';
            card.className = 'clip-card';
            card.textContent = text;
            card.setAttribute('aria-label', 'Copy saved snippet: ' + text.slice(0, 80));
            card.addEventListener('click', async function() {
                try {
                    if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard writing is not available in this browser.');
                    await navigator.clipboard.writeText(text);
                    document.getElementById('clipStatus').textContent = 'Snippet copied to your clipboard.';
                } catch (error) {
                    document.getElementById('clipStatus').textContent = error.message || 'Could not copy this snippet. Check clipboard permissions.';
                }
            });
            reel.appendChild(card);
        });
    }

    function saveClipboardSnippet(text, message) {
        clipHistory = [text].concat(clipHistory.filter(function(item) { return item !== text; })).slice(0, 10);
        writeStorage('lemon_clips', clipHistory);
        document.getElementById('clipStatus').textContent = message;
        renderClipHistory();
    }

    function logInPageCopy(event) {
        var target = event.target instanceof Element ? event.target : null;
        if (target && target.closest('input, textarea, [contenteditable="true"], [type="password"]')) return;
        var text = event.clipboardData && event.clipboardData.getData('text/plain').trim();
        if (text) saveClipboardSnippet(text, 'Copied text from Lemon Station saved to your shelf.');
    }

    function toggleClipLogger() {
        var button = document.getElementById('clipLoggerToggle');
        clipLoggingEnabled = !clipLoggingEnabled;
        if (clipLoggingEnabled) {
            document.addEventListener('copy', logInPageCopy);
        } else {
            document.removeEventListener('copy', logInPageCopy);
        }
        button.setAttribute('aria-pressed', String(clipLoggingEnabled));
        button.textContent = clipLoggingEnabled ? 'Stop in-page copy logging' : 'Start in-page copy logging';
        document.getElementById('clipStatus').textContent = clipLoggingEnabled
            ? 'In-page copy logging is on for this session.'
            : 'In-page copy logging is off.';
    }

    async function captureClipboardText() {
        var status = document.getElementById('clipStatus');
        try {
            if (!navigator.clipboard || !navigator.clipboard.readText) throw new Error('Clipboard reading is not available. Use a secure browser context and allow clipboard access.');
            var text = (await navigator.clipboard.readText()).trim();
            if (!text) {
                status.textContent = 'The clipboard is empty or does not contain text.';
                return;
            }
            saveClipboardSnippet(text, 'Snippet saved to your shelf.');
        } catch (error) {
            status.textContent = error.message || 'Clipboard access failed. Check your browser permissions.';
        }
    }
    function clearClipHistory() {
        clipHistory = [];
        writeStorage('lemon_clips', clipHistory);
        document.getElementById('clipStatus').textContent = 'Clipboard shelf cleared.';
        renderClipHistory();
    }

    function calculateExpression(source) {
        var tokens = source.replace(/[×]/g, '*').replace(/[÷]/g, '/').replace(/[−–]/g, '-').match(/\d+(?:\.\d*)?(?:%?)|[()+\-*/]/g);
        if (!tokens || tokens.join('') !== source.replace(/\s+/g, '').replace(/[×]/g, '*').replace(/[÷]/g, '/').replace(/[−–]/g, '-')) throw new Error('Invalid expression');
        var index = 0;
        function primary() {
            var token = tokens[index++];
            if (token === '+' || token === '-') return token === '-' ? -primary() : primary();
            if (token === '(') {
                var value = expression();
                if (tokens[index++] !== ')') throw new Error('Missing closing parenthesis');
                return value;
            }
            if (!token || !/^\d/.test(token)) throw new Error('Expected a number');
            return Number(token.replace('%', '')) / (token.endsWith('%') ? 100 : 1);
        }
        function term() {
            var value = primary();
            while (tokens[index] === '*' || tokens[index] === '/') {
                var operator = tokens[index++], next = primary();
                value = operator === '*' ? value * next : value / next;
            }
            return value;
        }
        function expression() {
            var value = term();
            while (tokens[index] === '+' || tokens[index] === '-') {
                var operator = tokens[index++], next = term();
                value = operator === '+' ? value + next : value - next;
            }
            return value;
        }
        var result = expression();
        if (index !== tokens.length || !Number.isFinite(result)) throw new Error('Invalid calculation');
        return result;
    }
    function evaluateScratchpadMath() {
        var results = [];
        document.getElementById('notepad').value.split('\n').forEach(function(line) {
            var formula = line.trim();
            if (!formula || !/\d/.test(formula) || !/[+\-−–*×/÷%()]/.test(formula)) return;
            try { results.push(formula + ' = ' + calculateExpression(formula)); } catch (error) {}
        });
        document.getElementById('mathEvalOutput').textContent = results.length ? results.join('\n') : 'Calculations on their own line will appear here.';
        document.getElementById('calculationCount').textContent = String(results.length);
    }
    function clearScratchpad() {
        document.getElementById('notepad').value = '';
        removeWorkspaceValue('lemon_notepad_text');
        document.getElementById('notesSaveStatus').textContent = 'Scratchpad cleared';
        evaluateScratchpadMath();
    }
    function insertMathExample(example) {
        var notes = document.getElementById('notepad');
        notes.value += (notes.value && !notes.value.endsWith('\n') ? '\n' : '') + example + '\n';
        notes.dispatchEvent(new Event('input', { bubbles: true }));
        notes.focus();
    }

    var todoFilter = 'all';
    function setTodoFilter(filter, button) {
        todoFilter = filter;
        document.querySelectorAll('.todo-filter').forEach(function(item) { item.classList.toggle('active', item === button); });
        renderTodos();
    }
    function renderTodos() {
        var out = document.getElementById('todoList');
        out.replaceChildren();
        var completed = todos.filter(function(item) { return item.done; }).length;
        var remaining = todos.length - completed;
        document.getElementById('todoRemainingCount').textContent = String(remaining);
        document.getElementById('todoCompletedCount').textContent = completed + ' completed';
        document.getElementById('todoProgressFill').style.width = (todos.length ? completed / todos.length * 100 : 0) + '%';
        document.getElementById('clearCompletedButton').disabled = completed === 0;
        updateExtraHomeWidgets();
        var visibleTodos = todos.map(function(item, index) { return { item: item, index: index }; }).filter(function(entry) {
            return todoFilter === 'all' || (todoFilter === 'active' && !entry.item.done) || (todoFilter === 'completed' && entry.item.done);
        });
        if (!visibleTodos.length) {
            var empty = document.createElement('div');
            empty.className = 'todo-empty';
            empty.textContent = todos.length ? 'Nothing in this filter yet.' : 'No tasks yet — add one small next step above.';
            out.appendChild(empty);
            return;
        }
        visibleTodos.forEach(function(entry) {
            var item = entry.item, index = entry.index;
            var row = document.createElement('div');
            row.className = 'todo-item' + (item.done ? ' done' : '');
            var label = document.createElement('label');
            label.className = 'todo-item-left';
            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = Boolean(item.done);
            checkbox.addEventListener('change', function() { toggleTodoItem(index); });
            var text = document.createElement('span');
            text.textContent = item.text;
            label.append(checkbox, text);
            var remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'todo-delete';
            remove.textContent = '×';
            remove.setAttribute('aria-label', 'Delete task: ' + item.text);
            remove.addEventListener('click', function() { deleteTodoItem(index); });
            row.append(label, remove);
            out.appendChild(row);
        });
    }

    function addTodoItem(event) {
        if (event) event.preventDefault();
        var inp = document.getElementById('todoInput');
        var text = inp.value.trim();
        if (!text) {
            document.getElementById('todoStatus').textContent = 'Type a task before adding it.';
            return;
        }
        todos.push({ text: text, done: false });
        writeStorage('lemon_todos', todos);
        inp.value = '';
        document.getElementById('todoStatus').textContent = 'Task added.';
        renderTodos();
    }

    function toggleTodoItem(i) {
        if (!todos[i]) return;
        todos[i].done = !todos[i].done;
        writeStorage('lemon_todos', todos);
        document.getElementById('todoStatus').textContent = todos[i].done ? 'Task marked complete.' : 'Task marked as still to do.';
        renderTodos();
    }

    function deleteTodoItem(i) {
        if (i < 0 || i >= todos.length) return;
        todos.splice(i, 1);
        writeStorage('lemon_todos', todos);
        document.getElementById('todoStatus').textContent = 'Task removed.';
        renderTodos();
    }

    function clearCompletedTodos() {
        todos = todos.filter(function(item) { return !item.done; });
        writeStorage('lemon_todos', todos);
        document.getElementById('todoStatus').textContent = 'Completed tasks cleared.';
        renderTodos();
    }
