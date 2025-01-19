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

// Modify the spaceship creation functions to include health
function createSpaceship(position) {
    const shipGeometry = new THREE.BoxGeometry(40, 40, 40);
    const shipMaterial = new THREE.MeshPhongMaterial({ color: 0xff00ff });
    const spaceship = new THREE.Mesh(shipGeometry, shipMaterial);
    spaceship.position.set(position.x, position.y + 5, position.z);
    scene.add(spaceship);

    const shipShape = new CANNON.Box(new CANNON.Vec3(40, 40, 40));
    const shipBody = new CANNON.Body({ mass: 1 });
    shipBody.addShape(shipShape);
    shipBody.position.set(position.x, position.y + 100, position.z);
    world.addBody(shipBody);

    // Initialize userData to store health and velocity
    spaceship.userData = {
        health: 10, // Health
        velocity: new THREE.Vector3(0, 0, 0),
        playerShip: true,
        healthBar: createHealthBar(10) // Create health bar
    };
    
    spaceships.push({spaceship, shipBody}); 
    return spaceship;
}

// Array to hold created spaceships
let enemies = [];
// Function to create an enemy spaceship
function createEnemyShip(position) {
    const enemyShipGeometry = new THREE.BoxGeometry(40, 40, 40);
    const enemyShipMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const enemyShip = new THREE.Mesh(enemyShipGeometry, enemyShipMaterial);
    enemyShip.position.set(position.x, position.y, position.z);
    scene.add(enemyShip);

    const enemyShipShape = new CANNON.Box(new CANNON.Vec3(40, 40, 40));
    const enemyShipBody = new CANNON.Body({ mass: 1 });
    enemyShipBody.addShape(enemyShipShape);
    enemyShipBody.position.set(position.x, position.y + 100, position.z);
    world.addBody(enemyShipBody);

    enemyShip.userData = {
        health: 10, // Health
        velocity: new THREE.Vector3(0, 0, 0),
        healthBar: createHealthBar(10) // Create health bar
    };
    
    enemies.push({enemyShip, enemyShipBody});
    return enemyShip;
}

// Create the enemy gate at the south pole
const gateGeometry = new THREE.BoxGeometry(100, 200, 100); // 20 x 40 x 20 gate
const gateMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 }); // Red material for gate
const enemyGate = new THREE.Mesh(gateGeometry, gateMaterial);
enemyGate.position.set(0, -500, 0); // Position the gate at the south pole
scene.add(enemyGate);

// Create the player gate at the north pole
const playerGateGeometry = new THREE.BoxGeometry(100, 200, 100); // Size of the player gate
const playerGateMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff }); // Blue material for player gate
const playerGate = new THREE.Mesh(playerGateGeometry, playerGateMaterial);
playerGate.position.set(0, 500, 0); // Position the player gate at the north pole
scene.add(playerGate);

// Set camera position
camera.position.set(0, 50, 50);
camera.lookAt(0, 0, 0);

// Initialize OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = true; 
controls.target.set(0, 0, 0); 
controls.update();

// Add a constant for the minimum distance
const GATE_RADIUS = 200;


// Add this line to define the maximum number of ships allowed
const MAX_SHIPS = 10;

// Update the mouse click event listener
window.addEventListener('click', (event) => {
    const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        - (event.clientY / window.innerHeight) * 2 + 1
    );
    // if the user is click start button ignore
    if (event.target.id === "startButton") {
        return 
    }
    // cant place ships after game start 
    if (simulationActive){
        return
    }

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    for (const spaceShipindex in spaceships) {
        const spaceShipData = spaceships[spaceShipindex]
        const spaceship = spaceShipData.spaceship
        const shipBody = spaceShipData.shipBody
        const hasClickedOnShip = raycaster.intersectObject(spaceship)
        // if a spaceship was clicked on remove it 
        if(hasClickedOnShip.length > 0){
            console.log(spaceship)
            scene.remove(spaceship);
            spaceships.splice(spaceShipindex,1)
            return
        }
    }
    const intersects = raycaster.intersectObject(spaceSphere);
    if (intersects.length > 0) {
        const intersectionPoint = intersects[0].point;

        // Calculate the distance from the intersection point to the gate
        const gatePosition = enemyGate.position.clone();
        const distanceToGate = intersectionPoint.distanceTo(gatePosition);

        // Check if the distance is greater than the radius
        if (distanceToGate > GATE_RADIUS) {
           // Check if the current number of ships is less than the maximum
           if (spaceships.length < MAX_SHIPS) {
                createSpaceship(intersectionPoint); // Create a spaceship at the intersection point
            } else {
                alert("You cannot place more than 10 ships!"); // Feedback when max ship limit is reached
            }
        } else {
            alert("You cannot place a ship within 200 units of the gate!"); // Optional feedback
        }
    }
});

