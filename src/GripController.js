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
        this.select = (p,c) => {};
        for (let i = 0; i < 2; i++)
        {
            cameraGroup.add(this.gizmos[i]);
            let c = this.controllers[i];
            c.addEventListener("select", (ev) => { 
                let p = new THREE.Vector3();
                this.gizmos[i].getWorldPosition(p);
                this.select(p, c);
            });
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

        // Two hand gesture        
        if (this.controllerDiffStart) {
            const diff = this.controllers[0].position.distanceTo(this.controllers[1].position);
            const ratio = this.controllerDiffStart/diff;
            this.cameraGroup.scale.copy(this.camStartScale);
            this.cameraGroup.scale.multiplyScalar(ratio);
            this.cameraGroup.position.copy(this.camOrigin);
            this.cameraGroup.position.multiplyScalar(ratio);
            // this.cameraGroup.position.multiplyScalar(ratio);
            console.log("ratio", ratio);
        }
        // Single hand gesture
        else if (this.dragOrigin) {
            const scale = 5 * this.cameraGroup.scale.x;
            let diff = this.dragOrigin.clone().sub(this.dragController.position);
            diff.y = 0;
            diff.multiplyScalar(scale);
            diff.add(this.camOrigin);
            this.cameraGroup.position.copy(diff);
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
            this.controllerDiffStart = this.controllers[0].position.distanceTo(this.controllers[1].position);
            this.camStartScale = this.cameraGroup.scale.clone();
            this.camOrigin = this.cameraGroup.position.clone();
        }
    }
    squeezeend(c) {
        delete this.dragOrigin;
        delete this.controllerDiffStart;
    }
}
