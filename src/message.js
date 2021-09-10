import { V3, camera, scene } from "./game.js";

const plane = new THREE.PlaneGeometry();
const measurementCtx = document.createElement("canvas").getContext("2d");
measurementCtx.font = "20px consolas";


export function message(text, position, timeout = 5000) {
    const w = 400;

    let y;
    let lines = [];
    let lineHeight;
    {
        // https://www.html5canvastutorials.com/tutorials/html5-canvas-wrap-text-tutorial/
        let words = (text + "").split(' ');
        let line = '';

        for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let metrics = measurementCtx.measureText(testLine);
            lineHeight = (y = metrics.fontBoundingBoxAscent) + metrics.fontBoundingBoxDescent;
            if (metrics.width > w && n > 0) {
                lines.push(line.trim());
                line = words[n] + ' ';
            }
            else {
                line = testLine;
            }
        }
        lines.push(line.trim());
    }

    const h = lineHeight * lines.length;

    if (typeof position === "undefined") {
        // TODO: follow
        position = V3(0, 0, 1);
        position.applyQuaternion(camera.quaternion);
        position.y += camera.position.y;
        position.y /= 2;
    }

    const messageCanvas = document.createElement("canvas");
    const ctx = messageCanvas.getContext("2d");
    messageCanvas.width = w;
    messageCanvas.height = h;
    const messageTex = new THREE.CanvasTexture(messageCanvas);
    const mat = new THREE.MeshBasicMaterial({ map: messageTex, transparent: true });
    const messagePlane = new THREE.Mesh(plane, mat);
    messagePlane.position.copy(position);
    messagePlane.scale.set(2, 2 * h/w, 2);
    scene.add(messagePlane);

    ctx.strokeStyle = "#f00";
    ctx.strokeRect(0, 0, w, h);

    ctx.font = measurementCtx.font;
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 5;
    ctx.textAlign = "center";

    for (let line of lines) {
        ctx.strokeText(line, 200, y);
        ctx.fillText(line, 200, y);
        y += lineHeight;
    }


    setTimeout(() => {
        scene.remove(messagePlane);
        mat.dispose();
    }, timeout);

    messagePlane.lookAt(camera.position);
}
