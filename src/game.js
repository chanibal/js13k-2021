import ecs from "./ecs.m.js";
import * as sounds from "./ZzFX-sounds.js";
import { zzfx } from "./ZzFX.micro.js";
import * as Colliders from "./Collider.m.js";
import { GripController } from "./GripController.js";
import { Trail, TrailSystem } from "./Trail.js";


// Basic parts of engine
let frameNumber = 0;

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
const Mat = THREE.MeshLambertMaterial;

function Random(scale = 1, base = 0, pow = 1) { 
    return base + Math.pow(Math.random(), pow) * scale; 
}

function RandomNormalDist(scale = 1, base = 0) { 
    let r = Math.random;
    return base + (r()+r()+r()+r()+r()-2.5)/5 * scale; 
}


// Background, scene, fog etc.
export const scene = new THREE.Scene();

const gridHelper = new THREE.GridHelper( 100, 100 );
scene.add( gridHelper );
scene.fog = new THREE.Fog(0, 1, 15);
const bottom = new THREE.Mesh(new THREE.BoxGeometry(100, 1, 100), new THREE.MeshBasicMaterial({ color: 0 }));
bottom.position.y = -0.51;
scene.add(bottom);
// TODO: add a box geometry just beneath the grid to make domes out of nukes?


// generate city
// buildings are cubes scaled in width (x) and height (y), then rotated
// FIXME: don't generate city as one lump of buildings; generate a few lumps of buildings (each lump has one angle?)

// export class Building {
//     constructor(x, z, height, width, depth) {
//         let mesh = this.mesh = new THREE.Mesh(box, buildingMaterial);
//         mesh.position.set(
//             x,
//             height/2,
//             z
//         );
        
//         mesh.rotation.y = Random(PI);
//         mesh.scale.y = height;
//         mesh.scale.z = depth;
//         mesh.scale.x = width;
//         scene.add(mesh);
//     }
//     destructor()
//     {
//         scene.remove(this.mesh);
//         // zzfx(...sounds.zzfx_explode2);
//     }
// }

function generateCity()
{
    let buildings = [];

    const box = new THREE.BoxGeometry();
    const buildingMaterial = new THREE.MeshLambertMaterial( { color: 0x00ff00, emissive: 0xccffcc, opacity: 0.4, transparent: true } );
    let buildingPrefab = new THREE.Mesh(box, buildingMaterial);

    const citySize = 5; // 20;
    const size = 0.1;
    let rejected = 0;

    for(let i = 0; i < 100 /*1000*/; i++)
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

        ecs.create().add(
            new Transform(position, {r:width}),
            new DestroyOnCollision(),
            renderer
        )
        buildings.push({x:position.x, z:position.z, r:width});
    }

    console.log("Rejected buildings", rejected);
}



export class Renderer {
    constructor(prefab) {
        scene.add(this.mesh = prefab.clone());
    }
    destructor() {
        scene.remove(this.mesh);
    }
}

// No scale or rotation, apply directly on renderer if needed
export class Transform {
    constructor(position, collider = null) {
        this.position = position;
        this.collider = collider;
        this.collision = null;
        this.delta = V3();
        this.lastMovedInFrame = -1;
    }
    moveBy(delta) {
        this.position.add(delta);
        this.delta = delta;
        this.lastMovedInFrame = frameNumber;
    }
    moveTo(position) {
        this.moveBy(position.clone().sub(this.position));
    }
    hasMoved() {
        return this.lastMovedInFrame == frameNumber;
    }
}

// class Collider {
//     constructor(r) { this.r = r; }
// }

export class DestroyOnCollision {}

