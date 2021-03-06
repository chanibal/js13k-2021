import { Renderer } from "./Renderer.js";
import { Transform } from "./Transform.js";

export class Projectile {
    constructor(start, destination, speed, onTarget) {
        this.start = start.clone();
        this.position = start.clone();
        this.destination = destination.clone();
        this.speed = speed;
        this.onTarget = onTarget;
    }
}

export class ProjectileSystem {
    constructor(ecs) {
        this.selector = ecs.select(Projectile, Transform, Renderer);
    }

    update(dt) {
        this.selector.iterate((entity) => {
            const transform = entity.get(Transform);
            const projectile = entity.get(Projectile);
            const renderer = entity.get(Renderer);

            // TODO: simple line from-to, maybe a bezier?
            const dir = projectile.destination.clone().sub(transform.position);
            const move = dt * projectile.speed;
            if (move > dir.length()) { // lengthSq is faster, but a few bytes larger
                transform.moveTo(projectile.destination);
                if (projectile.onTarget) projectile.onTarget(transform.position, entity);
                entity.eject();
                return;
            }
            dir.normalize();
            dir.multiplyScalar(move);
            transform.moveBy(dir);

            renderer.mesh.lookAt(dir.add(transform.position));
        });
    }
}
