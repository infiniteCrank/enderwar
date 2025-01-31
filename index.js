import * as THREE from "three";
import { OrbitControls, GLTFLoader } from "addons";

// the minimum distance away from teh gate a unit can be placed 
const GATE_RADIUS = 200;
// the maximum number of player ships allowed
const MAX_SHIPS = 10;
// the total enemy units to spawn 
const TOTAL_ENEMY_SPAWN = 10;
// projectile rate of fire for player 
const RATE_OF_FIRE = 500;
// projectile rate of fire for enemy 
const ENEMY_RATE_OF_FIRE = 500;
// max projectile range for player
const PLAYER_RANGE = 200;
// max projectile range for enemy
const ENEMY_RANGE = 200;
// starting health for player units 
const PLAYER_UNIT_HEALTH = 50;
// starting health for enemy units 
const ENEMY_UNIT_HEALTH = 50;
// Enemy Speed to gate 
const ENEMY_SPEED = 0.5;
// Player Unit Speed to gate 
const PLAYER_SPEED = 0.5;
// player Gold 
let playerGold = 0;
// enemy gold
let enemyGold = 0;
// wave number 
let waveNumber = 1;
// Starting health for gates
const PLAYER_GATE_HEALTH = 100;
const ENEMY_GATE_HEALTH = 100;
// Minimum distance to maintain between allied ships
const MIN_DISTANCE = 50; // Adjust this value as necessary

// Initialize Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
logEvent("create new scene and camera.", false, false);

// Create renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
logEvent("create new webGL renderer.", false, false);

// Add ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
logEvent("create ambient light.", false, false);

// Add directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);
logEvent("create directional light.", false, false);

// Create a sphere representing space
const spaceGeometry = new THREE.SphereGeometry(500, 32, 32);
const spaceMaterial = new THREE.MeshBasicMaterial({
    map: new THREE.TextureLoader().load('http://localhost:8080/sky.png'), // Space texture
    side: THREE.BackSide // Render the inside of the sphere
});
const spaceSphere = new THREE.Mesh(spaceGeometry, spaceMaterial);
scene.add(spaceSphere);
logEvent("create space sphere.", false, false);

// Initialize Cannon.js
const world = new CANNON.World();
world.gravity.set(0, 0, -9.82); // Gravity
logEvent("create new physics world.", false, false);

// Initialize GLTFLoader
const loader = new GLTFLoader();
logEvent("Initialize mesh loader.", false, false);

// Create the enemy gate at the south pole
const gateGeometry = new THREE.BoxGeometry(100, 200, 100); // 20 x 40 x 20 gate
const gateMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 }); // Red material for gate
const enemyGate = new THREE.Mesh(gateGeometry, gateMaterial);
enemyGate.position.set(0, -500, 0); // Position the gate at the south pole
enemyGate.userData = { health: ENEMY_GATE_HEALTH }; // Add health property
scene.add(enemyGate);
logEvent("create enemy gate.", false, false);

// Create the player gate at the north pole
const playerGateGeometry = new THREE.BoxGeometry(100, 200, 100); // Size of the player gate
const playerGateMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff }); // Blue material for player gate
const playerGate = new THREE.Mesh(playerGateGeometry, playerGateMaterial);
playerGate.position.set(0, 500, 0); // Position the player gate at the north pole
playerGate.userData = { health: PLAYER_GATE_HEALTH }; // Add health property
scene.add(playerGate);
logEvent("Create player gate.", false, false);

// Set camera position
camera.position.set(0, 50, 490);
camera.lookAt(0, 0, 0);
logEvent("Set camera position.", false, false);

// Initialize OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = true; 
controls.target.set(0, 0, 0); 
controls.update();
logEvent("Initialize orbit controls.", false, false);

// Array to hold created spaceships
let spaceships = [];

// Modify the spaceship creation function to include health and swap with GLTF model
function createSpaceship(position) {
    // Load GLTF model
    loader.load('ship1.glb', (gltf) => {
        const spaceship = gltf.scene; // Use the loaded scene from glTF
        spaceship.position.set(position.x, position.y + 5, position.z);
        spaceship.scale.set(10, 10, 10); // Adjust scale if necessary
        scene.add(spaceship);

        const shipShape = new CANNON.Box(new CANNON.Vec3(20, 20, 20)); // Adjust size if necessary
        const shipBody = new CANNON.Body({ mass: 1 });
        shipBody.addShape(shipShape);
        shipBody.position.set(position.x, position.y + 100, position.z);
        world.addBody(shipBody);

        // Initialize userData to store health and velocity
        spaceship.userData = {
            health: PLAYER_UNIT_HEALTH, // Set initial health to PLAYER_UNIT_HEALTH
            velocity: new THREE.Vector3(0, 0, 0),
            playerShip: true,

        };
        logEvent("You placed a unit at X:" + position.x + " Y:" + position.y + 100 + " Z:" + position.z + " with " + PLAYER_UNIT_HEALTH + " health.", false, false);
        spaceships.push({ spaceship, shipBody });
    });
}

