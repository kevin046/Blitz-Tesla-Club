function createNavigation() {
    const nav = document.querySelector('nav');
    nav.innerHTML = `
        <div class="logo">
            <a href="/">
                <img src="https://i.ibb.co/fkrdXZK/Logo4-white.png" alt="Blitz Tesla Club Logo">
                <span>BLITZ TESLA CLUB</span>
            </a>
        </div>
        <div class="menu-toggle">
            <i class="fas fa-bars"></i>
        </div>
        <ul class="nav-links">
            <li><a href="/">Home</a></li>
            <li><a href="/events">Events</a></li>
            <li><a href="/gallery">Gallery</a></li>
            <li><a href="/executive">Executives</a></li>
            <li><a href="/news">News</a></li>
            <li class="login-required"><a href="/register">Join Us</a></li>
            <li class="login-required"><a href="/login">Login</a></li>
            <li class="dashboard-access" style="display: none;"><a href="/dashboard">Dashboard</a></li>
            <li class="logout-btn" style="display: none;"><a href="#" onclick="handleLogout(event)">Logout</a></li>
        </ul>
    `;
}

document.addEventListener('DOMContentLoaded', createNavigation); 