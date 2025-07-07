// Admin Shop Management JavaScript
// This file handles the admin shop management functionality

// Global variables
let orders = [];
let editingProduct = null;

// Always use the global Supabase client
const supabaseClient = window.supabaseClient;
if (!supabaseClient) {
    throw new Error('Supabase client not initialized! Make sure navigation.js or a global script initializes window.supabaseClient before this script runs.');
}

// Initialize the admin shop management when the page loads
document.addEventListener('DOMContentLoaded', async function() {
    // 1. Check if user is authenticated
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error || !user) {
        // Not logged in, redirect to login
        window.location.href = 'login.html';
        return;
    }

    // 2. Check if user is admin
    const authorizedAdminIds = [
        '31f25dda-d747-412d-94c8-d49021f7bfc4',
        '05d85f12-21ed-46ea-ba7f-89065a9cd570',
        'd2b873f6-5f34-451e-9f8b-b9b4ea4ff819',
        'f57ecbf3-5508-401c-a9b7-e69b6da9b1fd'
    ];
    if (!authorizedAdminIds.includes(user.id)) {
        // Not an admin, show access denied
        document.body.innerHTML = `
            <div style="text-align:center; margin-top:100px;">
                <h2>Access Denied</h2>
                <p>You do not have permission to access this page.</p>
                <a href="dashboard.html" class="btn primary-btn">Back to Dashboard</a>
            </div>
        `;
        return;
    }

    // If authenticated and admin, continue loading the admin shop
    initializeAdminPanel();
});

async function initializeAdminShop() {
    try {
        // Check if user is authenticated and is admin
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        if (error) {
            console.log('Authentication error:', error.message);
            // Redirect to login for admin pages
            window.location.href = 'login.html';
            return;
        }
        if (!user) {
            console.log('No authenticated user');
            window.location.href = 'login.html';
            return;
        }

        // Check if user is admin
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role, membership_type')
            .eq('id', user.id)
            .single();

        // Allow access if user is admin or has premium membership
        if (!profile || (profile.role !== 'admin' && profile.membership_type !== 'premium')) {
            window.location.href = 'dashboard.html';
            return;
        }

        window.currentUser = user;
        
        // Load products and setup event listeners
        await loadProducts();
        setupEventListeners();
        
    } catch (error) {
        console.error('Error initializing admin shop:', error);
        showNotification('Error initializing admin shop', 'error');
    }
}

function setupEventListeners() {
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

    // Product form submission
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }

    // Image upload functionality
    setupImageUpload();
    
    // Image preview
    const imageInput = document.getElementById('product-image');
    if (imageInput) {
        imageInput.addEventListener('input', function() {
            const preview = document.getElementById('image-preview');
            const url = this.value;
            
            if (url) {
                preview.src = url;
                preview.style.display = 'block';
                preview.onerror = function() {
                    this.style.display = 'none';
                };
            } else {
                preview.style.display = 'none';
            }
        });
    }

    // Price calculation
    const regularPriceInput = document.getElementById('product-regular-price');
    const memberPriceInput = document.getElementById('product-member-price');
    
    if (regularPriceInput) {
        regularPriceInput.addEventListener('input', calculateSavings);
    }
    if (memberPriceInput) {
        memberPriceInput.addEventListener('input', calculateSavings);
    }
}

function calculateSavings() {
    const regularPrice = parseFloat(document.getElementById('product-regular-price')?.value) || 0;
    const memberPrice = parseFloat(document.getElementById('product-member-price')?.value) || 0;
    const savingsField = document.getElementById('product-savings');
    
    if (regularPrice > 0 && memberPrice > 0 && savingsField) {
        const savings = ((regularPrice - memberPrice) / regularPrice * 100).toFixed(1);
        savingsField.value = `${savings}% savings`;
    } else if (savingsField) {
        savingsField.value = '';
    }
}

