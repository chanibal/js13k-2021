import ecs from "./ecs.m.js";
import { Trail, TrailSystem } from "./Trail.js";
import { DebugCollidersSystem } from "./DebugCollidersSystem.js";
import { Renderer } from "./Renderer.js";
import { Projectile, ProjectileSystem } from "./Projectile.js";
import { explode, Explosion, ExplosionSystem } from "./Explosion.js";
import { Transform, UpdateRendererPositionsSystem } from "./Transform.js";
import { Collider, CollisionSystem, DestroyOnCollisionSystem, DestroyOnCollision } from "./Collisions.js";
import { GripController } from "./GripController.js";
import { message } from "./message.js";


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
const Mat = THREE.MeshLambertMaterial;

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
    scene.add( gridHelper );
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

    const citySize = 20;
    const size = 0.1;
    let rejected = 0;

    for(let i = 0; i < 10000 /*1000*/; i++)
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

        ecs.create().add(
            new Transform(position),
            new Collider(Math.sqrt(width*width/4+size*size/4), height),
            new DestroyOnCollision(),
            renderer
        )
        buildings.push({x:position.x, z:position.z, r:width});
    }

    // TODO: Building on destruction should leave rubble (grayed out much lower version)

    console.log("Rejected buildings", rejected);
}



const enemyMisslePrefab = new THREE.Group();
{
    const missleMesh = new THREE.ConeGeometry(0.1, 0.3);
    const missle = new THREE.Mesh(missleMesh, new THREE.MeshLambertMaterial( { emissive: 0xff0000 } ));
    missle.rotation.set(22/14,0,0);
    enemyMisslePrefab.add(missle);
}

const enemyLineMaterial = new THREE.LineBasicMaterial( { color: 0xcc0000 } );

export function fire(start, end, speed) {
    if(!speed ) throw "";
    ecs.create().add(
        new Transform(start),
        new Collider(),
        new Projectile(start, end, speed),
        new Renderer(enemyMisslePrefab),
        new Trail(enemyLineMaterial, 500),
        new DestroyOnCollision(e => { explode(e.get(Transform).position) })
    );
}

ecs.register(Explosion, Projectile, Trail, Transform, Renderer, DestroyOnCollision, Collider);
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

{
    const turretMat = new THREE.MeshPhongMaterial( { color: 0x00ff00, emissive: 0x0000cc, specular: 0xffffff } );

    const sphere = new THREE.SphereGeometry();
    const box = new THREE.BoxGeometry();
    const cylinder = new THREE.CylinderGeometry();
    const base = new THREE.Mesh(sphere, turretMat);
    base.position.copy(turretPosition);

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
    scene.add(base);
}




// fire(V3(10,5,3), V3(0,0.5,0));
// setInterval(() => { fire(V3(10,5,3), V3(RandomNormalDist(5), 0, RandomNormalDist(5))); }, 10);
// setInterval(() => { explode(V3(3,RandomNormalDist(5)+2, RandomNormalDist(5))); }, 1);


setInterval(() => { fire(V3(-5,0.5,0), V3(5,0.5,0), 3); }, 3000);


const cameraGroup = new THREE.Group();
cameraGroup.position.set(0,0,0);
scene.add(cameraGroup);
cameraGroup.add(camera);


const gripController = new GripController(renderer.xr, new THREE.AxesHelper(0.1), cameraGroup);

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    gripController.update(dt);
    window.ecs_stats = ecs.update(dt);
    window.ecs_inst = ecs;
    
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

setInterval(() => { 
    if (gripController.controllerCount > 0) return;
    message("Two working controllers are required for this game", undefined, 1000);
}, 1000);


generateCity();


// export { camera, renderer, scene }
