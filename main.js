const renderer = new THREE.WebGLRenderer();
renderer.xr.enabled = true;
renderer.antialias = true;
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

camera.position.set(0, 1.7, 0);
// camera.lookAt(0,0,0);

const controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.minDistance = 1;
controls.maxDistance = 5;
controls.target.set(0, 1.7);
controls.update();

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

renderer.setAnimationLoop( function () {

	renderer.render( scene, camera );

} );

document.body.appendChild( VRButton.createButton( renderer ) );



// https://immersiveweb.dev/#three.js
var geometry = new THREE.CylinderBufferGeometry( 0, 0.05, 0.2, 32 ).rotateX( Math.PI / 2 );

function onSelect() {

    var material = new THREE.MeshPhongMaterial( { color: 0xffffff * Math.random() } );
    var mesh = new THREE.Mesh( geometry, material );
    mesh.position.set( 0, 0, - 0.3 ).applyMatrix4( controller.matrixWorld );
    mesh.quaternion.setFromRotationMatrix( controller.matrixWorld );
    scene.add( mesh );

}

function createController() {
    controller = renderer.xr.getController( 0 );
    controller.addEventListener( 'select', onSelect );
    scene.add( controller );
}
