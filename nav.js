function createNavigation() {
    const nav = `
    <nav>
        <div class="logo">
            <a href="./index.html">
                <img src="https://i.ibb.co/fkrdXZK/Logo4-white.png" alt="Blitz Tesla Club Logo">
                <span>BLITZ TESLA CLUB</span>
            </a>
        </div>
        <div class="menu-toggle" aria-label="Toggle navigation menu">
            <i class="fas fa-bars"></i>
        </div>
        <ul class="nav-links">
            <li><a href="./index.html">Home</a></li>
            <li><a href="./events.html">Events</a></li>
            <li><a href="./gallery.html">Gallery</a></li>
            <li><a href="./executive.html">Executives</a></li>
            <li><a href="./news.html">News</a></li>
            <li><a href="./register.html">Join Us</a></li>
            <li><a href="./login.html">Login</a></li>
        </ul>
    </nav>`;

    const footer = `
    <footer>
        <div class="footer-content">
            <div class="footer-section">
                <h3>Quick Links</h3>
                <div class="footer-links">
                    <a href="./index.html">Home</a>
                    <a href="./events.html">Events</a>
                    <a href="./gallery.html">Gallery</a>
                    <a href="./contact.html">Contact</a>
                </div>
            </div>
            
            <div class="footer-section">
                <h3>Member Area</h3>
                <div class="footer-links">
                    <a href="./login.html">Login</a>
                    <a href="./register.html">Register</a>
                    <a href="./sponsors.html">Our Sponsors</a>
                    <a href="./index.html#member-benefits">Member Benefits</a>
                </div>
            </div>
            
            <div class="footer-section">
                <h3>Legal</h3>
                <div class="footer-links">
                    <a href="./privacy.html">Privacy Policy</a>
                    <a href="./terms.html">Terms of Service</a>
                    <a href="./about.html">About Us</a>
                </div>
            </div>

            <div class="footer-section">
                <h3>Connect With Us</h3>
                <div class="footer-social">
                    <a href="https://x.com/BlitzTClub" target="_blank" aria-label="Follow us on X">
                        <i class="fa-brands fa-square-x-twitter"></i>
                    </a>
                    <a href="https://www.instagram.com/blitztclub/" target="_blank" aria-label="Follow us on Instagram">
                        <i class="fab fa-instagram"></i>
                    </a>
                </div>
            </div>
        </div>
    </footer>`;

    // Insert navigation and footer
    document.querySelector('nav').outerHTML = nav;
    document.querySelector('footer').outerHTML = footer;

    // Mobile navigation functionality
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    let isMenuOpen = false;

    function toggleMenu() {
        isMenuOpen = !isMenuOpen;
        navLinks.style.transform = isMenuOpen ? 'translateX(0)' : 'translateX(100%)';
        navLinks.style.opacity = isMenuOpen ? '1' : '0';
        
        // Update aria-expanded for accessibility
        menuToggle.setAttribute('aria-expanded', isMenuOpen);
        
        // Prevent body scrolling when menu is open
        document.body.style.overflow = isMenuOpen ? 'hidden' : '';
        
        // Update menu icon
        const menuIcon = menuToggle.querySelector('i');
        menuIcon.className = isMenuOpen ? 'fas fa-times' : 'fas fa-bars';
    }

    // Handle menu toggle click
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (isMenuOpen && !navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
            toggleMenu();
        }
    });

    // Close menu when pressing escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isMenuOpen) {
            toggleMenu();
        }
    });

    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth > 768 && isMenuOpen) {
                toggleMenu();
            }
        }, 250);
    });

    // Add touch event handling for iOS
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);

    function handleSwipe() {
        const swipeThreshold = 50;
        const swipeDistance = touchEndX - touchStartX;

        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance > 0 && !isMenuOpen) {
                // Swipe right, open menu
                toggleMenu();
            } else if (swipeDistance < 0 && isMenuOpen) {
                // Swipe left, close menu
                toggleMenu();
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', createNavigation); 