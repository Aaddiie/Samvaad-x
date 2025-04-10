/**
 * Screen recording functionality using RecordRTC
 */
let recorder;
let isRecording = false;
let recordingStream;
let recordingTimer;
let recordingDuration = 0;

// Initialize recording capabilities
function initializeRecording() {
    // Set up recording button event
    document.getElementById('record-btn').addEventListener('click', toggleRecording);
}

// Toggle recording state
async function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

// Start recording
async function startRecording() {
    try {
        // Get the screen to record (screen or window)
        recordingStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: "always"
            },
            audio: true
        });
        
        // Create recorder
        recorder = new RecordRTC(recordingStream, {
            type: 'video',
            mimeType: 'video/webm',
            bitsPerSecond: 128000
        });
        
        // Start recording
        recorder.startRecording();
        isRecording = true;
        
        // Update UI
        const recordBtn = document.getElementById('record-btn');
        recordBtn.innerHTML = '<i class="fas fa-stop-circle"></i> Stop Recording';
        recordBtn.classList.replace('btn-primary', 'btn-danger');
        
        // Start recording timer
        startRecordingTimer();
        
        // Listen for stop sharing event
        recordingStream.getVideoTracks()[0].onended = () => {
            stopRecording();
        };
        
        showNotification('Recording started', 'info');
    } catch (error) {
        console.error('Error starting recording:', error);
        showNotification('Could not start recording. Please try again.', 'error');
    }
}

// Stop recording
function stopRecording() {
    if (!recorder) return;
    
    // Stop the recorder
    recorder.stopRecording(function() {
        // Get the recorded blob
        const blob = recorder.getBlob();
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `recording-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.webm`;
        
        // Add to document and trigger download
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
        
        // Stop all tracks
        recordingStream.getTracks().forEach(track => track.stop());
        
        // Reset recording state
        isRecording = false;
        recorder = null;
        recordingStream = null;
        
        // Update UI
        const recordBtn = document.getElementById('record-btn');
        recordBtn.innerHTML = '<i class="fas fa-record-vinyl"></i> Start Recording';
        recordBtn.classList.replace('btn-danger', 'btn-primary');
        
        // Stop recording timer
        stopRecordingTimer();
        
        showNotification('Recording saved', 'success');
    });
}

// Start the recording timer
function startRecordingTimer() {
    recordingDuration = 0;
    const timerDisplay = document.getElementById('recording-timer');
    timerDisplay.textContent = '00:00';
    timerDisplay.style.display = 'inline-block';
    
    recordingTimer = setInterval(function() {
        recordingDuration += 1;
        const minutes = Math.floor(recordingDuration / 60);
        const seconds = recordingDuration % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

// Stop the recording timer
function stopRecordingTimer() {
    clearInterval(recordingTimer);
    document.getElementById('recording-timer').style.display = 'none';
    recordingDuration = 0;
}
