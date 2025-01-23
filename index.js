import * as THREE from "three";
import { OrbitControls } from "addons";

// the minimum distance away from teh gate a unit can be placed 
const GATE_RADIUS = 800;
// the maximum number of player ships allowed
const MAX_SHIPS = 10;
// the total enemy units to spawn 
const TOTAL_ENEMY_SPAWN = 10;
// projectile rate of fire for player 
const RATE_OF_FIRE = 500;
// projectile rate of fire for enemy 
const ENEMY_RATE_OF_FIRE = 500;

const PLAYER_RANGE = 200;
const ENEMY_RANGE = 200;

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

// Modify the spaceship creation function to include health
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
        health: 5, // Set initial health to 5
        velocity: new THREE.Vector3(0, 0, 0),
        playerShip: true,
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
        health: 50, 
        velocity: new THREE.Vector3(0, 0, 0),
        enemyShip: true
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
            scene.remove(spaceship);
            spaceship.geometry.dispose();
            spaceship.material.dispose();
            world.removeBody(shipBody);
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
            alert("You cannot place a ship within " + GATE_RADIUS + " units of the gate!"); // Optional feedback
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
});

function animate() {
    requestAnimationFrame(animate);

    if (simulationActive) {

        // Update projectiles
        updateProjectiles();
        updatePlayerProjectiles();

        // Check for projectile collisions with player ships
        checkPlayerProjectileCollisions();
        checkProjectileCollisions();
        

        // Update positions and physics
        for (const spaceshipData of spaceships) {

            const spaceship = spaceshipData.spaceship;

            // Get the nearest player ship
            const nearestEnemyrShip = getNearestEnemyShip(spaceship.position);
            
            if (nearestEnemyrShip) {
                const directionToPlayer = nearestEnemyrShip.position.clone().sub(spaceship.position).normalize();
                // Calculate the rotation angle
                const lookAtTarget = new THREE.Vector3().addVectors(spaceship.position, directionToPlayer);
                spaceship.lookAt(lookAtTarget);
            }

            if (spaceship.userData && spaceship.userData.velocity) {
                spaceship.position.add(spaceship.userData.velocity);


                // Check for collision with obstacles
                scene.children.forEach((child) => {
                    if (child instanceof THREE.Mesh && child !== spaceSphere && 
                        child !== playerGate && child !== enemyGate) {
                        
                        if (checkCollision(spaceship, child)) {
                            // If a collision is detected, redirect the ship
                            steerAroundObstacle(spaceship, child);
                        }
                    }
                });
                // Continue movement towards the gates after steering
                const gatePosition = enemyGate.position.clone();
                const directionToGate = gatePosition.clone().sub(spaceship.position).normalize();
                spaceship.userData.velocity.add(directionToGate.multiplyScalar(0.1)); // Adjust speed for a smoother approach
                spaceship.userData.velocity.normalize(); // Normalize to keep consistent speed
            }

            // Collision check with the enemy gate
            if (checkCollision(spaceship, enemyGate)) {
                alert("You win!");
                resetGame();
                return;
            }
        }

        for (const enemyData of enemies) {

            const enemyShip = enemyData.enemyShip;

            // Get the nearest player ship
            const nearestPlayerShip = getNearestPlayerShip(enemyShip.position);
            
            if (nearestPlayerShip) {
                const directionToPlayer = nearestPlayerShip.position.clone().sub(enemyShip.position).normalize();
                // Calculate the rotation angle
                const lookAtTarget = new THREE.Vector3().addVectors(enemyShip.position, directionToPlayer);
                enemyShip.lookAt(lookAtTarget);
            }

            if (enemyShip.userData && enemyShip.userData.velocity && enemyShip.userData.EnemyType === 'aggressive') {
                enemyShip.position.add(enemyShip.userData.velocity);

                // Check for collision with obstacles
                scene.children.forEach((child) => {
                    if (child instanceof THREE.Mesh && child !== spaceSphere && 
                        child !== playerGate && child !== enemyGate) {
                        
                        if (checkCollision(enemyShip, child)) {
                            // If a collision is detected, redirect the ship
                            steerAroundObstacle(enemyShip, child);
                        }
                    }
                });
                // Continue movement towards the gates after steering
                const gatePosition = playerGate.position.clone();
                const directionToGate = gatePosition.clone().sub(enemyShip.position).normalize();
                enemyShip.userData.velocity.add(directionToGate.multiplyScalar(0.1)); // Adjust speed for a smoother approach
                enemyShip.userData.velocity.normalize(); // Normalize to keep consistent speed
            }

            // Check for enemy ship collisions with the player gate
            if (checkCollision(enemyShip, playerGate)) {
                alert("You lose!");
                resetGame();
                return;
            }
        }

        //Collision handling for player and enemy ships both ships should get destroyed 
        for (const playerShip of spaceships) {
            for (const enemyShip of enemies) {
                if (checkCollision(playerShip.spaceship, enemyShip.enemyShip)) {
                    enemyShip.enemyShip.userData.health -= 1; // Enemy takes damage
                    if (enemyShip.enemyShip.userData.health <= 0) {
                        scene.remove(playerShip.spaceship);
                        playerShip.spaceship.geometry.dispose();
                        playerShip.spaceship.material.dispose();
                        world.removeBody(playerShip.shipBody);
                        spaceships.splice(spaceships.indexOf(playerShip), 1); // Remove player ship from array

                        scene.remove(enemyShip.enemyShip);
                        enemyShip.enemyShip.geometry.dispose();
                        enemyShip.enemyShip.material.dispose();
                        world.removeBody(enemyShip.enemyShipBody);
                        enemies.splice(enemies.indexOf(enemyShip), 1); // Remove enemy ship from array
                        console.log("both ships destroyed")
                    }
                }
            }
        }
    }

    // Step the physics world
    world.step(1 / 60);
    // Render scene
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
    
      // Clean up Three.js objects first
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
      spaceships = [];
      enemies = [];
      simulationActive = false
    
}

