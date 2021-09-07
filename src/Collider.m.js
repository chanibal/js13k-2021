class Collider {
    /**
     * @param {Collider} other 
     * @returns {boolean}
     */
    Collides(other) { throw "Not implemented"; }

    // TODO: BoundingBox() { }
}

class SphereCollider extends Collider {

}

class PointCollider extends Collider {

}

class CapsuleCollider extends Collider {

}

class ComplexCollider extends Collider {

}

// TODO: space partitioning

class CollisionSystem {
    constructor(ecs) {
        this.selector = ecs.select(Damagable);
        // product of every type of collision must have its own selector
    }

    update(dt) {
        this.selector.iterate(entity => {
            const damagable = entity.get(Damagable);
            if(damagable.hp < 0) entity.eject();
        })
    }
}