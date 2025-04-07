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

    // Update logo text if it exists
    const logoSpan = document.querySelector('.logo span');
    if (logoSpan) {
        logoSpan.textContent = 'BLITZ T CLUB';
    }

    // Update logo image if it exists
    const logoImg = document.querySelector('.logo img');
    if (logoImg) {
        logoImg.src = 'https://i.ibb.co/fkrdXZK/Logo4-white.png';
        logoImg.alt = 'Blitz Tesla Club Logo';
    }

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
        { href: 'crypto.html', icon: 'fas fa-dollar-sign', text: '$BLITZTCLUB' },
        { href: '#', icon: 'fas fa-sign-out-alt', text: 'Logout', id: 'logoutBtn' }
    ] : [
        // Navigation items for non-logged-in users
        { href: 'index.html', icon: 'fas fa-home', text: 'Home' },
        { href: 'events.html', icon: 'fas fa-calendar', text: 'Events' },
        { href: 'gallery.html', icon: 'fas fa-images', text: 'Gallery' },
        { href: 'news.html', icon: 'fas fa-newspaper', text: 'News' },
        { href: 'crypto.html', icon: 'fas fa-dollar-sign', text: '$BLITZTCLUB' },
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
        
        // Add iOS-friendly touch target size
        a.style.minHeight = '44px';
        a.style.padding = '12px';
        
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

    // Add iOS-specific optimizations
    if (CSS.supports('-webkit-touch-callout', 'none')) {
        document.body.style.webkitTextSizeAdjust = 'none';
        document.body.style.webkitTapHighlightColor = 'transparent';
        document.documentElement.style.webkitOverflowScrolling = 'touch';
        
        // Add safe area insets
        const nav = document.querySelector('nav');
        if (nav) {
            nav.style.paddingTop = 'env(safe-area-inset-top)';
        }
        
        const footer = document.querySelector('footer');
        if (footer) {
            footer.style.paddingBottom = 'env(safe-area-inset-bottom)';
        }
    }

    // Initialize the mobile menu
    initializeMobileMenu();
}

// Function to handle mobile menu behavior
function initializeMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const body = document.body;
    
    if (!menuToggle || !navLinks) return;
    
    // Remove any existing event listeners (in case this function runs multiple times)
    menuToggle.removeEventListener('click', toggleMobileMenu);
    
    // Add click event listener to toggle button
    menuToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleMobileMenu();
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (navLinks.classList.contains('active') && 
            !navLinks.contains(e.target) && 
            !menuToggle.contains(e.target)) {
            closeMobileMenu();
        }
    });
    
    // Close menu when clicking a navigation link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            closeMobileMenu();
        });
    });
    
    // Close menu with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navLinks.classList.contains('active')) {
            closeMobileMenu();
        }
    });
}

// Function to toggle mobile menu state
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    const menuToggle = document.querySelector('.menu-toggle');
    const body = document.body;
    
    if (!navLinks || !menuToggle) return;
    
    navLinks.classList.toggle('active');
    menuToggle.classList.toggle('active');
    body.classList.toggle('nav-open');
    
    // Toggle body scroll lock
    if (navLinks.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        
        // Prevent scrolling on iOS/mobile
        document.addEventListener('touchmove', preventScroll, { passive: false });
    } else {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        
        // Remove scroll prevention
        document.removeEventListener('touchmove', preventScroll);
    }
}

// Function to close mobile menu
function closeMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    const menuToggle = document.querySelector('.menu-toggle');
    const body = document.body;
    
    if (!navLinks || !menuToggle) return;
    
    navLinks.classList.remove('active');
    menuToggle.classList.remove('active');
    body.classList.remove('nav-open');
    body.style.overflow = '';
    body.style.position = '';
    body.style.width = '';
    
    // Remove scroll prevention
    document.removeEventListener('touchmove', preventScroll);
}

// Prevent scrolling function for iOS
function preventScroll(e) {
    e.preventDefault();
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize navigation
    initializeNavigation();
    
    // Ensure consistent URL casing for page links
    const links = document.querySelectorAll('a');
    const pages = ['crypto', 'index', 'events', 'gallery', 'executive', 'news', 'login', 'dashboard'];
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href) {
                // Check for any page variation
                pages.forEach(page => {
                    const regex = new RegExp(`${page}\\.html$`, 'i');
                    if (regex.test(href)) {
                        e.preventDefault();
                        window.location.href = `${page.toLowerCase()}.html`;
                    }
                });
            }
        });
    });
});

// Export for use in other files
window.initializeNavigation = initializeNavigation;
window.supabaseClient = supabaseClient;
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu; 