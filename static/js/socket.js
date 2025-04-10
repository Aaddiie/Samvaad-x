/**
 * Socket.io connection and event handling for real-time communication
 */
let socket;
let currentRoom;

function initializeSocket(roomId, username) {
    // Initialize Socket.IO connection
    socket = io();
    currentRoom = roomId;

    // Connection established
    socket.on('connect', () => {
        console.log('Connected to server');
        joinRoom(roomId, username);
    });

    // Connection error
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        showNotification('Connection error', 'error');
    });

    // Connection lost
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showNotification('Disconnected from server', 'warning');
    });

    // User joined room
    socket.on('user_joined', (data) => {
        console.log('User joined:', data.username);
        updateParticipantsList(data.participants);
        showNotification(`${data.username} joined the meeting`, 'info');
        
        // Initiate WebRTC connection with new user
        if (data.username !== username) {
            initiateCall(data.username);
        }
    });

    // User left room
    socket.on('user_left', (data) => {
        console.log('User left:', data.username);
        updateParticipantsList(data.participants);
        showNotification(`${data.username} left the meeting`, 'info');
        
        // Handle peer disconnection
        if (peers[data.username]) {
            removePeer(data.username);
        }
    });

    // WebRTC signaling
    socket.on('signal', (data) => {
        handleSignalData(data.from, data.signal);
    });

    // Whiteboard drawing updates
    socket.on('whiteboard_draw', (data) => {
        handleWhiteboardDraw(data.draw_data);
    });

    // Chat messages
    socket.on('chat_message', (data) => {
        addChatMessage(data.username, data.message, data.timestamp);
    });
}

function joinRoom(roomId, username) {
    socket.emit('join', { room_id: roomId, username: username });
}

function leaveRoom() {
    socket.emit('leave', { room_id: currentRoom });
}

function sendSignal(target, signalData) {
    socket.emit('signal', {
        room_id: currentRoom,
        target: target,
        signal: signalData
    });
}

function sendWhiteboardDraw(drawData) {
    socket.emit('whiteboard_draw', {
        room_id: currentRoom,
        draw_data: drawData
    });
}

function sendChatMessage(message) {
    socket.emit('chat_message', {
        room_id: currentRoom,
        message: message,
        timestamp: new Date().toISOString()
    });
}

function showNotification(message, type = 'info') {
    const notificationArea = document.getElementById('notification-area');
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    notificationArea.appendChild(notification);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

function updateParticipantsList(participants) {
    const participantsList = document.getElementById('participants-list');
    participantsList.innerHTML = '';
    
    participants.forEach(participant => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
        listItem.textContent = participant;
        
        // Add online indicator
        const badge = document.createElement('span');
        badge.className = 'badge bg-success rounded-pill';
        badge.textContent = 'online';
        listItem.appendChild(badge);
        
        participantsList.appendChild(listItem);
    });
}
