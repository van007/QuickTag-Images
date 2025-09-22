// PWA Installer for QuickTag Images
// Handles installation prompts and UI

// Configuration
const PWA_CONFIG = {
    // Delay before showing install popup (in milliseconds)
    // Set to 0 for immediate display, or any value in ms (e.g., 3000 for 3 seconds)
    INSTALL_POPUP_DELAY: 3000  // Default: 3 seconds (was 30 seconds)
};

class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.installButton = null;
        this.installPopup = null;
        this.popupDismissed = false;

        // Check if already installed or running in standalone mode
        this.checkInstallationStatus();

        // Initialize
        this.init();
    }

    init() {
        // Register service worker
        this.registerServiceWorker();

        // Listen for install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallUI();
        });

        // Listen for app installed event
        window.addEventListener('appinstalled', () => {
            this.handleAppInstalled();
        });

        // Check if popup was previously dismissed
        this.popupDismissed = localStorage.getItem('pwaPopupDismissed') === 'true';

        // Create UI elements
        this.createInstallButton();
        this.createInstallPopup();
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('ServiceWorker registration successful:', registration.scope);

                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New service worker available
                            this.showUpdateNotification();
                        }
                    });
                });
            } catch (error) {
                console.error('ServiceWorker registration failed:', error);
            }
        }
    }

    checkInstallationStatus() {
        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.isInstalled = true;
            return;
        }

        // Check for iOS
        if (window.navigator.standalone === true) {
            this.isInstalled = true;
            return;
        }

        // Check if launched from home screen (alternative method)
        if (window.location.search.includes('utm_source=homescreen')) {
            this.isInstalled = true;
            return;
        }
    }

    createInstallButton() {
        // Create the install button for the header
        const button = document.createElement('button');
        button.className = 'pwa-install-button';
        button.id = 'pwaInstallButton';
        button.innerHTML = `
            <svg class="install-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Install App</span>
        `;
        button.style.display = 'none'; // Hidden by default
        button.addEventListener('click', () => this.handleInstallClick());

        // Insert button in header (before LLM status)
        const headerTop = document.querySelector('.header-top');
        const llmStatus = document.querySelector('.llm-status');
        if (headerTop && llmStatus) {
            headerTop.insertBefore(button, llmStatus);
        }

        this.installButton = button;
    }

    createInstallPopup() {
        // Create the install popup
        const popup = document.createElement('div');
        popup.className = 'pwa-install-popup';
        popup.id = 'pwaInstallPopup';
        popup.innerHTML = `
            <div class="install-popup-content">
                <button class="popup-close" id="closeInstallPopup">&times;</button>
                <div class="popup-icon">
                    <img src="/assets/logo.jpeg" alt="QuickTag Logo" />
                </div>
                <h3>Install QuickTag Images</h3>
                <p>Install our app for a better experience with offline support and faster performance.</p>
                <div class="popup-features">
                    <div class="feature-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--success)" stroke="var(--success)" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span>Works offline</span>
                    </div>
                    <div class="feature-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--success)" stroke="var(--success)" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span>Faster loading</span>
                    </div>
                    <div class="feature-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--success)" stroke="var(--success)" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span>App-like experience</span>
                    </div>
                </div>
                <div class="popup-actions">
                    <button class="btn-secondary" id="dismissInstallPopup">Maybe Later</button>
                    <button class="btn-primary" id="acceptInstallPopup">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Install Now
                    </button>
                </div>
            </div>
        `;
        popup.style.display = 'none'; // Hidden by default

        // Add event listeners
        popup.querySelector('#closeInstallPopup').addEventListener('click', () => this.dismissPopup());
        popup.querySelector('#dismissInstallPopup').addEventListener('click', () => this.dismissPopup());
        popup.querySelector('#acceptInstallPopup').addEventListener('click', () => this.handleInstallClick());

        // Append to body
        document.body.appendChild(popup);
        this.installPopup = popup;
    }

    showInstallUI() {
        if (this.isInstalled) return;

        // Show install button in header
        if (this.installButton) {
            this.installButton.style.display = 'flex';
        }

        // Show install popup after a delay (only if not previously dismissed)
        if (!this.popupDismissed && this.installPopup) {
            setTimeout(() => {
                if (!this.isInstalled && !this.popupDismissed) {
                    this.installPopup.style.display = 'flex';
                    this.installPopup.classList.add('popup-show');
                }
            }, PWA_CONFIG.INSTALL_POPUP_DELAY);
        }
    }

    hideInstallUI() {
        // Hide install button
        if (this.installButton) {
            this.installButton.style.display = 'none';
        }

        // Hide install popup
        if (this.installPopup) {
            this.installPopup.style.display = 'none';
        }
    }

    dismissPopup() {
        // Hide popup
        if (this.installPopup) {
            this.installPopup.classList.add('popup-hide');
            setTimeout(() => {
                this.installPopup.style.display = 'none';
                this.installPopup.classList.remove('popup-show', 'popup-hide');
            }, 300);
        }

        // Remember dismissal
        this.popupDismissed = true;
        localStorage.setItem('pwaPopupDismissed', 'true');
    }

    async handleInstallClick() {
        if (!this.deferredPrompt) {
            console.log('Install prompt not available');
            return;
        }

        // Hide popup if visible
        this.dismissPopup();

        // Show the install prompt
        this.deferredPrompt.prompt();

        // Wait for the user to respond
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }

        // Clear the deferred prompt
        this.deferredPrompt = null;
    }

    handleAppInstalled() {
        console.log('App was installed');
        this.isInstalled = true;
        this.hideInstallUI();

        // Clear the dismissed flag
        localStorage.removeItem('pwaPopupDismissed');

        // Show success notification
        this.showNotification('QuickTag Images installed successfully!', 'success');
    }

    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'pwa-update-notification';
        notification.innerHTML = `
            <p>A new version of QuickTag Images is available!</p>
            <button class="btn-primary btn-small" onclick="window.location.reload()">Refresh</button>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 10000);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `pwa-notification pwa-notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // iOS specific install instructions
    showIOSInstallInstructions() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        if (isIOS && !this.isInstalled) {
            const instructions = document.createElement('div');
            instructions.className = 'ios-install-instructions';
            instructions.innerHTML = `
                <div class="ios-instructions-content">
                    <h3>Install QuickTag Images on iOS</h3>
                    <ol>
                        <li>Tap the Share button <span class="ios-share-icon">⬆️</span></li>
                        <li>Scroll down and tap "Add to Home Screen"</li>
                        <li>Tap "Add" to install</li>
                    </ol>
                    <button class="btn-primary" onclick="this.parentElement.parentElement.remove()">Got it!</button>
                </div>
            `;

            // Show only once per session
            if (!sessionStorage.getItem('iosInstructionsShown')) {
                setTimeout(() => {
                    document.body.appendChild(instructions);
                    sessionStorage.setItem('iosInstructionsShown', 'true');
                }, 5000);
            }
        }
    }
}

// Initialize PWA installer when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.pwaInstaller = new PWAInstaller();
    });
} else {
    window.pwaInstaller = new PWAInstaller();
}