import ecs from "./ecs.m.js";
import * as sounds from "./ZzFX-sounds.js";
import { zzfx } from "./ZzFX.micro.js";
import { Renderer } from "./Renderer.js";
import { Transform } from "./Transform.js";

/**
 * Fireball that damages Damagable instances
 * It grows and collapses in set time, does not move
 */
export class Explosion {
    constructor(size) {
        this.size = size;
        this.t = 0;
        zzfx(...sounds.zzfx_explode);
        // TODO: if explosion at ground, do a torus as shockwave
    }
}

/**
 * Handles Explosion objects
 */
export class ExplosionSystem {
    constructor(ecs) {
        this.selector = ecs.select(Explosion, Transform, Renderer);
    }

    update(dt) {
        this.selector.iterate((entity) => {
            const scale = 0.5;
            const explosion = entity.get(Explosion);
            explosion.t += dt * scale;

            if (explosion.t > 1) {
                entity.eject();
                return;
            }

            let radius = Math.sin(22 / 7 * explosion.t) * explosion.size;
            entity.get(Transform).collider.r = radius;
            entity.get(Renderer).mesh.scale.set(radius, radius, radius);
        });
    }
}

const explosionPrefab = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshLambertMaterial({ emissive: 0xffffff, fog: false }));
explosionPrefab.scale.set(0, 0, 0);

export function explode(position) {
    ecs.create().add(new Explosion(0.5), new Transform(position, { r: 0 }), new Renderer(explosionPrefab));
}
