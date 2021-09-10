import ecs from "./ecs.m.js";
import * as sounds from "./ZzFX-sounds.js";
import { zzfx } from "./ZzFX.micro.js";
import { Renderer } from "./Renderer.js";
import { Transform } from "./Transform.js";
import { Collider } from "./Collisions.js";
import { scene } from "./game.js";

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
        this.selector = ecs.select(Explosion, Transform, Renderer, Collider);
    }

    update(dt) {
        this.selector.iterate((entity) => {
            const scale = 0.5;
            const explosion = entity.get(Explosion);
            let t = explosion.t += dt * scale;

            if (explosion.t > 1) {
                entity.eject();
                return;
            }

            let ts = Math.sin(22 / 7 * t);
            let radius = ts * explosion.size;
            entity.get(Collider).radius = radius;

            let renderer = entity.get(Renderer);
            renderer.mesh.scale.set(radius, radius, radius);
            renderer.mesh.children[0].intensity = ts;
            renderer.mesh.children[0].needsUpdate = true;
        });
    }
}

const explosionPrefab = new THREE.Mesh(
    new THREE.SphereGeometry(), 
    new THREE.MeshLambertMaterial({ emissive: 0xffffff, fog: false })
    // new THREE.MeshLambertMaterial({ emissive: 0xffffff, fog: false, transparent: true, opacity: 0.5 })
);
explosionPrefab.scale.set(0, 0, 0);
const light = new THREE.PointLight(0xffffff, 3);
light.intensity = 0;
explosionPrefab.add(light);

export function explode(position, size = 0.5) {
    ecs.create().add(new Explosion(size), new Transform(position), new Collider(0), new Renderer(explosionPrefab));
}
