document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Supabase to be ready (event dispatched from HTML)
    document.addEventListener('supabase:ready', async () => {
        console.log('Supabase is ready, initializing admin dashboard...');
        await initializeAdminDashboard();
    });

    // Add sidebar navigation functionality
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links and sections
            sidebarLinks.forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Show corresponding section
            const targetId = this.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
                console.log(`Activated section: ${targetId}`);
                
                // If this is the user management section, refresh the data
                if (targetId === 'user-management') {
                    loadUsersTable('', 'all');
                }
                
                // If this is the event management section, refresh the data
                if (targetId === 'event-management') {
                    loadEventRegistrationsTable('', 'all');
                    populateEventFilter();
                }
            }
        });
    });

    // Add event listeners for the fetch profiles and export users buttons
    const fetchProfilesBtn = document.getElementById('fetchProfilesBtn');
    if (fetchProfilesBtn) {
        fetchProfilesBtn.addEventListener('click', async () => {
            await displayProfilesInUI();
        });
    }

    const exportUsersBtn = document.getElementById('exportUsersBtn');
    if (exportUsersBtn) {
        exportUsersBtn.addEventListener('click', async () => {
            await exportUsersToCSV();
        });
    }

    if (!document.querySelector('.admin-section.active')) {
        const firstSection = document.querySelector('.admin-section');
        const firstLink = document.querySelector('.sidebar-nav a');
        if (firstSection && firstLink) {
            firstSection.classList.add('active');
            firstLink.classList.add('active');
        }
    }

    // All search and filter controls are now initialized in the respective
    // initialization functions (initializeUserManagementControls and 
    // initializeEventManagementControls) which are called from loadDashboardData
    
    // Dashboard data loading is handled by loadDashboardData in initializeAdminDashboard
});

async function initializeAdminDashboard() {
    const supabaseClient = window.supabaseClient;
    if (!supabaseClient) {
        console.error('Supabase client not found. Redirecting to login.');
        window.location.href = 'login.html';
        return;
    }

    try {
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

        if (sessionError) {
            console.error('Error getting session:', sessionError.message);
            window.location.href = 'login.html';
            return;
        }

        if (!session) {
            console.log('No active session. Redirecting to login.');
            window.location.href = 'login.html';
            return;
        }
        
        // Get the user's IP address via a service (optional)
        let ipAddress = 'unknown';
        try {
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            ipAddress = ipData.ip;
        } catch (ipError) {
            console.warn('Could not fetch IP address:', ipError);
        }

        // List of authorized admin user IDs
        const authorizedAdminIds = [
            '31f25dda-d747-412d-94c8-d49021f7bfc4',
            '05d85f12-21ed-46ea-ba7f-89065a9cd570',
            'd2b873f6-5f34-451e-9f8b-b9b4ea4ff819',
            'f57ecbf3-5508-401c-a9b7-e69b6da9b1fd'
        ];
        
        // Direct check for specified user IDs - these users always get admin access
        if (authorizedAdminIds.includes(session.user.id)) {
            console.log('Admin access granted based on authorized ID list');
            
            // Log successful access
            await logAdminAccessAttempt(session.user.id, session.user.email, true, ipAddress);
            
            // Update profile to ensure user role is set to admin
            try {
                await supabaseClient
                    .from('profiles')
                    .update({ role: 'admin' })
                    .eq('id', session.user.id);
            } catch (updateError) {
                console.error('Unable to update profile role, but continuing with admin access:', updateError);
            }
            
            console.log('Admin access granted.');
            // User is an authorized admin, proceed to load dashboard data
            loadDashboardData();
            return;
        }

        // If not in authorized list, check profile as fallback
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('role, membership_status') // Assuming 'role' column exists for admin
            .eq('id', session.user.id)
            .single();

        if (profileError) {
            console.error('Error fetching user profile:', profileError.message);
            // Log failed access attempt
            await logAdminAccessAttempt(session.user.id, session.user.email, false, ipAddress);
            // If profile doesn't exist or other error, deny access
            window.location.href = 'dashboard.html'; // Or a generic error page
            return;
        }

        // Check if user is an admin and has an active membership
        if (profile.role !== 'admin' || profile.membership_status !== 'active') {
            console.warn('Access denied: User is not an admin or membership is not active.');
            // Log failed access attempt
            await logAdminAccessAttempt(session.user.id, session.user.email, false, ipAddress);
            alert('Access Denied. You do not have permission to view this page.');
            window.location.href = 'dashboard.html'; // Redirect to regular dashboard
            return;
        }

        // Log successful access
        await logAdminAccessAttempt(session.user.id, session.user.email, true, ipAddress);
        
        console.log('Admin access granted via profile check.');
        // User is an admin and active, proceed to load dashboard data
        loadDashboardData();

    } catch (error) {
        console.error('Error during admin initialization:', error.message);
        // Try to log the error if possible
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                await logAdminAccessAttempt(user.id, user.email, false, 'unknown');
            }
        } catch (logError) {
            console.error('Error logging access attempt during error handling:', logError);
        }
        window.location.href = 'login.html';
    }
}

