"use strict";  // 厳格モード

// 汎用定数群

/** 無限小 */
const ZERO = {
    MILI : 1.0e-3,
    MICRO: 1.0e-6,
    NANO : 1.0e-9,
    PICO : 1.0e-12,
}

/** 無限大 */
const INF = {
    KILO: 1.0E+3,
    MEGA: 1.0E+6,
    GIGA: 1.0E+9,
    TERA: 1.0E+12,
}

// 汎用クラス群

/** 2次元ベクトル */
class Vector2D {
    static zero = new Vector2D(0, 0);
    static xUnit = new Vector2D(1, 0);
    static yUnit = new Vector2D(0, 1);

    /**
     * @param {number} x
     * @param {number} y
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    /**
     * @param {Vector2D} other
     * @returns this + other
     */
    add(other) {
        return new Vector2D(
            this.x + other.x,
            this.y + other.y,
        );
    }
    /**
     * @param {Vector2D} other
     * @returns this - other
     */
    sub(other) {
        return new Vector2D(
            this.x - other.x,
            this.y - other.y,
        );
    }
    /**
     * @param {number} scalar
     * @returns this * scalar
     */
    mul(scalar) {
        return new Vector2D(
            this.x * scalar,
            this.y * scalar,
        );
    }
    /**
     * @param {number} scalar
     * @returns this / scalar
     */
    div(scalar) {
        return new Vector2D(
            this.x / scalar,
            this.y / scalar,
        );
    }
    /**
     * @param {Vector2D} other
     * @returns this . other
     */
    dot(other) {
        return this.x*other.x + this.y*other.y;
    }
    /**
     * @param {Vector2D} other
     * @returns (this x other)z
     */
    cross(other) {
        return this.x*other.y - this.y*other.x;
    }
    /**
     * @returns |this|
     */
    abs() {
        return Math.sqrt(this.dot(this));
    }
    /**
     * @param {Vector2D} other
     * @returns |this - other|
     */
    distance(other) {
        return this.sub(other).abs();
    }
    /**
     * @returns this / |this|
     */
    normalize() {
        return this.div(this.abs());
    }
    /**
     * @param {number} angle
     * @returns R_angle * this
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
     * @returns this < other (x major)
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
     * @returns this > other (x major)
     */
    gt(other) {
        return other.lt(this);
    }
    /**
     * @param {Vector2D} other
     * @returns this <= other (x major)
     */
    le(other) {
        return !this.gt(other);
    }
    /**
     * @param {Vector2D} other
     * @returns this >= other (x major)
     */
    ge(other) {
        return !this.lt(other);
    }
    /**
     * @param {Vector2D} other
     * @returns this == other
     */
    eq(other) {
        return this.ge(other) && this.le(other);
    }
    /**
     * @param {Vector2D} other
     * @returns this != other
     */
    ne(other) {
        return !this.eq(other);
    }
}

// 汎用関数群

/** 強制終了
 * @description 呼び出し元にcatchがなければプログラムが終了する
 * @param {string} [str="exit"] エラーメッセージ
 */
function exit(message = "exit") {
    throw new Error(message);
}

/** エラー用アラート
 * @description 先行処理が完了してからエラー用アラートを表示する
 * @param {string} [message="alert"] エラーメッセージ
 */
function errorAlert(message = "alert") {
    setTimeout(() => alert(`Error: ${message}`), 0);
}

/** エラー用ログ
 * @description エラー用ログを表示する
 * @param {string} [message="log"] エラーメッセージ
 */
function errorLog(message = "log") {
    console.error(`Error: ${message}`);
}

/** モバイル端末用設定 */
function setMobileDevice() {
    const regExpMobile = /(iPhone|Android).+Mobile/;
    const queryMobile = "(orientation: portrait) and (max-width: 560px)";
    if (regExpMobile.test(navigator.userAgent) || matchMedia(queryMobile).matches) {
        const DOMInputNumberList = document.querySelectorAll('input[type="number"]');
        DOMInputNumberList.forEach((DOMInput) => {
            DOMInput.type = "text";
            DOMInput.inputMode = "numeric";
            // DOMInput.inputMode = "decimal";
            DOMInput.pattern = "^([1-9][0-9]*|0)$";
            // DOMInput.pattern = "^(-?[1-9][0-9]*|0)$";
            // DOMInput.pattern = "^(-?[1-9][0-9]*|0)(\.[0-9]+)?$";
        });
    }
}

