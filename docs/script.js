(function() {
    var menuButton = document.getElementById('menuToggle');
    var navigation = document.getElementById('siteNav');
    var year = document.getElementById('currentYear');

    year.textContent = String(new Date().getFullYear());

    menuButton.addEventListener('click', function() {
        var isOpen = menuButton.getAttribute('aria-expanded') === 'true';
        menuButton.setAttribute('aria-expanded', String(!isOpen));
        menuButton.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
        navigation.classList.toggle('is-open', !isOpen);
    });

    navigation.addEventListener('click', function(event) {
        if (event.target.closest('a')) {
            menuButton.setAttribute('aria-expanded', 'false');
            menuButton.setAttribute('aria-label', 'Open navigation');
            navigation.classList.remove('is-open');
        }
    });

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            menuButton.setAttribute('aria-expanded', 'false');
            menuButton.setAttribute('aria-label', 'Open navigation');
            navigation.classList.remove('is-open');
        }
    });
})();
