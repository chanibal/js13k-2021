import ecs from "./ecs.m.js";
import { Trail, TrailSystem } from "./Trail.js";
import { DebugCollidersSystem } from "./DebugCollidersSystem.js";
import { Renderer } from "./Renderer.js";
import { Projectile, ProjectileSystem } from "./Projectile.js";
import { explode, Explosion, ExplosionSystem } from "./Explosion.js";
import { Transform, UpdateRendererPositionsSystem } from "./Transform.js";
import { Collider, CollisionSystem, DestroyOnCollisionSystem, DestroyOnCollision } from "./Collisions.js";
import { GripController } from "./GripController.js";
import { message, TextCanvas } from "./message.js";


// Basic parts of engine
export let frameNumber = 0;

export const renderer = new THREE.WebGLRenderer();
renderer.xr.enabled = true;
renderer.antialias = true;

export const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.set(0, 1.7, 0);
camera.lookAt(-5,-3,-1);

function onWindowResize() {
    renderer.setPixelRatio( window.devicePixelRatio );
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}
addEventListener( 'resize', onWindowResize);
onWindowResize();

document.body.appendChild( renderer.domElement );


// Aliases to popular types:
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x,y,z);
const PI = Math.PI;

function Random(scale = 1, base = 0, pow = 1) { 
    return base + Math.pow(Math.random(), pow) * scale; 
}

function RandomNormalDist(scale = 1, base = 0) { 
    let r = Math.random;
    return base + (r()+r()+r()+r()+r()-2.5)/5 * scale; 
}


// Background, scene, sun, fog etc.
export const scene = new THREE.Scene();
{
    const gridHelper = new THREE.GridHelper( 100, 100 );
    scene.add(gridHelper.clone());
    gridHelper.scale.set(10,10,10);
    scene.add(gridHelper);
    scene.fog = new THREE.Fog(0x1d212c, 1, 15);
    scene.background = new THREE.Color(0x1d212c);

    // A box geometry just beneath the grid to make domes out of nukes hitting ground
    const bottom = new THREE.Mesh(new THREE.BoxGeometry(100, 1, 100), new THREE.MeshBasicMaterial({ color: 0 }));
    bottom.position.y = -0.51;
    scene.add(bottom);

    
    const sun = new THREE.Group();
    const sunGizmo = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshBasicMaterial({color: 0xffff99, fog:false}));
    sunGizmo.position.set(0,1000,0);
    sunGizmo.scale.set(10,10,10);
    const sunGizmo2 = sunGizmo.clone();
    sunGizmo2.scale.set(0.3,0.3,0.3);
    sunGizmo2.position.set(5,0,0);
    sunGizmo.add(sunGizmo2);
    sun.add(sunGizmo);

    const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
    sun.add(directionalLight);
    sun.rotation.set(Math.PI/3,0,0);

    // TODO: in space stage add particles for velocity
    // https://github.com/mrdoob/three.js/blob/master/examples/webgl_points_sprites.html

    scene.add(sun);
}

// generate city
// buildings are cubes scaled in width (x) and height (y), then rotated
// FIXME: don't generate city as one lump of buildings; generate a few lumps of buildings (each lump has one angle?)


class Game {
    constructor() {
        this.time = 0;
        this.points = 0;
        
        this.events = [];
        
        this.died = 0;
        this.rescued = 0;
        this.lastScoreTime = 0;
        this.lastScoreSum = 0;

        this.over = false;
    }
    update(dt) {
        if (this.over) return;
        this.time += dt;

        let remain = totalPoints - (this.died + this.rescued);
        if (remain < totalPoints * 0.25) this.over = true;
    }
    score(points) {
        this.points += points;
        if(this.time > this.lastScoreTime + 2 || ((this.lastScoreSum > 0) != (points > 0)) ) {
            this.lastScoreTime = this.time;
            this.lastScoreSum = 0;
        }
        this.lastScoreSum += points;
        let remain = totalPoints - (this.died + this.rescued);
        let percent = ~~(100 * (1 - (this.died + this.rescued) / totalPoints));

        if (this.lastScoreSum < 0) {
            crosshairMessage(`${-this.lastScoreSum} just died\n${remain} (${percent}%) remain`, 2);
            this.died -= points;
        }
        else {
            crosshairMessage(`${this.lastScoreSum} rescued\n${remain} (${percent}%) remain`, 2);
            this.rescued += points;
        }
    }
}



// Gameplay:
// Surface: survive until ships have escaped
//  attacks are from 3 origins, each more rapid than another; 10 second wait between
//  goal: over 50% surviving, ships count
//  at end boss fight?
// Transition: move up through fog
// Space:
//  the same, but fleet of ships and attacks are more vertical and comming from enemy ships
//  destroy all ships to complete
// The end:
//  score how many survived
let enemyOrigin = V3(0, 20, -20);
setInterval(() => {
    let target = V3(RandomNormalDist(25), 0, RandomNormalDist(25))
    fire(V3(RandomNormalDist(1), RandomNormalDist(1), RandomNormalDist(1)).add(enemyOrigin), target, 3); 
}, 3000);

