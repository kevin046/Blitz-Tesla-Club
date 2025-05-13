// Add proper Supabase initialization at the top
const initializeSupabase = () => {
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

// Update the auth state listener with error handling
const setupAuthStateListener = () => {
    try {
        const supabase = initializeSupabase();
        if (!supabase) {
            console.warn('Supabase client not available for auth state listener');
            return;
        }
        
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                updateAuthUI(true);
            } else if (event === 'SIGNED_OUT') {
                updateAuthUI(false);
            }
        });
        console.log('Auth state listener set up successfully');
    } catch (error) {
        console.error('Auth state listener error:', error);
    }
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
    
    // Add brand logo to the mobile menu
    if (!navLinks.querySelector('.nav-brand')) {
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

// Main init function
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded, initializing navigation');
    try {
        // Initialize Supabase if available
        initializeSupabase();
        
        // Set up auth state change listener
        setupAuthStateListener();
        
        // Initialize navigation items if we have Supabase
        if (window.supabaseClient) {
            initializeNavigation().catch(err => {
                console.error('Error in navigation initialization:', err);
                // If navigation fails, still try to set up mobile menu
                setupMobileMenu();
            });
        } else {
            console.warn('Supabase client not available, skipping dynamic navigation');
            // Even without Supabase, we can still set up the mobile menu
            setupMobileMenu();
        }
    } catch (error) {
        console.error('Error in navigation initialization:', error);
        // Always try to set up mobile menu even if everything else fails
        setupMobileMenu();
    }
});

// Function to initialize navigation
async function initializeNavigation() {
    console.log('Initializing navigation items');
    
    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        
        // Get navigation element
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) {
            console.warn('Navigation links element not found');
            return;
        }

        // Get current page path
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        console.log('Current page:', currentPath);

        // Define navigation items based on auth status
        const navigationItems = session ? [
            // Navigation items for logged-in users
            { href: 'index.html', icon: 'fas fa-home', text: '', iconOnly: true },
            { href: 'dashboard.html', icon: 'fas fa-tachometer-alt', text: 'Dashboard' },
            { href: 'events.html', icon: 'fas fa-calendar', text: 'Events' },
            { href: 'gallery.html', icon: 'fas fa-images', text: 'Gallery' },
            { href: 'news.html', icon: 'fas fa-newspaper', text: 'News' },
            { href: 'contact.html', icon: 'fas fa-envelope', text: 'Contact' },
            { href: 'crypto.html', icon: 'fas fa-dollar-sign', text: '$BLITZTCLUB' },
            { href: '#', icon: 'fas fa-sign-out-alt', text: 'Logout', id: 'logoutBtn' }
        ] : [
            // Navigation items for non-logged-in users
            { href: 'index.html', icon: 'fas fa-home', text: '', iconOnly: true },
            { href: 'events.html', icon: 'fas fa-calendar', text: 'Events' },
            { href: 'gallery.html', icon: 'fas fa-images', text: 'Gallery' },
            { href: 'news.html', icon: 'fas fa-newspaper', text: 'News' },
            { href: 'contact.html', icon: 'fas fa-envelope', text: 'Contact' },
            { href: 'crypto.html', icon: 'fas fa-dollar-sign', text: '$BLITZTCLUB' },
            { href: 'register.html', icon: 'fas fa-user-plus', text: 'Join Us' },
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

        // Handle logout if user is logged in
        if (session) {
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await window.supabaseClient.auth.signOut();
                    window.location.href = 'login.html';
                });
            }
        }

        // Set up mobile menu after creating nav items
        console.log('Navigation items created, setting up mobile menu');
        setupMobileMenu();
        
        // Trigger event for other scripts that might need to know navigation is ready
        document.dispatchEvent(new CustomEvent('navigation:updated'));
        console.log('Navigation initialization complete');
    } catch (error) {
        console.error('Navigation initialization error:', error);
        // If navigation initialization fails, still set up the mobile menu
        setupMobileMenu();
    }
}

// Update authentication UI
function updateAuthUI(isLoggedIn) {
    const loginItem = document.querySelector('a[href="login.html"]')?.parentElement;
    const logoutItem = document.getElementById('logoutBtn')?.parentElement;
    const registerItem = document.querySelector('a[href="register.html"]')?.parentElement;
    const dashboardItem = document.querySelector('a[href="dashboard.html"]')?.parentElement;
    
    if (loginItem) loginItem.style.display = isLoggedIn ? 'none' : 'block';
    if (registerItem) registerItem.style.display = isLoggedIn ? 'none' : 'block';
    if (logoutItem) logoutItem.style.display = isLoggedIn ? 'block' : 'none';
    if (dashboardItem) dashboardItem.style.display = isLoggedIn ? 'block' : 'none';
}

// For legacy compatibility
const loadNavigation = initializeNavigation;

// Export for global access
window.initializeNavigation = initializeNavigation;
window.setupMobileMenu = setupMobileMenu; 