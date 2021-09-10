import { Transform } from "./Transform.js";


export class DestroyOnCollision {
    constructor(onDestroy = null) {
        this.onDestroy = onDestroy;
    }
}

export class DestroyOnCollisionSystem {
    constructor(ecs) {
        this.destroyOnCollisionSelector = ecs.select(Transform, DestroyOnCollision);

    }
    update(dt) {
        this.destroyOnCollisionSelector.iterate(entity => {
            if (!entity.get(Transform).collides)
                return;

            let onDestroy = entity.get(DestroyOnCollision).onDestroy;
            if (onDestroy)
                onDestroy(entity);
            entity.eject();
        });
    }
}
