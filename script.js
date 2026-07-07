// Campus Locations Data
const campusLocations = [
    {
        id: "admin-hall",
        name: "Administration Hall",
        subtitle: "Main Quad, West Side",
        category: "facility",
        icon: "🏛️",
        desc: "The historic administrative heart of the campus. Houses the office of the President, registrar, admissions, and financial services. Features classical architecture with marble columns.",
        hours: "08:00 AM - 05:00 PM",
        details: "Registrar, Admissions, Dean's Office",
        pos: { x: -25, y: 0, z: -5 },
        camPos: { x: -14, y: 5, z: 8 },
        camRot: { x: -15, y: -50, z: 0 },
        badgeClass: "badge-facility"
    },
    {
        id: "library",
        name: "Central Library",
        subtitle: "Campus Center, North",
        category: "academic",
        icon: "📚",
        desc: "A massive, hyper-modern learning resource center containing over 500,000 physical volumes, collaborative study rooms, computer labs, and the university archives. Topped with a distinctive illuminated dome.",
        hours: "07:00 AM - 11:00 PM",
        details: "Archives, Quiet Study, IT Helpdesk",
        pos: { x: 0, y: 0, z: -20 },
        camPos: { x: 0, y: 5, z: -8 },
        camRot: { x: -15, y: 180, z: 0 },
        badgeClass: "badge-academic"
    },
    {
        id: "science-lab",
        name: "Science & Tech Center",
        subtitle: "Innovation Quad, East Side",
        category: "academic",
        icon: "🔬",
        desc: "State-of-the-art facility featuring advanced research laboratories for robotics, biotechnology, and cybersecurity. Built with carbon-neutral materials and smart lighting.",
        hours: "08:00 AM - 10:00 PM",
        details: "Robotics Lab, Cleanroom, Biotech Hub",
        pos: { x: 25, y: 0, z: -5 },
        camPos: { x: 14, y: 5, z: 8 },
        camRot: { x: -15, y: 50, z: 0 },
        badgeClass: "badge-academic"
    },
    {
        id: "student-center",
        name: "Student Hub & Café",
        subtitle: "South Quad, Southwest",
        category: "recreation",
        icon: "☕",
        desc: "The central gathering space for student life. Features the campus bookstore, cafeteria, gaming lounge, and student association offices. Includes a beautiful outdoor dining patio.",
        hours: "07:30 AM - 09:00 PM",
        details: "Dining Hall, Bookstore, Lounge",
        pos: { x: -20, y: 0, z: 20 },
        camPos: { x: -10, y: 4, z: 10 },
        camRot: { x: -10, y: -130, z: 0 },
        badgeClass: "badge-recreation"
    },
    {
        id: "sports-arena",
        name: "Sports Arena",
        subtitle: "Athletic Complex, Southeast",
        category: "recreation",
        icon: "🏟️",
        desc: "A high-capacity indoor arena and training complex hosting the university basketball team, indoor track events, and recreational facilities including a gym, climbing wall, and swimming pool.",
        hours: "06:00 AM - 10:00 PM",
        details: "Main Gym, Olympic Pool, Cardio Deck",
        pos: { x: 25, y: 0, z: 20 },
        camPos: { x: 12, y: 4, z: 10 },
        camRot: { x: -10, y: 130, z: 0 },
        badgeClass: "badge-recreation"
    }
];

// Default Aerial Camera View
const defaultView = {
    camPos: { x: 0, y: 35, z: 45 },
    camRot: { x: -40, y: 0, z: 0 }
};

// State Variables
let currentSelectedLocation = null;
let currentCategoryFilter = "all";
let searchQuery = "";
let soundEnabled = false;

// DOM Elements
const locationListEl = document.getElementById("location-list");
const searchInputEl = document.getElementById("search-input");
const categoryTabsEl = document.getElementById("category-tabs");
const detailPanelEl = document.getElementById("detail-panel");
const miniMapDotsEl = document.getElementById("mini-map-dots");
const instructionsOverlayEl = document.getElementById("instructions-overlay");

// Background audio
let bgAudio = null;

// Initialize components when A-Frame is ready
window.addEventListener('DOMContentLoaded', () => {
    initUI();
    setupInstructions();
    setupAudio();
    registerAFrameComponents();
});

