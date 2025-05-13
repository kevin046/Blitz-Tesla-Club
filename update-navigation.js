/**
 * Navigation Structure Update Helper
 * 
 * This script can be run in the browser console to update the navigation structure
 * across all pages of the website. It will:
 * 
 * 1. Find all <div class="menu-toggle"> elements and convert them to <button>
 * 2. Add proper ARIA attributes to the menu toggle
 * 3. Add ID to nav-links for ARIA controls
 * 4. Update the inner structure of the menu toggle if needed
 * 
 * Usage:
 * 1. Open the page in a browser
 * 2. Open the browser console (F12 or right-click > Inspect > Console)
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter to run it
 * 5. Check the console for results
 */

function updateNavigation() {
    console.log('Updating navigation structure...');
    
    // Find the menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    if (!menuToggle) {
        console.warn('No menu toggle found on this page');
        return;
    }
    
    // Find the nav links
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) {
        console.warn('No nav links found on this page');
        return;
    }
    
    // Check if menu toggle is already a button
    if (menuToggle.tagName !== 'BUTTON') {
        console.log('Converting menu toggle from div to button');
        
        // Create a new button element
        const newToggle = document.createElement('button');
        newToggle.className = 'menu-toggle';
        newToggle.setAttribute('aria-label', 'Toggle navigation menu');
        newToggle.setAttribute('aria-expanded', 'false');
        newToggle.setAttribute('aria-controls', 'nav-links');
        
        // Check if the toggle has the hamburger icon
        if (!menuToggle.querySelector('.fa-bars')) {
            newToggle.innerHTML = '<i class="fas fa-bars"></i>';
        } else {
            newToggle.innerHTML = menuToggle.innerHTML;
        }
        
        // Replace the old toggle with the new one
        menuToggle.parentNode.replaceChild(newToggle, menuToggle);
        
        console.log('Menu toggle converted to button');
    } else {
        console.log('Menu toggle is already a button');
        
        // Make sure it has the proper attributes
        menuToggle.setAttribute('aria-label', 'Toggle navigation menu');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-controls', 'nav-links');
    }
    
    // Add ID to nav links if it doesn't have one
    if (!navLinks.id) {
        navLinks.id = 'nav-links';
        console.log('Added ID to nav-links');
    }
    
    console.log('Navigation structure updated successfully');
}

// Run the update function
updateNavigation();

// Export the function for potential reuse
window.updateNavigation = updateNavigation; 