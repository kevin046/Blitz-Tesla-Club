// Blitz Shop JavaScript functionality
// This file handles the shop interactions, cart management, and order processing

// Global variables
let currentUser = null;
let currentModel = 'all'; // Track selected model

// Mobile detection function
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.innerWidth <= 768;
}

// Initialize the shop when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeShop();
    const mobileBottomNav = document.querySelector('.mobile-bottom-nav');
    if (mobileBottomNav) {
        mobileBottomNav.addEventListener('click', function(e) {
            const navItem = e.target.closest('.bottom-nav-item');
            if (!navItem) return;
            const action = navItem.getAttribute('data-action');
            if (!action) return;

            // Remove active from all, add to clicked
            document.querySelectorAll('.bottom-nav-item').forEach(item => item.classList.remove('active'));
            navItem.classList.add('active');

            switch (action) {
                case 'shop':
                    // Scroll to top or reload products
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    // Optionally, re-display all products
                    if (typeof displayProducts === 'function') displayProducts();
                    break;
                case 'filter':
                    // Open mobile filter menu
                    if (typeof toggleMobileMenu === 'function') toggleMobileMenu();
                    break;
                case 'cart':
                    // Open mobile cart
                    if (isMobile() && typeof showMobileCart === 'function') {
                        showMobileCart();
                    } else if (typeof showDesktopCart === 'function') {
                        showDesktopCart();
                    }
                    break;
                case 'profile':
                    // Go to dashboard/profile
                    window.location.href = 'dashboard.html';
                    break;
            }
        });
    }
});

// Utility function to format prices
function formatPrice(price) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(price);
}

// At the top of the file, ensure we use the global client
function getSupabaseClient() {
  if (window.supabaseClient) return window.supabaseClient;
  throw new Error('Supabase client not initialized!');
}

async function initializeShop() {
    try {
        // Initialize cart if not already done
        if (!window.cart) {
            window.cart = [];
        }
        
        // Wait for the global Supabase client to be initialized
        let supabaseClient = getSupabaseClient();
        
        // Check if user is authenticated
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        
        // Require authentication for shop browsing
        if (error || !user) {
            showNotification('Please log in to access the shop', 'error');
            setTimeout(() => {
                window.location.href = 'login.html?redirect=blitz-shop.html';
            }, 1200);
            return;
        }
        currentUser = user;
        
        // Check if user is admin by looking at their email or role
        const isAdmin = await checkAdminStatus(user);
        if (isAdmin) {
            setupAdminControls();
        }
        
        // Setup model selection
        setupModelSelection();
        
        // Load products and setup event listeners (now only if logged in)
        await loadProducts();
        setupEventListeners();
        updateCartDisplay();
        
        // Setup admin controls if user is admin
        if (currentUser) {
            const isAdmin = await checkAdminStatus(currentUser);
            if (isAdmin) {
                setupAdminControls();
            }
        }
        
    } catch (error) {
        showNotification('Error initializing shop', 'error');
    }
}

function setupModelSelection() {
    const modelPills = document.querySelectorAll('.model-pill');
    modelPills.forEach(pill => {
        pill.addEventListener('click', function() {
            // Remove active class from all pills
            modelPills.forEach(p => p.classList.remove('active'));
            // Add active class to clicked pill
            this.classList.add('active');
            
            // Update current model
            currentModel = this.dataset.model;
            
            // Re-display products based on current model
            displayProducts();
        });
    });
}

function setupEventListeners() {
    // Model selection pills (desktop)
    const modelPills = document.querySelectorAll('.model-pill');
    modelPills.forEach(pill => {
        pill.addEventListener('click', function() {
            const model = this.dataset.model;
            
            // Update active state for both desktop and mobile
            updateModelSelection(model);
        });
    });
    
    // Shop buttons with enhanced desktop support
    const shopButtons = document.querySelectorAll('[data-action="shop"]');
    
    shopButtons.forEach((btn, index) => {
        // Remove any existing event listeners
        btn.replaceWith(btn.cloneNode(true));
        const newBtn = document.querySelectorAll('[data-action="shop"]')[index];
        
        // Add multiple event listeners for better compatibility
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = 'blitz-shop.html';
        });
    });
    
    // Remove direct event listeners for [data-action="cart"] to avoid double modal on mobile
    // Cart button event handling is now only via event delegation in the mobile bottom nav
    
    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // Fallback: Add onclick handlers as backup (leave as is for now)
    setTimeout(() => {
        const shopBtns = document.querySelectorAll('[data-action="shop"]');
        shopBtns.forEach(btn => {
            if (!btn.onclick) {
                btn.onclick = function(e) {
                    e.preventDefault();
                    window.location.href = 'blitz-shop.html';
                };
            }
        });
        // Do not add fallback for cart buttons
    }, 1000);
    
            // Force buttons to be clickable and check for overlapping elements
        setTimeout(() => {
            const shopBtn = document.querySelector('.shop-home-btn');
            const cartBtn = document.querySelector('.cart-icon');
            
            if (shopBtn) {
                // Force the SHOP button to be clickable with higher priority
                shopBtn.style.zIndex = '9999';
                shopBtn.style.pointerEvents = 'auto';
                shopBtn.style.position = 'relative';
                shopBtn.style.cursor = 'pointer';
                shopBtn.style.background = 'transparent';
                shopBtn.style.border = 'none';
                shopBtn.style.outline = 'none';
                
                // Check if any parent elements are blocking pointer events
                let parent = shopBtn.parentElement;
                while (parent) {
                    const pointerEvents = getComputedStyle(parent).pointerEvents;
                    if (pointerEvents === 'none') {
                        parent.style.pointerEvents = 'auto';
                    }
                    parent = parent.parentElement;
                }
                
                // Add a simple test click handler to see if clicks are being received
                shopBtn.addEventListener('click', function(e) {
                    window.location.href = 'index.html';
                });
                
                // Test if we can programmatically trigger the button
                // setTimeout(() => {
                //     console.log('Testing programmatic click...');
                //     shopBtn.click();
                // }, 500);
            }
        
        if (cartBtn) {
            // Force the button to be clickable
            cartBtn.style.zIndex = '1002';
            cartBtn.style.pointerEvents = 'auto';
            cartBtn.style.position = 'relative';
        }
        
        // Check for overlapping elements
        const allElements = document.querySelectorAll('*');
        const overlappingElements = [];
        
        if (shopBtn) {
            const shopRect = shopBtn.getBoundingClientRect();
            allElements.forEach(el => {
                if (el !== shopBtn && el !== cartBtn) {
                    const elRect = el.getBoundingClientRect();
                    if (elRect.left < shopRect.right && elRect.right > shopRect.left &&
                        elRect.top < shopRect.bottom && elRect.bottom > shopRect.top) {
                        overlappingElements.push({
                            element: el,
                            zIndex: getComputedStyle(el).zIndex,
                            position: getComputedStyle(el).position
                        });
                    }
                }
            });
        }
        

        
        // Add a direct click handler for the SHOP button as a last resort
        if (shopBtn) {
            // Create a completely new SHOP button to avoid any CSS conflicts
            const newShopBtn = document.createElement('button');
            newShopBtn.className = 'shop-home-btn';
            newShopBtn.setAttribute('data-action', 'shop');
            newShopBtn.setAttribute('type', 'button');
            newShopBtn.innerHTML = '<i class="fas fa-home"></i><span>SHOP</span>';
            
            // Set inline styles to ensure it's clickable
            newShopBtn.style.cssText = `
                background: transparent !important;
                border: none !important;
                color: #171a20 !important;
                font-size: 0.875rem !important;
                font-weight: 500 !important;
                cursor: pointer !important;
                padding: 8px 16px !important;
                border-radius: 4px !important;
                transition: all 0.2s ease !important;
                font-family: 'Montserrat', Arial, sans-serif !important;
                text-transform: uppercase !important;
                letter-spacing: 0.5px !important;
                user-select: none !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 6px !important;
                min-height: 36px !important;
                position: relative !important;
                z-index: 9999 !important;
                pointer-events: auto !important;
            `;
            
            // Add click handler
            newShopBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('NEW SHOP button clicked!');
                window.location.href = 'index.html';
            });
            
            // Replace the old button with the new one
            shopBtn.parentNode.replaceChild(newShopBtn, shopBtn);
            
            console.log('SHOP button replaced with new clickable version');
            
            // Test button removed - SHOP button should work normally now
        }
    }, 2000);
}

function updateModelSelection(selectedModel) {
    // Update desktop pills
    const modelPills = document.querySelectorAll('.model-pill');
    modelPills.forEach(pill => {
        pill.classList.toggle('active', pill.dataset.model === selectedModel);
    });
    
    // Update mobile pills
    const mobileModelPills = document.querySelectorAll('.mobile-model-pill');
    mobileModelPills.forEach(pill => {
        pill.classList.toggle('active', pill.dataset.model === selectedModel);
    });
    
    // Update current model
    currentModel = selectedModel;
    
    // Refresh products display
    displayProducts();
}