async function loadProducts() {
    try {
        showLoading(true);
        
        const { data, error } = await supabaseClient
            .from('shop_products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        window.products = data || [];
        displayProductsTable();
        
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error loading products', 'error');
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    const container = document.getElementById('products-table-container');
    if (show) {
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading products...</p>
            </div>
        `;
    }
}

function displayProductsTable() {
    const container = document.getElementById('products-table-container');
    
    if (window.products.length === 0) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #b0b8c1;">
                <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 15px; color: #666;"></i>
                <h3>No Products Available</h3>
                <p>Add your first product to get started!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Image</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Regular Price</th>
                    <th>Member Price</th>
                    <th>Member Savings</th>
                    <th>Inventory</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${window.products.map(product => createProductRow(product)).join('')}
            </tbody>
        </table>
    `;

    // Add event listeners to action buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.dataset.productId;
            editProduct(productId);
        });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.dataset.productId;
            deleteProduct(productId);
        });
    });

    document.querySelectorAll('.btn-toggle').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.dataset.productId;
            toggleProductStatus(productId);
        });
    });
}

function createProductRow(product) {
    return `
        <tr>
            <td>
                <img src="${product.image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjMwIiB5PSIzMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4='}" 
                     alt="${product.title}" 
                     class="product-image-small"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjMwIiB5PSIzMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4='">
            </td>
            <td>${product.title}</td>
            <td>${product.category}</td>
            <td>$${(product.regular_price || product.price || 0).toFixed(2)}</td>
            <td>$${(product.member_price || product.price || 0).toFixed(2)}</td>
            <td>${product.regular_price && product.member_price && product.regular_price > product.member_price ? 
                `${((product.regular_price - product.member_price) / product.regular_price * 100).toFixed(1)}%` : 
                'No discount'}</td>
            <td>${product.inventory}</td>
            <td>
                <span class="status-badge ${product.is_published ? 'status-published' : 'status-draft'}">
                    ${product.is_published ? 'Published' : 'Draft'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-small btn-edit" data-product-id="${product.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-small btn-toggle" data-product-id="${product.id}">
                        ${product.is_published ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>'}
                    </button>
                    <button class="btn-small btn-delete" data-product-id="${product.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function showAddProductModal() {
    editingProduct = null;
    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-plus"></i> Add New Product';
    }
    
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.reset();
    }
    
    const imagePreview = document.getElementById('image-preview');
    if (imagePreview) {
        imagePreview.style.display = 'none';
    }
    
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.style.display = 'none';
    }
    editingProduct = null;
}

async function handleProductSubmit(event) {
    event.preventDefault();
    
    try {
        const formData = {
            title: document.getElementById('product-title').value,
            category: document.getElementById('product-category').value,
            price: parseFloat(document.getElementById('product-regular-price').value), // Keep for backward compatibility
            regular_price: parseFloat(document.getElementById('product-regular-price').value),
            member_price: parseFloat(document.getElementById('product-member-price').value),
            inventory: parseInt(document.getElementById('product-inventory').value),
            description: document.getElementById('product-description').value,
            image_url: document.getElementById('product-image').value || null,
            is_published: document.getElementById('product-published').checked
        };

        if (editingProduct) {
            // Update existing product
            const { error } = await supabaseClient
                .from('shop_products')
                .update(formData)
                .eq('id', editingProduct.id);

            if (error) throw error;
            showNotification('Product updated successfully', 'success');
        } else {
            // Create new product
            const { error } = await supabaseClient
                .from('shop_products')
                .insert([formData]);

            if (error) throw error;
            showNotification('Product added successfully', 'success');
        }

        closeProductModal();
        await loadProducts();

    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('Error saving product', 'error');
    }
}

async function editProduct(productId) {
    const product = window.products.find(p => p.id === productId);
    if (!product) return;

    editingProduct = product;
    
    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Product';
    }
    
    // Populate form
    const titleInput = document.getElementById('product-title');
    if (titleInput) titleInput.value = product.title;
    
    const categoryInput = document.getElementById('product-category');
    if (categoryInput) categoryInput.value = product.category;
    
    const regularPriceInput = document.getElementById('product-regular-price');
    if (regularPriceInput) regularPriceInput.value = product.regular_price || product.price || '';
    
    const memberPriceInput = document.getElementById('product-member-price');
    if (memberPriceInput) memberPriceInput.value = product.member_price || product.price || '';
    
    const inventoryInput = document.getElementById('product-inventory');
    if (inventoryInput) inventoryInput.value = product.inventory;
    
    const descriptionInput = document.getElementById('product-description');
    if (descriptionInput) descriptionInput.value = product.description;
    
    const imageInput = document.getElementById('product-image');
    if (imageInput) imageInput.value = product.image_url || '';
    
    const publishedInput = document.getElementById('product-published');
    if (publishedInput) publishedInput.checked = product.is_published;

    // Show image preview if exists
    const preview = document.getElementById('image-preview');
    if (preview && product.image_url) {
        preview.src = product.image_url;
        preview.style.display = 'block';
    } else if (preview) {
        preview.style.display = 'none';
    }

    const modal = document.getElementById('productModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        const { error } = await supabaseClient
            .from('shop_products')
            .delete()
            .eq('id', productId);

        if (error) throw error;

        showNotification('Product deleted successfully', 'success');
        await loadProducts();

    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Error deleting product', 'error');
    }
}

async function toggleProductStatus(productId) {
    try {
        const product = window.products.find(p => p.id === productId);
        if (!product) return;

        const { error } = await supabaseClient
            .from('shop_products')
            .update({ is_published: !product.is_published })
            .eq('id', productId);

        if (error) throw error;

        showNotification(`Product ${!product.is_published ? 'published' : 'unpublished'} successfully`, 'success');
        await loadProducts();

    } catch (error) {
        console.error('Error toggling product status:', error);
        showNotification('Error updating product status', 'error');
    }
}

async function loadOrders() {
    try {
        const { data, error } = await supabaseClient
            .from('shop_orders')
            .select(`
                *,
                profiles:user_id(full_name, email, member_id)
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        orders = data || [];
        displayOrders();

        const modal = document.getElementById('ordersModal');
        if (modal) {
            modal.style.display = 'block';
        }

    } catch (error) {
        console.error('Error loading orders:', error);
        showNotification('Error loading orders', 'error');
    }
}

