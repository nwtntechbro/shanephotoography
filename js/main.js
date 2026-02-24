import { db } from './firebase-config.js';
import { 
    collection, query, getDocs, addDoc, orderBy, limit, where, serverTimestamp, doc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==================== SITE SETTINGS LOADER ====================
class SiteSettings {
    constructor() {
        this.settings = {};
        this.loadSettings();
    }

    async loadSettings() {
        try {
            const settingsDoc = await getDoc(doc(db, 'settings', 'site'));
            if (settingsDoc.exists()) {
                this.settings = settingsDoc.data();
                this.applyVideoSettings();
                this.applyContactSettings();
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    forceVideoRefresh() {
        const video = document.getElementById('heroVideo');
        if (video) {
            video.style.width = '100%';
            video.style.height = '100%';
            
            setTimeout(() => {
                video.play().catch(e => console.log('Play failed:', e));
            }, 100);
        }
    }

    setupOrientationListener() {
        window.addEventListener('resize', () => {
            this.forceVideoRefresh();
        });
        
        window.addEventListener('orientationchange', () => {
            this.forceVideoRefresh();
        });
    }

    applyVideoSettings() {
        const videoUrl = this.settings.heroVideoUrl;
        const videoOpacity = this.settings.videoOpacity || 0.7;
        
        if (videoUrl) {
            this.updateHeroVideo(videoUrl, videoOpacity);
        }
    }

    updateHeroVideo(videoUrl, opacity) {
        const heroSection = document.querySelector('.hero');
        const existingVideo = document.getElementById('heroVideo');
        
        if (existingVideo) {
            existingVideo.remove();
        }

        const video = document.createElement('video');
        video.id = 'heroVideo';
        video.className = 'hero-video';
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.style.opacity = opacity;

        const source = document.createElement('source');
        source.src = videoUrl;
        source.type = 'video/mp4';

        video.appendChild(source);
        heroSection.insertBefore(video, heroSection.firstChild);

        video.addEventListener('loadeddata', () => {
            video.play().catch(e => console.log('Autoplay prevented:', e));
        });

        video.addEventListener('error', (e) => {
            console.error('Video failed to load:', e);
            heroSection.style.background = 'linear-gradient(135deg, #0b0b0b 0%, #1a1a1a 100%)';
        });
    }

    applyContactSettings() {
        if (this.settings.contactPhone) {
            const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
            phoneLinks.forEach(link => {
                link.href = `tel:${this.settings.contactPhone.replace(/\s/g, '')}`;
                link.textContent = this.settings.contactPhone;
            });
        }

        if (this.settings.contactEmail) {
            const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
            emailLinks.forEach(link => {
                link.href = `mailto:${this.settings.contactEmail}`;
                link.textContent = this.settings.contactEmail;
            });
        }

        if (this.settings.contactWhatsapp) {
            const whatsappLinks = document.querySelectorAll('a[href^="https://wa.me"]');
            whatsappLinks.forEach(link => {
                const number = this.settings.contactWhatsapp.replace(/\D/g, '');
                link.href = `https://wa.me/${number}`;
                link.textContent = this.settings.contactWhatsapp;
            });
        }
    }
}

// ==================== POPUP NOTIFICATION SYSTEM ====================
class NotificationPopup {
    constructor() {
        this.createContainer();
    }

    createContainer() {
        // Remove existing container if any
        const existingContainer = document.getElementById('notification-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        // Create new container
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
        this.container = container;
    }

    show(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification-popup ${type}`;
        
        // Set styles based on type
        const colors = {
            success: {
                bg: 'rgba(76, 175, 80, 0.95)',
                icon: 'fa-check-circle',
                border: '#4caf50'
            },
            error: {
                bg: 'rgba(244, 67, 54, 0.95)',
                icon: 'fa-exclamation-circle',
                border: '#f44336'
            },
            warning: {
                bg: 'rgba(255, 152, 0, 0.95)',
                icon: 'fa-exclamation-triangle',
                border: '#ff9800'
            },
            info: {
                bg: 'rgba(33, 150, 243, 0.95)',
                icon: 'fa-info-circle',
                border: '#2196f3'
            }
        };

        const color = colors[type] || colors.success;

        notification.style.cssText = `
            background: ${color.bg};
            backdrop-filter: blur(10px);
            color: white;
            padding: 15px 25px;
            border-radius: 50px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 1rem;
            font-weight: 500;
            border-left: 4px solid ${color.border};
            transform: translateX(400px);
            opacity: 0;
            transition: all 0.3s ease;
            pointer-events: auto;
            cursor: pointer;
            min-width: 300px;
            max-width: 400px;
        `;

        notification.innerHTML = `
            <i class="fas ${color.icon}" style="font-size: 1.5rem;"></i>
            <span style="flex: 1;">${message}</span>
            <i class="fas fa-times" style="opacity: 0.7; font-size: 1rem; margin-left: 10px;"></i>
        `;

        this.container.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 10);

        // Auto remove after 5 seconds
        const timeout = setTimeout(() => {
            this.removeNotification(notification);
        }, 5000);

        // Remove on click
        notification.addEventListener('click', () => {
            clearTimeout(timeout);
            this.removeNotification(notification);
        });
    }

    removeNotification(notification) {
        notification.style.transform = 'translateX(400px)';
        notification.style.opacity = '0';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }
}

// ==================== FACEBOOK FEED (Official Page Plugin) ====================
class FacebookFeed {
    constructor() {
        this.pageUrl = 'https://www.facebook.com/ShanePhotoography/';
        this.feedContainer = document.getElementById('fbFeed');
        this.initFeed();
    }

    initFeed() {
        this.createIframeFeed();
        this.loadFacebookSDK();
    }

    createIframeFeed() {
        const encodedUrl = encodeURIComponent(this.pageUrl);
        const iframeSrc = `https://www.facebook.com/plugins/page.php?href=${encodedUrl}&tabs=timeline&width=500&height=800&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&appId`;
        
        this.feedContainer.innerHTML = `
            <div style="display: flex; justify-content: center; width: 100%;">
                <iframe 
                    src="${iframeSrc}" 
                    width="100%" 
                    height="800" 
                    style="border:none;overflow:hidden; border-radius: 20px; max-width: 500px; background: #1a1a1a;" 
                    scrolling="no" 
                    frameborder="0" 
                    allowfullscreen="true" 
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share">
                </iframe>
            </div>
        `;
    }

    loadFacebookSDK() {
        if (!document.getElementById('facebook-jssdk')) {
            const script = document.createElement('script');
            script.id = 'facebook-jssdk';
            script.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0';
            document.body.appendChild(script);
        }
    }
}

// ==================== PACKAGES MANAGEMENT ====================
class PackagesManager {
    constructor() {
        this.container = document.getElementById('packagesContainer');
        this.loadPackages();
    }

    async loadPackages() {
        try {
            const q = query(collection(db, 'packages'), where('active', '==', true));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                this.container.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No packages available</p>';
                return;
            }

            this.container.innerHTML = snapshot.docs.map(doc => {
                const pkg = doc.data();
                return `
                    <div class="package-card">
                        ${pkg.popular ? '<div class="package-badge">Popular</div>' : ''}
                        <h3>${pkg.name}</h3>
                        <div class="package-price">LKR ${pkg.price?.toLocaleString() || '0'}</div>
                        <ul class="package-features">
                            ${pkg.features ? pkg.features.map(f => `<li><i class="fas fa-check"></i> ${f}</li>`).join('') : ''}
                        </ul>
                        <button class="btn-primary" onclick="selectPackage('${doc.id}', '${pkg.name}')">Select Package</button>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading packages:', error);
            this.container.innerHTML = '<p style="text-align: center; color: var(--danger);">Error loading packages</p>';
        }
    }
}

// ==================== BOOKING CALENDAR SYSTEM ====================
class BookingCalendar {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.bookedSlots = [];
        this.availableSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
        this.initialize();
    }

    async initialize() {
        await this.loadSettings();
        await this.loadBookedSlots();
        this.renderCalendar();
        this.attachEventListeners();
    }

    async loadSettings() {
        try {
            const settingsDoc = await getDoc(doc(db, 'settings', 'site'));
            if (settingsDoc.exists() && settingsDoc.data().timeSlots) {
                this.availableSlots = settingsDoc.data().timeSlots;
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async loadBookedSlots() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth() + 1;
        
        try {
            const q = query(
                collection(db, 'bookings'),
                where('date', '>=', `${year}-${month.toString().padStart(2,'0')}-01`),
                where('date', '<=', `${year}-${month.toString().padStart(2,'0')}-31`),
                where('status', 'in', ['pending', 'confirmed'])
            );
            
            const snapshot = await getDocs(q);
            this.bookedSlots = snapshot.docs.map(doc => doc.data());
        } catch (error) {
            console.error('Error loading booked slots:', error);
        }
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        document.getElementById('currentMonthDisplay').textContent = 
            this.currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        let calendarHTML = '<div class="calendar-weekdays">';
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
            calendarHTML += `<div>${day}</div>`;
        });
        calendarHTML += '</div><div class="calendar-days">';

        for (let i = 0; i < firstDay; i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }

        const today = new Date().setHours(0,0,0,0);
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${(month+1).toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`;
            const dateObj = new Date(year, month, day);
            const isBooked = this.bookedSlots.some(booking => booking.date === dateStr);
            const isPast = dateObj < today;
            const isAvailable = !isBooked && !isPast;
            
            calendarHTML += `
                <div class="calendar-day ${isPast ? 'past' : ''} ${isBooked ? 'booked' : ''} ${isAvailable ? 'available' : ''}" 
                     data-date="${dateStr}">
                    ${day}
                </div>
            `;
        }

        calendarHTML += '</div>';
        document.getElementById('calendar').innerHTML = calendarHTML;
    }

    attachEventListeners() {
        document.querySelectorAll('.calendar-day.available').forEach(day => {
            day.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    setTimeout(() => {
                        this.selectedDate = e.currentTarget.dataset.date;
                        this.showBookingForm(this.selectedDate);
                    }, 100);
                } else {
                    this.selectedDate = e.currentTarget.dataset.date;
                    this.showBookingForm(this.selectedDate);
                }
            });
        });

        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.initialize();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.initialize();
        });
    }

    showBookingForm(date) {
        const formWrapper = document.getElementById('bookingFormWrapper');
        document.getElementById('selectedDate').value = date;
        document.getElementById('displayDate').value = new Date(date).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        
        this.loadTimeSlots(date);
        formWrapper.style.display = 'block';
        formWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async loadTimeSlots(date) {
        const timeSlotSelect = document.getElementById('timeSlot');
        timeSlotSelect.innerHTML = '<option value="">Select time</option>';
        
        try {
            const q = query(collection(db, 'bookings'), where('date', '==', date));
            const snapshot = await getDocs(q);
            const bookedTimes = snapshot.docs.map(doc => doc.data().time);
            
            const available = this.availableSlots.filter(slot => !bookedTimes.includes(slot));
            
            available.forEach(slot => {
                const option = document.createElement('option');
                option.value = slot;
                option.textContent = slot;
                timeSlotSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading time slots:', error);
        }
    }
}

// ==================== REVIEWS MANAGEMENT ====================
class ReviewsManager {
    constructor() {
        this.container = document.getElementById('reviewsContainer');
        this.loadReviews();
    }

    async loadReviews() {
        try {
            const q = query(collection(db, 'reviews'), where('approved', '==', true), orderBy('createdAt', 'desc'), limit(6));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                this.container.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No reviews yet</p>';
                return;
            }

            this.container.innerHTML = snapshot.docs.map(doc => {
                const review = doc.data();
                return `
                    <div class="review-card">
                        <div class="review-stars">
                            ${Array(review.rating).fill('<i class="fas fa-star"></i>').join('')}
                        </div>
                        <p class="review-text">"${review.text}"</p>
                        <div class="review-author">
                            <strong>${review.name}</strong>
                            <span>${review.eventType || 'Client'}</span>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading reviews:', error);
        }
    }
}

// ==================== INQUIRY FORM HANDLER ====================
class InquiryHandler {
    constructor(notifier) {
        this.form = document.getElementById('quickInquiryForm');
        this.notifier = notifier;
        this.setupListener();
    }

    setupListener() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Validate form
            const name = document.getElementById('inquiryName').value.trim();
            const email = document.getElementById('inquiryEmail').value.trim();
            const message = document.getElementById('inquiryMessage').value.trim();

            if (!name || !email || !message) {
                this.notifier.show('Please fill in all required fields', 'error');
                return;
            }

            if (!this.isValidEmail(email)) {
                this.notifier.show('Please enter a valid email address', 'error');
                return;
            }

            const submitButton = this.form.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';

            try {
                const inquiry = {
                    name: name,
                    email: email,
                    phone: document.getElementById('inquiryPhone').value.trim() || '',
                    message: message,
                    status: 'new',
                    createdAt: serverTimestamp()
                };

                await addDoc(collection(db, 'inquiries'), inquiry);
                
                this.notifier.show('Thank you! Your inquiry has been sent. We\'ll contact you soon.', 'success');
                this.form.reset();
                
            } catch (error) {
                console.error('Error sending inquiry:', error);
                this.notifier.show('Error sending inquiry. Please try again.', 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        });
    }

    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
}

// ==================== BOOKING FORM HANDLER ====================
class BookingHandler {
    constructor(notifier) {
        this.form = document.getElementById('bookingForm');
        this.notifier = notifier;
        this.setupListener();
        this.loadPackages();
    }

    setupListener() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Validate form
            const name = document.getElementById('bookingName').value.trim();
            const email = document.getElementById('bookingEmail').value.trim();
            const phone = document.getElementById('bookingPhone').value.trim();
            const date = document.getElementById('selectedDate').value;
            const time = document.getElementById('timeSlot').value;
            const packageId = document.getElementById('packageSelect').value;

            if (!name || !email || !phone || !date || !time || !packageId) {
                this.notifier.show('Please fill in all required fields', 'error');
                return;
            }

            if (!this.isValidEmail(email)) {
                this.notifier.show('Please enter a valid email address', 'error');
                return;
            }

            if (!this.isValidPhone(phone)) {
                this.notifier.show('Please enter a valid phone number', 'error');
                return;
            }

            const submitButton = this.form.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Booking...';

            try {
                const booking = {
                    name: name,
                    email: email,
                    phone: phone,
                    date: date,
                    time: time,
                    packageId: packageId,
                    packageName: document.getElementById('packageSelect').selectedOptions[0]?.text || '',
                    eventType: document.getElementById('eventType').value.trim() || '',
                    specialRequests: document.getElementById('specialRequests').value.trim() || '',
                    status: 'pending',
                    createdAt: serverTimestamp()
                };

                await addDoc(collection(db, 'bookings'), booking);
                
                this.notifier.show('Booking confirmed! We\'ll send you a confirmation email.', 'success');
                this.form.reset();
                document.getElementById('bookingFormWrapper').style.display = 'none';
                
            } catch (error) {
                console.error('Error creating booking:', error);
                this.notifier.show('Error creating booking. Please try again.', 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        });
    }

    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    isValidPhone(phone) {
        const re = /^[\d\s\+\-\(\)]{10,}$/;
        return re.test(phone);
    }

    async loadPackages() {
        const select = document.getElementById('packageSelect');
        try {
            const q = query(collection(db, 'packages'), where('active', '==', true));
            const snapshot = await getDocs(q);
            
            select.innerHTML = '<option value="">Choose package</option>';
            snapshot.docs.forEach(doc => {
                const pkg = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = `${pkg.name} - LKR ${pkg.price?.toLocaleString() || '0'}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading packages:', error);
        }
    }
}

// ==================== BACK TO TOP BUTTON ====================
class BackToTop {
    constructor() {
        this.createButton();
        this.setupListeners();
    }

    createButton() {
        const button = document.createElement('button');
        button.className = 'back-to-top';
        button.innerHTML = '<i class="fas fa-arrow-up"></i>';
        button.setAttribute('aria-label', 'Back to top');
        document.body.appendChild(button);
        this.button = button;
    }

    setupListeners() {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                this.button.classList.add('show');
            } else {
                this.button.classList.remove('show');
            }
        });

        this.button.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        this.button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// ==================== MOBILE MENU HANDLER ====================
class MobileMenu {
    constructor() {
        this.menuToggle = document.querySelector('.menu-toggle');
        this.navMenu = document.querySelector('.nav-menu');
        this.body = document.body;
        this.setupListeners();
    }

    setupListeners() {
        if (this.menuToggle && this.navMenu) {
            this.menuToggle.addEventListener('click', () => {
                this.toggleMenu();
            });

            this.navMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    this.closeMenu();
                });
            });

            window.addEventListener('resize', () => {
                if (window.innerWidth > 968 && this.navMenu.classList.contains('active')) {
                    this.closeMenu();
                }
            });

            document.addEventListener('click', (e) => {
                if (!this.navMenu.contains(e.target) && !this.menuToggle.contains(e.target) && this.navMenu.classList.contains('active')) {
                    this.closeMenu();
                }
            });

            this.navMenu.addEventListener('touchmove', (e) => {
                if (this.navMenu.classList.contains('active')) {
                    e.stopPropagation();
                }
            });
        }
    }

    toggleMenu() {
        this.navMenu.classList.toggle('active');
        this.body.classList.toggle('menu-open');
        
        const icon = this.menuToggle.querySelector('i');
        if (this.navMenu.classList.contains('active')) {
            icon.className = 'fas fa-times';
        } else {
            icon.className = 'fas fa-bars';
        }
    }

    closeMenu() {
        this.navMenu.classList.remove('active');
        this.body.classList.remove('menu-open');
        const icon = this.menuToggle.querySelector('i');
        icon.className = 'fas fa-bars';
    }
}