async function loadDashboardData() {
    console.log('Loading admin dashboard data...');
    
    try {
        // First make sure the user management section is visible
        const userManagementSection = document.getElementById('user-management');
        const userManagementLink = document.querySelector('.sidebar-nav a[data-target="user-management"]');
        
        if (userManagementSection && userManagementLink) {
            // Activate the user management section by default
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
            
            userManagementSection.classList.add('active');
            userManagementLink.classList.add('active');
            console.log('User management section activated');
        }
        
        // Load overview stats first
        await fetchOverviewStats();
        console.log('Overview stats loaded');
        
        // Try to load users table with explicit parameters
        console.log('Loading users table...');
        await loadUsersTable('', 'all');
        
        // Load event registrations
        console.log('Loading event registrations...');
        await loadEventRegistrationsTable('', 'all');
        
        // Populate event filter
        console.log('Populating event filter...');
        await populateEventFilter();
        
        // Add initialization of event listeners for user search and filter
        console.log('Initializing control listeners...');
        initializeUserManagementControls();
        initializeEventManagementControls();
        
        console.log('Admin dashboard data loaded successfully');
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        alert('There was an error loading the dashboard data. Please try refreshing the page.');
    }
}

async function fetchOverviewStats() {
    const supabaseClient = window.supabaseClient;
    if (!supabaseClient) return;

    try {
        // Fetch total users
        const { count: totalUsers, error: usersError } = await supabaseClient
            .from('profiles')
            .select('id', { count: 'exact', head: true });
        if (usersError) console.error('Error fetching total users:', usersError.message);
        document.getElementById('totalUsersStat').textContent = totalUsers ?? 'N/A';

        // Fetch active events (example: events that are not marked 'cancelled' or 'past')
        // This requires a more robust status system in your 'events' table
        const { count: activeEvents, error: eventsError } = await supabaseClient
            .from('events')
            .select('id', { count: 'exact', head: true })
            // .eq('status', 'active'); // Simplified for now, needs proper status in DB
        if (eventsError) console.error('Error fetching active events:', eventsError.message);
        document.getElementById('activeEventsStat').textContent = activeEvents ?? 'N/A';

        // Fetch pending verifications (users with 'pending_verification' membership_status)
        const { count: pendingVerifications, error: pendingError } = await supabaseClient
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('membership_status', 'pending_verification'); // More specific status
        if (pendingError) console.error('Error fetching pending verifications:', pendingError.message);
        document.getElementById('pendingVerificationsStat').textContent = pendingVerifications ?? 'N/A';
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const isoYesterday = yesterday.toISOString();

        const { count: recentRegistrations, error: recentRegError } = await supabaseClient
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', isoYesterday);
        if (recentRegError) console.error('Error fetching recent registrations:', recentRegError.message);
        document.getElementById('recentRegistrationsStat').textContent = recentRegistrations ?? 'N/A';

    } catch (error) {
        console.error('Error fetching overview stats:', error.message);
        // Update UI to show errors
    }
}

// Function to format date string
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (e) {
        return dateString; // Return original if formatting fails
    }
}

// Function to directly fetch all user profiles from Supabase
async function fetchUsersFromProfiles() {
    const supabaseClient = window.supabaseClient;
    if (!supabaseClient) {
        console.error('Supabase client not found');
        return null;
    }

    try {
        const { data: users, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching users:', error.message);
            return null;
        }

        console.log('Fetched user profiles:', users);
        return users;
    } catch (error) {
        console.error('Failed to fetch user profiles:', error.message);
        return null;
    }
}

// Function to output user data to the console in a more readable format
function displayUsersInConsole() {
    fetchUsersFromProfiles().then(users => {
        if (users && users.length > 0) {
            console.log('---- USER PROFILES ----');
            console.table(users, ['id', 'member_id', 'full_name', 'email', 'membership_status', 'role', 'created_at']);
            console.log(`Total users: ${users.length}`);
        } else {
            console.log('No users found or error fetching users');
        }
    });
}

// Add this to window so it can be called directly from the console
window.fetchUsers = fetchUsersFromProfiles;
window.displayUsers = displayUsersInConsole;

