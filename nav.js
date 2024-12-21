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
            <i class="fas fa-bars"></i>
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

    const footer = `
    <footer>
        <div class="footer-content">
            <div class="footer-section">
                <h3>Quick Links</h3>
                <div class="footer-links">
                    <a href="./index.html">Home</a>
                    <a href="./events.html">Events</a>
                    <a href="./gallery.html">Gallery</a>
                    <a href="./news.html">News</a>
                </div>
            </div>
            
            <div class="footer-section">
                <h3>Member Area</h3>
                <div class="footer-links">
                    <a href="./login.html">Login</a>
                    <a href="./register.html">Register</a>
                    <a href="./executive.html">Our Team</a>
                    <a href="./index.html#member-benefits">Member Benefits</a>
                </div>
            </div>
            
            <div class="footer-section">
                <h3>About</h3>
                <div class="footer-links">
                    <a href="./about.html">About Us</a>
                    <a href="./contact.html">Contact</a>
                    <a href="./sponsors.html">Our Sponsors</a>
                    <a href="./privacy.html">Privacy Policy</a>
                    <a href="./terms.html">Terms of Service</a>
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
    const navOverlay = document.querySelector('.nav-overlay');
    let isMenuOpen = false;

    function toggleMenu() {
        isMenuOpen = !isMenuOpen;
        
        // Toggle menu visibility
        navLinks.classList.toggle('active');
        navOverlay.classList.toggle('active');
        
        // Update ARIA attributes and icon
        menuToggle.setAttribute('aria-expanded', isMenuOpen);
        const menuIcon = menuToggle.querySelector('i');
        menuIcon.className = isMenuOpen ? 'fas fa-times' : 'fas fa-bars';
        
        // Toggle body scroll
        document.body.classList.toggle('menu-open');
        
        // Add animation classes to nav items
        const navItems = navLinks.querySelectorAll('li');
        navItems.forEach((item, index) => {
            if (isMenuOpen) {
                item.style.transitionDelay = `${index * 0.1}s`;
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