const game = new Game();

class Scorable {
    constructor(points) {
        this.points = points;
    }
    destructor() {
        game.score(this.points);
    }
}

let totalPoints;
function generateCity()
{
    totalPoints = 0;
    let buildings = [];

    const box = new THREE.BoxGeometry();
    const buildingMaterial = new THREE.MeshLambertMaterial( { color: 0x00ff00, emissive: 0xccffcc, opacity: 0.4, transparent: true } );
    let buildingPrefab = new THREE.Mesh(box, buildingMaterial);

    const citySize = 20;
    const size = 0.1;
    let rejected = 0;

    for(let i = 0; i < 10000; i++)
    {
        const height = Random(1,0.2,3);
        const width = Random(size, size);
        const position = V3(RandomNormalDist(citySize), height/2, RandomNormalDist(citySize));
        
        // const building = new Building(, height, width, size);

        // don't collide buildings
        let collides = false;
        for(let b of buildings) {
            let dx = b.x-position.x;
            let dz = b.z-position.z;
            let minRadius = b.r + width;
            if(dx * dx + dz * dz < minRadius * minRadius) {
                collides = true;
                break;
            }
        }

        if(collides) {
            rejected++;
            continue;
        }

        const renderer = new Renderer(buildingPrefab);
        renderer.mesh.scale.set(width, height, size);
        renderer.mesh.rotation.y = Random(PI);

        const points = ~~(1000000 * width*height*size);
        totalPoints += points;
        
        ecs.create().add(
            new Transform(position),
            new Collider(Math.sqrt(width*width/4+size*size/4), height),
            new DestroyOnCollision(),
            new Scorable(-points),
            renderer
            )
            buildings.push({x:position.x, z:position.z, r:width});
    }
    
    // TODO: Building on destruction should leave rubble (grayed out much lower version)
    
    console.log("Total points", totalPoints);
    console.log("Rejected buildings", rejected);
}


const enemyMisslePrefab = new THREE.Group();
{
    const missleMesh = new THREE.ConeGeometry(0.1, 0.3);
    const missle = new THREE.Mesh(missleMesh, new THREE.MeshLambertMaterial( { emissive: 0xff0000 } ));
    missle.rotation.set(22/14,0,0);
    enemyMisslePrefab.add(missle);
}

const turretMisslePrefab = new THREE.Group();
{
    const missleMesh = new THREE.ConeGeometry(0.1, 0.3);
    const missle = new THREE.Mesh(missleMesh, new THREE.MeshLambertMaterial( { emissive: 0x00ffcc } ));
    missle.rotation.set(22/14,0,0);
    turretMisslePrefab.add(missle);
}

const enemyLineMaterial = new THREE.LineBasicMaterial( { color: 0xcc0000 } );
const turretLineMaterial = new THREE.LineBasicMaterial( { color: 0x00cc99 } );

export function fire(start, end, speed) {
    ecs.create().add(
        new Transform(start),
        new Collider(),
        new Projectile(start, end, speed, p => explode(p)),
        new Renderer(enemyMisslePrefab),
        new Trail(enemyLineMaterial, 500),
        new DestroyOnCollision(e => { explode(e.get(Transform).position) })
    );
}

export function fireTurret(end, speed) {
    ecs.create().add(
        new Transform(turretPosition),
        new Collider(),
        new Projectile(turretPosition, end, speed, p => explode(p)),
        new Renderer(turretMisslePrefab),
        new Trail(turretLineMaterial, 500),
        new DestroyOnCollision(e => { explode(e.get(Transform).position) })
    );
}

ecs.register(Explosion, Projectile, Trail, Transform, Renderer, DestroyOnCollision, Collider, Scorable);
ecs.process(
    new ExplosionSystem(ecs), 
    new ProjectileSystem(ecs), 
    new TrailSystem(ecs), 
    new CollisionSystem(ecs), 
    new UpdateRendererPositionsSystem(ecs),
    new DebugCollidersSystem(ecs),
    new DestroyOnCollisionSystem(ecs)
);

// setInterval(() => {
//     // explode(new THREE.Vector3(RandomNormalDist(8),0.5,RandomNormalDist(8)));
//     ecs.create().add(new Projectile(V3(RandomNormalDist(8),Random(8),RandomNormalDist(8)), V3(RandomNormalDist(8),0.5,RandomNormalDist(8)), 1, enemyMisslePrefab));
// }, 2000 );



