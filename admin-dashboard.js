// Add a direct event listener to ensure initialization happens
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin dashboard DOM loaded, initializing...');
    
    // Wait for Supabase client to be available
    if (!window.supabaseClient) {
        console.log('Waiting for Supabase client to be initialized...');
        await new Promise(resolve => {
            const checkSupabase = () => {
                if (window.supabaseClient) {
                    resolve();
                } else {
                    setTimeout(checkSupabase, 100);
                }
            };
            checkSupabase();
        });
    }
    
    try {
        // Initialize the admin dashboard
        await initializeAdminDashboard();
        console.log('Admin dashboard initialized successfully');
    } catch (error) {
        console.error('Error during dashboard initialization:', error);
        alert('There was an error initializing the admin dashboard. Please try refreshing the page.');
    }
});

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

// Add these global variables to track sort state at the top of the file, after the existing variable declarations
let userTableSortColumn = 'created_at';
let userTableSortDirection = 'desc'; // 'desc' for descending, 'asc' for ascending
let eventTableSortColumn = 'registered_at'; 
let eventTableSortDirection = 'desc';

async function initializeAdminDashboard() {
    console.log('Initializing admin dashboard...');
    
    try {
        // First check if the user is logged in
        console.log('Checking user authentication...');
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        
        if (authError) {
            console.error('Error checking authentication:', authError);
            alert('Error checking authentication status. Please try again or contact support.');
            return;
        }
        
        if (!user) {
            console.warn('No authenticated user found');
            alert('Access denied. Please log in with administrator credentials.');
            window.location.href = 'login.html';
            return;
        }
        
        // Verify the user has admin role
        console.log('Verifying admin access for user:', user.id);
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('role, full_name, email, id')
            .eq('id', user.id)
            .single();
        
        if (profileError) {
            console.error('Error fetching user profile:', profileError);
            alert('Error verifying administrator status. Please try again or contact support.');
            return;
        }
        
        if (!profile || profile.role !== 'admin') {
            console.warn('Non-admin user attempted to access admin dashboard:', profile);
            
            // Log the access attempt
            await logAdminAccessAttempt(
                user.id,
                profile?.email || user.email,
                false
            );
            
            alert('Access denied. Your account does not have administrator privileges.');
            window.location.href = 'dashboard.html';
            return;
        }
        
        // User is authenticated and has admin role, log successful access
        console.log('Admin access verified for user:', profile.full_name);
        await logAdminAccessAttempt(
            user.id,
            profile.email,
            true
        );
        
        // Show the admin name in the dashboard
        const adminNameElement = document.getElementById('adminName');
        if (adminNameElement) {
            adminNameElement.textContent = profile.full_name;
        }
        
        // Load dashboard data
        await loadDashboardData();
        
        // Initialize dashboard menu functionality
        initializeDashboardMenus();
        
        // Initialize table sorting
        initializeTableSorting();
        
        console.log('Admin dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing admin dashboard:', error);
        alert('Something went wrong. Please reload the page or contact support.');
    }
}

/**
 * Load dashboard data and initialize UI components
 */
async function loadDashboardData() {
    console.log('Starting to load dashboard data...');

    try {
        // Initialize the dashboard menus first to ensure proper navigation
        console.log('Initializing dashboard menus...');
        initializeDashboardMenus();
        
        // Check if dashboard overview section exists and make it visible by default
        const dashboardOverview = document.getElementById('dashboard-overview');
        if (dashboardOverview) {
            console.log('Setting dashboard overview as active section');
            
            // Make dashboard overview visible by default
            document.querySelectorAll('.dashboard-content-section').forEach(section => {
                section.style.display = 'none';
                section.classList.remove('active');
            });
            
            dashboardOverview.style.display = 'block';
            dashboardOverview.classList.add('active');
            
            // Add active class to both sidebar and top menu items for Overview
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            
            // Activate both sidebar and top menu items for Overview
            const sidebarMenuItem = document.querySelector('.sidebar-nav a[data-target="dashboard-overview"]');
            const topMenuItem = document.querySelector('.admin-top-menu-items a[data-target="dashboard-overview"]');
            
            if (sidebarMenuItem) sidebarMenuItem.classList.add('active');
            if (topMenuItem) topMenuItem.classList.add('active');
        }
        
        // On mobile, ensure the admin container has the correct class
        const adminContainer = document.querySelector('.admin-container');
        if (adminContainer && window.innerWidth <= 768) {
            adminContainer.classList.add('with-top-menu');
        }
        
        // Load dashboard overview stats
        console.log('Fetching overview stats...');
        await fetchOverviewStats();
        
        // Load recent activity section with latest member and registration data
        console.log('Loading recent activity section...');
        await loadRecentActivitySection();
        
        // Set up table search functionality and initialize the user management section
        console.log('Setting up table search functionality...');
        setupTableSearch();
        
        // Load users table
        console.log('Loading users table...');
        await loadUsersTable();
        
        // Load event registrations table with default filter for active registrations
        console.log('Loading event registrations with active status filter...');
        await loadEventRegistrationsTable('', 'all', 'active');
        
        // Set the registration status filter select to "active" to match the loaded data
        const registrationStatusFilterElement = document.getElementById('registrationStatusFilter');
        if (registrationStatusFilterElement) {
            registrationStatusFilterElement.value = 'active';
        }
        
        // Populate event filter dropdown
        console.log('Populating event filter dropdown...');
        await populateEventFilter();
        
        // Initialize user and event management controls
        console.log('Initializing user management controls...');
        initializeUserManagementControls();
        
        console.log('Initializing event management controls...');
        initializeEventManagementControls();
        
        // Add action listeners to user and event tables after they are loaded
        console.log('Adding action listeners to user and event tables...');
        addUserActionListeners();
        addEventRegistrationActionListeners();
        
        console.log('Dashboard data loaded successfully');
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        alert('There was an error loading the dashboard data. Please try refreshing the page.');
    }
}

/**
 * Set up table search functionality
 */
function setupTableSearch() {
    console.log('Setting up table search functionality...');
    
    try {
        // Set up user table search
        const userSearchInput = document.getElementById('userSearchInput');
        if (userSearchInput) {
            console.log('Setting up user search input...');
            userSearchInput.addEventListener('input', function() {
                loadUsersTable(this.value);
            });
        } else {
            console.warn('User search input not found in DOM');
        }
        
        // Set up event filter change event
        const eventFilter = document.getElementById('eventFilter');
        if (eventFilter) {
            console.log('Setting up event filter dropdown...');
            eventFilter.addEventListener('change', function() {
                const registrationStatusFilter = document.getElementById('registrationStatusFilter');
                const statusFilter = registrationStatusFilter ? registrationStatusFilter.value : 'active';
                const searchTerm = document.getElementById('eventSearchInput') ? 
                    document.getElementById('eventSearchInput').value : '';
                loadEventRegistrationsTable(searchTerm, this.value, statusFilter);
            });
        } else {
            console.warn('Event filter dropdown not found in DOM');
        }
        
        // Set up registration status filter
        const registrationStatusFilter = document.getElementById('registrationStatusFilter');
        if (registrationStatusFilter) {
            console.log('Setting up registration status filter...');
            registrationStatusFilter.addEventListener('change', function() {
                const eventFilter = document.getElementById('eventFilter');
                const selectedEvent = eventFilter ? eventFilter.value : 'all';
                const searchTerm = document.getElementById('eventSearchInput') ? 
                    document.getElementById('eventSearchInput').value : '';
                loadEventRegistrationsTable(searchTerm, selectedEvent, this.value);
            });
        } else {
            console.warn('Registration status filter not found in DOM');
        }
        
        // Set up event registration search
        const eventSearchInput = document.getElementById('eventSearchInput');
        if (eventSearchInput) {
            console.log('Setting up event search input...');
            eventSearchInput.addEventListener('input', function() {
                const eventFilter = document.getElementById('eventFilter');
                const registrationStatusFilter = document.getElementById('registrationStatusFilter');
                
                const selectedEvent = eventFilter ? eventFilter.value : 'all';
                const statusFilter = registrationStatusFilter ? registrationStatusFilter.value : 'active';
                
                loadEventRegistrationsTable(this.value, selectedEvent, statusFilter);
            });
        } else {
            console.warn('Event search input not found in DOM');
        }
        
        // Set up user status filter
        const userStatusFilter = document.getElementById('userStatusFilter');
        if (userStatusFilter) {
            console.log('Setting up user status filter...');
            userStatusFilter.addEventListener('change', function() {
                const searchTerm = document.getElementById('userSearchInput') ? 
                    document.getElementById('userSearchInput').value : '';
                loadUsersTable(searchTerm, this.value);
            });
        } else {
            console.warn('User status filter not found in DOM');
        }
        
        console.log('Table search functionality setup complete');
    } catch (error) {
        console.error('Error setting up table search:', error);
    }
}

