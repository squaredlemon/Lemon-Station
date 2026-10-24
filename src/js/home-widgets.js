    var fixedHomeWidgetIds = ['shortcuts', 'bucket', 'habits', 'daily'];
    var extraHomeWidgetTypes = {
        tasks: { title: 'Task snapshot', icon: '✅' },
        timer: { title: 'Focus timer', icon: '⏱️' },
        notes: { title: 'Quick note', icon: '📝' },
        weather: { title: 'Weather glance', icon: '🌤️' },
        inspiration: { title: 'Daily inspiration', icon: '🍋' }
    };
    function normalizeHomeWidgetConfig(value) {
        var config = value && typeof value === 'object' ? value : {};
        var added = Array.isArray(config.added) ? config.added.filter(function(type, index, list) {
            return Object.prototype.hasOwnProperty.call(extraHomeWidgetTypes, type) && list.indexOf(type) === index;
        }) : [];
        var hidden = Array.isArray(config.hidden) ? config.hidden.filter(function(id, index, list) {
            return fixedHomeWidgetIds.includes(id) && list.indexOf(id) === index;
        }) : [];
        var validIds = fixedHomeWidgetIds.concat(added.map(function(type) { return 'extra-' + type; }));
        var order = Array.isArray(config.order) ? config.order.filter(function(id, index, list) {
            return validIds.includes(id) && list.indexOf(id) === index;
        }) : [];
        validIds.forEach(function(id) { if (!order.includes(id)) order.push(id); });
        return { order: order, hidden: hidden, added: added };
    }
    var homeWidgetConfig = normalizeHomeWidgetConfig(readStorage('lemon_home_widgets', null));
    var homeCustomizationActive = false;
    var selectedHomeWidgetId = fixedHomeWidgetIds[0];

    function appendWidgetButton(parent, label, callback, className) {
        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.setAttribute('aria-label', label);
        if (className) button.className = className;
        button.addEventListener('click', callback);
        parent.appendChild(button);
        return button;
    }

    function attachHomeWidgetControls(widget) {
        var id = widget.dataset.widgetId;
        if (widget.querySelector('.widget-manage-bar')) return;
        var bar = document.createElement('div');
        bar.className = 'widget-manage-bar';
        var title = document.createElement('span');
        title.className = 'widget-manage-title';
        title.textContent = widget.dataset.widgetTitle;
        bar.appendChild(title);
        var actions = document.createElement('div');
        actions.className = 'widget-manage-actions';
        appendWidgetButton(actions, '↑', function() { moveHomeWidget(id, -1); }, 'widget-move-up');
        appendWidgetButton(actions, '↓', function() { moveHomeWidget(id, 1); }, 'widget-move-down');
        appendWidgetButton(actions, 'Remove', function() { removeHomeWidget(id); }, 'widget-remove');
        bar.appendChild(actions);
        widget.insertBefore(bar, widget.firstChild);
    }

    function createHomeWidgetElement(type) {
        var definition = extraHomeWidgetTypes[type];
        if (!definition) return null;
        var widget = document.createElement('section');
        widget.className = 'dashboard-widget';
        widget.dataset.widgetId = 'extra-' + type;
        widget.dataset.widgetType = type;
        widget.dataset.widgetTitle = definition.title;
        attachHomeWidgetControls(widget);

        var card = document.createElement('article');
        card.className = 'home-widget-card';
        var heading = document.createElement('h2');
        heading.textContent = definition.icon + ' ' + definition.title;
        card.appendChild(heading);

        var description = document.createElement('p');
        var actions = document.createElement('div');
        actions.className = 'home-widget-actions';
        if (type === 'tasks') {
            description.textContent = 'A quick look at what is still on your list.';
            var remaining = document.createElement('strong');
            remaining.className = 'home-widget-metric';
            remaining.id = 'homeTaskCount';
            card.append(description, remaining);
            appendWidgetButton(actions, 'Open tasks', openTasks);
        } else if (type === 'timer') {
            description.textContent = 'Pick up your focus session whenever you are ready.';
            var timer = document.createElement('strong');
            timer.className = 'home-widget-metric';
            timer.id = 'homeTimerDisplay';
            timer.textContent = document.getElementById('timerDisplay').textContent;
            card.append(description, timer);
            appendWidgetButton(actions, 'Open Flow Timer', function() {
                switchView('timerView', document.getElementById('navTimer'));
            });
        } else if (type === 'notes') {
            description.textContent = 'A quick thought saved on this device.';
            var note = document.createElement('textarea');
            note.className = 'home-widget-note';
            note.id = 'homeQuickNote';
            note.maxLength = 2000;
            note.placeholder = 'Jot down a quick thought…';
            note.setAttribute('aria-label', 'Quick note saved on this device');
            note.value = localStorage.getItem('lemon_home_quick_note') || '';
            note.addEventListener('input', function() {
                localStorage.setItem('lemon_home_quick_note', note.value);
            });
            card.append(description, note);
            appendWidgetButton(actions, 'Open scratchpad', function() {
                switchView('notes', document.getElementById('navNotes'));
            });
        } else if (type === 'weather') {
            description.textContent = 'Check the latest conditions you looked up.';
            var weather = document.createElement('strong');
            weather.className = 'home-widget-metric';
            weather.id = 'homeWeatherSummary';
            card.append(description, weather);
            appendWidgetButton(actions, 'Open weather', function() {
                switchView('weather', document.getElementById('navWeather'));
            });
        } else if (type === 'inspiration') {
            description.className = 'home-widget-quote';
            description.id = 'homeInspirationText';
            card.appendChild(description);
            appendWidgetButton(actions, 'Another thought', rotateHomeInspiration);
        }
        card.appendChild(actions);
        widget.appendChild(card);
        return widget;
    }

    var homeInspirations = [
        'Small steps still move you forward.',
        'Make room for one thing at a time.',
        'A little progress is worth celebrating.',
        'You can begin again with the next moment.',
        'Keep it simple. Start with what matters.'
    ];
    function rotateHomeInspiration() {
        var text = document.getElementById('homeInspirationText');
        if (!text) return;
        var choices = homeInspirations.filter(function(item) { return item !== text.textContent; });
        text.textContent = choices[Math.floor(Math.random() * choices.length)];
    }

    function updateExtraHomeWidgets() {
        var taskCount = document.getElementById('homeTaskCount');
        if (taskCount) {
            var remaining = Array.isArray(todos) ? todos.filter(function(todo) { return !todo.done; }).length : 0;
            taskCount.textContent = remaining + (remaining === 1 ? ' task left' : ' tasks left');
        }
        var timerDisplay = document.getElementById('homeTimerDisplay');
        if (timerDisplay) timerDisplay.textContent = document.getElementById('timerDisplay').textContent;
        var weather = document.getElementById('homeWeatherSummary');
        if (weather) {
            var location = document.getElementById('wLocation').textContent;
            var temperature = document.getElementById('wTemp').textContent;
            weather.textContent = temperature.indexOf('--') === 0 ? 'Search for a location' : location + ' · ' + temperature;
        }
        var inspiration = document.getElementById('homeInspirationText');
        if (inspiration && !inspiration.textContent) rotateHomeInspiration();
    }

    function persistHomeWidgetConfig() {
        writeStorage('lemon_home_widgets', homeWidgetConfig);
    }

    function arrangeHomeWidgets() {
        var container = document.getElementById('dashboardWidgets');
        var widgets = new Map();
        container.querySelectorAll('.dashboard-widget').forEach(function(widget) {
            widgets.set(widget.dataset.widgetId, widget);
        });
        homeWidgetConfig.order.forEach(function(id) {
            var widget = widgets.get(id);
            if (!widget) return;
            widget.classList.toggle('widget-hidden', homeWidgetConfig.hidden.includes(id));
            container.appendChild(widget);
        });
        updateHomeWidgetChooser();
        updateExtraHomeWidgets();
    }

    function isHomeWidgetActive(id) {
        if (fixedHomeWidgetIds.includes(id)) return !homeWidgetConfig.hidden.includes(id);
        return homeWidgetConfig.added.includes(id.slice(6));
    }

    function getHomeWidgetDefinition(id) {
        if (fixedHomeWidgetIds.includes(id)) {
            var baseWidget = document.querySelector('[data-widget-id="' + id + '"]');
            var icons = { shortcuts: '🔗', bucket: '🔖', habits: '🌱', daily: '✨' };
            return { title: baseWidget ? baseWidget.dataset.widgetTitle : id, icon: icons[id] || '🍋' };
        }
        return extraHomeWidgetTypes[id.slice(6)] || null;
    }

    function updateHomeWidgetPreview() {
        var definition = getHomeWidgetDefinition(selectedHomeWidgetId);
        var title = document.getElementById('homeWidgetPreviewTitle');
        var preview = document.getElementById('homeWidgetPreview');
        if (!definition || !preview) return;
        title.textContent = definition.icon + '  ' + definition.title;
        preview.replaceChildren();
        var original = document.querySelector('[data-widget-id="' + selectedHomeWidgetId + '"]');
        var sample = original || (selectedHomeWidgetId.indexOf('extra-') === 0
            ? createHomeWidgetElement(selectedHomeWidgetId.slice(6))
            : null);
        if (!sample) return;
        var clone = sample.cloneNode(true);
        clone.classList.remove('widget-hidden', 'widget-editing');
        clone.querySelectorAll('[id]').forEach(function(element) { element.removeAttribute('id'); });
        if (clone.hasAttribute('id')) clone.removeAttribute('id');
        clone.querySelectorAll('input, textarea, button').forEach(function(element) {
            element.disabled = true;
        });
        preview.appendChild(clone);
    }

    function updateHomeWidgetChooser() {
        var list = document.getElementById('homeWidgetTabList');
        if (!list) return;
        list.replaceChildren();
        var widgetIds = fixedHomeWidgetIds.concat(Object.keys(extraHomeWidgetTypes).map(function(type) {
            return 'extra-' + type;
        }));
        widgetIds.forEach(function(id) {
            var definition = getHomeWidgetDefinition(id);
            var active = isHomeWidgetActive(id);
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'home-customizer-tab';
            button.setAttribute('aria-pressed', String(id === selectedHomeWidgetId));
            button.setAttribute('aria-label', definition.title + (active ? ', on Home Base' : ', not on Home Base'));
            var label = document.createElement('span');
            label.textContent = definition.icon + ' ' + definition.title;
            var state = document.createElement('span');
            state.className = 'home-customizer-tab-state';
            state.textContent = active ? 'Added' : 'Not added';
            button.append(label, state);
            button.addEventListener('click', function() {
                selectedHomeWidgetId = id;
                updateHomeWidgetChooser();
                document.getElementById('toggleSelectedHomeWidgetButton').focus();
            });
            list.appendChild(button);
        });
        var toggleButton = document.getElementById('toggleSelectedHomeWidgetButton');
        var active = isHomeWidgetActive(selectedHomeWidgetId);
        var visible = homeWidgetConfig.order.filter(function(id) { return !homeWidgetConfig.hidden.includes(id); });
        var selectedIndex = visible.indexOf(selectedHomeWidgetId);
        toggleButton.disabled = !selectedHomeWidgetId;
        document.getElementById('moveSelectedHomeWidgetUpButton').disabled = !active || selectedIndex <= 0;
        document.getElementById('moveSelectedHomeWidgetDownButton').disabled = !active || selectedIndex < 0 || selectedIndex >= visible.length - 1;
        updateHomeWidgetPreview();
    }

    function closeHomeCustomization() {
        if (!homeCustomizationActive) return;
        homeCustomizationActive = false;
        document.getElementById('dashboard').classList.remove('dashboard-customizing');
        var toggle = document.getElementById('customizeHomeButton');
        toggle.setAttribute('aria-pressed', 'false');
        toggle.setAttribute('aria-label', 'Customize Home Base');
        toggle.title = 'Customize Home Base';
        document.getElementById('homeCustomizerPanel').hidden = true;
        toggle.focus();
    }

    function toggleHomeCustomization() {
        if (homeCustomizationActive) {
            closeHomeCustomization();
            return;
        }
        homeCustomizationActive = true;
        document.getElementById('dashboard').classList.add('dashboard-customizing');
        var toggle = document.getElementById('customizeHomeButton');
        toggle.setAttribute('aria-pressed', 'true');
        toggle.setAttribute('aria-label', 'Finish customizing Home Base');
        toggle.title = 'Finish customizing Home Base';
        document.getElementById('homeCustomizerPanel').hidden = false;
        document.getElementById('homeCustomizationStatus').textContent = 'Your Home Base layout is saved on this device.';
        updateHomeWidgetChooser();
        document.getElementById('closeHomeCustomizerButton').focus();
    }

    function addHomeWidget(choice) {
        choice = choice || selectedHomeWidgetId;
        if (!choice) return;
        var existingBase = document.querySelector('[data-widget-id="' + choice + '"]');
        if (existingBase && fixedHomeWidgetIds.includes(choice)) {
            homeWidgetConfig.hidden = homeWidgetConfig.hidden.filter(function(id) { return id !== choice; });
            document.getElementById('homeCustomizationStatus').textContent = existingBase.dataset.widgetTitle + ' restored.';
        } else {
            var extraType = choice.indexOf('extra-') === 0 ? choice.slice(6) : choice;
            if (!Object.prototype.hasOwnProperty.call(extraHomeWidgetTypes, extraType) || homeWidgetConfig.added.includes(extraType)) return;
            var widget = createHomeWidgetElement(extraType);
            if (!widget) return;
            homeWidgetConfig.added.push(extraType);
            document.getElementById('dashboardWidgets').appendChild(widget);
            homeWidgetConfig.order.push('extra-' + extraType);
            document.getElementById('homeCustomizationStatus').textContent = extraHomeWidgetTypes[extraType].title + ' added.';
        }
        persistHomeWidgetConfig();
        arrangeHomeWidgets();
        updateHomeWidgetChooser();
    }

    function toggleSelectedHomeWidget() {
        var definition = getHomeWidgetDefinition(selectedHomeWidgetId);
        if (!definition) return;
        if (isHomeWidgetActive(selectedHomeWidgetId)) {
            removeHomeWidget(selectedHomeWidgetId);
            document.getElementById('homeCustomizationStatus').textContent = definition.title + ' removed from Home Base.';
        } else {
            addHomeWidget(selectedHomeWidgetId);
            document.getElementById('homeCustomizationStatus').textContent = definition.title + ' added to Home Base.';
        }
        updateHomeWidgetChooser();
    }

    function removeHomeWidget(id) {
        if (fixedHomeWidgetIds.includes(id)) {
            if (!homeWidgetConfig.hidden.includes(id)) homeWidgetConfig.hidden.push(id);
        } else if (id.indexOf('extra-') === 0) {
            var type = id.slice(6);
            homeWidgetConfig.added = homeWidgetConfig.added.filter(function(item) { return item !== type; });
            homeWidgetConfig.order = homeWidgetConfig.order.filter(function(item) { return item !== id; });
            var node = document.querySelector('[data-widget-id="' + id + '"]');
            if (node) node.remove();
        }
        document.getElementById('homeCustomizationStatus').textContent = 'Widget removed. Add it again or reset your layout to restore it.';
        persistHomeWidgetConfig();
        arrangeHomeWidgets();
    }

    function moveHomeWidget(id, direction) {
        var visible = homeWidgetConfig.order.filter(function(item) { return !homeWidgetConfig.hidden.includes(item); });
        var index = visible.indexOf(id);
        var target = index + direction;
        if (index < 0 || target < 0 || target >= visible.length) return;
        var displaced = visible[target];
        visible[target] = id;
        visible[index] = displaced;
        homeWidgetConfig.order = visible.concat(homeWidgetConfig.hidden.filter(function(item) { return !visible.includes(item); }));
        persistHomeWidgetConfig();
        arrangeHomeWidgets();
        document.getElementById('homeCustomizationStatus').textContent = 'Widget order saved.';
    }

    function resetHomeWidgets() {
        homeWidgetConfig = { order: fixedHomeWidgetIds.slice(), hidden: [], added: [] };
        document.querySelectorAll('.dashboard-widget[data-widget-type]').forEach(function(widget) { widget.remove(); });
        persistHomeWidgetConfig();
        arrangeHomeWidgets();
        document.getElementById('homeCustomizationStatus').textContent = 'Default Home Base widgets restored.';
    }

    document.body.appendChild(document.getElementById('homeCustomizerPanel'));
    document.getElementById('closeHomeCustomizerButton').addEventListener('click', closeHomeCustomization);
    document.getElementById('toggleSelectedHomeWidgetButton').addEventListener('click', toggleSelectedHomeWidget);
    document.getElementById('moveSelectedHomeWidgetUpButton').addEventListener('click', function() {
        moveHomeWidget(selectedHomeWidgetId, -1);
    });
    document.getElementById('moveSelectedHomeWidgetDownButton').addEventListener('click', function() {
        moveHomeWidget(selectedHomeWidgetId, 1);
    });
    document.getElementById('resetHomeWidgetsButton').addEventListener('click', resetHomeWidgets);
    document.getElementById('homeCustomizerPanel').addEventListener('click', function(event) {
        if (event.target === this) closeHomeCustomization();
    });
    document.getElementById('homeCustomizerPanel').addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeHomeCustomization();
            return;
        }
        if (event.key !== 'Tab') return;
        var focusable = Array.from(this.querySelectorAll('button:not(:disabled)'));
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });
    homeWidgetConfig.added.forEach(function(type) {
        var widget = createHomeWidgetElement(type);
        if (widget) document.getElementById('dashboardWidgets').appendChild(widget);
    });
    document.querySelectorAll('#dashboardWidgets > .dashboard-widget').forEach(attachHomeWidgetControls);
    arrangeHomeWidgets();
