import XRButtonLite from "./XRButtonLite.js";
import { camera, renderer } from "./game.js";

XRButtonLite(document.body);

zzfxV = 0.1;

if(THREE.OrbitControls) {
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.minDistance = 1;
    controls.maxDistance = 5;
    controls.target.set(0, 1.7);
    controls.update();
}

camera.position.set(0, 10, 0);
camera.lookAt(0,0,0);