async function loadProducts() {
    try {
        showLoading(true);
        
        // Use the global Supabase client
        let supabaseClient = getSupabaseClient();
        
        // First, let's check if the table exists and has any data
        console.log('Checking shop_products table...');
        const { data: testData, error: testError } = await supabaseClient
            .from('shop_products')
            .select('id')
            .limit(1);
            
        if (testError) {
            console.error('Table access error:', testError);
            throw new Error(`Cannot access shop_products table: ${testError.message}`);
        }
        
        console.log('Table access successful, test data:', testData);
        
        const { data, error } = await supabaseClient
            .from('shop_products')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log('Products loaded:', data);
        window.products = data || [];
        displayProducts();
        
    } catch (error) {
        console.error('Error loading products:', error);
        const errorMessage = error.message || 'Unknown error occurred';
        showNotification(`Error loading products: ${errorMessage}`, 'error');
        showEmptyState(`Error loading products: ${errorMessage}`);
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    const container = document.getElementById('products-container');
    if (show) {
        container.innerHTML = `
            <div class="loading" style="text-align: center; padding: 60px 20px; color: #b0b8c1;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 15px; color: #00e676;"></i>
                <p style="font-size: 1.1rem; margin: 0;">Loading products...</p>
            </div>
        `;
    }
}

function showEmptyState(message) {
    const container = document.getElementById('products-container');
    
    // Check if user is admin to show sample data button
    const isAdmin = currentUser && checkAdminStatus(currentUser);
    
    container.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 60px 20px; color: #b0b8c1;">
            <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 15px; color: #666;"></i>
            <h3 style="margin: 0 0 10px 0; color: #fff;">No Products Available</h3>
            <p style="margin: 0; font-size: 1rem;">${message}</p>
            <div style="margin-top: 30px;">
                ${isAdmin ? `
                    <p style="font-size: 0.9rem; color: #888; margin-bottom: 15px;">Add sample products to get started!</p>
                    <button onclick="addSampleProducts()" class="btn primary" style="margin: 0 10px;">
                        <i class="fas fa-plus"></i> Add Sample Products
                    </button>
                    <button onclick="window.location.href='admin-shop.html'" class="btn secondary" style="margin: 0 10px;">
                        <i class="fas fa-cog"></i> Admin Panel
                    </button>
                ` : `
                <p style="font-size: 0.9rem; color: #888; margin-bottom: 15px;">Need help? Contact an admin to add products.</p>
                <button onclick="window.location.href='admin-shop.html'" class="btn primary" style="margin: 0 10px;">
                    <i class="fas fa-cog"></i> Admin Panel
                </button>
                `}
            </div>
        </div>
    `;
}

function displayProducts() {
    const container = document.getElementById('products-container');
    
    if (!window.products || window.products.length === 0) {
        showEmptyState('Check back soon for new merchandise!');
        return;
    }

    // Filter by model only
    let filteredProducts = window.products;
    
    // Filter by model if not "all"
    if (currentModel !== 'all') {
        filteredProducts = filteredProducts.filter(p => {
            // Map model selection to category values
            const modelCategoryMap = {
                'model3': 'new-model-3-highland',
                'modelY': 'model-y'
            };
            
            const targetCategory = modelCategoryMap[currentModel];
            
            // Check if product category matches the selected model
            if (targetCategory && p.category) {
                return p.category === targetCategory;
            }
            
            // If no category data, show all products
            return true;
        });
    }

    if (filteredProducts.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px; color: #b0b8c1;">
                <i class="fas fa-filter" style="font-size: 3rem; margin-bottom: 15px; color: #666;"></i>
                <h3 style="margin: 0 0 10px 0; color: #222;">No Products Found</h3>
                <p style="margin: 0; font-size: 1rem;">Try selecting a different model.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredProducts.map(product => createProductCard(product)).join('');

    // Add event listeners to add to cart buttons
    document.querySelectorAll('.add-cart-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.dataset.productId;
            addToCart(productId, 1);
        });
    });


}



// --- Add to the top: placeholder images ---
const PRODUCT_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjM2QzZDNkIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTUwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+UHJvZHVjdDwvdGV4dD4KPC9zdmc+';

const INSTALLED_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjM2QzZDNkIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTUwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW5zdGFsbGVkPC90ZXh0Pgo8L3N2Zz4=';

// --- Update createProductCard ---
function createProductCard(product) {
    // Check if the image URL is a placeholder and replace with our base64 image
    const isPlaceholderUrl = (url) => {
        return url && (url.includes('via.placeholder.com') || url.includes('placeholder.com') || url.includes('placeholder'));
    };
    
    const productImage = isPlaceholderUrl(product.image_url) ? PRODUCT_PLACEHOLDER : (product.image_url || PRODUCT_PLACEHOLDER);
    
    return `
        <div class="product-card" data-product-id="${product.id}" tabindex="0" onclick="showProductDetail('${product.id}')">
            <div class="product-image-container">
                <img class="product-image" src="${productImage}" alt="${product.title}">
            </div>
            <div class="product-info">
                <div class="product-title">${product.title}</div>
                <div class="product-pricing">
                    <div class="member-price">${formatPrice(product.member_price || product.price)}</div>
                    ${product.regular_price && product.member_price && product.regular_price > product.member_price ? 
                        `<div class="regular-price">${formatPrice(product.regular_price)}</div>` : ''}
                    ${product.regular_price && product.member_price && product.regular_price > product.member_price ? 
                        `<div class="discount-badge">-${((product.regular_price - product.member_price) / product.regular_price * 100).toFixed(0)}%</div>` : ''}
                </div>
                <button class="add-cart-btn" data-product-id="${product.id}" onclick="event.preventDefault(); event.stopPropagation(); addToCart('${product.id}', 1); return false;">Add to Cart</button>
            </div>
        </div>
    `;
}

// Mobile touch event listeners are now handled in displayProducts function

// --- Add CSS (inject or instruct user to add to blitz-shop.html) ---
/*
.product-image-stack {
    position: relative;
    width: 100%;
    height: 260px;
    overflow: hidden;
}
.product-image.main-image {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%; object-fit: contain;
    opacity: 1;
    transition: opacity 0.35s;
    z-index: 1;
}
.product-image.installed-image {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%; object-fit: contain;
    opacity: 0;
    transition: opacity 0.35s;
    z-index: 2;
}
.product-card.has-image-swap:hover .main-image,
.product-card.has-image-swap.show-installed .main-image {
    opacity: 0;
}
.product-card.has-image-swap:hover .installed-image,
.product-card.has-image-swap.show-installed .installed-image {
    opacity: 1;
}
.image-overlay {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient(0deg,rgba(0,0,0,0.10) 0%,rgba(0,0,0,0.04) 100%);
    opacity: 0;
    transition: opacity 0.3s;
    z-index: 3;
}
.product-card.has-image-swap:hover .image-overlay,
.product-card.has-image-swap.show-installed .image-overlay {
    opacity: 1;
}
*/

function getCartQuantity(productId) {
    const cartItem = window.cart.find(item => item.product_id === productId);
    return cartItem ? cartItem.quantity : 0;
}

// Add debounce mechanism to prevent multiple rapid calls
let lastAddToCartCall = 0;
const ADD_TO_CART_DEBOUNCE = 500; // 500ms debounce

function addToCart(productId, quantity) {
    const now = Date.now();
    if (now - lastAddToCartCall < ADD_TO_CART_DEBOUNCE) {
        console.log('addToCart called too quickly, ignoring');
        return;
    }
    lastAddToCartCall = now;
    
    console.log('addToCart called with:', { productId, quantity });
    console.log('Current cart before:', JSON.stringify(window.cart));
    
    const product = window.products.find(p => p.id === productId);
    if (!product) {
        console.log('Product not found:', productId);
        return;
    }

    const existingItem = window.cart.find(item => item.product_id === productId);
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    const availableQuantity = product.inventory - currentQuantity;

    console.log('Cart analysis:', {
        existingItem: existingItem,
        currentQuantity: currentQuantity,
        availableQuantity: availableQuantity,
        requestedQuantity: quantity
    });

    if (quantity > availableQuantity) {
        showNotification(`Only ${availableQuantity} items available`, 'error');
        return;
    }
    
    if (existingItem) {
        // Update existing item quantity
        existingItem.quantity += quantity;
        console.log('Updated existing item quantity to:', existingItem.quantity);
        showNotification(`${quantity} more ${product.title} added to cart`, 'success');
    } else {
        // Add new item to cart
        const newItem = {
            product_id: productId,
            title: product.title,
            price: product.member_price || product.price, // Use member price
            quantity: quantity
        };
        window.cart.push(newItem);
        console.log('Added new item to cart:', newItem);
        showNotification(`${product.title} added to cart`, 'success');
    }

    console.log('Cart after update:', JSON.stringify(window.cart));
    updateCartDisplay();
    displayProducts(); // Refresh to update available quantities
}

function updateCartItemQuantity(productId, newQuantity) {
    const product = window.products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = window.cart.find(item => item.product_id === productId);
    if (!existingItem) return;

    if (newQuantity <= 0) {
        // Remove item if quantity is 0 or less
        removeFromCart(productId);
        return;
    }

    if (newQuantity > product.inventory) {
        showNotification(`Only ${product.inventory} items available`, 'error');
        return;
    }

    existingItem.quantity = newQuantity;
    updateCartDisplay();
    displayProducts(); // Refresh to update available quantities
    showNotification(`Quantity updated for ${product.title}`, 'success');
}

function removeFromCart(productId) {
    const removedItem = window.cart.find(item => item.product_id === productId);
    window.cart = window.cart.filter(item => item.product_id !== productId);
    updateCartDisplay();
    displayProducts(); // Refresh to update available quantities
    if (removedItem) {
        showNotification(`${removedItem.title} removed from cart`, 'success');
    }
}

function updateCartDisplay() {
    // Update cart count in header
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        const totalItems = window.cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }

    // For now, we'll implement a simple cart display
    // The full cart modal will be implemented later
    console.log('Cart updated:', window.cart);
}

function showOrderModal() {
    // Remove any existing order modal first
    const existingModal = document.getElementById('orderModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'orderModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding: 20px;
        z-index: 10000;
        overflow-y: auto;
    `;
    
    const total = window.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    modal.innerHTML = `
        <div style="
            background: #1a202c;
            border-radius: 16px;
            padding: 32px;
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        ">
            <button onclick="this.closest('#orderModal').remove()" style="
                position: absolute;
                top: 16px;
                right: 16px;
                background: none;
                border: none;
                color: #b0b8c1;
                font-size: 24px;
                cursor: pointer;
                padding: 8px;
                border-radius: 50%;
                transition: background 0.2s;
            " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">&times;</button>
            
            <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #fff; margin: 0 0 8px 0; font-size: 24px;">Reservation Checkout</h2>
                <p style="color: #b0b8c1; margin: 0; font-size: 14px;">Items will be reserved for pickup</p>
                <div style="background: rgba(255,193,7,0.15); padding: 12px; border-radius: 8px; margin-top: 12px; border: 1px solid rgba(255,193,7,0.3);">
                    <p style="color: #ffc107; margin: 0; font-size: 16px; font-weight: 600;">💵 CASH ONLY DEAL</p>
                    <p style="color: #b0b8c1; margin: 4px 0 0 0; font-size: 12px;">Payment accepted in cash only at pickup</p>
                </div>
            </div>
            
            <div id="order-summary" style="margin-bottom: 24px;">
            <h3 style="color: #fff; margin-bottom: 15px;">Order Summary</h3>
            ${window.cart.map(item => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #b0b8c1;">
                    <span>${item.title} x${item.quantity}</span>
                    <span>$${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            `).join('')}
            <hr style="border: 1px solid rgba(255,255,255,0.1); margin: 15px 0;">
            <div style="display: flex; justify-content: space-between; font-weight: 600; color: #00e676;">
                <span>Total:</span>
                <span>$${total.toFixed(2)}</span>
                </div>
            </div>
            
            <div style="background: rgba(0,230,118,0.1); padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid rgba(0,230,118,0.3);">
                <h4 style="color: #00e676; margin: 0 0 12px 0; font-size: 16px;">📍 Pickup Information</h4>
                <div style="color: #b0b8c1; font-size: 14px; line-height: 1.5;">
                    <p style="margin: 0 0 8px 0;"><strong>Address:</strong><br>
                    1050 McNicoll Ave, Unit 5<br>
                    Scarborough, ON M1W 2L8</p>
                    <p style="margin: 0 0 8px 0;"><strong>Hours:</strong><br>
                    Monday to Friday<br>
                    11:00 AM - 4:30 PM</p>
                    <p style="margin: 0; color: #00e676;"><strong>By appointment only</strong></p>
                </div>
            </div>
            
            <div style="background: rgba(255,193,7,0.1); padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid rgba(255,193,7,0.3);">
                <h4 style="color: #ffc107; margin: 0 0 12px 0; font-size: 16px;">📱 Contact Blitz Owner</h4>
                <div style="text-align: center;">
                    <div style="
                        width: 240px;
                        height: 240px;
                        background: #fff;
                        border-radius: 12px;
                        margin: 0 auto 16px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    ">
                        <img src="https://qhkcrrphsjpytdfqfamq.supabase.co/storage/v1/object/public/shop-images/product-images/blitz%20wechat.JPG" 
                             alt="Contact WeChat QR Code" 
                             style="width: 100%; height: 100%; object-fit: contain;">
                    </div>
                    <p style="color: #b0b8c1; margin: 0; font-size: 14px; font-weight: 500;">Scan to contact via WeChat</p>
                </div>
            </div>
            
            <div style="margin-bottom: 24px;">
                <label for="preferred-date" style="display: block; color: #fff; margin-bottom: 8px; font-size: 14px;">Preferred Date (Monday-Friday only):</label>
                <input id="preferred-date" type="date" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ccc; margin-bottom: 12px; font-size: 14px;" onchange="validateWeekday(this)">
                <label for="preferred-time" style="display: block; color: #fff; margin-bottom: 8px; font-size: 14px;">Preferred Time:</label>
                <select id="preferred-time" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ccc; margin-bottom: 12px; font-size: 14px; background: white; color: #333;">
                    <option value="">Select a time slot</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="11:30">11:30 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="12:30">12:30 PM</option>
                    <option value="13:00">1:00 PM</option>
                    <option value="13:30">1:30 PM</option>
                    <option value="14:00">2:00 PM</option>
                    <option value="14:30">2:30 PM</option>
                    <option value="15:00">3:00 PM</option>
                    <option value="15:30">3:30 PM</option>
                    <option value="16:00">4:00 PM</option>
                    <option value="16:30">4:30 PM</option>
                </select>
            </div>
            <div style="margin-bottom: 24px;">
                <label for="pickup-note" style="display: block; color: #fff; margin-bottom: 8px; font-size: 14px;">Pickup Note (Optional):</label>
                <textarea id="pickup-note" placeholder="Any special instructions for pickup..." style="
                    width: 100%;
                    padding: 12px;
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 8px;
                    background: rgba(255,255,255,0.05);
                    color: #fff;
                    font-size: 14px;
                    resize: vertical;
                    min-height: 80px;
                    font-family: inherit;
                "></textarea>
            </div>
            
            <div style="text-align: center;">
                <button onclick="placeOrder()" style="
                    background: linear-gradient(135deg, #00e676 0%, #00c853 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    padding: 16px 32px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    width: 100%;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                    Confirm Reservation
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Set minimum date to today and add weekend restrictions
    const dateInput = document.getElementById('preferred-date');
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    dateInput.min = todayString;
    
    // Add event listener to prevent weekend selections
    dateInput.addEventListener('change', function() {
        validateWeekday(this);
    });
    
    // Also validate on input to catch any direct typing
    dateInput.addEventListener('input', function() {
        validateWeekday(this);
    });
}

