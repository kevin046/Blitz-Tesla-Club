# Image Upload System for Blitz Shop

## Overview
This system allows admins to upload product images directly to Supabase Storage from the admin panel. Images are stored securely and served via CDN for optimal performance.

## Features

### 🖼️ Image Upload Modal
- **File Selection**: Choose image files (JPG, PNG, GIF, WebP)
- **Live Preview**: See image preview before uploading
- **Progress Indicator**: Shows upload progress with spinner
- **Error Handling**: Displays clear error messages if upload fails

### 📁 Storage Organization
- **Bucket**: `shop-images` in Supabase Storage
- **Folder Structure**: `product-images/YYYY-MM-DD-HH-MM-SS-random.jpg`
- **Public Access**: Images are publicly accessible via CDN
- **Unique Names**: Prevents filename conflicts

### 🔒 Security Features
- **Authentication Required**: Only logged-in users can upload
- **File Type Validation**: Only image files accepted
- **RLS Policies**: Row Level Security protects storage
- **Admin Only**: Upload functionality restricted to admin users

## Setup Instructions

### 1. Create Supabase Storage Bucket
Run the SQL script `setup-storage.sql` in your Supabase SQL editor:

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-images', 'shop-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies
-- (See setup-storage.sql for complete script)
```

### 2. Configure Storage Policies
The script creates these policies:
- **Upload**: Authenticated users can upload to shop-images
- **View**: Public can view shop-images
- **Update**: Authenticated users can update their uploads
- **Delete**: Authenticated users can delete their uploads

### 3. Test the Upload System
1. Log in as admin
2. Go to Admin Shop Management
3. Click "Add Product" or "Edit Product"
4. Click "Upload Image" button next to image fields
5. Select an image file
6. Click "Upload" to upload to Supabase Storage

## Usage

### For Admins
1. **Add Product**: Click "Add Product" → Fill form → Click "Upload Image" → Select file → Upload
2. **Edit Product**: Click edit icon → Click "Upload Image" → Select new image → Upload
3. **Multiple Images**: Upload both main image and installed image for dual-image products

### File Requirements
- **Supported Formats**: JPG, PNG, GIF, WebP
- **Max Size**: 10MB per file
- **Recommended**: 800x600px or larger for good quality
- **Aspect Ratio**: Square or 4:3 recommended for consistency

## Technical Details

### Storage Structure
```
shop-images/
├── product-images/
│   ├── 1703123456789-abc123def.jpg
│   ├── 1703123456790-xyz789ghi.png
│   └── ...
```

### URL Format
```
https://qhkcrrphsjpytdfqfamq.supabase.co/storage/v1/object/public/shop-images/product-images/filename.jpg
```

### JavaScript Functions
- `setupImageUpload()`: Initializes upload buttons
- `openImageUploadModal(fieldId)`: Opens upload modal
- `uploadImage(fieldId)`: Handles file upload to Supabase

### Error Handling
- **Network Errors**: Retry with better connection
- **File Size**: Reduce image size if too large
- **File Type**: Ensure file is valid image format
- **Storage Quota**: Contact admin if storage full

## Troubleshooting

### Common Issues

**"Upload failed"**
- Check internet connection
- Verify file is valid image
- Ensure file size < 10MB
- Check Supabase storage quota

**"Permission denied"**
- Ensure user is logged in
- Verify user has admin role
- Check RLS policies are set correctly

**"Image not displaying"**
- Check image URL is correct
- Verify bucket is public
- Ensure CDN is working

### Debug Steps
1. Check browser console for errors
2. Verify Supabase storage bucket exists
3. Test with smaller image file
4. Check network tab for upload requests

## Security Considerations

### File Validation
- Client-side: File type and size validation
- Server-side: Supabase handles additional validation
- RLS: Row Level Security prevents unauthorized access

### Access Control
- **Upload**: Admin users only
- **View**: Public (for product display)
- **Delete**: Admin users only
- **Update**: Admin users only

### Best Practices
- Use unique filenames to prevent conflicts
- Validate file types on both client and server
- Implement file size limits
- Regular cleanup of unused images
- Monitor storage usage

## Future Enhancements

### Planned Features
- **Image Compression**: Automatic optimization
- **Multiple Upload**: Batch upload support
- **Image Cropping**: Built-in crop tool
- **Gallery View**: Browse uploaded images
- **CDN Caching**: Improved performance

### Integration Ideas
- **AI Tagging**: Automatic product categorization
- **Duplicate Detection**: Prevent duplicate uploads
- **Image Analytics**: Track image performance
- **Backup System**: Automatic image backups

## Support

For technical support:
1. Check this README for common solutions
2. Review browser console for error messages
3. Test with different image files
4. Contact development team if issues persist

---

**Last Updated**: December 2024
**Version**: 1.0.0 