import * as THREE from "three";
import { OrbitControls } from "addons";

// Initialize Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Create renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Add directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Create a sphere representing space
const spaceGeometry = new THREE.SphereGeometry(500, 32, 32);
const spaceMaterial = new THREE.MeshBasicMaterial({
    map: new THREE.TextureLoader().load('http://localhost:8080/sky.png'), // Space texture
    side: THREE.BackSide // Render the inside of the sphere
});
const spaceSphere = new THREE.Mesh(spaceGeometry, spaceMaterial);
scene.add(spaceSphere);

// Initialize Cannon.js
const world = new CANNON.World();
world.gravity.set(0, 0, -9.82); // Gravity

// Array to hold created spaceships
let spaceships = [];

// Function to create a spaceship
function createSpaceship(position) {
    const shipGeometry = new THREE.BoxGeometry(40, 40, 40); // Size of the spaceship
    const shipMaterial = new THREE.MeshPhongMaterial({ color: 0xff00ff });

    const spaceship = new THREE.Mesh(shipGeometry, shipMaterial);
    spaceship.position.set(position.x, position.y + 5, position.z); // Raise it higher
    scene.add(spaceship);
    spaceships.push(spaceship); // Add spaceship to the array

    const shipShape = new CANNON.Box(new CANNON.Vec3(40, 40, 40));
    const shipBody = new CANNON.Body({ mass: 1 });
    shipBody.addShape(shipShape);
    shipBody.position.set(position.x, position.y + 100, position.z);
    world.addBody(shipBody);

    // Initialize userData to store velocity
    spaceship.userData = {
        velocity: new THREE.Vector3(0, 0, 0) // Initialize velocity as a Vector3
    };

    return spaceship; // Return the spaceship for further manipulation if needed
}

// Create the enemy gate at the south pole
const gateGeometry = new THREE.BoxGeometry(100, 200, 100); // 20 x 40 x 20 gate
const gateMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 }); // Red material for gate
const enemyGate = new THREE.Mesh(gateGeometry, gateMaterial);
enemyGate.position.set(0, -500, 0); // Position the gate at the south pole
scene.add(enemyGate);

// Set camera position
camera.position.set(0, 50, 50);
camera.lookAt(0, 0, 0);

// Initialize OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = true; 
controls.target.set(0, 0, 0); 
controls.update();

// Add mouse click event to place spaceships
window.addEventListener('click', (event) => {
    const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        - (event.clientY / window.innerHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(spaceSphere);
    if (intersects.length > 0) {
        const intersectionPoint = intersects[0].point;
        createSpaceship(intersectionPoint); // Create a spaceship at the intersection point
    }
});

// Movement towards enemy gate on start button click
let simulationActive = false;
// Button to start simulation
document.getElementById('startButton').addEventListener('click', () => {
    simulationActive = true;

    // Move all spaceships towards the gate
    for (const spaceship of spaceships) {
        // Use the position of the enemy gate as the target
        const gatePosition = enemyGate.position.clone(); // Clone to avoid reference issues
        const direction = new THREE.Vector3().subVectors(gatePosition, spaceship.position).normalize();

        // Set a velocity for the spaceship (adjust speed as desired)
        spaceship.userData.velocity = direction.multiplyScalar(0.1); // Speed multiplier to control movement
    }
});

// Handle window resizing
window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;

    // Update camera aspect ratio and size
    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    // Update renderer size
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (simulationActive) {
        // Update positions and physics
        for (const spaceship of spaceships) {
            // Check if userData and velocity are defined
            if (spaceship.userData && spaceship.userData.velocity) {
                // Move spaceship according to the assigned velocity
                spaceship.position.add(spaceship.userData.velocity); // Update position
            }
        }

        // Step the physics world
        world.step(1 / 60);
    }

    // Render scene
    renderer.render(scene, camera);
}

animate();