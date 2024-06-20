class Vector {

    x = 0
    y = 0

    /**
     * 
     * @param {number?|Vector} x 
     * @param {number?} y 
     */
    constructor(x = 0, y = 0) {
        if (typeof x == "number" && typeof y == "number") {
            this.x = x;
            this.y = y;
        } else if (x instanceof Vector) {
            this.x = x.x;
            this.y = x.y;
        }
    }


    /**@returns {Vector} */
    copy() {
        return new Vector(this.x, this.y);
    }


    /**
     * @param {Vector} vector 
     * @returns {Vector}
     */
    sum(vector) {
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

    multiply(vector) { 
        if (vector instanceof Vector) {   
            return new Vector(this.x * vector.x, this.y * vector.y);
        } else if (typeof vector == "number") {
            return new Vector(this.x * vector, this.y * vector);
        }
    }

    divide(vector) {
        if (vector instanceof Vector) {   
            return new Vector(this.x / vector.x, this.y / vector.y);
        } else if (typeof vector == "number") {
            return new Vector(this.x / vector, this.y / vector);
        }
        
    }


    /**@returns {Vector} */
    negative() {
        return new Vector(-this.x, -this.y);
    }

    isZero() {
        return this.x === 0 && this.y === 0;
    }

    /**
     * 
     * @param {Vector} min 
     * @param {Vector} max
     * 
     * @returns {Vector}
     */
    clamp(min = Vector.both(NaN), max = Vector.both(NaN)) {

        const result = this.copy();

        const ifIsNotNan = (resultAxis, limiterValue, action) => {
            if (!isNaN(limiterValue)) {
                result[resultAxis] = action(result[resultAxis], limiterValue);
            }
        }

        
        ifIsNotNan("x", max.x, Math.min);
        ifIsNotNan("y", max.y, Math.min);

        ifIsNotNan("x", min.x, Math.max);
        ifIsNotNan("y", min.y, Math.max);

        return result;
    }

    /**
     * @param {number} value
     * @returns{Vector} */
    static both(value) {
        return new Vector(value, value);
    }

    /**
     * 
     * @param {Array} arr 
     * @returns {Vector}
     */
    static fromArray(arr) {
        if (arr.length !== 2) {
            throw new Error("Array must have exactly 2 elements!");
        } else if (typeof arr[0] != "number" || typeof arr[1] != "number") {
            throw new Error("The elements in the array must be numbers!");
        }

        return new Vector(arr[0], arr[1]);
    }

    /**@returns {Vector} */
    static zero() {
        return new Vector(0, 0);
    }

    /**@returns {string} */
    toString() {
        return `(${this.x}, ${this.y})`;
    }


}