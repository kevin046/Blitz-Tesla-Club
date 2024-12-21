// Add this to handle back button navigation
window.onpopstate = function(event) {
    if (document.referrer.includes('register.html')) {
        window.location.href = 'register.html';
    }
};

// Update your Join Us button click handler
document.querySelector('.join-us-btn').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.replace('register.html');
}); 