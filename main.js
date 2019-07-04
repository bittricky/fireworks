// === CONFIGURATION ===

// Base firework acceleration.
// 1.0 causes fireworks to travel at a constant speed.
// Higher number increases rate firework accelerates over time.
const FIREWORK_ACCELERATION = 1.05;
// Minimum firework brightness.
const FIREWORK_BRIGHTNESS_MIN = 50;
// Maximum firework brightness.
const FIREWORK_BRIGHTNESS_MAX = 70;
// Base speed of fireworks.
const FIREWORK_SPEED = 5;
// Base length of firework trails.
const FIREWORK_TRAIL_LENGTH = 3;
// Determine if target position indicator is enabled.
const FIREWORK_TARGET_INDICATOR_ENABLED = true;

// Minimum particle brightness.
const PARTICLE_BRIGHTNESS_MIN = 50;
// Maximum particle brightness.
const PARTICLE_BRIGHTNESS_MAX = 80;
// Base particle count per firework.
const PARTICLE_COUNT = 80;
// Minimum particle decay rate.
const PARTICLE_DECAY_MIN = 0.015;
// Maximum particle decay rate.
const PARTICLE_DECAY_MAX = 0.03;
// Base particle friction.
// Slows the speed of particles over time.
const PARTICLE_FRICTION = 0.95;
// Base particle gravity.
// How quickly particles move toward a downward trajectory.
const PARTICLE_GRAVITY = 0.7;
// Variance in particle coloration.
const PARTICLE_HUE_VARIANCE = 20;
// Base particle transparency.
const PARTICLE_TRANSPARENCY = 1;
// Minimum particle speed.
const PARTICLE_SPEED_MIN = 1;
// Maximum particle speed.
const PARTICLE_SPEED_MAX = 10;
// Base length of explosion particle trails.
const PARTICLE_TRAIL_LENGTH = 5;

// Alpha level that canvas cleanup iteration removes existing trails.
// Lower value increases trail duration.
const CANVAS_CLEANUP_ALPHA = 0.3;
// Hue change per loop, used to rotate through different firework colors.
const HUE_STEP_INCREASE = 0.5;

// Minimum number of ticks per manual firework launch.
const TICKS_PER_FIREWORK_MIN = 5;
// Minimum number of ticks between each automatic firework launch.
const TICKS_PER_FIREWORK_AUTOMATED_MIN = 20;
// Maximum number of ticks between each automatic firework launch.
const TICKS_PER_FIREWORK_AUTOMATED_MAX = 80;

// === END CONFIGURATION ===

// === LOCAL VARS ===

let canvas = document.getElementById('canvas');
// Set canvas dimensions.
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
// Set the context, 2d in this case.
let context = canvas.getContext('2d');
// Firework and particles collections.
let fireworks = [],
    particles = [];
// Mouse coordinates.
let mouseX, mouseY;
// Variable to check if mouse is down.
let isMouseDown = false;
// Initial hue.
let hue = 120;
// Track number of ticks since automated firework.
let ticksSinceFireworkAutomated = 0;
// Track number of ticks since manual firework.
let ticksSinceFirework = 0;

// === END LOCAL VARS ===

// === HELPERS ===

// Use requestAnimationFrame to maintain smooth animation loops.
// Fall back on setTimeout() if browser support isn't available.
window.requestAnimFrame = (() => {
    return  window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            function(callback) {
                window.setTimeout(callback, 1000 / 60);
            };
})();

// Get a random number within the specified range.
function random(min, max) {
    return Math.random() * (max - min) + min;
}

// Calculate the distance between two points.
function calculateDistance(aX, aY, bX, bY) {
    let xDistance = aX - bX;
    let yDistance = aY - bY;
    return Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
}

// === END HELPERS ===

// === EVENT LISTENERS ===

// Track current mouse position within canvas.
canvas.addEventListener('mousemove', (e) => {
    mouseX = e.pageX - canvas.offsetLeft
    mouseY = e.pageY - canvas.offsetTop
});

// Track when mouse is pressed.
canvas.addEventListener('mousedown', (e) => {
    e.preventDefault()
    isMouseDown = true
});

