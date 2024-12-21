function createMobileVideoPlayer(videoUrl) {
    const playerContainer = document.createElement('div');
    playerContainer.className = 'video-player-container';

    const video = document.createElement('video');
    video.className = 'video-player';
    video.src = videoUrl;
    video.controls = true;
    video.playsInline = true; // Important for iOS
    
    // Add custom controls for better mobile experience
    const controls = document.createElement('div');
    controls.className = 'video-controls';
    
    // Close button for mobile
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-video-btn';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => playerContainer.remove();
    
    playerContainer.appendChild(video);
    playerContainer.appendChild(controls);
    playerContainer.appendChild(closeBtn);
    
    return playerContainer;
}

// Update your video click handler
function handleVideoClick(videoUrl) {
    if (window.innerWidth <= 768) {
        const mobilePlayer = createMobileVideoPlayer(videoUrl);
        document.body.appendChild(mobilePlayer);
    } else {
        // Your existing desktop video player code
    }
} 