function displayOrders() {
    const container = document.getElementById('orders-container');
    if (!container) return;
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #b0b8c1; padding: 40px;">
                <i class="fas fa-shopping-cart" style="font-size: 3rem; margin-bottom: 15px; color: #666;"></i>
                <h3>No Orders Yet</h3>
                <p>Orders will appear here when members place them.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="max-height: 400px; overflow-y: auto;">
            ${orders.map(order => createOrderCard(order)).join('')}
        </div>
    `;
}

function createOrderCard(order) {
    const orderDate = new Date(order.created_at).toLocaleDateString();
    const total = order.total_amount.toFixed(2);
    const memberId = order.profiles?.member_id || 'N/A';
    const isPending = order.status === 'pending';
    
    return `
        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="margin: 0; color: #fff;">Order #${order.id}</h4>
                <span style="color: #00e676; font-weight: 600;">$${total}</span>
            </div>
            <p style="margin: 5px 0; color: #b0b8c1;">
                <strong>Customer:</strong> ${order.profiles?.full_name || 'Unknown'}<br>
                <strong>Member ID:</strong> ${memberId}<br>
                <strong>Date:</strong> ${orderDate}<br>
                <strong>Status:</strong> <span style="color: ${isPending ? '#ffc107' : '#00e676'};">${order.status}</span><br>
                <strong>Items:</strong> ${order.items.length} item(s)
            </p>
            ${order.pickup_note ? `<p style="margin: 5px 0; color: #b0b8c1;"><strong>Note:</strong> ${order.pickup_note}</p>` : ''}
            ${order.preferred_datetime ? `<p style="margin: 5px 0; color: #b0b8c1;"><strong>Preferred Pickup:</strong> ${order.preferred_datetime}</p>` : ''}
            ${isPending ? `
                <div style="margin-top: 15px; text-align: center;">
                    <button onclick="approveOrder('${order.id}')" style="
                        background: linear-gradient(135deg, #00e676 0%, #00c853 100%);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        padding: 10px 20px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                        ✓ Approve Order
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

async function approveOrder(orderId) {
    try {
        // Show confirmation dialog
        const confirmed = confirm('Are you sure you want to approve this order? This will mark it as complete.');
        if (!confirmed) return;

        // Update order status to complete
        const { error } = await supabaseClient
            .from('shop_orders')
            .update({ 
                status: 'complete',
                completed_at: new Date().toISOString()
            })
            .eq('id', orderId);

        if (error) throw error;

        // Show success notification
        showNotification('Order approved successfully!', 'success');

        // Reload orders to reflect the change
        await loadOrders();

    } catch (error) {
        console.error('Error approving order:', error);
        showNotification('Error approving order', 'error');
    }
}

async function exportInventory() {
    try {
        const csvContent = generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `blitz-shop-inventory-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showNotification('Inventory exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting inventory:', error);
        showNotification('Error exporting inventory', 'error');
    }
}

