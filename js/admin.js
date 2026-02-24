import { db, auth } from './firebase-config.js';
import { 
    collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc,
    orderBy, where, limit, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ==================== ADMIN AUTHENTICATION ====================
class AdminAuth {
    constructor() {
        this.checkAuth();
        this.setupLogout();
    }

    async checkAuth() {
        // Simple check - in production use Firebase Auth state
        const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
        if (!isLoggedIn && !window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }

    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            sessionStorage.setItem('adminLoggedIn', 'true');
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    setupLogout() {
        document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            await signOut(auth);
            sessionStorage.removeItem('adminLoggedIn');
            window.location.href = 'login.html';
        });
    }
}

// ==================== INQUIRIES MANAGEMENT (CRUD) ====================
class InquiriesManager {
    constructor() {
        this.container = document.getElementById('inquiriesTableBody');
        this.loadInquiries();
    }

    async loadInquiries() {
        const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        this.renderInquiries(snapshot.docs);
        this.updateStats(snapshot.docs);
    }

    renderInquiries(docs) {
        if (!this.container) return;
        
        this.container.innerHTML = docs.map(doc => {
            const inquiry = doc.data();
            return `
                <tr>
                    <td>${inquiry.name}</td>
                    <td>${inquiry.email}</td>
                    <td>${inquiry.phone || '-'}</td>
                    <td>${inquiry.message.substring(0, 50)}...</td>
                    <td><span class="status-badge ${inquiry.status || 'new'}">${inquiry.status || 'new'}</span></td>
                    <td>
                        <button onclick="viewInquiry('${doc.id}')" class="btn-icon"><i class="fas fa-eye"></i></button>
                        <button onclick="updateStatus('${doc.id}')" class="btn-icon"><i class="fas fa-check"></i></button>
                        <button onclick="deleteInquiry('${doc.id}')" class="btn-icon"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateStats(docs) {
        const newCount = docs.filter(d => d.data().status === 'new').length;
        document.getElementById('newInquiriesCount')?.textContent = newCount;
    }

    async updateStatus(inquiryId, status) {
        await updateDoc(doc(db, 'inquiries', inquiryId), {
            status: status,
            updatedAt: serverTimestamp()
        });
        this.loadInquiries();
    }

    async deleteInquiry(inquiryId) {
        if (confirm('Are you sure you want to delete this inquiry?')) {
            await deleteDoc(doc(db, 'inquiries', inquiryId));
            this.loadInquiries();
        }
    }

    async replyToInquiry(inquiryId, replyMessage) {
        const inquiry = await getDoc(doc(db, 'inquiries', inquiryId));
        const data = inquiry.data();
        
        // Send email (you'd need an email service)
        console.log('Sending reply to:', data.email, replyMessage);
        
        // Update status
        await this.updateStatus(inquiryId, 'replied');
    }
}

// ==================== BOOKINGS MANAGEMENT (CRUD) ====================
class BookingsManager {
    constructor() {
        this.loadBookings();
    }

    async loadBookings() {
        const q = query(collection(db, 'bookings'), orderBy('date', 'asc'), orderBy('time', 'asc'));
        const snapshot = await getDocs(q);
        
        this.renderBookings(snapshot.docs);
    }

    renderBookings(docs) {
        const container = document.getElementById('bookingsTableBody');
        if (!container) return;

        container.innerHTML = docs.map(doc => {
            const booking = doc.data();
            return `
                <tr>
                    <td>${booking.name}</td>
                    <td>${booking.date}</td>
                    <td>${booking.time}</td>
                    <td>${booking.packageName}</td>
                    <td><span class="status-badge ${booking.status}">${booking.status}</span></td>
                    <td>
                        <button onclick="viewBooking('${doc.id}')" class="btn-icon"><i class="fas fa-eye"></i></button>
                        <button onclick="updateBookingStatus('${doc.id}')" class="btn-icon"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteBooking('${doc.id}')" class="btn-icon"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async createBookingSlot(date, timeSlots) {
        for (const slot of timeSlots) {
            await addDoc(collection(db, 'available_slots'), {
                date: date,
                time: slot,
                isBooked: false,
                createdAt: serverTimestamp()
            });
        }
    }

    async deleteBooking(bookingId) {
        if (confirm('Cancel this booking?')) {
            await deleteDoc(doc(db, 'bookings', bookingId));
            this.loadBookings();
        }
    }
}

// ==================== PACKAGES MANAGEMENT (CRUD) ====================
class PackagesManager {
    constructor() {
        this.loadPackages();
        this.setupPackageForm();
    }

    async loadPackages() {
        const container = document.getElementById('packagesTableBody');
        if (!container) return;

        const q = query(collection(db, 'packages'));
        const snapshot = await getDocs(q);
        
        container.innerHTML = snapshot.docs.map(doc => {
            const pkg = doc.data();
            return `
                <tr>
                    <td>${pkg.name}</td>
                    <td>LKR ${pkg.price.toLocaleString()}</td>
                    <td>${pkg.category || 'General'}</td>
                    <td><span class="status-badge ${pkg.active ? 'active' : 'inactive'}">${pkg.active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button onclick="editPackage('${doc.id}')" class="btn-icon"><i class="fas fa-edit"></i></button>
                        <button onclick="togglePackage('${doc.id}', ${!pkg.active})" class="btn-icon"><i class="fas fa-power-off"></i></button>
                        <button onclick="deletePackage('${doc.id}')" class="btn-icon"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    setupPackageForm() {
        const form = document.getElementById('packageForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const packageData = {
                name: document.getElementById('packageName').value,
                price: parseFloat(document.getElementById('packagePrice').value),
                category: document.getElementById('packageCategory').value,
                features: document.getElementById('packageFeatures').value.split('\n'),
                description: document.getElementById('packageDescription').value,
                active: true,
                createdAt: serverTimestamp()
            };

            try {
                await addDoc(collection(db, 'packages'), packageData);
                alert('Package created successfully!');
                form.reset();
                this.loadPackages();
            } catch (error) {
                console.error('Error:', error);
                alert('Error creating package');
            }
        });
    }

    async updatePackage(packageId, data) {
        await updateDoc(doc(db, 'packages', packageId), data);
        this.loadPackages();
    }

    async deletePackage(packageId) {
        if (confirm('Delete this package?')) {
            await deleteDoc(doc(db, 'packages', packageId));
            this.loadPackages();
        }
    }
}

// ==================== SITE SETTINGS MANAGEMENT ====================
class SettingsManager {
    constructor() {
        this.loadSettings();
        this.setupSettingsForm();
    }

    async loadSettings() {
        const settingsDoc = await getDoc(doc(db, 'settings', 'site'));
        const settings = settingsDoc.data() || this.getDefaultSettings();
        
        // Populate form fields
        Object.keys(settings).forEach(key => {
            const element = document.getElementById(`setting_${key}`);
            if (element) {
                element.value = settings[key];
            }
        });
    }

    getDefaultSettings() {
        return {
            companyName: 'Shane Photography',
            email: 'shanercoulton@gmail.com',
            phone: '076 382 3355',
            whatsapp: '+94 76 382 3355',
            address: 'Colombo 07, Sri Lanka',
            facebook_url: 'https://facebook.com/ShanePhotoography',
            instagram_url: 'https://instagram.com/shane_photoography',
            working_hours: 'Mon-Sat: 9am-6pm',
            time_slots: '09:00,10:00,11:00,14:00,15:00,16:00'
        };
    }

    setupSettingsForm() {
        const form = document.getElementById('settingsForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const settings = {};
            const formData = new FormData(form);
            
            for (let [key, value] of formData.entries()) {
                settings[key.replace('setting_', '')] = value;
            }

            try {
                await updateDoc(doc(db, 'settings', 'site'), settings);
                alert('Settings saved successfully!');
            } catch (error) {
                console.error('Error:', error);
                alert('Error saving settings');
            }
        });
    }
}

// ==================== FACEBOOK FEED SYNC ====================
class FacebookSyncManager {
    constructor() {
        this.setupSync();
    }

    async syncPosts() {
        const accessToken = document.getElementById('fbAccessToken')?.value;
        const pageId = document.getElementById('fbPageId')?.value || 'ShanePhotoography';
        
        try {
            const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/posts?fields=id,message,full_picture,created_time,permalink_url&limit=50&access_token=${accessToken}`);
            const data = await response.json();
            
            if (data.data) {
                for (const post of data.data) {
                    await this.savePostToFirebase(post);
                }
                alert(`Synced ${data.data.length} posts successfully!`);
            }
        } catch (error) {
            console.error('Sync error:', error);
            alert('Error syncing with Facebook. Check your access token.');
        }
    }

    async savePostToFirebase(post) {
        const postRef = doc(db, 'facebook_posts', post.id);
        await updateDoc(postRef, {
            id: post.id,
            message: post.message || '',
            image_url: post.full_picture || '',
            created_time: post.created_time,
            permalink_url: post.permalink_url,
            last_synced: serverTimestamp()
        }, { merge: true });
    }

    setupSync() {
        document.getElementById('syncBtn')?.addEventListener('click', () => this.syncPosts());
    }
}

// ==================== DASHBOARD STATS ====================
class DashboardStats {
    async loadStats() {
        // Today's date
        const today = new Date().toISOString().split('T')[0];
        
        // New inquiries
        const inquiriesSnapshot = await getDocs(query(
            collection(db, 'inquiries'),
            where('status', '==', 'new')
        ));
        
        // Today's bookings
        const todayBookingsSnapshot = await getDocs(query(
            collection(db, 'bookings'),
            where('date', '==', today)
        ));
        
        // Pending bookings
        const pendingSnapshot = await getDocs(query(
            collection(db, 'bookings'),
            where('status', '==', 'pending')
        ));
        
        // Total clients (unique emails)
        const allBookings = await getDocs(collection(db, 'bookings'));
        const uniqueClients = new Set(allBookings.docs.map(d => d.data().email));
        
        // Update UI
        document.getElementById('newInquiriesCount').textContent = inquiriesSnapshot.size;
        document.getElementById('todayBookings').textContent = todayBookingsSnapshot.size;
        document.getElementById('pendingBookings').textContent = pendingSnapshot.size;
        document.getElementById('totalClients').textContent = uniqueClients.size;
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    const auth = new AdminAuth();
    
    // Initialize based on current page
    const path = window.location.pathname;
    
    if (path.includes('index.html') || path === '/admin/') {
        const stats = new DashboardStats();
        stats.loadStats();
        
        const inquiries = new InquiriesManager();
        inquiries.loadInquiries();
        
        const bookings = new BookingsManager();
        bookings.loadBookings();
    }
    
    if (path.includes('inquiries.html')) {
        const inquiries = new InquiriesManager();
        window.viewInquiry = (id) => inquiries.viewInquiry(id);
        window.updateStatus = (id) => inquiries.updateStatus(id);
        window.deleteInquiry = (id) => inquiries.deleteInquiry(id);
    }
    
    if (path.includes('bookings.html')) {
        const bookings = new BookingsManager();
        window.updateBookingStatus = (id) => bookings.updateStatus(id);
        window.deleteBooking = (id) => bookings.deleteBooking(id);
    }
    
    if (path.includes('packages.html')) {
        const packages = new PackagesManager();
        window.editPackage = (id) => packages.editPackage(id);
        window.togglePackage = (id, active) => packages.updatePackage(id, { active });
        window.deletePackage = (id) => packages.deletePackage(id);
    }
    
    if (path.includes('settings.html')) {
        const settings = new SettingsManager();
    }
    
    if (path.includes('feed-sync.html')) {
        const fbSync = new FacebookSyncManager();
    }
});
