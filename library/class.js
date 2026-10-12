"use strict";

/** スタック(LIFO) */
export class Stack {
    constructor(array = []) {
        /** @private */
        this.items = (array instanceof Array) ?array :[];
    }
    push(element) {
        this.items.push(element);
    }
    pop() {
        return this.items.pop();
    }
    size() {
        return this.items.length;
    }
    isEmpty() {
        return this.size() === 0;
    }
    clear() {
        this.items = [];
    }
}

/** キュー(FIFO) */
export class Queue {
    constructor(array = []) {
        /** @private */
        this.items = (array instanceof Array) ?Object.assign({}, array) :{};
        /** @private */
        this.head = 0;
        /** @private */
        this.tail = 0;
    }
    enq(element) {
        this.items[this.tail] = element;
        this.tail++;
    }
    deq() {
        const front = this.items[this.head];
        delete this.items[this.head];
        this.head++;
        return front;
    }
    size() {
        return this.tail - this.head;
    }
    isEmpty() {
        return this.size() === 0;
    }
    clear() {
        this.items = {};
        this.head = 0;
        this.tail = 0;
    }
}

/** デック(double ended queue) */
export class Deque {
    constructor(array = []) {
        /** @private */
        this.items = (array instanceof Array) ?Object.assign({}, array) :{};
        /** @private */
        this.head = 0;
        /** @private */
        this.tail = 0;
    }
    enqHead(element) {
        this.head--;
        this.items[this.head] = element;
    }
    enqTail(element) {
        this.items[this.tail] = element;
        this.tail++;
    }
    deqHead() {
        const front = this.items[this.head];
        delete this.items[this.head];
        this.head++;
        return front;
    }
    deqTail() {
        this.tail--;
        let back = this.items[this.tail];
        delete this.items[this.tail];
        return back;
    }
    size() {
        return this.tail - this.head;
    }
    isEmpty() {
        return this.size() === 0;
    }
    clear() {
        this.items = {};
        this.head = 0;
        this.tail = 0;
    }
}

/** 2次元ベクトル */
export class Vector2D {
    // static ZERO = Object.freeze(new Vector2D(0, 0));
    // static XUNIT = Object.freeze(new Vector2D(1, 0));
    // static YUNIT = Object.freeze(new Vector2D(0, 1));

    /**
     * @param {number} x
     * @param {number} y
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    /**
     * @param {object} [changes={}]
     * @param {number} [changes.x]
     * @param {number} [changes.y]
     * @returns {Vector2D} cloned
     */
    with(changes = {}) {
        const {x, y} = {...this, ...changes};
        return new Vector2D(
            x,
            y,
        );
    }
    /**
     * @param {Vector2D} other
     * @returns {Vector2D} this + other
     */
    add(other) {
        return new Vector2D(
            this.x + other.x,
            this.y + other.y,
        );
    }
    /**
     * @param {Vector2D} other
     * @returns {Vector2D} this - other
     */
    sub(other) {
        return new Vector2D(
            this.x - other.x,
            this.y - other.y,
        );
    }
    /**
     * @param {number} scalar
     * @returns {Vector2D} this * scalar
     */
    mul(scalar) {
        return new Vector2D(
            this.x * scalar,
            this.y * scalar,
        );
    }
    /**
     * @param {number} scalar
     * @returns {Vector2D} this / scalar
     */
    div(scalar) {
        return new Vector2D(
            this.x / scalar,
            this.y / scalar,
        );
    }
    /**
     * @param {Vector2D} other
     * @returns {number} this . other
     */
    dot(other) {
        return this.x*other.x + this.y*other.y;
    }
    /**
     * @param {Vector2D} other
     * @returns {number} (this x other)z
     */
    cross(other) {
        return this.x*other.y - this.y*other.x;
    }
    /**
     * @returns {number} |this|
     */
    abs() {
        return Math.sqrt(this.dot(this));
    }
    /**
     * @param {Vector2D} other
     * @returns {number} |this - other|
     */
    distance(other) {
        return this.sub(other).abs();
    }
    /**
     * @returns {Vector2D} this / |this|
     */
    normalize() {
        return this.div(this.abs());
    }
    /**
     * @param {number} angle
     * @returns {Vector2D} R_angle * this
     */
    rotate(angle) {
        const x = this.x;
        const y = this.y;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2D(
            cos*x - sin*y,
            sin*x + cos*y,
        );
    }
    /**
     * @param {Vector2D} other
     * @returns {boolean} this < other (x major)
     */
    lt(other) {
        if (this.x === other.x) {
            return this.y < other.y;
        } else {
            return this.x < other.x;
        }
    }
    /**
     * @param {Vector2D} other
     * @returns {boolean} this > other (x major)
     */
    gt(other) {
        return other.lt(this);
    }
    /**
     * @param {Vector2D} other
     * @returns {boolean} this <= other (x major)
     */
    le(other) {
        return !this.gt(other);
    }
    /**
     * @param {Vector2D} other
     * @returns {boolean} this >= other (x major)
     */
    ge(other) {
        return !this.lt(other);
    }
    /**
     * @param {Vector2D} other
     * @returns {boolean} this == other
     */
    eq(other) {
        return this.ge(other) && this.le(other);
    }
    /**
     * @param {Vector2D} other
     * @returns {boolean} this != other
     */
    ne(other) {
        return !this.eq(other);
    }
}

/** 疑似整数乱数
 * @description xorshift
 */
export class Random {
    /**
     * @param {number} [seed=Date.now()] シード値
     */
    constructor(seed = Date.now()) {
        seed = seed ^ (seed>>>7) ^ (seed<<7);

        /** @private */
        this.x = 123456789;
        /** @private */
        this.y = 362436069;
        /** @private */
        this.z = 521288629;
        /** @private */
        this.w = seed;

        let n = 4;
        while (n--) this.next();
    }
    /**
     * @returns {number} 疑似整数乱数
     */
    next() {
        const t = this.x ^ (this.x<<11);
        this.x = this.y;
        this.y = this.z;
        this.z = this.w;
        this.w = (this.w ^ (this.w>>>19)) ^ (t ^ (t>>>8));
        return (this.w>>>0);
    }
}