// Movement towards enemy gate on start button click
let simulationActive = false;
// Button to start simulation
document.getElementById('startButton').addEventListener('click', () => {
    simulationActive = true;

    spawnEnemyShips(); // Spawn enemy ships when the game starts

    // Move all spaceships towards the gate
    for (const spaceshipData of spaceships) {
        var spaceship = spaceshipData.spaceship
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

function animate() {
    requestAnimationFrame(animate);

    if (simulationActive) {
        // Update positions and physics
        for (const spaceshipData of spaceships) {
            const spaceship = spaceshipData.spaceship;
            if (spaceship.userData && spaceship.userData.velocity) {
                spaceship.position.add(spaceship.userData.velocity);

                // Update health bar position and scale
                spaceship.userData.healthBar.position.set(spaceship.position.x, spaceship.position.y + 30, spaceship.position.z);
                spaceship.userData.healthBar.scale.x = spaceship.userData.health; // Set width based on health
            }

            // Collision check with the enemy gate
            if (checkCollision(spaceship, enemyGate)) {
                alert("You win!");
                resetGame();
                return;
            }
        }

        for (const enemyData of enemies){
            const enemyShip = enemyData.enemyShip;
            if (enemyShip.userData && enemyShip.userData.velocity) {
                enemyShip.position.add(enemyShip.userData.velocity);
                
                // Update health bar position and scale
                enemyShip.userData.healthBar.position.set(enemyShip.position.x, enemyShip.position.y + 30, enemyShip.position.z);
                enemyShip.userData.healthBar.scale.x = enemyShip.userData.health; // Set width based on health
            }

            // Check for enemy ship collisions with the player gate
            if (checkCollision(enemyShip, playerGate)) {
                alert("You lose!");
                resetGame();
                return;
            }
        }

        // Here you can add logic to handle taking damage and health reduction
        // Example: Check for collision between player and enemy ships
        for (const playerShip of spaceships) {
            for (const enemyShip of enemies) {
                if (checkCollision(playerShip.spaceship, enemyShip.enemyShip)) {
                    // Assume a collision means the enemy ship takes damage
                    enemyShip.enemyShip.userData.health -= 1; // Or whatever damage you wish to apply
                    if (enemyShip.enemyShip.userData.health <= 0) {
                        // Handle enemy ship destruction
                        enemyShip.healthBar.visible = false; // Hide health bar
                        scene.remove(enemyShip.enemyShip);
                        enemies.splice(enemies.indexOf(enemyShip), 1); // Remove enemy ship from array
                    }
                }
            }
        }

        // Step the physics world
        world.step(1 / 60);
    }

    // Render scene
    renderer.render(scene, camera);
}
animate();

// Reset game function to clear out health bars and ships
function resetGame() {
    // Reset player ships
    spaceships.forEach(spaceshipData => {
        const spaceship = spaceshipData.spaceship;
        scene.remove(spaceship);
        spaceship.userData.healthBar.visible = false; // Hide health bar when reset
    });
    spaceships = [];

    // Reset enemy ships
    enemies.forEach(enemyData => {
        const enemyShip = enemyData.enemyShip;
        scene.remove(enemyShip);
        enemyShip.userData.healthBar.visible = false; // Hide health bar when reset
    });
    enemies = [];

    simulationActive = false;
}

// Function to check collision between two objects
function checkCollision(objectA, objectB) {
    const boxA = new THREE.Box3().setFromObject(objectA);
    const boxB = new THREE.Box3().setFromObject(objectB);
    return boxA.intersectsBox(boxB);
}

// Function to spawn enemy ships
function spawnEnemyShips() {
    const enemyCount = 10; // Number of enemy ships to spawn
    let spawnedEnemies = 0; // Track how many enemy ships have been successfully spawned

    while (spawnedEnemies < enemyCount) {
        // Random positions to spawn within a certain range
        const randomX = (Math.random() - 0.5) * 1000;  // Random X position
        const randomZ = (Math.random() - 0.5) * 1000;  // Random Z position
        const enemyShipPosition = new THREE.Vector3(randomX, 0, randomZ); // Spawn at ground level

        // Calculate and check distance to player gate
        const distanceToGate = enemyShipPosition.distanceTo(playerGate.position);

        // Only spawn if the distance is greater than the defined threshold
        if (distanceToGate > GATE_RADIUS) {
            const enemyShip = createEnemyShip(enemyShipPosition); // Create the enemy ship
            
            // Calculate direction to player gate
            const directionToGate = playerGate.position.clone().sub(enemyShip.position).normalize();

            // Set enemy ship's moving velocity in userData for future updates
            enemyShip.userData.velocity = directionToGate.multiplyScalar(0.05); // Adjust speed as desired

            spawnedEnemies++; // Increment the count of spawned enemies
        } 
        // If the distance is less than or equal to 200 units, a new position will be tried in the next iteration
    }
}

// Function to create health bar
function createHealthBar(health) {
    const healthBarGeometry = new THREE.PlaneGeometry(40, 5);
    const healthBarMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);

    // Set the initial health bar scale
    healthBar.scale.x = health; // Scale according to health value
    healthBar.position.y += 30; // Position it above the ship

    scene.add(healthBar);
    return healthBar;
}