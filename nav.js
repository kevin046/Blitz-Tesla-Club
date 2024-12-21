function createNavigation() {
    const nav = `
    <nav>
        <div class="logo">
            <a href="./index.html">
                <img src="https://i.ibb.co/fkrdXZK/Logo4-white.png" alt="Blitz Tesla Club Logo">
                <span>BLITZ TESLA CLUB</span>
            </a>
        </div>
        <button class="menu-toggle" aria-label="Toggle navigation menu" aria-expanded="false">
            <span>Menu</span>
        </button>
        <div class="nav-overlay"></div>
        <ul class="nav-links">
            <li><a href="./index.html">Home</a></li>
            <li><a href="./events.html">Events</a></li>
            <li><a href="./gallery.html">Gallery</a></li>
            <li><a href="./news.html">News</a></li>
            <li><a href="./register.html">Join Us</a></li>
            <li><a href="./login.html">Login</a></li>
        </ul>
    </nav>`;

    // Insert navigation
    document.querySelector('nav').outerHTML = nav;

    // Mobile navigation functionality
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navOverlay = document.querySelector('.nav-overlay');
    let isMenuOpen = false;

    function toggleMenu() {
        isMenuOpen = !isMenuOpen;
        
        // Toggle menu visibility
        navLinks.classList.toggle('active');
        navOverlay.classList.toggle('active');
        
        // Update ARIA attributes and text
        menuToggle.setAttribute('aria-expanded', isMenuOpen);
        menuToggle.innerHTML = isMenuOpen ? '<span>Close</span>' : '<span>Menu</span>';
        
        // Toggle body scroll
        document.body.classList.toggle('menu-open');
        
        // Add animation classes to nav items with staggered delay
        const navItems = navLinks.querySelectorAll('li');
        navItems.forEach((item, index) => {
            if (isMenuOpen) {
                item.style.transitionDelay = `${index * 0.05}s`;
                item.classList.add('show');
            } else {
                item.style.transitionDelay = '0s';
                item.classList.remove('show');
            }
        });
    }

    // Handle menu toggle click
    menuToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu();
    });

    // Close menu when clicking overlay
    navOverlay.addEventListener('click', toggleMenu);

    // Close menu when pressing escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isMenuOpen) {
            toggleMenu();
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && isMenuOpen) {
            toggleMenu();
        }
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (isMenuOpen) {
                toggleMenu();
            }
        });
    });
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', createNavigation); 