// Function to check collision between two objects
function checkCollision(objectA, objectB) {
    const boxA = new THREE.Box3().setFromObject(objectA);
    const boxB = new THREE.Box3().setFromObject(objectB);
    return boxA.intersectsBox(boxB);
}

// Function to spawn enemy ships
function spawnEnemyShips() {
    const enemyCount = TOTAL_ENEMY_SPAWN; // Number of enemy ships to spawn
    let spawnedEnemies = 0; // Track how many enemy ships have been successfully spawned

    while (spawnedEnemies < enemyCount) {

        const enemyType = Math.random() < 0.4 ? 'defensive' : 'aggressive'; // Randomly choose enemy type
        let enemyShipPosition
        if(enemyType ==="aggressive"){// aggressive types stay on the outside edge 
            // Generate random positions within the sphere radius
            const radius = 300; // Size of your space sphere
            const randomAngle = Math.random() * Math.PI * 2; // Angle for spherical coordinates
            const randomHeight = Math.random() * radius; // Height from the center to the sphere surface
            // Convert spherical coordinates to Cartesian to ensure the position is within the sphere
            const x = Math.cos(randomAngle) * Math.sqrt(radius * radius - randomHeight * randomHeight);
            const y = randomHeight - 300; // Adjust Y relative to your setup to ensure spawning within the sphere height
            const z = Math.sin(randomAngle) * Math.sqrt(radius * radius - randomHeight * randomHeight);

            enemyShipPosition = new THREE.Vector3(x, y, z); // Create position vector
        }else{ // defence stays in the middle 
            // Random positions to spawn within a certain range
            const randomX = (Math.random() * 600) - 300  // Random X position
            const randomZ = (Math.random() * 600) - 300  // Random Z position
            enemyShipPosition = new THREE.Vector3(randomX, -300, randomZ); // near enemy gate 
        }
        

        // Calculate and check distance to player gate
        const distanceToGate = enemyShipPosition.distanceTo(playerGate.position);

        // Only spawn if the distance is greater than the defined threshold
        if (distanceToGate > GATE_RADIUS) {
            const enemyShip = createEnemyShip(enemyShipPosition); // Create the enemy ship
            
            // Calculate direction to player gate
            const directionToGate = playerGate.position.clone().sub(enemyShip.position).normalize();

            // Set enemy ship's moving velocity in userData for future updates
            enemyShip.userData.velocity = directionToGate.multiplyScalar(0.5); // Adjust speed as desired
            enemyShip.userData.EnemyType = enemyType;
            console.log(enemyType);
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
                console.log("player ship hit. health at :" +playerShip.userData.health )
                // Check if the player ship's health is 0
                if (playerShip.userData.health <= 0) {
                    // Remove player ship from the scene
                    scene.remove(playerShip);
                    playerShip.geometry.dispose();
                    playerShip.material.dispose();
                    world.removeBody(playerShipData.shipBody);
                    spaceships.splice(spaceships.indexOf(playerShipData), 1); // Remove from array
                    console.log("player ship destoryed")
                    if(spaceships.length === 0){
                        alert("You lose!");
                        resetGame();
                        return;
                    }
                }

                // Remove the projectile after hit
                scene.remove(projectile);
                projectile.geometry.dispose();
                projectile.material.dispose();
                projectiles.splice(projectileIndex, 1); // Remove from the projectile array

                return; // Exit the loop once a hit is processed
            }
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
                console.log("*****enemy ship hit. health at :" +enemyShip.userData.health )
                // Check if the player ship's health is 0
                if (enemyShip.userData.health <= 0) {
                    // Remove player ship from the scene
                    scene.remove(enemyShip);
                    enemyShip.geometry.dispose();
                    enemyShip.material.dispose();
                    world.removeBody(shipData.enemyShipBody);
                    enemies.splice(enemies.indexOf(shipData), 1); // Remove from array
                    console.log("enemy ship destoryed");
                }

                // Remove the projectile after hit
                scene.remove(playerProjectile);
                playerProjectile.geometry.dispose();
                playerProjectile.material.dispose();
                playerProjectiles.splice(projectileIndex, 1); // Remove from the projectile array

                return; // Exit the loop once a hit is processed
            }
        }
    });
}

