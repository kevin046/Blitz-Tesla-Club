# Blitz Shop - Ecommerce Integration

## Overview

The Blitz Shop is a professional ecommerce system integrated into the Blitz T Club website. It allows members to browse and order exclusive merchandise, while admins can manage inventory and orders.

## Features

### For Members
- Browse available products by category
- Add items to cart with quantity selection
- Place orders for in-person pickup
- View order history and status
- Real-time inventory tracking
- Email order confirmations

### For Admins
- Add, edit, and delete products
- Upload product images via URL
- Manage inventory quantities
- Publish/unpublish products
- View all orders and customer details
- Export inventory data
- Set product categories and pricing

## Setup Instructions

### 1. Database Setup

Run the SQL script to create the necessary tables:

```sql
-- Execute the shop_tables.sql file in your Supabase database
-- This will create:
-- - shop_products table
-- - shop_orders table
-- - Required indexes and RLS policies
```

### 2. File Structure

The following files have been added to your project:

```
├── blitz-shop.html          # Main shop page for members
├── blitz-shop.js            # Shop functionality JavaScript
├── admin-shop.html          # Admin management page
├── admin-shop.js            # Admin functionality JavaScript
├── shop_tables.sql          # Database setup script
└── SHOP_README.md           # This file
```

### 3. Server Routes

The following routes have been added to `server.js`:

- `GET /blitz-shop` - Main shop page
- `GET /admin-shop` - Admin management page
- `GET /api/shop/products` - Get published products
- `POST /api/shop/products` - Create new product (admin)
- `PUT /api/shop/products/:id` - Update product (admin)
- `DELETE /api/shop/products/:id` - Delete product (admin)
- `POST /api/shop/orders` - Create order
- `GET /api/shop/orders/user/:userId` - Get user orders
- `GET /api/shop/orders` - Get all orders (admin)
- `POST /api/send-email` - Send email notifications

### 4. Dashboard Integration

The shop has been integrated into the dashboard with:

- Shop statistics card showing available products and recent orders
- Admin button for shop management (visible to admins/premium members)
- Quick access to browse the shop

## Usage

### For Members

1. **Accessing the Shop**
   - Log into your account
   - Navigate to the dashboard
   - Click on the "Blitz Shop" card or "Shop Now" link

2. **Browsing Products**
   - Use category filters to find specific items
   - View product details, pricing, and availability
   - Add items to cart with desired quantity

3. **Placing Orders**
   - Review cart contents and total
   - Add optional pickup notes
   - Confirm order to place reservation
   - Receive email confirmation

### For Admins

1. **Accessing Admin Panel**
   - Log into your admin account
   - Navigate to the dashboard
   - Click "Manage Shop" button (visible to admins)

2. **Managing Products**
   - Add new products with title, description, price, and inventory
   - Upload product images via URL
   - Set product categories (clothing, accessories, electronics, collectibles)
   - Publish or unpublish products
   - Edit existing products
   - Delete products

3. **Managing Orders**
   - View all customer orders
   - See order details including items, customer info, and pickup notes
   - Track order status

4. **Inventory Management**
   - Monitor product inventory levels
   - Export inventory data to CSV
   - Update product quantities

## Database Schema

### shop_products Table
```sql
- id (UUID, Primary Key)
- title (VARCHAR, Required)
- description (TEXT)
- price (DECIMAL, Required)
- inventory (INTEGER, Default 0)
- category (VARCHAR, Required)
- image_url (TEXT)
- is_published (BOOLEAN, Default false)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### shop_orders Table
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key to auth.users)
- items (JSONB, Required) - Array of order items
- total_amount (DECIMAL, Required)
- pickup_note (TEXT)
- status (VARCHAR, Default 'pending')
- order_date (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## Security Features

- **Row Level Security (RLS)** enabled on all shop tables
- **User-specific access** - users can only view their own orders
- **Admin-only access** - product management restricted to admins
- **Published products only** - members can only see published products
- **Inventory validation** - prevents overselling

## Email Notifications

The system automatically sends:
- Order confirmation emails to customers
- Order details including pickup information
- Professional branding with Blitz T Club logo

## Customization

### Adding New Categories
1. Update the category options in `admin-shop.html`
2. Update the filter buttons in `blitz-shop.html`
3. Add any category-specific styling as needed

### Modifying Product Fields
1. Update the database schema in `shop_tables.sql`
2. Modify the admin form in `admin-shop.html`
3. Update the product display in `blitz-shop.html`
4. Update the API endpoints in `server.js`

### Styling Changes
- Shop-specific styles are in `blitz-shop.html`
- Admin styles are in `admin-shop.html`
- Dashboard integration styles are in `dashboard.html`

## Troubleshooting

### Common Issues

1. **Products not showing**
   - Check if products are published (`is_published = true`)
   - Verify inventory is greater than 0
   - Check RLS policies are correctly applied

2. **Admin access denied**
   - Verify user has `role = 'admin'` or `membership_type = 'premium'`
   - Check RLS policies for admin access

3. **Orders not being created**
   - Verify user is authenticated
   - Check that all required fields are provided
   - Ensure inventory is available

4. **Email not sending**
   - Verify email configuration in `server.js`
   - Check SMTP settings and credentials
   - Test email endpoint manually

### Debug Mode

To enable debug logging, uncomment the console.log statements in the JavaScript files:

```javascript
// Temporarily enable console output for debugging
// console.log = function(){};
// console.warn = function(){};
// console.error = function(){};
```

## Future Enhancements

Potential improvements for future versions:

1. **Payment Integration**
   - Online payment processing
   - Multiple payment methods
   - Invoice generation

2. **Advanced Features**
   - Product reviews and ratings
   - Wishlist functionality
   - Bulk order processing
   - Shipping options

3. **Analytics**
   - Sales reports and analytics
   - Popular product tracking
   - Customer behavior insights

4. **Mobile App**
   - Native mobile application
   - Push notifications
   - Offline browsing

## Support

For technical support or questions about the Blitz Shop integration, please contact the development team or refer to the main project documentation. 