    function getSmartSearchUrl(input) {
        var query = input.trim();
        if (!query) return null;

        var explicitWebUrl = /^https?:\/\//i.test(query);
        var looksLikeDomain = /^(?:localhost|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}|(?:\d{1,3}\.){3}\d{1,3})(?::\d{1,5})?(?:[/?#][^\s]*)?$/i.test(query);
        if (explicitWebUrl || looksLikeDomain) {
            try {
                var destination = new URL(explicitWebUrl ? query : 'https://' + query);
                if (destination.protocol === 'http:' || destination.protocol === 'https:') {
                    return destination.href;
                }
            } catch (error) {
                // Invalid URL-like input falls back to a web search.
            }
        }
        var searchUrls = {
            google: 'https://www.google.com/search?q=',
            duckduckgo: 'https://duckduckgo.com/?q=',
            bing: 'https://www.bing.com/search?q=',
            brave: 'https://search.brave.com/search?q='
        };
        return searchUrls[browserSearchProvider] + encodeURIComponent(query);
    }

    var browserSearchProviders = ['google', 'duckduckgo', 'bing', 'brave'];
    var browserSearchProvider = readStorage('lemon_browser_search_provider', 'google');
    if (!browserSearchProviders.includes(browserSearchProvider)) browserSearchProvider = 'google';
    var savedBrowserHistory = readStorage('lemon_browser_history', []);
    var embeddedBrowserHistory = Array.isArray(savedBrowserHistory) ? savedBrowserHistory.filter(function(item) {
        return item && typeof item.title === 'string' && typeof item.url === 'string' &&
            /^https?:\/\//i.test(item.url) && Number.isFinite(item.visitedAt);
    }).slice(0, 300) : [];
    var savedClosedBrowserTabs = readStorage('lemon_browser_closed_tabs', []);
    var closedEmbeddedBrowserTabs = Array.isArray(savedClosedBrowserTabs) ? savedClosedBrowserTabs.filter(function(item) {
        return item && typeof item.title === 'string' && typeof item.url === 'string' && /^https?:\/\//i.test(item.url);
    }).slice(0, 10) : [];

    var embeddedBrowserTabs = [];
    var activeEmbeddedBrowserTabId = null;
    var nextEmbeddedBrowserTabId = 1;
    var isElectronBrowser = /\bElectron\//.test(navigator.userAgent);
    var embeddedBrowserBookmarks = readStorage('lemon_browser_bookmarks', []);
    if (!Array.isArray(embeddedBrowserBookmarks)) embeddedBrowserBookmarks = [];
    embeddedBrowserBookmarks = embeddedBrowserBookmarks.filter(function(item) {
        return item && typeof item.title === 'string' && typeof item.url === 'string' && /^https?:\/\//i.test(item.url);
    });

    function getActiveEmbeddedBrowserTab() {
        return embeddedBrowserTabs.find(function(tab) { return tab.id === activeEmbeddedBrowserTabId; }) || null;
    }

    function updateEmbeddedBrowserControls() {
        var tab = getActiveEmbeddedBrowserTab();
        var webview = tab && tab.webview;
        var isHome = !document.getElementById('browserCard').classList.contains('is-browsing');
        var canGoBack = Boolean(tab && tab.isFrame && tab.view === 'page');
        var canGoForward = Boolean(tab && tab.isFrame && tab.view === 'page');
        if (webview && !tab.isFrame && typeof webview.canGoBack === 'function') {
            try {
                canGoBack = webview.canGoBack();
                canGoForward = webview.canGoForward();
            } catch (error) {
                canGoBack = false;
                canGoForward = false;
            }
        }
        document.getElementById('browserBackButton').disabled = isHome || !canGoBack;
        document.getElementById('browserForwardButton').disabled = isHome || !canGoForward;
        document.getElementById('browserReloadButton').disabled = isHome || !webview;
        document.getElementById('browserAddressInput').value = !isHome && tab && /^https?:\/\//i.test(tab.url) ? tab.url : '';
        document.getElementById('browserSecurityIcon').textContent = tab && tab.url
            ? (/^https:\/\//i.test(tab.url) ? '🔒' : 'ⓘ')
            : '⌕';
        var externalButton = document.getElementById('browserOpenExternalButton');
        externalButton.hidden = isElectronBrowser || isHome || !tab || !tab.url;
        updateEmbeddedBrowserBookmarkButton();
    }

    function renderEmbeddedBrowserTabs() {
        var list = document.getElementById('browserTabList');
        list.replaceChildren();
        embeddedBrowserTabs.forEach(function(tab) {
            var item = document.createElement('div');
            item.className = 'browser-tab';
            item.classList.toggle('active', tab.id === activeEmbeddedBrowserTabId);
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'browser-tab-select';
            button.setAttribute('role', 'tab');
            button.setAttribute('aria-selected', String(tab.id === activeEmbeddedBrowserTabId));
            button.setAttribute('aria-label', tab.title + (tab.id === activeEmbeddedBrowserTabId ? ', active tab' : ''));
            button.addEventListener('click', function() { activateEmbeddedBrowserTab(tab.id); });
            var title = document.createElement('span');
            title.className = 'browser-tab-title';
            title.textContent = (tab.loading ? '◌ ' : '🍋 ') + tab.title;
            var close = document.createElement('button');
            close.type = 'button';
            close.className = 'browser-tab-close';
            close.setAttribute('aria-label', 'Close ' + tab.title);
            close.title = 'Close tab';
            close.textContent = '×';
            close.addEventListener('click', function(event) {
                event.stopPropagation();
                closeEmbeddedBrowserTab(tab.id);
            });
            button.appendChild(title);
            item.append(button, close);
            list.appendChild(item);
        });
    }

    function activateEmbeddedBrowserTab(id) {
        if (!embeddedBrowserTabs.some(function(tab) { return tab.id === id; })) return;
        activeEmbeddedBrowserTabId = id;
        embeddedBrowserTabs.forEach(function(tab) {
            tab.webview.hidden = tab.id !== id;
        });
        if (typeof window.refreshBrowserExtensionActions === 'function') {
            window.refreshBrowserExtensionActions();
        }
        renderEmbeddedBrowserTabs();
        updateEmbeddedBrowserControls();
        var active = getActiveEmbeddedBrowserTab();
        if (active && active.view === 'page') showBrowserPage();
        else showBrowserHome();
        document.getElementById('browserStatus').textContent = active && active.error
            ? 'This page could not be loaded. Check the address or your connection and try again.'
            : active && active.loading
                ? 'Loading ' + active.title + '…'
                : active && active.url ? active.url : 'New tab · Search or enter a web address.';
    }

    function updateEmbeddedBrowserTab(tab) {
        if (tab.id === activeEmbeddedBrowserTabId) {
            document.getElementById('browserStatus').textContent = tab.error
                ? 'This page could not be loaded. Check the address or your connection and try again.'
                : tab.loading
                ? 'Loading ' + tab.title + '…'
                : tab.isFrame && tab.url
                    ? 'Page ready · Some websites block embedding. Use Open in new tab if needed.'
                : tab.url || 'New tab · Search or enter a web address.';
            updateEmbeddedBrowserControls();
        }
        renderEmbeddedBrowserTabs();
    }

    function connectEmbeddedBrowserTab(tab) {
        var webview = tab.webview;
        if (tab.isFrame) {
            webview.addEventListener('load', function() {
                tab.loading = false;
                tab.error = false;
                webview.classList.add('is-ready');
                try {
                    var currentUrl = webview.contentWindow.location.href;
                    if (currentUrl && /^https?:\/\//i.test(currentUrl)) {
                        tab.url = currentUrl;
                        tab.navigationUrl = currentUrl;
                        tab.title = webview.contentDocument.title || new URL(currentUrl).hostname;
                    }
                } catch (error) {
                    // Cross-origin frame contents are intentionally inaccessible to the host page.
                }
                recordEmbeddedBrowserVisit(tab);
                document.getElementById('browserProgressFill').style.width = '100%';
                updateEmbeddedBrowserTab(tab);
                if (typeof window.refreshBrowserExtensions === 'function') {
                    window.refreshBrowserExtensions(tab);
                }
                window.setTimeout(function() {
                    if (tab.id === activeEmbeddedBrowserTabId && !tab.loading) {
                        document.getElementById('browserProgressFill').style.width = '0';
                    }
                }, 500);
            });
            return;
        }
        webview.addEventListener('did-start-loading', function() {
            tab.loading = true;
            tab.error = false;
            webview.classList.remove('is-ready');
            document.getElementById('browserProgressFill').style.width = '18%';
            if (tab.id === activeEmbeddedBrowserTabId) {
                document.getElementById('browserStatus').textContent = 'Loading ' + tab.title + '…';
            }
            updateEmbeddedBrowserTab(tab);
        });
        webview.addEventListener('did-stop-loading', function() {
            tab.loading = false;
            webview.classList.add('is-ready');
            document.getElementById('browserProgressFill').style.width = '100%';
            if (tab.id === activeEmbeddedBrowserTabId) {
                document.getElementById('browserStatus').textContent = tab.url ? 'Ready · ' + tab.url : 'Page loaded.';
            }
            updateEmbeddedBrowserTab(tab);
            if (typeof window.refreshBrowserExtensions === 'function') {
                window.refreshBrowserExtensions(tab);
            }
            window.setTimeout(function() {
                if (tab.id === activeEmbeddedBrowserTabId && !tab.loading) {
                    document.getElementById('browserProgressFill').style.width = '0';
                }
            }, 500);
        });
        function updateAddress(event) {
            if (event.url && /^https?:\/\//i.test(event.url)) {
                tab.url = event.url;
                tab.navigationUrl = event.url;
                tab.view = 'page';
                recordEmbeddedBrowserVisit(tab);
            }
            updateEmbeddedBrowserTab(tab);
        }
        webview.addEventListener('did-navigate', updateAddress);
        webview.addEventListener('did-navigate-in-page', updateAddress);
        webview.addEventListener('page-title-updated', function(event) {
            if (event.title && event.title.trim()) tab.title = event.title.trim().slice(0, 80);
            updateEmbeddedBrowserHistoryTitle(tab);
            updateEmbeddedBrowserTab(tab);
        });
        webview.addEventListener('did-fail-load', function(event) {
            tab.loading = false;
            tab.error = event.errorCode !== -3;
            webview.classList.add('is-ready');
            updateEmbeddedBrowserTab(tab);
        });
        webview.addEventListener('dom-ready', function() {
            if (typeof webview.getURL === 'function') {
                var currentUrl = webview.getURL();
                if (currentUrl && /^https?:\/\//i.test(currentUrl)) {
                    tab.url = currentUrl;
                    tab.navigationUrl = currentUrl;
                    tab.view = 'page';
                }
            }
            updateEmbeddedBrowserTab(tab);
        });
    }

    function createEmbeddedBrowserTab(url) {
        var webview = document.createElement(isElectronBrowser ? 'webview' : 'iframe');
        webview.className = 'browser-webview';
        if (isElectronBrowser) {
            webview.setAttribute('partition', 'persist:lemon-hub-browser');
            webview.setAttribute('webpreferences', 'contextIsolation=yes,nodeIntegration=no,sandbox=yes');
        } else {
            webview.title = 'Web page';
            webview.setAttribute('sandbox', 'allow-forms allow-scripts allow-popups');
            webview.setAttribute('allow', 'clipboard-read; clipboard-write; fullscreen');
            webview.referrerPolicy = 'strict-origin-when-cross-origin';
        }
        webview.setAttribute('src', 'about:blank');
        document.getElementById('browserPageViewport').appendChild(webview);
        var tab = {
            id: nextEmbeddedBrowserTabId++,
            title: 'New tab',
            url: '',
            navigationUrl: '',
            view: 'home',
            loading: false,
            isFrame: !isElectronBrowser,
            navigationHistory: [],
            historyIndex: -1,
            webview: webview
        };
        embeddedBrowserTabs.push(tab);
        activeEmbeddedBrowserTabId = tab.id;
        connectEmbeddedBrowserTab(tab);
        activateEmbeddedBrowserTab(tab.id);
        if (url) loadEmbeddedBrowserUrl(url, tab);
        else {
            webview.setAttribute('src', 'about:blank');
            updateEmbeddedBrowserTab(tab);
        }
        return tab;
    }

    function loadEmbeddedBrowserUrl(destination, tab) {
        tab = tab || getActiveEmbeddedBrowserTab();
        if (!tab || !destination) return;
        showBrowserPage();
        tab.url = destination;
        tab.navigationUrl = destination;
        tab.view = 'page';
        try {
            tab.title = new URL(destination).hostname;
        } catch (error) {
            tab.title = 'New tab';
        }
        var navigationId = (tab.navigationId || 0) + 1;
        tab.navigationId = navigationId;
        if (tab.historyIndex < 0 || tab.navigationHistory[tab.historyIndex] !== destination) {
            tab.navigationHistory = tab.navigationHistory.slice(0, tab.historyIndex + 1);
            tab.navigationHistory.push(destination);
            tab.historyIndex = tab.navigationHistory.length - 1;
        }
        tab.loading = true;
        tab.error = false;
        updateEmbeddedBrowserControls();
        document.getElementById('browserStatus').textContent = 'Preparing page…';

        function navigateWhenSized(attempt) {
            if (tab.navigationId !== navigationId || !embeddedBrowserTabs.includes(tab)) return;
            var bounds = tab.webview.getBoundingClientRect();
            if (bounds.width < 1 || bounds.height < 1) {
                if (attempt < 10) {
                    window.setTimeout(function() { navigateWhenSized(attempt + 1); }, 50);
                } else if (tab.id === activeEmbeddedBrowserTabId) {
                    document.getElementById('browserStatus').textContent = 'The browser area could not be sized. Return Home and try again.';
                }
                return;
            }
            try {
                if (typeof tab.webview.loadURL === 'function') {
                    var navigation = tab.webview.loadURL(destination);
                    if (navigation && typeof navigation.catch === 'function') {
                        navigation.catch(function() {
                            if (tab.id === activeEmbeddedBrowserTabId) {
                                tab.error = true;
                                document.getElementById('browserStatus').textContent = 'This page could not be loaded. Check the address or your connection and try again.';
                            }
                        });
                    }
                } else if (tab.isFrame) {
                    tab.webview.src = destination;
                } else {
                    document.getElementById('browserStatus').textContent = 'Embedded web pages require the Lemon Station desktop app.';
                    return;
                }
            } catch (error) {
                document.getElementById('browserStatus').textContent = 'This address could not be opened. Check it and try again.';
            }
            updateEmbeddedBrowserTab(tab);
        }

        window.requestAnimationFrame(function() {
            window.requestAnimationFrame(function() {
                navigateWhenSized(0);
            });
        });
    }

    function executeSmartSearch(event) {
        if (event) event.preventDefault();
        var destination = getSmartSearchUrl(document.getElementById('smartSearchInput').value);
        if (!destination) return;

        var currentTab = getActiveEmbeddedBrowserTab();
        if (!currentTab) currentTab = createEmbeddedBrowserTab();
        if (!currentTab) return;
        switchView('browserView', document.getElementById('navBrowser'));
        loadEmbeddedBrowserUrl(destination, currentTab);
        document.getElementById('browserAddressInput').value = destination;
        renderEmbeddedBrowserTabs();
    }

    function loadVidcoreMovie(event) {
        if (event) event.preventDefault();
        var idInput = document.getElementById('vidcoreMovieId');
        var movieId = idInput.value.trim();
        var mediaType = document.getElementById('vidcoreMediaType').value;
        var validId = /^(?:tt\d{7,8}|\d{1,10})$/.test(movieId);
        idInput.setCustomValidity('');
        if (!validId) {
            idInput.setCustomValidity('Enter an IMDb ID (for example, tt6263850) or a numeric TMDB ID.');
            idInput.reportValidity();
            return;
        }
        var playerUrl;
        if (mediaType === 'tv') {
            var seasonInput = document.getElementById('vidcoreSeason');
            var episodeInput = document.getElementById('vidcoreEpisode');
            var season = Number(seasonInput.value);
            var episode = Number(episodeInput.value);
            seasonInput.setCustomValidity('');
            episodeInput.setCustomValidity('');
            if (!Number.isInteger(season) || season < 1) {
                seasonInput.setCustomValidity('Enter a season number greater than zero.');
                seasonInput.reportValidity();
                return;
            }
            if (!Number.isInteger(episode) || episode < 1) {
                episodeInput.setCustomValidity('Enter an episode number greater than zero.');
                episodeInput.reportValidity();
                return;
            }
            playerUrl = 'https://vidcore.io/tv/' + encodeURIComponent(movieId) + '/' +
                encodeURIComponent(season) + '/' + encodeURIComponent(episode);
        } else {
            playerUrl = 'https://vidcore.io/movie/' + encodeURIComponent(movieId);
        }
        var frame = document.getElementById('mediaPlayerFrame');
        frame.title = 'Vidcore player';
        frame.src = playerUrl;
        document.getElementById('mediaPlayerStatus').textContent =
            'Opening Vidcore. If the player does not load, check your connection and try again.';
        document.getElementById('browserStatus').textContent = 'Media · Vidcore';
    }

    function toggleVidcoreMediaType() {
        var isTv = document.getElementById('vidcoreMediaType').value === 'tv';
        document.getElementById('vidcoreIdLabel').textContent = isTv ? 'Show ID' : 'Movie ID';
        ['vidcoreSeasonLabel', 'vidcoreSeason', 'vidcoreEpisodeLabel', 'vidcoreEpisode'].forEach(function(id) {
            var field = document.getElementById(id);
            field.hidden = !isTv;
            field.disabled = !isTv;
        });
    }

    async function searchWikidataTitles(query, mediaType) {
        var searchUrl = new URL('https://www.wikidata.org/w/api.php');
        searchUrl.search = new URLSearchParams({
            action: 'wbsearchentities',
            search: query,
            language: 'en',
            format: 'json',
            type: 'item',
            origin: '*'
        });
        var searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) throw new Error('Title search returned HTTP ' + searchResponse.status + '.');
        var searchData = await searchResponse.json();
        var candidates = (Array.isArray(searchData.search) ? searchData.search : [])
            .filter(function(item) { return item && /^Q\d+$/.test(item.id || ''); })
            .slice(0, 20);
        if (!candidates.length) return [];

        var entityUrl = new URL('https://www.wikidata.org/w/api.php');
        entityUrl.search = new URLSearchParams({
            action: 'wbgetentities',
            ids: candidates.map(function(item) { return item.id; }).join('|'),
            props: 'claims',
            format: 'json',
            origin: '*'
        });
        var entityResponse = await fetch(entityUrl);
        if (!entityResponse.ok) throw new Error('Title ID lookup returned HTTP ' + entityResponse.status + '.');
        var entityData = await entityResponse.json();
        var validTypes = mediaType === 'tv'
            ? ['Q5398426', 'Q1259759', 'Q15416']
            : ['Q11424'];

        return candidates.reduce(function(matches, item) {
            var entity = entityData.entities && entityData.entities[item.id];
            var claims = entity && entity.claims;
            var imdbClaim = claims && claims.P345 && claims.P345.find(function(claim) {
                var value = claim.mainsnak && claim.mainsnak.datavalue && claim.mainsnak.datavalue.value;
                return typeof value === 'string' && /^tt\d{7,8}$/.test(value);
            });
            var instanceClaims = claims && claims.P31 || [];
            var matchesType = instanceClaims.some(function(claim) {
                var value = claim.mainsnak && claim.mainsnak.datavalue && claim.mainsnak.datavalue.value;
                return value && validTypes.includes(value.id);
            });
            if (!imdbClaim || !matchesType) return matches;

            var releaseClaim = claims.P577 && claims.P577[0];
            var releaseValue = releaseClaim && releaseClaim.mainsnak &&
                releaseClaim.mainsnak.datavalue && releaseClaim.mainsnak.datavalue.value;
            var yearMatch = releaseValue && typeof releaseValue.time === 'string' &&
                releaseValue.time.match(/\d{4}/);
            matches.push({
                id: imdbClaim.mainsnak.datavalue.value,
                title: item.label || item.id,
                year: yearMatch ? yearMatch[0] : ''
            });
            return matches;
        }, []).slice(0, 8);
    }

    async function searchVidcoreTitles(event) {
        if (event) event.preventDefault();
        var query = document.getElementById('vidcoreTitleQuery').value.trim();
        var results = document.getElementById('vidcoreSearchResults');
        results.replaceChildren();
        if (!query) {
            results.textContent = 'Enter a title to search.';
            return;
        }
        results.textContent = 'Searching for title IDs…';
        try {
            var mediaType = document.getElementById('vidcoreMediaType').value;
            var matches = await searchWikidataTitles(query, mediaType);
            results.replaceChildren();
            if (!matches.length) {
                results.textContent = 'No matching titles with an IMDb ID found. Try a different search or enter the ID directly.';
                return;
            }
            matches.forEach(function(item) {
                var button = document.createElement('button');
                button.type = 'button';
                button.className = 'media-search-result';
                button.textContent = [item.title, item.year, item.id].filter(Boolean).join(' · ');
                button.addEventListener('click', function() {
                    document.getElementById('vidcoreMediaType').value = mediaType;
                    toggleVidcoreMediaType();
                    document.getElementById('vidcoreSearchResults').replaceChildren();
                    document.getElementById('vidcoreMovieId').value = item.id;
                    document.getElementById('vidcoreSearchResults').textContent = 'Selected IMDb ID: ' + item.id;
                });
                results.appendChild(button);
            });
        } catch (error) {
            results.textContent = 'Could not search titles: ' + error.message;
        }
    }

    document.getElementById('vidcoreTitleQuery').addEventListener('input', function() {
        this.setCustomValidity('');
    });
    ['vidcoreMovieId', 'vidcoreSeason', 'vidcoreEpisode'].forEach(function(id) {
        document.getElementById(id).addEventListener('input', function() {
            this.setCustomValidity('');
        });
    });

    function openBrowserHome(navItem) {
        var tab = getActiveEmbeddedBrowserTab();
        switchView('browserView', navItem || document.getElementById('navBrowser'));
        if (tab && tab.view === 'page') showBrowserPage();
        else showBrowserHome();
    }

    function navigateEmbeddedBrowser(action, event) {
        if (action === 'address') {
            if (event) event.preventDefault();
            var destination = getSmartSearchUrl(document.getElementById('browserAddressInput').value);
            if (!destination) return;
            var browserTab = getActiveEmbeddedBrowserTab();
            if (!browserTab) browserTab = createEmbeddedBrowserTab();
            if (!browserTab) return;
            switchView('browserView', document.getElementById('navBrowser'));
            loadEmbeddedBrowserUrl(destination);
            return;
        }
        var tab = getActiveEmbeddedBrowserTab();
        var webview = tab && tab.webview;
        if (!webview) return;
        if (action === 'back' && tab.isFrame) {
            try {
                webview.contentWindow.history.back();
            } catch (error) {
                document.getElementById('browserStatus').textContent = 'This page does not allow browser history control.';
            }
        } else if (action === 'forward' && tab.isFrame) {
            try {
                webview.contentWindow.history.forward();
            } catch (error) {
                document.getElementById('browserStatus').textContent = 'This page does not allow browser history control.';
            }
        } else if (action === 'back' && typeof webview.canGoBack === 'function' && webview.canGoBack()) webview.goBack();
        else if (action === 'forward' && typeof webview.canGoForward === 'function' && webview.canGoForward()) webview.goForward();
        else if (action === 'reload' && tab.isFrame) {
            tab.loading = true;
            webview.src = tab.url;
        } else if (action === 'reload' && typeof webview.reload === 'function') webview.reload();
        else if (action === 'home') showBrowserHome(true);
        updateEmbeddedBrowserControls();
    }

    function showBrowserPage() {
        var tab = getActiveEmbeddedBrowserTab();
        if (tab) tab.view = 'page';
        document.body.classList.add('browser-view-active');
        document.getElementById('dashboard').hidden = true;
        document.getElementById('browserCard').classList.add('is-browsing');
        document.getElementById('browserStatus').textContent = 'Opening page…';
        updateEmbeddedBrowserControls();
    }

    function showBrowserHome(force) {
        var tab = getActiveEmbeddedBrowserTab();
        if (!force && tab && tab.view === 'page') {
            showBrowserPage();
            return;
        }
        if (tab) tab.view = 'home';
        document.getElementById('dashboard').hidden = false;
        document.getElementById('browserCard').classList.remove('is-browsing');
        document.getElementById('browserProgressFill').style.width = '0';
        document.getElementById('browserStatus').textContent = 'Home Base · Search or enter a web address.';
        updateEmbeddedBrowserControls();
    }

    function openBrowserPageExternally() {
        var tab = getActiveEmbeddedBrowserTab();
        if (!tab || !/^https?:\/\//i.test(tab.url)) return;
        window.open(tab.url, '_blank', 'noopener,noreferrer');
    }

    function closeEmbeddedBrowserTab(id) {
        var index = embeddedBrowserTabs.findIndex(function(tab) { return tab.id === id; });
        if (index < 0) return;
        var closingTab = embeddedBrowserTabs[index];
        if (closingTab.url && /^https?:\/\//i.test(closingTab.url)) {
            closedEmbeddedBrowserTabs = [{ title: closingTab.title, url: closingTab.url }].concat(
                closedEmbeddedBrowserTabs.filter(function(item) { return item.url !== closingTab.url; })
            ).slice(0, 10);
            writeStorage('lemon_browser_closed_tabs', closedEmbeddedBrowserTabs);
        }
        if (typeof closingTab.webview.stop === 'function') closingTab.webview.stop();
        closingTab.webview.remove();
        embeddedBrowserTabs.splice(index, 1);
        if (closingTab.id === activeEmbeddedBrowserTabId) {
                    if (embeddedBrowserTabs.length) {
                        var nextTab = embeddedBrowserTabs[Math.max(0, index - 1)];
                        activateEmbeddedBrowserTab(nextTab.id);
                    } else {
                        activeEmbeddedBrowserTabId = null;
                        createEmbeddedBrowserTab();
                    }
        }
        renderEmbeddedBrowserTabs();
    }

    function recordEmbeddedBrowserVisit(tab) {
        if (!tab || !/^https?:\/\//i.test(tab.url)) return;
        var now = Date.now();
        var previousVisit = embeddedBrowserHistory[0];
        if (previousVisit && previousVisit.url === tab.url && now - previousVisit.visitedAt < 1500) {
            previousVisit.visitedAt = now;
            if (tab.title && tab.title !== 'New tab') previousVisit.title = tab.title;
        } else {
            embeddedBrowserHistory.unshift({
                title: tab.title && tab.title !== 'New tab' ? tab.title : new URL(tab.url).hostname,
                url: tab.url,
                visitedAt: now
            });
        }
        embeddedBrowserHistory = embeddedBrowserHistory.slice(0, 300);
        writeStorage('lemon_browser_history', embeddedBrowserHistory);
        if (document.getElementById('browserHistoryDialog').open) renderEmbeddedBrowserHistory();
    }

    function updateEmbeddedBrowserHistoryTitle(tab) {
        if (!tab || !tab.url || !tab.title) return;
        var visit = embeddedBrowserHistory.find(function(item) {
            return item.url === tab.url && Date.now() - item.visitedAt < 60000;
        });
        if (!visit) return;
        visit.title = tab.title;
        writeStorage('lemon_browser_history', embeddedBrowserHistory);
        if (document.getElementById('browserHistoryDialog').open) renderEmbeddedBrowserHistory();
    }

    function renderEmbeddedBrowserHistory() {
        var list = document.getElementById('browserHistoryList');
        var empty = document.getElementById('browserHistoryEmpty');
        var query = document.getElementById('browserHistorySearch').value.trim().toLowerCase();
        var visits = embeddedBrowserHistory.filter(function(item) {
            return !query || (item.title + ' ' + item.url).toLowerCase().includes(query);
        });
        list.replaceChildren();
        visits.forEach(function(visit) {
            var row = document.createElement('button');
            row.type = 'button';
            row.className = 'browser-history-item';
            var copy = document.createElement('span');
            copy.className = 'browser-history-copy';
            var title = document.createElement('strong');
            title.textContent = visit.title;
            var address = document.createElement('span');
            address.textContent = visit.url;
            var date = document.createElement('time');
            date.dateTime = new Date(visit.visitedAt).toISOString();
            date.textContent = new Date(visit.visitedAt).toLocaleString(undefined, {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
            });
            copy.append(title, address);
            row.append(copy, date);
            row.addEventListener('click', function() {
                var tab = getActiveEmbeddedBrowserTab() || createEmbeddedBrowserTab();
                if (tab) loadEmbeddedBrowserUrl(visit.url, tab);
                closeEmbeddedBrowserHistory();
            });
            list.appendChild(row);
        });
        empty.hidden = visits.length > 0;
        empty.textContent = embeddedBrowserHistory.length
            ? 'No pages match your search.'
            : 'Pages you visit will appear here.';
        document.getElementById('browserHistoryCount').textContent =
            embeddedBrowserHistory.length + (embeddedBrowserHistory.length === 1 ? ' page' : ' pages');
        document.getElementById('browserHistoryClearButton').disabled = embeddedBrowserHistory.length === 0;
    }

    function openEmbeddedBrowserHistory() {
        var dialog = document.getElementById('browserHistoryDialog');
        document.getElementById('browserHistorySearch').value = '';
        renderEmbeddedBrowserHistory();
        if (!dialog.open) dialog.showModal();
        document.getElementById('browserHistorySearch').focus();
    }

    function closeEmbeddedBrowserHistory() {
        var dialog = document.getElementById('browserHistoryDialog');
        if (dialog.open) dialog.close();
    }

    function clearEmbeddedBrowserHistory() {
        embeddedBrowserHistory = [];
        writeStorage('lemon_browser_history', embeddedBrowserHistory);
        renderEmbeddedBrowserHistory();
    }

    function reopenClosedEmbeddedBrowserTab() {
        var closedTab = closedEmbeddedBrowserTabs.shift();
        if (!closedTab) {
            document.getElementById('browserStatus').textContent = 'No recently closed tabs to reopen.';
            return;
        }
        writeStorage('lemon_browser_closed_tabs', closedEmbeddedBrowserTabs);
        createEmbeddedBrowserTab(closedTab.url);
    }

    function updateEmbeddedBrowserBookmarkButton() {
        var tab = getActiveEmbeddedBrowserTab();
        var bookmarked = Boolean(tab && tab.url && embeddedBrowserBookmarks.some(function(item) {
            return item.url === tab.url;
        }));
        var button = document.getElementById('browserBookmarkButton');
        button.setAttribute('aria-pressed', String(bookmarked));
        button.setAttribute('aria-label', bookmarked ? 'Remove bookmark' : 'Bookmark this page');
        button.title = bookmarked ? 'Remove bookmark' : 'Bookmark this page';
        button.textContent = bookmarked ? '★' : '☆';
    }

    function renderEmbeddedBrowserBookmarks() {
        var bar = document.getElementById('browserBookmarks');
        bar.replaceChildren();
        if (!embeddedBrowserBookmarks.length) {
            bar.hidden = true;
            return;
        }
        bar.hidden = false;
        embeddedBrowserBookmarks.forEach(function(bookmark, index) {
            var link = document.createElement('button');
            link.className = 'browser-bookmark-link';
            link.type = 'button';
            link.textContent = '🍋 ' + bookmark.title;
            link.title = bookmark.url + ' · Right-click to remove';
            link.addEventListener('click', function() {
                var tab = getActiveEmbeddedBrowserTab() || createEmbeddedBrowserTab();
                if (tab) loadEmbeddedBrowserUrl(bookmark.url, tab);
            });
            link.addEventListener('contextmenu', function(event) {
                event.preventDefault();
                embeddedBrowserBookmarks.splice(index, 1);
                writeStorage('lemon_browser_bookmarks', embeddedBrowserBookmarks);
                renderEmbeddedBrowserBookmarks();
                updateEmbeddedBrowserBookmarkButton();
            });
            bar.appendChild(link);
        });
    }

    function toggleEmbeddedBrowserBookmark() {
        var tab = getActiveEmbeddedBrowserTab();
        if (!tab || !tab.url) {
            document.getElementById('browserStatus').textContent = 'Load a web page before bookmarking it.';
            return;
        }
        var existingIndex = embeddedBrowserBookmarks.findIndex(function(item) { return item.url === tab.url; });
        if (existingIndex >= 0) {
            embeddedBrowserBookmarks.splice(existingIndex, 1);
        } else {
            var label = tab.title && tab.title !== 'New tab' ? tab.title : new URL(tab.url).hostname;
            embeddedBrowserBookmarks.push({ title: label.slice(0, 40), url: tab.url });
        }
        writeStorage('lemon_browser_bookmarks', embeddedBrowserBookmarks);
        renderEmbeddedBrowserBookmarks();
        updateEmbeddedBrowserBookmarkButton();
    }

    renderEmbeddedBrowserBookmarks();
    document.getElementById('browserSearchProvider').value = browserSearchProvider;
    document.getElementById('browserSearchProvider').addEventListener('change', function(event) {
        browserSearchProvider = browserSearchProviders.includes(event.target.value) ? event.target.value : 'google';
        writeStorage('lemon_browser_search_provider', browserSearchProvider);
    });
    document.getElementById('browserHistorySearch').addEventListener('input', renderEmbeddedBrowserHistory);
    document.getElementById('browserHistoryDialog').addEventListener('click', function(event) {
        if (event.target === this) closeEmbeddedBrowserHistory();
    });
    var firstBrowserSurface = document.getElementById('hubBrowser');
    var firstBrowserIsFrame = !isElectronBrowser;
    if (firstBrowserIsFrame) {
        var firstFrame = document.createElement('iframe');
        firstFrame.id = 'hubBrowser';
        firstFrame.className = 'browser-webview';
        firstFrame.title = 'Web page';
        firstFrame.setAttribute('sandbox', 'allow-forms allow-scripts allow-popups');
        firstFrame.setAttribute('allow', 'clipboard-read; clipboard-write; fullscreen');
        firstFrame.referrerPolicy = 'strict-origin-when-cross-origin';
        firstFrame.src = 'about:blank';
        firstBrowserSurface.replaceWith(firstFrame);
        firstBrowserSurface = firstFrame;
    }
    var firstEmbeddedBrowserTab = {
        id: nextEmbeddedBrowserTabId++,
        title: 'New tab',
        url: '',
        navigationUrl: '',
        view: 'home',
        loading: false,
        isFrame: firstBrowserIsFrame,
        navigationHistory: [],
        historyIndex: -1,
        webview: firstBrowserSurface
    };
    embeddedBrowserTabs.push(firstEmbeddedBrowserTab);
    activeEmbeddedBrowserTabId = firstEmbeddedBrowserTab.id;
    connectEmbeddedBrowserTab(firstEmbeddedBrowserTab);
    renderEmbeddedBrowserTabs();
    updateEmbeddedBrowserControls();
    document.addEventListener('keydown', function(event) {
        if (!document.getElementById('browserView').classList.contains('active') ||
            document.getElementById('browserHistoryDialog').open) return;
        var target = event.target instanceof Element ? event.target : null;
        var isEditingAddress = Boolean(target && target.closest('input, textarea, select, [contenteditable="true"]'));
        if (!isEditingAddress && event.altKey && event.key === 'ArrowLeft') {
            event.preventDefault();
            navigateEmbeddedBrowser('back');
            return;
        }
        if (!isEditingAddress && event.altKey && event.key === 'ArrowRight') {
            event.preventDefault();
            navigateEmbeddedBrowser('forward');
            return;
        }
        if (!(event.metaKey || event.ctrlKey)) return;
        var key = event.key.toLowerCase();
        if (key === 'l') {
            event.preventDefault();
            var address = document.getElementById('browserAddressInput');
            address.focus();
            address.select();
        } else if (key === 't') {
            event.preventDefault();
            if (event.shiftKey) reopenClosedEmbeddedBrowserTab();
            else createEmbeddedBrowserTab();
        } else if (key === 'w') {
            event.preventDefault();
            var activeTab = getActiveEmbeddedBrowserTab();
            if (activeTab) closeEmbeddedBrowserTab(activeTab.id);
        } else if (key === 'r') {
            event.preventDefault();
            navigateEmbeddedBrowser('reload');
        } else if (key === 'y') {
            event.preventDefault();
            openEmbeddedBrowserHistory();
        } else if (key === 'tab') {
            event.preventDefault();
            var currentIndex = embeddedBrowserTabs.findIndex(function(tab) { return tab.id === activeEmbeddedBrowserTabId; });
            var direction = event.shiftKey ? -1 : 1;
            var nextIndex = embeddedBrowserTabs.length
                ? (currentIndex + direction + embeddedBrowserTabs.length) % embeddedBrowserTabs.length
                : -1;
            if (embeddedBrowserTabs[nextIndex]) activateEmbeddedBrowserTab(embeddedBrowserTabs[nextIndex].id);
        } else if (/^[1-9]$/.test(key)) {
            event.preventDefault();
            var tabIndex = key === '9' ? embeddedBrowserTabs.length - 1 : Number(key) - 1;
            if (embeddedBrowserTabs[tabIndex]) activateEmbeddedBrowserTab(embeddedBrowserTabs[tabIndex].id);
        }
    });