// Track when mouse is released.
canvas.addEventListener('mouseup', (e) => {
    e.preventDefault()
    isMouseDown = false
});

// === END EVENT LISTENERS ===

// === PROTOTYPING ===

// Creates a new firework.
// Path begins at 'start' point and ends and 'end' point.
function Firework(startX, startY, endX, endY) {
    // Set current coordinates.
    this.x = startX;
    this.y = startY;
    // Set starting coordinates.
    this.startX = startX;
    this.startY = startY;
    // Set end coordinates.
    this.endX = endX;
    this.endY = endY;
    // Get the distance to the end point.
    this.distanceToEnd = calculateDistance(startX, startY, endX, endY);
    this.distanceTraveled = 0;
    // Create an array to track current trail particles.
    this.trail = [];
    // Trail length determines how many trailing particles are active at once.
    this.trailLength = FIREWORK_TRAIL_LENGTH;
    // While the trail length remains, add current point to trail list.
    while(this.trailLength--) {
        this.trail.push([this.x, this.y]);
    }
    // Calculate the angle to travel from start to end point.
    this.angle = Math.atan2(endY - startY, endX - startX);
    // Set the speed.
    this.speed = FIREWORK_SPEED;
    // Set the acceleration.
    this.acceleration = FIREWORK_ACCELERATION;
    // Set the brightness.
    this.brightness = random(FIREWORK_BRIGHTNESS_MIN, FIREWORK_BRIGHTNESS_MAX);
    // Set the radius of click-target location.
    this.targetRadius = 2.5;
}

// Update a firework prototype.
// 'index' parameter is index in 'fireworks' array to remove, if journey is complete.
Firework.prototype.update = function(index) {
    // Remove the oldest trail particle.
    this.trail.pop();
    // Add the current position to the start of trail.
    this.trail.unshift([this.x, this.y]);

    // Animate the target radius indicator.
    if (FIREWORK_TARGET_INDICATOR_ENABLED) {
        if(this.targetRadius < 8) {
            this.targetRadius += 0.3;
        } else {
            this.targetRadius = 1;
        }
    }

    // Increase speed based on acceleration rate.
    this.speed *= this.acceleration;

    // Calculate current velocity for both x and y axes.
    let xVelocity = Math.cos(this.angle) * this.speed;
    let yVelocity = Math.sin(this.angle) * this.speed;
    // Calculate the current distance travelled based on starting position, current position, and velocity.
    // This can be used to determine if firework has reached final position.
    this.distanceTraveled = calculateDistance(this.startX, this.startY, this.x + xVelocity, this.y + yVelocity);

    // Check if final position has been reached (or exceeded).
    if(this.distanceTraveled >= this.distanceToEnd) {
        // Destroy firework by removing it from collection.
        fireworks.splice(index, 1);
        // Create particle explosion at end point.  Important not to use this.x and this.y,
        // since that position is always one animation loop behind.
        createParticles(this.endX, this.endY);
    } else {
        // End position hasn't been reached, so continue along current trajectory by updating current coordinates.
        this.x += xVelocity;
        this.y += yVelocity;
    }
}

// Draw a firework.
// Use CanvasRenderingContext2D methods to create strokes as firework paths.
Firework.prototype.draw = function() {
    // Begin a new path for firework trail.
    context.beginPath();
    // Get the coordinates for the oldest trail position.
    let trailEndX = this.trail[this.trail.length - 1][0];
    let trailEndY = this.trail[this.trail.length - 1][1];
    // Create a trail stroke from trail end position to current firework position.
    context.moveTo(trailEndX, trailEndY);
    context.lineTo(this.x, this.y);
    // Set stroke coloration and style.
    // Use hue, saturation, and light values instead of RGB.
    context.strokeStyle = `hsl(${hue}, 100%, ${this.brightness}%)`;
    // Draw stroke.
    context.stroke();

    if (FIREWORK_TARGET_INDICATOR_ENABLED) {
        // Begin a new path for end position animation.
        context.beginPath();
        // Create an pulsing circle at the end point with targetRadius.
        context.arc(this.endX, this.endY, this.targetRadius, 0, Math.PI * 2);
        // Draw stroke.
        context.stroke();
    }
}
