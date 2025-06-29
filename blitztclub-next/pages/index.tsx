import Head from 'next/head';
import '../styles/globals.css';
import '../styles/Home.module.css';

export default function Home() {
  return (
    <>
      <Head>
        <title>Blitz T Club - Home</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, minimal-ui" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" type="image/png" href="https://i.postimg.cc/BvmtNLtB/logo.png" />
        <link rel="apple-touch-icon" href="https://i.postimg.cc/BvmtNLtB/logo.png" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>
      <body className="home-page">
        <nav>
          <div className="logo">
            <a href="/">
              <img src="https://i.ibb.co/fkrdXZK/Logo4-white.png" alt="Blitz Tesla Club Logo" loading="lazy" width="50" height="50" />
              <span>BLITZ T CLUB</span>
            </a>
          </div>
          <button className="menu-toggle" aria-label="Toggle navigation menu" aria-expanded="false" aria-controls="nav-links">
            <i className="fas fa-bars"></i>
          </button>
          <ul className="nav-links" id="nav-links">
            {/* Navigation items can be added here or as a component */}
          </ul>
        </nav>
        <main>
          <section className="hero" id="home">
            <div className="hero-logo">
              <img src="https://i.postimg.cc/BvmtNLtB/logo.png" alt="Blitz Tesla Club Logo" width="200" height="200" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://i.ibb.co/fkrdXZK/Logo4-white.png'; }} />
            </div>
            <h1 className="hero-tagline">Experience the <span style={{whiteSpace: 'nowrap'}}>Future</span> of Driving</h1>
            <div className="cta-buttons">
              <a href="/register" className="btn">Join Now</a>
              <a href="/events" className="btn btn-outline">Upcoming Events</a>
            </div>
            <div className="scroll-indicator">
              <i className="fas fa-chevron-down"></i>
            </div>
          </section>
        </main>
        <footer>
          <div className="footer-content">
            <div className="footer-section">
              <h3>Quick Links</h3>
              <div className="footer-links">
                <a href="/">Home</a>
                <a href="/events">Events</a>
                <a href="/gallery">Gallery</a>
                <a href="/contact">Contact</a>
                <a href="/faq">FAQ</a>
              </div>
            </div>
            <div className="footer-section">
              <h3>Member Area</h3>
              <div className="footer-links">
                <a href="/sponsors">Our Sponsors</a>
                <a href="/member-benefits">Member Benefits</a>
                <a href="#" id="footerLogoutBtn">Logout</a>
              </div>
            </div>
            <div className="footer-section">
              <h3>Legal</h3>
              <div className="footer-links">
                <a href="/privacy">Privacy Policy</a>
                <a href="/terms">Terms of Service</a>
                <a href="/about">About Us</a>
              </div>
            </div>
            <div className="footer-section">
              <h3>Connect With Us</h3>
              <div className="footer-social">
                <a href="https://x.com/BlitzTClub" target="_blank" rel="noopener" aria-label="Follow us on X">
                  <i className="fa-brands fa-square-x-twitter"></i>
                </a>
                <a href="https://www.instagram.com/blitztclub/" target="_blank" rel="noopener" aria-label="Follow us on Instagram">
                  <i className="fab fa-instagram"></i>
                </a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 Blitz T Club. All rights reserved.</p>
            <p className="powered-by">
              Website powered by <a href="http://www.summitpixels.com" target="_blank" rel="noopener">SummitPixels</a>
            </p>
          </div>
        </footer>
      </body>
    </>
  );
}