// A-Frame Components Registration
function registerAFrameComponents() {
    // Camera Glide Component for Smooth Transitions
    AFRAME.registerComponent('camera-glide', {
        schema: {
            targetPos: { type: 'vec3' },
            targetRot: { type: 'vec3' },
            active: { type: 'boolean', default: false },
            speed: { type: 'number', default: 0.06 }
        },
        init: function () {
            this.isGliding = false;
        },
        update: function () {
            if (this.data.active) {
                this.isGliding = true;
            }
        },
        tick: function () {
            if (!this.isGliding) return;

            const currPos = this.el.getAttribute('position');
            const currRot = this.el.getAttribute('rotation');

            const targetPos = this.data.targetPos;
            const targetRot = this.data.targetRot;

            // Simple Lerp
            const nextX = currPos.x + (targetPos.x - currPos.x) * this.data.speed;
            const nextY = currPos.y + (targetPos.y - currPos.y) * this.data.speed;
            const nextZ = currPos.z + (targetPos.z - currPos.z) * this.data.speed;

            const nextRotX = currRot.x + (targetRot.x - currRot.x) * this.data.speed;
            const nextRotY = currRot.y + (targetRot.y - currRot.y) * this.data.speed;
            const nextRotZ = currRot.z + (targetRot.z - currRot.z) * this.data.speed;

            this.el.setAttribute('position', { x: nextX, y: nextY, z: nextZ });
            this.el.setAttribute('rotation', { x: nextRotX, y: nextRotY, z: nextRotZ });

            // Distance check to stop
            const dist = Math.sqrt(
                Math.pow(targetPos.x - nextX, 2) +
                Math.pow(targetPos.y - nextY, 2) +
                Math.pow(targetPos.z - nextZ, 2)
            );

            if (dist < 0.05) {
                this.el.setAttribute('position', targetPos);
                this.el.setAttribute('rotation', targetRot);
                this.isGliding = false;
                this.el.setAttribute('camera-glide', 'active', false);
            }
        }
    });

    // Building Interactive Hover/Click Component
    AFRAME.registerComponent('building-interactive', {
        schema: {
            locationId: { type: 'string' }
        },
        init: function () {
            const el = this.el;
            const data = this.data;
            const labelEl = el.querySelector('.building-label');

            // Save original colors for restore
            this.originalColors = [];
            const meshElements = el.querySelectorAll('[color]');
            meshElements.forEach(mesh => {
                this.originalColors.push({
                    el: mesh,
                    color: mesh.getAttribute('color')
                });
            });

            // Hover state
            el.addEventListener('mouseenter', () => {
                // Highlight building meshes with neon blue/cyan
                meshElements.forEach(mesh => {
                    mesh.setAttribute('color', '#06b6d4');
                });
                
                // Show label
                if (labelEl) {
                    labelEl.setAttribute('visible', true);
                    labelEl.setAttribute('animation', {
                        property: 'position',
                        to: '0 8 0',
                        dur: 300,
                        easing: 'easeOutQuad'
                    });
                }
                
                // Play soft tick sound if enabled
                playAudioClick();
            });

            el.addEventListener('mouseleave', () => {
                // Restore original color
                this.originalColors.forEach(item => {
                    item.el.setAttribute('color', item.color);
                });

                // Hide label
                if (labelEl) {
                    labelEl.setAttribute('visible', false);
                    labelEl.setAttribute('position', '0 6.5 0');
                }
            });

            // Click state
            el.addEventListener('click', () => {
                selectLocation(data.locationId);
            });
        }
    });

    // Water Fountain Particle Animation Component
    AFRAME.registerComponent('fountain-anim', {
        init: function () {
            this.droplets = [];
            const count = 35;
            
            for (let i = 0; i < count; i++) {
                const droplet = document.createElement('a-sphere');
                droplet.setAttribute('radius', '0.12');
                droplet.setAttribute('color', '#60a5fa');
                droplet.setAttribute('material', 'opacity: 0.6; transparent: true; emissive: #60a5fa; emissiveIntensity: 0.5');
                
                // Random starting params
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.08 + Math.random() * 0.06;
                
                this.droplets.push({
                    el: droplet,
                    vx: Math.cos(angle) * (0.01 + Math.random() * 0.02),
                    vy: speed,
                    vz: Math.sin(angle) * (0.01 + Math.random() * 0.02),
                    x: 0,
                    y: 1.5,
                    z: 0,
                    gravity: -0.004
                });
                
                this.el.appendChild(droplet);
            }
        },
        tick: function () {
            this.droplets.forEach(d => {
                d.vy += d.gravity;
                d.x += d.vx;
                d.y += d.vy;
                d.z += d.vz;
                
                // Reset when falling back to ground
                if (d.y < 1.5) {
                    d.x = 0;
                    d.y = 1.5;
                    d.z = 0;
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 0.08 + Math.random() * 0.06;
                    d.vx = Math.cos(angle) * (0.01 + Math.random() * 0.015);
                    d.vy = speed;
                    d.vz = Math.sin(angle) * (0.01 + Math.random() * 0.015);
                }
                
                d.el.setAttribute('position', { x: d.x, y: d.y, z: d.z });
            });
        }
    });
}