export class MovementAndCollisionsSystem {
    constructor(ecs) {
        this.updateMeshesSelector = ecs.select(Transform, Renderer);
        this.updateCollisionsSelector = ecs.select(Transform);
        this.destroyOnCollisionSelector = ecs.select(Transform, DestroyOnCollision)
    }
    update(dt) {
        this.updateMeshesSelector.iterate(entity => {
            let renderer = entity.get(Renderer);
            let transform = entity.get(Transform);
            let m = renderer.mesh;
            m.position.copy(transform.position);
        });

        // Supported collider types:
        // {} - point
        // {r:float} - circle
        // {r:float, h:float} - vertical capsule

        // TODO: Broad phase

        // Narrow phase
        this.updateCollisionsSelector.iterate(entityA => {
            this.updateCollisionsSelector.iterate(entityB => {
                if(entityA === entityB) return;
                let a = entityA.get(Transform);
                let b = entityB.get(Transform);
                if (!a.collider || !b.collider) return;
                let distanceSqr = a.position.distanceToSquared(b.position);
                let minDistToCollide = (a.collider.r || 0) + (b.collider.r || 0);
                // TODO: vertical capsule collisions
                if(distanceSqr < minDistToCollide * minDistToCollide) {
                    a.collides = b;
                    b.collides = a;
                    // FIXME: clear collisions
                    // console.log("Collision:",a,b);
                }
            });
        });

        this.destroyOnCollisionSelector.iterate(entity => {
            if(entity.get(Transform).collides) entity.eject();
        });
    }
}


export class DebugCollidersSystem {
    constructor(ecs) {
        this.selector = ecs.select(Transform);
        this.helpers = [];
        this.mat = new THREE.MeshBasicMaterial({wireframe:true, color:0xff00ff})
    }
    update(dt) {
        for(let h of this.helpers) scene.remove(h);
        this.selector.iterate(entity => {
            let t = entity.get(Transform);
            if (!t.collider) return;

            let helper;
            if (t.collider.r) {
                helper = new THREE.Mesh(new THREE.SphereGeometry(1,8,4), this.mat);
                helper.scale.set(t.collider.r, t.collider.r, t.collider.r);
            }
            else {
                helper = new THREE.AxesHelper(0.1);
            }

            helper.position.copy(t.position);
            scene.add(helper);
            this.helpers.push(helper);
        })
    }
}


/***
 * ECS Classes:
 * - Explosion - has radius, destroys every Damagable it touches
 * - Damagable - Explosion destroys it, requires another trait for shape; has points. Action on death?
 * - Collidable - Can collide with something, has shape (cylinder, point, sphere)
 * - Projectile - Has trajectory
 * 
 */




const enemyMisslePrefab = new THREE.Group();
{
    const missleMesh = new THREE.ConeGeometry(0.1, 0.3);
    const missle = new THREE.Mesh(missleMesh, new THREE.MeshLambertMaterial( { emissive: 0xff0000 } ));
    missle.rotation.set(22/14,0,0);
    enemyMisslePrefab.add(missle);
}

export class Projectile {
    constructor(start, destination, speed, prefab) {
        // FIXME: don't double Actor
        this.start = start.clone();
        this.position = start.clone();
        this.destination = destination.clone();
        this.speed = speed;
        this.mesh = prefab.clone();
        this.mesh.position.copy(start);
        scene.add(this.mesh);

        const h = new THREE.AxesHelper(0.3);
        h.position.copy(start);
        scene.add(h);

        window.m = this.mesh;
    }
    destructor() {
        scene.remove(this.mesh);
    }
}

class ProjectileSystem {
    constructor(ecs) {
        this.selector = ecs.select(Projectile, Transform);
    }

    update(dt) {
        this.selector.iterate((entity) => {
            const projectile = entity.get(Projectile);
            // TODO: simple line from-to, maybe a bezier?
            const dir = projectile.destination.clone().sub(projectile.position);
            const move = dt * projectile.speed;
            if (move > dir.length()) {  // lengthSq is faster, but a few bytes larger
                entity.eject();
                explode(projectile.destination);
                return;
            }
            dir.normalize();
            dir.multiplyScalar(move);
            // console.log("projectile", projectile.position, dir);
            dir.add(projectile.position);
            projectile.mesh.lookAt(dir);
            projectile.mesh.position.copy(dir);
            projectile.position.copy(dir);
        });
    }
}