// Function to fetch and display user profiles in the UI
async function displayProfilesInUI() {
    const profilesDataContent = document.getElementById('profilesDataContent');
    if (!profilesDataContent) return;

    profilesDataContent.innerHTML = '<p class="text-center">Loading profiles...</p>';
    
    const users = await fetchUsersFromProfiles();
    
    if (!users || users.length === 0) {
        profilesDataContent.innerHTML = '<p class="placeholder-text">No users found or error fetching users.</p>';
        return;
    }
    
    // Create an HTML table to display the profiles
    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Member ID</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Membership Status</th>
                    <th>Role</th>
                    <th>Joined</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    users.forEach(user => {
        tableHTML += `
            <tr>
                <td>${user.member_id || 'N/A'}</td>
                <td>${user.full_name || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td><span class="status-${user.membership_status?.toLowerCase().replace(/_/g, '-')}">${user.membership_status || 'N/A'}</span></td>
                <td>${user.role || 'N/A'}</td>
                <td>${formatDate(user.created_at)}</td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
        <p>Total users: ${users.length}</p>
    `;
    
    profilesDataContent.innerHTML = tableHTML;
}

// Function to export user data to CSV
async function exportUsersToCSV() {
    const users = await fetchUsersFromProfiles();
    
    if (!users || users.length === 0) {
        alert('No users found or error fetching users.');
        return;
    }
    
    // Define the fields to include in the CSV
    const fields = [
        'member_id', 
        'full_name', 
        'email', 
        'phone', 
        'membership_status', 
        'role', 
        'created_at'
    ];
    
    // Create CSV header row
    let csv = fields.join(',') + '\n';
    
    // Add data rows
    users.forEach(user => {
        const row = fields.map(field => {
            let value = user[field] || '';
            
            // Format date fields
            if (field === 'created_at' && value) {
                value = new Date(value).toLocaleDateString();
            }
            
            // Quote values that contain commas
            if (value.toString().includes(',')) {
                value = `"${value}"`;
            }
            
            return value;
        });
        
        csv += row.join(',') + '\n';
    });
    
    // Create a blob and download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `blitz-t-club-users-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Function to log admin access attempts
async function logAdminAccessAttempt(userId, email, successful, ipAddress = 'unknown') {
    const supabaseClient = window.supabaseClient;
    if (!supabaseClient) return;

    try {
        // Get current timestamp
        const timestamp = new Date().toISOString();
        
        // Log the access attempt
        const { error } = await supabaseClient
            .from('admin_access_logs')
            .insert({
                user_id: userId,
                email: email,
                timestamp: timestamp,
                successful: successful,
                ip_address: ipAddress,
                user_agent: navigator.userAgent || 'unknown'
            });
            
        if (error) {
            // If the table doesn't exist, create it (this is a fallback and normally should be done in migrations)
            if (error.code === '42P01') { // PostgreSQL error code for undefined_table
                console.warn('Admin access logs table does not exist, attempting to create it');
                
                // Create the table
                await supabaseClient.rpc('create_admin_logs_table');
                
                // Try inserting again
                await supabaseClient
                    .from('admin_access_logs')
                    .insert({
                        user_id: userId,
                        email: email,
                        timestamp: timestamp,
                        successful: successful,
                        ip_address: ipAddress,
                        user_agent: navigator.userAgent || 'unknown'
                    });
            } else {
                console.error('Error logging admin access attempt:', error);
            }
        }
    } catch (error) {
        console.error('Failed to log admin access attempt:', error);
    }
}

// New function to set up the event listeners for the user management controls
function initializeUserManagementControls() {
    const userSearchInput = document.getElementById('userSearchInput');
    const userStatusFilter = document.getElementById('userStatusFilter');
    
    // Explicitly set the select dropdown to 'all' to match the data being displayed
    if (userStatusFilter) {
        userStatusFilter.value = 'all';
        
        userStatusFilter.addEventListener('change', () => {
            loadUsersTable(userSearchInput.value, userStatusFilter.value);
        });
    }
    
    if (userSearchInput) {
        userSearchInput.addEventListener('input', () => {
            loadUsersTable(userSearchInput.value, userStatusFilter.value);
        });
    }
}

// New function to set up the event listeners for the event management controls
function initializeEventManagementControls() {
    console.log('Initializing event management controls');
    
    // Populate event filter dropdown
    populateEventFilter();
    
    // Configure search input
    const eventSearchInput = document.getElementById('eventSearchInput');
    if (eventSearchInput) {
        eventSearchInput.addEventListener('input', debounce(function(e) {
            const searchTerm = e.target.value.trim();
            const eventFilter = document.getElementById('eventFilter').value;
            loadEventRegistrationsTable(searchTerm, eventFilter);
        }, 500));
    }
    
    // Configure event filter dropdown
    const eventFilterSelect = document.getElementById('eventFilter');
    if (eventFilterSelect) {
        eventFilterSelect.addEventListener('change', function() {
            const searchTerm = document.getElementById('eventSearchInput').value.trim();
            loadEventRegistrationsTable(searchTerm, this.value);
        });
    }
    
    // Configure create event button
    const createEventBtn = document.getElementById('createEventBtn');
    if (createEventBtn) {
        createEventBtn.addEventListener('click', function() {
            showCreateEventModal();
        });
    }
    
    console.log('Event management controls initialized successfully');
}

// Helper function to debounce input events
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Function to show create event modal
function showCreateEventModal() {
    // Create modal HTML
    const modalHTML = `
        <div id="createEventModal" class="modal" style="display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.7); backdrop-filter: blur(5px);">
            <div class="modal-content" style="background-color: #2a2f38; margin: 10% auto; padding: 20px; border-radius: 8px; width: 80%; max-width: 600px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); position: relative; animation: modalFadeIn 0.3s ease-out;">
                <span class="close" style="position: absolute; top: 15px; right: 20px; color: #aaa; font-size: 28px; font-weight: bold; cursor: pointer;">&times;</span>
                <h2 style="color: #e0e0e0; border-bottom: 1px solid #444; padding-bottom: 15px; margin-top: 0;">Create New Event</h2>
                
                <form id="createEventForm" style="margin-top: 20px;">
                    <div style="margin-bottom: 15px;">
                        <label for="eventTitle" style="display: block; margin-bottom: 8px; color: #e0e0e0;">Event Title</label>
                        <input type="text" id="eventTitle" name="eventTitle" required style="width: 100%; padding: 10px; background-color: #1e2229; border: 1px solid #444; border-radius: 4px; color: #e0e0e0;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label for="eventDate" style="display: block; margin-bottom: 8px; color: #e0e0e0;">Event Date & Time</label>
                        <input type="datetime-local" id="eventDate" name="eventDate" required style="width: 100%; padding: 10px; background-color: #1e2229; border: 1px solid #444; border-radius: 4px; color: #e0e0e0;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label for="eventLocation" style="display: block; margin-bottom: 8px; color: #e0e0e0;">Location</label>
                        <input type="text" id="eventLocation" name="eventLocation" required style="width: 100%; padding: 10px; background-color: #1e2229; border: 1px solid #444; border-radius: 4px; color: #e0e0e0;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label for="eventDescription" style="display: block; margin-bottom: 8px; color: #e0e0e0;">Description</label>
                        <textarea id="eventDescription" name="eventDescription" rows="4" style="width: 100%; padding: 10px; background-color: #1e2229; border: 1px solid #444; border-radius: 4px; color: #e0e0e0; resize: vertical;"></textarea>
                    </div>
                    
                    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                        <button type="button" id="cancelCreateEventBtn" class="btn secondary-btn" style="background-color: #6c757d; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer;">Cancel</button>
                        <button type="submit" class="btn primary-btn" style="background-color: #00e676; color: #1e2229; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; font-weight: bold;">Create Event</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Append modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    document.querySelector('#createEventModal .close').addEventListener('click', () => {
        document.getElementById('createEventModal').remove();
    });
    
    document.getElementById('cancelCreateEventBtn').addEventListener('click', () => {
        document.getElementById('createEventModal').remove();
    });
    
    // Form submission
    document.getElementById('createEventForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const eventTitle = document.getElementById('eventTitle').value.trim();
        const eventDate = document.getElementById('eventDate').value;
        const eventLocation = document.getElementById('eventLocation').value.trim();
        const eventDescription = document.getElementById('eventDescription').value.trim();
        
        try {
            const { data, error } = await window.supabaseClient
                .from('events')
                .insert({
                    title: eventTitle,
                    date: eventDate,
                    location: eventLocation,
                    description: eventDescription,
                    created_at: new Date().toISOString()
                });
            
            if (error) throw error;
            
            alert('Event created successfully!');
            document.getElementById('createEventModal').remove();
            
            // Refresh the event filter and table
            populateEventFilter();
            loadEventRegistrationsTable();
            
        } catch (error) {
            console.error('Error creating event:', error);
            alert('Failed to create event: ' + error.message);
        }
    });
}

// Add the missing loadUsersTable function
async function loadUsersTable(searchTerm = '', statusFilter = 'all') {
    const supabaseClient = window.supabaseClient;
    if (!supabaseClient) {
        console.error('Supabase client is not available');
        return;
    }
    
    console.log('Loading users table with:', { searchTerm, statusFilter });
    
    const usersTableBody = document.getElementById('usersTableBody');
    if (!usersTableBody) {
        console.error('Could not find usersTableBody element');
        return;
    }
    
    usersTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Loading users...</td></tr>';

    try {
        let query = supabaseClient
            .from('profiles')
            .select('member_id, full_name, email, phone, membership_status, role, created_at, id')
            .order('created_at', { ascending: false });

        if (searchTerm) {
            query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,member_id.ilike.%${searchTerm}%`);
        }
        
        if (statusFilter !== 'all') {
            query = query.eq('membership_status', statusFilter);
        }

        console.log('Executing Supabase query for users');
        const { data: users, error } = await query;
        
        if (error) {
            console.error('Error fetching users:', error);
            usersTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Error loading users: ${error.message}</td></tr>`;
            return;
        }

        console.log(`Retrieved ${users ? users.length : 0} users from database`);
        
        if (!users || users.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No users found.</td></tr>';
            return;
        }

        // Build the table HTML
        const tableHtml = users.map(user => `
            <tr>
                <td>${user.member_id || 'N/A'}</td>
                <td>${user.full_name || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.phone || 'N/A'}</td>
                <td><span class="status-${user.membership_status?.toLowerCase().replace(/_/g, '-')}">${user.membership_status || 'N/A'}</span></td>
                <td>${user.role || 'N/A'}</td>
                <td>${formatDate(user.created_at)}</td>
                <td>
                    <button class="action-btn view-btn" title="View Details" data-user-id="${user.id}"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit-btn" title="Edit User" data-user-id="${user.id}"><i class="fas fa-edit"></i></button>
                    ${user.membership_status === 'pending_approval' || user.membership_status === 'pending_verification' ? 
                        `<button class="action-btn approve-btn" title="Approve User" data-user-id="${user.id}"><i class="fas fa-check-circle"></i></button>` : ''}
                    ${user.membership_status !== 'suspended' ? 
                        `<button class="action-btn suspend-btn" title="Suspend User" data-user-id="${user.id}"><i class="fas fa-user-slash"></i></button>` : 
                        `<button class="action-btn approve-btn" title="Unsuspend User" data-user-id="${user.id}"><i class="fas fa-user-check"></i></button>`}
                    <button class="action-btn delete-btn" title="Delete User" data-user-id="${user.id}"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `).join('');

        // Update the table content
        usersTableBody.innerHTML = tableHtml;
        console.log('Users table HTML updated successfully');

        // Add event listeners for action buttons
        addUserActionListeners();

    } catch (error) {
        console.error('Failed to load users table:', error);
        usersTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Failed to load users: ${error.message}</td></tr>`;
    }
}

// Add the missing loadEventRegistrationsTable function
async function loadEventRegistrationsTable(searchTerm = '', eventFilter = 'all') {
    const supabaseClient = window.supabaseClient;
    if (!supabaseClient) {
        console.error('Supabase client is not available');
        return;
    }
    
    console.log('Loading event registrations table with:', { searchTerm, eventFilter });
    
    const registrationsTableBody = document.getElementById('eventRegistrationsTableBody');
    if (!registrationsTableBody) {
        console.error('Could not find eventRegistrationsTableBody element');
        return;
    }
    
    registrationsTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Loading event registrations...</td></tr>';

    try {
        // Start with a simpler query for basic event registration data
        let query = supabaseClient
            .from('event_registrations')
            .select('id, event_id, user_id, vehicle_model, registered_at, cancelled_at')
            .is('cancelled_at', null) // Only show registrations that are not cancelled
            .order('registered_at', { ascending: false });
        
        if (eventFilter !== 'all') {
            query = query.eq('event_id', eventFilter);
        }
        
        console.log('Executing Supabase query for event registrations');
        const { data: basicRegistrations, error: regError } = await query;
        
        if (regError) {
            console.error('Error fetching event registrations:', regError);
            console.error('Details:', JSON.stringify(regError));
            registrationsTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Error loading event registrations: ${regError.message || 'Unknown error'}</td></tr>`;
            return;
        }
        
        if (!basicRegistrations || basicRegistrations.length === 0) {
            registrationsTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No active event registrations found.</td></tr>';
            return;
        }
        
        console.log(`Retrieved ${basicRegistrations.length} active registrations from database`);
        
        // Get unique event IDs and user IDs for additional queries
        const eventIds = [...new Set(basicRegistrations.map(reg => reg.event_id))];
        const userIds = [...new Set(basicRegistrations.map(reg => reg.user_id))];
        
        // Fetch events data
        const { data: events, error: eventsError } = await supabaseClient
            .from('events')
            .select('id, title, date, location')
            .in('id', eventIds);
            
        if (eventsError) {
            console.error('Error fetching events:', eventsError);
        }
        
        // Create events lookup map
        const eventsMap = {};
        if (events) {
            events.forEach(event => {
                eventsMap[event.id] = event;
            });
        }
        
        // Fetch profiles data
        const { data: profiles, error: profilesError } = await supabaseClient
            .from('profiles')
            .select('id, full_name, email, phone, member_id, membership_status')
            .in('id', userIds);
            
        if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
        }
        
        // Create profiles lookup map
        const profilesMap = {};
        if (profiles) {
            profiles.forEach(profile => {
                profilesMap[profile.id] = profile;
            });
        }
        
        // Filter results if search term is provided
        let filteredRegistrations = basicRegistrations;
        if (searchTerm && searchTerm.trim() !== '') {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filteredRegistrations = basicRegistrations.filter(reg => {
                const event = eventsMap[reg.event_id] || {};
                const profile = profilesMap[reg.user_id] || {};
                
                return (
                    (event.title && event.title.toLowerCase().includes(lowerSearchTerm)) ||
                    (profile.full_name && profile.full_name.toLowerCase().includes(lowerSearchTerm)) ||
                    (profile.email && profile.email.toLowerCase().includes(lowerSearchTerm)) ||
                    (profile.member_id && profile.member_id.toLowerCase().includes(lowerSearchTerm)) ||
                    (reg.vehicle_model && reg.vehicle_model.toLowerCase().includes(lowerSearchTerm))
                );
            });
        }
        
        console.log(`After filtering, displaying ${filteredRegistrations.length} active registrations`);
        
        // Build complete registration data objects
        const completeRegistrations = filteredRegistrations.map(reg => {
            return {
                ...reg,
                events: eventsMap[reg.event_id] || {},
                profiles: profilesMap[reg.user_id] || {}
            };
        });
        
        // Build the table HTML
        const tableHtml = completeRegistrations.map(reg => {
            const eventName = reg.events?.title || 'Unknown Event';
            const eventDate = reg.events?.date ? formatDate(reg.events.date) : 'N/A';
            const eventLocation = reg.events?.location || 'N/A';
            
            const userName = reg.profiles?.full_name || 'Unknown User';
            const userEmail = reg.profiles?.email || 'N/A';
            const userPhone = reg.profiles?.phone || 'N/A';
            const memberId = reg.profiles?.member_id || 'N/A';
            const membershipStatus = reg.profiles?.membership_status || 'N/A';
            
            const vehicleModel = reg.vehicle_model || 'N/A';
            
            return `
                <tr>
                    <td>
                        <strong>${eventName}</strong>
                        <div style="font-size: 0.8em; color: #999;">${eventDate}</div>
                    </td>
                    <td>${userName}</td>
                    <td>
                        <div>${userEmail}</div>
                        <div style="font-size: 0.8em;">${userPhone}</div>
                    </td>
                    <td>${memberId}</td>
                    <td>${vehicleModel}</td>
                    <td>${formatDate(reg.registered_at)}</td>
                    <td>
                        <span class="status-registered">Registered</span>
                        <div style="font-size: 0.8em; margin-top: 3px;">
                            <span class="status-${membershipStatus.toLowerCase()}">${membershipStatus}</span>
                        </div>
                    </td>
                    <td>
                        <button class="action-btn view-btn" title="View Registration" data-reg-id="${reg.id}" data-user-id="${reg.user_id}"><i class="fas fa-eye"></i></button>
                        <button class="action-btn delete-btn" title="Cancel Registration" data-reg-id="${reg.id}"><i class="fas fa-calendar-times"></i></button>
                    </td>
                </tr>
            `;
        }).join('');

        // Update the table content
        registrationsTableBody.innerHTML = tableHtml.length > 0 ? 
            tableHtml : 
            '<tr><td colspan="8" style="text-align:center;">No matching active registrations found.</td></tr>';
            
        console.log('Event registrations table HTML updated successfully');

        // Add event listeners for action buttons
        addEventRegistrationActionListeners();

    } catch (error) {
        console.error('Failed to load event registrations table:', error);
        registrationsTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Failed to load event registrations: ${error.message || 'Unknown error'}</td></tr>`;
    }
}

// Add the missing populateEventFilter function
async function populateEventFilter() {
    const supabaseClient = window.supabaseClient;
    if (!supabaseClient) {
        console.error('Supabase client is not available');
        return;
    }
    
    console.log('Populating event filter dropdown');
    
    const eventFilterSelect = document.getElementById('eventFilter');
    if (!eventFilterSelect) {
        console.error('Could not find eventFilter select element');
        return;
    }

    try {
        const { data: events, error } = await supabaseClient
            .from('events')
            .select('id, title')
            .order('title', { ascending: true });

        if (error) {
            console.error('Error fetching events for filter:', error);
            return;
        }
        
        console.log(`Retrieved ${events ? events.length : 0} events for filter`);

        // Make sure we don't add duplicate options if function is called multiple times
        const existingOptions = Array.from(eventFilterSelect.querySelectorAll('option:not([value="all"])'))
            .map(option => option.value);
            
        events.forEach(event => {
            // Skip if this event option already exists
            if (existingOptions.includes(event.id)) return;
            
            const option = document.createElement('option');
            option.value = event.id;
            option.textContent = event.title;
            eventFilterSelect.appendChild(option);
        });
        
        console.log('Event filter dropdown populated successfully');

    } catch (error) {
        console.error('Failed to populate event filter:', error);
    }
}

// Add the missing action button listeners
function addUserActionListeners() {
    console.log('Adding event listeners to user action buttons');
    
    // View user details
    document.querySelectorAll('.action-btn.view-btn').forEach(btn => {
        if (btn.closest('#usersTableBody')) {
            btn.addEventListener('click', () => {
                const userId = btn.getAttribute('data-user-id');
                console.log('View user clicked for ID:', userId);
                alert('View user functionality will be implemented soon. User ID: ' + userId);
            });
        }
    });
    
    // Edit user
    document.querySelectorAll('.action-btn.edit-btn').forEach(btn => {
        if (btn.closest('#usersTableBody')) {
            btn.addEventListener('click', () => {
                const userId = btn.getAttribute('data-user-id');
                console.log('Edit user clicked for ID:', userId);
                alert('Edit user functionality will be implemented soon. User ID: ' + userId);
            });
        }
    });
    
    // Approve user
    document.querySelectorAll('.action-btn.approve-btn').forEach(btn => {
        if (btn.closest('#usersTableBody')) {
            btn.addEventListener('click', () => {
                const userId = btn.getAttribute('data-user-id');
                console.log('Approve user clicked for ID:', userId);
                approveUser(userId);
            });
        }
    });
    
    // Suspend user
    document.querySelectorAll('.action-btn.suspend-btn').forEach(btn => {
        if (btn.closest('#usersTableBody')) {
            btn.addEventListener('click', () => {
                const userId = btn.getAttribute('data-user-id');
                console.log('Suspend user clicked for ID:', userId);
                suspendUser(userId);
            });
        }
    });
    
    // Delete user
    document.querySelectorAll('.action-btn.delete-btn').forEach(btn => {
        if (btn.closest('#usersTableBody')) {
            btn.addEventListener('click', () => {
                const userId = btn.getAttribute('data-user-id');
                console.log('Delete user clicked for ID:', userId);
                deleteUser(userId);
            });
        }
    });
    
    console.log('User action listeners added successfully');
}

// Add the missing event registration action listeners
function addEventRegistrationActionListeners() {
    console.log('Adding event listeners to event registration action buttons');
    
    // View registration details
    document.querySelectorAll('#eventRegistrationsTableBody .action-btn.view-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const regId = btn.getAttribute('data-reg-id');
            const userId = btn.getAttribute('data-user-id');
            console.log('View registration clicked for ID:', regId, 'User ID:', userId);
            
            try {
                // Fetch the basic registration data first
                const { data: regData, error: regError } = await window.supabaseClient
                    .from('event_registrations')
                    .select('*')
                    .eq('id', regId)
                    .single();
                
                if (regError) throw regError;
                if (!regData) {
                    alert('Registration not found.');
                    return;
                }
                
                // Fetch the event details
                const { data: eventData, error: eventError } = await window.supabaseClient
                    .from('events')
                    .select('*')
                    .eq('id', regData.event_id)
                    .single();
                    
                if (eventError) {
                    console.error('Error fetching event data:', eventError);
                }
                
                // Fetch the user profile
                const { data: profileData, error: profileError } = await window.supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', regData.user_id)
                    .single();
                    
                if (profileError) {
                    console.error('Error fetching profile data:', profileError);
                }
                
                // Build complete registration object
                const registration = {
                    ...regData,
                    events: eventData || {},
                    profiles: profileData || {}
                };
                
                // Create and show a modal with the registration details
                const modalHTML = `
                    <div id="registrationDetailsModal" class="modal" style="display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.7); backdrop-filter: blur(5px);">
                        <div class="modal-content" style="background-color: #2a2f38; margin: 10% auto; padding: 20px; border-radius: 8px; width: 80%; max-width: 800px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); position: relative; animation: modalFadeIn 0.3s ease-out;">
                            <span class="close" style="position: absolute; top: 15px; right: 20px; color: #aaa; font-size: 28px; font-weight: bold; cursor: pointer;">&times;</span>
                            <h2 style="color: #e0e0e0; border-bottom: 1px solid #444; padding-bottom: 15px; margin-top: 0;">Registration Details</h2>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                                <div style="background-color: #1e2229; padding: 15px; border-radius: 8px;">
                                    <h3 style="color: #00e676; margin-top: 0;">Event Information</h3>
                                    <p><strong>Event Name:</strong> ${registration.events?.title || 'N/A'}</p>
                                    <p><strong>Date:</strong> ${registration.events?.date ? formatDate(registration.events.date) : 'N/A'}</p>
                                    <p><strong>Location:</strong> ${registration.events?.location || 'N/A'}</p>
                                    <p><strong>Vehicle Model:</strong> ${registration.vehicle_model || 'N/A'}</p>
                                    <p><strong>Registration Status:</strong> <span class="status-${registration.cancelled_at ? 'cancelled' : 'registered'}" style="padding: 5px 10px; border-radius: 4px;">${registration.cancelled_at ? 'Cancelled' : 'Registered'}</span></p>
                                    <p><strong>Registration Date:</strong> ${formatDate(registration.registered_at)}</p>
                                    ${registration.cancelled_at ? `<p><strong>Cancellation Date:</strong> ${formatDate(registration.cancelled_at)}</p>` : ''}
                                </div>
                                
                                <div style="background-color: #1e2229; padding: 15px; border-radius: 8px;">
                                    <h3 style="color: #00e676; margin-top: 0;">User Information</h3>
                                    <p><strong>Name:</strong> ${registration.profiles?.full_name || 'N/A'}</p>
                                    <p><strong>Member ID:</strong> ${registration.profiles?.member_id || 'N/A'}</p>
                                    <p><strong>Email:</strong> ${registration.profiles?.email || 'N/A'}</p>
                                    <p><strong>Phone:</strong> ${registration.profiles?.phone || 'N/A'}</p>
                                    <p><strong>Membership Status:</strong> <span class="status-${registration.profiles?.membership_status || 'unknown'}" style="padding: 5px 10px; border-radius: 4px;">${registration.profiles?.membership_status || 'Unknown'}</span></p>
                                    <p><strong>Tesla Models:</strong> ${Array.isArray(registration.profiles?.car_models) ? registration.profiles.car_models.join(', ') : 'N/A'}</p>
                                    <p><strong>City:</strong> ${registration.profiles?.city || 'N/A'}</p>
                                </div>
                            </div>
                            
                            <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                                ${!registration.cancelled_at ? 
                                    `<button id="cancelRegistrationBtn" class="btn danger-btn" style="background-color: #dc3545; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer;">
                                        <i class="fas fa-calendar-times"></i> Cancel Registration
                                    </button>` : ''
                                }
                                <button id="closeModalBtn" class="btn secondary-btn" style="background-color: #6c757d; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer;">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                // Append modal to body
                document.body.insertAdjacentHTML('beforeend', modalHTML);
                
                // Add event listeners to modal buttons
                document.querySelector('#registrationDetailsModal .close').addEventListener('click', () => {
                    document.getElementById('registrationDetailsModal').remove();
                });
                
                document.getElementById('closeModalBtn').addEventListener('click', () => {
                    document.getElementById('registrationDetailsModal').remove();
                });
                
                const cancelBtn = document.getElementById('cancelRegistrationBtn');
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        document.getElementById('registrationDetailsModal').remove();
                        if (confirm('Are you sure you want to cancel this registration?')) {
                            cancelRegistration(regId);
                        }
                    });
                }
                
                // Add animation style
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes modalFadeIn {
                        from { opacity: 0; transform: translateY(-20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `;
                document.head.appendChild(style);
                
            } catch (error) {
                console.error('Error fetching registration details:', error);
                alert('Failed to load registration details: ' + (error.message || 'Unknown error'));
            }
        });
    });
    
    // Cancel registration
    document.querySelectorAll('#eventRegistrationsTableBody .action-btn.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const regId = btn.getAttribute('data-reg-id');
            console.log('Cancel registration clicked for ID:', regId);
            if (confirm('Are you sure you want to cancel this registration?')) {
                cancelRegistration(regId);
            }
        });
    });
    
    console.log('Event registration action listeners added successfully');
}