// Array to hold created spaceships
let enemies = [];
// Function to create an enemy spaceship
function createEnemyShip(position) {
    return new Promise((resolve, reject) => {
        loader.load('ship2.glb', (gltf) => {
            const enemyShip = gltf.scene; // Use the loaded scene from glTF
            enemyShip.position.set(position.x, position.y + 5, position.z);
            enemyShip.scale.set(10, 10, 10); // Adjust scale if necessary
            scene.add(enemyShip);

            const enemyShipShape = new CANNON.Box(new CANNON.Vec3(40, 40, 40));
            const enemyShipBody = new CANNON.Body({ mass: 1 });
            enemyShipBody.addShape(enemyShipShape);
            enemyShipBody.position.set(position.x, position.y + 100, position.z);
            world.addBody(enemyShipBody);

            enemyShip.userData = {
                health: ENEMY_UNIT_HEALTH, 
                velocity: new THREE.Vector3(0, 0, 0),
                enemyShip: true
            };
            logEvent("An enemy unit  spawned at X:" + position.x + " Y:" + position.y + 100 + " Z:" + position.z + " with " + ENEMY_UNIT_HEALTH + " health.", false,false);
            
            enemies.push({enemyShip, enemyShipBody});
            resolve(enemyShip);
        });
    }, undefined, (error) => {
        console.error("An error happened while loading the enemy ship model: ", error);
        reject(error); // Reject the promise on error
    });
}

// Update the mouse click event listener
window.addEventListener('click', (event) => {
    const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        - (event.clientY / window.innerHeight) * 2 + 1
    );
    // if the user is click start button ignore
    if (event.target.id === "startButton" || 
        event.target.id === "eventLog" ||
        event.target.id === "toggleButton" ||
        event.target.classList.contains("noClick")
    ) {
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
            scene.remove(spaceship);
            world.removeBody(shipBody);
            spaceships.splice(spaceShipindex,1)
            logEvent("removed the following unit:" + spaceship, false, false);
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
                logEvent("You cannot place more than 10 ships!", true, true);
            }
        } else {
            logEvent("You cannot place a ship within " + GATE_RADIUS + " units of the gate!",true, true); // Optional feedback
            
        }
    }
});

