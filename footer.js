// Global Footer Generator
function generateFooter() {
    const footer = document.querySelector('footer');
    if (!footer) {
        console.warn('Footer element not found');
        return;
    }

    footer.innerHTML = `
        <div class="footer-content">
            <div class="footer-section">
                <h3>Quick Links</h3>
                <div class="footer-links">
                    <a href="index.html">Home</a>
                    <a href="events.html">Events</a>
                    <a href="gallery.html">Gallery</a>
                    <a href="contact.html">Contact</a>
                    <a href="faq.html">FAQ</a>
                </div>
            </div>
            <div class="footer-section">
                <h3>Member Area</h3>
                <div class="footer-links">
                    <a href="sponsors.html">Our Sponsors</a>
                    <a href="member-benefits.html">Member Benefits</a>
                    <a href="#" id="footerLogoutBtn">Logout</a>
                </div>
            </div>
            <div class="footer-section">
                <h3>Legal</h3>
                <div class="footer-links">
                    <a href="privacy.html">Privacy Policy</a>
                    <a href="terms.html">Terms of Service</a>
                    <a href="about.html">About Us</a>
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
        <div class="footer-bottom">
            <p>© 2025 Blitz T Club. All rights reserved.</p>
            <p class="powered-by">
                Website powered by <a href="http://www.summitpixels.com" target="_blank">SummitPixels</a>
            </p>
        </div>
    `;

    // Handle logout button
    const logoutBtn = document.getElementById('footerLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (window.supabaseClient) {
                await window.supabaseClient.auth.signOut();
                window.location.href = 'login.html';
            }
        });
    }

    // Update footer visibility based on auth status
    updateFooterAuth();
}

// Update footer based on authentication status
function updateFooterAuth() {
    if (!window.supabaseClient) return;

    window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
        const logoutBtn = document.getElementById('footerLogoutBtn');
        if (logoutBtn) {
            logoutBtn.style.display = session ? 'block' : 'none';
        }
    });
}

// Initialize footer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    generateFooter();
});

// Export for global access
window.generateFooter = generateFooter;
window.updateFooterAuth = updateFooterAuth; 