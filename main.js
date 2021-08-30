"use strict";
const renderer = new THREE.WebGLRenderer();
renderer.xr.enabled = true;
renderer.antialias = true;
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

camera.position.set(0, 1.7, 0);
// camera.lookAt(0,0,0);



const buildingMaterial = new THREE.MeshLambertMaterial( { color: 0x00ff00, emissive: 0xccffcc, opacity: 0.4, transparent: false } );

const gridHelper = new THREE.GridHelper( 100, 100 );
scene.add( gridHelper );

scene.fog = new THREE.Fog(0, 1, 15);

const PI = Math.PI;

function Random(scale = 1, base = 0, pow = 1) { 
    return base + Math.pow(Math.random(), pow) * scale; 
}

// FIXME
function RandomCos(scale = 1, base = 0, pow = 1) { 
    return base + (Math.cos((Math.random() - 0.5) * 3.14)) * scale; 
}


// generate city
// buildings are cubes scaled in width (x) and height (y), then rotated
const buildings = [];
const box = new THREE.BoxGeometry();

for(let i = 0; i < 5000; i++)
{
    const citySize = 20;
    const p = 1;
    
    const size = 0.1;
    const height = Random(1,0.2,3);
    const building = new THREE.Mesh(box, buildingMaterial);
    building.position.set(
        Random(citySize, -citySize/2),
        height/2,
        Random(citySize, -citySize/2),
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


const nukeMaterial = new THREE.MeshLambertMaterial( { emissive: 0xffffff, fog: false } );
const sphere = new THREE.SphereGeometry();
const nukeSize = 1;

const nuke = new THREE.Mesh(sphere, nukeMaterial);
nuke.scale.set(nukeSize, nukeSize, nukeSize)
nuke.position.set(5,3,1);
scene.add(nuke);

const halfSphere = new THREE.SphereGeometry(1,32,16,0,2*Math.PI,0,Math.PI/2);
const nuke2 = new THREE.Mesh(halfSphere, nukeMaterial);
nuke2.scale.set(nukeSize, nukeSize, nukeSize)
nuke2.position.set(1,0,5);



scene.add(nuke2);

// const nukeBlastwave = new THREE.Mesh(sphere, nukeMaterial);
// nukeBlastwave.scale.set(3,0.1,3);
// nuke.add(nukeBlastwave);

const enemyMaterial = new THREE.MeshLambertMaterial( { emissive: 0xff0000 } );
const missleMesh = new THREE.ConeGeometry(0.1, 0.3);
// const missleMesh = new THREE.CylinderGeometry(0, 0.1, 0.3);
const missle = new THREE.Mesh(missleMesh, enemyMaterial);
missle.position.set(1,2,1);
missle.rotation.x = Math.PI;
// missle.lookAt(2,4,2);
scene.add(missle);

const enemyLineMaterial = new THREE.LineBasicMaterial( { color: 0xcc0000} );
const points = [];
points.push( new THREE.Vector3(1,2,1) );
points.push( new THREE.Vector3(3,6,3) );
points.push( new THREE.Vector3(6,10,6) );
points.push( new THREE.Vector3(16,10,16) );
const missleGeometry = new THREE.BufferGeometry().setFromPoints(points);
const missleLine = new THREE.Line(missleGeometry, enemyLineMaterial);
scene.add(missleLine);


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


function fire(v3) {
    const projectile = new THREE.AxesHelper(0.1);
    projectile.position.copy(v3);
    scene.add(projectile);
    setTimeout(() => { scene.remove(projectile); }, 1000);
    // TODO
}

const controller0 = renderer.xr.getControllerGrip(0);
const controller1 = renderer.xr.getControllerGrip(1);
controller0.addEventListener("select", (ev) => { fire(controller0.position) });
controller1.addEventListener("select", (ev) => { fire(controller1.position) });

const controllerHelper0 = new THREE.AxesHelper(0.1);
const controllerHelper1 = new THREE.AxesHelper(0.1);
scene.add(controllerHelper0);
scene.add(controllerHelper1);

renderer.setAnimationLoop(() => {
    controllerHelper0.position.copy(controller0.position);
    controllerHelper1.position.copy(controller1.position);
	renderer.render( scene, camera );

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

