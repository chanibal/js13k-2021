import { Renderer } from "./Renderer.js";
import { V3, frameNumber } from "./game.js";

// No scale or rotation, apply directly on renderer if needed

export class Transform {
    constructor(position) {
        this.position = position.clone();
        this.delta = V3();
        this.lastMovedInFrame = -1;
    }
    moveBy(delta) {
        this.position.add(delta);
        this.delta = delta;
        this.lastMovedInFrame = frameNumber;
    }
    moveTo(position) {
        this.moveBy(position.clone().sub(this.position));
    }
    hasMoved() {
        return this.lastMovedInFrame == frameNumber;
    }
}

export class UpdateRendererPositionsSystem {
    constructor(ecs) {
        this.updateMeshesSelector = ecs.select(Transform, Renderer);
    }
    update(dt) {
        this.updateMeshesSelector.iterate(entity => {
            let renderer = entity.get(Renderer);
            let transform = entity.get(Transform);
            let m = renderer.mesh;
            m.position.copy(transform.position);
        });
    }
}
