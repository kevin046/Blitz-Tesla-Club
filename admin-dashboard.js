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
    console.log('Starting initialization of admin dashboard...');
    
    // Check if Supabase client is available
    let supabaseClient = window.supabaseClient;
    
    // If not available, try to initialize it
    if (!supabaseClient) {
        console.log('Supabase client not found in window object, attempting to initialize...');
        try {
            // Initialize Supabase client with your project credentials
            const SUPABASE_URL = 'https://qhkcrrphsjpytdfqfamq.supabase.co';
            const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoa2NycnBoc2pweXRkZnFmYW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzMjQ4NzgsImV4cCI6MjA0OTkwMDg3OH0.S9JT_WmCWYMvSixRq1RrB1UlqXm6fix_riLFYCR3JOI';
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            
            if (supabaseClient) {
                window.supabaseClient = supabaseClient; // Make it available globally
                console.log('Successfully initialized Supabase client');
            } else {
                console.error('Failed to initialize Supabase client');
                alert('Failed to initialize Supabase client. Please refresh the page and try again.');
                return;
            }
        } catch (error) {
            console.error('Error initializing Supabase client:', error);
            alert('Error initializing Supabase client. Please refresh the page and try again.');
            return;
        }
    } else {
        console.log('Using existing Supabase client from window object');
    }

    try {
        // Verify session
        console.log('Verifying user session...');
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
            console.log('Fetching user IP address...');
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            if (!ipResponse.ok) {
                throw new Error(`HTTP error! Status: ${ipResponse.status}`);
            }
            const ipData = await ipResponse.json();
            ipAddress = ipData.ip;
            console.log('User IP address:', ipAddress);
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
        
        console.log('Checking admin authorization for user ID:', session.user.id);
        
        // Direct check for specified user IDs - these users always get admin access
        if (authorizedAdminIds.includes(session.user.id)) {
            console.log('Admin access granted based on authorized ID list');
            
            // Log successful access
            await logAdminAccessAttempt(session.user.id, session.user.email, true, ipAddress);
            
            // Update profile to ensure user role is set to admin
            try {
                const { error: updateError } = await supabaseClient
                    .from('profiles')
                    .update({ role: 'admin' })
                    .eq('id', session.user.id);
                    
                if (updateError) {
                    console.error('Unable to update profile role:', updateError);
                    // Continue with admin access even if update fails
                } else {
                    console.log('Updated user profile role to admin');
                }
            } catch (updateError) {
                console.error('Exception when updating profile role:', updateError);
                // Continue with admin access even if update fails
            }
            
            console.log('Admin access granted. Loading dashboard data...');
            await loadDashboardData();
            return;
        }

        // If not in authorized list, check profile as fallback
        console.log('User not in authorized admin ID list, checking profile...');
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('role, membership_status') // Assuming 'role' column exists for admin
            .eq('id', session.user.id)
            .single();

        if (profileError) {
            console.error('Error fetching user profile:', profileError.message);
            // Log failed access attempt
            await logAdminAccessAttempt(session.user.id, session.user.email, false, ipAddress);
            alert('Error fetching your profile information. Redirecting to dashboard.');
            window.location.href = 'dashboard.html'; // Or a generic error page
            return;
        }

        console.log('Profile data:', profile);
        
        // Check if user is an admin and has an active membership
        if (profile.role !== 'admin' || profile.membership_status !== 'active') {
            console.warn(`Access denied: User is not an admin or membership is not active. Role: ${profile.role}, Status: ${profile.membership_status}`);
            // Log failed access attempt
            await logAdminAccessAttempt(session.user.id, session.user.email, false, ipAddress);
            alert('Access Denied. You do not have permission to view this page.');
            window.location.href = 'dashboard.html'; // Redirect to regular dashboard
            return;
        }

        // Log successful access
        await logAdminAccessAttempt(session.user.id, session.user.email, true, ipAddress);
        
        console.log('Admin access granted via profile check. Loading dashboard data...');
        await loadDashboardData();

    } catch (error) {
        console.error('Error during admin initialization:', error);
        alert('Error initializing admin dashboard: ' + (error.message || 'Unknown error'));
        
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

/**
 * Load dashboard data from Supabase
 */
async function loadDashboardData() {
    console.log('Starting to load dashboard data...');
    
    try {
        // Initialize dashboard menus and sidebar
        console.log('Initializing dashboard menus and sidebar...');
        initializeDashboardMenus();
        
        // Make sure the dashboard overview section is visible
        const dashboardOverview = document.getElementById('dashboard-overview');
        if (dashboardOverview) {
            console.log('Making dashboard overview visible...');
            dashboardOverview.classList.add('active');
            dashboardOverview.style.display = 'block';
        } else {
            console.error('Dashboard overview section not found in DOM');
        }
        
        // Fetch and load overview statistics
        console.log('Loading overview statistics...');
        await fetchOverviewStats();
        
        // Load recent activity section
        console.log('Loading recent activity section...');
        await loadRecentActivitySection();
        
        // Load users table (will be visible if user-management is active)
        console.log('Loading users table...');
        await loadUsersTable();
        
        // Set up the registration status filter to "active" by default
        const registrationStatusFilter = document.getElementById('registration-status-filter');
        if (registrationStatusFilter) {
            console.log('Setting registration status filter to Active Registrations Only');
            registrationStatusFilter.value = 'active';
        } else {
            console.warn('Registration status filter not found in DOM');
        }
        
        // Load event registrations with active filter
        console.log('Loading event registrations with active filter...');
        await loadEventRegistrationsTable('active');
        
        // Populate the event filter dropdown
        console.log('Populating event filter...');
        await populateEventFilter();
        
        // Initialize control listeners
        console.log('Initializing control listeners...');
        initializeUserManagementControls();
        initializeEventManagementControls();
        
        // Add event listeners for table search inputs
        console.log('Setting up table search functionality...');
        setupTableSearch();
        
        console.log('Dashboard data loaded successfully!');
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        alert('There was an error loading the dashboard data. Please check the console for details.');
    }
}

/**
 * Set up table search functionality
 */
function setupTableSearch() {
    console.log('Setting up table search functionality...');
    
    try {
        // Set up user table search
        const userSearchInput = document.getElementById('user-search');
        if (userSearchInput) {
            console.log('Setting up user table search input...');
            userSearchInput.addEventListener('input', function() {
                loadUsersTable(this.value);
            });
        } else {
            console.warn('User search input not found in DOM');
        }
        
        // Set up event filter change event
        const eventFilter = document.getElementById('event-filter');
        if (eventFilter) {
            console.log('Setting up event filter dropdown...');
            eventFilter.addEventListener('change', function() {
                const registrationStatusFilter = document.getElementById('registration-status-filter');
                const statusFilter = registrationStatusFilter ? registrationStatusFilter.value : 'active';
                loadEventRegistrationsTable(statusFilter, this.value);
            });
        } else {
            console.warn('Event filter dropdown not found in DOM');
        }
        
        // Set up registration status filter
        const registrationStatusFilter = document.getElementById('registration-status-filter');
        if (registrationStatusFilter) {
            console.log('Setting up registration status filter...');
            registrationStatusFilter.addEventListener('change', function() {
                const eventFilter = document.getElementById('event-filter');
                const selectedEvent = eventFilter ? eventFilter.value : 'all';
                loadEventRegistrationsTable(this.value, selectedEvent);
            });
        } else {
            console.warn('Registration status filter not found in DOM');
        }
        
        // Set up registration search
        const registrationSearchInput = document.getElementById('registration-search');
        if (registrationSearchInput) {
            console.log('Setting up registration search input...');
            registrationSearchInput.addEventListener('input', function() {
                const eventFilter = document.getElementById('event-filter');
                const registrationStatusFilter = document.getElementById('registration-status-filter');
                
                const selectedEvent = eventFilter ? eventFilter.value : 'all';
                const statusFilter = registrationStatusFilter ? registrationStatusFilter.value : 'active';
                
                loadEventRegistrationsTable(statusFilter, selectedEvent, this.value);
            });
        } else {
            console.warn('Registration search input not found in DOM');
        }
        
        console.log('Table search functionality setup complete!');
    } catch (error) {
        console.error('Error setting up table search:', error);
    }
}

async function fetchOverviewStats() {
    console.log('Starting fetchOverviewStats function...');
    const supabaseClient = window.supabaseClient;
    if (!supabaseClient) {
        console.error('Supabase client is not available');
        document.getElementById('totalUsersStat').innerHTML = '<span class="error-text">Supabase client unavailable</span>';
        document.getElementById('activeEventsStat').innerHTML = '<span class="error-text">Supabase client unavailable</span>';
        document.getElementById('pendingVerificationsStat').innerHTML = '<span class="error-text">Supabase client unavailable</span>';
        document.getElementById('recentRegistrationsStat').innerHTML = '<span class="error-text">Supabase client unavailable</span>';
        return;
    }

    try {
        // Ensure stats display "Loading..." while we fetch data
        document.getElementById('totalUsersStat').innerHTML = 'Loading...';
        document.getElementById('activeEventsStat').innerHTML = 'Loading...';
        document.getElementById('pendingVerificationsStat').innerHTML = 'Loading...';
        document.getElementById('recentRegistrationsStat').innerHTML = 'Loading...';

        console.log('Fetching all user profiles to calculate member ID stats...');
        // Fetch all profiles to get member IDs
        const { data: allProfiles, error: profilesError } = await supabaseClient
            .from('profiles')
            .select('id, member_id, membership_status')
            .order('created_at', { ascending: false });
        
        if (profilesError) {
            console.error('Error fetching user profiles:', profilesError.message);
            document.getElementById('totalUsersStat').innerHTML = '<span class="error-text">Error loading user data</span>';
        } else if (!allProfiles || allProfiles.length === 0) {
            console.log('No profiles found in database');
            document.getElementById('totalUsersStat').innerHTML = '<span class="stat-number">0</span>';
        } else {
            console.log(`Fetched ${allProfiles.length} profiles from database`);
            
            // Calculate total users based on highest BTC number
            let highestMemberNumber = 0;
            let validMemberIdCount = 0;
            
            allProfiles.forEach(profile => {
                if (profile.member_id && profile.member_id.startsWith('BTC')) {
                    validMemberIdCount++;
                    try {
                        // Extract the numeric part of the member ID (e.g., "BTC0001" -> "0001" -> 1)
                        const numberString = profile.member_id.replace('BTC', '');
                        const numberPart = parseInt(numberString, 10);
                        
                        if (!isNaN(numberPart) && numberPart > highestMemberNumber) {
                            highestMemberNumber = numberPart;
                        }
                    } catch (error) {
                        console.warn(`Could not parse member ID: ${profile.member_id}`, error);
                    }
                }
            });
            
            console.log(`Highest member number: ${highestMemberNumber}, Valid member IDs: ${validMemberIdCount}`);
            
            // For total users, use the highest member number
            const totalUsers = highestMemberNumber > 0 ? highestMemberNumber : allProfiles.length;
            
            // Create a status counts object for membership status breakdown
            const statusCounts = {
                active: 0,
                pending_verification: 0,
                pending_approval: 0,
                suspended: 0,
                inactive: 0
            };
            
            // Count status occurrences from the profiles we already fetched
            allProfiles.forEach(profile => {
                if (profile.membership_status && statusCounts.hasOwnProperty(profile.membership_status)) {
                    statusCounts[profile.membership_status]++;
                }
            });
            
            console.log('User status counts:', statusCounts);
            
            // Update total users display with breakdown
            document.getElementById('totalUsersStat').innerHTML = 
                `<span class="stat-number">${totalUsers}</span>
                 <div class="stat-breakdown">
                    <div class="breakdown-item">
                        <span class="status-active"></span> Active: ${statusCounts.active}
                    </div>
                    <div class="breakdown-item">
                        <span class="status-pending-verification"></span> Pending Verification: ${statusCounts.pending_verification}
                    </div>
                    <div class="breakdown-item">
                        <span class="status-pending-approval"></span> Pending Approval: ${statusCounts.pending_approval}
                    </div>
                 </div>`;
        }

        // Fetch active events (upcoming events)
        console.log('Fetching events data...');
        const today = new Date().toISOString();
        try {
            const { data: eventData, error: eventDataError } = await supabaseClient
                .from('events')
                .select('id, title, date, location, status');
                
            if (eventDataError) {
                console.error('Error fetching event data:', eventDataError.message);
                document.getElementById('activeEventsStat').innerHTML = '<span class="error-text">Error loading event data</span>';
            } else if (!eventData || eventData.length === 0) {
                console.log('No events found in database');
                document.getElementById('activeEventsStat').innerHTML = '<span class="stat-number">0</span>';
            } else {
                console.log(`Fetched ${eventData.length} events from database`);
                
                // Count upcoming and past events
                let upcomingEvents = 0;
                let pastEvents = 0;
                
                const now = new Date();
                eventData.forEach(event => {
                    try {
                        const eventDate = new Date(event.date);
                        if (eventDate > now) {
                            upcomingEvents++;
                        } else {
                            pastEvents++;
                        }
                    } catch (error) {
                        console.warn(`Could not parse event date: ${event.date}`, error);
                        pastEvents++; // Assume it's past if we can't parse the date
                    }
                });
                
                console.log(`Events breakdown: Upcoming: ${upcomingEvents}, Past: ${pastEvents}, Total: ${eventData.length}`);
                
                document.getElementById('activeEventsStat').innerHTML = 
                    `<span class="stat-number">${upcomingEvents}</span>
                     <div class="stat-breakdown">
                        <div class="breakdown-item">
                            <span class="event-upcoming"></span> Upcoming: ${upcomingEvents}
                        </div>
                        <div class="breakdown-item">
                            <span class="event-past"></span> Past: ${pastEvents}
                        </div>
                        <div class="breakdown-item">
                            <span class="event-total"></span> Total: ${(upcomingEvents + pastEvents)}
                        </div>
                     </div>`;
            }
        } catch (eventError) {
            console.error('Error in events processing:', eventError);
            document.getElementById('activeEventsStat').innerHTML = '<span class="error-text">Error processing events</span>';
        }

        // Fetch users with pending verification or approval
        console.log('Calculating pending verifications...');
        try {
            // We already have the profile data, so we can calculate this from our existing data
            const pendingVerifications = statusCounts.pending_verification || 0;
            const pendingApprovals = statusCounts.pending_approval || 0;
            const totalPending = pendingVerifications + pendingApprovals;
            
            console.log(`Pending verifications: ${pendingVerifications}, Pending approvals: ${pendingApprovals}`);
            
            document.getElementById('pendingVerificationsStat').innerHTML = 
                `<span class="stat-number">${totalPending}</span>
                 <div class="stat-breakdown">
                    <div class="breakdown-item">
                        <span class="status-pending-verification"></span> Verification: ${pendingVerifications}
                    </div>
                    <div class="breakdown-item">
                        <span class="status-pending-approval"></span> Approval: ${pendingApprovals}
                    </div>
                 </div>`;
        } catch (pendingError) {
            console.error('Error calculating pending verifications:', pendingError);
            document.getElementById('pendingVerificationsStat').innerHTML = '<span class="error-text">Error calculating pending verifications</span>';
        }
        
        // Fetch recent registrations (last 24 hours)
        console.log('Fetching recent registrations...');
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const isoYesterday = yesterday.toISOString();

            // Calculate recent members from profiles we already fetched
            const recentProfiles = allProfiles.filter(profile => {
                if (!profile.created_at) return false;
                try {
                    return new Date(profile.created_at) >= yesterday;
                } catch (error) {
                    return false;
                }
            });
            
            const recentRegistrations = recentProfiles.length;
            console.log(`Recent profiles in last 24 hours: ${recentRegistrations}`);
            
            // Get recent event registrations in last 24 hours
            const { data: recentEventRegs, error: recentEventError } = await supabaseClient
                .from('event_registrations')
                .select('id', { count: 'exact', head: true })
                .gte('registered_at', isoYesterday)
                .is('cancelled_at', null);
                
            if (recentEventError) {
                console.error('Error fetching recent event registrations:', recentEventError.message);
                // Continue with just profile registrations
            }
            
            const recentEventCount = recentEventRegs || 0;
            console.log(`Recent event registrations in last 24 hours: ${recentEventCount}`);
            
            document.getElementById('recentRegistrationsStat').innerHTML = 
                `<span class="stat-number">${recentRegistrations}</span>
                 <div class="stat-breakdown">
                    <div class="breakdown-item">
                        <span class="reg-users"></span> New Members: ${recentRegistrations}
                    </div>
                    <div class="breakdown-item">
                        <span class="reg-events"></span> Event Signups: ${recentEventCount}
                    </div>
                 </div>`;
        } catch (recentError) {
            console.error('Error calculating recent registrations:', recentError);
            document.getElementById('recentRegistrationsStat').innerHTML = '<span class="error-text">Error calculating recent registrations</span>';
        }

        // Add a recent activity section
        try {
            console.log('Loading recent activity section...');
            await loadRecentActivitySection();
            console.log('Recent activity section loaded successfully');
        } catch (activityError) {
            console.error('Error loading recent activity section:', activityError);
            // Don't block the overall stats if this fails
        }

        console.log('fetchOverviewStats completed successfully');
    } catch (error) {
        console.error('Error fetching overview stats:', error);
        // Update UI to show errors
        document.getElementById('totalUsersStat').innerHTML = '<span class="error-text">Error loading statistics</span>';
        document.getElementById('activeEventsStat').innerHTML = '<span class="error-text">Error loading statistics</span>';
        document.getElementById('pendingVerificationsStat').innerHTML = '<span class="error-text">Error loading statistics</span>';
        document.getElementById('recentRegistrationsStat').innerHTML = '<span class="error-text">Error loading statistics</span>';
    }
}