// Movement towards enemy gate on start button click
let simulationActive = false;
// Button to start simulation
var startBtn = document.getElementById('startButton');
startBtn.addEventListener('click', async () => {
    //disable start button comment this out to debug enemy positions 
    startBtn.disabled = true;

    await spawnEnemyShips(); // Spawn enemy ships when the game starts
    
    logEvent("Simulation started.", true, true);
    //begin the simulation
    simulationActive = true;

    // Move all spaceships towards the gate
    for (const spaceshipData of spaceships) {
        var spaceship = spaceshipData.spaceship
        // Use the position of the enemy gate as the target
        const gatePosition = enemyGate.position.clone(); // Clone to avoid reference issues
        const direction = new THREE.Vector3().subVectors(gatePosition, spaceship.position).normalize();

        // Set a velocity for the spaceship (adjust speed as desired)
        spaceship.userData.velocity = direction.multiplyScalar(0.5); // Speed multiplier to control movement
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
    logEvent("Window resized to size W:"+window.innerWidth + " H:"+window.innerHeight, true, true);
});

function animate() {
    requestAnimationFrame(animate);

    if (simulationActive) {
        // Check for game ending conditions
        if (spaceships.length === 0 && enemies.length === 0) {
            logEvent("This was a draw.", true, true);
            resetGame();
            return;
        }
        if (spaceships.length > 0 && enemies.length === 0) {
            logEvent("You win!", true, true);
            resetGame();
            waveNumber++;
            document.getElementById('waveNumber').innerHTML = "Wave: " + waveNumber;
            return;
        }
        if (spaceships.length === 0 && enemies.length > 0) {
            logEvent("You lose.", true, true);
            resetGame();
            return;
        }

        // Update projectiles
        updateProjectiles();
        updatePlayerProjectiles();

        // Check for projectile collisions
        checkPlayerProjectileCollisions();
        checkProjectileCollisions();

        // Movement logic for player ships
        for (const spaceshipData of spaceships) {
            const spaceship = spaceshipData.spaceship;

            // Get the nearest enemy ship
            const nearestEnemyShip = getNearestEnemyShip(spaceship.position);
            if (nearestEnemyShip) {
                const directionToEnemy = nearestEnemyShip.position.clone().sub(spaceship.position).normalize();

                // Move player ship toward the nearest enemy ship
                spaceship.position.add(directionToEnemy.multiplyScalar(PLAYER_SPEED)); // Ensure PLAYER_SPEED is a small value

                // Make the player ship face the nearest enemy ship
                spaceship.lookAt(nearestEnemyShip.position);
            }
        }

        // Movement logic for enemy ships
        for (const enemyData of enemies) {
            const enemyShip = enemyData.enemyShip;

            // Get the nearest player ship
            const nearestPlayerShip = getNearestPlayerShip(enemyShip.position);
            if (nearestPlayerShip) {
                const directionToPlayer = nearestPlayerShip.position.clone().sub(enemyShip.position).normalize();

                // Move enemy ship toward the nearest player ship
                enemyShip.position.add(directionToPlayer.multiplyScalar(ENEMY_SPEED)); // Ensure ENEMY_SPEED is appropriate

                // Make the enemy ship face the nearest player ship
                enemyShip.lookAt(nearestPlayerShip.position);
            }
        }
    }

    // Step the physics world
    world.step(1 / 60);
    // Render the scene
    renderer.render(scene, camera);
}
animate();

// Reset game function to clear out health bars and ships
function resetGame() {

    const objectsToRemove = scene.children.filter((object) => {
        return (
          object instanceof THREE.Mesh &&
          object !== spaceSphere &&
          object !== playerGate &&
          object !== enemyGate 
        );
      });
    
      // this mostly will only end up cleaning up projectiles now 
      objectsToRemove.forEach((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) object.material.dispose();
    
        // Remove any associated physics body
        const bodyToRemove = world.bodies.find(
          (body) => body.userData && body.userData.mesh === object
        );
        if (bodyToRemove) {
          world.remove(bodyToRemove); // Remove from physics world
        }
    
        scene.remove(object);
      });
      
      // remove loaded player ship models 
      for (const playerShip of spaceships) {
        scene.remove(playerShip.spaceship)
        world.remove(playerShip.shipBody)
      }

    // remove loaded player ship models 
    for (const enemyShip of enemies) {
        scene.remove(enemyShip.enemyShip)
        world.remove(enemyShip.enemyShipBody)
    }
      spaceships = [];
      enemies = [];
      simulationActive = false
      startBtn.disabled = false
    
}

// Function to check collision between two objects
function checkCollision(objectA, objectB) {
    const boxA = new THREE.Box3().setFromObject(objectA);
    const boxB = new THREE.Box3().setFromObject(objectB);
    return boxA.intersectsBox(boxB);
}

// Function to spawn enemy ships
async function spawnEnemyShips() {
    const enemyCount = TOTAL_ENEMY_SPAWN; // Number of enemy ships to spawn
    let spawnedEnemies = 0; // Track how many enemy ships have been successfully spawned

    while (spawnedEnemies < enemyCount) {

        // Generate random positions within the sphere radius
        const radius = 300; // Size of your space sphere
        const randomAngle = Math.random() * Math.PI * 2; // Angle for spherical coordinates
        const randomHeight = Math.random() * radius; // Height from the center to the sphere surface
        // Convert spherical coordinates to Cartesian to ensure the position is within the sphere
        const x = Math.cos(randomAngle) * Math.sqrt(radius * radius - randomHeight * randomHeight);
        const y = randomHeight - 300; // Adjust Y relative to your setup to ensure spawning within the sphere height
        const z = Math.sin(randomAngle) * Math.sqrt(radius * radius - randomHeight * randomHeight);

        let enemyShipPosition = new THREE.Vector3(x, y, z); // Create position vector
    
        // Calculate and check distance to player gate
        const distanceToGate = enemyShipPosition.distanceTo(playerGate.position);

        // Only spawn if the distance is greater than the defined threshold
        if (distanceToGate > GATE_RADIUS) {
            let directionToGate
            const enemyShip = await createEnemyShip(enemyShipPosition)
            // Calculate direction to player gate
            directionToGate = playerGate.position.clone().sub(enemyShip.position).normalize();
            // Set enemy ship's moving velocity in userData for future updates
            enemyShip.userData.velocity = directionToGate.multiplyScalar(ENEMY_SPEED); // Adjust speed as desired
            
            spawnedEnemies++; // Increment the count of spawned enemies
        } 
    }
}

