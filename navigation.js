// Add proper Supabase initialization at the top
const initializeSupabase = () => {
    if (!window.supabaseClient) {
        window.supabaseClient = supabase.createClient(
            'https://qhkcrrphsjpytdfqfamq.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoa2NycnBoc2pweXRkZnFmYW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzMjQ4NzgsImV4cCI6MjA0OTkwMDg3OH0.S9JT_WmCWYMvSixRq1RrB1UlqXm6fix_riLFYCR3JOI'
        );
    }
    return window.supabaseClient;
};

// Update the auth state listener with error handling
const setupAuthStateListener = () => {
    try {
        const supabase = initializeSupabase();
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                updateAuthUI(true);
            } else if (event === 'SIGNED_OUT') {
                updateAuthUI(false);
            }
        });
    } catch (error) {
        console.error('Auth state listener error:', error);
    }
};

// Update initialization sequence
document.addEventListener('DOMContentLoaded', () => {
    try {
        initializeSupabase();
        setupAuthStateListener();
        loadNavigation();
    } catch (error) {
        console.error('Navigation DOMContentLoaded initialization error:', error);
    }
});

// Define initMobileMenu in the global scope so it's accessible by initializeNavigation
const initMobileMenu = () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    console.log('initMobileMenu: menuToggle found?', menuToggle); // Debug log
    console.log('initMobileMenu: navLinks found?', navLinks);   // Debug log
    
    if (!menuToggle || !navLinks) 
        console.warn('Mobile menu elements (.menu-toggle or .nav-links) not found. Menu will not initialize.'); // More specific warning
        return;

    // Toggle mobile menu
    const toggleMenu = () => {
        navLinks.classList.toggle('active');
        menuToggle.querySelector('i').classList.toggle('fa-times');
        document.body.classList.toggle('nav-open');
    };

    // Reset mobile menu state
    const closeMenu = () => {
        navLinks.classList.remove('active');
        menuToggle.querySelector('i').classList.remove('fa-times');
        document.body.classList.remove('nav-open');
    };

    // Menu toggle click handler
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
            closeMenu();
        }
    });

    // Close menu after clicking a link
    // Ensure this runs after navLinks are populated, might need to be re-called or use event delegation if links change
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });
};

// Function to initialize navigation
async function initializeNavigation() {
    if (typeof window.supabaseClient === 'undefined') {
        console.error('Supabase client not initialized');
        return;
    }

    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        
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
                    await window.supabaseClient.auth.signOut();
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

        // Initialize mobile menu after creating nav items
        initMobileMenu();
    } catch (error) {
        console.error('Navigation initialization error:', error);
    }
}

// Update the mobileMenu controller to handle all cases
const mobileMenu = {
    init() {
        this.menuToggle = document.querySelector('.menu-toggle');
        this.navLinks = document.querySelector('.nav-links');
        this.body = document.body;
        
        // Always initialize even if elements missing (fail gracefully)
        try {
            if (!this.menuToggle || !this.navLinks) {
                console.warn('Mobile menu elements missing');
                return;
            }
            
            this.addEventListeners();
            console.log('Mobile menu initialized');
        } catch (error) {
            console.error('Mobile menu init error:', error);
        }
    },

    addEventListeners() {
        // Toggle menu
        this.menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });

        // Close menu on outside click
        document.addEventListener('click', (e) => {
            if (this.navLinks.classList.contains('active') && 
                !e.target.closest('.nav-links') && 
                !e.target.closest('.menu-toggle')) {
                this.closeMenu();
            }
        });

        // Close menu on link click
        this.navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => this.closeMenu());
        });

        // Close menu on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeMenu();
        });

        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.closeMenu(), 300);
        });
    },

    toggleMenu() {
        this.navLinks.classList.toggle('active');
        this.menuToggle.querySelector('i').classList.toggle('fa-times');
        this.body.classList.toggle('nav-open');
        
        if (this.navLinks.classList.contains('active')) {
            this.lockScroll();
        } else {
            this.unlockScroll();
        }
    },

    closeMenu() {
        this.navLinks.classList.remove('active');
        this.menuToggle.querySelector('i').classList.remove('fa-times');
        this.body.classList.remove('nav-open');
        this.unlockScroll();
    },

    lockScroll() {
        if (window.innerWidth <= 768) {
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
        }
    },

    unlockScroll() {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    },

    // Add responsive check
    isMobileView() {
        return window.matchMedia("(max-width: 768px)").matches;
    }
};

// Initialize on DOM load and after navigation updates
document.addEventListener('DOMContentLoaded', () => mobileMenu.init());
document.addEventListener('navigation:updated', () => mobileMenu.init());

// Add missing function definitions
function updateAuthUI(isLoggedIn) {
    const loginItem = document.getElementById('loginBtn');
    const logoutItem = document.getElementById('logoutBtn');
    if (loginItem) loginItem.style.display = isLoggedIn ? 'none' : 'block';
    if (logoutItem) logoutItem.style.display = isLoggedIn ? 'block' : 'none';
}

// Rename initializeNavigation to loadNavigation to match the call
const loadNavigation = initializeNavigation;

// Update the export statements at the bottom
window.initializeNavigation = initializeNavigation;
window.supabaseClient = window.supabaseClient;

// Remove the redundant DOMContentLoaded listener at the end of the file if it only calls initMobileMenu and updateNavItems
// The main DOMContentLoaded listener at the top is now the single point of entry for initialization. 