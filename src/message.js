import { V3, camera, scene, renderer } from "./game.js";

const plane = new THREE.PlaneGeometry();
const measurementCtx = document.createElement("canvas").getContext("2d");
measurementCtx.font = "20px consolas";

const w = 400;

let startY, lineHeight;

function wrapText(text) {
    let lines = [];
    for (let t of text.split("\n"))
    {
        // https://www.html5canvastutorials.com/tutorials/html5-canvas-wrap-text-tutorial/
        let words = (t + "").split(' ');
        let line = '';

        for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let metrics = measurementCtx.measureText(testLine);
            lineHeight = (startY = metrics.fontBoundingBoxAscent) + metrics.fontBoundingBoxDescent;
            if ((metrics.width > w && n > 0)) {
                lines.push(line.trim());
                line = words[n] + ' ';
            }
            else {
                line = testLine;
            }
        }
        lines.push(line.trim());
    }
    return lines;
}


export class TextCanvas {
    constructor(w = 400, ) {
        this.w = w;
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");
        this.canvas.height = this.canvas.width = this.w;
        this.messageTex = new THREE.CanvasTexture(this.canvas);
        this.mat = new THREE.MeshBasicMaterial({ map:this. messageTex, transparent: true });
        this.messagePlane = new THREE.Mesh(plane, this.mat);
        this.timeoutId = null;
        this.lastText = null;
    }
    setText(text, timeout = 5000) {
        let messagePlane = this.messagePlane;

        if (text != this.lastText) {
            let lines = wrapText(text);
            const h = lineHeight * lines.length;
            
            if (this.canvas.height != h) {
                this.canvas.height = h;
                messagePlane.scale.set(1, h/this.w, 1);
            }

            let ctx = this.ctx;
            ctx.clearRect(0, 0, this.w, h);
            ctx.font = measurementCtx.font;
            ctx.fillStyle = "#fff";
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 5;
            ctx.textAlign = "center";

            let y = startY;
            for (let line of lines) {
                ctx.strokeText(line, 200, y);
                ctx.fillText(line, 200, y);
                y += lineHeight;
            }
            this.messageTex.needsUpdate = true;
            this.lastText = text;
        }

        this.messagePlane.visible = true;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        if (timeout > 0)  {
            this.timeoutId = setTimeout(() => messagePlane.visible = false, timeout * 1000);
        }
    }
}


const tc = new TextCanvas();

export function message(text, timeout = 5) {
    tc.setText(text, timeout);
    tc.messagePlane.position.set(0,0,-1);
    camera.add(tc.messagePlane);
}

// let messageCanvas, messagePlane, ctx, mat, messageTex, timeoutId;

// export function message2(text, timeout = 500) {

//     if (!messageCanvas) {
//         messageCanvas = document.createElement("canvas");
//         ctx = messageCanvas.getContext("2d");
//         messageCanvas.height = messageCanvas.width = w;
//         messageTex = new THREE.CanvasTexture(messageCanvas);
//         mat = new THREE.MeshBasicMaterial({ map: messageTex, transparent: true, fog:false });
//         messagePlane = new THREE.Mesh(plane, mat);
//         messagePlane.position.set(0,0,-0.5);
//         camera.add(messagePlane);
//     }

//     let lines = wrapText(text);
//     const h = lineHeight * lines.length;

    
//     if (messageCanvas.height != h) {
//         messageCanvas.height = h;
//         messagePlane.scale.set(1, h/w, 1);
//     }

//     ctx.clearRect(0, 0, w, h);
//     ctx.font = measurementCtx.font;
//     ctx.fillStyle = "#fff";
//     ctx.strokeStyle = "#000";
//     ctx.lineWidth = 5;
//     ctx.textAlign = "center";


//     let y = startY;
//     for (let line of lines) {
//         ctx.strokeText(line, 200, y);
//         ctx.fillText(line, 200, y);
//         y += lineHeight;
//     }
//     messageTex.needsUpdate = true;
//     messagePlane.visible = true;

//     console.log("MESSAGE", text, "AT", messagePlane.position);

//     clearTimeout(timeoutId);
//     if(timeout > 0)  {
//         timeoutId = setTimeout(() => messagePlane.visible = false, timeout);
//     }
// }

window.message = message;