/**
 * Fireball that damages Damagable instances
 * It grows and collapses in set time, does not move
 */
export class Explosion {
    constructor(size) {
        this.size = size;
        this.t = 0;
        zzfx(...sounds.zzfx_explode);
        // TODO: if explosion at ground, do a torus as shockwave
    }

    destructor() {
        scene.remove(this.mesh);
    }
}

/**
 * Handles Explosion objects
 */
class ExplosionSystem {
    constructor(ecs) {
        this.selector = ecs.select(Explosion, Transform, Renderer);
    }

    update(dt) {
        this.selector.iterate((entity) => {
            const scale = 0.5;
            const explosion = entity.get(Explosion);
            explosion.t += dt * scale;

            if (explosion.t > 1) { 
                entity.eject();
                return;
            }
            
            let radius = Math.sin(22/7 * explosion.t) * explosion.size;
            entity.get(Transform).collider.r = radius;
            entity.get(Renderer).mesh.scale.set(radius,radius,radius);
        });
    }
}

const explosionPrefab = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshLambertMaterial( { emissive: 0xffffff, fog: false } ));
explosionPrefab.scale.set(0,0,0);


export function explode(position)
{
    ecs.create().add(new Explosion(0.5), new Transform(position, {r:0}), new Renderer(explosionPrefab));
}



ecs.register(Explosion, Projectile, Trail, Transform, Renderer, DestroyOnCollision);
ecs.process(new ExplosionSystem(ecs), new ProjectileSystem(ecs), new TrailSystem(ecs), new MovementAndCollisionsSystem(ecs), new DebugCollidersSystem(ecs));


const enemyLineMaterial = new THREE.LineBasicMaterial( { color: 0xcc0000 } );



// setInterval(() => {
//     // explode(new THREE.Vector3(RandomNormalDist(8),0.5,RandomNormalDist(8)));
//     ecs.create().add(new Projectile(V3(RandomNormalDist(8),Random(8),RandomNormalDist(8)), V3(RandomNormalDist(8),0.5,RandomNormalDist(8)), 1, enemyMisslePrefab));
// }, 2000 );


/*
// https://immersiveweb.dev/#three.js
var geometry = new THREE.CylinderBufferGeometry( 0, 0.05, 0.2, 32 ).rotateX( Math.PI / 2 );

const messageCanvas = document.createElement("canvas");
messageCanvas.height = messageCanvas.width = 400;
const messageTex = new THREE.CanvasTexture(messageCanvas);
const plane = new THREE.PlaneGeometry();
const mat = new THREE.Material

const ah = new THREE.AxesHelper(1);
scene.add(ah);

function message(msg) {
    const ctx = messageCanvas.getContext("2d");
    ctx.font = '48px serif';
    ctx.fillText(msg, 10, 50);
    messageTex.needsUpdate = true;
    const forward = new THREE.Vector3(0,0,-5);
    forward.applyMatrix4(renderer.xr.getCamera().matrix);
    ah.position.set(forward);
    // scene.add(new THREE.Mesh(plane, ))
}


setInterval(() => { message(+new Date()) }, 1000);
*/

export const turret = V3(0,0,0);

export function fire(start, end) {
    ecs.create().add(
        new Projectile(start, end, 10, enemyMisslePrefab),
        new Transform(start, {}),
        new Trail(enemyLineMaterial, 500));
}

fire(V3(10,5,3), V3(0,0.5,0));
setInterval(() => { fire(V3(10,5,3), V3(RandomNormalDist(5), 0, RandomNormalDist(5))); }, 1000);

const cameraGroup = new THREE.Group();
cameraGroup.position.set(0,0,0);
scene.add(cameraGroup);
cameraGroup.add(camera);


const gripController = new GripController(renderer.xr, new THREE.AxesHelper(0.1), cameraGroup);

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    gripController.update(dt);
    ecs.update(dt);
    
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

    frameNumber++;
} );

generateCity();


// export { camera, renderer, scene }