/**
 * Fetches and displays key statistics for the admin dashboard overview
 */
async function fetchOverviewStats() {
    console.log('Starting fetchOverviewStats...');
    
    // Helper function to update a statistic in the UI
    function updateStat(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        } else {
            console.warn(`Element ${id} not found when updating stat`);
        }
    }
    
    // Helper function to handle errors and display an appropriate message
    function handleStatError(id, error) {
        console.error(`Error fetching stat for ${id}:`, error);
        updateStat(id, 'Error');
    }
    
    try {
        // Check if supabaseClient is available
        if (!window.supabaseClient) {
            console.error('Supabase client not available for fetching stats');
            updateStat('totalUsers', 'No DB Connection');
            updateStat('activeUsers', 'No DB Connection');
            updateStat('pendingUsers', 'No DB Connection');
            updateStat('suspendedUsers', 'No DB Connection');
            updateStat('activeEvents', 'No DB Connection');
            updateStat('totalEvents', 'No DB Connection');
            updateStat('pastEvents', 'No DB Connection');
            return;
        }
        
        // Get the Supabase client
        const supabaseClient = window.supabaseClient;
        
        // 1. Get all profiles to find the highest member ID (which is our total user count)
        try {
            console.log('Fetching profiles to determine total users...');
            const { data: profiles, error: profilesError } = await supabaseClient
                .from('profiles')
                .select('member_id')
                .not('member_id', 'is', null);
                
            if (profilesError) {
                console.error('Error fetching profiles:', profilesError);
                throw profilesError;
            }
            
            if (!profiles || profiles.length === 0) {
                updateStat('totalUsers', '0');
                console.log('No profiles found with member IDs');
            } else {
                console.log(`Found ${profiles.length} profiles with member IDs`);
                
                // Extract the highest member ID number
                let highestMemberNumber = 0;
                profiles.forEach(profile => {
                    if (profile.member_id && profile.member_id.startsWith('BTC')) {
                        const numberString = profile.member_id.replace('BTC', '');
                        const memberNumber = parseInt(numberString, 10);
                        if (!isNaN(memberNumber) && memberNumber > highestMemberNumber) {
                            highestMemberNumber = memberNumber;
                        }
                    }
                });
                
                // Update total users to reflect the highest member ID number
                updateStat('totalUsers', highestMemberNumber.toString());
                console.log(`Highest member ID is BTC${highestMemberNumber}`);
            }
        } catch (error) {
            handleStatError('totalUsers', error);
        }

        // 2. Get user status breakdown
        try {
            console.log('Fetching user status breakdown...');
            const { data: statusCounts, error: statusError } = await supabaseClient
                .from('profiles')
                .select('membership_status')
                .not('membership_status', 'is', null);
                
            if (statusError) {
                throw statusError;
            }
            
            // Count different status types
            let activeCount = 0;
            let pendingVerificationCount = 0;
            let suspendedCount = 0;
            
            statusCounts.forEach(profile => {
                if (profile.membership_status === 'active') activeCount++;
                else if (profile.membership_status === 'pending' || 
                        profile.membership_status === 'pending_verification') pendingVerificationCount++;
                else if (profile.membership_status === 'suspended') suspendedCount++;
            });
            
            updateStat('activeUsers', activeCount.toString());
            updateStat('pendingUsers', pendingVerificationCount.toString());
            updateStat('suspendedUsers', suspendedCount.toString());
            
            console.log(`Status breakdown - Active: ${activeCount}, Pending: ${pendingVerificationCount}, Suspended: ${suspendedCount}`);
        } catch (error) {
            handleStatError('activeUsers', error);
            handleStatError('pendingUsers', error);
            handleStatError('suspendedUsers', error);
        }
        
        // 3. Get event data
        try {
            console.log('Fetching event statistics...');
            const now = new Date().toISOString();
            
            // Get all events
            const { data: events, error: eventsError } = await supabaseClient
                .from('events')
                .select('id, date');
                
            if (eventsError) {
                throw eventsError;
            }
            
            // Sort events into upcoming and past
            let upcomingEvents = 0;
            let pastEvents = 0;
            
            events.forEach(event => {
                if (new Date(event.date) > new Date()) {
                    upcomingEvents++;
                } else {
                    pastEvents++;
                }
            });
            
            updateStat('activeEvents', upcomingEvents.toString());
            updateStat('totalEvents', events.length.toString());
            updateStat('pastEvents', pastEvents.toString());
            
            console.log(`Event stats - Upcoming: ${upcomingEvents}, Total: ${events.length}, Past: ${pastEvents}`);
        } catch (error) {
            handleStatError('activeEvents', error);
            handleStatError('totalEvents', error);
            handleStatError('pastEvents', error);
        }
        
        // 4. Get users pending verification (more detailed stat than just counting statuses)
        try {
            console.log('Fetching users pending verification...');
            const { data: pendingUsers, error: pendingError } = await supabaseClient
                .from('profiles')
                .select('id')
                .in('membership_status', ['pending', 'pending_verification']);
                
            if (pendingError) {
                throw pendingError;
            }
            
            // This might duplicate the status count above, but it's a separate stat
            updateStat('pendingVerifications', pendingUsers.length.toString());
            console.log(`Users pending verification: ${pendingUsers.length}`);
        } catch (error) {
            handleStatError('pendingVerifications', error);
        }
        
        // 5. Get recent registrations (last 30 days)
        try {
            console.log('Fetching recent registrations...');
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const { data: recentRegs, error: regsError } = await supabaseClient
                .from('event_registrations')
                .select('id')
                .gt('registered_at', thirtyDaysAgo.toISOString())
                .is('cancelled_at', null);
                
            if (regsError) {
                throw regsError;
            }
            
            updateStat('recentRegistrations', recentRegs.length.toString());
            console.log(`Recent registrations (30 days): ${recentRegs.length}`);
        } catch (error) {
            handleStatError('recentRegistrations', error);
        }
        
        console.log('Finished fetching overview stats');
    } catch (error) {
        console.error('Error in fetchOverviewStats:', error);
        alert('Failed to load dashboard statistics. Please try refreshing the page.');
    }
}

/**
 * Loads the recent activity section in the dashboard overview 
 * including new members and recent event registrations
 */
