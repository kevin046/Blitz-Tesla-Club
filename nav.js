document.addEventListener('DOMContentLoaded', async () => {
    const supabaseUrl = 'https://qhkcrrphsjpytdfqfamq.supabase.co';
    const supabaseKey = 'your_supabase_key';
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

    // Check if user is logged in
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        // User is logged in, show dashboard navigation
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        // Update navigation to dashboard version
        const nav = document.querySelector('nav');
        nav.innerHTML = `
            <div class="logo">
                <a href="index.html">
                    <img src="https://i.ibb.co/fkrdXZK/Logo4-white.png" alt="Blitz Tesla Club Logo">
                    <span>BLITZ TESLA CLUB</span>
                </a>
            </div>
            <div class="menu-toggle">
                <i class="fas fa-bars"></i>
            </div>
            <ul class="nav-links">
                <li><a href="dashboard.html" ${currentPage === 'dashboard.html' ? 'class="active"' : ''}>
                    <i class="fas fa-home"></i>Dashboard
                </a></li>
                <li><a href="events.html">Events</a></li>
                <li><a href="gallery.html">Gallery</a></li>
                <li><a href="executive.html">Executives</a></li>
                <li><a href="news.html">News</a></li>
                <li><a href="#" id="logoutBtn">
                    <i class="fas fa-sign-out-alt"></i>Logout
                </a></li>
            </ul>
        `;

        // Handle logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                const { error } = await supabaseClient.auth.signOut();
                if (error) {
                    console.error('Error signing out:', error);
                }
                localStorage.removeItem('supabase.auth.token');
                sessionStorage.removeItem('supabase.auth.token');
                window.location.href = 'login.html';
            });
        }

        // Handle mobile menu
        const menuToggle = document.querySelector('.menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        if (menuToggle && navLinks) {
            menuToggle.addEventListener('click', () => {
                navLinks.classList.toggle('active');
            });
        }
    } else {
        // Not logged in, show default navigation
        const nav = document.querySelector('nav');
        if (nav) {
            nav.innerHTML = `
                <div class="logo">
                    <a href="index.html">
                        <img src="https://i.ibb.co/fkrdXZK/Logo4-white.png" alt="Blitz Tesla Club Logo">
                        <span>BLITZ TESLA CLUB</span>
                    </a>
                </div>
                <div class="menu-toggle">
                    <i class="fas fa-bars"></i>
                </div>
                <ul class="nav-links">
                    <li><a href="index.html">Home</a></li>
                    <li><a href="events.html">Events</a></li>
                    <li><a href="gallery.html">Gallery</a></li>
                    <li><a href="executive.html">Executives</a></li>
                    <li><a href="news.html">News</a></li>
                    <li><a href="register.html">Join Us</a></li>
                    <li><a href="login.html">Login</a></li>
                </ul>
            `;
        }

        // If not logged in and trying to access protected pages, redirect to login
        if (window.location.pathname.includes('dashboard.html')) {
            window.location.href = 'login.html';
        }

        // Handle mobile menu for non-logged in users
        const menuToggle = document.querySelector('.menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        if (menuToggle && navLinks) {
            menuToggle.addEventListener('click', () => {
                navLinks.classList.toggle('active');
            });
        }
    }
}); 