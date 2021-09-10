import { Renderer } from "./Renderer.js";
import { V3, frameNumber } from "./game.js";

// No scale or rotation, apply directly on renderer if needed

export class Transform {
    constructor(position, collider = null) {
        this.position = position;
        this.collider = collider;
        this.collision = null;
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

export class CollisionsSystem {
    constructor(ecs) {
        this.updateCollisionsSelector = ecs.select(Transform);
    }
    update(dt) {
        // Supported collider types:
        // {} - point
        // {r:float} - circle
        // {r:float, h:float} - vertical capsule
        // TODO: Broad phase
        // Narrow phase
        // FIXME: clear collisions
        // console.log("Collision:",a,b);
        this.updateCollisionsSelector.iterate(entityA => {
            // FIXME: no NxN collisions, just half

            this.updateCollisionsSelector.iterate(entityB => {
                if (entityA === entityB)
                    return;
                let a = entityA.get(Transform);
                let b = entityB.get(Transform);

                // assure that center of a is always higher (or same height)
                if (a.position.y < b.position.y)
                    [a, b] = [b, a];

                if (!a.collider || !b.collider)
                    return;
                // let distanceSqr = a.position.distanceToSquared(b.position);
                let minDistToCollide = (a.collider.r || 0) + (b.collider.r || 0);

                // Point-point collisions are not used
                if (minDistToCollide == 0)
                    return;

                let ha = a.collider.h || 0;
                let hb = b.collider.h || 0;
                let pa = a.position;
                let pb = b.position;

                let dx = pa.x - pb.x;
                let dy;
                let dz = pa.z - pb.z;
                // https://eli.thegreenplace.net/2008/08/15/intersection-of-1d-segments
                // If heights intersect: (case for capsule colliders but also works on other)
                if (((pa.y + ha) >= (pb.y - hb)) && ((pb.y + hb) >= (pa.y - ha))) {
                    // Check 2d collision of circles on ZX plane
                    // To do that, just flatten dy space
                    dy = 0;
                }
                else {
                    // Check 3d collision of spheres - just spheres if no collider is a capsule
                    // Using the fact, that pa.y >= pb.y and heights of capsules do not intersect only lower point of a and heigher point of b must be checked
                    dy = (pa.y - ha) - (pb.y + hb);
                }
                // else just use 3d collision      
                // Check 3d collision of closer spheres
                if (dx * dx + dy * dy + dz * dz < minDistToCollide * minDistToCollide) {
                    // Collision found
                    a.collides = b;
                    b.collides = a;
                }
            });
        });
    }
}
