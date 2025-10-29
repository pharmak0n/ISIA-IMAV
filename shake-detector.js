class ShakeDetector {
    constructor(shakeCallback) { // Added callback
        this.shakeCallback = shakeCallback; // Store callback
        this.isActive = false;
        this.shakeCount = 0;
        this.lastShakeTime = null;
        this.sensitivity = 2; // 1 = low, 2 = medium, 3 = high
        this.shakeThreshold = this.getSensitivityThreshold();
        this.lastAcceleration = { x: 0, y: 0, z: 0 };
        this.shakeBuffer = [];
        this.bufferSize = 10;
        this.detectDevice();
        this.setupEventListeners();
    }

    detectDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        let platform = 'Unknown';
        if (/android/.test(userAgent)) { platform = 'Android'; }
        else if (/iphone|ipad|ipod/.test(userAgent)) { platform = 'iOS'; }
        else if (/mac/.test(userAgent)) { platform = 'macOS'; }
        else if (/win/.test(userAgent)) { platform = 'Windows'; }
        else if (/linux/.test(userAgent)) { platform = 'Linux'; }
        const hasMotionSupport = 'DeviceMotionEvent' in window;
        if (!hasMotionSupport) {
            this.showError('Device motion is not supported on this device');
        }
    }

    setupEventListeners() {
        // I will automatically start the detection.
        this.toggleShakeDetection();
    }

    getSensitivityThreshold() {
        const thresholds = { 1: 25, 2: 15, 3: 8 };
        return thresholds[this.sensitivity];
    }

    async requestPermission() {
        try {
            if (typeof DeviceMotionEvent.requestPermission === 'function') {
                const permission = await DeviceMotionEvent.requestPermission();
                return permission === 'granted';
            } else {
                return true;
            }
        } catch (error) {
            console.error('Permission request failed:', error);
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
        window.addEventListener('devicemotion', this.handleDeviceMotion.bind(this));
    }

    stopDetection() {
        this.isActive = false;
        window.removeEventListener('devicemotion', this.handleDeviceMotion.bind(this));
    }

    handleDeviceMotion(event) {
        if (!this.isActive || !event.accelerationIncludingGravity) return;
        const acceleration = event.accelerationIncludingGravity;
        const current = { x: acceleration.x || 0, y: acceleration.y || 0, z: acceleration.z || 0 };
        const deltaX = Math.abs(current.x - this.lastAcceleration.x);
        const deltaY = Math.abs(current.y - this.lastAcceleration.y);
        const deltaZ = Math.abs(current.z - this.lastAcceleration.z);
        const totalDelta = deltaX + deltaY + deltaZ;
        this.shakeBuffer.push(totalDelta);
        if (this.shakeBuffer.length > this.bufferSize) {
            this.shakeBuffer.shift();
        }
        const averageDelta = this.shakeBuffer.reduce((sum, val) => sum + val, 0) / this.shakeBuffer.length;
        if (averageDelta > this.shakeThreshold) {
            const now = Date.now();
            if (!this.lastShakeTime || now - this.lastShakeTime > 1000) { // Increased timeout to 1000ms
                this.onShakeDetected();
                this.lastShakeTime = now;
            }
        }
        this.lastAcceleration = current;
    }

    onShakeDetected() {
        this.shakeCount++;
        this.lastShakeTime = Date.now();
        if (this.shakeCallback) {
            this.shakeCallback();
        }
        if ('vibrate' in navigator) {
            navigator.vibrate([50, 30, 50]);
        }
    }

    showError(message) {
        console.error('Shake Detector Error:', message);
    }
}