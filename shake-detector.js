class ShakeDetector {
    constructor() {
        this.isActive = false;
        this.shakeCount = 0;
        this.lastShakeTime = null;
        this.sensitivity = 2; // 1 = low, 2 = medium, 3 = high
        this.shakeThreshold = this.getSensitivityThreshold();
        this.lastAcceleration = { x: 0, y: 0, z: 0 };
        this.shakeBuffer = [];
        this.bufferSize = 10;
        
        this.initializeElements();
        this.detectDevice();
        this.setupEventListeners();
        this.updateUI();
    }

    initializeElements() {
        this.elements = {
            statusIndicator: document.getElementById('statusIndicator'),
            statusText: document.getElementById('statusText'),
            statusDescription: document.getElementById('statusDescription'),
            startBtn: document.getElementById('startBtn'),
            resetBtn: document.getElementById('resetBtn'),
            shakeCount: document.getElementById('shakeCount'),
            lastShake: document.getElementById('lastShake'),
            sensitivity: document.getElementById('sensitivity'),
            sensitivitySlider: document.getElementById('sensitivitySlider'),
            platform: document.getElementById('platform'),
            motionSupport: document.getElementById('motionSupport'),
            permissionStatus: document.getElementById('permissionStatus')
        };
    }

    detectDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        let platform = 'Unknown';
        
        if (/android/.test(userAgent)) {
            platform = 'Android';
        } else if (/iphone|ipad|ipod/.test(userAgent)) {
            platform = 'iOS';
        } else if (/mac/.test(userAgent)) {
            platform = 'macOS';
        } else if (/win/.test(userAgent)) {
            platform = 'Windows';
        } else if (/linux/.test(userAgent)) {
            platform = 'Linux';
        }
        
        this.elements.platform.textContent = platform;
        
        const hasMotionSupport = 'DeviceMotionEvent' in window;
        this.elements.motionSupport.textContent = hasMotionSupport ? 'Supported' : 'Not Supported';
        
        if (!hasMotionSupport) {
            this.showError('Device motion is not supported on this device');
        }
    }

    setupEventListeners() {
        this.elements.startBtn.addEventListener('click', () => this.toggleShakeDetection());
        this.elements.resetBtn.addEventListener('click', () => this.resetStats());
        this.elements.sensitivitySlider.addEventListener('input', (e) => this.updateSensitivity(e.target.value));
        
        // Add keyboard simulation for testing in simulators
        document.addEventListener('keydown', (e) => {
            if (this.isActive && e.code === 'Space') {
                e.preventDefault();
                this.onShakeDetected();
                console.log('Simulated shake via spacebar');
            }
        });
    }

    getSensitivityThreshold() {
        const thresholds = {
            1: 25, // Low sensitivity - higher threshold
            2: 15, // Medium sensitivity
            3: 8   // High sensitivity - lower threshold
        };
        return thresholds[this.sensitivity];
    }

    updateSensitivity(value) {
        this.sensitivity = parseInt(value);
        this.shakeThreshold = this.getSensitivityThreshold();
        
        const labels = { 1: 'Low', 2: 'Medium', 3: 'High' };
        this.elements.sensitivity.textContent = labels[this.sensitivity];
    }

    async requestPermission() {
        try {
            if (typeof DeviceMotionEvent.requestPermission === 'function') {
                const permission = await DeviceMotionEvent.requestPermission();
                this.elements.permissionStatus.textContent = permission;
                return permission === 'granted';
            } else {
                this.elements.permissionStatus.textContent = 'Not Required';
                return true;
            }
        } catch (error) {
            console.error('Permission request failed:', error);
            this.elements.permissionStatus.textContent = 'Error';
            return false;
        }
    }

    async toggleShakeDetection() {
        if (!this.isActive) {
            const hasPermission = await this.requestPermission();
            if (!hasPermission) {
                this.showError('Motion permission denied. Please enable it in your browser settings.');
                return;
            }
            this.startDetection();
        } else {
            this.stopDetection();
        }
    }

    startDetection() {
        this.isActive = true;
        this.elements.startBtn.textContent = 'Stop Testing';
        this.elements.startBtn.className = 'btn btn-secondary';
        this.elements.resetBtn.disabled = false;
        
        this.updateStatus('waiting', 'Listening...', 'Shake your device now!');
        
        window.addEventListener('devicemotion', this.handleDeviceMotion.bind(this));
    }

    stopDetection() {
        this.isActive = false;
        this.elements.startBtn.textContent = 'Start Testing';
        this.elements.startBtn.className = 'btn btn-primary';
        
        this.updateStatus('ready', 'Ready to Test', 'Click start to begin shake detection');
        
        window.removeEventListener('devicemotion', this.handleDeviceMotion.bind(this));
    }

    handleDeviceMotion(event) {
        if (!this.isActive || !event.accelerationIncludingGravity) return;

        const acceleration = event.accelerationIncludingGravity;
        const current = {
            x: acceleration.x || 0,
            y: acceleration.y || 0,
            z: acceleration.z || 0
        };

        // Calculate the magnitude of acceleration change
        const deltaX = Math.abs(current.x - this.lastAcceleration.x);
        const deltaY = Math.abs(current.y - this.lastAcceleration.y);
        const deltaZ = Math.abs(current.z - this.lastAcceleration.z);
        
        const totalDelta = deltaX + deltaY + deltaZ;

        // Add to buffer for smoothing
        this.shakeBuffer.push(totalDelta);
        if (this.shakeBuffer.length > this.bufferSize) {
            this.shakeBuffer.shift();
        }

        // Calculate average to reduce noise
        const averageDelta = this.shakeBuffer.reduce((sum, val) => sum + val, 0) / this.shakeBuffer.length;

        // Check if shake threshold is exceeded
        if (averageDelta > this.shakeThreshold) {
            const now = Date.now();
            
            // Prevent multiple detections within 500ms
            if (!this.lastShakeTime || now - this.lastShakeTime > 500) {
                this.onShakeDetected();
                this.lastShakeTime = now;
            }
        }

        this.lastAcceleration = current;
    }

    onShakeDetected() {
        this.shakeCount++;
        this.lastShakeTime = Date.now();
        
        // Visual feedback
        this.updateStatus('shaking', 'Shake Detected!', `Shake #${this.shakeCount} detected`);
        this.elements.statusCard = document.querySelector('.status-card');
        this.elements.statusCard.classList.add('shake-animation');
        
        // Remove animation class after animation completes
        setTimeout(() => {
            this.elements.statusCard.classList.remove('shake-animation');
            if (this.isActive) {
                this.updateStatus('waiting', 'Listening...', 'Shake your device again!');
            }
        }, 600);
        
        this.updateStats();
        
        // Optional: Haptic feedback for supported devices
        if ('vibrate' in navigator) {
            navigator.vibrate([50, 30, 50]);
        }
    }

    updateStatus(type, text, description) {
        this.elements.statusIndicator.className = `status-indicator ${type}`;
        this.elements.statusText.textContent = text;
        this.elements.statusDescription.textContent = description;
    }

    updateStats() {
        this.elements.shakeCount.textContent = this.shakeCount;
        
        if (this.lastShakeTime) {
            const timeAgo = this.getTimeAgo(this.lastShakeTime);
            this.elements.lastShake.textContent = timeAgo;
        }
    }

    getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        return `${Math.floor(seconds / 3600)}h ago`;
    }

    resetStats() {
        this.shakeCount = 0;
        this.lastShakeTime = null;
        this.shakeBuffer = [];
        this.updateStats();
        this.elements.lastShake.textContent = 'Never';
        
        if (this.isActive) {
            this.updateStatus('waiting', 'Listening...', 'Shake your device now!');
        } else {
            this.updateStatus('ready', 'Ready to Test', 'Click start to begin shake detection');
        }
    }

    updateUI() {
        this.updateStats();
        const labels = { 1: 'Low', 2: 'Medium', 3: 'High' };
        this.elements.sensitivity.textContent = labels[this.sensitivity];
    }

    showError(message) {
        this.updateStatus('ready', 'Error', message);
        console.error('Shake Detector Error:', message);
    }
}

// Utility functions for better user experience
class UIEnhancements {
    static init() {
        this.preventZoom();
        this.handleVisibilityChange();
        this.setupServiceWorkerSupport();
    }

    static preventZoom() {
        // Prevent zoom on double tap for mobile devices
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (event) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }

    static handleVisibilityChange() {
        // Pause detection when tab is not visible to save battery
        document.addEventListener('visibilitychange', () => {
            if (window.shakeDetector) {
                if (document.hidden && window.shakeDetector.isActive) {
                    console.log('Tab hidden, pausing shake detection');
                } else if (!document.hidden && window.shakeDetector.isActive) {
                    console.log('Tab visible, resuming shake detection');
                }
            }
        });
    }

    static setupServiceWorkerSupport() {
        // Register service worker for offline support (optional)
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                // Service worker registration can be added here if needed
                console.log('Service Worker support available');
            });
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.shakeDetector = new ShakeDetector();
        UIEnhancements.init();
        console.log('Shake Detector initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Shake Detector:', error);
        document.querySelector('.status-description').textContent = 'Failed to initialize. Please refresh the page.';
    }
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShakeDetector, UIEnhancements };
}