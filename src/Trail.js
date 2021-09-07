import { scene, Projectile, V3 } from "./game.js";

// TODO: Trail fade out

export class Trail {
    constructor(material, maxPoints = 500) {
        const g = this.geometry = new THREE.BufferGeometry();
        const p = this.position = new Float32Array(maxPoints * 3);
        this.count = 0;
        this.geometry.setAttribute("position", new THREE.BufferAttribute(p, 3));
        scene.add(this.mesh = new THREE.Line(this.geometry, material));
        // TODO: ensure trail has projectile
    }
    destructor() {
        scene.remove(this.mesh);
    }
}

export class TrailSystem {
    constructor(ecs) {
        this.selector = ecs.select(Trail, Projectile);
    }
    update(dt) {
        this.selector.iterate((entity) => {
            const trail = entity.get(Trail);
            const projectile = entity.get(Projectile);

            const pp = projectile.position;
            const tp = trail.position;
            let c = trail.count;

            // optimization: don't draw more points if angle is not that different
            // http://paulbourke.net/geometry/pointlineplane/source.c ?
            if (c >= 6) {
                const a = V3(tp[c - 6], tp[c - 5], tp[c - 4]);
                const b = V3(tp[c - 3], tp[c - 2], tp[c - 1]);
                // debugger;
                const l = new THREE.Line3(a, pp);
                const d = V3();
                l.closestPointToPoint(b, true, d);
                const deviation = d.distanceTo(b);
                const len = l.distance();
                if (deviation / len < 0.01) {
                    // console.log("Saved a point", deviation, c);
                    c -= 3;
                }
            }

            if (c > tp.length)
                return;
            tp[c++] = pp.x;
            tp[c++] = pp.y;
            tp[c++] = pp.z;
            trail.count = c;

            trail.geometry.setDrawRange(0, c / 3);
            trail.mesh.geometry.attributes.position.needsUpdate = true;
        });
    }
}
