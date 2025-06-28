// Add proper Supabase initialization at the top
window.initializeSupabase = () => {
    if (!window.supabaseClient && typeof supabase !== 'undefined') {
        try {
            window.supabaseClient = supabase.createClient(
                'https://qhkcrrphsjpytdfqfamq.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoa2NycnBoc2pweXRkZnFmYW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzMjQ4NzgsImV4cCI6MjA0OTkwMDg3OH0.S9JT_WmCWYMvSixRq1RrB1UlqXm6fix_riLFYCR3JOI'
            );
            console.log('Supabase client initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
        }
    }
    return window.supabaseClient;
};

// Core function to initialize mobile menu - used by both initialization paths
function setupMobileMenu() {
    console.log('Setting up mobile menu');
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const body = document.body;
    
    console.log('Mobile menu elements found:', {
        menuToggle: !!menuToggle, 
        navLinks: !!navLinks
    });
    
    if (!menuToggle || !navLinks) {
        console.warn('Mobile menu elements not found - cannot initialize menu');
        return false;
    }
    
    // Clean up any existing event listeners to prevent duplicates
    // Using cloneNode to remove all event listeners
    const newToggle = menuToggle.cloneNode(true);
    menuToggle.parentNode.replaceChild(newToggle, menuToggle);
    
    // Add brand logo to the mobile menu only if it doesn't exist
    // and we're not on events.html (which has its own logo implementation)
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    if (!navLinks.querySelector('.nav-brand') && currentPath !== 'events.html') {
        const brandLogo = document.createElement('div');
        brandLogo.className = 'nav-brand';
        brandLogo.innerHTML = `
            <img src="https://i.postimg.cc/BvmtNLtB/logo.png" alt="Blitz Tesla Club Logo">
        `;
        navLinks.prepend(brandLogo);
    }
    
    // Function to toggle menu state
    const toggleMenu = () => {
        console.log('Toggling mobile menu');
        navLinks.classList.toggle('active');
        
        // Toggle nav-open class on toggle button and body
        body.classList.toggle('nav-open');
        newToggle.classList.toggle('nav-open');
        
        // Add aria attributes for accessibility
        const expanded = navLinks.classList.contains('active');
        newToggle.setAttribute('aria-expanded', expanded);
        
        if (navLinks.classList.contains('active')) {
            // Prevent body scrolling when menu is open
            body.style.overflow = 'hidden';
            body.style.position = 'fixed';
            body.style.width = '100%';
            body.style.height = '100%';
            
            // Focus trap for accessibility
            setTimeout(() => {
                const firstFocusableElement = navLinks.querySelector('a');
                if (firstFocusableElement) firstFocusableElement.focus();
            }, 100);
        } else {
            // Restore scrolling
            body.style.overflow = '';
            body.style.position = '';
            body.style.width = '';
            body.style.height = '';
            
            // Return focus to toggle button
            newToggle.focus();
        }
    };
    
    // Function to close menu
    const closeMenu = () => {
        console.log('Closing mobile menu');
        navLinks.classList.remove('active');
        
        // Remove nav-open class
        body.classList.remove('nav-open');
        newToggle.classList.remove('nav-open');
        newToggle.setAttribute('aria-expanded', 'false');
        
        // Restore scrolling
        body.style.overflow = '';
        body.style.position = '';
        body.style.width = '';
        body.style.height = '';
    };
    
    // Event listeners
    newToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
        console.log('Menu toggle clicked, menu active:', navLinks.classList.contains('active'));
    });
    
    // Close when clicking outside menu
    document.addEventListener('click', (e) => {
        if (navLinks.classList.contains('active') && 
            !navLinks.contains(e.target) && 
            !newToggle.contains(e.target)) {
            closeMenu();
        }
    });
    
    // Close menu when clicking links
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });
    
    // Close menu on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navLinks.classList.contains('active')) {
            closeMenu();
        }
    });
    
    // Handle window resize - close menu on larger screens
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && navLinks.classList.contains('active')) {
            closeMenu();
        }
    });
    
    // Set initial ARIA state
    newToggle.setAttribute('aria-label', 'Toggle navigation menu');
    newToggle.setAttribute('aria-expanded', 'false');
    newToggle.setAttribute('aria-controls', 'nav-links');
    
    // Add ID to nav-links for ARIA controls
    if (!navLinks.id) navLinks.id = 'nav-links';
    
    console.log('Mobile menu setup complete');
    return true;
}

