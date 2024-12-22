// Initialize Supabase client
const supabaseUrl = 'https://qhkcrrphsjpytdfqfamq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoa2NycnBoc2pweXRkZnFmYW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzMjQ4NzgsImV4cCI6MjA0OTkwMDg3OH0.S9JT_WmCWYMvSixRq1RrB1UlqXm6fix_riLFYCR3JOI';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Function to initialize navigation
async function initializeNavigation() {
    // Get current session
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    
    // Get navigation element
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    // Get current page path
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    // Define navigation items based on auth status
    const navigationItems = session ? [
        // Navigation items for logged-in users
        { href: 'index.html', icon: 'fas fa-home', text: 'Home' },
        { href: 'dashboard.html', icon: 'fas fa-tachometer-alt', text: 'Dashboard' },
        { href: 'events.html', icon: 'fas fa-calendar', text: 'Events' },
        { href: 'gallery.html', icon: 'fas fa-images', text: 'Gallery' },
        { href: 'news.html', icon: 'fas fa-newspaper', text: 'News' },
        { href: '#', icon: 'fas fa-sign-out-alt', text: 'Logout', id: 'logoutBtn' }
    ] : [
        // Navigation items for non-logged-in users
        { href: 'index.html', icon: 'fas fa-home', text: 'Home' },
        { href: 'events.html', icon: 'fas fa-calendar', text: 'Events' },
        { href: 'gallery.html', icon: 'fas fa-images', text: 'Gallery' },
        { href: 'news.html', icon: 'fas fa-newspaper', text: 'News' },
        { href: 'login.html', icon: 'fas fa-sign-in-alt', text: 'Login' }
    ];

    // Clear existing navigation
    navLinks.innerHTML = '';
    
    // Build navigation
    navigationItems.forEach(item => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        
        a.href = item.href;
        if (item.id) a.id = item.id;
        if (currentPath === item.href) a.classList.add('active');
        
        a.innerHTML = `<i class="${item.icon}"></i>${item.text}`;
        li.appendChild(a);
        navLinks.appendChild(li);
    });

    // Handle logout if user is logged in
    if (session) {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await supabaseClient.auth.signOut();
                window.location.href = 'login.html';
            });
        }
    }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeNavigation);

// Export for use in other files
window.initializeNavigation = initializeNavigation;
window.supabaseClient = supabaseClient; 