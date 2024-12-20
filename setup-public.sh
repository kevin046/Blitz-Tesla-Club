#!/bin/bash

# Create directory structure
mkdir -p public/{css,js,api}

# Move static files
mv *.html public/
mv styles.css public/css/
mv *.js public/js/
mv api/*.js public/api/

# Create Vercel config if not exists
if [ ! -f vercel.json ]; then
  cp vercel.json.example vercel.json
fi

# Ensure proper permissions
chmod +x public/api/*.js