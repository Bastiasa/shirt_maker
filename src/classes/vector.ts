
export class Vector {

    constructor(
        public x:number = 0, 
        public y:number = 0
    ) {
    }
    

    public copy() {
        return new Vector(this.x, this.y);
    }

    public sum(vector:Vector) {
        const result = this.copy();

        if (vector instanceof Vector) { 
            result.x += vector.x;
            result.y += vector.y;
        } else if (typeof vector == "number") {
            result.x += vector;
            result.y += vector;
        }


        return result;
    }

    public multiply(vector:Vector|number) { 
        if (vector instanceof Vector) {   
            return new Vector(this.x * vector.x, this.y * vector.y);
        } else if (typeof vector == "number") {
            return new Vector(this.x * vector, this.y * vector);
        }

        throw new TypeError(`Invalid multiply value for vector: ${vector}. Expected: Vector, number`);
    }

    public divide(vector:Vector|number) {
        if (vector instanceof Vector) {   
            return new Vector(this.x / vector.x, this.y / vector.y);
        } else if (typeof vector == "number") {
            return new Vector(this.x / vector, this.y / vector);
        }

        throw new TypeError(`Invalid divide value for vector: ${vector}. Expected: Vector, number`);
    }


    public negative(): Vector {
        return new Vector(-this.x, -this.y);
    }

    public isZero() : boolean {
        return this.x === 0 && this.y === 0;
    }

    private clampAxisIfLimiterIsFinite(
        axis:'x'|'y',
        mode:'min'|'max',
        limiterValue:number,
    ) {
        if (isFinite(limiterValue)) {
            const action = mode =='min' ? Math.min : Math.max;
            this[axis] = action(limiterValue, this[axis]);
        }
    }

    public clamp(min:Vector = Vector.both(NaN), max:Vector = Vector.both(NaN)) {

        const result = this.copy();
        
        result.clampAxisIfLimiterIsFinite("x", 'min', max.x);
        result.clampAxisIfLimiterIsFinite("y", 'min', max.y);

        result.clampAxisIfLimiterIsFinite('x', 'max', min.x);
        result.clampAxisIfLimiterIsFinite('y', 'max', min.y);

        return result;
    }

    public toString() {
        return `(${this.x}, ${this.y})`;
    }

    public static both(value:number) {
        return new Vector(value, value);
    }

    public static fromArray(arr:[number, number]) {
        if (arr.length !== 2) {
            throw new Error("Array must have exactly 2 elements!");
        } else if (typeof arr[0] != "number" || typeof arr[1] != "number") {
            throw new Error("The elements in the array must be numbers!");
        }

        return new Vector(arr[0], arr[1]);
    }

    public static zero() {
        return new Vector(0, 0);
    }

}