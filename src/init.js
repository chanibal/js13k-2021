import XRButtonLite from "./XRButtonLite.js";
import { zzfx_volume } from "./ZzFX.micro.js";
zzfx_volume(0.1);

window.stats = {};


import { camera, renderer } from "./game.js";
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


if(THREE.OrbitControls) {
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.minDistance = 1;
    controls.maxDistance = 5;
    controls.target.set(0, 1.7);
    controls.update();
}

camera.position.set(0, 7, -5);
camera.lookAt(0,0,0);


if(true) {
    const popup = document.createElement("div");
    const s = popup.style;
    s.position="absolute";
    s.top = s.left = "5%";
    s.padding = "1em";
    s.color = "green";
    document.body.appendChild(popup);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.addEventListener("change", () => { window.enableDebugCollidersSystem = checkbox.checked; });
    popup.appendChild(checkbox);
    popup.appendChild(document.createTextNode("Collider debug"));

    const pre = document.createElement("pre");
    popup.appendChild(pre);

    let ecs_stats_local = {};
    setInterval(() => {
        if (window.ecs_stats) for(let s of Object.keys(window.ecs_stats)) ecs_stats_local[s] = Math.round(ecs_stats[s] * 1000);
        pre.textContent = [renderer.info.memory, renderer.info.render, ecs_stats_local, window.stats].map(o => JSON.stringify(o, undefined, "  " )).join("\n");
    }, 100);
}