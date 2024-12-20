#!/bin/bash

# Create directory structure
mkdir -p public/css public/js

# Move files to their correct locations
mv styles.css public/css/
mv script.js public/js/
mv register.js public/js/
mv login.js public/js/
mv dashboard.js public/js/
mv nav.js public/js/

# Move HTML files to public directory
mv *.html public/ 