async function loadRecentActivitySection() {
    console.log('Starting loadRecentActivitySection...');
    
    try {
        // Check if dashboard overview section exists
        const dashboardOverview = document.getElementById('dashboard-overview');
        if (!dashboardOverview) {
            console.error('Dashboard overview section not found in DOM');
            return;
        }
        
        // Find or create the recent activity section
        let recentActivitySection = document.querySelector('.recent-activity-section');
        if (!recentActivitySection) {
            console.log('Creating new recent activity section');
            recentActivitySection = document.createElement('div');
            recentActivitySection.className = 'recent-activity-section';
            recentActivitySection.innerHTML = `
                <h3><i class="fas fa-chart-line"></i> Recent Activity</h3>
                <div class="activity-container">
                    <div class="activity-column">
                        <h4><i class="fas fa-user-plus"></i> New Members (Last 7 days)</h4>
                        <div class="activity-list" id="recentMembersList">
                            <div class="loading-text">Loading recent members...</div>
                        </div>
                    </div>
                    <div class="activity-column">
                        <h4><i class="fas fa-calendar-check"></i> Recent Event Registrations</h4>
                        <div class="activity-list" id="recentRegistrationsList">
                            <div class="loading-text">Loading recent registrations...</div>
                        </div>
                    </div>
                </div>
            `;
            dashboardOverview.appendChild(recentActivitySection);
        } else {
            console.log('Updating existing recent activity section');
        }
        
        // Get references to the lists we'll populate
        const recentMembersList = document.getElementById('recentMembersList');
        const recentRegistrationsList = document.getElementById('recentRegistrationsList');
        
        // Make sure we have the supabase client
        const supabaseClient = window.supabaseClient;
        if (!supabaseClient) {
            console.error('Supabase client not available for loading recent activity');
            if (recentMembersList) recentMembersList.innerHTML = '<div class="error-text">Database connection unavailable</div>';
            if (recentRegistrationsList) recentRegistrationsList.innerHTML = '<div class="error-text">Database connection unavailable</div>';
            return;
        }
        
        // Get recent members (last 7 days)
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const isoSevenDaysAgo = sevenDaysAgo.toISOString();
            
            console.log(`Fetching members created after ${isoSevenDaysAgo}`);
            
            const { data: recentMembers, error: membersError } = await supabaseClient
                .from('profiles')
                .select('id, full_name, email, member_id, created_at')
                .gte('created_at', isoSevenDaysAgo)
                .order('created_at', { ascending: false })
                .limit(5);
                
            if (membersError) {
                console.error('Error fetching recent members:', membersError);
                recentMembersList.innerHTML = '<div class="error-text">Error loading recent members</div>';
            } else if (!recentMembers || recentMembers.length === 0) {
                console.log('No recent members found');
                recentMembersList.innerHTML = '<div class="empty-text">No new members in the last 7 days</div>';
            } else {
                console.log(`Found ${recentMembers.length} recent members`);
                
                // Build HTML for recent members
                let membersHTML = '';
                
                for (const member of recentMembers) {
                    try {
                        // Handle case where created_at might be missing
                        let createdDate = 'Unknown date';
                        if (member.created_at) {
                            createdDate = formatDate(member.created_at);
                        }
                        
                        membersHTML += `
                            <div class="activity-item">
                                <div class="activity-header">
                                    <span class="activity-name">${member.full_name || 'Unnamed Member'}</span>
                                    <span class="activity-date">${createdDate}</span>
                                </div>
                                <div class="activity-details">
                                    <span class="activity-email"><i class="fas fa-envelope"></i> ${member.email || 'No email'}</span>
                                    <span class="activity-id"><i class="fas fa-id-card"></i> ${member.member_id || 'No ID'}</span>
                                </div>
                            </div>
                        `;
                    } catch (memberError) {
                        console.error('Error processing member:', memberError, member);
                        // Skip this member but continue with others
                    }
                }
                
                recentMembersList.innerHTML = membersHTML || '<div class="empty-text">No valid members to display</div>';
            }
        } catch (recentMembersError) {
            console.error('Exception in recent members processing:', recentMembersError);
            recentMembersList.innerHTML = '<div class="error-text">Error processing member data</div>';
        }
        
        // Get recent event registrations
        try {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            const isoThreeDaysAgo = threeDaysAgo.toISOString();
            
            console.log(`Fetching registrations created after ${isoThreeDaysAgo}`);
            
            // First get the registrations
            const { data: recentRegistrations, error: registrationsError } = await supabaseClient
                .from('event_registrations')
                .select('id, user_id, event_id, vehicle_model, registered_at')
                .gte('registered_at', isoThreeDaysAgo)
                .is('cancelled_at', null)
                .order('registered_at', { ascending: false })
                .limit(5);
                
            if (registrationsError) {
                console.error('Error fetching recent registrations:', registrationsError);
                recentRegistrationsList.innerHTML = '<div class="error-text">Error loading recent registrations</div>';
                return;
            }
            
            if (!recentRegistrations || recentRegistrations.length === 0) {
                console.log('No recent registrations found');
                recentRegistrationsList.innerHTML = '<div class="empty-text">No new registrations in the last 3 days</div>';
                return;
            }
            
            console.log(`Found ${recentRegistrations.length} recent registrations`);
            
            // Get events data for the event titles
            const eventIds = [...new Set(recentRegistrations.map(reg => reg.event_id))];
            const { data: eventsData, error: eventsError } = await supabaseClient
                .from('events')
                .select('id, title')
                .in('id', eventIds);
                
            if (eventsError) {
                console.error('Error fetching event data:', eventsError);
                // Continue with user data, we'll just show "Unknown Event" for event titles
            }
            
            // Create a map of event IDs to titles for quick lookup
            const eventMap = {};
            if (eventsData) {
                eventsData.forEach(event => {
                    eventMap[event.id] = event.title;
                });
            }
            
            // Get user data for names
            const userIds = [...new Set(recentRegistrations.map(reg => reg.user_id))];
            const { data: usersData, error: usersError } = await supabaseClient
                .from('profiles')
                .select('id, full_name, email, member_id')
                .in('id', userIds);
                
            if (usersError) {
                console.error('Error fetching user data:', usersError);
                // Continue, we'll just show user IDs for names
            }
            
            // Create a map of user IDs to names for quick lookup
            const userMap = {};
            if (usersData) {
                usersData.forEach(user => {
                    userMap[user.id] = {
                        name: user.full_name,
                        email: user.email,
                        member_id: user.member_id
                    };
                });
            }
            
            // Now build the HTML for the registrations
            let registrationsHTML = '';
            
            for (const registration of recentRegistrations) {
                try {
                    const eventTitle = eventMap[registration.event_id] || 'Unknown Event';
                    const userData = userMap[registration.user_id] || { 
                        name: 'Unknown User', 
                        email: 'No email', 
                        member_id: 'No ID' 
                    };
                    
                    const registeredDate = registration.registered_at ? formatDate(registration.registered_at) : 'Unknown date';
                    
                    registrationsHTML += `
                        <div class="activity-item">
                            <div class="activity-header">
                                <span class="activity-name">${userData.name}</span>
                                <span class="activity-date">${registeredDate}</span>
                            </div>
                            <div class="activity-details">
                                <span class="activity-event"><i class="fas fa-calendar-day"></i> ${eventTitle}</span>
                                <span class="activity-model"><i class="fas fa-car"></i> ${registration.vehicle_model || 'Unknown model'}</span>
                                <span class="activity-id"><i class="fas fa-id-card"></i> ${userData.member_id || 'No ID'}</span>
                            </div>
                        </div>
                    `;
                } catch (regError) {
                    console.error('Error processing registration:', regError, registration);
                    // Skip this registration but continue with others
                }
            }
            
            recentRegistrationsList.innerHTML = registrationsHTML || '<div class="empty-text">No valid registrations to display</div>';
            
        } catch (recentRegistrationsError) {
            console.error('Exception in recent registrations processing:', recentRegistrationsError);
            recentRegistrationsList.innerHTML = '<div class="error-text">Error processing registration data</div>';
        }
        
        console.log('Recent activity section loaded successfully');
    } catch (error) {
        console.error('Error in loadRecentActivitySection:', error);
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

// Modify the loadUsersTable function to accept sort parameters
async function loadUsersTable(searchTerm = '', statusFilter = 'all', sortColumn = userTableSortColumn, sortDirection = userTableSortDirection) {
    const supabaseClient = window.supabaseClient;
    if (!supabaseClient) {
        console.error('Supabase client is not available');
        return;
    }
    
    // Update the global sort state
    userTableSortColumn = sortColumn;
    userTableSortDirection = sortDirection;
    
    console.log('Loading users table with:', { searchTerm, statusFilter, sortColumn, sortDirection });
    
    const usersTableBody = document.getElementById('usersTableBody');
    if (!usersTableBody) {
        console.error('Could not find usersTableBody element');
        return;
    }
    
    // Update sort indicators in the table headers
    updateTableSortIndicators('usersTable', sortColumn, sortDirection);
    
    usersTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Loading users...</td></tr>';

    try {
        let query = supabaseClient
            .from('profiles')
            .select('member_id, full_name, email, phone, membership_status, role, created_at, id')
            .order(sortColumn, { ascending: sortDirection === 'asc' });

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

// Modify the loadEventRegistrationsTable function to accept sort parameters
async function loadEventRegistrationsTable(searchTerm = '', eventFilter = 'all', registrationStatusFilter = 'active', sortColumn = eventTableSortColumn, sortDirection = eventTableSortDirection) {
    const supabaseClient = window.supabaseClient;
    if (!supabaseClient) {
        console.error('Supabase client is not available');
        return;
    }
    
    // Update the global sort state
    eventTableSortColumn = sortColumn;
    eventTableSortDirection = sortDirection;
    
    console.log('Loading event registrations table with:', { searchTerm, eventFilter, registrationStatusFilter, sortColumn, sortDirection });
    
    const registrationsTableBody = document.getElementById('eventRegistrationsTableBody');
    if (!registrationsTableBody) {
        console.error('Could not find eventRegistrationsTableBody element');
        return;
    }
    
    updateTableSortIndicators('eventRegistrationsTable', sortColumn, sortDirection);
    
    registrationsTableBody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Loading event registrations...</td></tr>';

    try {
        let query = supabaseClient
            .from('event_registrations')
            .select('id, event_id, user_id, vehicle_model, registered_at, cancelled_at');

        // If sorting by waiver_signed, we sort client-side later.
        // Otherwise, sort by the specified column in the database.
        if (sortColumn !== 'waiver_signed') {
            query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
        } else {
            // Default sort for database query when client-side sort on waiver_signed is intended
            query = query.order('registered_at', { ascending: false }); 
        }
        
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
            // Adjusted colspan for the new waiver column
            registrationsTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Error loading event registrations: ${regError.message || 'Unknown error'}</td></tr>`;
            return;
        }
        
        if (!basicRegistrations || basicRegistrations.length === 0) {
            // Adjusted colspan for the new waiver column
            registrationsTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">No ${registrationStatusFilter === 'active' ? 'active' : registrationStatusFilter === 'cancelled' ? 'cancelled' : ''} event registrations found.</td></tr>`;
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
        
        // Fetch waiver data for all relevant user_ids and event_ids
        let waiverMap = {};
        if (userIds.length > 0 && eventIds.length > 0) {
            const { data: waivers, error: waiverError } = await supabaseClient
                .from('event_waivers')
                .select('user_id, event_id, signed_at')
                .in('user_id', userIds)
                .in('event_id', eventIds); // Assuming waivers are specific to events

            if (waiverError) {
                console.error('Error fetching event waivers:', waiverError);
            } else if (waivers) {
                waivers.forEach(waiver => {
                    // Create a composite key for easy lookup
                    waiverMap[`${waiver.user_id}-${waiver.event_id}`] = waiver;
                });
            }
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
                profiles: profilesMap[reg.user_id] || {},
                waiver_signed: !!waiverMap[`${reg.user_id}-${reg.event_id}`],
                waiver_details: waiverMap[`${reg.user_id}-${reg.event_id}`] || null
            };
        });
        
        // If sorting by waiver_signed, perform client-side sort now
        if (sortColumn === 'waiver_signed') {
            completeRegistrations.sort((a, b) => {
                const valA = a.waiver_signed ? 1 : 0;
                const valB = b.waiver_signed ? 1 : 0;
                // For boolean, true (1) usually comes after false (0) in ascending
                // So, if ascending, false then true. If descending, true then false.
                if (sortDirection === 'asc') {
                    return valA - valB; // false (0) before true (1)
                } else {
                    return valB - valA; // true (1) before false (0)
                }
            });
        }
        
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
                        ${reg.waiver_signed 
                            ? `<span class="status-signed" title="Signed on: ${formatDate(reg.waiver_details?.signed_at)}"><i class="fas fa-check-circle"></i> Signed</span>` 
                            : '<span class="status-not-signed"><i class="fas fa-times-circle"></i> Not Signed</span>'}
                        ${reg.waiver_signed ? 
                            `<button class="view-waiver-btn" data-reg-id="${reg.id}" title="View Signed Waiver"><i class="fas fa-file-alt"></i> View</button>` : ''}
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
            // Adjusted colspan for the new waiver column
            `<tr><td colspan="9" style="text-align:center;">No matching ${registrationStatusFilter === 'active' ? 'active' : registrationStatusFilter === 'cancelled' ? 'cancelled' : ''} registrations found.</td></tr>`;
            
        console.log('Event registrations table HTML updated successfully');

        // Add event listeners for action buttons
        addEventRegistrationActionListeners();

    } catch (error) {
        console.error('Failed to load event registrations table:', error);
        // Adjusted colspan for the new waiver column
        registrationsTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Failed to load event registrations: ${error.message || 'Unknown error'}</td></tr>`;
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
            btn.addEventListener('click', async () => {
                const userId = btn.getAttribute('data-user-id');
                console.log('View user clicked for ID:', userId);
                
                try {
                    // Fetch user profile data
                    const { data: user, error } = await window.supabaseClient
                        .from('profiles')
                        .select('*')
                        .eq('id', userId)
                        .single();
                    
                    if (error) {
                        console.error('Error fetching user details:', error);
                        alert('Failed to load user details: ' + error.message);
                        return;
                    }
                    
                    if (!user) {
                        alert('User not found');
                        return;
                    }
                    
                    // Create and show a modal with the user details
                    const modalHTML = `
                        <div id="userDetailsModal" class="modal" style="display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.7); backdrop-filter: blur(5px);">
                            <div class="modal-content" style="background-color: #2a2f38; margin: 5% auto; padding: 20px; border-radius: 8px; width: 80%; max-width: 800px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); position: relative; animation: modalFadeIn 0.3s ease-out;">
                                <span class="close" style="position: absolute; top: 15px; right: 20px; color: #aaa; font-size: 28px; font-weight: bold; cursor: pointer;">&times;</span>
                                <h2 style="color: #e0e0e0; border-bottom: 1px solid #444; padding-bottom: 15px; margin-top: 0;">User Details</h2>
                                
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                                    <div style="background-color: #1e2229; padding: 15px; border-radius: 8px;">
                                        <h3 style="color: #00e676; margin-top: 0;">Basic Information</h3>
                                        <p><strong>Member ID:</strong> ${user.member_id || 'N/A'}</p>
                                        <p><strong>Full Name:</strong> ${user.full_name || 'N/A'}</p>
                                        <p><strong>Username:</strong> ${user.username || 'N/A'}</p>
                                        <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
                                        <p><strong>Phone:</strong> ${user.phone || 'N/A'}</p>
                                        <p><strong>Date of Birth:</strong> ${user.date_of_birth ? formatDate(user.date_of_birth) : 'N/A'}</p>
                                        <p><strong>Membership Status:</strong> <span class="status-${user.membership_status?.toLowerCase().replace(/_/g, '-')}" style="padding: 5px 10px; border-radius: 4px;">${user.membership_status || 'Unknown'}</span></p>
                                        <p><strong>Role:</strong> ${user.role || 'N/A'}</p>
                                        <p><strong>Joined:</strong> ${formatDate(user.created_at)}</p>
                                        <p><strong>Last Updated:</strong> ${formatDate(user.updated_at)}</p>
                                    </div>
                                    
                                    <div style="background-color: #1e2229; padding: 15px; border-radius: 8px;">
                                        <h3 style="color: #00e676; margin-top: 0;">Additional Information</h3>
                                        <p><strong>Tesla Models:</strong> ${Array.isArray(user.car_models) ? user.car_models.join(', ') : 'N/A'}</p>
                                        <p><strong>Address:</strong> ${user.street ? `${user.street}, ${user.city}, ${user.province}, ${user.postal_code}` : 'N/A'}</p>
                                        <p><strong>Events Attended:</strong> ${user.events_attended || '0'}</p>
                                        <p><strong>Last Login:</strong> ${user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'N/A'}</p>
                                    </div>
                                </div>
                                
                                <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                                    <button id="editUserBtn" class="btn primary-btn" style="background-color: #007bff; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer;">
                                        <i class="fas fa-edit"></i> Edit User
                                    </button>
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
                    document.querySelector('#userDetailsModal .close').addEventListener('click', () => {
                        document.getElementById('userDetailsModal').remove();
                    });
                    
                    document.getElementById('closeModalBtn').addEventListener('click', () => {
                        document.getElementById('userDetailsModal').remove();
                    });
                    
                    document.getElementById('editUserBtn').addEventListener('click', () => {
                        document.getElementById('userDetailsModal').remove();
                        // Call the edit function with the user ID
                        showEditUserModal(userId);
                    });
                    
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
                    console.error('Error displaying user details:', error);
                    alert('Failed to display user details: ' + error.message);
                }
            });
        }
    });
    
    // Edit user
    document.querySelectorAll('.action-btn.edit-btn').forEach(btn => {
        if (btn.closest('#usersTableBody')) {
            btn.addEventListener('click', () => {
                const userId = btn.getAttribute('data-user-id');
                console.log('Edit user clicked for ID:', userId);
                showEditUserModal(userId);
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

// Function to show the edit user modal
async function showEditUserModal(userId) {
    console.log('Showing edit user modal for ID:', userId);
    
    try {
        // Fetch user profile data
        const { data: user, error } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) {
            console.error('Error fetching user details for edit:', error);
            alert('Failed to load user details: ' + error.message);
            return;
        }
        
        if (!user) {
            alert('User not found');
            return;
        }
        
        // Create and show a modal with the edit form
        const modalHTML = `
            <div id="editUserModal" class="modal" style="display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.7); backdrop-filter: blur(5px);">
                <div class="modal-content" style="background-color: #2a2f38; margin: 2% auto; padding: 20px; border-radius: 8px; width: 90%; max-width: 900px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); position: relative; animation: modalFadeIn 0.3s ease-out; max-height: 90vh; overflow-y: auto;">
                    <span class="close" style="position: absolute; top: 15px; right: 20px; color: #aaa; font-size: 28px; font-weight: bold; cursor: pointer;">&times;</span>
                    <h2 style="color: #e0e0e0; border-bottom: 1px solid #444; padding-bottom: 15px; margin-top: 0;">Edit User</h2>
                    
                    <form id="editUserForm" style="margin-top: 20px;">
                        <input type="hidden" id="userId" value="${userId}">
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div style="background-color: #1e2229; padding: 15px; border-radius: 8px;">
                                <h3 style="color: #00e676; margin-top: 0;">Basic Information</h3>
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #e0e0e0;">Member ID:</label>
                                    <input type="text" id="memberIdInput" value="${user.member_id || ''}" style="width: 100%; padding: 8px; border-radius: 4px; background-color: #333a45; border: 1px solid #444; color: #e0e0e0;">
                                </div>
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #e0e0e0;">Full Name:</label>
                                    <input type="text" id="fullNameInput" value="${user.full_name || ''}" style="width: 100%; padding: 8px; border-radius: 4px; background-color: #333a45; border: 1px solid #444; color: #e0e0e0;">
                                </div>
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #e0e0e0;">Username:</label>
                                    <input type="text" id="usernameInput" value="${user.username || ''}" style="width: 100%; padding: 8px; border-radius: 4px; background-color: #333a45; border: 1px solid #444; color: #e0e0e0;">
                                </div>
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #e0e0e0;">Email:</label>
                                    <input type="email" id="emailInput" value="${user.email || ''}" style="width: 100%; padding: 8px; border-radius: 4px; background-color: #333a45; border: 1px solid #444; color: #e0e0e0;">
                                </div>
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #e0e0e0;">Phone:</label>
                                    <input type="tel" id="phoneInput" value="${user.phone || ''}" style="width: 100%; padding: 8px; border-radius: 4px; background-color: #333a45; border: 1px solid #444; color: #e0e0e0;">
                                </div>
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #e0e0e0;">Date of Birth:</label>
                                    <input type="date" id="dobInput" value="${user.date_of_birth || ''}" style="width: 100%; padding: 8px; border-radius: 4px; background-color: #333a45; border: 1px solid #444; color: #e0e0e0;">
                                </div>
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #e0e0e0;">Membership Status:</label>
                                    <select id="membershipStatusInput" style="width: 100%; padding: 8px; border-radius: 4px; background-color: #333a45; border: 1px solid #444; color: #e0e0e0;">
                                        <option value="active" ${user.membership_status === 'active' ? 'selected' : ''}>Active</option>
                                        <option value="pending_verification" ${user.membership_status === 'pending_verification' ? 'selected' : ''}>Pending Verification</option>
                                        <option value="pending_approval" ${user.membership_status === 'pending_approval' ? 'selected' : ''}>Pending Approval</option>
                                        <option value="suspended" ${user.membership_status === 'suspended' ? 'selected' : ''}>Suspended</option>
                                        <option value="inactive" ${user.membership_status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                    </select>
                                </div>
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #e0e0e0;">Role:</label>
                                    <select id="roleInput" style="width: 100%; padding: 8px; border-radius: 4px; background-color: #333a45; border: 1px solid #444; color: #e0e0e0;">
                                        <option value="member" ${user.role === 'member' ? 'selected' : ''}>Member</option>
                                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div style="background-color: #1e2229; padding: 15px; border-radius: 8px;">
                                <h3 style="color: #00e676; margin-top: 0;">Additional Information</h3>
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #e0e0e0;">Tesla Models (comma-separated):</label>
                                    <input type="text" id="carModelsInput" value="${Array.isArray(user.car_models) ? user.car_models.join(', ') : ''}" style="width: 100%; padding: 8px; border-radius: 4px; background-color: #333a45; border: 1px solid #444; color: #e0e0e0;">
                                </div>
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #e0e0e0;">Street Address:</label>
                                    <input type="text" id="streetInput" value="${user.street || ''}" style="width: 100%; padding: 8px; border-radius: 4px; background-color: #333a45; border: 1px solid #444; color: #e0e0e0;">
                                </div>
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #e0e0e0;">City:</label>
                                    <input type="text" id="cityInput" value="${user.city || ''}" style="width: 100%; padding: 8px; border-radius: 4px; background-color: #333a45; border: 1px solid #444; color: #e0e0e0;">
                                </div>
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #e0e0e0;">Province:</label>
                                    <input type="text" id="provinceInput" value="${user.province || ''}" style="width: 100%; padding: 8px; border-radius: 4px; background-color: #333a45; border: 1px solid #444; color: #e0e0e0;">
                                </div>
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #e0e0e0;">Postal Code:</label>
                                    <input type="text" id="postalCodeInput" value="${user.postal_code || ''}" style="width: 100%; padding: 8px; border-radius: 4px; background-color: #333a45; border: 1px solid #444; color: #e0e0e0;">
                                </div>
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #e0e0e0;">Events Attended:</label>
                                    <input type="number" id="eventsAttendedInput" value="${user.events_attended || '0'}" style="width: 100%; padding: 8px; border-radius: 4px; background-color: #333a45; border: 1px solid #444; color: #e0e0e0;">
                                </div>
                            </div>
                        </div>
                        
                        <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                            <button type="submit" class="btn primary-btn" style="background-color: #28a745; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer;">
                                <i class="fas fa-save"></i> Save Changes
                            </button>
                            <button type="button" id="cancelEditBtn" class="btn secondary-btn" style="background-color: #6c757d; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer;">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // Append modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listeners to modal buttons
        document.querySelector('#editUserModal .close').addEventListener('click', () => {
            document.getElementById('editUserModal').remove();
        });
        
        document.getElementById('cancelEditBtn').addEventListener('click', () => {
            document.getElementById('editUserModal').remove();
        });
        
        // Add form submission handler
        document.getElementById('editUserForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form values
            const updatedUser = {
                member_id: document.getElementById('memberIdInput').value,
                full_name: document.getElementById('fullNameInput').value,
                username: document.getElementById('usernameInput').value,
                email: document.getElementById('emailInput').value,
                phone: document.getElementById('phoneInput').value,
                date_of_birth: document.getElementById('dobInput').value || null,
                membership_status: document.getElementById('membershipStatusInput').value,
                role: document.getElementById('roleInput').value,
                car_models: document.getElementById('carModelsInput').value.split(',').map(model => model.trim()).filter(model => model),
                street: document.getElementById('streetInput').value,
                city: document.getElementById('cityInput').value,
                province: document.getElementById('provinceInput').value,
                postal_code: document.getElementById('postalCodeInput').value,
                events_attended: parseInt(document.getElementById('eventsAttendedInput').value) || 0,
                updated_at: new Date().toISOString()
            };
            
            try {
                // Update user in database
                const { error } = await window.supabaseClient
                    .from('profiles')
                    .update(updatedUser)
                    .eq('id', userId);
                
                if (error) {
                    console.error('Error updating user:', error);
                    alert('Failed to update user: ' + error.message);
                    return;
                }
                
                // Close modal and reload users table
                document.getElementById('editUserModal').remove();
                alert('User updated successfully');
                loadUsersTable();
                
            } catch (error) {
                console.error('Error in update user form submission:', error);
                alert('Failed to update user: ' + error.message);
            }
        });
        
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
        console.error('Error showing edit user modal:', error);
        alert('Failed to show edit user form: ' + error.message);
    }
}

// Add the missing addEventRegistrationActionListeners function
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
        btn.addEventListener('click', async () => {
            const regId = btn.getAttribute('data-reg-id');
            console.log('Cancel registration clicked for ID:', regId);
            if (confirm('Are you sure you want to cancel this registration?')) {
                await cancelRegistration(regId);
            }
        });
    });
    
    console.log('Event registration action listeners added successfully');

    // Add listeners for new View Waiver buttons
    document.querySelectorAll('#eventRegistrationsTableBody .view-waiver-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const regId = btn.getAttribute('data-reg-id');
            // We need user_id and event_id to fetch the correct waiver text
            // Let's find the corresponding registration from the loaded data (if possible) or re-fetch minimal details
            // For simplicity here, we assume regId is enough to identify waiver or we might need to adjust data fetching
            console.log('View waiver clicked for registration ID:', regId);
            
            // Find the registration details (user_id, event_id) to fetch the waiver text
            // This requires the `completeRegistrations` array to be accessible or to re-fetch data.
            // For now, let's assume we can get user_id and event_id from the row or re-fetch the registration.
            const registrationRow = btn.closest('tr');
            // This is a simplification; in a real scenario, you'd have user_id and event_id readily available
            // or fetch the specific registration again to get these IDs.
            // For the demo, let's try to get it from a related element if possible, or show a placeholder

            // Fetch the registration again to get user_id and event_id
            const { data: regDetails, error: regErr } = await window.supabaseClient
                .from('event_registrations')
                .select('user_id, event_id')
                .eq('id', regId)
                .single();

            if (regErr || !regDetails) {
                console.error('Could not fetch registration details to get waiver:', regErr);
                alert('Could not load waiver details.');
                return;
            }

            showWaiverDetailsModal(regDetails.user_id, regDetails.event_id);
        });
    });
}

async function cancelRegistration(regId) {
    const supabaseClient = window.supabaseClient;
    if (!supabaseClient || !regId) {
        console.error('Cannot cancel registration: Supabase client not available or registration ID not provided');
        alert('Error: Cannot cancel registration at this time');
        return;
    }
    
    let rpcErrorForCatch = null; // Variable to track if rpcError was already handled

    try {
        console.log('(admin-dashboard.js) Attempting to cancel registration via RPC with ID:', regId);
        
        const now = new Date().toISOString();

        // Call the RPC function
        const { data: rpcData, error: rpcError } = await supabaseClient.rpc('cancel_registration', {
            registration_id: regId,
            cancel_time: now
        });
        
        rpcErrorForCatch = rpcError; // Store rpcError to check in catch block

        if (rpcError) {
            console.error('(admin-dashboard.js) Error calling cancel_registration RPC:', rpcError);
            // Check for specific error messages from the SQL function if available
            if (rpcError.message && rpcError.message.includes('Registration not found or already cancelled')) {
                alert('Registration not found or it was already cancelled.');
            } else {
                alert('Failed to cancel registration: ' + (rpcError.message || 'Unknown RPC error from admin-dashboard.js'));
            }
            throw rpcError; // Re-throw to be caught by the outer catch block
        }

        console.log('(admin-dashboard.js) RPC call successful. Registration cancelled:', rpcData); 
        alert('Registration cancelled successfully');
        
        // Reload the registrations table to reflect the changes
        const searchTerm = document.getElementById('eventSearchInput')?.value || '';
        const eventFilter = document.getElementById('eventFilter')?.value || 'all';
        const registrationStatusFilter = document.getElementById('registrationStatusFilter')?.value || 'active';
        // Ensure loadEventRegistrationsTable is available in this scope or called correctly
        if (typeof loadEventRegistrationsTable === 'function') {
            await loadEventRegistrationsTable(searchTerm, eventFilter, registrationStatusFilter);
        } else {
            console.error('loadEventRegistrationsTable function is not defined in admin-dashboard.js scope');
            alert('Cancellation successful, but could not refresh table.');
        }
        
    } catch (error) {
        console.error('(admin-dashboard.js) Error in cancelRegistration function:', error);
        if (rpcErrorForCatch !== error) { 
           alert('An unexpected error occurred (admin-dashboard.js): ' + (error.message || 'Unknown error'));
        }
    }
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

/**
 * Initialize dashboard menus and sidebar
 */
function initializeDashboardMenus() {
    console.log('Initializing dashboard menus and sidebar...');
    
    try {
        // Get all menu items (from sidebar, top menu, and any other nav-items)
        const menuItems = document.querySelectorAll('.nav-item, .sidebar-nav a, .admin-top-menu-items a');
        console.log(`Found ${menuItems.length} menu items`);
        
        // Get all content sections
        const contentSections = document.querySelectorAll('.dashboard-content-section');
        console.log(`Found ${contentSections.length} content sections`);
        
        if (!menuItems || menuItems.length === 0) {
            console.error('No menu items found in the DOM');
            return;
        }
        
        if (!contentSections || contentSections.length === 0) {
            console.error('No content sections found in the DOM');
            return;
        }
        
        // Get references to elements
        const sidebar = document.querySelector('.admin-sidebar');
        const adminContent = document.querySelector('.admin-content');
        const adminContainer = document.querySelector('.admin-container');
        
        // On mobile, add the with-top-menu class to adjust padding
        if (window.innerWidth <= 768 && adminContainer) {
            adminContainer.classList.add('with-top-menu');
        }
        
        // Handle window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth <= 768 && adminContainer) {
                adminContainer.classList.add('with-top-menu');
                // Ensure sidebar is hidden on mobile by default
                if (sidebar) sidebar.classList.remove('visible');
            } else {
                if (adminContainer) adminContainer.classList.remove('with-top-menu');
                // Ensure sidebar is visible on desktop
                if (sidebar) {
                    sidebar.classList.remove('collapsed');
                    sidebar.classList.remove('visible');
                }
                if (adminContent) adminContent.classList.remove('expanded');
            }
        });
        
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
                
                // Also update the corresponding item in the other menu (top or sidebar)
                const sidebarItem = document.querySelector(`.sidebar-nav a[data-target="${targetId}"]`);
                const topMenuItem = document.querySelector(`.admin-top-menu-items a[data-target="${targetId}"]`);
                
                if (sidebarItem) sidebarItem.classList.add('active');
                if (topMenuItem) topMenuItem.classList.add('active');
                
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
                        loadEventRegistrationsTable('', 'all', 'active');
                        populateEventFilter();
                    }
                    
                    // If we switched to user management, refresh the data
                    if (targetId === 'user-management') {
                        console.log('Switched to user management, refreshing data...');
                        loadUsersTable();
                    }
                    
                    // On mobile, auto-hide the sidebar after selection
                    if (window.innerWidth <= 768 && sidebar) {
                        sidebar.classList.remove('visible');
                    }
                } else {
                    console.error(`Target section not found: ${targetId}`);
                }
            });
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('visible')) {
                // Check if the click was outside the sidebar and not on the toggle button
                if (!sidebar.contains(e.target)) {
                    sidebar.classList.remove('visible');
                }
            }
        });
        
        // Activate dashboard overview by default if nothing else is active
        const activeSections = document.querySelectorAll('.admin-section.active');
        if (activeSections.length === 0) {
            const defaultSection = document.querySelector('.nav-item[data-target="dashboard-overview"], .sidebar-nav a[data-target="dashboard-overview"]');
            if (defaultSection) {
                console.log('No active section found, activating dashboard overview');
                defaultSection.click();
            } else {
                console.error('Default dashboard overview menu item not found');
                // Fallback: activate the first menu item
                if (menuItems.length > 0) {
                    console.log('Activating first available menu item');
                    menuItems[0].click();
                }
            }
        } else {
            console.log(`Found ${activeSections.length} already active section(s)`);
        }
        
        console.log('Dashboard menus and sidebar initialized successfully');
    } catch (error) {
        console.error('Error initializing dashboard menus:', error);
    }
}

// Add this function to initialize the sort functionality for both tables
function initializeTableSorting() {
    console.log('Initializing table sorting...');
    
    try {
        // Set up user table column header sorting
        const usersTable = document.getElementById('usersTable');
        if (usersTable) {
            const headers = usersTable.querySelectorAll('thead th');
            
            // Map the table headers to the corresponding database columns for sorting
            const userColumnMap = {
                0: 'member_id',       // Member ID column
                1: 'full_name',       // Full Name column
                2: 'email',           // Email column
                3: 'phone',           // Phone column
                4: 'membership_status', // Membership Status column
                5: 'role',            // Role column
                6: 'created_at'       // Joined (created_at) column
            };
            
            headers.forEach((header, index) => {
                // Skip the Actions column (last column)
                if (index < headers.length - 1 && userColumnMap[index]) {
                    header.style.cursor = 'pointer';
                    header.setAttribute('data-column', userColumnMap[index]);
                    
                    // Add an information icon to indicate the column is sortable
                    header.innerHTML = `${header.textContent} <i class="sort-icon"></i>`;
                    
                    header.addEventListener('click', function() {
                        const column = this.getAttribute('data-column');
                        
                        // Toggle sort direction if clicking on the same column
                        let direction = 'asc';
                        if (column === userTableSortColumn) {
                            direction = userTableSortDirection === 'asc' ? 'desc' : 'asc';
                        }
                        
                        // Get current search and filter values
                        const searchTerm = document.getElementById('userSearchInput').value;
                        const statusFilter = document.getElementById('userStatusFilter').value;
                        
                        // Reload the table with the new sort parameters
                        loadUsersTable(searchTerm, statusFilter, column, direction);
                    });
                }
            });
        }
        
        // Set up event registrations table column header sorting
        const eventTable = document.getElementById('eventRegistrationsTable');
        if (eventTable) {
            const headers = eventTable.querySelectorAll('thead th');
            
            // Map the event table headers to the corresponding database columns for sorting
            const eventColumnMap = {
                0: 'event_id',        // Event Name column (using event_id for sorting)
                1: 'user_id',         // User column (using user_id for sorting) 
                4: 'vehicle_model',   // Vehicle Model column
                5: 'registered_at',   // Registered At column
                6: 'cancelled_at',     // Status column (using cancelled_at for sorting)
                7: 'waiver_signed'    // Waiver Signed? column (client-side sort)
            };
            
            headers.forEach((header, index) => {
                // Skip the Actions column (last column) and columns without direct mapping
                if (index < headers.length - 1 && eventColumnMap[index]) {
                    header.style.cursor = 'pointer';
                    header.setAttribute('data-column', eventColumnMap[index]);
                    
                    // Add an information icon to indicate the column is sortable
                    header.innerHTML = `${header.textContent} <i class="sort-icon"></i>`;
                    
                    header.addEventListener('click', function() {
                        const column = this.getAttribute('data-column');
                        
                        // Toggle sort direction if clicking on the same column
                        let direction = 'asc';
                        if (column === eventTableSortColumn) {
                            direction = eventTableSortDirection === 'asc' ? 'desc' : 'asc';
                        }
                        
                        // Get current search and filter values
                        const searchTerm = document.getElementById('eventSearchInput').value;
                        const eventFilter = document.getElementById('eventFilter').value;
                        const statusFilter = document.getElementById('registrationStatusFilter').value;
                        
                        // Reload the table with the new sort parameters
                        loadEventRegistrationsTable(searchTerm, eventFilter, statusFilter, column, direction);
                    });
                }
            });
        }
        
        console.log('Table sorting initialized successfully');
    } catch (error) {
        console.error('Error initializing table sorting:', error);
    }
}

// Update this function to also add the CSS variable for the active sort column
function updateTableSortIndicators(tableId, sortColumn, sortDirection) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const headers = table.querySelectorAll('thead th');
    let sortColumnIndex = -1;
    
    headers.forEach((header, index) => {
        const column = header.getAttribute('data-column');
        const icon = header.querySelector('.sort-icon');
        
        if (!icon) return;
        
        if (column === sortColumn) {
            icon.className = 'sort-icon fas fa-sort-' + (sortDirection === 'asc' ? 'up' : 'down');
            icon.style.marginLeft = '5px';
            icon.style.color = '#00e676';
            sortColumnIndex = index + 1; // CSS nth-child is 1-based
        } else {
            icon.className = 'sort-icon fas fa-sort';
            icon.style.marginLeft = '5px';
            icon.style.color = '#aaa';
        }
    });
    
    // Set the CSS variable for highlighting the sorted column
    if (sortColumnIndex > 0) {
        table.style.setProperty('--sort-column-index', sortColumnIndex);
    }
}

async function showWaiverDetailsModal(userId, eventId) {
    console.log(`Showing waiver details for User ID: ${userId}, Event ID: ${eventId}`);
    
    try {
        const { data: waiverData, error } = await window.supabaseClient
            .from('event_waivers')
            .select('waiver_text, signed_at, participant_name, vehicle_model_year, license_plate, signature_text') // Added new fields
            .eq('user_id', userId)
            .eq('event_id', eventId)
            .single(); // Assuming one waiver per user per event

        if (error || !waiverData) {
            console.error('Error fetching waiver text:', error);
            alert('Could not load waiver text. Has it been signed?');
            return;
        }

        const modalHTML = `
            <div id="viewWaiverModal" class="modal waiver-details-modal" style="display: block;"> 
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2>Signed Event Waiver</h2>
                    
                    <div class="waiver-info-grid">
                        <div class="info-section">
                            <h4>Participant Details</h4>
                            <p><strong>Name:</strong> ${waiverData.participant_name || 'N/A'}</p>
                            <p><strong>Signature (Digital):</strong> ${waiverData.signature_text || 'N/A'}</p>
                            <p><strong>Signed At:</strong> ${formatDate(waiverData.signed_at)}</p>
                        </div>
                        <div class="info-section">
                            <h4>Vehicle Details</h4>
                            <p><strong>Model / Year:</strong> ${waiverData.vehicle_model_year || 'N/A'}</p>
                            <p><strong>License Plate:</strong> ${waiverData.license_plate || 'N/A'}</p>
                        </div>
                    </div>

                    <h4>Full Waiver Text</h4>
                    <div class="waiver-full-text-container">
                        <pre class="waiver-full-text">${waiverData.waiver_text || 'Waiver text not available.'}</pre>
                    </div>

                    <div class="modal-actions">
                        <button id="downloadWaiverBtn" class="btn secondary-btn"><i class="fas fa-download"></i> Download PDF</button> <!-- Changed to PDF -->
                        <button id="closeWaiverViewBtn" class="btn primary-btn">Close</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modalElement = document.getElementById('viewWaiverModal');

        modalElement.querySelector('.close').addEventListener('click', () => {
            modalElement.remove();
        });
        document.getElementById('closeWaiverViewBtn').addEventListener('click', () => {
            modalElement.remove();
        });

        document.getElementById('downloadWaiverBtn').addEventListener('click', () => {
            // PDF generation will be implemented here in Phase 2
            // alert('PDF download functionality will be added soon! For now, you can copy the text.');
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            const participantName = waiverData.participant_name || 'N/A';
            const signatureText = waiverData.signature_text || 'N/A';
            const signedAt = formatDate(waiverData.signed_at);
            const vehicleModelYear = waiverData.vehicle_model_year || 'N/A';
            const licensePlate = waiverData.license_plate || 'N/A';
            const fullWaiverText = waiverData.waiver_text || 'Waiver text not available.';

            // --- PDF Content ---
            const pageMargin = 10;
            const pageHeight = doc.internal.pageSize.height;
            const pageWidth = doc.internal.pageSize.width;
            const usableWidth = pageWidth - 2 * pageMargin;
            let currentY = pageMargin + 8;

            // Ensured Main Title Section - Rendered Once
            doc.setFont(undefined, 'bold');
            doc.setFontSize(15);
            const mainTitle = 'TESLA LIGHT SHOW EVENT LIABILITY WAIVER & RELEASE AGREEMENT';
            const titleLines = doc.splitTextToSize(mainTitle, usableWidth - 20);
            doc.text(titleLines, pageWidth / 2, currentY, { align: 'center' });
            currentY += (titleLines.length * 7); // Adjust Y based on number of title lines
            doc.setFont(undefined, 'normal');
            currentY += 8; // Space after the main title

            // Full Waiver Text Content - Font size increased
            doc.setFontSize(9.5); // Increased from 8.5pt for better readability
            const waiverTextLineHeight = 5.5; // Adjusted for 9.5pt font (was 5 for 8.5pt)
            
            const lines = doc.splitTextToSize(fullWaiverText, usableWidth);

            lines.forEach(line => {
                if (currentY < pageHeight - pageMargin) { 
                    doc.text(line, pageMargin, currentY);
                    currentY += waiverTextLineHeight;
                } else if (currentY >= pageHeight - pageMargin && lines[lines.length -1] === line) {
                    doc.text(line, pageMargin, currentY);
                    currentY += waiverTextLineHeight; 
                }
            });

            currentY += 8; // Space after waiver text block

            // Participant Details Heading
            doc.setFont(undefined, 'bold');
            doc.setFontSize(11);
            if (currentY < pageHeight - pageMargin) {
                doc.text('Participant Details', pageMargin, currentY);
                currentY += 6;
            }
            doc.setFont(undefined, 'normal');

            // Participant Details Content
            doc.setFontSize(9);
            const detailLineHeight = 5;
            if (currentY < pageHeight - pageMargin) { doc.text(`Name: ${participantName}`, pageMargin, currentY); currentY += detailLineHeight; }
            if (currentY < pageHeight - pageMargin) { doc.text(`Digital Signature: ${signatureText}`, pageMargin, currentY); currentY += detailLineHeight; }
            if (currentY < pageHeight - pageMargin) { doc.text(`Signed At: ${signedAt}`, pageMargin, currentY); currentY += detailLineHeight; }
            currentY += 10; // Space before next section

            // Vehicle Details Heading
            doc.setFont(undefined, 'bold');
            doc.setFontSize(11);
            if (currentY < pageHeight - pageMargin) {
                doc.text('Vehicle Details', pageMargin, currentY);
                currentY += 6;
            }
            doc.setFont(undefined, 'normal');
            
            // Vehicle Details Content
            doc.setFontSize(9);
            if (currentY < pageHeight - pageMargin) { doc.text(`Model / Year: ${vehicleModelYear}`, pageMargin, currentY); currentY += detailLineHeight; }
            if (currentY < pageHeight - pageMargin) { doc.text(`License Plate: ${licensePlate}`, pageMargin, currentY); currentY += detailLineHeight; }

            // --- End PDF Content ---

            doc.save(`EventWaiver-${participantName.replace(/\s+/g, '_')}-${eventId}.pdf`);
        });

    } catch (error) {
        console.error('Error displaying waiver details modal:', error);
        alert('Could not display waiver details.');
    }
}
    