/** イベントリスナー登録
 * @description jQuery形式で複数DOM要素に複数イベントリスナーを登録
 * @param {string} events 空白区切りで列挙されたイベント名群
 * @param {string} selector 妥当なCSSセレクター
 * @param {Function} listener イベントリスナー
 */
function registerEventListener(events, selector, listener) {
    document.querySelectorAll(selector).forEach((element) => {
        events.split(" ").forEach((eventName) => {
            element.addEventListener(eventName, (event) => {
                listener(event);
            });
        });
    });
}

/** 列挙定数群生成
 * @description C言語のenum(列挙定数)形式のObjectを作成
 * @param {...string} keyArray キーの並び
 * @returns 列挙定数群
 */
function createEnum(...keyArray) {
    return Object.fromEntries(Object.entries(keyArray).map(([key, val]) => [String(val), Number(key)]));
}

/** 0以上num未満の疑似整数乱数
 * @param {number} num 疑似整数乱数の候補の個数
 * @returns {number} 疑似整数乱数
 */
function randomInt(num) {
    return Math.trunc(Math.random()*num);
}

/** min以上max以下の疑似整数乱数
 * @param {number} min 下限値
 * @param {number} max 上限値
 * @returns {number} 疑似整数乱数
 */
function randomIntRange(min, max) {
    if (min > max) [min, max] = [max, min];
    min = Math.ceil(min);
    max = Math.floor(max) + 1;
    return randomInt(max-min) + min;
}

/** 離散確率密度関数pdfに従う0以上pdf.length未満の疑似整数乱数
 * @param {number[]} pdf 離散確率密度関数
 * @returns {number} 疑似整数乱数
 */
function randomIntPdf(pdf) {
    const N = pdf.length;
    const cdf = new Array(N+1).fill(0);
    for (let i = 0; i < N; i++) {
        cdf[i+1] = cdf[i] + pdf[i];
    }
    const total = cdf.slice(-1)[0];
    const rand = Math.random()*total;
    for (let i = 0; i < N; i++) {
        if (rand < cdf[i+1]) return i;
    }
}

// 汎用クロージャ群

/** 経過時間計測
 * @description コンソールタイマーの模倣
 * @method begin 開始
 * @method log 記録
 * @method end 終了
 * @returns 経過時間
 */
const consoleTime = (() => {
    const lastDateMap = new Map();
    const MAP_SIZE_MAX = 10000;
    return Object.freeze({
        /** 開始
         * @description タイマーの作成
         * @param {string} [label="default"] タイマーのラベル
         * @returns 経過時間
         */
        begin: (label = "default") => {
            if (lastDateMap.has(label)) {
                console.warn(`Timer "${label}" already exists`);
                return;
            }
            if (lastDateMap.size >= MAP_SIZE_MAX) {
                console.warn("Number of timer is full.");
                return;
            }

            lastDateMap.set(label, performance.now());
            return 0;
        },
        /** 記録
         * @description 経過時間をコンソール表示
         * @param {string} [label="default"] タイマーのラベル
         * @returns 経過時間
         */
        log: (label = "default") => {
            if (!lastDateMap.has(label)) {
                console.warn(`Timer "${label}" doesn't exist.`);
                return;
            }

            const lastDate = lastDateMap.get(label);
            const nowDate = performance.now();
            const pastTime = nowDate - lastDate;
            console.log(`${label}: ${pastTime}ms`);
            return pastTime;
        },
        /** 終了
         * @description 経過時間をコンソール表示, タイマーの削除
         * @param {string} [label="default"] タイマーのラベル
         * @returns 経過時間
         */
        end: (label = "default") => {
            if (!lastDateMap.has(label)) {
                console.warn(`Timer "${label}" doesn't exist.`);
                return;
            }

            const lastDate = lastDateMap.get(label);
            const nowDate = performance.now();
            const pastTime = nowDate - lastDate;
            lastDateMap.delete(label);
            console.log(`${label}: ${pastTime} ms`);
            return pastTime;
        },
    });
})();

// 汎用メソッド群

/** 子ノード全削除メソッド(in-place)
 * @returns 子ノードを全削除したノード
 */
Node.prototype.emptyChild = function() {
    while (this.firstChild) {
        this.removeChild(this.firstChild);
    }
    return this;
};
