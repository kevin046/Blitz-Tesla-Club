const supabaseUrl = 'https://qhkcrrphsjpytdfqfamq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoa2NycnBoc2pweXRkZnFmYW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzMjQ4NzgsImV4cCI6MjA0OTkwMDg3OH0.S9JT_WmCWYMvSixRq1RrB1UlqXm6fix_riLFYCR3JOI';

async function checkLoginStatus() {
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    const dashboardElements = document.querySelectorAll('.dashboard-access, .member-only');
    const loginElements = document.querySelectorAll('.login-required');
    const logoutElements = document.querySelectorAll('.logout-btn');

    const currentPage = window.location.pathname;

    if (session) {
        dashboardElements.forEach(el => el.style.display = 'block');
        loginElements.forEach(el => el.style.display = 'none');
        logoutElements.forEach(el => el.style.display = 'block');
        
        if (currentPage.includes('events')) {
            const memberContent = document.querySelector('.member-only');
            if (memberContent) memberContent.style.display = 'block';
        }
    } else {
        dashboardElements.forEach(el => el.style.display = 'none');
        loginElements.forEach(el => el.style.display = 'block');
        logoutElements.forEach(el => el.style.display = 'none');
        
        if (currentPage.includes('events')) {
            const memberContent = document.querySelector('.member-only');
            if (memberContent) memberContent.style.display = 'none';
        }
        
        if (currentPage.includes('dashboard')) {
            window.location.href = '/login';
        }
    }
}

async function handleLogout(event) {
    event.preventDefault();
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    const { error } = await supabaseClient.auth.signOut();
    if (!error) {
        window.location.href = './index.html';
    }
} 