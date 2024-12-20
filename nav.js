function createNavigation() {
    const nav = `
    <nav>
        <div class="logo">
            <a href="./index.html">
                <img src="https://i.ibb.co/fkrdXZK/Logo4-white.png" alt="Blitz Tesla Club Logo">
                <span>BLITZ TESLA CLUB</span>
            </a>
        </div>
        <div class="menu-toggle">
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

    // Insert navigation
    document.querySelector('nav').outerHTML = nav;
    document.querySelector('footer').outerHTML = footer;
}

document.addEventListener('DOMContentLoaded', createNavigation); 