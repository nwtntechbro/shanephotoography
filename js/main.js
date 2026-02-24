import { db } from './firebase-config.js';
import { collection, query, getDocs, addDoc, orderBy, limit, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==================== FACEBOOK FEED INTEGRATION ====================
class FacebookFeed {
    constructor() {
        this.pageId = 'ShanePhotoography';
        this.accessToken = 'YOUR_FACEBOOK_ACCESS_TOKEN'; // You'll need to generate this
        this.postsPerPage = 15;
    }

    async loadFeed() {
        try {
            // Using Facebook Graph API
            const response = await fetch(`https://graph.facebook.com/v18.0/${this.pageId}/posts?fields=id,message,full_picture,created_time,permalink_url&limit=${this.postsPerPage}&access_token=${this.accessToken}`);
            const data = await response.json();
            
            if (data.data) {
                this.renderFeed(data.data);
            }
        } catch (error) {
            console.error('Error loading Facebook feed:', error);
            this.loadFallbackFeed();
        }
    }

    renderFeed(posts) {
        const feedContainer = document.getElementById('fbFeed');
        feedContainer.innerHTML = posts.map(post => `
            <a href="${post.permalink_url || '#'}" target="_blank" class="fb-card">
                <div class="fb-image">
                    ${post.full_picture ? 
                        `<img src="${post.full_picture}" alt="Facebook post">` : 
                        '<i class="fas fa-camera"></i>'
                    }
                </div>
                <div class="fb-content">
                    <p>${post.message ? post.message.substring(0, 100) + '...' : 'View this post'}</p>
                    <span class="fb-date">${new Date(post.created_time).toLocaleDateString()}</span>
                </div>
            </a>
        `).join('');
    }

    loadFallbackFeed() {
        // Fallback to Firebase-stored posts if API fails
        this.loadFromFirebase();
    }

    async loadFromFirebase() {
        const feedContainer = document.getElementById('fbFeed');
        const q = query(collection(db, 'facebook_posts'), orderBy('created_time', 'desc'), limit(15));
        const snapshot = await getDocs(q);
        
        feedContainer.innerHTML = snapshot.docs.map(doc => {
            const post = doc.data();
            return `
                <a href="${post.permalink_url}" target="_blank" class="fb-card">
                    <div class="fb-image">
                        ${post.image_url ? 
                            `<img src="${post.image_url}" alt="Facebook post">` : 
                            '<i class="fas fa-camera"></i>'
                        }
                    </div>
                    <div class="fb-content">
                        <p>${post.message || 'View this post'}</p>
                        <span class="fb-date">${new Date(post.created_time).toLocaleDateString()}</span>
                    </div>
                </a>
            `;
        }).join('');
    }
}

// ==================== PACKAGES MANAGEMENT ====================
class PackagesManager {
    constructor() {
        this.container = document.getElementById('packagesContainer');
    }

    async loadPackages() {
        const q = query(collection(db, 'packages'), where('active', '==', true));
        const snapshot = await getDocs(q);
        
        this.container.innerHTML = snapshot.docs.map(doc => {
            const pkg = doc.data();
            return `
                <div class="package-card">
                    <div class="package-badge">${pkg.category || 'Popular'}</div>
                    <h3>${pkg.name}</h3>
                    <div class="package-price">LKR ${pkg.price.toLocaleString()}</div>
                    <ul class="package-features">
                        ${pkg.features.map(f => `<li><i class="fas fa-check"></i> ${f}</li>`).join('')}
                    </ul>
                    <button class="btn-primary" onclick="selectPackage('${doc.id}', '${pkg.name}')">Select Package</button>
                </div>
            `;
        }).join('');
    }
}

// ==================== BOOKING CALENDAR SYSTEM ====================
class BookingCalendar {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.bookedSlots = [];
        this.availableSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
    }

    async initialize() {
        await this.loadBookedSlots();
        this.renderCalendar();
        this.attachEventListeners();
    }

    async loadBookedSlots() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth() + 1;
        
        const q = query(
            collection(db, 'bookings'),
            where('date', '>=', `${year}-${month.toString().padStart(2,'0')}-01`),
            where('date', '<=', `${year}-${month.toString().padStart(2,'0')}-31`)
        );
        
        const snapshot = await getDocs(q);
        this.bookedSlots = snapshot.docs.map(doc => doc.data());
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
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${(month+1).toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`;
            const isBooked = this.bookedSlots.some(booking => booking.date === dateStr);
            const isPast = new Date(year, month, day) < new Date().setHours(0,0,0,0);
            
            calendarHTML += `
                <div class="calendar-day ${isPast ? 'past' : ''} ${isBooked ? 'booked' : 'available'}" 
                     data-date="${dateStr}">
                    ${day}
                    ${isBooked ? '<span class="badge">Booked</span>' : ''}
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
        
        // Load available time slots
        this.loadTimeSlots(date);
        formWrapper.style.display = 'block';
        formWrapper.scrollIntoView({ behavior: 'smooth' });
    }

    async loadTimeSlots(date) {
        const timeSlotSelect = document.getElementById('timeSlot');
        timeSlotSelect.innerHTML = '<option value="">Select time</option>';
        
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
    }
}

// ==================== REVIEWS MANAGEMENT ====================
class ReviewsManager {
    constructor() {
        this.container = document.getElementById('reviewsContainer');
    }

    async loadReviews() {
        const q = query(collection(db, 'reviews'), where('approved', '==', true), orderBy('createdAt', 'desc'), limit(6));
        const snapshot = await getDocs(q);
        
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
        const q = query(collection(db, 'packages'), where('active', '==', true));
        const snapshot = await getDocs(q);
        
        select.innerHTML = '<option value="">Choose package</option>';
        snapshot.docs.forEach(doc => {
            const pkg = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${pkg.name} - LKR ${pkg.price.toLocaleString()}`;
            select.appendChild(option);
        });
    }
}

// ==================== INITIALIZATION ====================
window.selectPackage = (packageId, packageName) => {
    document.getElementById('packageSelect').value = packageId;
    document.getElementById('book').scrollIntoView({ behavior: 'smooth' });
};

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Load Facebook feed
    const fbFeed = new FacebookFeed();
    fbFeed.loadFeed();

    // Load packages
    const packages = new PackagesManager();
    await packages.loadPackages();

    // Initialize calendar
    const calendar = new BookingCalendar();
    await calendar.initialize();

    // Load reviews
    const reviews = new ReviewsManager();
    await reviews.loadReviews();

    // Initialize forms
    const inquiryHandler = new InquiryHandler();
    const bookingHandler = new BookingHandler();
    await bookingHandler.loadPackages();

    // Refresh feed every 30 minutes
    setInterval(() => fbFeed.loadFeed(), 30 * 60 * 1000);
});