// Quick navigation setup - runs immediately
function setupQuickNavigation() {
    console.log('Setting up quick navigation');
    
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) {
        console.warn('Navigation links element not found');
        return;
    }

    // Get current page path
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    console.log('Current page:', currentPath);

    // Default navigation items (non-logged in state)
    const defaultNavigationItems = [
        { href: 'index.html', icon: 'fas fa-home', text: '', iconOnly: true },
        { href: 'events.html', icon: 'fas fa-calendar', text: 'Events' },
        { href: 'gallery.html', icon: 'fas fa-images', text: 'Gallery' },
        { href: 'member-benefits.html', icon: 'fas fa-gift', text: 'Member Benefits' },
        { href: 'contact.html', icon: 'fas fa-envelope', text: 'Contact' },
        { href: 'about.html', icon: 'fas fa-info-circle', text: 'About Us' },
        { href: 'register.html', icon: 'fas fa-user-plus', text: 'Join Us' },
        { href: 'login.html', icon: 'fas fa-sign-in-alt', text: 'Login' }
    ];

    // Clear existing navigation
    navLinks.innerHTML = '';
    
    // Build navigation
    defaultNavigationItems.forEach(item => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        
        a.href = item.href;
        if (item.id) a.id = item.id;
        
        // Enhanced active state detection
        if (currentPath === item.href || 
            (currentPath === '' && item.href === 'index.html') ||
            (item.href !== 'index.html' && currentPath.startsWith(item.href.split('.')[0]))) {
            a.classList.add('active');
        }
        
        // Add iOS-friendly touch target size
        a.style.minHeight = '44px';
        a.style.padding = item.iconOnly ? '8px' : '8px 16px';
        
        // Add icon-only class if specified
        if (item.iconOnly) {
            a.classList.add('icon-only');
            a.setAttribute('aria-label', 'Home');
            a.innerHTML = `<i class="${item.icon}"></i>`;
        } else {
            a.innerHTML = `<i class="${item.icon}"></i>${item.text}`;
        }
        
        li.appendChild(a);
        navLinks.appendChild(li);
    });

    console.log('Quick navigation setup complete');
}

// Enhanced navigation with auth - runs asynchronously
async function enhanceNavigationWithAuth() {
    console.log('Enhancing navigation with auth data');
    
    try {
        // Initialize Supabase if not already done
        const supabase = window.initializeSupabase();
        if (!supabase) {
            console.warn('Supabase not available for auth enhancement');
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;

        // Update navigation based on auth status
        if (session) {
            // User is logged in - update to logged-in navigation
            const loggedInItems = [
                { href: 'index.html', icon: 'fas fa-home', text: '', iconOnly: true },
                { href: 'dashboard.html', icon: 'fas fa-tachometer-alt', text: 'Dashboard' },
                { href: 'events.html', icon: 'fas fa-calendar', text: 'Events' },
                { href: 'gallery.html', icon: 'fas fa-images', text: 'Gallery' },
                { href: 'member-benefits.html', icon: 'fas fa-gift', text: 'Member Benefits' },
                { href: 'contact.html', icon: 'fas fa-envelope', text: 'Contact' },
                { href: 'about.html', icon: 'fas fa-info-circle', text: 'About Us' },
                { href: '#', icon: 'fas fa-sign-out-alt', text: 'Logout', id: 'logoutBtn' }
            ];

            // Update navigation items
            navLinks.innerHTML = '';
            const currentPath = window.location.pathname.split('/').pop() || 'index.html';
            
            loggedInItems.forEach(item => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                
                a.href = item.href;
                if (item.id) a.id = item.id;
                
                if (currentPath === item.href || 
                    (currentPath === '' && item.href === 'index.html') ||
                    (item.href !== 'index.html' && currentPath.startsWith(item.href.split('.')[0]))) {
                    a.classList.add('active');
                }
                
                a.style.minHeight = '44px';
                a.style.padding = item.iconOnly ? '8px' : '8px 16px';
                
                if (item.iconOnly) {
                    a.classList.add('icon-only');
                    a.setAttribute('aria-label', 'Home');
                    a.innerHTML = `<i class="${item.icon}"></i>`;
                } else {
                    a.innerHTML = `<i class="${item.icon}"></i>${item.text}`;
                }
                
                li.appendChild(a);
                navLinks.appendChild(li);
            });

            // Handle logout
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await supabase.auth.signOut();
                    window.location.href = 'login.html';
                });
            }
        }

        // Set up auth state listener
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                enhanceNavigationWithAuth();
            } else if (event === 'SIGNED_OUT') {
                setupQuickNavigation();
            }
        });

        console.log('Navigation enhanced with auth data');
    } catch (error) {
        console.error('Auth enhancement error:', error);
    }
}

// Main init function - optimized for speed
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded, initializing navigation');
    
    // Set up basic navigation immediately
    setupQuickNavigation();
    setupMobileMenu();
    
    // Enhance with auth data asynchronously (non-blocking)
    setTimeout(() => {
        enhanceNavigationWithAuth();
    }, 100);
});

// For legacy compatibility
const loadNavigation = enhanceNavigationWithAuth;

// Export for global access
window.initializeNavigation = enhanceNavigationWithAuth;
window.setupMobileMenu = setupMobileMenu;
window.setupQuickNavigation = setupQuickNavigation;