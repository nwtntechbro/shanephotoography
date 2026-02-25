import { db } from './firebase-config.js';
import { 
    collection, query, getDocs, addDoc, orderBy, limit, where, serverTimestamp, doc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==================== SPLASH SCREEN MANAGER ====================
class SplashScreenManager {
    constructor() {
        this.splashScreen = document.getElementById('splashScreen');
        this.countdownNumber = document.getElementById('countdownNumber');
        this.mainContent = document.querySelector('.navbar'); // First main element
        this.enabled = false;
        this.duration = 10;
        this.message = 'Welcome to Shane Photography';
        this.subMessage = 'Prepare for a cinematic experience';
        
        // Check if splash screen should be shown
        this.loadSettings();
    }

    async loadSettings() {
        try {
            const settingsDoc = await getDoc(doc(db, 'settings', 'site'));
            if (settingsDoc.exists()) {
                const settings = settingsDoc.data();
                this.enabled = settings.splashEnabled || false;
                this.duration = parseInt(settings.splashDuration) || 10;
                this.message = settings.splashMessage || 'Welcome to Shane Photography';
                this.subMessage = settings.splashSubMessage || 'Prepare for a cinematic experience';
                
                // Apply settings to splash screen
                this.applySettings(settings);
                
                // Show splash if enabled
                if (this.enabled) {
                    this.showSplash();
                } else {
                    this.hideSplash();
                }
            } else {
                // Default - no splash
                this.hideSplash();
            }
        } catch (error) {
            console.error('Error loading splash settings:', error);
            this.hideSplash();
        }
    }

    applySettings(settings) {
        if (!this.splashScreen) return;

        // Update messages
        const logoElement = this.splashScreen.querySelector('.splash-logo');
        const messageElement = this.splashScreen.querySelector('.splash-message');
        const countdownCircle = this.splashScreen.querySelector('.countdown-circle circle:last-child');
        
        if (logoElement) {
            logoElement.innerHTML = `SHANE <span style="color: ${settings.splashLogoColor || '#f5b342'}">PHOTOGRAPHY</span>`;
        }
        
        if (messageElement) {
            messageElement.innerHTML = `
                ${this.message}
                <small>${this.subMessage}</small>
            `;
        }

        // Update animation duration
        if (countdownCircle) {
            countdownCircle.style.animation = `fillCircle ${this.duration}s linear forwards`;
        }

        // Update background
        if (settings.splashBackground === 'solid') {
            this.splashScreen.style.background = '#0b0b0b';
        } else if (settings.splashBackground === 'image' && settings.splashImageUrl) {
            this.splashScreen.style.background = `url('${settings.splashImageUrl}') center/cover no-repeat`;
        } else {
            this.splashScreen.style.background = 'linear-gradient(135deg, #0b0b0b 0%, #1a1a1a 100%)';
        }
    }

    showSplash() {
        if (!this.splashScreen) return;

        // Show splash screen
        this.splashScreen.classList.remove('hidden');
        
        // Prevent scrolling on main content
        document.body.style.overflow = 'hidden';
        
        // Start countdown
        this.startCountdown();
    }

    hideSplash() {
        if (!this.splashScreen) return;
        
        // Hide splash screen
        this.splashScreen.classList.add('hidden');
        
        // Restore scrolling
        document.body.style.overflow = '';
    }

    startCountdown() {
        let count = this.duration;
        
        const updateCountdown = () => {
            if (count >= 0) {
                if (this.countdownNumber) {
                    this.countdownNumber.textContent = count;
                    
                    // Add animation class
                    this.countdownNumber.style.animation = 'none';
                    this.countdownNumber.offsetHeight; // Trigger reflow
                    this.countdownNumber.style.animation = 'pulseIn 0.3s ease forwards';
                }
                
                if (count === 0) {
                    clearInterval(interval);
                    setTimeout(() => {
                        this.hideSplash();
                    }, 300);
                }
                count--;
            }
        };

        // Initial call
        updateCountdown();
        
        // Set interval for countdown
        const interval = setInterval(updateCountdown, 1000);
    }

    // For preview in admin
    static preview(settings) {
        const splash = document.createElement('div');
        splash.className = 'splash-screen';
        splash.style.zIndex = '10000';
        splash.innerHTML = `
            <div class="splash-content">
                <div class="splash-logo">
                    SHANE <span style="color: ${settings.splashLogoColor || '#f5b342'}">PHOTOGRAPHY</span>
                </div>
                <div class="countdown-container">
                    <div class="countdown-number" id="previewCountdown">${settings.splashDuration || 10}</div>
                    <svg class="countdown-circle" viewBox="0 0 280 280">
                        <circle cx="140" cy="140" r="138" stroke="rgba(245, 179, 66, 0.2)" stroke-width="4" fill="none"/>
                        <circle cx="140" cy="140" r="138" stroke="${settings.splashLogoColor || '#f5b342'}" stroke-width="4" fill="none" stroke-linecap="round"/>
                    </svg>
                </div>
                <div class="splash-message">
                    ${settings.splashMessage || 'Welcome to Shane Photography'}
                    <small>${settings.splashSubMessage || 'Prepare for a cinematic experience'}</small>
                </div>
            </div>
        `;

        // Style based on settings
        if (settings.splashBackground === 'solid') {
            splash.style.background = '#0b0b0b';
        } else if (settings.splashBackground === 'image' && settings.splashImageUrl) {
            splash.style.background = `url('${settings.splashImageUrl}') center/cover no-repeat`;
        }

        document.body.appendChild(splash);

        // Auto remove after 3 seconds
        setTimeout(() => {
            splash.style.opacity = '0';
            setTimeout(() => splash.remove(), 800);
        }, 3000);
    }
}

// Initialize splash screen
document.addEventListener('DOMContentLoaded', () => {
    window.splashManager = new SplashScreenManager();
});