// Function to load recent activity in the dashboard overview
async function loadRecentActivitySection() {
    console.log('Starting loadRecentActivitySection function...');
    const dashboardOverview = document.getElementById('dashboard-overview');
    if (!dashboardOverview) {
        console.error('Dashboard overview section not found');
        return;
    }
    
    // Check if recent activity section already exists
    let recentActivitySection = document.getElementById('recent-activity-section');
    
    if (!recentActivitySection) {
        console.log('Creating new recent activity section...');
        // Create the section if it doesn't exist
        recentActivitySection = document.createElement('div');
        recentActivitySection.id = 'recent-activity-section';
        recentActivitySection.className = 'recent-activity-section';
        recentActivitySection.innerHTML = `
            <h3>Recent Activity</h3>
            <div class="activity-container">
                <div class="activity-column">
                    <h4>New Members (Last 7 Days)</h4>
                    <div id="recent-members-list" class="activity-list">
                        <p class="loading-text">Loading recent members...</p>
                    </div>
                </div>
                <div class="activity-column">
                    <h4>Recent Event Registrations</h4>
                    <div id="recent-registrations-list" class="activity-list">
                        <p class="loading-text">Loading recent registrations...</p>
                    </div>
                </div>
            </div>
        `;
        
        // Insert after the quick actions section
        const quickActionsSection = document.querySelector('.quick-actions');
        if (quickActionsSection) {
            console.log('Inserting after quick actions section');
            quickActionsSection.after(recentActivitySection);
        } else {
            // Fallback to append at the end of dashboard overview
            console.log('No quick actions section found, appending to dashboard overview');
            dashboardOverview.appendChild(recentActivitySection);
        }
    } else {
        console.log('Recent activity section already exists, updating content');
    }
    
    // Get recent members (last 7 days)
    const supabaseClient = window.supabaseClient;
    if (!supabaseClient) {
        console.error('Supabase client not available');
        document.getElementById('recent-members-list').innerHTML = '<p class="error-text">Supabase client unavailable</p>';
        document.getElementById('recent-registrations-list').innerHTML = '<p class="error-text">Supabase client unavailable</p>';
        return;
    }
    
    try {
        // Set date to 7 days ago
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const isoSevenDaysAgo = sevenDaysAgo.toISOString();
        
        // Fetch recent members
        console.log('Fetching recent members from last 7 days...');
        const { data: recentMembers, error: membersError } = await supabaseClient
            .from('profiles')
            .select('id, full_name, email, membership_status, member_id, created_at')
            .gte('created_at', isoSevenDaysAgo)
            .order('created_at', { ascending: false })
            .limit(5);
            
        if (membersError) {
            console.error('Error fetching recent members:', membersError.message);
            document.getElementById('recent-members-list').innerHTML = '<p class="error-text">Failed to load recent members</p>';
        } else if (!recentMembers || recentMembers.length === 0) {
            console.log('No new members in the last 7 days');
            document.getElementById('recent-members-list').innerHTML = '<p class="empty-text">No new members in the last 7 days</p>';
        } else {
            console.log(`Found ${recentMembers.length} recent members`);
            let membersHTML = '';
            recentMembers.forEach(member => {
                try {
                    const formattedDate = member.created_at ? formatDate(member.created_at) : 'Unknown date';
                    const statusClass = member.membership_status ? 
                        `status-${member.membership_status.toLowerCase().replace(/_/g, '-')}` : 
                        'status-unknown';
                    
                    membersHTML += `
                        <div class="activity-item">
                            <div class="activity-header">
                                <span class="activity-name">${member.full_name || 'Unknown Member'}</span>
                                <span class="activity-date">${formattedDate}</span>
                            </div>
                            <div class="activity-details">
                                <span class="activity-id">${member.member_id || 'No ID'}</span>
                                <span class="activity-email">${member.email || 'No Email'}</span>
                                <span class="${statusClass}">${member.membership_status || 'Unknown'}</span>
                            </div>
                        </div>
                    `;
                } catch (memberError) {
                    console.error('Error processing member for display:', memberError, member);
                    // Skip this member if there's an error
                }
            });
            
            if (membersHTML) {
                document.getElementById('recent-members-list').innerHTML = membersHTML;
            } else {
                document.getElementById('recent-members-list').innerHTML = '<p class="error-text">Error processing member data</p>';
            }
        }
        
        // Fetch recent event registrations
        console.log('Fetching recent event registrations...');
        const { data: recentRegistrations, error: registrationsError } = await supabaseClient
            .from('event_registrations')
            .select('id, event_id, user_id, vehicle_model, registered_at')
            .is('cancelled_at', null)
            .order('registered_at', { ascending: false })
            .limit(5);
            
        if (registrationsError) {
            console.error('Error fetching recent registrations:', registrationsError.message);
            document.getElementById('recent-registrations-list').innerHTML = '<p class="error-text">Failed to load recent registrations</p>';
            return;
        }
        
        if (!recentRegistrations || recentRegistrations.length === 0) {
            console.log('No recent event registrations found');
            document.getElementById('recent-registrations-list').innerHTML = '<p class="empty-text">No recent event registrations</p>';
            return;
        }
        
        console.log(`Found ${recentRegistrations.length} recent event registrations`);
        
        // Get event details for the registrations
        const eventIds = [...new Set(recentRegistrations.map(reg => reg.event_id))];
        console.log('Fetching event details for IDs:', eventIds);
        
        // Initialize as empty array in case the fetch fails
        let events = [];
        try {
            const { data: fetchedEvents, error: eventsError } = await supabaseClient
                .from('events')
                .select('id, title, date')
                .in('id', eventIds);
                
            if (eventsError) {
                console.error('Error fetching event details:', eventsError.message);
            } else if (fetchedEvents) {
                events = fetchedEvents;
                console.log(`Fetched ${events.length} events`);
            }
        } catch (eventFetchError) {
            console.error('Failed to fetch event details:', eventFetchError);
        }
        
        // Create a map of events
        const eventMap = {};
        events.forEach(event => {
            eventMap[event.id] = event;
        });
        
        // Get user details for the registrations
        const userIds = [...new Set(recentRegistrations.map(reg => reg.user_id))];
        console.log('Fetching user details for IDs:', userIds);
        
        // Initialize as empty array in case the fetch fails
        let users = [];
        try {
            const { data: fetchedUsers, error: usersError } = await supabaseClient
                .from('profiles')
                .select('id, full_name, member_id')
                .in('id', userIds);
                
            if (usersError) {
                console.error('Error fetching user details:', usersError.message);
            } else if (fetchedUsers) {
                users = fetchedUsers;
                console.log(`Fetched ${users.length} users`);
            }
        } catch (userFetchError) {
            console.error('Failed to fetch user details:', userFetchError);
        }
        
        // Create a map of users
        const userMap = {};
        users.forEach(user => {
            userMap[user.id] = user;
        });
        
        // Generate the HTML for recent registrations
        let registrationsHTML = '';
        recentRegistrations.forEach(reg => {
            try {
                const event = eventMap[reg.event_id] || { title: 'Unknown Event', date: null };
                const user = userMap[reg.user_id] || { full_name: 'Unknown User', member_id: 'Unknown' };
                const formattedDate = formatDate(reg.registered_at);
                
                registrationsHTML += `
                    <div class="activity-item">
                        <div class="activity-header">
                            <span class="activity-name">${event.title}</span>
                            <span class="activity-date">${formattedDate}</span>
                        </div>
                        <div class="activity-details">
                            <span class="activity-user">${user.full_name}</span>
                            <span class="activity-id">${user.member_id || 'No ID'}</span>
                            <span class="activity-model">${reg.vehicle_model || 'No Vehicle Info'}</span>
                        </div>
                    </div>
                `;
            } catch (regError) {
                console.error('Error processing registration for display:', regError, reg);
                // Skip this registration if there's an error
            }
        });
        
        if (registrationsHTML) {
            document.getElementById('recent-registrations-list').innerHTML = registrationsHTML;
        } else {
            document.getElementById('recent-registrations-list').innerHTML = '<p class="error-text">Error processing registration data</p>';
        }
        
        console.log('Successfully updated recent activity section');
    } catch (error) {
        console.error('Error in loadRecentActivitySection:', error);
        document.getElementById('recent-members-list').innerHTML = '<p class="error-text">Failed to load recent activity</p>';
        document.getElementById('recent-registrations-list').innerHTML = '<p class="error-text">Failed to load recent activity</p>';
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
            const registrationStatusFilter = document.getElementById('registrationStatusFilter').value;
            loadEventRegistrationsTable(searchTerm, eventFilter, registrationStatusFilter);
        }, 500));
    }
    
    // Configure event filter dropdown
    const eventFilterSelect = document.getElementById('eventFilter');
    if (eventFilterSelect) {
        eventFilterSelect.addEventListener('change', function() {
            const searchTerm = document.getElementById('eventSearchInput').value.trim();
            const registrationStatusFilter = document.getElementById('registrationStatusFilter').value;
            loadEventRegistrationsTable(searchTerm, this.value, registrationStatusFilter);
        });
    }
    
    // Configure registration status filter dropdown
    const registrationStatusFilterSelect = document.getElementById('registrationStatusFilter');
    if (registrationStatusFilterSelect) {
        registrationStatusFilterSelect.addEventListener('change', function() {
            const searchTerm = document.getElementById('eventSearchInput').value.trim();
            const eventFilter = document.getElementById('eventFilter').value;
            loadEventRegistrationsTable(searchTerm, eventFilter, this.value);
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
async function loadEventRegistrationsTable(searchTerm = '', eventFilter = 'all', registrationStatusFilter = 'active') {
    const supabaseClient = window.supabaseClient;
    if (!supabaseClient) {
        console.error('Supabase client is not available');
        return;
    }
    
    console.log('Loading event registrations table with:', { searchTerm, eventFilter, registrationStatusFilter });
    
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
            .order('registered_at', { ascending: false });
        
        // Apply registration status filter
        if (registrationStatusFilter === 'active') {
            query = query.is('cancelled_at', null); // Only show active registrations
        } else if (registrationStatusFilter === 'cancelled') {
            query = query.not('cancelled_at', 'is', null); // Only show cancelled registrations
        }
        // For 'all', we don't apply filter as we want all registrations
        
        // Apply event filter if specified
        if (eventFilter !== 'all') {
            query = query.eq('event_id', eventFilter);
        }
        
        console.log('Executing Supabase query for event registrations with status filter:', registrationStatusFilter);
        const { data: basicRegistrations, error: regError } = await query;
        
        if (regError) {
            console.error('Error fetching event registrations:', regError);
            console.error('Details:', JSON.stringify(regError));
            registrationsTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Error loading event registrations: ${regError.message || 'Unknown error'}</td></tr>`;
            return;
        }
        
        if (!basicRegistrations || basicRegistrations.length === 0) {
            registrationsTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No ${registrationStatusFilter === 'active' ? 'active' : registrationStatusFilter === 'cancelled' ? 'cancelled' : ''} event registrations found.</td></tr>`;
            return;
        }
        
        console.log(`Retrieved ${basicRegistrations.length} registrations from database with status filter: ${registrationStatusFilter}`);
        
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
        
        console.log(`After filtering, displaying ${filteredRegistrations.length} registrations`);
        
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
            const registrationStatus = reg.cancelled_at ? 'Cancelled' : 'Registered';
            const cancelledDate = reg.cancelled_at ? formatDate(reg.cancelled_at) : '';
            
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
                        <span class="status-${reg.cancelled_at ? 'cancelled' : 'registered'}">${registrationStatus}</span>
                        ${reg.cancelled_at ? 
                            `<div style="font-size: 0.8em; margin-top: 3px;">Cancelled: ${cancelledDate}</div>` : 
                            `<div style="font-size: 0.8em; margin-top: 3px;">
                                <span class="status-${membershipStatus.toLowerCase()}">${membershipStatus}</span>
                            </div>`
                        }
                    </td>
                    <td>
                        <button class="action-btn view-btn" title="View Registration" data-reg-id="${reg.id}" data-user-id="${reg.user_id}"><i class="fas fa-eye"></i></button>
                        ${!reg.cancelled_at ? 
                            `<button class="action-btn delete-btn" title="Cancel Registration" data-reg-id="${reg.id}"><i class="fas fa-calendar-times"></i></button>` : 
                            ''
                        }
                    </td>
                </tr>
            `;
        }).join('');

        // Update the table content
        registrationsTableBody.innerHTML = tableHtml.length > 0 ? 
            tableHtml : 
            `<tr><td colspan="8" style="text-align:center;">No matching ${registrationStatusFilter === 'active' ? 'active' : registrationStatusFilter === 'cancelled' ? 'cancelled' : ''} registrations found.</td></tr>`;
            
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

/**
 * Initialize dashboard menus and sidebar
 */
function initializeDashboardMenus() {
    console.log('Initializing dashboard menus and sidebar...');
    
    try {
        // Get all menu items and content sections
        const menuItems = document.querySelectorAll('.nav-item');
        const contentSections = document.querySelectorAll('.dashboard-content-section');
        
        if (!menuItems || menuItems.length === 0) {
            console.error('No menu items found in the DOM');
            return;
        }
        
        if (!contentSections || contentSections.length === 0) {
            console.error('No content sections found in the DOM');
            return;
        }
        
        console.log(`Found ${menuItems.length} menu items and ${contentSections.length} content sections`);
        
        // Initialize sidebar toggle button
        const sidebarToggle = document.querySelector('#sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (sidebarToggle && sidebar) {
            console.log('Initializing sidebar toggle');
            sidebarToggle.addEventListener('click', function() {
                console.log('Sidebar toggle clicked');
                sidebar.classList.toggle('collapsed');
                document.querySelector('.main-content').classList.toggle('expanded');
            });
        } else {
            console.warn('Sidebar toggle or sidebar element not found');
        }
        
        // Add click event listeners to menu items
        menuItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('data-target');
                console.log(`Menu item clicked: ${this.textContent.trim()}, target: ${targetId}`);
                
                if (!targetId) {
                    console.error('Menu item missing data-target attribute:', this);
                    return;
                }
                
                // Remove active class from all menu items
                menuItems.forEach(menuItem => menuItem.classList.remove('active'));
                
                // Add active class to clicked item
                this.classList.add('active');
                
                // Hide all content sections
                contentSections.forEach(section => {
                    section.classList.remove('active');
                    section.style.display = 'none';
                });
                
                // Show the target content section
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.classList.add('active');
                    targetSection.style.display = 'block';
                    console.log(`Activated section: ${targetId}`);
                    
                    // If we switched to event management, refresh the data
                    if (targetId === 'event-management') {
                        console.log('Switched to event management, refreshing data...');
                        loadEventRegistrationsTable();
                        populateEventFilter();
                    }
                    
                    // If we switched to user management, refresh the data
                    if (targetId === 'user-management') {
                        console.log('Switched to user management, refreshing data...');
                        loadUsersTable();
                    }
                } else {
                    console.error(`Target section not found: ${targetId}`);
                }
            });
        });
        
        // Activate dashboard overview by default
        const defaultSection = document.querySelector('.nav-item[data-target="dashboard-overview"]');
        if (defaultSection) {
            console.log('Activating default section: dashboard-overview');
            defaultSection.classList.add('active');
            const overviewSection = document.getElementById('dashboard-overview');
            if (overviewSection) {
                overviewSection.classList.add('active');
                overviewSection.style.display = 'block';
            } else {
                console.error('Dashboard overview section not found in DOM');
            }
        } else {
            console.warn('Default dashboard overview menu item not found');
            // Fallback: activate the first menu item
            if (menuItems.length > 0) {
                const firstItem = menuItems[0];
                firstItem.classList.add('active');
                const firstTargetId = firstItem.getAttribute('data-target');
                
                if (firstTargetId) {
                    const firstTarget = document.getElementById(firstTargetId);
                    if (firstTarget) {
                        firstTarget.classList.add('active');
                        firstTarget.style.display = 'block';
                        console.log(`Activated first available section: ${firstTargetId}`);
                    }
                }
            }
        }
        
        console.log('Dashboard menus and sidebar initialized successfully');
    } catch (error) {
        console.error('Error initializing dashboard menus:', error);
    }
}
    