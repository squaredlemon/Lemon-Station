(function() {
    var workerUrlInput = document.getElementById('aiWorkerUrl');
    var accessCodeInput = document.getElementById('aiAccessCode');
    var connectionForm = document.getElementById('aiConnectionForm');
    var connectionStatus = document.getElementById('aiConnectionStatus');
    var connectionIndicator = document.getElementById('aiConnectionIndicator');
    var connectButton = document.getElementById('aiConnectButton');
    var disconnectButton = document.getElementById('aiDisconnectButton');
    var chatForm = document.getElementById('aiChatForm');
    var messageInput = document.getElementById('aiMessageInput');
    var sendButton = document.getElementById('aiSendButton');
    var messageList = document.getElementById('aiMessageList');
    var chatStatus = document.getElementById('aiChatStatus');
    var conversation = [];
    var connected = false;
    var connecting = false;
    var sending = false;
    var workerUrlKey = 'lemon_ai_worker_url';

    function setConnectionMessage(message, isError) {
        connectionStatus.textContent = message;
        connectionStatus.classList.toggle('is-error', Boolean(isError));
        connectionIndicator.dataset.state = isError ? 'error' : connected ? 'connected' : 'disconnected';
        connectionIndicator.textContent = isError ? 'Connection issue' : connected ? 'Connected' : 'Not connected';
    }

    function setChatMessage(message, isError) {
        chatStatus.textContent = message;
        chatStatus.classList.toggle('is-error', Boolean(isError));
    }

    function readAccessCode() {
        try {
            return sessionStorage.getItem('lemon_ai_access_code') || '';
        } catch (error) {
            console.warn('Lemon AI session storage is unavailable:', error);
            return '';
        }
    }

    function normalizeWorkerUrl(value) {
        var parsed;
        try {
            parsed = new URL(value);
        } catch (error) {
            throw new Error('Enter the full HTTPS URL shown after deploying your Worker.');
        }
        var isLocalWorker = (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
            parsed.protocol === 'http:' && parsed.port === '8787';
        if ((!isLocalWorker && (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.workers.dev'))) ||
            parsed.username || parsed.password || parsed.search || parsed.hash ||
            (parsed.pathname !== '/' && parsed.pathname !== '')) {
            throw new Error('Use your HTTPS Cloudflare workers.dev URL, without a path or query string.');
        }
        return parsed.origin;
    }

    function endpointFor(action, baseUrl) {
        return baseUrl + (action === 'health' ? '/health' : '/api/chat');
    }

    async function requestWorker(action, accessCode, body, baseUrl) {
        if (window.lemonAI && typeof window.lemonAI.request === 'function') {
            return window.lemonAI.request(baseUrl, accessCode, action, body || null);
        }
        var controller = new AbortController();
        var timeout = window.setTimeout(function() { controller.abort(); }, 45000);
        try {
            var response = await fetch(endpointFor(action, baseUrl), {
                method: action === 'health' ? 'GET' : 'POST',
                headers: {
                    Authorization: 'Bearer ' + accessCode,
                    ...(body ? { 'Content-Type': 'application/json' } : {})
                },
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal
            });
            var data;
            try {
                data = await response.json();
            } catch (error) {
                throw new Error('The AI backend returned an unreadable response.');
            }
            return { ok: response.ok, status: response.status, data: data };
        } finally {
            window.clearTimeout(timeout);
        }
    }

    function describeConnectionError(result) {
        if (result.status === 401) return 'That access code was not accepted. Check the Cloudflare secret and try again.';
        if (result.status === 403) return 'This site is not allowed by the Worker. Check ALLOWED_ORIGINS in ai-worker/wrangler.jsonc.';
        if (result.status === 429) return 'The Worker is rate-limiting requests. Wait a minute and try again.';
        if (result.status === 503) return result.data.error || 'The Worker is missing a required secret or rate-limit binding.';
        return result.data && result.data.error || 'Could not connect to the Gemini Worker.';
    }

    async function verifyConnection(baseUrl, accessCode) {
        connecting = true;
        connected = false;
        connectButton.disabled = true;
        disconnectButton.hidden = true;
        setConnectionMessage('Checking your private Gemini connection…', false);
        updateSendButton();
        try {
            var result = await requestWorker('health', accessCode, null, baseUrl);
            if (!result.ok || !result.data || result.data.ok !== true) {
                throw new Error(describeConnectionError(result));
            }
            connected = true;
            workerUrlInput.value = baseUrl;
            accessCodeInput.value = accessCode;
            localStorage.setItem(workerUrlKey, baseUrl);
            sessionStorage.setItem('lemon_ai_access_code', accessCode);
            disconnectButton.hidden = false;
            setConnectionMessage('Gemini is ready through your private Worker.', false);
        } catch (error) {
            connected = false;
            setConnectionMessage(error.name === 'AbortError'
                ? 'The Worker took too long to respond. Check its URL and try again.'
                : error.message || 'Could not reach the Gemini Worker.', true);
        } finally {
            connecting = false;
            connectButton.disabled = false;
            updateSendButton();
        }
        return connected;
    }

    function updateSendButton() {
        sendButton.disabled = !connected || connecting || sending || !messageInput.value.trim();
    }

    function appendMessage(role, text, pending) {
        var item = document.createElement('li');
        item.className = 'ai-message';
        item.dataset.role = role === 'user' ? 'user' : 'assistant';
        if (pending) item.dataset.pending = 'true';
        var avatar = document.createElement('span');
        avatar.className = 'ai-message-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = role === 'user' ? '🙂' : '🍋';
        var content = document.createElement('div');
        content.className = 'ai-message-content';
        content.textContent = text;
        item.append(avatar, content);
        messageList.appendChild(item);
        messageList.scrollTop = messageList.scrollHeight;
        return item;
    }

    function currentTaskContext() {
        if (!document.getElementById('aiIncludeTasks').checked) return {};
        return {
            openTasks: (Array.isArray(window.todos) ? window.todos : [])
                .filter(function(task) { return task && !task.done && typeof task.text === 'string'; })
                .slice(0, 12)
                .map(function(task) { return task.text.slice(0, 140); })
        };
    }

    function recentConversation() {
        var recent = conversation.slice(-12);
        if (recent.length && recent[0].role === 'assistant') recent.shift();
        function totalCharacters() {
            return recent.reduce(function(total, message) { return total + message.text.length; }, 0);
        }
        while (recent.length > 1 && totalCharacters() > 15000) {
            recent.shift();
            if (recent[0] && recent[0].role === 'assistant') recent.shift();
        }
        return recent;
    }

    async function sendMessage(text) {
        if (!connected || sending) return;
        var prompt = text.trim();
        if (!prompt) return;
        sending = true;
        messageInput.value = '';
        appendMessage('user', prompt);
        conversation.push({ role: 'user', text: prompt });
        var pendingMessage = appendMessage('assistant', 'Thinking through it…', true);
        setChatMessage('Lemon AI is thinking…', false);
        updateSendButton();
        try {
            var result = await requestWorker('chat', readAccessCode(), {
                messages: recentConversation(),
                context: currentTaskContext()
            }, normalizeWorkerUrl(workerUrlInput.value));
            if (!result.ok || !result.data || typeof result.data.reply !== 'string') {
                throw new Error(describeConnectionError(result));
            }
            conversation.push({ role: 'assistant', text: result.data.reply });
            pendingMessage.remove();
            appendMessage('assistant', result.data.reply);
            setChatMessage('', false);
        } catch (error) {
            conversation.pop();
            pendingMessage.remove();
            setChatMessage(error.name === 'AbortError'
                ? 'That took too long. Check your connection and try again.'
                : error.message || 'Lemon AI could not reply. Check the connection and try again.', true);
        } finally {
            sending = false;
            updateSendButton();
            messageInput.focus();
        }
    }

    connectionForm.addEventListener('submit', function(event) {
        event.preventDefault();
        var baseUrl;
        try {
            baseUrl = normalizeWorkerUrl(workerUrlInput.value.trim());
        } catch (error) {
            setConnectionMessage(error.message, true);
            return;
        }
        var accessCode = accessCodeInput.value.trim();
        if (accessCode.length < 32 || accessCode.length > 128) {
            setConnectionMessage('Use the long private access code you created for this Worker (32–128 characters).', true);
            return;
        }
        try {
            sessionStorage.setItem('lemon_ai_access_code', accessCode);
            localStorage.setItem(workerUrlKey, baseUrl);
        } catch (error) {
            setConnectionMessage('This browser could not save the connection for this session.', true);
            return;
        }
        verifyConnection(baseUrl, accessCode);
    });

    disconnectButton.addEventListener('click', function() {
        connected = false;
        workerUrlInput.value = '';
        accessCodeInput.value = '';
        localStorage.removeItem(workerUrlKey);
        sessionStorage.removeItem('lemon_ai_access_code');
        setConnectionMessage('Connection details forgotten on this device.', false);
        updateSendButton();
    });

    chatForm.addEventListener('submit', function(event) {
        event.preventDefault();
        sendMessage(messageInput.value);
    });

    messageInput.addEventListener('input', updateSendButton);

    document.querySelectorAll('[data-ai-prompt]').forEach(function(button) {
        button.addEventListener('click', function() {
            messageInput.value = button.dataset.aiPrompt;
            updateSendButton();
            messageInput.focus();
        });
    });

    document.getElementById('aiClearChatButton').addEventListener('click', function() {
        if (sending) return;
        conversation = [];
        messageList.replaceChildren();
        appendMessage('assistant', 'Hi ' + (typeof userSettings === 'object' && userSettings && userSettings.name.trim()
            ? userSettings.name.trim()
            : 'there') + '! Tell me what you would like to make easier today.');
        setChatMessage('This chat is only kept in this tab.', false);
    });

    workerUrlInput.value = localStorage.getItem(workerUrlKey) || '';
    accessCodeInput.value = readAccessCode();
    appendMessage('assistant', 'Hi ' + (typeof userSettings === 'object' && userSettings && userSettings.name.trim()
        ? userSettings.name.trim()
        : 'there') + '! I can help you plan, break a task into steps, or find a small reset.');
    updateSendButton();
    if (workerUrlInput.value && accessCodeInput.value) {
        verifyConnection(workerUrlInput.value, accessCodeInput.value);
    } else {
        setConnectionMessage('Deploy the Worker in the ai-worker folder, then connect it here.', false);
    }
})();
