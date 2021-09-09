import { scene } from "./game.js";
import { Transform } from "./Transform.js";

export class DebugCollidersSystem {
    constructor(ecs) {
        this.selector = ecs.select(Transform);
        this.helpers = [];
        this.mat = new THREE.MeshBasicMaterial({ wireframe: true, color: 0xff00ff });
        this.sphere = new THREE.SphereGeometry(1, 8, 4);
    }
    update(dt) {
        // FIXME: Port to InstancedMesh?
        for (let h of this.helpers) {
            scene.remove(h);
            if (h.dispose)
                h.dispose();
        }
        this.helpers = [];

        if (!window.enableDebugCollidersSystem) return;

        this.selector.iterate(entity => {
            let t = entity.get(Transform);
            if (!t.collider)
                return;

            let helper;
            if (t.collider.r) {
                helper = new THREE.Mesh(this.sphere, this.mat);
                helper.scale.set(t.collider.r, t.collider.r, t.collider.r);
            }
            else {
                helper = new THREE.AxesHelper(0.1);
            }

            helper.position.copy(t.position);
            helper.renderOrder = 999;
            scene.add(helper);
            this.helpers.push(helper);
        });
    }
}