function getNearestPlayerShip(enemyShipPosition) {
    let nearestShip = null;
    let minDistance = Infinity;

    for (const playerShipData of spaceships) {
        const distance = playerShipData.spaceship.position.distanceTo(enemyShipPosition);
        if (distance < minDistance) {
            minDistance = distance;
            nearestShip = playerShipData.spaceship;
        }
    }

    return nearestShip;
}
function getNearestEnemyShip(playerShipPosition) {
    let nearestShip = null;
    let minDistance = Infinity;
    for (const shipData of enemies) {
        const distance = shipData.enemyShip.position.distanceTo(playerShipPosition);
        if (distance < minDistance) {
            minDistance = distance;
            nearestShip = shipData.enemyShip;
        }
    }

    return nearestShip;
}

// Array to hold projectiles
let projectiles = [];
let playerProjectiles = [];

// Function to create a projectile
function createProjectile(position, direction) {
    const projectileGeometry = new THREE.SphereGeometry(5, 8, 8); // Small sphere for projectile
    const projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow color for projectile
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectile.position.copy(position); // Set initial position to enemy ship's position
    projectile.userData = {
        direction: direction.clone().normalize(), // Store the direction in userData
        travelDistance: 0 // Track the traveled distance
    };
    scene.add(projectile);
    return projectile
}

// Delay method for shooting projectiles
function shootProjectiles(enemyShip) {
    const nearestPlayerShip = getNearestPlayerShip(enemyShip.position);
    if (nearestPlayerShip) {
        const directionToPlayer = nearestPlayerShip.position.clone().sub(enemyShip.position).normalize();

        // Create and fire a projectile
        const projectile = createProjectile(enemyShip.position, directionToPlayer, false);
        projectiles.push(projectile)
    }
}

// Create projectiles for player ships
function shootPlayerProjectiles(spaceShip) {
    const nearestEnemyShip = getNearestEnemyShip(spaceShip.position);
    if (nearestEnemyShip) {
        const directionToEnemy = nearestEnemyShip.position.clone().sub(spaceShip.position).normalize();
        // Create and fire a projectile
        const projectile = createProjectile(spaceShip.position, directionToEnemy);
        playerProjectiles.push(projectile); // Store it in player projectiles
    }
}

// Shooting function to be called repeatedly
setInterval(() => {
    for (const enemyData of enemies) {
        shootProjectiles(enemyData.enemyShip);
    }
}, ENEMY_RATE_OF_FIRE); // Fire every 500 ms

// Call the function on intervals for both enemies and player ships
setInterval(() => {
    for (const shipData of spaceships) {
        shootPlayerProjectiles(shipData.spaceship);
    }
}, RATE_OF_FIRE); // Fire every 500 ms

// Update projectile positions and remove them if necessary
function updateProjectiles() {
    projectiles.forEach((projectile, index) => {
        const speed = 2; // Speed of the projectile
        if (projectile.userData && projectile.userData.direction) {
            // Move projectile based on its direction
            projectile.position.add(projectile.userData.direction.clone().multiplyScalar(speed));
            projectile.userData.travelDistance += speed; // Update traveled distance
            // Remove projectile after 200 units
            if (projectile.userData.travelDistance > ENEMY_RANGE) {
                scene.remove(projectile);
                projectile.geometry.dispose();
                projectile.material.dispose();
                projectiles.splice(index, 1); // Remove from array
            }
        }
    });
}

// Update projectile positions and readjust for player projectiles
function updatePlayerProjectiles() {
    playerProjectiles.forEach((projectile, index) => {
        const speed = 2; // Speed of the projectile
        if (projectile.userData && projectile.userData.direction) {
            projectile.position.add(projectile.userData.direction.clone().multiplyScalar(speed));
            projectile.userData.travelDistance += speed;

            if (projectile.userData.travelDistance > PLAYER_RANGE) {
                scene.remove(projectile);
                projectile.geometry.dispose();
                projectile.material.dispose();
                playerProjectiles.splice(index, 1);
            }
        }
    });
}

