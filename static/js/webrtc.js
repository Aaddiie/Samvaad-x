/**
 * WebRTC functionality for peer-to-peer connections, screen sharing, and video
 */
let localStream;
let screenStream;
let peers = {};
let isScreenSharing = false;
let isAudioMuted = false;
let isVideoOff = false;

// Initialize WebRTC
async function initializeWebRTC(username) {
    // function initializeWebRTC() {
    //     if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    //       navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    //         .then(stream => {
    //           // Use the stream (e.g., show video)
    //           const videoElement = document.querySelector('video');
    //           videoElement.srcObject = stream;
    //         })
    //         .catch(err => {
    //           console.error("Error accessing media devices:", err);
    //         });
    //     } else {
    //       console.error("getUserMedia not supported on this browser.");
    //     }
    //   }
      
    try {
        // Get user media (camera and microphone)
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        });
        
        // Display local video
        const localVideo = document.getElementById('local-video');
        localVideo.srcObject = localStream;
        
        // Setup media controls initial state
        updateMediaControlsState();
        
        console.log('Local media stream obtained');
        return true;
    } catch (error) {
        console.error('Error accessing media devices:', error);
        showNotification('Could not access camera/microphone. Please check permissions.', 'error');
        return false;
    }
}

// Initialize a peer connection to a remote user
function initiateCall(remotePeerUsername) {
    if (peers[remotePeerUsername]) {
        console.log(`Connection to ${remotePeerUsername} already exists`);
        return;
    }
    
    console.log(`Initiating connection to ${remotePeerUsername}`);
    
    // Create a new peer connection
    const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream: localStream
    });
    
    // Store the peer connection
    peers[remotePeerUsername] = peer;
    
    // Handle peer events
    setupPeerEvents(peer, remotePeerUsername);
}

// Setup peer connection events
function setupPeerEvents(peer, remotePeerUsername) {
    // Signal event - when peer generates signaling data
    peer.on('signal', signal => {
        console.log('Generated signal for', remotePeerUsername);
        sendSignal(remotePeerUsername, signal);
    });
    
    // Stream event - when we receive a remote stream
    peer.on('stream', stream => {
        console.log('Received stream from', remotePeerUsername);
        addRemoteVideo(remotePeerUsername, stream);
    });
    
    // Close event - when peer connection is closed
    peer.on('close', () => {
        console.log('Connection closed with', remotePeerUsername);
        removeRemoteVideo(remotePeerUsername);
        delete peers[remotePeerUsername];
    });
    
    // Error event - when there's an error in the connection
    peer.on('error', err => {
        console.error('Peer connection error:', err);
        showNotification(`Connection error with ${remotePeerUsername}`, 'error');
        removeRemoteVideo(remotePeerUsername);
        delete peers[remotePeerUsername];
    });
}

// Handle incoming signal data from a remote peer
function handleSignalData(remotePeerUsername, signal) {
    console.log('Received signal from', remotePeerUsername);
    
    if (!peers[remotePeerUsername]) {
        // Create new peer connection if it doesn't exist
        const peer = new SimplePeer({
            initiator: false,
            trickle: false,
            stream: localStream
        });
        
        peers[remotePeerUsername] = peer;
        setupPeerEvents(peer, remotePeerUsername);
    }
    
    // Signal the peer with the received data
    peers[remotePeerUsername].signal(signal);
}

// Add a remote video element to the DOM
function addRemoteVideo(remotePeerUsername, stream) {
    const remoteVideosContainer = document.getElementById('remote-videos');
    
    // Check if video already exists
    const existingVideo = document.getElementById(`remote-video-${remotePeerUsername}`);
    if (existingVideo) {
        existingVideo.srcObject = stream;
        return;
    }
    
    // Create video container
    const videoContainer = document.createElement('div');
    videoContainer.className = 'remote-video-container';
    videoContainer.id = `remote-video-container-${remotePeerUsername}`;
    
    // Create video element
    const videoElement = document.createElement('video');
    videoElement.id = `remote-video-${remotePeerUsername}`;
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    videoElement.srcObject = stream;
    videoElement.play().catch(err => {
    console.warn('Video playback was prevented:', err);
});
    // Create username label
    const usernameLabel = document.createElement('div');
    usernameLabel.className = 'username-label';
    usernameLabel.textContent = remotePeerUsername;
    
    // Add elements to container
    videoContainer.appendChild(videoElement);
    videoContainer.appendChild(usernameLabel);
    remoteVideosContainer.appendChild(videoContainer);
    
    // Update layout
    updateVideoLayout();
}

