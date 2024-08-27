#!/bin/bash

# Navigate to the deployment directory
cd /site/wwwroot

# Unzip the deployment package
unzip dist.zip -d .

# Remove the ZIP file to clean up
rm dist.zip

# Install dependencies
npm install --production

# Stop any existing PM2 process
pm2 stop all

# Start the application with PM2 (adjust this command to match your start script)
pm2 start main.js --name "costamare"

# Save the PM2 process list
pm2 save