// ==================== ACTIVE NAVIGATION HIGHLIGHT ====================
class ActiveNavHighlight {
    constructor() {
        this.sections = document.querySelectorAll('section[id]');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.setupListeners();
    }

    setupListeners() {
        window.addEventListener('scroll', () => {
            this.highlightNavigation();
        });
    }

    highlightNavigation() {
        const scrollY = window.scrollY;
        
        this.sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 100;
            const sectionId = section.getAttribute('id');
            
            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                this.navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }
}

// ==================== GLOBAL FUNCTIONS ====================
window.selectPackage = (packageId, packageName) => {
    document.getElementById('packageSelect').value = packageId;
    const bookSection = document.getElementById('book');
    bookSection.scrollIntoView({ behavior: 'smooth' });
    
    setTimeout(() => {
        const bookingForm = document.getElementById('bookingFormWrapper');
        if (bookingForm) {
            bookingForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 500);
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    // Create notification system first
    const notifier = new NotificationPopup();
    
    // Initialize all components
    const settings = new SiteSettings();
    const fbFeed = new FacebookFeed();
    const packages = new PackagesManager();
    const calendar = new BookingCalendar();
    const reviews = new ReviewsManager();
    const inquiryHandler = new InquiryHandler(notifier);
    const bookingHandler = new BookingHandler(notifier);
    const backToTop = new BackToTop();
    const mobileMenu = new MobileMenu();
    const navHighlight = new ActiveNavHighlight();

    // Refresh feed every 30 minutes
    setInterval(() => {
        new FacebookFeed().initFeed();
    }, 30 * 60 * 1000);

    // Fix for iOS viewport height
    const setVH = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
});
