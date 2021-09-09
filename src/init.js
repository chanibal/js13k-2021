import XRButtonLite from "./XRButtonLite.js";
import { camera, renderer } from "./game.js";
import { zzfx_volume } from "./ZzFX.micro.js";
import * as G from "./game.js";
window.G = G;

try {
    await XRButtonLite(renderer, document.body);
} catch (ex) {
    const popup = document.createElement("div");
    const s = popup.style;
        s.position="absolute";
        s.bottom = s.left = s.right = "5%";
        s.border = "3px double red";
        s.padding = "1em";
        s.color = "red";
        s.backgroundColor = "#000000cc";
    popup.textContent = `ERROR:\n${ex}`;
    document.body.appendChild(popup);
}

zzfx_volume(0.1);

if(THREE.OrbitControls) {
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.minDistance = 1;
    controls.maxDistance = 5;
    controls.target.set(0, 1.7);
    controls.update();
}

camera.position.set(0, 10, 0);
camera.lookAt(0,0,0);


if(true) {
    const popup = document.createElement("pre");
    const s = popup.style;
        s.position="absolute";
        s.top = s.left = "5%";
        s.border = "3px double red";
        s.padding = "1em";
        s.color = "green";
        s.backgroundColor = "#000000cc";
    document.body.appendChild(popup);
    const update = () => { popup.textContent = [renderer.info.memory, renderer.info.render, ecs_stats].map(o => JSON.stringify(o, undefined, "  " )).join("\n"); requestAnimationFrame(update); };
    update();
}