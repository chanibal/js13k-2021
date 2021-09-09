import { scene } from "./game.js";
import { Transform } from "./Transform.js";

export class DebugCollidersSystem {
    constructor(ecs) {
        this.selector = ecs.select(Transform);
        this.helpers = [];
        this.mat = new THREE.MeshBasicMaterial({ wireframe: true, color: 0xff00ff });
        this.mat2 = new THREE.MeshBasicMaterial({ wireframe: true, color: 0xffff00 });
        this.sphere = new THREE.SphereGeometry(1, 8, 4);
        this.sphereTop = new THREE.SphereGeometry(1, 8, 2, 0, Math.PI * 2, 0, Math.PI/2);
        this.sphereBottom = new THREE.SphereGeometry(1, 8, 2, 0, Math.PI * 2, Math.PI/2, Math.PI/3);
        this.cylinder = new THREE.CylinderGeometry(1,1,1,8,1,true);
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
            let h = (t.collider.h || 0) / 2;
            let r = (t.collider.r || 0);
            if (h) {
                helper = new THREE.Group();
                const sphereTop = new THREE.Mesh(this.sphereTop, this.mat);
                sphereTop.scale.set(r,r,r);
                sphereTop.position.y += h;

                const sphereBottom = new THREE.Mesh(this.sphereBottom, this.mat);
                sphereBottom.scale.set(r,r,r);
                sphereBottom.position.y -= h;

                const cylinder = new THREE.Mesh(this.cylinder, this.mat);
                cylinder.scale.set(r,h*2,r)

                helper.add(sphereTop);
                helper.add(sphereBottom);
                helper.add(cylinder);
            }
            else if (r) {
                helper = new THREE.Mesh(this.sphere, this.mat);
                helper.scale.set(r,r,r);
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
