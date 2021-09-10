import { scene, fire, turretPosition } from "./game.js";

export class GripController {
    constructor(rendererXr, prefab, cameraGroup) {
        this.controllers = [
            rendererXr.getControllerGrip(0),
            rendererXr.getControllerGrip(1)
        ];
        this.gizmos = [
            prefab.clone(),
            prefab.clone()
        ];
        for (let g of this.gizmos)
            scene.add(g);
        for (let c of this.controllers) {
            c.addEventListener("select", (ev) => fire(turretPosition, c.position));
            c.addEventListener("squeezestart", () => this.squeezestart(c));
            c.addEventListener("squeezeend", () => this.squeezeend(c));
        }
        this.cameraGroup = cameraGroup;
    }
    update(dt) {
        for (let i = 0; i < 2; i++) {
            let g = this.gizmos[i];
            let c = this.controllers[i];
            g.position.copy(c.position);
            g.rotation.copy(c.rotation);
        }

        if (this.dragOrigin) {
            const scale = 5;
            let diff = this.dragOrigin.clone().sub(this.dragController.position);
            diff.y = 0;
            diff.multiplyScalar(5);
            diff.add(this.camOrigin);
            this.cameraGroup.position.copy(diff);
        }

        if (this.controllerDiffStart) {
            const diff = this.controllers[0].position.distanceTo(this.controllers[1].position);
            const ratio = diff / this.controllerDiffStart;
            this.cameraGroup.scale.copy(this.camStartScale);
            this.cameraGroup.scale.multiplyScalar(ratio);
            console.log("ratio", ratio);
        }

        this.controllerCount = this.controllers[0].visible + this.controllers[1].visible;
    }
    squeezestart(c) {
        // Start single hand gesture
        if (!this.dragOrigin) {
            this.dragOrigin = c.position.clone();
            this.dragController = c;
            this.camOrigin = this.cameraGroup.position.clone();
        }

        // Start two hand gesture
        else {
            this.squeezeend();
            this.controllerDiffStart = this.controllers[0].position.distanceTo(this.controllers[1].position);
            this.camStartScale = this.cameraGroup.scale.clone();
        }
    }
    squeezeend(c) {
        delete this.dragOrigin;
        delete this.controllerDiffStart;
    }
}