// UI Initialization
function initUI() {
    renderLocationDirectory();
    renderMiniMap();

    // Event listener for search input
    searchInputEl.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderLocationDirectory();
    });

    // Event listener for categories
    categoryTabsEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('category-tab')) {
            document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active'));
            e.target.classList.add('active');
            currentCategoryFilter = e.target.dataset.category;
            renderLocationDirectory();
        }
    });

    // Preset Views Buttons
    document.getElementById("btn-view-aerial").addEventListener("click", () => {
        resetSelection();
        triggerCameraGlide(defaultView.camPos, defaultView.camRot);
    });

    document.getElementById("btn-view-gate").addEventListener("click", () => {
        resetSelection();
        triggerCameraGlide({ x: 0, y: 3, z: 38 }, { x: -5, y: 0, z: 0 });
    });
}

// Render Directory List
function renderLocationDirectory() {
    locationListEl.innerHTML = "";

    const filtered = campusLocations.filter(loc => {
        const matchesCategory = currentCategoryFilter === "all" || loc.category === currentCategoryFilter;
        const matchesSearch = loc.name.toLowerCase().includes(searchQuery) || 
                              loc.subtitle.toLowerCase().includes(searchQuery) ||
                              loc.details.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
        locationListEl.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 20px; font-size: 0.85rem;">No locations found</div>`;
        return;
    }

    filtered.forEach(loc => {
        const card = document.createElement("div");
        card.className = `location-card ${currentSelectedLocation && currentSelectedLocation.id === loc.id ? 'selected' : ''}`;
        card.innerHTML = `
            <div class="location-card-icon">${loc.icon}</div>
            <div class="location-card-details">
                <div class="location-card-title">${loc.name}</div>
                <div class="location-card-subtitle">${loc.subtitle}</div>
            </div>
        `;
        card.addEventListener('click', () => selectLocation(loc.id));
        locationListEl.appendChild(card);
    });
}

// Render Mini Map Dots
function renderMiniMap() {
    miniMapDotsEl.innerHTML = "";
    
    // Scale campus bounds to mini map dimensions (0 to 100%)
    // Bounds: X [-35, 35], Z [-35, 35]
    campusLocations.forEach(loc => {
        const dot = document.createElement("div");
        dot.className = `map-dot ${currentSelectedLocation && currentSelectedLocation.id === loc.id ? 'active' : ''}`;
        dot.id = `map-dot-${loc.id}`;
        
        // Math transform to 2D percentage
        const xPercent = ((loc.pos.x + 35) / 70) * 100;
        const yPercent = ((loc.pos.z + 35) / 70) * 100;
        
        dot.style.left = `${xPercent}%`;
        dot.style.top = `${yPercent}%`;
        dot.title = loc.name;
        
        dot.addEventListener('click', () => selectLocation(loc.id));
        miniMapDotsEl.appendChild(dot);
    });
}

// Location Selection Action
function selectLocation(id) {
    const loc = campusLocations.find(l => l.id === id);
    if (!loc) return;

    currentSelectedLocation = loc;

    // Update list visual select state
    renderLocationDirectory();

    // Update map dots
    document.querySelectorAll('.map-dot').forEach(dot => dot.classList.remove('active'));
    const mapDot = document.getElementById(`map-dot-${loc.id}`);
    if (mapDot) mapDot.classList.add('active');

    // Display Detail Panel
    const detailBadge = document.getElementById("detail-badge");
    const detailTitle = document.getElementById("detail-title");
    const detailSubtitle = document.getElementById("detail-subtitle");
    const detailDesc = document.getElementById("detail-desc");
    const detailHours = document.getElementById("detail-hours");
    const detailDepartments = document.getElementById("detail-departments");
    const emojiIcon = document.getElementById("detail-emoji-icon");

    detailBadge.className = `detail-badge ${loc.badgeClass}`;
    detailBadge.textContent = loc.category;
    detailTitle.textContent = loc.name;
    detailSubtitle.textContent = loc.subtitle;
    detailDesc.textContent = loc.desc;
    detailHours.textContent = loc.hours;
    detailDepartments.textContent = loc.details;
    emojiIcon.textContent = loc.icon;

    detailPanelEl.classList.add("active");

    // Action buttons bindings
    const btnGlide = document.getElementById("btn-glide-action");
    const btnWalk = document.getElementById("btn-walk-action");

    // Remove old listeners
    btnGlide.replaceWith(btnGlide.cloneNode(true));
    btnWalk.replaceWith(btnWalk.cloneNode(true));

    // Re-select after clone
    const newBtnGlide = document.getElementById("btn-glide-action");
    const newBtnWalk = document.getElementById("btn-walk-action");

    newBtnGlide.addEventListener('click', () => {
        triggerCameraGlide(loc.camPos, loc.camRot);
        playAudioSuccess();
    });

    newBtnWalk.addEventListener('click', () => {
        // Teleport player rig right in front of the building
        // Compute position in front of it
        const teleportPos = {
            x: loc.pos.x + (loc.camPos.x - loc.pos.x) * 0.4,
            y: 1.6, // height of person
            z: loc.pos.z + (loc.camPos.z - loc.pos.z) * 0.4
        };
        const lookRot = {
            x: 0,
            y: loc.camRot.y,
            z: 0
        };
        triggerCameraGlide(teleportPos, lookRot, 0.12);
        playAudioSuccess();
    });

    // Auto-glide camera to viewing position on select
    triggerCameraGlide(loc.camPos, loc.camRot);
    playAudioClick();
}

function resetSelection() {
    currentSelectedLocation = null;
    renderLocationDirectory();
    
    // Clear mini-map dot active state
    document.querySelectorAll('.map-dot').forEach(dot => dot.classList.remove('active'));
    
    // Hide details panel
    detailPanelEl.classList.remove("active");
    playAudioClick();
}

// Trigger Camera Rig Glide movement in A-Frame
function triggerCameraGlide(pos, rot, speed = 0.06) {
    const camRig = document.getElementById("camera-rig");
    if (!camRig) return;

    // Reset actual camera entity rotation so it doesn't offset rig orientation
    const cameraEl = document.getElementById("main-camera");
    if (cameraEl) {
        cameraEl.setAttribute('rotation', { x: 0, y: 0, z: 0 });
        if (cameraEl.components['look-controls']) {
            cameraEl.components['look-controls'].yawObject.rotation.set(0, 0, 0);
            cameraEl.components['look-controls'].pitchObject.rotation.set(0, 0, 0);
        }
    }

    camRig.setAttribute('camera-glide', {
        targetPos: pos,
        targetRot: rot,
        active: true,
        speed: speed
    });
}

// Instructions Overlay Controls
function setupInstructions() {
    const btnHelp = document.getElementById("btn-help");
    const btnCloseHelp = document.getElementById("btn-close-help");

    btnHelp.addEventListener('click', () => {
        instructionsOverlayEl.classList.add("active");
        playAudioClick();
    });

    btnCloseHelp.addEventListener('click', () => {
        instructionsOverlayEl.classList.remove("active");
        playAudioClick();
    });
}

// Synthesize Audio Feedback using Web Audio API
function setupAudio() {
    const btnSound = document.getElementById("btn-sound");

    btnSound.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        if (soundEnabled) {
            btnSound.classList.add("active");
            btnSound.innerHTML = "🔊";
            startBackgroundAmbience();
        } else {
            btnSound.classList.remove("active");
            btnSound.innerHTML = "🔇";
            stopBackgroundAmbience();
        }
    });
}

