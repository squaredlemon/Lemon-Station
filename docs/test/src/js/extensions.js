(function() {
    var browserExtensionKey = 'lemon_installed_browser_extensions';
    var sidebarAppKey = 'lemon_installed_extensions';
    var browserExtensions = [
        {
            id: 'reader',
            name: 'Reader Mode',
            icon: '📖',
            description: 'Give article pages a calmer layout with comfortable line lengths and readable type.'
        },
        {
            id: 'focus',
            name: 'Focus Mode',
            icon: '🎯',
            description: 'Hide common navigation, sidebars, and page distractions while you read.'
        },
        {
            id: 'dark',
            name: 'Dark Page',
            icon: '🌙',
            description: 'Apply a reversible dark appearance to bright web pages.'
        }
    ];
    var sidebarApps = [
        {
            id: 'water',
            name: 'Water Breaks',
            icon: '💧',
            description: 'Keep a gentle tally of the glasses of water you drink each day.',
            navLabel: '💧 Water Breaks'
        },
        {
            id: 'reflection',
            name: 'Daily Reflection',
            icon: '🌱',
            description: 'Save a small daily intention or reflection, right inside your workspace.',
            navLabel: '🌱 Daily Reflection'
        },
        {
            id: 'converter',
            name: 'Quick Converter',
            icon: '🔁',
            description: 'Convert temperatures and distances without leaving Lemon Station.',
            navLabel: '🔁 Quick Converter'
        }
    ];
    var extensionStyles = {
        reader: 'html { color-scheme: light !important; } body { max-width: 860px !important; margin: 32px auto !important; padding: 32px !important; font-family: Georgia, serif !important; font-size: 19px !important; line-height: 1.8 !important; } article, main, [role="main"] { max-width: 100% !important; } img, video, pre, table { max-width: 100% !important; }',
        focus: 'nav, aside, footer, [role="navigation"], [aria-label*="advert" i], [class*="advert" i], [id*="advert" i], [class*="cookie-banner" i], [id*="cookie-banner" i] { display: none !important; }',
        dark: 'html { background: #17191c !important; filter: invert(0.88) hue-rotate(180deg) !important; } img, video, canvas, iframe, svg, picture { filter: invert(1) hue-rotate(180deg) !important; }'
    };
    function readLegacyAddOns() {
        try {
            var stored = JSON.parse(localStorage.getItem(sidebarAppKey) || '[]');
            if (!Array.isArray(stored)) throw new Error('Legacy add-ons must be a list.');
            return stored;
        } catch (error) {
            console.warn('Legacy add-ons could not be read:', error);
            return [];
        }
    }

    var legacyAddOns = readLegacyAddOns();
    var installedApps = readStoredIds(sidebarAppKey, sidebarApps);
    var installedBrowserExtensions = readStoredIds(browserExtensionKey, browserExtensions);
    if (localStorage.getItem(browserExtensionKey) === null) {
        installedBrowserExtensions = browserExtensions.map(function(extension) {
            return extension.id;
        }).filter(function(id) { return legacyAddOns.includes(id); });
        if (installedBrowserExtensions.length) {
            try {
                localStorage.setItem(browserExtensionKey, JSON.stringify(installedBrowserExtensions));
                localStorage.setItem(sidebarAppKey, JSON.stringify(installedApps));
            } catch (error) {
                console.warn('Legacy browser extensions could not be migrated:', error);
            }
        }
    }
    var activeStoreTab = 'extensions';

    function readStoredIds(key, catalog) {
        try {
            var stored = JSON.parse(localStorage.getItem(key) || '[]');
            if (!Array.isArray(stored)) throw new Error('Stored add-ons must be a list.');
            return catalog.map(function(item) { return item.id; }).filter(function(id) {
                return stored.includes(id);
            });
        } catch (error) {
            console.warn('Installed add-ons could not be read:', error);
            return [];
        }
    }

    function createElement(tag, className, text) {
        var element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function makeAction(label, action, secondary) {
        var button = createElement('button', 'extension-action' + (secondary ? ' secondary' : ''), label);
        button.type = 'button';
        button.addEventListener('click', action);
        return button;
    }

    function setStoreStatus(message) {
        document.getElementById('extensionStoreStatus').textContent = message;
    }

    function saveIds(key, ids) {
        try {
            localStorage.setItem(key, JSON.stringify(ids));
            if (typeof window.scheduleLemonCloudSync === 'function') window.scheduleLemonCloudSync();
            return true;
        } catch (error) {
            console.error('Installed add-ons could not be saved:', error);
            setStoreStatus('Could not save your changes on this device.');
            return false;
        }
    }

    function renderBrowserExtensionActions() {
        var container = document.getElementById('browserExtensionActions');
        container.replaceChildren();
        container.hidden = installedBrowserExtensions.length === 0;
        installedBrowserExtensions.forEach(function(id) {
            var extension = browserExtensions.find(function(item) { return item.id === id; });
            if (!extension) return;
            var button = createElement('button', 'browser-extension-button', extension.icon);
            button.id = 'browser-extension-' + id;
            button.type = 'button';
            button.title = extension.name;
            button.setAttribute('aria-label', extension.name);
            var activeTab = getActiveEmbeddedBrowserTab();
            button.setAttribute('aria-pressed', String(Boolean(
                activeTab && activeTab.activeExtensions && activeTab.activeExtensions[id]
            )));
            button.addEventListener('click', function() { toggleBrowserExtension(id); });
            container.appendChild(button);
        });
    }

    function renderBrowserExtensionCatalog() {
        var container = document.getElementById('extensionCatalog');
        container.replaceChildren();
        document.getElementById('extensionCount').textContent =
            installedBrowserExtensions.length + ' of ' + browserExtensions.length + ' installed';

        browserExtensions.forEach(function(extension) {
            var card = createElement('article', 'extension-card');
            var isInstalled = installedBrowserExtensions.includes(extension.id);
            card.appendChild(createElement('span', 'extension-card-icon', extension.icon));
            card.appendChild(createElement('h3', '', extension.name));
            card.appendChild(createElement('p', '', extension.description));
            card.appendChild(createElement('small', 'browser-store-card-note', 'Runs on pages open in Lemon Browser'));
            var actions = createElement('div', 'extension-card-actions');
            if (isInstalled) {
                actions.appendChild(makeAction('Remove extension', function() {
                    uninstallBrowserExtension(extension.id);
                }, true));
            } else {
                actions.appendChild(makeAction('Add extension', function() {
                    installBrowserExtension(extension.id);
                }));
            }
            card.appendChild(actions);
            container.appendChild(card);
        });
    }

    function renderSidebarAppCatalog() {
        var container = document.getElementById('sidebarAppCatalog');
        container.replaceChildren();
        document.getElementById('sidebarAppCount').textContent =
            installedApps.length + ' of ' + sidebarApps.length + ' added';

        sidebarApps.forEach(function(app) {
            var card = createElement('article', 'extension-card');
            var isInstalled = installedApps.includes(app.id);
            card.appendChild(createElement('span', 'extension-card-icon', app.icon));
            card.appendChild(createElement('h3', '', app.name));
            card.appendChild(createElement('p', '', app.description));
            card.appendChild(createElement('small', 'browser-store-card-note', 'Adds a shortcut to your Lemon Station sidebar'));
            var actions = createElement('div', 'extension-card-actions');
            if (isInstalled) {
                actions.appendChild(makeAction('Open app', function() {
                    switchView('sidebar-app-panel-' + app.id, document.getElementById('sidebar-app-' + app.id));
                }));
                actions.appendChild(makeAction('Remove app', function() {
                    uninstallSidebarApp(app.id);
                }, true));
            } else {
                actions.appendChild(makeAction('Add to sidebar', function() {
                    installSidebarApp(app.id);
                }));
            }
            card.appendChild(actions);
            container.appendChild(card);
        });
    }

    function selectStoreTab(tabName) {
        activeStoreTab = tabName === 'apps' ? 'apps' : 'extensions';
        var showApps = activeStoreTab === 'apps';
        document.getElementById('browserStoreExtensionsTab').setAttribute('aria-selected', String(!showApps));
        document.getElementById('browserStoreAppsTab').setAttribute('aria-selected', String(showApps));
        document.getElementById('browserStoreExtensionsPanel').hidden = showApps;
        document.getElementById('browserStoreAppsPanel').hidden = !showApps;
    }

    function extensionStyleId(id) {
        return 'lemon-station-extension-' + id;
    }

    function applyBrowserExtension(tab, id, enabled) {
        if (!tab || !tab.webview || typeof tab.webview.executeJavaScript !== 'function') {
            throw new Error('Browser extensions are available in the Lemon Station desktop app.');
        }
        var styleId = extensionStyleId(id);
        var css = extensionStyles[id];
        if (!css) throw new Error('This browser extension is unavailable.');
        var script = enabled
            ? '(function(){var old=document.getElementById(' + JSON.stringify(styleId) + ');if(old)old.remove();var s=document.createElement("style");s.id=' + JSON.stringify(styleId) + ';s.textContent=' + JSON.stringify(css) + ';document.head.appendChild(s);})()'
            : '(function(){var s=document.getElementById(' + JSON.stringify(styleId) + ');if(s)s.remove();})()';
        return tab.webview.executeJavaScript(script);
    }

    function removeBrowserExtensionStyle(tab, id) {
        if (!tab || !tab.webview || typeof tab.webview.executeJavaScript !== 'function') return;
        applyBrowserExtension(tab, id, false).catch(function(error) {
            console.error('Could not remove browser extension style:', error);
        });
    }

    function toggleBrowserExtension(id) {
        var tab = getActiveEmbeddedBrowserTab();
        if (!tab || !tab.url || tab.loading) {
            setStoreStatus(tab && tab.loading
                ? 'Wait for the page to finish loading before using an extension.'
                : 'Open a web page in Lemon Browser before using an extension.');
            return;
        }
        tab.activeExtensions = tab.activeExtensions || {};
        var enabled = !tab.activeExtensions[id];
        applyBrowserExtension(tab, id, enabled).then(function() {
            tab.activeExtensions[id] = enabled;
            var button = document.getElementById('browser-extension-' + id);
            if (button) button.setAttribute('aria-pressed', String(enabled));
            document.getElementById('browserStatus').textContent =
                browserExtensions.find(function(item) { return item.id === id; }).name + (enabled ? ' on' : ' off');
        }).catch(function(error) {
            console.error('Could not apply browser extension:', error);
            setStoreStatus(error.message || 'Could not apply this browser extension.');
        });
    }

    window.refreshBrowserExtensions = function(tab) {
        if (!tab || !tab.activeExtensions) return;
        Object.keys(tab.activeExtensions).forEach(function(id) {
            if (installedBrowserExtensions.includes(id) && tab.activeExtensions[id]) {
                applyBrowserExtension(tab, id, true).catch(function(error) {
                    console.error('Could not restore browser extension after navigation:', error);
                    setStoreStatus('Could not restore ' + id + ' after the page changed.');
                });
            }
        });
    };
    window.refreshBrowserExtensionActions = renderBrowserExtensionActions;

    function renderSidebarApps() {
        var nav = document.getElementById('sidebarAppNav');
        var group = document.getElementById('sidebarAppGroup');
        nav.replaceChildren();
        group.hidden = installedApps.length === 0;
        installedApps.forEach(function(id) {
            var app = sidebarApps.find(function(item) { return item.id === id; });
            if (!app) return;
            var button = createElement('button', 'nav-item sidebar-app-nav-item', app.navLabel);
            button.id = 'sidebar-app-' + id;
            button.type = 'button';
            button.setAttribute('aria-label', app.name);
            button.addEventListener('click', function() { switchView('sidebar-app-panel-' + id, button); });
            nav.appendChild(button);
        });
    }

    function localDateKey() {
        var now = new Date();
        return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0');
    }

    function renderSidebarAppPanel(app) {
        var panel = createElement('section', 'view-panel extension-panel');
        panel.id = 'sidebar-app-panel-' + app.id;
        panel.setAttribute('aria-label', app.name);
        var heading = createElement('header', 'tool-heading');
        heading.appendChild(createElement('p', 'tool-eyebrow', 'A little extra for your day'));
        heading.appendChild(createElement('h1', '', app.icon + ' ' + app.name));
        panel.appendChild(heading);
        var content = createElement('section', 'extension-tool-card');
        if (app.id === 'water') renderWaterApp(content);
        if (app.id === 'reflection') renderReflectionApp(content);
        if (app.id === 'converter') renderConverterApp(content);
        panel.appendChild(content);
        document.getElementById('sidebarAppPanels').appendChild(panel);
    }

    function renderWaterApp(content) {
        var saved;
        try {
            saved = JSON.parse(localStorage.getItem('lemon_extension_water') || '{}');
        } catch (error) {
            console.warn('Water Breaks data could not be read:', error);
            saved = {};
        }
        var countDate = localDateKey();
        var count = saved.date === countDate && Number.isInteger(saved.count) && saved.count >= 0
            ? saved.count
            : 0;
        content.appendChild(createElement('h2', '', 'A little hydration goes a long way'));
        content.appendChild(createElement('p', '', 'Track each glass as you go. Your count starts fresh each day.'));
        var tally = createElement('div', 'extension-water-count');
        var countText = createElement('span', '', String(count));
        var unitText = createElement('small', '', count === 1 ? ' glass today' : ' glasses today');
        tally.append(countText, unitText);
        content.appendChild(tally);
        var row = createElement('div', 'extension-form-row');
        row.appendChild(makeAction('＋ Add a glass', function() {
            if (countDate !== localDateKey()) {
                countDate = localDateKey();
                count = 0;
            }
            count += 1;
            countText.textContent = String(count);
            unitText.textContent = count === 1 ? ' glass today' : ' glasses today';
            localStorage.setItem('lemon_extension_water', JSON.stringify({ date: countDate, count: count }));
            if (typeof window.scheduleLemonCloudSync === 'function') window.scheduleLemonCloudSync();
        }));
        row.appendChild(createElement('p', '', 'One glass is counted as a simple check-in.'));
        content.appendChild(row);
    }

    function renderReflectionApp(content) {
        var prompts = [
            'What is one thing you would like to make time for today?',
            'What is something small that went well today?',
            'What would help you feel a little more focused right now?'
        ];
        var key = 'lemon_extension_reflection_' + localDateKey();
        content.appendChild(createElement('h2', '', 'Make space for a thought'));
        content.appendChild(createElement('p', '', prompts[new Date().getDate() % prompts.length]));
        var textarea = createElement('textarea', 'notes-area extension-input');
        textarea.rows = 7;
        textarea.setAttribute('aria-label', 'Today’s reflection');
        textarea.placeholder = 'Write a thought, intention, or small win…';
        textarea.value = localStorage.getItem(key) || '';
        var status = createElement('p', 'extension-save-status', textarea.value ? 'Saved on this device' : '');
        textarea.addEventListener('input', function() {
            localStorage.setItem(key, textarea.value);
            status.textContent = 'Saved on this device';
            if (typeof window.scheduleLemonCloudSync === 'function') window.scheduleLemonCloudSync();
        });
        content.append(textarea, status);
    }

    function renderConverterApp(content) {
        content.appendChild(createElement('h2', '', 'Convert a measurement'));
        content.appendChild(createElement('p', '', 'Choose a conversion, enter a value, and get a quick result.'));
        var row = createElement('div', 'extension-form-row');
        var input = createElement('input', 'extension-input');
        input.type = 'number';
        input.step = 'any';
        input.value = '1';
        input.setAttribute('aria-label', 'Value to convert');
        var select = createElement('select', 'extension-select');
        select.setAttribute('aria-label', 'Conversion type');
        [
            ['c-f', '°C to °F'],
            ['f-c', '°F to °C'],
            ['km-mi', 'Kilometres to miles'],
            ['mi-km', 'Miles to kilometres']
        ].forEach(function(optionData) {
            var option = createElement('option', '', optionData[1]);
            option.value = optionData[0];
            select.appendChild(option);
        });
        var result = createElement('p', 'extension-result', '');
        result.setAttribute('aria-live', 'polite');
        function updateResult() {
            var value = Number(input.value);
            if (input.value.trim() === '' || !Number.isFinite(value)) {
                result.textContent = 'Enter a number';
                return;
            }
            var converted;
            if (select.value === 'c-f') converted = value * 9 / 5 + 32;
            if (select.value === 'f-c') converted = (value - 32) * 5 / 9;
            if (select.value === 'km-mi') converted = value * 0.621371;
            if (select.value === 'mi-km') converted = value / 0.621371;
            result.textContent = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(converted);
        }
        input.addEventListener('input', updateResult);
        select.addEventListener('change', updateResult);
        row.append(input, select);
        content.append(row, result);
        updateResult();
    }

    function installBrowserExtension(id) {
        if (!browserExtensions.some(function(item) { return item.id === id; }) ||
            installedBrowserExtensions.includes(id)) return;
        installedBrowserExtensions.push(id);
        if (!saveIds(browserExtensionKey, installedBrowserExtensions)) {
            installedBrowserExtensions = installedBrowserExtensions.filter(function(item) { return item !== id; });
            return;
        }
        renderBrowserExtensionActions();
        renderBrowserExtensionCatalog();
        setStoreStatus(browserExtensions.find(function(item) { return item.id === id; }).name + ' added to Lemon Browser.');
    }

    function uninstallBrowserExtension(id) {
        if (!installedBrowserExtensions.includes(id)) return;
        var previous = installedBrowserExtensions;
        installedBrowserExtensions = installedBrowserExtensions.filter(function(item) { return item !== id; });
        if (!saveIds(browserExtensionKey, installedBrowserExtensions)) {
            installedBrowserExtensions = previous;
            return;
        }
        embeddedBrowserTabs.forEach(function(tab) {
            if (tab.activeExtensions) delete tab.activeExtensions[id];
            removeBrowserExtensionStyle(tab, id);
        });
        renderBrowserExtensionActions();
        renderBrowserExtensionCatalog();
        setStoreStatus(browserExtensions.find(function(item) { return item.id === id; }).name + ' removed from Lemon Browser.');
    }

    function installSidebarApp(id) {
        var app = sidebarApps.find(function(item) { return item.id === id; });
        if (!app || installedApps.includes(id)) return;
        installedApps.push(id);
        if (!saveIds(sidebarAppKey, installedApps)) {
            installedApps = installedApps.filter(function(item) { return item !== id; });
            return;
        }
        renderSidebarAppPanel(app);
        renderSidebarApps();
        renderSidebarAppCatalog();
        setStoreStatus(app.name + ' added to your sidebar.');
    }

    function uninstallSidebarApp(id) {
        var app = sidebarApps.find(function(item) { return item.id === id; });
        if (!app || !installedApps.includes(id)) return;
        var panel = document.getElementById('sidebar-app-panel-' + id);
        if (panel && panel.classList.contains('active')) {
            switchView('extensionStore', document.getElementById('navBrowserStore'));
        }
        var previous = installedApps;
        installedApps = installedApps.filter(function(item) { return item !== id; });
        if (!saveIds(sidebarAppKey, installedApps)) {
            installedApps = previous;
            return;
        }
        if (panel) panel.remove();
        renderSidebarApps();
        renderSidebarAppCatalog();
        setStoreStatus(app.name + ' removed from your sidebar.');
    }

    document.getElementById('browserStoreExtensionsTab').addEventListener('click', function() {
        selectStoreTab('extensions');
    });
    document.getElementById('browserStoreAppsTab').addEventListener('click', function() {
        selectStoreTab('apps');
    });
    document.getElementById('browserStoreExtensionsTab').addEventListener('keydown', function(event) {
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            document.getElementById('browserStoreAppsTab').focus();
            selectStoreTab('apps');
        }
    });
    document.getElementById('browserStoreAppsTab').addEventListener('keydown', function(event) {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            document.getElementById('browserStoreExtensionsTab').focus();
            selectStoreTab('extensions');
        }
    });

    installedApps.forEach(function(id) {
        var app = sidebarApps.find(function(item) { return item.id === id; });
        if (app) renderSidebarAppPanel(app);
    });
    renderBrowserExtensionActions();
    renderBrowserExtensionCatalog();
    renderSidebarApps();
    renderSidebarAppCatalog();
})();