// Remove a remote video element from the DOM
function removeRemoteVideo(remotePeerUsername) {
    const videoContainer = document.getElementById(`remote-video-container-${remotePeerUsername}`);
    if (videoContainer) {
        videoContainer.remove();
    }
    
    // Update layout
    updateVideoLayout();
}

// Update the layout of video elements based on number of participants
function updateVideoLayout() {
    const remoteVideosContainer = document.getElementById('remote-videos');
    const remoteVideos = remoteVideosContainer.querySelectorAll('.remote-video-container');
    
    // Set grid columns based on number of videos
    if (remoteVideos.length === 0) {
        remoteVideosContainer.style.gridTemplateColumns = '1fr';
    } else if (remoteVideos.length === 1) {
        remoteVideosContainer.style.gridTemplateColumns = '1fr';
    } else if (remoteVideos.length === 2) {
        remoteVideosContainer.style.gridTemplateColumns = '1fr 1fr';
    } else if (remoteVideos.length <= 4) {
        remoteVideosContainer.style.gridTemplateColumns = '1fr 1fr';
    } else {
        remoteVideosContainer.style.gridTemplateColumns = '1fr 1fr 1fr';
    }
}

// Toggle screen sharing
async function toggleScreenSharing() {
    if (isScreenSharing) {
        // Stop screen sharing
        screenStream.getTracks().forEach(track => track.stop());
        
        // Restore camera stream
        for (const peer in peers) {
            const sender = peers[peer].getSenders().find(s => s.track.kind === 'video');
            if (sender) {
                const cameraTrack = localStream.getVideoTracks()[0];
                sender.replaceTrack(cameraTrack);
            }
        }
        
        // Update local video
        const localVideo = document.getElementById('local-video');
        localVideo.srcObject = localStream;
        
        isScreenSharing = false;
        document.getElementById('screen-share-btn').innerHTML = '<i class="fas fa-desktop"></i> Share Screen';
    } else {
        try {
            // Start screen sharing
            screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: "always"
                },
                audio: false
            });
            
            // Replace video track in all peer connections
            const videoTrack = screenStream.getVideoTracks()[0];
            for (const peer in peers) {
                const sender = peers[peer].getSenders().find(s => s.track.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            }
            
            // Update local video
            const localVideo = document.getElementById('local-video');
            localVideo.srcObject = screenStream;
            
            // Handle stop sharing event
            videoTrack.onended = () => {
                toggleScreenSharing();
            };
            
            isScreenSharing = true;
            document.getElementById('screen-share-btn').innerHTML = '<i class="fas fa-desktop"></i> Stop Sharing';
        } catch (error) {
            console.error('Error sharing screen:', error);
            showNotification('Could not share screen. Please try again.', 'error');
        }
    }
}

// Toggle audio mute
function toggleAudio() {
    if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length > 0) {
            isAudioMuted = !isAudioMuted;
            audioTracks[0].enabled = !isAudioMuted;
            updateMediaControlsState();
        }
    }
}

// Toggle video on/off
function toggleVideo() {
    if (localStream) {
        const videoTracks = localStream.getVideoTracks();
        if (videoTracks.length > 0) {
            isVideoOff = !isVideoOff;
            videoTracks[0].enabled = !isVideoOff;
            updateMediaControlsState();
        }
    }
}

// Update media control buttons to reflect current state
function updateMediaControlsState() {
    const audioBtn = document.getElementById('audio-btn');
    const videoBtn = document.getElementById('video-btn');
    
    if (isAudioMuted) {
        audioBtn.innerHTML = '<i class="fas fa-microphone-slash"></i> Unmute';
        audioBtn.classList.replace('btn-primary', 'btn-danger');
    } else {
        audioBtn.innerHTML = '<i class="fas fa-microphone"></i> Mute';
        audioBtn.classList.replace('btn-danger', 'btn-primary');
    }
    
    if (isVideoOff) {
        videoBtn.innerHTML = '<i class="fas fa-video-slash"></i> Start Video';
        videoBtn.classList.replace('btn-primary', 'btn-danger');
    } else {
        videoBtn.innerHTML = '<i class="fas fa-video"></i> Stop Video';
        videoBtn.classList.replace('btn-danger', 'btn-primary');
    }
}

// Clean up peer connections and media streams
function cleanupWebRTC() {
    // Close all peer connections
    for (const username in peers) {
        peers[username].destroy();
    }
    peers = {};
    
    // Stop all tracks in local stream
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    
    // Stop screen sharing if active
    if (isScreenSharing && screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
    }
    
    console.log('WebRTC resources cleaned up');
}

// Remove a peer from the connection
function removePeer(username) {
    if (peers[username]) {
        peers[username].destroy();
        delete peers[username];
        removeRemoteVideo(username);
    }
}