// Add basic implementations for action functions
async function approveUser(userId) {
    const supabaseClient = window.supabaseClient;
    if (!supabaseClient || !userId) return;
    
    if (!confirm('Are you sure you want to approve this user?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('profiles')
            .update({
                membership_status: 'active',
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);
        
        if (error) throw error;
        
        alert('User approved successfully');
        
        // Reload the users table to reflect the changes
        loadUsersTable();
        
    } catch (error) {
        console.error('Error approving user:', error);
        alert('Failed to approve user: ' + error.message);
    }
}

async function suspendUser(userId) {
    const supabaseClient = window.supabaseClient;
    if (!supabaseClient || !userId) return;
    
    if (!confirm('Are you sure you want to suspend this user?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('profiles')
            .update({
                membership_status: 'suspended',
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);
        
        if (error) throw error;
        
        alert('User suspended successfully');
        
        // Reload the users table to reflect the changes
        loadUsersTable();
        
    } catch (error) {
        console.error('Error suspending user:', error);
        alert('Failed to suspend user: ' + error.message);
    }
}

async function deleteUser(userId) {
    const supabaseClient = window.supabaseClient;
    if (!supabaseClient || !userId) return;
    
    if (!confirm('Are you sure you want to DELETE this user? This action cannot be undone.')) return;
    
    try {
        // Soft delete - update status to deleted
        const { error } = await supabaseClient
            .from('profiles')
            .update({
                membership_status: 'deleted',
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);
        
        if (error) throw error;
        
        alert('User deleted successfully');
        
        // Reload the users table to reflect the changes
        loadUsersTable();
        
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user: ' + error.message);
    }
}

async function cancelRegistration(regId) {
    const supabaseClient = window.supabaseClient;
    if (!supabaseClient || !regId) {
        console.error('Cannot cancel registration: Supabase client not available or registration ID not provided');
        alert('Error: Cannot cancel registration at this time');
        return;
    }
    
    try {
        console.log('Attempting to cancel registration with ID:', regId);
        
        // First check if the registration exists and is not already cancelled
        const { data: checkReg, error: checkError } = await supabaseClient
            .from('event_registrations')
            .select('id, cancelled_at')
            .eq('id', regId)
            .single();
            
        if (checkError) {
            console.error('Error checking registration status:', checkError);
            throw checkError;
        }
        
        if (!checkReg) {
            throw new Error('Registration not found');
        }
        
        if (checkReg.cancelled_at) {
            alert('This registration is already cancelled.');
            return;
        }
        
        // Proceed with cancellation
        const { error } = await supabaseClient
            .from('event_registrations')
            .update({
                cancelled_at: new Date().toISOString()
            })
            .eq('id', regId);
        
        if (error) {
            console.error('Error cancelling registration:', error);
            throw error;
        }
        
        console.log('Registration cancelled successfully');
        alert('Registration cancelled successfully');
        
        // Reload the registrations table to reflect the changes
        const searchTerm = document.getElementById('eventSearchInput')?.value || '';
        const eventFilter = document.getElementById('eventFilter')?.value || 'all';
        await loadEventRegistrationsTable(searchTerm, eventFilter);
        
    } catch (error) {
        console.error('Error in cancelRegistration:', error);
        alert('Failed to cancel registration: ' + (error.message || 'Unknown error'));
    }
} 