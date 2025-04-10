/**
 * Dark mode toggle functionality
 */
let isDarkMode = false;

// Initialize dark mode
function initializeDarkMode() {
    // Check user preference
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedMode = localStorage.getItem('darkMode');
    
    // Set initial mode based on saved preference or system preference
    if (savedMode === 'dark' || (savedMode === null && prefersDarkMode)) {
        enableDarkMode();
    } else {
        disableDarkMode();
    }
    
    // Setup toggle button
    document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);
}

// Toggle between dark and light mode
function toggleDarkMode() {
    if (isDarkMode) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }
}

// Enable dark mode
function enableDarkMode() {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    isDarkMode = true;
    localStorage.setItem('darkMode', 'dark');
    
    // Update button icon
    const toggleBtn = document.getElementById('dark-mode-toggle');
    toggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    toggleBtn.setAttribute('title', 'Switch to Light Mode');
    
    // Update whiteboard if active
    if (typeof canvas !== 'undefined' && canvas) {
        canvas.backgroundColor = '#2c2c2c';
        canvas.renderAll();
    }
}

// Disable dark mode
function disableDarkMode() {
    document.documentElement.setAttribute('data-bs-theme', 'light');
    isDarkMode = false;
    localStorage.setItem('darkMode', 'light');
    
    // Update button icon
    const toggleBtn = document.getElementById('dark-mode-toggle');
    toggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
    toggleBtn.setAttribute('title', 'Switch to Dark Mode');
    
    // Update whiteboard if active
    if (typeof canvas !== 'undefined' && canvas) {
        canvas.backgroundColor = '#ffffff';
        canvas.renderAll();
    }
}