function checkProjectileCollisions() {
    projectiles.forEach((projectile, projectileIndex) => {
        for (const playerShipData of spaceships) {
            const playerShip = playerShipData.spaceship;

            // Check collision between projectile and player ship
            if (checkCollision(projectile, playerShip)) {
                // Reduce health by 1
                playerShip.userData.health -= 1;
                // Check if the player ship's health is 0
                if (playerShip.userData.health <= 0) {
                    // Remove player ship from the scene
                    scene.remove(playerShip);
                    world.removeBody(playerShipData.shipBody);
                    spaceships.splice(spaceships.indexOf(playerShipData), 1); // Remove from array
                    logEvent("1 player ship defeated", false, false);
                    enemyGold += 5; 
                    document.getElementById("enemyGold").innerHTML = "Enemy Gold: " + enemyGold;
                }

                // Remove the projectile after hit
                scene.remove(projectile);
                projectile.geometry.dispose();
                projectile.material.dispose();
                projectiles.splice(projectileIndex, 1); // Remove from the projectile array

                return; // Exit the loop once a hit is processed
            }
        }
                // Also check for collisions with the player gate
        if (checkCollision(projectile, playerGate) && playerGate.userData.health >0 ) {
            playerGate.userData.health -= 1; // Reduce gate health
            logEvent("Enemy projectile hit the player gate. Remaining health: " + playerGate.userData.health, false, false);
            if (playerGate.userData.health === 0) {
                scene.remove(playerGate);
                logEvent("Player gate destroyed.", true, true);
            }

            // Remove the projectile after hitting the gate
            scene.remove(projectile);
            projectile.geometry.dispose();
            projectile.material.dispose();
            projectiles.splice(projectileIndex, 1); // Remove from the projectile array

            return; // Exit the loop once a hit is processed
        }
    })
}

function checkPlayerProjectileCollisions() {
    playerProjectiles.forEach((playerProjectile, projectileIndex) => {
        for (const shipData of enemies) {
            const enemyShip = shipData.enemyShip;

            // Check collision between projectile and player ship
            if (checkCollision(playerProjectile, enemyShip)) {
                // Reduce health by 1
                enemyShip.userData.health -= 1;
                // Check if the player ship's health is 0
                if (enemyShip.userData.health <= 0) {
                    // Remove player ship from the scene
                    scene.remove(enemyShip);
                    world.removeBody(shipData.enemyShipBody);
                    enemies.splice(enemies.indexOf(shipData), 1); // Remove from array
                    logEvent("1 enemy ship defeated", false, false);
                    playerGold += 5;
                    document.getElementById("playerGold").innerHTML = "Player Gold: " + playerGold;
                }

                // Remove the projectile after hit
                scene.remove(playerProjectile);
                playerProjectile.geometry.dispose();
                playerProjectile.material.dispose();
                playerProjectiles.splice(projectileIndex, 1); // Remove from the projectile array

                return; // Exit the loop once a hit is processed
            }

            // Also check for collisions with the enemy gate
            if (checkCollision(playerProjectile, enemyGate) && enemyGate.userData.health > 0) {
                enemyGate.userData.health -= 1; // Reduce gate health
                logEvent("Player projectile hit the enemy gate. Remaining health: " + enemyGate.userData.health, false, false);
                if (enemyGate.userData.health === 0) {
                    scene.remove(enemyGate);
                    logEvent("Enemy gate destroyed.", true, true);
                }

                // Remove the projectile after hitting the gate
                scene.remove(playerProjectile);
                playerProjectile.geometry.dispose();
                playerProjectile.material.dispose();
                playerProjectiles.splice(projectileIndex, 1); // Remove from the projectile array

                return; // Exit the loop once a hit is processed
            }
        }
    });
}

const logElement = document.getElementById('eventLog');

let isDragging = false;
let startX, startY, initialMouseX, initialMouseY;

logElement.addEventListener('mousedown', (event) => {
    isDragging = true;
    startX = logElement.offsetLeft;
    startY = logElement.offsetTop;
    initialMouseX = event.clientX;
    initialMouseY = event.clientY;
});

document.addEventListener('mousemove', (event) => {
    if (isDragging) {
        const dx = event.clientX - initialMouseX;
        const dy = event.clientY - initialMouseY;
        logElement.style.left = startX + dx + 'px';
        logElement.style.top = startY + dy + 'px';
    }
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

function logEvent(eventMessage, toggleLogOpen, highlight) {
    const logList = document.getElementById('logList');
    const newLogEntry = document.createElement('li');
    newLogEntry.classList.add("noClick")
    if(highlight){
        newLogEntry.classList.add("highlight")
    }
    newLogEntry.textContent = eventMessage;
    logList.appendChild(newLogEntry);
    
    // Optional: Scroll to the bottom of the log to show the latest entry
    logList.scrollTop = logList.scrollHeight;

    //open the log if toggleLogOpen is true and its hidden
    if(logList.classList.contains('hidden') && toggleLogOpen){
        logList.classList.toggle('hidden'); // Toggle the hidden class
        logList.scrollTop = logList.scrollHeight;
    }
    
}

const toggleButton = document.getElementById('toggleButton');
const logList = document.getElementById('logList');

toggleButton.addEventListener('click', () => {
    logList.classList.toggle('hidden'); // Toggle the hidden class
});
