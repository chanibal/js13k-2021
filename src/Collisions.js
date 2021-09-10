import { Transform } from "./Transform.js";


/**
 * Supported collider types:
 * 1. no radius nor height - point
 * 2. radius - sphere
 * 3. both radius and height - vertical capsule
 */
 export class Collider {
    constructor(radius = 0, height = 0) {
        this.radius = radius;
        this.height = height;
        this.collides = null;
    }
}


export class CollisionSystem {
    constructor(ecs) {
        this.updateCollisionsSelector = ecs.select(Transform, Collider);
    }
    update(dt) {
        window.stats.collisionsChecked = 0;
        window.stats.collisions = 0;



        // TODO: Broad phase
        this.updateCollisionsSelector.iterate(entity => { entity.collides = null; });


        // Narrow phase
        // FIXME: clear collisions
        // console.log("Collision:",a,b);
        this.updateCollisionsSelector.iterate(entityA => {
            // FIXME: no NxN collisions, just half

            this.updateCollisionsSelector.iterate(entityB => {
                if (entityA === entityB)
                    return;

                window.stats.collisionsChecked++;

                let a = entityA.get(Transform);
                let b = entityB.get(Transform);

                // assure that center of a is always higher (or same height)
                if (a.position.y < b.position.y)
                    [a, b] = [b, a];

                let ca = entityA.get(Collider);
                let cb = entityB.get(Collider);

                // let distanceSqr = a.position.distanceToSquared(b.position);
                let minDistToCollide = ca.radius + cb.radius;

                // Point-point collisions are not used
                if (minDistToCollide == 0)
                    return;

                let ha = ca.height;
                let hb = cb.height;
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
                    ca.collides = b;
                    cb.collides = a;
                    window.stats.collisions++;
                }
            });
        });
    }
}


export class DestroyOnCollision {
    constructor(onDestroy = null) {
        this.onDestroy = onDestroy;
    }
}


export class DestroyOnCollisionSystem {
    constructor(ecs) {
        this.destroyOnCollisionSelector = ecs.select(Collider, DestroyOnCollision);
    }
    update(dt) {
        this.destroyOnCollisionSelector.iterate(entity => {
            if (!entity.get(Collider).collides)
                return;

            let onDestroy = entity.get(DestroyOnCollision).onDestroy;
            if (onDestroy)
                onDestroy(entity);
            entity.eject();
        });
    }
}