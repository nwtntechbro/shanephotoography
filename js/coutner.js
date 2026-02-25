import { db } from './firebase-config.js';
import { 
    collection, query, getDocs, addDoc, orderBy, limit, where, serverTimestamp, doc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==================== SPLASH SCREEN MANAGER ====================
class SplashScreenManager {
    constructor() {
        this.splashScreen = document.getElementById('splashScreen');
        this.countdownNumber = document.getElementById('countdownNumber');
        this.splashMessage = document.querySelector('.splash-message');
        this.mainContent = document.querySelector('.navbar');
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
        
        if (logoElement) {
            logoElement.innerHTML = `SHANE <span style="color: ${settings.splashLogoColor || '#f5b342'}">PHOTOGRAPHY</span>`;
        }
        
        if (this.splashMessage) {
            this.splashMessage.innerHTML = `
                ${this.message}
                <small>${this.subMessage}</small>
            `;
        }

        // Update background
        if (settings.splashBackground === 'solid') {
            this.splashScreen.style.background = '#0b0b0b';
        } else if (settings.splashBackground === 'image' && settings.splashImageUrl) {
            this.splashScreen.style.background = `url('${settings.splashImageUrl}') center/cover no-repeat`;
        } else {
            this.splashScreen.style.background = 'linear-gradient(135deg, #0b0b0b 0%, #1a1a1a 100%)';
        }

        // Update countdown circle color
        const circles = this.splashScreen.querySelectorAll('.countdown-circle circle');
        circles.forEach(circle => {
            if (circle.getAttribute('stroke') !== 'rgba(245, 179, 66, 0.2)') {
                circle.setAttribute('stroke', settings.splashLogoColor || '#f5b342');
            }
        });

        // Update animation duration
        const animCircle = this.splashScreen.querySelector('.countdown-circle circle:last-child');
        if (animCircle) {
            animCircle.style.animation = `fillCircle ${this.duration}s linear forwards`;
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
            if (count > 0) {
                // Show numbers from duration down to 1
                if (this.countdownNumber) {
                    this.countdownNumber.textContent = count;
                    this.countdownNumber.style.display = 'block';
                    
                    // Add animation class
                    this.countdownNumber.style.animation = 'none';
                    this.countdownNumber.offsetHeight; // Trigger reflow
                    this.countdownNumber.style.animation = 'pulseIn 0.3s ease forwards';
                }
                count--;
                
                // Schedule next update
                setTimeout(updateCountdown, 1000);
            } else {
                // Countdown finished - show "Welcome" message for 1 second
                if (this.countdownNumber) {
                    this.countdownNumber.style.display = 'none';
                }
                
                // Show welcome message in the countdown area
                const countdownContainer = this.splashScreen.querySelector('.countdown-container');
                if (countdownContainer) {
                    // Hide the circle
                    const circle = countdownContainer.querySelector('.countdown-circle');
                    if (circle) circle.style.display = 'none';
                    
                    // Show welcome text
                    const welcomeDiv = document.createElement('div');
                    welcomeDiv.className = 'welcome-message';
                    welcomeDiv.style.cssText = `
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        font-size: clamp(2rem, 6vw, 3rem);
                        font-weight: 800;
                        color: #f5b342;
                        text-align: center;
                        width: 100%;
                        animation: fadeInUp 0.5s ease forwards;
                    `;
                    welcomeDiv.innerHTML = 'Welcome!<br><span style="font-size: 0.6em; color: white;">Entering Website...</span>';
                    
                    // Remove any existing welcome message
                    const existingWelcome = countdownContainer.querySelector('.welcome-message');
                    if (existingWelcome) existingWelcome.remove();
                    
                    countdownContainer.appendChild(welcomeDiv);
                }
                
                // Hide splash after 1 second
                setTimeout(() => {
                    this.hideSplash();
                }, 1000);
            }
        };

        // Start the countdown
        updateCountdown();
    }

    // For preview in admin
    static preview(settings) {
        // Remove any existing preview
        const existingPreview = document.querySelector('.splash-screen.preview');
        if (existingPreview) existingPreview.remove();

        const splash = document.createElement('div');
        splash.className = 'splash-screen preview';
        splash.style.zIndex = '10000';
        splash.style.position = 'fixed';
        splash.style.top = '0';
        splash.style.left = '0';
        splash.style.width = '100%';
        splash.style.height = '100vh';
        splash.style.display = 'flex';
        splash.style.alignItems = 'center';
        splash.style.justifyContent = 'center';
        
        // Style based on settings
        if (settings.splashBackground === 'solid') {
            splash.style.background = '#0b0b0b';
        } else if (settings.splashBackground === 'image' && settings.splashImageUrl) {
            splash.style.background = `url('${settings.splashImageUrl}') center/cover no-repeat`;
        } else {
            splash.style.background = 'linear-gradient(135deg, #0b0b0b 0%, #1a1a1a 100%)';
        }

        splash.innerHTML = `
            <div class="splash-content" style="text-align: center; padding: 2rem; max-width: 800px; width: 100%;">
                <div class="splash-logo" style="font-size: clamp(2rem, 8vw, 4rem); font-weight: 800; margin-bottom: 3rem; opacity: 0; transform: translateY(20px); animation: fadeInUp 0.8s ease forwards;">
                    SHANE <span style="color: ${settings.splashLogoColor || '#f5b342'}">PHOTOGRAPHY</span>
                </div>
                
                <div class="countdown-container" style="position: relative; width: 300px; height: 300px; margin: 0 auto;">
                    <div class="countdown-number" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: clamp(5rem, 15vw, 8rem); font-weight: 800; color: ${settings.splashLogoColor || '#f5b342'}; text-shadow: 0 0 30px rgba(245, 179, 66, 0.5); z-index: 2;">
                        ${settings.splashDuration || 10}
                    </div>
                    <svg class="countdown-circle" viewBox="0 0 280 280" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform: rotate(-90deg);">
                        <circle cx="140" cy="140" r="138" stroke="rgba(245, 179, 66, 0.2)" stroke-width="4" fill="none"/>
                        <circle cx="140" cy="140" r="138" stroke="${settings.splashLogoColor || '#f5b342'}" stroke-width="4" fill="none" stroke-linecap="round" style="stroke-dasharray: 867; stroke-dashoffset: 867; animation: fillCircle ${settings.splashDuration || 10}s linear forwards;"/>
                    </svg>
                </div>
                
                <div class="splash-message" style="font-size: clamp(1.2rem, 4vw, 2rem); margin-top: 3rem; color: #f0f0f0;">
                    ${settings.splashMessage || 'Welcome to Shane Photography'}
                    <small style="display: block; font-size: clamp(0.9rem, 3vw, 1.2rem); color: #b0b0b0; margin-top: 1rem;">${settings.splashSubMessage || 'Prepare for a cinematic experience'}</small>
                </div>
            </div>
        `;

        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInUp {
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes fillCircle {
                to { stroke-dashoffset: 0; }
            }
            @keyframes pulseIn {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.1); }
                100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
        `;
        splash.appendChild(style);

        document.body.appendChild(splash);

        // Start countdown preview
        let count = parseInt(settings.splashDuration) || 10;
        const numberElement = splash.querySelector('.countdown-number');
        
        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                if (numberElement) {
                    numberElement.textContent = count;
                }
            } else {
                clearInterval(interval);
                // Show welcome message
                if (numberElement) {
                    numberElement.style.display = 'none';
                }
                
                const container = splash.querySelector('.countdown-container');
                const circle = splash.querySelector('.countdown-circle');
                if (circle) circle.style.display = 'none';
                
                const welcomeDiv = document.createElement('div');
                welcomeDiv.className = 'welcome-message';
                welcomeDiv.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: clamp(2rem, 6vw, 3rem);
                    font-weight: 800;
                    color: ${settings.splashLogoColor || '#f5b342'};
                    text-align: center;
                    width: 100%;
                    animation: fadeInUp 0.5s ease forwards;
                `;
                welcomeDiv.innerHTML = 'Welcome!<br><span style="font-size: 0.6em; color: white;">Preview Mode</span>';
                container.appendChild(welcomeDiv);
                
                // Remove preview after 2 seconds
                setTimeout(() => {
                    splash.remove();
                }, 2000);
            }
        }, 1000);
    }
}

// Initialize splash screen
document.addEventListener('DOMContentLoaded', () => {
    window.splashManager = new SplashScreenManager();
});