function generateCSV() {
    const headers = ['Title', 'Category', 'Price', 'Inventory', 'Status', 'Created Date'];
    const rows = products.map(product => [
        product.title,
        product.category,
        product.price,
        product.inventory,
        product.is_published ? 'Published' : 'Draft',
        new Date(product.created_at).toLocaleDateString()
    ]);
    
    return [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
}

// Image Upload Functions
function setupImageUpload() {
    // Add upload buttons to the form
    const imageFields = ['product-image', 'product-installed-image'];
    
    imageFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            // Create upload button
            const uploadBtn = document.createElement('button');
            uploadBtn.type = 'button';
            uploadBtn.className = 'upload-btn';
            uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Image';
            uploadBtn.style.cssText = `
                background: #00e676;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                font-size: 0.875rem;
                cursor: pointer;
                margin-left: 10px;
                transition: background 0.2s;
            `;
            
            uploadBtn.addEventListener('click', () => openImageUploadModal(fieldId));
            
            // Insert button after the input field
            field.parentNode.insertBefore(uploadBtn, field.nextSibling);
        }
    });
}

function openImageUploadModal(fieldId) {
    const modal = document.createElement('div');
    modal.className = 'upload-modal';
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
        z-index: 3000;
    `;
    
    modal.innerHTML = `
        <div style="
            background: linear-gradient(145deg, #222a36, #1c2330);
            padding: 30px;
            border-radius: 15px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #fff;">Upload Image</h3>
                <button onclick="this.closest('.upload-modal').remove()" style="
                    background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;
                ">&times;</button>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; color: #b0b8c1;">Select Image File:</label>
                <input type="file" id="image-file-input" accept="image/*" style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    background: rgba(255, 255, 255, 0.05);
                    color: #fff;
                ">
            </div>
            
            <div id="upload-preview" style="margin-bottom: 20px; text-align: center; display: none;">
                <img id="preview-image" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="this.closest('.upload-modal').remove()" style="
                    background: #666; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;
                ">Cancel</button>
                <button id="upload-confirm-btn" onclick="uploadImage('${fieldId}')" style="
                    background: #00e676; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;
                " disabled>Upload</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup file input preview
    const fileInput = modal.querySelector('#image-file-input');
    const preview = modal.querySelector('#upload-preview');
    const previewImg = modal.querySelector('#preview-image');
    const confirmBtn = modal.querySelector('#upload-confirm-btn');
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                preview.style.display = 'block';
                confirmBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        } else {
            preview.style.display = 'none';
            confirmBtn.disabled = true;
        }
    });
}

async function uploadImage(fieldId) {
    const fileInput = document.querySelector('#image-file-input');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Please select an image file', 'error');
        return;
    }
    
    try {
        // Show loading state
        const confirmBtn = document.querySelector('#upload-confirm-btn');
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        confirmBtn.disabled = true;
        
        // Generate unique filename
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const fileName = `product-images/${timestamp}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
        
        // Upload to Supabase Storage
        const { data, error } = await supabaseClient.storage
            .from('shop-images')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) {
            throw error;
        }
        
        // Get public URL
        const { data: urlData } = supabaseClient.storage
            .from('shop-images')
            .getPublicUrl(fileName);
        
        // Update the input field
        const inputField = document.getElementById(fieldId);
        if (inputField) {
            inputField.value = urlData.publicUrl;
            
            // Trigger preview update
            const preview = document.getElementById('image-preview');
            if (preview) {
                preview.src = urlData.publicUrl;
                preview.style.display = 'block';
            }
        }
        
        // Close modal
        document.querySelector('.upload-modal').remove();
        
        showNotification('Image uploaded successfully!', 'success');
        
    } catch (error) {
        console.error('Upload error:', error);
        showNotification('Error uploading image: ' + error.message, 'error');
        
        // Reset button
        const confirmBtn = document.querySelector('#upload-confirm-btn');
        confirmBtn.innerHTML = 'Upload';
        confirmBtn.disabled = false;
    }
}

// Make upload functions globally accessible
window.openImageUploadModal = openImageUploadModal;
window.uploadImage = uploadImage;

function showNotification(message, type) {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
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

// Export functions for global access
window.showAddProductModal = showAddProductModal;
window.closeProductModal = closeProductModal;
window.loadOrders = loadOrders;
window.exportInventory = exportInventory;
window.approveOrder = approveOrder; 