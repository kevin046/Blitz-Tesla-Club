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

    // Handle mobile menu with improved touch interaction
    const menuToggle = document.querySelector('.menu-toggle');
    const body = document.body;
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
            body.classList.toggle('nav-open');
            
            // Prevent scrolling when menu is open
            if (body.classList.contains('nav-open')) {
                body.style.overflow = 'hidden';
                // Add touch event listener to prevent scrolling
                document.addEventListener('touchmove', preventScroll, { passive: false });
            } else {
                body.style.overflow = '';
                // Remove touch event listener when menu is closed
                document.removeEventListener('touchmove', preventScroll);
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (navLinks.classList.contains('active') && 
                !navLinks.contains(e.target) && 
                !menuToggle.contains(e.target)) {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
                body.classList.remove('nav-open');
                body.style.overflow = '';
                document.removeEventListener('touchmove', preventScroll);
            }
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
                body.classList.remove('nav-open');
                body.style.overflow = '';
                document.removeEventListener('touchmove', preventScroll);
            });
        });

        // Prevent scrolling on iOS
        function preventScroll(e) {
            e.preventDefault();
        }

        // Handle escape key to close menu
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navLinks.classList.contains('active')) {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
                body.classList.remove('nav-open');
                body.style.overflow = '';
                document.removeEventListener('touchmove', preventScroll);
            }
        });
    }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeNavigation);

// Export for use in other files
window.initializeNavigation = initializeNavigation;
window.supabaseClient = supabaseClient; 

function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    const menuToggle = document.querySelector('.menu-toggle');
    navLinks.classList.toggle('active');
    
    // Toggle body scroll lock
    if (navLinks.classList.contains('active')) {
        document.body.classList.add('nav-open');
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
    } else {
        document.body.classList.remove('nav-open');
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
    }
}

// Add event listener to menu toggle
const menuToggle = document.querySelector('.menu-toggle');
if (menuToggle) {
    menuToggle.addEventListener('click', toggleMobileMenu);
}

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    const navLinks = document.querySelector('.nav-links');
    const menuToggle = document.querySelector('.menu-toggle');
    
    if (navLinks && navLinks.classList.contains('active')) {
        if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
            navLinks.classList.remove('active');
            document.body.classList.remove('nav-open');
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        }
    }
});

// Add this to your navigation.js file
document.addEventListener('DOMContentLoaded', function() {
    const links = document.querySelectorAll('a');
    const pages = ['crypto', 'index', 'events', 'gallery', 'executive', 'news', 'login'];
    
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