// Update placeOrder to include preferred date and time
async function placeOrder() {
    try {
        const pickupNote = document.getElementById('pickup-note').value;
        const preferredDate = document.getElementById('preferred-date').value;
        const preferredTime = document.getElementById('preferred-time').value;
        
        // Validate that both date and time are selected
        if (!preferredDate) {
            showNotification('Please select a pickup date', 'error');
            return;
        }
        
        if (!preferredTime) {
            showNotification('Please select a pickup time', 'error');
            return;
        }
        
        // Validate that the selected date is a weekday
        const selectedDate = new Date(preferredDate);
        const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
        
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            showNotification('Please select a weekday (Monday-Friday). Office is closed on weekends.', 'error');
            return;
        }
        
        let preferredDateTime = preferredDate + ' ' + preferredTime;
        
        if (!currentUser) {
            showNotification('Please log in to place an order', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }

        // Use the global Supabase client
        let supabaseClient = getSupabaseClient();

        // Validate cart
        if (window.cart.length === 0) {
            throw new Error('Cart is empty');
        }

        // Create order
        const orderData = {
            user_id: currentUser.id,
            items: window.cart,
            total_amount: window.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            pickup_note: pickupNote,
            preferred_datetime: preferredDateTime,
            status: 'pending',
            order_date: new Date().toISOString()
        };

        const { data: order, error: orderError } = await supabaseClient
            .from('shop_orders')
            .insert([orderData])
            .select()
            .single();

        if (orderError) throw orderError;

        // Update inventory
        for (const item of window.cart) {
            // Get current inventory
            const { data: product, error: getError } = await supabaseClient
                .from('shop_products')
                .select('inventory')
                .eq('id', item.product_id)
                .single();

            if (getError) throw getError;

            // Calculate new inventory
            const newInventory = Math.max(0, product.inventory - item.quantity);

            // Update inventory
            const { error: updateError } = await supabaseClient
                .from('shop_products')
                .update({ inventory: newInventory })
                .eq('id', item.product_id);

            if (updateError) throw updateError;
        }

        // Send confirmation email
        await sendOrderConfirmationEmail(order);

        // Clear cart
        window.cart = [];
        updateCartDisplay();

        // Show success modal
        document.getElementById('orderModal').style.display = 'none';
        showSuccessModal(order);

    } catch (error) {
        console.error('Error placing order:', error);
        showNotification('Error placing order. Please try again.', 'error');
    }
}

