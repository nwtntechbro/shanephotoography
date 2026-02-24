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
        
        // Remove existing video if any
        if (existingVideo) {
            existingVideo.remove();
        }

        // Create new video element
        const video = document.createElement('video');
        video.id = 'heroVideo';
        video.className = 'hero-video';
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.style.opacity = opacity;

        // Create source element
        const source = document.createElement('source');
        source.src = videoUrl;
        source.type = 'video/mp4';

        video.appendChild(source);
        
        // Insert video at the beginning of hero section
        heroSection.insertBefore(video, heroSection.firstChild);

        // Handle video loading
        video.addEventListener('loadeddata', () => {
            console.log('Video loaded successfully from settings');
            video.play().catch(e => console.log('Autoplay prevented:', e));
        });

        video.addEventListener('error', (e) => {
            console.error('Video failed to load:', e);
            // Fallback to gradient background
            heroSection.style.background = 'linear-gradient(135deg, #0b0b0b 0%, #1a1a1a 100%)';
        });
    }

    applyContactSettings() {
        // Update contact information from settings
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

        // Update social media links
        if (this.settings.facebookUrl) {
            const fbLinks = document.querySelectorAll('a[href*="facebook.com"]');
            fbLinks.forEach(link => {
                link.href = this.settings.facebookUrl;
            });
        }

        if (this.settings.instagramUrl) {
            const igLinks = document.querySelectorAll('a[href*="instagram.com"]');
            igLinks.forEach(link => {
                link.href = this.settings.instagramUrl;
            });
        }
    }
}

// ==================== FACEBOOK FEED INTEGRATION ====================
class FacebookFeed {
    constructor() {
        this.pageUrl = 'https://www.facebook.com/ShanePhotoography/';
        this.feedContainer = document.getElementById('fbFeed');
        this.initFeed();
    }

    initFeed() {
        // Create the Facebook embed using iframe method (most reliable)
        this.createIframeFeed();
        
        // Also load SDK for future use
        this.loadFacebookSDK();
    }

    createIframeFeed() {
        // Facebook Page Plugin URL format
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
        // Load SDK for potential future interactive features
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

        // Empty cells for days before month start
        for (let i = 0; i < firstDay; i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }

        // Days of month
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
                this.selectedDate = e.currentTarget.dataset.date;
                this.showBookingForm(this.selectedDate);
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
        formWrapper.scrollIntoView({ behavior: 'smooth' });
    }

    async loadTimeSlots(date) {
        const timeSlotSelect = document.getElementById('timeSlot');
        timeSlotSelect.innerHTML = '<option value="">Select time</option>';
        
        try {
            // Get booked slots for this date
            const q = query(collection(db, 'bookings'), where('date', '==', date));
            const snapshot = await getDocs(q);
            const bookedTimes = snapshot.docs.map(doc => doc.data().time);
            
            // Filter available slots
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
            this.container.innerHTML = '<p style="text-align: center; color: var(--danger);">Error loading reviews</p>';
        }
    }
}

// ==================== INQUIRY FORM HANDLER ====================
class InquiryHandler {
    constructor() {
        this.form = document.getElementById('quickInquiryForm');
        this.setupListener();
    }

    setupListener() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const inquiry = {
                name: document.getElementById('inquiryName').value,
                email: document.getElementById('inquiryEmail').value,
                phone: document.getElementById('inquiryPhone').value,
                message: document.getElementById('inquiryMessage').value,
                status: 'new',
                createdAt: serverTimestamp()
            };

            try {
                await addDoc(collection(db, 'inquiries'), inquiry);
                alert('Thank you! Your inquiry has been sent. We\'ll contact you soon.');
                this.form.reset();
            } catch (error) {
                console.error('Error:', error);
                alert('Error sending inquiry. Please try again.');
            }
        });
    }
}

// ==================== BOOKING FORM HANDLER ====================
class BookingHandler {
    constructor() {
        this.form = document.getElementById('bookingForm');
        this.setupListener();
        this.loadPackages();
    }

    setupListener() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const booking = {
                date: document.getElementById('selectedDate').value,
                time: document.getElementById('timeSlot').value,
                packageId: document.getElementById('packageSelect').value,
                packageName: document.getElementById('packageSelect').selectedOptions[0]?.text,
                name: document.getElementById('bookingName').value,
                email: document.getElementById('bookingEmail').value,
                phone: document.getElementById('bookingPhone').value,
                eventType: document.getElementById('eventType').value,
                specialRequests: document.getElementById('specialRequests').value,
                status: 'pending',
                createdAt: serverTimestamp()
            };

            try {
                await addDoc(collection(db, 'bookings'), booking);
                alert('Booking confirmed! We\'ll send you a confirmation email.');
                this.form.reset();
                document.getElementById('bookingFormWrapper').style.display = 'none';
            } catch (error) {
                console.error('Error:', error);
                alert('Error creating booking. Please try again.');
            }
        });
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

// ==================== NAVIGATION HANDLER ====================
class NavigationHandler {
    constructor() {
        this.setupSmoothScroll();
        this.setupMobileMenu();
    }

    setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    setupMobileMenu() {
        const menuToggle = document.querySelector('.menu-toggle');
        const navMenu = document.querySelector('.nav-menu');
        
        if (menuToggle && navMenu) {
            menuToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
        }
    }
}

// ==================== GLOBAL FUNCTIONS ====================
window.selectPackage = (packageId, packageName) => {
    document.getElementById('packageSelect').value = packageId;
    document.getElementById('book').scrollIntoView({ behavior: 'smooth' });
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    // Load settings first (this will update the video)
    const settings = new SiteSettings();
    
    // Initialize all components
    const fbFeed = new FacebookFeed();
    const packages = new PackagesManager();
    const calendar = new BookingCalendar();
    const reviews = new ReviewsManager();
    const inquiryHandler = new InquiryHandler();
    const bookingHandler = new BookingHandler();
    const navigation = new NavigationHandler();

    // Refresh feed every 30 minutes
    setInterval(() => {
        new FacebookFeed().loadFeed();
    }, 30 * 60 * 1000);
});
