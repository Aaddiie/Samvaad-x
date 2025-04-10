/**
 * Main JavaScript file to initialize and coordinate all functionality
 */
let currentUsername;
let currentRoomId;

// Initialize when DOM content is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dark mode toggle
    initializeDarkMode();
    
    // Setup chat form handling
    setupChatForm();
    
    // Check if we're in a meeting room
    const roomContainer = document.getElementById('meeting-room-container');
    if (roomContainer) {
        // Get room info from data attributes
        currentUsername = roomContainer.getAttribute('data-username');
        currentRoomId = roomContainer.getAttribute('data-room-id');
        
        // Initialize meeting room features
        initializeMeetingRoom();
    }
});

// Initialize meeting room functionality
async function initializeMeetingRoom() {
    try {
        // Initialize WebRTC
        const webrtcInitialized = await initializeWebRTC(currentUsername);
        
        if (webrtcInitialized) {
            // Initialize socket connection
            initializeSocket(currentRoomId, currentUsername);
            
            // Initialize whiteboard
            initializeWhiteboard();
            
            // Initialize recording
            initializeRecording();
            
            // Setup UI event listeners
            setupUIEventListeners();
            
            // Add leave meeting confirmation
            window.addEventListener('beforeunload', function(e) {
                // Clean up resources
                cleanupWebRTC();
                
                // Show confirmation dialog
                e.preventDefault();
                e.returnValue = '';
                return '';
            });
        }
    } catch (error) {
        console.error('Error initializing meeting room:', error);
        showNotification('Failed to initialize meeting room. Please refresh the page.', 'error');
    }
}

// Setup UI event listeners
function setupUIEventListeners() {
    // Control buttons
    document.getElementById('audio-btn').addEventListener('click', toggleAudio);
    document.getElementById('video-btn').addEventListener('click', toggleVideo);
    document.getElementById('screen-share-btn').addEventListener('click', toggleScreenSharing);
    document.getElementById('whiteboard-btn').addEventListener('click', function() {
        toggleWhiteboard();
    });
    document.getElementById('save-whiteboard-btn').addEventListener('click', saveWhiteboardAsImage);
    document.getElementById('leave-btn').addEventListener('click', leaveMeeting);
    
    // Toggle chat panel
    document.getElementById('toggle-chat-btn').addEventListener('click', function() {
        const chatPanel = document.getElementById('chat-panel');
        if (chatPanel.style.display === 'none') {
            chatPanel.style.display = 'flex';
            this.innerHTML = '<i class="fas fa-comment-slash"></i>';
        } else {
            chatPanel.style.display = 'none';
            this.innerHTML = '<i class="fas fa-comment"></i>';
        }
    });
    
    // Toggle participants panel
    document.getElementById('toggle-participants-btn').addEventListener('click', function() {
        const participantsPanel = document.getElementById('participants-panel');
        if (participantsPanel.style.display === 'none') {
            participantsPanel.style.display = 'block';
            this.innerHTML = '<i class="fas fa-users-slash"></i>';
        } else {
            participantsPanel.style.display = 'none';
            this.innerHTML = '<i class="fas fa-users"></i>';
        }
    });
}

// Setup chat form handling
function setupChatForm() {
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
        chatForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const messageInput = document.getElementById('message-input');
            const message = messageInput.value.trim();
            
            if (message) {
                // Add message to chat
                addChatMessage(currentUsername, message, new Date().toISOString());
                
                // Send message to others
                sendChatMessage(message);
                
                // Clear input
                messageInput.value = '';
            }
        });
    }
}

// Add a chat message to the chat box
function addChatMessage(username, message, timestamp) {
    const chatMessages = document.getElementById('chat-messages');
    const messageItem = document.createElement('div');
    messageItem.className = 'chat-message';
    
    // Format timestamp
    const msgTime = new Date(timestamp);
    const timeStr = msgTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add sender class if message is from current user
    if (username === currentUsername) {
        messageItem.classList.add('self-message');
    }
    
    // Set message content
    messageItem.innerHTML = `
        <div class="message-header">
            <span class="message-sender">${username}</span>
            <span class="message-time">${timeStr}</span>
        </div>
        <div class="message-body">${message}</div>
    `;
    
    // Add to chat box and scroll to bottom
    chatMessages.appendChild(messageItem);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Leave the meeting
function leaveMeeting() {
    if (confirm('Are you sure you want to leave this meeting?')) {
        // Clean up resources
        cleanupWebRTC();
        leaveRoom();
        
        // Redirect to homepage
        window.location.href = '/';
    }
}
