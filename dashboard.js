document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Initialize dashboard
    initializeDashboard(token);
});

async function initializeDashboard(token) {
    try {
        // Fetch dashboard data
        const response = await fetch('http://localhost:3000/api/dashboard/data', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load dashboard data');
        }

        const data = await response.json();
        
        // Update user info
        updateUserInfo(data.memberDetails);
        
        // Update upcoming events
        updateUpcomingEvents(data.events);
        
        // Update recent activity
        updateRecentActivity(data.activities);

        // Setup event handlers
        setupEventHandlers();

    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showError('Failed to load dashboard data');
        
        if (error.message === 'Invalid token') {
            handleLogout();
        }
    }
}

function updateUserInfo(memberDetails) {
    document.getElementById('userFullName').textContent = memberDetails.full_name;
    
    const membershipStatus = document.getElementById('membershipStatus');
    membershipStatus.textContent = memberDetails.membership_status.toUpperCase();
    membershipStatus.className = `status-${memberDetails.membership_status.toLowerCase()}`;

    // Update profile image if available
    if (memberDetails.profile_image) {
        const profileImage = document.createElement('img');
        profileImage.src = memberDetails.profile_image;
        profileImage.alt = 'Profile Picture';
        profileImage.className = 'profile-image';
        document.querySelector('.user-welcome').prepend(profileImage);
    }
}

function updateUpcomingEvents(events) {
    const eventsList = document.getElementById('upcomingEventsList');
    
    if (!events || events.length === 0) {
        eventsList.innerHTML = `
            <div class="no-data">
                <i class="fas fa-calendar-times"></i>
                <p>No upcoming events</p>
            </div>
        `;
        return;
    }

    eventsList.innerHTML = events.map(event => `
        <div class="event-item">
            <div class="event-date">
                <span class="date">${formatDate(event.event_date, 'DD')}</span>
                <span class="month">${formatDate(event.event_date, 'MMM')}</span>
            </div>
            <div class="event-details">
                <h3>${event.title}</h3>
                <p>${event.description}</p>
                <div class="event-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${event.location}</span>
                    <span><i class="fas fa-clock"></i> ${formatTime(event.event_date)}</span>
                </div>
            </div>
            <button class="btn register-btn" data-event-id="${event.id}">
                Register
            </button>
        </div>
    `).join('');
}

function updateRecentActivity(activities) {
    const activityList = document.getElementById('recentActivityList');
    
    if (!activities || activities.length === 0) {
        activityList.innerHTML = `
            <div class="no-data">
                <i class="fas fa-history"></i>
                <p>No recent activity</p>
            </div>
        `;
        return;
    }

    activityList.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <i class="${getActivityIcon(activity.activity_type)}"></i>
            <div class="activity-details">
                <p>${formatActivityMessage(activity)}</p>
                <small>${formatTimeAgo(activity.activity_date)}</small>
            </div>
        </div>
    `).join('');
}

function setupEventHandlers() {
    // Edit Profile Button
    document.getElementById('editProfileBtn').addEventListener('click', () => {
        window.location.href = '/edit-profile.html';
    });

    // Membership Card Button
    document.getElementById('membershipCardBtn').addEventListener('click', () => {
        showMembershipCard();
    });

    // Event Registration Buttons
    document.querySelectorAll('.register-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const eventId = e.target.dataset.eventId;
            await registerForEvent(eventId);
        });
    });

    // Logout Buttons
    ['logoutBtn', 'footerLogoutBtn'].forEach(btnId => {
        const button = document.getElementById(btnId);
        if (button) {
            button.addEventListener('click', handleLogout);
        }
    });
}

// Helper Functions
function formatDate(dateString, format) {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (format === 'DD') {
        return date.getDate().toString().padStart(2, '0');
    }
    if (format === 'MMM') {
        return months[date.getMonth()];
    }
    return dateString;
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
    });
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

function getActivityIcon(activityType) {
    const icons = {
        'login': 'fas fa-sign-in-alt',
        'email_verified': 'fas fa-check-circle',
        'profile_updated': 'fas fa-user-edit',
        'event_registered': 'fas fa-calendar-check',
        'default': 'fas fa-circle'
    };
    return icons[activityType] || icons.default;
}

function formatActivityMessage(activity) {
    const messages = {
        'login': 'Logged in successfully',
        'email_verified': 'Email address verified',
        'profile_updated': 'Updated profile information',
        'event_registered': 'Registered for an event',
        'default': 'Performed an action'
    };
    return messages[activity.activity_type] || messages.default;
}

async function registerForEvent(eventId) {
    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const response = await fetch('/api/events/register', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ eventId })
        });

        if (!response.ok) {
            throw new Error('Failed to register for event');
        }

        showSuccess('Successfully registered for event');
        // Refresh dashboard data
        initializeDashboard(token);

    } catch (error) {
        console.error('Event registration error:', error);
        showError('Failed to register for event');
    }
}

function showMembershipCard() {
    // Implement membership card display logic
    console.log('Membership card view to be implemented');
}

function handleLogout(e) {
    if (e) e.preventDefault();
    
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    window.location.href = '/login.html';
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-error';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    showMessage(errorDiv);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    showMessage(successDiv);
}

function showMessage(element) {
    const container = document.querySelector('.dashboard-container');
    container.insertBefore(element, container.firstChild);
    setTimeout(() => element.remove(), 5000);
} 