// Update email and success modal to show preferred date/time
async function sendOrderConfirmationEmail(order) {
    try {
        // Use the global Supabase client
        let supabaseClient = getSupabaseClient();

        const { data: { user } } = await supabaseClient.auth.getUser();
        
        // Get user's member ID from profiles table
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('member_id, full_name')
            .eq('id', user.id)
            .single();
            
        if (profileError) {
            console.error('Error fetching user profile:', profileError);
        }
        
        const memberId = profile?.member_id || 'N/A';
        const fullName = profile?.full_name || user.user_metadata?.full_name || 'Valued Member';
        
        const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <img src="https://qhkcrrphsjpytdfqfamq.supabase.co/storage/v1/object/public/avatars//logo.png" alt="Blitz Tesla Club Logo" style="width: 120px; height: auto;">
                </div>
                <h2 style="color: #171a20; text-align: center; margin-bottom: 20px; font-size: 24px;">Order Confirmation</h2>
                <p style="color: #333; font-size: 16px; line-height: 1.5;">Dear ${user.user_metadata?.full_name || 'Valued Member'},</p>
                <p style="color: #333; font-size: 16px; line-height: 1.5;">Thank you for your order. Your items have been reserved for pickup at our location.</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>Reservation #${order.id}</h3>
                    <p><strong>Member ID:</strong> ${memberId}</p>
                    <p><strong>Total:</strong> $${order.total_amount.toFixed(2)}</p>
                    <p><strong>Status:</strong> Reserved for pickup</p>
                    <p><strong>Order Date:</strong> ${new Date(order.order_date).toLocaleDateString()}</p>
                    ${order.preferred_datetime ? `<p><strong>Preferred Date/Time:</strong> ${order.preferred_datetime}</p>` : ''}
                </div>
                
                <h3>Items Reserved:</h3>
                <ul>
                    ${order.items.map(item => `
                        <li>${item.title} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</li>
                    `).join('')}
                </ul>
                
                <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #00c853;">
                    <h3 style="color: #00c853; margin-top: 0;">📍 Pickup Information</h3>
                    <p><strong>Address:</strong><br>
                    1050 McNicoll Ave, Unit 5<br>
                    Scarborough, ON M1W 2L8</p>
                    <p><strong>Hours:</strong><br>
                    Monday to Friday<br>
                    11:00 AM - 4:30 PM</p>
                    <p style="color: #00c853; font-weight: bold;">By appointment only</p>
                </div>
                
                <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <h3 style="color: #856404; margin-top: 0;">💵 Payment Information</h3>
                    <p style="color: #856404; font-weight: bold; margin: 0;">CASH ONLY DEAL</p>
                    <p style="color: #856404; margin: 8px 0 0 0;">Payment accepted in cash only at pickup. Please bring exact change.</p>
                </div>
                
                <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <h3 style="color: #856404; margin-top: 0;">📱 Contact Information</h3>
                    <p>For questions about your reservation or to schedule pickup:</p>
                    <p><strong>Contact Evan:</strong> <a href="tel:647-893-8530" style="color: #856404; text-decoration: none;">647-893-8530</a></p>
                    <p><strong>Email:</strong> info@blitztclub.com</p>
                </div>
                
                ${order.pickup_note ? `<p><strong>Pickup Note:</strong> ${order.pickup_note}</p>` : ''}
                
                <p><strong>Important:</strong> We'll notify you when your items are ready for pickup. Please contact us to schedule your pickup appointment.</p>
                
                <p style="color: #666; font-size: 14px;">
                    Thank you for choosing Blitz T Club!
                </p>
            </div>
        `;

        // Send email to customer
        const customerResponse = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: user.email,
                subject: 'Blitz Shop Reservation Confirmation',
                html: emailContent
            })
        });

        if (!customerResponse.ok) {
            console.error('Failed to send confirmation email to customer');
        }

        // Send copy to admin
        const adminResponse = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: 'myw530@hotmail.com',
                subject: `New Order Confirmation - ${order.id}`,
                html: emailContent
            })
        });

        if (!adminResponse.ok) {
            console.error('Failed to send confirmation email to admin');
        }

    } catch (error) {
        console.error('Error sending confirmation email:', error);
    }
}

async function showSuccessModal(order) {
    try {
        // Get user's member ID from profiles table
        let supabaseClient = getSupabaseClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('member_id')
            .eq('id', user.id)
            .single();
            
        if (profileError) {
            console.error('Error fetching user profile:', profileError);
        }
        
        const memberId = profile?.member_id || 'N/A';
        
        // Remove any existing success modal first
        const existingModal = document.getElementById('successModal');
        if (existingModal) {
            existingModal.remove();
        }
    
    const modal = document.createElement('div');
    modal.id = 'successModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="
            background: #1a202c;
            border-radius: 16px;
            padding: 32px;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            text-align: center;
            position: relative;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            margin: 20px;
        ">
            <button onclick="this.closest('#successModal').remove()" style="
                position: absolute;
                top: 16px;
                right: 16px;
                background: none;
                border: none;
                color: #b0b8c1;
                font-size: 24px;
                cursor: pointer;
                padding: 8px;
                border-radius: 50%;
                transition: background 0.2s;
            " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">&times;</button>
            
            <div style="margin-bottom: 24px;">
                <div style="
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, #00e676 0%, #00c853 100%);
                    border-radius: 50%;
                    margin: 0 auto 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 32px;
                    color: white;
                ">✓</div>
                <h2 style="color: #00e676; margin: 0 0 8px 0; font-size: 24px;">Reservation Confirmed!</h2>
                <p style="color: #b0b8c1; margin: 0; font-size: 14px;">Your items have been reserved for pickup</p>
            </div>
            
            <div id="order-details" style="margin-bottom: 24px;">
                <div style="background: rgba(0,230,118,0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid rgba(0,230,118,0.3);">
            <p style="margin: 0; color: #b0b8c1;">
                        <strong>Reservation ID:</strong> ${order.id}<br>
                        <strong>Member ID:</strong> ${memberId}<br>
                <strong>Total:</strong> $${order.total_amount.toFixed(2)}<br>
                        <strong>Status:</strong> Reserved for pickup<br>
                        <strong>Date:</strong> ${new Date(order.order_date).toLocaleDateString()}<br>
                        ${order.preferred_datetime ? `<strong>Preferred Date/Time:</strong> ${order.preferred_datetime}<br>` : ''}
                    </p>
                </div>
            </div>
            
            <div style="background: rgba(0,230,118,0.1); padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid rgba(0,230,118,0.3);">
                <h4 style="color: #00e676; margin: 0 0 12px 0; font-size: 16px;">📍 Pickup Information</h4>
                <div style="color: #b0b8c1; font-size: 14px; line-height: 1.5;">
                    <p style="margin: 0 0 8px 0;"><strong>Address:</strong><br>
                    1050 McNicoll Ave, Unit 5<br>
                    Scarborough, ON M1W 2L8</p>
                    <p style="margin: 0 0 8px 0;"><strong>Hours:</strong><br>
                    Monday to Friday<br>
                    11:00 AM - 4:30 PM</p>
                    <p style="margin: 0; color: #00e676;"><strong>By appointment only</strong></p>
                </div>
            </div>
            
            <div style="background: rgba(255,193,7,0.1); padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid rgba(255,193,7,0.3);">
                <h4 style="color: #ffc107; margin: 0 0 12px 0; font-size: 16px;">💵 Payment Information</h4>
                <div style="color: #b0b8c1; font-size: 14px; line-height: 1.5;">
                    <p style="margin: 0; color: #ffc107; font-weight: 600;">CASH ONLY DEAL</p>
                    <p style="margin: 8px 0 0 0;">Payment accepted in cash only at pickup. Please bring exact change.</p>
                </div>
            </div>
            
            <div style="background: rgba(255,193,7,0.1); padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid rgba(255,193,7,0.3);">
                <h4 style="color: #ffc107; margin: 0 0 12px 0; font-size: 16px;">📱 Contact Blitz Owner</h4>
                <div style="text-align: center;">
                    <div style="
                        width: 240px;
                        height: 240px;
                        background: #fff;
                        border-radius: 12px;
                        margin: 0 auto 16px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    ">
                        <img src="https://qhkcrrphsjpytdfqfamq.supabase.co/storage/v1/object/public/shop-images/product-images/blitz%20wechat.JPG" 
                             alt="Contact WeChat QR Code" 
                             style="width: 100%; height: 100%; object-fit: contain;">
                    </div>
                    <p style="color: #b0b8c1; margin: 0; font-size: 14px; font-weight: 500;">Scan to contact via WeChat</p>
                </div>
            </div>
            
            <div style="text-align: center;">
                <button onclick="this.closest('#successModal').remove()" style="
                    background: linear-gradient(135deg, #00e676 0%, #00c853 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    padding: 14px 28px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                    Continue Shopping
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    } catch (error) {
        console.error('Error showing success modal:', error);
        // Fallback to simple success message if modal fails
        showNotification('Order placed successfully!', 'success');
    }
}

function showNotification(message, type) {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (container.contains(notification)) {
                container.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Mobile menu functions
function toggleMobileMenu() {
    const mobileMenu = document.querySelector('.mobile-menu');
    if (mobileMenu) {
        mobileMenu.classList.toggle('active');
    }
}

function openMobileMenu() {
    const mobileMenu = document.querySelector('.mobile-menu');
    if (mobileMenu) {
        mobileMenu.classList.add('active');
    }
}

function closeMobileMenu() {
    const mobileMenu = document.querySelector('.mobile-menu');
    if (mobileMenu) {
        mobileMenu.classList.remove('active');
    }
}

// Export functions for global access
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.showOrderModal = showOrderModal;
window.placeOrder = placeOrder;
window.toggleMobileMenu = toggleMobileMenu;
window.openMobileMenu = openMobileMenu;
window.closeMobileMenu = closeMobileMenu;

// Desktop cart function
function showDesktopCart() {
    // Remove any existing cart modal first
    const existingModal = document.querySelector('.cart-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'cart-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;
    
    const totalItems = window.cart ? window.cart.reduce((sum, item) => sum + item.quantity, 0) : 0;
    const totalPrice = window.cart ? window.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) : 0;
    
    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 1.5rem; color: #171a20;">Shopping Cart</h3>
            <button id="close-cart-modal" style="
                background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;
                padding: 8px; border-radius: 50%; transition: background 0.2s;
            " onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='transparent'">&times;</button>
        </div>
        
        ${window.cart.length === 0 ? 
            '<div style="text-align: center; padding: 40px 20px;"><p style="color: #666; font-size: 1.1rem;">Your cart is empty</p></div>' : 
            `
            <div id="desktop-cart-items">
                ${window.cart.map(item => `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 16px; background: #f8f9fa; border-radius: 8px;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; margin-bottom: 4px; color: #171a20;">${item.title}</div>
                            <div style="color: #666; font-size: 0.9rem;">$${item.price} each</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <button onclick="updateCartItemQuantity('${item.product_id}', ${item.quantity - 1}); updateDesktopCartItems();" style="
                                    background: #f0f0f0; color: #333; border: none; border-radius: 4px;
                                    width: 28px; height: 28px; font-size: 16px; cursor: pointer; transition: background 0.2s;
                                    display: flex; align-items: center; justify-content: center;
                                " onmouseover="this.style.background='#e0e0e0'" onmouseout="this.style.background='#f0f0f0'">-</button>
                                <span style="font-weight: 600; min-width: 30px; text-align: center;">${item.quantity}</span>
                                <button onclick="updateCartItemQuantity('${item.product_id}', ${item.quantity + 1}); updateDesktopCartItems();" style="
                                    background: #f0f0f0; color: #333; border: none; border-radius: 4px;
                                    width: 28px; height: 28px; font-size: 16px; cursor: pointer; transition: background 0.2s;
                                    display: flex; align-items: center; justify-content: center;
                                " onmouseover="this.style.background='#e0e0e0'" onmouseout="this.style.background='#f0f0f0'">+</button>
                            </div>
                            <span style="font-weight: 600; color: #00e676; font-size: 1.1rem; min-width: 60px; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</span>
                            <button onclick="removeFromCart('${item.product_id}'); updateDesktopCartItems();" style="
                                background: #ff4444; color: white; border: none; border-radius: 4px;
                                padding: 6px 10px; font-size: 0.8rem; cursor: pointer; transition: background 0.2s;
                            " onmouseover="this.style.background='#ff3333'" onmouseout="this.style.background='#ff4444'">Remove</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                    <span style="font-weight: 600; font-size: 1.1rem;">Total:</span>
                    <span style="font-weight: 600; color: #00e676; font-size: 1.2rem;">$${totalPrice.toFixed(2)}</span>
                </div>
                <button onclick="placeDesktopOrder()" style="
                    background: #00e676; color: white; border: none; border-radius: 8px;
                    padding: 12px 24px; font-size: 1rem; font-weight: 600; width: 100%;
                    cursor: pointer; transition: background 0.2s;
                " onmouseover="this.style.background='#00d666'" onmouseout="this.style.background='#00e676'">Place Order</button>
            </div>
            `
        }
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Add event listener for close button
    const closeBtn = modal.querySelector('#close-cart-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.remove();
        });
    }
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Update desktop cart items
function updateDesktopCartItems() {
    const cartItems = document.getElementById('desktop-cart-items');
    if (!cartItems) return;
    
    const totalPrice = window.cart ? window.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) : 0;
    
    cartItems.innerHTML = window.cart.map(item => `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 16px; background: #f8f9fa; border-radius: 8px;">
            <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 4px; color: #171a20;">${item.title}</div>
                <div style="color: #666; font-size: 0.9rem;">$${item.price} each</div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button onclick="updateCartItemQuantity('${item.product_id}', ${item.quantity - 1}); updateDesktopCartItems();" style="
                        background: #f0f0f0; color: #333; border: none; border-radius: 4px;
                        width: 28px; height: 28px; font-size: 16px; cursor: pointer; transition: background 0.2s;
                        display: flex; align-items: center; justify-content: center;
                    " onmouseover="this.style.background='#e0e0e0'" onmouseout="this.style.background='#f0f0f0'">-</button>
                    <span style="font-weight: 600; min-width: 30px; text-align: center;">${item.quantity}</span>
                    <button onclick="updateCartItemQuantity('${item.product_id}', ${item.quantity + 1}); updateDesktopCartItems();" style="
                        background: #f0f0f0; color: #333; border: none; border-radius: 4px;
                        width: 28px; height: 28px; font-size: 16px; cursor: pointer; transition: background 0.2s;
                        display: flex; align-items: center; justify-content: center;
                    " onmouseover="this.style.background='#e0e0e0'" onmouseout="this.style.background='#f0f0f0'">+</button>
                </div>
                <span style="font-weight: 600; color: #00e676; font-size: 1.1rem; min-width: 60px; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</span>
                <button onclick="removeFromCart('${item.product_id}'); updateDesktopCartItems();" style="
                    background: #ff4444; color: white; border: none; border-radius: 4px;
                    padding: 6px 10px; font-size: 0.8rem; cursor: pointer; transition: background 0.2s;
                " onmouseover="this.style.background='#ff3333'" onmouseout="this.style.background='#ff4444'">Remove</button>
            </div>
        </div>
    `).join('');
    
    // Update total
    const totalElement = document.querySelector('.cart-modal span[style*="color: #00e676"]');
    if (totalElement) {
        totalElement.textContent = `$${totalPrice.toFixed(2)}`;
    }
}

