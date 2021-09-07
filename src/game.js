import ecs from "./ecs.m.js";
import * as sounds from "./ZzFX-sounds.js";
import { zzfx } from "./ZzFX.micro.js";
import * as Colliders from "./Collider.m.js";
import { GripController } from "./GripController.js";
import { Trail, TrailSystem } from "./Trail.js";

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
export const V3 = (x,y,z) => new THREE.Vector3(x,y,z);
const PI = Math.PI;
// const Mat = THREE.MeshLambertMaterial;

function Random(scale = 1, base = 0, pow = 1) { 
    return base + Math.pow(Math.random(), pow) * scale; 
}

function RandomNormalDist(scale = 1, base = 0) { 
    let r = Math.random;
    return base + (r()+r()+r()+r()+r()-2.5)/5 * scale; 
}





// Background, fog etc
export const scene = new THREE.Scene();

const gridHelper = new THREE.GridHelper( 100, 100 );
scene.add( gridHelper );
scene.fog = new THREE.Fog(0, 1, 15);
// TODO: add a box geometry just beneath the grid to make domes out of nukes


// generate city
// buildings are cubes scaled in width (x) and height (y), then rotated
// FIXME: don't generate city as one lump of buildings; generate a few lumps of buildings (each lump has one angle?)
const box = new THREE.BoxGeometry();
const buildingMaterial = new THREE.MeshLambertMaterial( { color: 0x00ff00, emissive: 0xccffcc, opacity: 0.4, transparent: true } );

export class Building {
    constructor(x, z, height, width, depth) {
        let mesh = this.mesh = new THREE.Mesh(box, buildingMaterial);
        mesh.position.set(
            x,
            height/2,
            z
        );
        
        mesh.rotation.y = Random(PI);
        mesh.scale.y = height;
        mesh.scale.z = depth;
        mesh.scale.x = width;
        scene.add(mesh);
    }
    destructor()
    {
        scene.remove(this.mesh);
        // zzfx(...sounds.zzfx_explode2);
    }
}

function generateCity()
{
    let buildings = [];

    for(let i = 0; i < 1000; i++)
    {
        const citySize = 20;
        const p = 1;
        
        const size = 0.1;
        const height = Random(1,0.2,3);
        const width = Random(size, size);
        
        const building = new Building(RandomNormalDist(citySize), RandomNormalDist(citySize), height, width, size);

        // don't collide buildings
        let collides = false;
        for(let b of buildings) {
            const s = b.mesh.scale.x;
            if(b.mesh.position.distanceToSquared(building.mesh.position) < s*s) {
                collides = true;
                break;
            }
        }

        if(collides) continue;
        ecs.create().add(building, new Actor(building.mesh.position, null), new Damagable(5, 1));
        buildings.push(building);
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


/**
 * Something that can be damaged, hp is time in fireball proximity that the entity can survive
 */
export class Damagable {
    constructor(hp, radius) {
        this.hp = hp;
        this.radius = radius; // TODO: box/sphere collisions?
    }
}

class DamagableSystem {
    constructor(ecs) {
        this.selector = ecs.select(Damagable);
    }

    update(dt) {
        this.selector.iterate(entity => {
            const damagable = entity.get(Damagable);
            if(damagable.hp < 0) {
                entity.eject();
            }
        })
    }
}


export class Actor {
    constructor(position) {
        this.position = position;
    }
    destructor() {
    }
}


class ActorSystem {
    constructor(ecs) {
        this.selector = ecs.select(Actor);
    }

    update(dt) {
        // this.selector.iterate((entity) => {
        //     const actor = entity.get(Actor);
        //     actor.mesh.position.copy(actor.position);
        // });
    }
}

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
        this.selector = ecs.select(Projectile);
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
class Explosion {
    static prefab = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshLambertMaterial( { emissive: 0xffffff, fog: false } ));
    constructor(position, size) {
        this.position = position;
        this.size = size;
        this.t = 0;

        // Note: reinvented Actor here a bit, this keeps it simpler

        this.mesh = Explosion.prefab.clone();
        this.mesh.position.copy(position);
        this.mesh.scale.set(0,0,0);
        scene.add(this.mesh);

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
        this.selector = ecs.select(Explosion);
        this.damagableActorSelector = ecs.select(Damagable, Actor);
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
            explosion.mesh.scale.set(radius/2,radius/2,radius/2);

            // TODO: some kind of space partitioning
            this.damagableActorSelector.iterate((da) => {
                const damagable = da.get(Damagable);
                const actor = da.get(Actor);

                const md = damagable.radius + radius;
                const d = actor.position.distanceToSquared(explosion.position);
                if( d < md*md )
                {
                    damagable.hp -= 999;
                }
            });
        });
    }
}

function explode(position)
{
    ecs.create().add(new Explosion(position, 1));
}



ecs.register(Explosion, Damagable, Actor, Projectile, Trail, Building);
ecs.process(new ExplosionSystem(ecs), new DamagableSystem(ecs), new ActorSystem(ecs), new ProjectileSystem(ecs), new TrailSystem(ecs));

// setInterval(() => {
//     // explode(new THREE.Vector3(RandomNormalDist(8),0.5,RandomNormalDist(8)));
//     ecs.create().add(new Projectile(V3(RandomNormalDist(8),Random(8),RandomNormalDist(8)), V3(RandomNormalDist(8),0.5,RandomNormalDist(8)), 1, enemyMisslePrefab));
// }, 2000 );


const enemyLineMaterial = new THREE.LineBasicMaterial( { color: 0xcc0000 } );



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
        new Trail(enemyLineMaterial, 500));
}

fire(V3(10,5,3), V3(0,0.5,0));

const cameraGroup = new THREE.Group();
cameraGroup.position.set(0,0,0);
scene.add(cameraGroup);
cameraGroup.add(camera);


const gripController = new GripController(renderer.xr, new THREE.AxesHelper(0.1), cameraGroup);

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    ecs.update(dt);
    gripController.update(dt);
    
	renderer.render( scene, camera );

    // https://discourse.threejs.org/t/rendering-to-a-2d-canvas-while-xr-is-enabled/13707
    // Re-Render the scene, but this time to the canvas (don't do this on Mobile!)
    if (renderer.xr.isPresenting) {
        renderer.xr.enabled = false;
        let oldFramebuffer = renderer._framebuffer;
        renderer.state.bindXRFramebuffer( null );
        renderer.setRenderTarget( renderer.getRenderTarget() ); // Hack #15830 - Unneeded?
        renderer.render(scene, camera);
        renderer.xr.enabled = true;
        renderer.state.bindXRFramebuffer(oldFramebuffer);
    }
} );

generateCity();


// export { camera, renderer, scene }