// Function to create obstacles
function createObstacle(position) {
    const obstacleGeometry = new THREE.BoxGeometry(50, 50, 50); // Adjust size as needed
    const obstacleMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 }); // Grey color for obstacles
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
    obstacle.position.copy(position);
    scene.add(obstacle);

    const obstacleShape = new CANNON.Box(new CANNON.Vec3(50/2, 50/2, 50/2)); // Physics shape
    const obstacleBody = new CANNON.Body({ mass: 0 }); // Static obstacle
    obstacleBody.addShape(obstacleShape);
    obstacleBody.position.copy(position);
    world.addBody(obstacleBody);
}

// Function to spawn obstacles
function spawnObstacles(count) {
    for (let i = 0; i < count; i++) {
        const randomX = (Math.random() - 0.5) * 800; // Adjust range
        const randomY = (Math.random() - 0.5) * 800; // Adjust range
        const randomZ = (Math.random() - 0.5) * 800; // Adjust range
        const position = new THREE.Vector3(randomX, randomY, randomZ);
        
        // Ensure obstacles are not within a certain distance of the gates or other obstacles
        const distanceToPlayerGate = position.distanceTo(playerGate.position);
        const distanceToEnemyGate = position.distanceTo(enemyGate.position);

        if (distanceToPlayerGate > 200 && distanceToEnemyGate > 200) {
            createObstacle(position);
        }
    }
}
spawnObstacles(10); // Adjust the number of obstacles

function steerAroundObstacle(spaceship, obstacle) {
    const obstaclePosition = obstacle.position.clone();
    const directionToObstacle = obstaclePosition.clone().sub(spaceship.position).normalize();

    // Calculate a direction perpendicular to the obstacle
    const perpendicularDirection = new THREE.Vector3(-directionToObstacle.z, 0, directionToObstacle.x);
    
    // Adjust the spaceship's velocity to move around the obstacle
    spaceship.userData.velocity = perpendicularDirection.multiplyScalar(0.5); // Adjust speed as needed
}