// PWA Install Banner - soft, dismissible, remembers "no thanks" for a few weeks
(function() {
    const INSTALLED_KEY = 'pwaInstalledOrAcceptedAt';
    const INSTALLED_DAYS = 7;        // "install" clicked / actually installed -> stay quiet for a week (covers possible uninstall)
    const SHOW_DELAY_MS = 4000; // wait a bit before interrupting a fresh visitor

    let deferredPrompt = null;
    let bannerEl = null;

    function isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }

    function daysSince(key) {
        try {
            const v = localStorage.getItem(key);
            if (!v) return Infinity;
            return (Date.now() - parseInt(v, 10)) / (1000 * 60 * 60 * 24);
        } catch (e) {
            return Infinity; // if storage is blocked, just don't block the banner
        }
    }

    function isSuppressed() {
        return daysSince(INSTALLED_KEY) < INSTALLED_DAYS;
    }

    function isIOS() {
        return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    }

    function injectStyles() {
        if (document.getElementById('pib-styles')) return;
        const style = document.createElement('style');
        style.id = 'pib-styles';
        style.textContent = `
            #pwa-install-banner {
                position: fixed;
                left: 0;
                right: 0;
                bottom: 0;
                transform: translateY(100%);
                transition: transform 0.3s ease;
                z-index: 9500;
                padding: 14px 16px;
                background: linear-gradient(135deg, #0b2b4a, #1e4d7a);
                border-top: 1px solid rgba(255,255,255,0.15);
                box-shadow: 0 -6px 24px rgba(0,0,0,0.25);
            }
            #pwa-install-banner.active {
                transform: translateY(0);
            }
            .pib-inner {
                max-width: 640px;
                margin: 0 auto;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .pib-icon {
                flex: 0 0 auto;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: rgba(251, 191, 36, 0.15);
                color: #fbbf24;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 15px;
            }
            .pib-text {
                flex: 1;
                color: #fff;
                font-size: 13.5px;
                line-height: 1.4;
                font-family: 'Inter', sans-serif;
            }
            .pib-actions {
                flex: 0 0 auto;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .pib-btn {
                background: #fbbf24;
                color: #0b2b4a;
                border: none;
                padding: 9px 16px;
                border-radius: 20px;
                font-weight: 700;
                font-size: 13px;
                cursor: pointer;
                white-space: nowrap;
                font-family: 'Inter', sans-serif;
                transition: opacity 0.2s;
            }
            .pib-btn:hover {
                opacity: 0.9;
            }
            .pib-x {
                background: none;
                border: none;
                color: rgba(255,255,255,0.7);
                font-size: 22px;
                line-height: 1;
                cursor: pointer;
                padding: 0 4px;
            }
            .pib-x:hover {
                color: #fff;
            }
            @media (max-width: 480px) {
                .pib-text { font-size: 12.5px; }
                .pib-icon { display: none; }
            }
        `;
        document.head.appendChild(style);
    }

    function shiftFab(px) {
        const fab = document.getElementById('whatsapp-fab');
        if (!fab) return;
        fab.style.transition = 'bottom 0.3s ease';
        fab.style.bottom = px + 'px';
    }

    function showBanner(kind) {
        if (isStandalone() || isSuppressed() || bannerEl) return;

        injectStyles();

        bannerEl = document.createElement('div');
        bannerEl.id = 'pwa-install-banner';

        const text = kind === 'ios'
            ? 'Add this app to your Home Screen: tap the Share icon, then "Add to Home Screen".'
            : 'Install this app for quick, one-tap access next time.';

        bannerEl.innerHTML = `
            <div class="pib-inner">
                <div class="pib-icon"><i class="fa-solid fa-download"></i></div>
                <div class="pib-text">${text}</div>
                <div class="pib-actions">
                    ${kind === 'chrome' ? '<button id="pib-install" class="pib-btn">Install</button>' : ''}
                    <button id="pib-dismiss" class="pib-x" aria-label="Dismiss">&times;</button>
                </div>
            </div>
        `;

        document.body.appendChild(bannerEl);
        requestAnimationFrame(() => {
            bannerEl.classList.add('active');
            shiftFab(bannerEl.offsetHeight + 24);
        });

        document.getElementById('pib-dismiss').addEventListener('click', dismiss);

        if (kind === 'chrome') {
            const installBtn = document.getElementById('pib-install');
            installBtn.addEventListener('click', async () => {
                if (!deferredPrompt) { dismiss(); return; }
                deferredPrompt.prompt();
                const choice = await deferredPrompt.userChoice;
                deferredPrompt = null;
                if (choice && choice.outcome === 'accepted') {
                    try { localStorage.setItem(INSTALLED_KEY, Date.now().toString()); } catch (e) {}
                    hideBanner();
                } else {
                    dismiss();
                }
            });
        }
    }

    function dismiss() {
        hideBanner();
    }

    function hideBanner() {
        if (!bannerEl) return;
        bannerEl.classList.remove('active');
        shiftFab(24);
        const el = bannerEl;
        bannerEl = null;
        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
    }

    // Chrome/Edge/Android: capture the real install prompt instead of the browser's own mini-infobar
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (isStandalone() || isSuppressed()) return;
        setTimeout(() => showBanner('chrome'), SHOW_DELAY_MS);
    });

    window.addEventListener('appinstalled', () => {
        try { localStorage.setItem(INSTALLED_KEY, Date.now().toString()); } catch (e) {}
        hideBanner();
    });

    function init() {
        if (isStandalone() || isSuppressed()) return;
        // iOS Safari has no beforeinstallprompt event at all, so show manual instructions ourselves
        if (isIOS()) {
            setTimeout(() => showBanner('ios'), SHOW_DELAY_MS);
        }
        // Everyone else (desktop Firefox, desktop Safari, etc.) has no installable path -> stay silent
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