function startBackgroundAmbience() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        bgAudio = new AudioContext();

        // Synth a soft brownian-like hum and high cricket pitch to simulate outdoor wind/nature environment
        const bufferSize = 2 * bgAudio.sampleRate;
        const noiseBuffer = bgAudio.createBuffer(1, bufferSize, bgAudio.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            // Brownian filter
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; // Gain
        }

        const whiteNoise = bgAudio.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        // Bandpass filter to make it sound like soft wind
        const filter = bgAudio.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 400;
        filter.Q.value = 1.0;

        const gainNode = bgAudio.createGain();
        gainNode.gain.value = 0.08;

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(bgAudio.destination);

        whiteNoise.start();
        bgAudio.noiseSource = whiteNoise;
    } catch (e) {
        console.warn("Audio Context init failed. Requires user interaction first.", e);
    }
}

function stopBackgroundAmbience() {
    if (bgAudio) {
        if (bgAudio.noiseSource) {
            bgAudio.noiseSource.stop();
        }
        bgAudio.close();
        bgAudio = null;
    }
}

function playAudioClick() {
    if (!soundEnabled) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = bgAudio || new AudioContext();
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
}

function playAudioSuccess() {
    if (!soundEnabled) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = bgAudio || new AudioContext();
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.setValueAtTime(600, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(800, ctx.currentTime + 0.16);
        
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
}
