import ecs from "./ecs.m.js";
import * as sounds from "./ZzFX-sounds.js";
import { zzfx } from "./ZzFX.micro.js";

export const renderer = new THREE.WebGLRenderer();
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

// Aliases to popular types:
const V3 = (x,y,z) => new THREE.Vector3(x,y,z);
const Mat = THREE.MeshLambertMaterial;

renderer.xr.enabled = true;
renderer.antialias = true;

function onWindowResize() {
    renderer.setPixelRatio( window.devicePixelRatio );
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}
addEventListener( 'resize', onWindowResize);
onWindowResize();

document.body.appendChild( renderer.domElement );



camera.position.set(0, 1.7, 0);
camera.lookAt(-5,-3,-1);



function Random(scale = 1, base = 0, pow = 1) { 
    return base + Math.pow(Math.random(), pow) * scale; 
}

// FIXME
function RandomNormalDist(scale = 1, base = 0) { 
    let r = Math.random;
    return base + (r()+r()+r()+r()+r()-2.5)/5 * scale; 
}

const PI = Math.PI;




// Background, fog etc
const gridHelper = new THREE.GridHelper( 100, 100 );
scene.add( gridHelper );
// scene.fog = new THREE.Fog(0, 1, 15);
// TODO: add a box geometry just beneath the grid to make domes out of nukes


// generate city
// buildings are cubes scaled in width (x) and height (y), then rotated
// FIXME: don't generate city as one lump of buildings; generate a few lumps of buildings (each lump has one angle?)
const buildings = [];
const box = new THREE.BoxGeometry();
const buildingMaterial = new THREE.MeshLambertMaterial( { color: 0x00ff00, emissive: 0xccffcc, opacity: 0.4, transparent: true } );

for(let i = 0; i < 1000; i++)
{
    const citySize = 20;
    const p = 1;
    
    const size = 0.1;
    const height = Random(1,0.2,3);
    const building = new THREE.Mesh(box, buildingMaterial);
    building.position.set(
        RandomNormalDist(citySize),
        height/2,
        RandomNormalDist(citySize),
    );

    // don't collide buildings
    let collides = false;
    for(let b of buildings) {
        const s = b.scale.x;
        if(b.position.distanceToSquared(building.position) < s*s) {
            collides = true;
            break;
        }
    }

    if(collides) continue;

    building.rotation.y = Random(PI);
    building.scale.y = height;
    building.scale.z = size;
    building.scale.x = Random(size, size);
    buildings.push(building);
    scene.add(building);
}



/**
 * Something that can be damaged, hp is time in fireball proximity that the entity can survive
 */
class Damagable {
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
            if(damagable.hp < 0) entity.eject();
        })
    }
}


class Actor {
    constructor(position, meshPrefab) {
        this.mesh = meshPrefab.clone(); 
        this.position = position;

        this.mesh.position.copy(position);
        scene.add(this.mesh);
    }
    destructor() {
        scene.remove(this.mesh);
        zzfx(...sounds.zzfx_explode2);
    }
}


class ActorSystem {
    constructor(ecs) {
        this.selector = ecs.select(Actor);
    }

    update(dt) {
        this.selector.iterate((entity) => {
            const actor = entity.get(Actor);
            actor.mesh.position.copy(actor.position);
        });
    }
}

// TODO: Trail fade out

export class Trail {
    constructor(material, maxPoints = 500) {
        const g = this.geometry = new THREE.BufferGeometry();
        const p = this.position = new Float32Array(maxPoints * 3);
        this.count = 0;
        this.geometry.setAttribute("position", new THREE.BufferAttribute(p, 3));
        scene.add(this.mesh = new THREE.Line(this.geometry, material));
        // TODO: ensure trail has projectile
    }
    destructor() {
        scene.remove(this.mesh);
    }
}

class TrailSystem {
    constructor(ecs) {
        this.selector = ecs.select(Trail, Projectile);
    }
    update(dt) {
        this.selector.iterate((entity) => {
            const trail = entity.get(Trail);
            const projectile = entity.get(Projectile);

            const pp = projectile.position;
            const tp = trail.position;
            let c = trail.count;

            // optimization: don't draw more points if angle is not that different
            // http://paulbourke.net/geometry/pointlineplane/source.c ?
            if (c >= 6) {
                const a = V3(tp[c-6], tp[c-5], tp[c-4]);
                const b = V3(tp[c-3], tp[c-2], tp[c-1]);
                // debugger;
                const l = new THREE.Line3(a, pp);
                const d = V3();
                l.closestPointToPoint(b, true, d);
                const deviation = d.distanceTo(b);
                const len = l.distance();
                if(deviation/len < 0.01) {
                    // console.log("Saved a point", deviation, c);
                    c -= 3;
                }
            }

            if(c > tp.length) return;
            tp[c++] = pp.x;
            tp[c++] = pp.y;
            tp[c++] = pp.z;
            trail.count = c;

            trail.geometry.setDrawRange(0, c/3);
            trail.mesh.geometry.attributes.position.needsUpdate = true
        });
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
        this.start = start;
        this.position = start;
        this.destination = destination;
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

window.ecs = ecs;


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
                    damagable.hp -= dt;
                }
            });
        });
    }
}

function explode(position)
{
    ecs.create().add(new Explosion(position, 1));
}



ecs.register(Explosion, Damagable, Actor, Projectile, Trail);
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

function fire(start, end) {
    ecs.create().add(
        new Projectile(start, end, 1, enemyMisslePrefab),
        new Trail(enemyLineMaterial, 500));
}

fire(V3(10,5,3), V3(0,0.5,0));

const controller0 = renderer.xr.getControllerGrip(0);
const controller1 = renderer.xr.getControllerGrip(1);
controller0.addEventListener("select", (ev) => { fire(V3(0,0,0), controller0.position) });
controller1.addEventListener("select", (ev) => { fire(V3(0,0,0), controller1.position) });

const controllerHelper0 = new THREE.AxesHelper(0.1);
const controllerHelper1 = new THREE.AxesHelper(0.1);
scene.add(controllerHelper0);
scene.add(controllerHelper1);

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
    controllerHelper0.position.copy(controller0.position);
    controllerHelper0.rotation.copy(controller0.rotation);
    controllerHelper1.position.copy(controller1.position);
    controllerHelper1.rotation.copy(controller1.rotation);
	renderer.render( scene, camera );

    ecs.update(clock.getDelta());

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


// export { camera, renderer, scene }