export const turretPosition = V3(0,1.5,-1);
const turret = new THREE.Group();
scene.add(turret);
const turretMat = new THREE.MeshPhongMaterial( { color: 0x00ff00, emissive: 0x0000cc, specular: 0xffffff } );
{

    const sphere = new THREE.SphereGeometry();
    const box = new THREE.BoxGeometry();
    let base = new THREE.Mesh(sphere, turretMat);
    
    const leftTurret = new THREE.Mesh(box, turretMat);
    leftTurret.position.set(0,0,-2);
    leftTurret.rotation.set(PI/4, 0, 0);
    leftTurret.scale.set(5.2,2,2);
    base.add(leftTurret);
    const rightTurret = leftTurret.clone();
    rightTurret.position.z = 2;
    base.add(rightTurret);
    
    const tail = new THREE.Mesh(box, turretMat);
    tail.position.set(-2,0,0);
    tail.scale.set(3.6,1.2,4);
    base.add(tail);
    
    base.scale.set(0.1,0.1,0.1)
    turret.add(base);
    base.rotation.set(0,-PI/2,0);
}

const crosshair = new THREE.Group();
{
    const cylinder = new THREE.CylinderGeometry();
    const c = new THREE.Mesh(cylinder, turretMat);
    c.scale.set(0.1, 1, 0.1);
    c.rotation.set(0,0,PI/2);
    c.position.set(-1,0,0);
    crosshair.add(c.clone());
    c.position.set(1,0,0);
    crosshair.add(c.clone());
    c.rotation.set(PI/2,0,0);
    c.position.set(0,0,-1);
    crosshair.add(c.clone());
    c.position.set(0,0,1);
    crosshair.add(c);
    crosshair.scale.set(0.1,0.1,0.1);
}




// fire(V3(10,5,3), V3(0,0.5,0));
// setInterval(() => { fire(V3(10,5,3), V3(RandomNormalDist(5), 0, RandomNormalDist(5))); }, 10);
// setInterval(() => { explode(V3(3,RandomNormalDist(5)+2, RandomNormalDist(5))); }, 1);



const cameraGroup = new THREE.Group();
cameraGroup.position.set(0,0,0);
cameraGroup.scale.set(8,8,8);
scene.add(cameraGroup);
cameraGroup.add(camera);


const gripController = new GripController(renderer.xr, crosshair, cameraGroup);
window.gg = gripController;
gripController.select = (position) => { if(!game.over) fireTurret(position, 10); };

// must be added after prefab instantiation
const crosshairCanvases = [];
function crosshairMessage(text, timeout) {
    for(let cc of crosshairCanvases) cc.setText(text, timeout);
}
{
    for(let g of gripController.gizmos) {
        const crosshairCanvas = new TextCanvas();
        const mp = crosshairCanvas.messagePlane;
        const gr = new THREE.Group();
        gr.position.set(0,-0.5,0);
        gr.scale.set(3,3,3);
        mp.rotation.set(-PI/2, 0, 0);
        mp.position.set(0, 0, 0);
        gr.add(mp);
        g.add(gr);
        crosshairCanvases.push(crosshairCanvas);
    }
}

crosshairMessage("press trigger\nto shoot\n\ngrab to move", 100);

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
    // TODO: pause if not presenting

    const dt = clock.getDelta();
    if (renderer.xr.isPresenting || window.nonXrMode) {
        gripController.update(dt);
        window.ecs_stats = ecs.update(dt);
        window.ecs_inst = ecs;
        game.update(dt);
    }

    if (game.over)
        message(`You have saved your city\nfor ${Math.round(game.time*100)/100} seconds.\n\nCongratulations?\n\nRefresh to restart.`);
    
	renderer.render( scene, camera );

    // https://discourse.threejs.org/t/rendering-to-a-2d-canvas-while-xr-is-enabled/13707
    // Re-Render the scene, but this time to the canvas (don't do this on Mobile!)
    if (renderer.xr.isPresenting) {
        renderer.xr.enabled = false;
        let oldFramebuffer = renderer._framebuffer;
        renderer.state.bindXRFramebuffer( null );
        renderer.setRenderTarget( renderer.getRenderTarget() ); // Hack #15830 - Unneeded? Needed.
        renderer.render(scene, camera);
        renderer.xr.enabled = true;
        renderer.state.bindXRFramebuffer(oldFramebuffer);
    }

    const scale = cameraGroup.scale.x;
    scene.fog = new THREE.Fog(0x1d212c, 2/scale, 30/scale);

    // Update turret position/rotation
    {
        let look = V3(), p = V3();
        for (let g of gripController.gizmos) {
            g.getWorldPosition(p);
            look.add(p);
        }
        look.multiplyScalar(0.5);
        turret.lookAt(look);
        turret.position.copy(turretPosition);
    }

    frameNumber++;
} );

setInterval(() => { 
    if (!renderer.xr.isPresenting) return;
    if (gripController.controllerCount > 0) return;
    message("Two working controllers are required for this game", undefined, 1000);
}, 10000);

generateCity();
