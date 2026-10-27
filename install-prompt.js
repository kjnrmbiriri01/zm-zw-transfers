// PWA install option - shown as a slide next to the live rate on the Home tab (no pop-up)
(function () {
    var KEY = 'pwaInstalledOrAcceptedAt', QUIET_DAYS = 7, EVERY_MS = 3000;
    var deferredPrompt = null, idx = 0, timer = null;

    function standalone() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
    function suppressed() {
        try { var v = localStorage.getItem(KEY); return v && (Date.now() - parseInt(v, 10)) / 864e5 < QUIET_DAYS; } catch (e) { return false; }
    }
    function mark() { try { localStorage.setItem(KEY, Date.now().toString()); } catch (e) {} }
    function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream; }
    function $(id) { return document.getElementById(id); }
    function slides() { return Array.prototype.filter.call(document.querySelectorAll('.sl2-s'), function (s) { return !s.classList.contains('off'); }); }

    function render() {
        var n = slides().length, t = $('rst'), d = $('dots');
        if (!t || !d) return;
        if (idx >= n) idx = 0;
        t.style.transform = 'translateX(-' + (idx * 100) + '%)';
        d.innerHTML = n > 1 ? new Array(n + 1).join('<i></i>') : '';
        Array.prototype.forEach.call(d.children, function (c, i) { c.className = i === idx ? 'on' : ''; });
    }
    function start() {
        stop();
        if (slides().length > 1) timer = setInterval(function () { idx = (idx + 1) % slides().length; render(); }, EVERY_MS);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    function offer(kind) {
        var s = $('ins'); if (!s || standalone() || suppressed()) return;
        $('ins-t').textContent = kind === 'ios' ? 'Tap Share, then Add to Home Screen' : 'Install for quick, one-tap access';
        $('ins-b').style.display = kind === 'chrome' ? '' : 'none';
        s.classList.remove('off');
        render(); start();
    }
    function remove() {
        var s = $('ins'); if (s) s.classList.add('off');
        stop(); idx = 0; render();
    }

    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredPrompt = e; offer('chrome'); });
    window.addEventListener('appinstalled', function () { mark(); remove(); });

    function init() {
        render();
        var b = $('ins-b');
        if (b) b.addEventListener('click', function () {
            if (!deferredPrompt) return remove();
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(function (c) {
                deferredPrompt = null;
                if (c && c.outcome === 'accepted') { mark(); remove(); }
            });
        });
        var r = $('rs');
        if (r) { r.addEventListener('touchstart', stop, { passive: true }); r.addEventListener('touchend', start, { passive: true }); }
        if (isIOS()) offer('ios');
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
