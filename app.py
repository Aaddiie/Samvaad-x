import os
import logging
import uuid
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "your-secret-key-for-development")

# Configure Flask-SocketIO
socketio = SocketIO(app, cors_allowed_origins="*")

# Store active rooms and their participants
rooms = {}

@app.route('/')
def index():
    """Render the homepage with room creation form"""
    return render_template('index.html')

@app.route('/create_room', methods=['POST'])
def create_room():
    """Create a new meeting room"""
    room_id = str(uuid.uuid4())[:8]  # Generate short unique room ID
    username = request.form.get('username', 'Anonymous')
    
    session['username'] = username
    session['room_id'] = room_id
    
    # Initialize room if it doesn't exist
    if room_id not in rooms:
        rooms[room_id] = {
            'participants': {},
            'created_by': username
        }
    
    return redirect(url_for('room', room_id=room_id))

@app.route('/join_room', methods=['POST'])
def join_existing_room():
    """Join an existing meeting room"""
    room_id = request.form.get('room_id')
    username = request.form.get('username', 'Anonymous')
    
    # Check if room exists
    if room_id not in rooms:
        return render_template('index.html', error="Room does not exist")
    
    session['username'] = username
    session['room_id'] = room_id
    
    return redirect(url_for('room', room_id=room_id))

@app.route('/room/<room_id>')
def room(room_id):
    """Render the meeting room"""
    if room_id not in rooms:
        return redirect(url_for('index'))
    
    username = session.get('username', 'Anonymous')
    return render_template('room.html', username=username, room_id=room_id)

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    logging.debug('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    logging.debug('Client disconnected')
    
    # Clean up user data when they disconnect
    username = session.get('username')
    room_id = session.get('room_id')
    
    if room_id in rooms and username:
        if username in rooms[room_id]['participants']:
            del rooms[room_id]['participants'][username]
            
        # If room is empty, remove it
        if not rooms[room_id]['participants']:
            del rooms[room_id]
            
        # Notify others that user has left
        emit('user_left', {'username': username}, room=room_id)

@socketio.on('join')
def handle_join(data):
    """Handle user joining a room"""
    username = session.get('username')
    room_id = data.get('room_id')
    
    if not room_id or room_id not in rooms:
        return
    
    # Add user to room
    join_room(room_id)
    rooms[room_id]['participants'][username] = request.sid
    
    # Notify others that a new user has joined
    emit('user_joined', {
        'username': username,
        'participants': list(rooms[room_id]['participants'].keys())
    }, room=room_id)
    
    logging.debug(f'User {username} joined room {room_id}')

@socketio.on('leave')
def handle_leave(data):
    """Handle user leaving a room"""
    username = session.get('username')
    room_id = data.get('room_id')
    
    if not room_id or room_id not in rooms:
        return
    
    # Remove user from room
    leave_room(room_id)
    if username in rooms[room_id]['participants']:
        del rooms[room_id]['participants'][username]
    
    # Notify others that user has left
    emit('user_left', {
        'username': username,
        'participants': list(rooms[room_id]['participants'].keys())
    }, room=room_id)
    
    logging.debug(f'User {username} left room {room_id}')

@socketio.on('signal')
def handle_signal(data):
    """Handle WebRTC signaling between peers"""
    username = session.get('username')
    room_id = data.get('room_id')
    target = data.get('target')
    signal_data = data.get('signal')
    
    if not room_id or room_id not in rooms:
        return
    
    # If target is specified, send to target only
    if target and target in rooms[room_id]['participants']:
        target_sid = rooms[room_id]['participants'][target]
        emit('signal', {
            'from': username,
            'signal': signal_data
        }, room=target_sid)
    else:
        # Otherwise broadcast to all in room except sender
        emit('signal', {
            'from': username,
            'signal': signal_data
        }, room=room_id, include_self=False)

@socketio.on('whiteboard_draw')
def handle_whiteboard_draw(data):
    """Broadcast whiteboard drawing data to all users in the room"""
    room_id = data.get('room_id')
    draw_data = data.get('draw_data')
    
    if room_id and room_id in rooms:
        emit('whiteboard_draw', {
            'draw_data': draw_data,
            'username': session.get('username')
        }, room=room_id, include_self=False)

@socketio.on('chat_message')
def handle_chat_message(data):
    """Broadcast chat messages to all users in the room"""
    room_id = data.get('room_id')
    message = data.get('message')
    username = session.get('username')
    
    if room_id and room_id in rooms and message:
        emit('chat_message', {
            'username': username,
            'message': message,
            'timestamp': data.get('timestamp')
        }, room=room_id)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
