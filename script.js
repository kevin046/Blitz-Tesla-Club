// Smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.25
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.querySelectorAll('.section-content').forEach((section) => {
    observer.observe(section);
});

// RSVP Button functionality
document.querySelectorAll('.rsvp-btn').forEach(button => {
    button.addEventListener('click', function() {
        alert('RSVP functionality coming soon!');
    });
});

// Add mobile menu functionality
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const navLinksItems = document.querySelectorAll('.nav-links a');

menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    menuToggle.classList.toggle('active');
    document.body.classList.toggle('nav-active');
});

// Close menu when clicking a link
navLinksItems.forEach(item => {
    item.addEventListener('click', () => {
        navLinks.classList.remove('active');
        menuToggle.classList.remove('active');
        document.body.classList.remove('nav-active');
    });
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
        navLinks.classList.remove('active');
        menuToggle.classList.remove('active');
        document.body.classList.remove('nav-active');
    }
});

// Add touch events for mobile scrolling
document.addEventListener('touchstart', handleTouchStart, false);
document.addEventListener('touchmove', handleTouchMove, false);

let xDown = null;
let yDown = null;

function handleTouchStart(evt) {
    xDown = evt.touches[0].clientX;
    yDown = evt.touches[0].clientY;
}

function handleTouchMove(evt) {
    if (!xDown || !yDown) {
        return;
    }

    let xUp = evt.touches[0].clientX;
    let yUp = evt.touches[0].clientY;

    let xDiff = xDown - xUp;
    let yDiff = yDown - yUp;

    if (Math.abs(yDiff) > Math.abs(xDiff)) {
        if (yDiff > 0) {
            // Scrolling up
        } else {
            // Scrolling down
        }
    }
    xDown = null;
    yDown = null;
}
// Login form handling
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    // Password visibility toggle
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');

    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Toggle eye icon
        const eyeIcon = this.querySelector('i');
        eyeIcon.classList.toggle('fa-eye');
        eyeIcon.classList.toggle('fa-eye-slash');
    });

    // Form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;
        
        // Here you would typically send this data to your server
        console.log('Login attempt:', { email, password, remember });
        
        // For demo purposes, show success message
        alert('Login functionality coming soon!');
    });
}

// Registration form handling
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const fullName = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }

        // Here you would typically send this data to your server
        console.log('Registration attempt:', { fullName, email, password });
        alert('Registration functionality coming soon!');
    });
}

// Gallery functionality
const galleryFilters = document.querySelector('.gallery-filters');
const galleryItems = document.querySelectorAll('.gallery-item');
const lightbox = document.getElementById('lightbox');

if (galleryFilters) {
    galleryFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            // Update active button
            document.querySelector('.filter-btn.active').classList.remove('active');
            e.target.classList.add('active');

            // Filter items
            const filter = e.target.dataset.filter;
            galleryItems.forEach(item => {
                if (filter === 'all' || item.dataset.category === filter) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        }
    });
}

// Update video handling in lightbox
function openVideoInLightbox(iframe) {
    const videoUrl = iframe.src;
    const newIframe = document.createElement('iframe');
    // Add YouTube parameters for better quality and control
    newIframe.src = videoUrl + '?autoplay=1&rel=0&showinfo=0&vq=hd1080';
    newIframe.width = '1280';
    newIframe.height = '720';
    newIframe.allowFullscreen = true;
    newIframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    
    lightbox.querySelector('.lightbox-content').appendChild(newIframe);
}

// Update click handler
galleryItems.forEach(item => {
    item.addEventListener('click', () => {
        const iframe = item.querySelector('iframe');
        const img = item.querySelector('img');
        const caption = item.querySelector('h3').textContent;
        
        lightbox.querySelector('.lightbox-content').innerHTML = '';
        lightbox.querySelector('.lightbox-caption').textContent = caption;
        
        if (iframe) {
            openVideoInLightbox(iframe);
        } else if (img) {
            const newImg = img.cloneNode(true);
            lightbox.querySelector('.lightbox-content').appendChild(newImg);
        }
        
        lightbox.classList.add('active');
    });
});

// Update close lightbox to handle videos
function closeLightbox() {
    const iframe = lightbox.querySelector('iframe');
    if (iframe) {
        // Stop video playback by removing the iframe
        iframe.src = '';
    }
    lightbox.classList.remove('active');
}

// Update close button handler
document.querySelector('.close-btn').addEventListener('click', closeLightbox);

// Update outside click handler
lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
        closeLightbox();
    }
});

// Keep only this part for default sorting
function sortGalleryItems(ascending = true) {
    const galleryGrid = document.querySelector('.gallery-grid');
    if (!galleryGrid) return;

    const items = Array.from(galleryGrid.children);
    
    items.sort((a, b) => {
        const dateA = new Date(a.dataset.date || '1970-01-01');
        const dateB = new Date(b.dataset.date || '1970-01-01');
        return ascending ? dateA - dateB : dateB - dateA;
    });
    
    items.forEach(item => galleryGrid.appendChild(item));
}

// Sort items when page loads (ascending = true for oldest to latest)
document.addEventListener('DOMContentLoaded', () => {
    sortGalleryItems(true);
});

// Video handling for gallery
document.addEventListener('DOMContentLoaded', function() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    galleryItems.forEach(item => {
        const iframe = item.querySelector('iframe');
        if (iframe) {
            // Extract video ID from YouTube URL
            const videoId = iframe.src.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
            
            // Create and add thumbnail
            if (videoId) {
                const thumbnail = document.createElement('img');
                thumbnail.className = 'video-thumbnail';
                thumbnail.src = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
                thumbnail.loading = 'lazy';
                item.appendChild(thumbnail);
            }

            // Create placeholder with play button
            const placeholder = document.createElement('div');
            placeholder.className = 'video-placeholder';
            placeholder.innerHTML = `
                <div class="play-button">
                    <i class="fas fa-play"></i>
                </div>
            `;
            item.appendChild(placeholder);

            // Store original source
            const originalSrc = iframe.src;
            iframe.dataset.src = originalSrc;
            iframe.src = '';

            // Handle click on placeholder
            placeholder.addEventListener('click', function(e) {
                e.preventDefault();
                const videoContainer = document.createElement('div');
                videoContainer.className = 'video-lightbox';
                
                const innerContainer = document.createElement('div');
                innerContainer.className = 'video-container';
                
                const videoIframe = document.createElement('iframe');
                videoIframe.src = `${originalSrc}?autoplay=1&playsinline=1&rel=0&controls=1`;
                videoIframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                videoIframe.allowFullscreen = true;
                
                innerContainer.appendChild(videoIframe);
                videoContainer.appendChild(innerContainer);
                document.body.appendChild(videoContainer);
                
                // Prevent body scrolling
                document.body.style.overflow = 'hidden';
                
                // Handle closing
                videoContainer.addEventListener('click', function(event) {
                    if (event.target === videoContainer) {
                        videoContainer.remove();
                        document.body.style.overflow = '';
                    }
                });
            });

            // Preload iframe when thumbnail is visible
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        iframe.src = iframe.dataset.src;
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });
            
            observer.observe(item);
        }
    });
});