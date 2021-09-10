import { scene } from "./game.js";

export class Renderer {
    constructor(prefab) {
        scene.add(this.mesh = prefab.clone());
    }
    destructor() {
        scene.remove(this.mesh);
        if (this.mesh.dispose)
            this.mesh.dispose();
    }
}