// Place desktop order
function placeDesktopOrder() {
    if (!currentUser) {
        showNotification('Please log in to place an order', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    // Close cart modal
    const modal = document.querySelector('.cart-modal');
    if (modal) modal.remove();
    
    // Show order modal
    showOrderModal();
}

// Shop navigation function
function goToShop() {
    console.log('Shop button clicked!');
    window.location.href = 'index.html';
}

// Check if user is admin
async function checkAdminStatus(user) {
    try {
        // Check if user email is in admin list or has admin role
        const adminEmails = [
            'admin@blitztclub.com',
            'kevin@blitztclub.com',
            // Add more admin emails as needed
        ];
        
        // Check by email
        if (adminEmails.includes(user.email.toLowerCase())) {
            return true;
        }
        
        // Check user metadata for admin role
        if (user.user_metadata && user.user_metadata.role === 'admin') {
            return true;
        }
        
        // Check if user has admin role in database
        const { data: profile, error } = await getSupabaseClient()
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
            
        if (!error && profile && profile.role === 'admin') {
            return true;
        }
        
        return false;
    } catch (error) {
        return false;
    }
}

// Setup admin controls
function setupAdminControls() {
    // Add admin button to header
    const headerRight = document.querySelector('.header-right');
    if (headerRight && !document.querySelector('.admin-btn')) {
        const adminBtn = document.createElement('button');
        adminBtn.className = 'admin-btn';
        adminBtn.innerHTML = '<i class="fas fa-cog"></i> Admin';
        adminBtn.style.cssText = `
            background: #171a20;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 8px 16px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            margin-left: 12px;
            transition: background 0.2s;
            font-family: 'Montserrat', Arial, sans-serif;
        `;
        
        // Add hover effects
        adminBtn.addEventListener('mouseenter', function() {
            this.style.background = '#00e676';
        });
        
        adminBtn.addEventListener('mouseleave', function() {
            this.style.background = '#171a20';
        });
        
        adminBtn.addEventListener('click', function() {
            window.location.href = 'admin-shop.html';
        });
        
        headerRight.insertBefore(adminBtn, headerRight.firstChild);
    }
    
    // Add admin indicators to product cards
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        const adminIndicator = document.createElement('div');
        adminIndicator.className = 'admin-indicator';
        adminIndicator.innerHTML = '<i class="fas fa-edit"></i>';
        adminIndicator.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0, 230, 118, 0.9);
            color: white;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 0.8rem;
            z-index: 10;
        `;
        
        adminIndicator.addEventListener('click', function(e) {
            e.stopPropagation();
            const productId = card.dataset.productId;
            if (productId) {
                window.location.href = `admin-shop.html?edit=${productId}`;
            }
        });
        
        card.appendChild(adminIndicator);
    });
    
    // Add admin controls to mobile navigation
    const mobileNavActions = document.querySelector('.mobile-nav-actions');
    if (mobileNavActions && !document.querySelector('.mobile-admin-action')) {
        const mobileAdminBtn = document.createElement('button');
        mobileAdminBtn.className = 'mobile-nav-action mobile-admin-action';
        mobileAdminBtn.innerHTML = '<i class="fas fa-cog"></i><span>Admin Panel</span>';
        mobileAdminBtn.addEventListener('click', function() {
            window.location.href = 'admin-shop.html';
            closeMobileMenu();
        });
        mobileNavActions.appendChild(mobileAdminBtn);
    }
    
    // Add admin notification
    showNotification('Admin mode activated', 'success');
}

// Make functions globally accessible
window.showDesktopCart = showDesktopCart;
window.updateDesktopCartItems = updateDesktopCartItems;
window.placeDesktopOrder = placeDesktopOrder;
window.goToShop = goToShop;
window.checkAdminStatus = checkAdminStatus;
window.setupAdminControls = setupAdminControls;

// Mobile detection function moved to top of file

function showMobileCart() {
    // Prevent multiple modals
    const existingModal = document.querySelector('.cart-modal');
    if (existingModal) {
        existingModal.remove();
    }
    const modal = document.createElement('div');
    modal.className = 'cart-modal';
    modal.innerHTML = `
        <div class="cart-modal-content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; font-size: 1.2rem;">Shopping Cart</h3>
                <button onclick="this.closest('.cart-modal').remove()" style="
                    background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;
                ">&times;</button>
            </div>
            <div id="mobile-cart-items">
                ${window.cart.length === 0 ? '<p style="text-align: center; color: #666;">Your cart is empty</p>' : ''}
            </div>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                    <span style="font-weight: 600;">Total:</span>
                    <span style="font-weight: 600; color: #00e676;">
                        $${window.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                    </span>
                </div>
                <button onclick="placeMobileOrder()" style="
                    background: #00e676; color: white; border: none; border-radius: 8px;
                    padding: 12px 24px; font-size: 1rem; font-weight: 600; width: 100%;
                    cursor: pointer;
                ">Place Order</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animate in
    setTimeout(() => modal.classList.add('show'), 10);
    
    // Update cart items
    updateMobileCartItems();
}

function updateMobileCartItems() {
    const cartItems = document.getElementById('mobile-cart-items');
    if (!cartItems) return;
    
    cartItems.innerHTML = window.cart.map(item => `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 12px; background: #f8f9fa; border-radius: 8px;">
            <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 4px;">${item.title}</div>
                <div style="color: #666; font-size: 0.9rem;">$${item.price} each</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <button onclick="updateCartItemQuantity('${item.product_id}', ${item.quantity - 1}); updateMobileCartItems();" style="
                        background: #f0f0f0; color: #333; border: none; border-radius: 4px;
                        width: 24px; height: 24px; font-size: 14px; cursor: pointer;
                        display: flex; align-items: center; justify-content: center;
                    ">-</button>
                    <span style="font-weight: 600; min-width: 25px; text-align: center; font-size: 14px;">${item.quantity}</span>
                    <button onclick="updateCartItemQuantity('${item.product_id}', ${item.quantity + 1}); updateMobileCartItems();" style="
                        background: #f0f0f0; color: #333; border: none; border-radius: 4px;
                        width: 24px; height: 24px; font-size: 14px; cursor: pointer;
                        display: flex; align-items: center; justify-content: center;
                    ">+</button>
                </div>
                <span style="font-weight: 600; color: #00e676; font-size: 1rem; min-width: 50px; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</span>
                <button onclick="removeFromCart('${item.product_id}'); updateMobileCartItems();" style="
                    background: #ff4444; color: white; border: none; border-radius: 4px;
                    padding: 4px 8px; font-size: 0.8rem; cursor: pointer;
                ">Remove</button>
            </div>
        </div>
    `).join('');
}

function placeMobileOrder() {
    if (!currentUser) {
        showNotification('Please log in to place an order', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    // Close cart modal
    const modal = document.querySelector('.cart-modal');
    if (modal) modal.remove();
    
    // Show order modal
    showOrderModal();
}

// Update cart display to use mobile cart on mobile devices
function updateCartDisplay() {
    // Update cart count in header
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        const totalItems = window.cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
    
    // Update mobile cart count
    updateMobileCartCount();

    // For mobile devices, show mobile cart
    if (isMobile() && window.cart.length > 0) {
        console.log('Cart updated:', window.cart);
    }
}

// Note: Cart functionality is now handled directly in the event listeners

// Make mobile functions globally accessible
window.showMobileCart = showMobileCart;
window.updateMobileCartItems = updateMobileCartItems;
window.placeMobileOrder = placeMobileOrder;
window.isMobile = isMobile;

// Add sample products function
async function addSampleProducts() {
    try {
        showNotification('Adding sample products...', 'info');
        
        const supabaseClient = getSupabaseClient();
        
        const sampleProducts = [
            {
                title: 'Blitz T-Shirt',
                category: 'clothing',
                price: 29.99,
                inventory: 50,
                description: 'Premium cotton Blitz T Club t-shirt with embroidered logo',
                image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjM2QzZDNkIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTUwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+QmxpdHogVC1TaGlydDwvdGV4dD4KPC9zdmc+',
                is_published: true,
                compatible_models: ['New Model 3 (Highland)', 'Model Y']
            },
            {
                title: 'Blitz Keychain',
                category: 'accessories',
                price: 12.99,
                inventory: 100,
                description: 'Metal keychain with Blitz T Club logo',
                image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjM2QzZDNkIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTUwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+S2V5Y2hhaW48L3RleHQ+Cjwvc3ZnPg==',
                is_published: true,
                compatible_models: ['New Model 3 (Highland)', 'Model Y']
            },
            {
                title: 'Blitz Stickers',
                category: 'accessories',
                price: 5.99,
                inventory: 200,
                description: 'Set of 5 high-quality vinyl stickers with Blitz T Club designs',
                image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjM2QzZDNkIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTUwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+U3RpY2tlcnM8L3RleHQ+Cjwvc3ZnPg==',
                is_published: true,
                compatible_models: ['New Model 3 (Highland)', 'Model Y']
            },
            {
                title: 'Blitz Hoodie',
                category: 'clothing',
                price: 49.99,
                inventory: 30,
                description: 'Comfortable hoodie with Blitz T Club branding',
                image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjM2QzZDNkIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTUwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SG9vZGllPC90ZXh0Pgo8L3N2Zz4=',
                is_published: true,
                compatible_models: ['New Model 3 (Highland)', 'Model Y']
            }
        ];
        
        const { data, error } = await supabaseClient
            .from('shop_products')
            .insert(sampleProducts);
            
        if (error) {
            console.error('Error adding sample products:', error);
            showNotification('Error adding sample products', 'error');
            return;
        }
        
        showNotification('Sample products added successfully!', 'success');
        
        // Reload products to show the new ones
        await loadProducts();
        
    } catch (error) {
        console.error('Error adding sample products:', error);
        showNotification('Error adding sample products', 'error');
    }
}

// Make addSampleProducts globally accessible
window.addSampleProducts = addSampleProducts;

// Function to update product images with better URLs
async function updateProductImages() {
    try {
        showNotification('Updating product images...', 'info');
        
        const supabaseClient = getSupabaseClient();
        
        // Update the Model Y All in One product with a better image
        const { data, error } = await supabaseClient
            .from('shop_products')
            .update({ 
                image_url: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=400&h=400&fit=crop&crop=center',
                title: 'Model Y 11 Piece ALL IN ONE',
                description: 'Tempered Glass Screen Protector Cup holder insert Center Console Organizer Center Console Organizer 2 Frunk Mat Trunk Mat Well Mat (Under Trunk) Driver Mat Passenger Mat 2nd Row Mat Behind the Screen Organizer',
                category: 'Model Y',
                price: 299.99,
                member_price: 249.99,
                regular_price: 299.99,
                inventory: 25,
                compatible_models: ['Model Y']
            })
            .eq('title', 'Model Y 11 Piece ALL IN ONE')
            .select();
            
        if (error) {
            console.error('Error updating product images:', error);
            showNotification('Error updating product images', 'error');
            return;
        }
        
        showNotification('Product images updated successfully!', 'success');
        
        // Reload products to show the updated ones
        await loadProducts();
        
    } catch (error) {
        console.error('Error updating product images:', error);
        showNotification('Error updating product images', 'error');
    }
}

// Function to add a new Model Y All in One product with proper image
async function addModelYAllInOne() {
    try {
        showNotification('Adding Model Y All in One product...', 'info');
        
        const supabaseClient = getSupabaseClient();
        
        // You can replace this URL with your actual image URL
        const imageUrl = 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=400&h=400&fit=crop&crop=center';
        
        const newProduct = {
            title: 'Model Y 11 Piece ALL IN ONE',
            description: 'Tempered Glass Screen Protector Cup holder insert Center Console Organizer Center Console Organizer 2 Frunk Mat Trunk Mat Well Mat (Under Trunk) Driver Mat Passenger Mat 2nd Row Mat Behind the Screen Organizer',
            category: 'Model Y',
            price: 299.99,
            member_price: 249.99,
            regular_price: 299.99,
            inventory: 25,
            image_url: imageUrl,
            is_published: true,
            compatible_models: ['Model Y']
        };
        
        const { data, error } = await supabaseClient
            .from('shop_products')
            .insert([newProduct])
            .select();
            
        if (error) {
            console.error('Error adding Model Y All in One product:', error);
            showNotification('Error adding product', 'error');
            return;
        }
        
        showNotification('Model Y All in One product added successfully!', 'success');
        
        // Reload products to show the new one
        await loadProducts();
        
    } catch (error) {
        console.error('Error adding Model Y All in One product:', error);
        showNotification('Error adding product', 'error');
    }
}

// Make updateProductImages globally accessible
window.updateProductImages = updateProductImages;
window.addModelYAllInOne = addModelYAllInOne;

// Function to update product with your own image URL
async function updateProductWithImage(productTitle, imageUrl) {
    try {
        showNotification('Updating product image...', 'info');
        
        const supabaseClient = getSupabaseClient();
        
        const { data, error } = await supabaseClient
            .from('shop_products')
            .update({ 
                image_url: imageUrl
            })
            .eq('title', productTitle)
            .select();
            
        if (error) {
            console.error('Error updating product image:', error);
            showNotification('Error updating product image', 'error');
            return;
        }
        
        showNotification('Product image updated successfully!', 'success');
        
        // Reload products to show the updated one
        await loadProducts();
        
    } catch (error) {
        console.error('Error updating product image:', error);
        showNotification('Error updating product image', 'error');
    }
}

window.updateProductWithImage = updateProductWithImage;

// Product Detail Modal Functions
function showProductDetail(productId) {
    const product = window.products.find(p => p.id === productId);
    if (!product) return;

    console.log('Showing product detail for:', product);
    console.log('Product image URL:', product.image_url);

    // Get DOM elements
    const imageElement = document.getElementById('detail-product-image');
    const fallbackElement = document.getElementById('detail-image-fallback');
    const modal = document.getElementById('productDetailModal');
    
    console.log('DOM elements found:');
    console.log('- Image element:', !!imageElement);
    console.log('- Fallback element:', !!fallbackElement);
    console.log('- Modal element:', !!modal);
    
    if (!imageElement) {
        console.error('Detail product image element not found');
        return;
    }
    
    if (!modal) {
        console.error('Product detail modal not found');
        return;
    }

    // Use the same image URL logic as the product card
    const isPlaceholderUrl = (url) => {
        return url && (url.includes('via.placeholder.com') || url.includes('placeholder.com') || url.includes('placeholder'));
    };
    
    // Use the exact same image URL as the product card
    const productImage = isPlaceholderUrl(product.image_url) ? PRODUCT_PLACEHOLDER : (product.image_url || PRODUCT_PLACEHOLDER);
    
    console.log('Using image URL:', productImage);
    
    // Reset display states
    imageElement.style.display = 'block';
    imageElement.style.visibility = 'visible';
    imageElement.style.opacity = '1';
    
    if (fallbackElement) {
        fallbackElement.style.display = 'none';
    }
    
    // Set image properties
    imageElement.src = productImage;
    imageElement.alt = product.title;
    
    // Debug: Check container dimensions
    const imageContainer = imageElement.closest('.image-container');
    if (imageContainer) {
        console.log('Image container dimensions:', {
            offsetWidth: imageContainer.offsetWidth,
            offsetHeight: imageContainer.offsetHeight,
            clientWidth: imageContainer.clientWidth,
            clientHeight: imageContainer.clientHeight,
            styleWidth: imageContainer.style.width,
            styleHeight: imageContainer.style.height
        });
    }
    
    // Debug: Check initial image state
    console.log('Initial image state:', {
        src: imageElement.src,
        width: imageElement.width,
        height: imageElement.height,
        offsetWidth: imageElement.offsetWidth,
        offsetHeight: imageElement.offsetHeight,
        naturalWidth: imageElement.naturalWidth,
        naturalHeight: imageElement.naturalHeight,
        styleWidth: imageElement.style.width,
        styleHeight: imageElement.style.height,
        display: imageElement.style.display,
        visibility: imageElement.style.visibility
    });
    
    // Add comprehensive error handling
    imageElement.onerror = function() {
        console.log('Image failed to load:', this.src);
        this.style.display = 'none';
        this.style.visibility = 'hidden';
        
        if (fallbackElement) {
            fallbackElement.style.display = 'flex';
            console.log('Showing fallback image');
        }
    };

    imageElement.onload = function() {
        console.log('Image loaded successfully:', this.src);
        console.log('Natural dimensions:', this.naturalWidth, 'x', this.naturalHeight);
        console.log('Display dimensions:', this.offsetWidth, 'x', this.offsetHeight);
        
        this.style.display = 'block';
        this.style.visibility = 'visible';
        this.style.opacity = '1';
        
        // Apply different settings for mobile vs desktop
        if (window.innerWidth <= 768) {
            // Mobile settings
            this.style.width = 'auto';
            this.style.height = 'auto';
            this.style.maxHeight = '100%';
            this.style.minHeight = '120px';
            this.style.minWidth = '100px';
        } else {
            // Desktop settings
            this.style.width = '100%';
            this.style.height = '100%';
            this.style.maxHeight = '100%';
            this.style.minHeight = '400px';
            this.style.minWidth = '200px';
        }
        
        this.style.objectFit = 'contain';
        
        if (fallbackElement) {
            fallbackElement.style.display = 'none';
        }
        
        console.log('Image dimensions after styling:', {
            width: this.width,
            height: this.height,
            offsetWidth: this.offsetWidth,
            offsetHeight: this.offsetHeight,
            naturalWidth: this.naturalWidth,
            naturalHeight: this.naturalHeight,
            styleWidth: this.style.width,
            styleHeight: this.style.height
        });
        
        // Force a reflow to ensure proper sizing
        this.offsetHeight;
        
        // Check if image is actually visible
        const rect = this.getBoundingClientRect();
        console.log('Image bounding rect:', rect);
        
        // Ensure image has proper dimensions
        if (this.naturalWidth > 0 && this.naturalHeight > 0) {
            console.log('Image has natural dimensions, ensuring proper display');
            this.style.display = 'block';
            this.style.visibility = 'visible';
            
            // Force the image to take up space
            setTimeout(() => {
                console.log('Final image dimensions:', {
                    offsetWidth: this.offsetWidth,
                    offsetHeight: this.offsetHeight,
                    clientWidth: this.clientWidth,
                    clientHeight: this.clientHeight
                });
            }, 100);
        }
    };
    
    // Force image to load
    if (productImage) {
        imageElement.src = productImage;
        
        // Add a timeout to ensure image loads and displays
        setTimeout(() => {
            if (imageElement.naturalWidth === 0) {
                console.log('Image still not loaded, trying again...');
                imageElement.src = productImage;
            }
            
            // Force dimensions if still not set
            if (imageElement.offsetWidth === 0) {
                console.log('Forcing image dimensions...');
                
                // Apply different settings for mobile vs desktop
                if (window.innerWidth <= 768) {
                    // Mobile settings
                    imageElement.style.width = 'auto';
                    imageElement.style.height = 'auto';
                    imageElement.style.minWidth = '100px';
                    imageElement.style.minHeight = '120px';
                } else {
                    // Desktop settings
                    imageElement.style.width = '100%';
                    imageElement.style.height = '100%';
                    imageElement.style.minWidth = '200px';
                    imageElement.style.minHeight = '400px';
                }
                
                imageElement.style.display = 'block';
                imageElement.style.visibility = 'visible';
            }
        }, 100);
        
        // Additional timeout for final check
        setTimeout(() => {
            console.log('Final image check:', {
                offsetWidth: imageElement.offsetWidth,
                offsetHeight: imageElement.offsetHeight,
                naturalWidth: imageElement.naturalWidth,
                naturalHeight: imageElement.naturalHeight
            });
            
            if (imageElement.offsetWidth === 0 && imageElement.naturalWidth > 0) {
                console.log('Forcing image display...');
                
                // Apply different settings for mobile vs desktop
                if (window.innerWidth <= 768) {
                    // Mobile settings
                    imageElement.style.width = 'auto';
                    imageElement.style.height = 'auto';
                } else {
                    // Desktop settings
                    imageElement.style.width = '100%';
                    imageElement.style.height = '100%';
                }
                
                imageElement.style.display = 'block';
                imageElement.style.visibility = 'visible';
            }
        }, 500);
    }

    // Populate other modal content
    const titleElement = document.getElementById('detail-product-title');
    if (titleElement) {
        titleElement.textContent = product.title;
    }
    
    // Handle description as a list
    const descriptionElement = document.getElementById('detail-product-description');
    const descriptionFallbackElement = document.getElementById('description-fallback');
    
    if (!descriptionElement) {
        console.error('Description element not found');
        return;
    }
    
    const description = product.description || 'No description available.';
    console.log('Processing description:', description); // Debug log
    
    // Always process description as a list
    let productItems = [];
    
    try {
        // First, try to split by line breaks (newlines)
        if (description.includes('\n')) {
            productItems = description.split('\n').filter(item => item.trim());
            console.log('Split by line breaks:', productItems);
        }
        // Then try bullet points
        else if (description.includes('•') || description.includes('-') || description.includes('*')) {
            productItems = description.split(/[•\-*]/).filter(item => item.trim());
            console.log('Split by bullet points:', productItems);
        }
        // Then try commas
        else if (description.includes(',')) {
            productItems = description.split(',').filter(item => item.trim());
            console.log('Split by commas:', productItems);
        }
        // Then try periods
        else if (description.includes('.')) {
            productItems = description.split('.').filter(item => item.trim());
            console.log('Split by periods:', productItems);
        }
        // If none of the above, treat the entire description as one item
        else {
            console.log('No delimiters found, treating as single item');
            productItems = [description.trim()];
        }
        
        // Clean up the product items
        productItems = productItems
            .map(item => item.trim())
            .filter(item => item.length > 0 && item !== 'undefined' && item !== 'null');
        
        console.log('Final product items:', productItems); // Debug log
        
        // If no product items found, show default
        if (productItems.length === 0) {
            productItems = ['Product details available upon request.'];
        }
        
        // Create numbered list items
        const listItems = productItems.map(item => 
            `<li>${item.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</li>`
        ).join('');
        
        console.log('Generated HTML:', listItems); // Debug log
        
        // Clear any existing content and set the list
        descriptionElement.innerHTML = '';
        descriptionElement.innerHTML = listItems;
        
        // Force counter reset
        descriptionElement.style.counterReset = 'item';
        
        // Show the description list and hide fallback
        descriptionElement.style.display = 'block';
        if (descriptionFallbackElement) {
            descriptionFallbackElement.style.display = 'none';
        }
        
        // Debug: Check if list items are created
        const listItemElements = descriptionElement.querySelectorAll('li');
        console.log('Number of list items created:', listItemElements.length);
        
    } catch (error) {
        console.error('Error processing description:', error);
        if (descriptionFallbackElement) {
            descriptionFallbackElement.style.display = 'block';
        }
        descriptionElement.style.display = 'none';
    }

    // Populate pricing information
    const memberPriceElement = document.getElementById('detail-member-price');
    const regularPriceElement = document.getElementById('detail-regular-price');
    const savingsElement = document.getElementById('detail-savings');
    
    if (memberPriceElement) {
        memberPriceElement.textContent = formatPrice(product.member_price || product.price);
    }
    
    if (regularPriceElement && product.regular_price) {
        regularPriceElement.textContent = formatPrice(product.regular_price);
        regularPriceElement.style.display = 'inline';
    } else if (regularPriceElement) {
        regularPriceElement.style.display = 'none';
    }
    
    if (savingsElement && product.regular_price && product.member_price) {
        const savings = ((product.regular_price - product.member_price) / product.regular_price * 100).toFixed(0);
        savingsElement.textContent = `Save ${savings}%`;
        savingsElement.style.display = 'inline';
    } else if (savingsElement) {
        savingsElement.style.display = 'none';
    }

    // Populate meta information
    const categoryElement = document.getElementById('detail-category');
    const availabilityElement = document.getElementById('detail-availability');
    
    if (categoryElement) {
        categoryElement.textContent = product.category || 'N/A';
    }
    
    if (availabilityElement) {
        const inventory = product.inventory || 0;
        availabilityElement.textContent = `${inventory} in stock`;
    }

    // Reset quantity to 1
    const quantityElement = document.getElementById('detail-quantity');
    if (quantityElement) {
        quantityElement.textContent = '1';
    }

    // Store current product ID for add to cart functionality
    window.currentDetailProductId = productId;

    // Show the modal
    modal.style.display = 'block';
    console.log('Product detail modal displayed successfully');
}

// Make showProductDetail globally accessible
window.showProductDetail = showProductDetail;

// Utility function to validate and fetch images from Supabase
async function validateImageUrl(imageUrl) {
    if (!imageUrl) return PRODUCT_PLACEHOLDER;
    
    // If it's already a data URL or external URL, return as is
    if (imageUrl.startsWith('data:') || imageUrl.startsWith('http')) {
        return imageUrl;
    }
    
    // If it's a Supabase URL, validate it
    if (imageUrl.includes('supabase.co')) {
        try {
            const response = await fetch(imageUrl, { method: 'HEAD' });
            if (response.ok) {
                return imageUrl;
            } else {
                console.warn('Image URL not accessible:', imageUrl);
                return PRODUCT_PLACEHOLDER;
            }
        } catch (error) {
            console.warn('Error validating image URL:', imageUrl, error);
            return PRODUCT_PLACEHOLDER;
        }
    }
    
    return imageUrl;
}

// Function to update product images with real Supabase URLs
async function updateProductWithRealImage(productId, imageUrl) {
    try {
        const supabaseClient = getSupabaseClient();
        
        const { error } = await supabaseClient
            .from('shop_products')
            .update({ image_url: imageUrl })
            .eq('id', productId);
            
        if (error) {
            console.error('Error updating product image:', error);
            return false;
        }
        
        console.log('Product image updated successfully');
        return true;
    } catch (error) {
        console.error('Error updating product image:', error);
        return false;
    }
}

// Make functions globally accessible
window.validateImageUrl = validateImageUrl;
window.updateProductWithRealImage = updateProductWithRealImage;

// Quantity control functions
function changeQuantity(delta) {
    const quantityElement = document.getElementById('detail-quantity');
    if (!quantityElement) return;
    
    let currentQuantity = parseInt(quantityElement.textContent) || 1;
    currentQuantity = Math.max(1, currentQuantity + delta);
    quantityElement.textContent = currentQuantity;
}

// Add to cart from detail modal
function addToCartFromDetail() {
    console.log('addToCartFromDetail called');
    console.log('Current detail product ID:', window.currentDetailProductId);
    
    if (!window.currentDetailProductId) {
        console.error('No product selected');
        return;
    }
    
    const quantityElement = document.getElementById('detail-quantity');
    const quantity = parseInt(quantityElement.textContent) || 1;
    
    console.log('Adding to cart from detail modal:', {
        productId: window.currentDetailProductId,
        quantity: quantity
    });
    
    addToCart(window.currentDetailProductId, quantity);
    document.getElementById('productDetailModal').style.display = 'none';
    showNotification('Product added to cart!', 'success');
}

// Make these functions globally accessible
window.changeQuantity = changeQuantity;
window.addToCartFromDetail = addToCartFromDetail;

// Function to validate weekday selection
function validateWeekday(dateInput) {
    if (!dateInput.value) return; // Allow empty value
    
    const selectedDate = new Date(dateInput.value);
    const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        showNotification('⚠️ Weekend selected! Please choose a weekday (Monday-Friday). Office is closed on weekends.', 'error');
        dateInput.value = ''; // Clear the selection
        return false;
    }
    
    return true;
}

// Make validateWeekday globally accessible
window.validateWeekday = validateWeekday;

// Update mobile cart count in the header
function updateMobileCartCount() {
    const mobileCartCount = document.getElementById('mobile-cart-count');
    if (mobileCartCount) {
        const totalItems = window.cart ? window.cart.reduce((sum, item) => sum + item.quantity, 0) : 0;
        mobileCartCount.textContent = totalItems;
    }
}

// Add this after DOMContentLoaded or at the end of the file

document.addEventListener('click', function(e) {
    const pill = e.target.closest('.mobile-model-pill');
    if (pill && pill.closest('#mobile-menu')) {
        const model = pill.getAttribute('data-model');
        // Update active state
        document.querySelectorAll('.mobile-model-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        // Update desktop pills if they exist
        document.querySelectorAll('.model-pill').forEach(p => {
            if (p.getAttribute('data-model') === model) {
                p.classList.add('active');
            } else {
                p.classList.remove('active');
            }
        });
        // Filter products
        filterProductsByModel(model);
        // Auto-close the mobile menu
        closeMobileMenu();
    }
});

// Add this near the top or after displayProducts
function filterProductsByModel(model) {
    currentModel = model;
    displayProducts();
}
window.filterProductsByModel = filterProductsByModel;

function updateCartCount(count) {
    const desktopCartCount = document.getElementById('cart-count');
    const mobileCartCount = document.getElementById('mobile-cart-count');
    if (desktopCartCount) {
        desktopCartCount.textContent = count;
    }
    if (mobileCartCount) {
        mobileCartCount.textContent = count;
        // Hide badge if 0, show if >0
        if (parseInt(count) > 0) {
            mobileCartCount.style.display = 'inline-block';
        } else {
            mobileCartCount.style.display = 'none';
        }
    }
}