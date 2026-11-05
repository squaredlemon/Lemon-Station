(function() {
    var overlay = document.getElementById('welcomeOverlay');
    var nameScreen = document.getElementById('welcomeNameScreen');
    var colorScreen = document.getElementById('welcomeColorsScreen');
    var nameInput = document.getElementById('welcomeName');
    var workspaceSelect = document.getElementById('welcomeWorkspace');
    var guide = document.getElementById('welcomeTourGuide');
    var cursor = document.getElementById('welcomeTourCursor');
    var tourIndex = -1;
    var isFinishing = false;
    var isWidgetSetup = false;
    var originalSettings = Object.assign({}, userSettings);
    var originalWorkspace = activeWorkspaceId;
    var tourSteps = [
        {
            target: window.matchMedia('(min-width: 1180px)').matches ? '#sidebar' : '.menu-toggle',
            title: 'Your sidebar',
            copy: 'Your sidebar is the quickest way to move between Home Base, your tools, and settings.'
        },
        {
            target: '#smartSearchInput',
            title: 'Search from Home Base',
            copy: 'Search the web or enter a website here. Lemon Browser opens your result in its own tab.'
        },
        {
            target: '.media-view-header',
            title: 'Your Media Lounge',
            copy: 'Search a movie or show here, choose a result to fill its IMDb ID, then set the episode and press Play.'
        }
    ];

    function selectWelcomeTheme(theme, button) {
        selectTheme(theme);
        applyThemePalette();
        applyBackgroundStyle();
        document.querySelectorAll('.welcome-theme-option').forEach(function(option) {
            option.setAttribute('aria-pressed', String(option === button));
        });
    }

    function previewWorkspace() {
        var token = workspaceTokens[workspaceSelect.value];
        if (!token) return;
        document.body.dataset.workspace = token;
        applyThemePalette();
        applyBackgroundStyle();
    }

    function clearTourTarget() {
        document.querySelectorAll('.welcome-tour-target').forEach(function(item) {
            item.classList.remove('welcome-tour-target');
        });
        cursor.classList.remove('is-visible', 'is-widget-step');
        guide.classList.remove('is-widget-step');
    }

    function moveTourCursor(target, isWidgetStep) {
        var element = document.querySelector(target);
        if (!element) return;
        var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        element.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center', inline: 'center' });
        var bounds = element.getBoundingClientRect();
        cursor.style.left = Math.max(12, Math.min(window.innerWidth - 44, bounds.left + bounds.width / 2)) + 'px';
        cursor.style.top = Math.max(12, Math.min(window.innerHeight - 44, bounds.top + bounds.height / 2)) + 'px';
        cursor.classList.toggle('is-widget-step', Boolean(isWidgetStep));
        cursor.classList.add('is-visible');
        document.querySelectorAll('.welcome-tour-target').forEach(function(item) {
            item.classList.remove('welcome-tour-target');
        });
        element.classList.add('welcome-tour-target');
    }

    function showWelcomeColors() {
        isWidgetSetup = false;
        clearTourTarget();
        guide.hidden = true;
        nameScreen.hidden = true;
        colorScreen.hidden = false;
        overlay.classList.remove('is-closing');
        overlay.hidden = false;
        workspaceSelect.value = workspaceSelect.value || activeWorkspaceId;
        previewWorkspace();
        window.setTimeout(function() { workspaceSelect.focus(); }, 40);
    }

    function showTourStep(index) {
        clearTourTarget();
        if (index >= tourSteps.length) {
            showWelcomeColors();
            return;
        }
        tourIndex = index;
        var step = tourSteps[index];
        guide.querySelector('#welcomeTourStep').textContent = (index + 1) + ' / ' + tourSteps.length;
        guide.querySelector('#welcomeTourTitle').textContent = step.title;
        guide.querySelector('#welcomeTourCopy').textContent = step.copy;
        guide.querySelector('#welcomeTourNext').textContent = index === tourSteps.length - 1 ? 'Next: choose colors →' : 'Next →';

        if (index < 2) {
            switchView('dashboard', document.getElementById('navHome'));
        } else {
            switchView('mediaView', document.getElementById('navMedia'));
        }
        guide.hidden = false;
        moveTourCursor(step.target);
        document.getElementById('welcomeTourNext').focus();
        if (index === 0) {
            window.setTimeout(function() {
                if (tourIndex !== 0 || isFinishing) return;
                if (window.matchMedia('(min-width: 1180px)').matches) {
                    moveTourCursor('#sidebar');
                    return;
                }
                var menuButton = document.querySelector('.menu-toggle');
                if (!document.getElementById('sidebar').classList.contains('open')) menuButton.click();
                window.setTimeout(function() {
                    if (tourIndex === 0 && !isFinishing) moveTourCursor('#sidebar');
                }, 220);
            }, 500);
        }
    }

    function startWelcomeTour() {
        var name = nameInput.value.trim();
        if (!name) {
            nameInput.setCustomValidity('Tell us what to call you to start the tour.');
            nameInput.reportValidity();
            return;
        }
        nameInput.setCustomValidity('');
        userSettings.name = name;
        document.getElementById('displayNameInput').value = name;
        updateClock();
        nameInput.classList.remove('welcome-pointer-arrived');
        overlay.classList.add('is-closing');
        window.setTimeout(function() {
            overlay.hidden = true;
            overlay.classList.remove('is-closing');
            showTourStep(0);
        }, 240);
    }

    function advanceWelcomeTour() {
        if (isWidgetSetup) {
            finishWelcomeSetup(true);
            return;
        }
        showTourStep(tourIndex + 1);
    }

    function skipWelcomeTour() {
        if (isWidgetSetup) {
            finishWelcomeSetup(true);
            return;
        }
        showWelcomeColors();
    }

    function continueToWidgetSetup() {
        isWidgetSetup = true;
        previewWorkspace();
        overlay.classList.add('is-closing');
        window.setTimeout(function() {
            overlay.hidden = true;
            overlay.classList.remove('is-closing');
            switchView('dashboard', document.getElementById('navHome'));
            if (document.getElementById('homeCustomizerPanel').hidden) toggleHomeCustomization();
            guide.querySelector('#welcomeTourTitle').textContent = 'Customize your widgets';
            guide.querySelector('#welcomeTourCopy').textContent =
                'Choose a widget to preview it, then add, remove, or rearrange your Home Base. Your choices save as you go.';
            guide.querySelector('#welcomeTourStep').textContent = 'MAKE IT YOURS · 2 OF 2';
            guide.querySelector('#welcomeTourNext').textContent = 'Finish setup ✓';
            guide.querySelector('.welcome-tour-skip').textContent = 'Skip widgets';
            guide.classList.add('is-widget-step');
            guide.hidden = false;
            moveTourCursor('#homeWidgetTabList', true);
            document.getElementById('welcomeTourNext').focus();
        }, 240);
    }

    function finishWelcomeSetup(savePreferences) {
        if (isFinishing) return;
        isFinishing = true;
        if (savePreferences) {
            userSettings.name = nameInput.value.trim() || userSettings.name || 'Lemon';
            document.getElementById('displayNameInput').value = userSettings.name;
            writeStorage('lemon_preferences', userSettings);
            localStorage.setItem('lemon_theme_color', userSettings.accent);
            if (userSettings.wallpaper) localStorage.setItem('lemon_wallpaper_url', userSettings.wallpaper);
            else localStorage.removeItem('lemon_wallpaper_url');
            applyThemePalette();
            applyBackgroundStyle();
            updateAccentLabel();
            updateClock();
            var profileId = workspaceSelect.value;
            if (profileId !== activeWorkspaceId) switchWorkspace(profileId);
            guide.querySelector('.welcome-tour-skip').textContent = 'Skip tour';
        } else {
            userSettings = Object.assign({}, originalSettings);
            document.getElementById('displayNameInput').value = userSettings.name;
            document.getElementById('primaryColorInput').value = userSettings.accent;
            if (activeWorkspaceId !== originalWorkspace) switchWorkspace(originalWorkspace);
            else document.body.dataset.workspace = workspaceTokens[originalWorkspace];
            applyThemePalette();
            applyBackgroundStyle();
            updateAccentLabel();
            updateClock();
        }
        clearTourTarget();
        guide.hidden = true;
        overlay.hidden = true;
        overlay.classList.remove('is-closing');
        if (!document.getElementById('homeCustomizerPanel').hidden) closeHomeCustomization();
        if (document.getElementById('sidebar').classList.contains('open')) toggleSidebar();
        localStorage.setItem('lemon_welcome_completed', '1');
        switchView('dashboard', document.getElementById('navHome'));
    }

    function replayWelcomeTutorial() {
        isFinishing = false;
        isWidgetSetup = false;
        tourIndex = -1;
        originalSettings = Object.assign({}, userSettings);
        originalWorkspace = activeWorkspaceId;
        nameInput.value = userSettings.name === 'Lemon' ? '' : userSettings.name;
        workspaceSelect.value = activeWorkspaceId;
        document.querySelectorAll('.welcome-theme-option').forEach(function(button) {
            button.setAttribute('aria-pressed', String(button.dataset.theme === userSettings.theme));
        });
        clearTourTarget();
        guide.hidden = true;
        if (!document.getElementById('homeCustomizerPanel').hidden) closeHomeCustomization();
        if (document.getElementById('sidebar').classList.contains('open')) toggleSidebar();
        switchView('dashboard', document.getElementById('navHome'));
        colorScreen.hidden = true;
        nameScreen.hidden = false;
        overlay.classList.remove('is-closing');
        overlay.hidden = false;
        overlay.focus();
        playWelcomeIntro();
    }

    function playWelcomeIntro() {
        var pointer = document.querySelector('.welcome-intro-pointer');
        if (!pointer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            nameInput.focus();
            return;
        }
        nameInput.classList.remove('welcome-pointer-arrived');
        pointer.style.animation = 'none';
        void pointer.offsetWidth;
        pointer.style.animation = '';
        pointer.addEventListener('animationend', function() {
            nameInput.classList.add('welcome-pointer-arrived');
            nameInput.focus();
        }, { once: true });
    }

    function trapWelcomeFocus(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            finishWelcomeSetup(false);
            return;
        }
        if (event.key !== 'Tab') return;
        var controls = Array.from(overlay.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)'))
            .filter(function(control) { return control.getClientRects().length > 0; });
        if (!controls.length) return;
        var first = controls[0];
        var last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    window.selectWelcomeTheme = selectWelcomeTheme;
    window.startWelcomeTour = startWelcomeTour;
    window.advanceWelcomeTour = advanceWelcomeTour;
    window.skipWelcomeTour = skipWelcomeTour;
    window.continueToWidgetSetup = continueToWidgetSetup;
    window.finishWelcomeSetup = finishWelcomeSetup;
    window.replayWelcomeTutorial = replayWelcomeTutorial;

    workspaceSelect.addEventListener('change', previewWorkspace);
    nameInput.addEventListener('input', function() { this.setCustomValidity(''); });
    overlay.addEventListener('keydown', trapWelcomeFocus);
    if (localStorage.getItem('lemon_welcome_completed') !== '1') {
        nameInput.value = userSettings.name === 'Lemon' ? '' : userSettings.name;
        workspaceSelect.value = activeWorkspaceId;
        document.querySelectorAll('.welcome-theme-option').forEach(function(button) {
            button.setAttribute('aria-pressed', String(button.dataset.theme === userSettings.theme));
        });
        overlay.hidden = false;
        colorScreen.hidden = true;
        nameScreen.hidden = false;
        playWelcomeIntro();
    }
})();
