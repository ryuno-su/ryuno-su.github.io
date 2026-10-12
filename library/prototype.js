"use strict";

// import { TIME } from "./const.js";  // デバッグ用
import { TIME } from "./const.min.js";

// 組み込みオブジェクトにメソッド追加

/** forEach callback function
 * @callback stringForEachCallback
 * @param {char} c
 * @param {number} index
 * @param {string} str
 * @returns {void}
 */

/** 文字列版forEach
 * @param {stringForEachCallback} callbackfn 
 */
String.prototype.forEach = function(callbackfn) {
    [...this].forEach(callbackfn);
};

/** 文字列版reverse
 * @returns {string} 反転済み文字列
 */
String.prototype.reverse = function() {
    return [...this].reverse().join("");
};

/** forEach callback function
 * @callback objectForEachCallback
 * @param {any} value
 * @param {any} key
 * @param {object} obj
 * @returns {void}
 */

/** オブジェクト版forEach
 * @param {objectForEachCallback} callbackfn 
 */
Object.prototype.forEach = function(callbackfn) {
    Object.keys(this).forEach((key) => callbackfn(this[key], key, this));
};

/** 数列の総和
 * @returns {number} 総和
 */
Array.prototype.sum = function() {
    return this.reduce((sum, value) => sum + value, 0);
}

/** 数列の総積
 * @returns {number} 総積
 */
Array.prototype.mul = function() {
    return this.reduce((mul, value) => mul * value, 1);
}

/** 数列の最小値
 * @returns {number} 最小値
 */
Array.prototype.min = function() {
    return this.reduce((min, value) => Math.min(min, value));
}

/** 数列の最大値
 * @returns {number} 最大値
 */
Array.prototype.max = function() {
    return this.reduce((max, value) => Math.max(max, value));
}

/** 配列のランダム要素
 * @returns {any} ランダム要素
 */
Array.prototype.random = function() {
    const rand = Math.trunc(Math.random()*this.length);
    return this[rand];
}

/** 配列の要素がすべて互いに等価かどうか
 * @param {any} [value=this[0]] 比較対象
 * @returns {any} すべて互いに等価かどうか
 */
Array.prototype.isEqAll = function(value=this[0]) {
    return this.length > 0 && this.every((v) => v === value);
}

/** 配列の複数の添え字で指定した要素を指定した順に全て取得
 * @param {...number} indexes 添え字並び
 * @returns {any[]} 配列の要素列
 */
Array.prototype.select = function(...indexes) {
    return indexes.map((index) => this[index]);
}

/** 数列の累積和
 * @param {number} [seed=0] 累積和の初期値
 * @returns {number} 累積和
 */
Array.prototype.prefixSum = function(seed = 0) {
    let sum = seed;
    return [0, ...this].map(value => sum += value);
}

/** 数列の階差数列
 * @returns {number} 階差数列
 */
Array.prototype.prefixDif = function() {
    let prev = this[0];
    return this.slice(1).map(value => {
        const dif = value - prev;
        prev = value;
        return dif;
    });
}

/** 数列のソート(in-place)
 * @param {boolean} [isReverse=false] 降順にするかどうか
 * @returns {number[]} ソート済み数列
 */
Array.prototype.numSort = function(isReverse = false) {
    this.sort((v1, v2) => {
        const sign = (isReverse) ?-1 :1;
        return sign*(v1-v2);
    });
    return this;
}

/** 数列のソート(シャローコピー版)
 * @param {boolean} [isReverse=false] 降順にするかどうか
 * @returns {number[]} ソート済み数列
 */
Array.prototype.toNumSorted = function(isReverse = false) {
    return [...this].numSort(isReverse);
}

/** 複数条件によるオブジェクトの配列のソート(in-place)
 * @description ソート対象は文字列または数値を要素に持つオブジェクトの配列
 * @param {[string, boolean][]} specifiers キー名と降順にするかどうかの組の配列(優先順位まま)
 * @returns {object[]} ソート済み配列
 */
Array.prototype.multiSort = function(specifiers) {
    for (const [key, isReverse] of specifiers.toReversed()) {
        // 文字列同士の比較または数値同士の比較
        this.sort((v1, v2) => {
            let cmp = 0;
            if (v1[key] < v2[key]) {
                cmp = -1;
            }
            if (v1[key] > v2[key]) {
                cmp = 1;
            }
            const sign = (isReverse) ?-1 :1;
            return sign*cmp;
        });
    }
    return this;
}

/** 複数条件によるオブジェクトの配列のソート(シャローコピー版)
 * @param {[string, boolean][]} specifiers キー名と降順にするかどうかの組の配列(優先順位まま)
 * @returns {object[]} ソート済み配列
 */
Array.prototype.toMultiSorted = function(specifiers) {
    return [...this].multiSort(specifiers);
}

/** 配列のシャッフル(in-place)
 * @returns {any[]} シャッフル済み配列
 */
Array.prototype.shuffle = function() {
    for (let i = this.length-1; i > 0; i--) {
        const j = Math.trunc(Math.random()*(i+1));
        [this[i], this[j]] = [this[j], this[i]];
    }
    return this;
}

/** 配列のシャッフル(シャローコピー版)
 * @returns {any[]} シャッフル済み配列
 */
Array.prototype.toShuffled = function() {
    return [...this].shuffle();
}

/** filter callback function
 * @callback filterCallback
 * @param {any} value
 * @param {number} index
 * @param {any[]} array
 * @returns {boolean}
 */

/** 配列の条件に合致する要素の添え字を全て取得
 * @param {filterCallback} callbackfn 条件
 * @returns {number[]} 配列の添え字列
 */
Array.prototype.filterIndex = function(callbackfn) {
    return [...this.keys()].filter((value, index, array) => callbackfn(this[value], index, array));
    // return this.flatMap((value, index, array) => callbackfn(value, index, array) ?index :[]);
}

/** bisect callback function
 * @callback bisectCallback
 * @param {any} key
 * @param {any} value
 * @returns {boolean}
 */

/** 整列済み配列の要素検索
 * @this {any[]} 整列済み配列(左側でisOKが常にfalse,右側でisOKが常にtrue)
 * @param {number} key 検索要素
 * @param {bisectCallback} [isOK=(k, v) => k <= v] 検索条件
 * @returns {number} 添字
 */
Array.prototype.bisect = function(key, isOK = (k, v) => k <= v) {
    let ng = -1;
    let ok = this.length;
    while (Math.abs(ok-ng) > 1) {
        const mid = Math.trunc((ok+ng)/2);
        if (isOK(key, this[mid])) {
            ok = mid;
        } else {
            ng = mid;
        }
    }
    return ok;
}

/** 整列済み配列の要素検索
 * @this {any[]} 整列済み配列(左側でisOKが常にtrue,右側でisOKが常にfalse)
 * @param {number} key 検索要素
 * @param {bisectCallback} [isOK=(k, v) => k >= v] 検索条件
 * @returns {number} 添字
 */
Array.prototype.bisectLeft = function(key, isOK = (k, v) => k >= v) {
    let ok = -1;
    let ng = this.length;
    while (Math.abs(ok-ng) > 1) {
        const mid = Math.trunc((ok+ng)/2);
        if (isOK(key, this[mid])) {
            ok = mid;
        } else {
            ng = mid;
        }
    }
    return ok;
}

/** タイムゾーンオフセット
 * @description ローカル時刻がUTCから何時間進んでいるか
 * @returns {number} 時間[h]
 */
Date.prototype.getTimezoneOffsetHour = function() {
    return -Math.trunc(this.getTimezoneOffset() / TIME.MIN_PAR_HOUR);
}

/** UTC表示でローカル時間になる日時
 * @returns {Date} 日時
 */
Date.prototype.localDate = function() {
    return new Date(this.getTime() + this.getTimezoneOffsetHour() * TIME.MSEC_PAR_HOUR);
}

/** ISO8601形式の日時文字列の部分文字列
 * @param {string} [format="YYYY-MM-DDThh:mm:ss.sss"] 書式
 * - 形式 : "YYYY-MM-DDThh:mm:ss.sss"の部分文字列
 * @returns {string} 日時部分文字列
 */
Date.prototype.toISOStringSlice = function(format = "YYYY-MM-DDThh:mm:ss.sss") {
    const ISOString = "YYYY-MM-DDThh:mm:ss.sss";
    if (!ISOString.includes(format)) return undefined;
    const first = ISOString.indexOf(format);
    const last = first + format.length;
    return this.toISOString().slice(first, last);
}

//#region Temporal版
// /** RFC9557形式の日時文字列の部分文字列
//  * @param {string} [format="YYYY-MM-DDThh:mm:ss.sssssssss"] 書式
//  * - 形式 : "YYYY-MM-DDThh:mm:ss.sssssssss"の部分文字列
//  * @returns {string} 日時部分文字列
//  */
// Temporal.PlainDateTime.prototype.toISOStringSlice = function(format = "YYYY-MM-DDThh:mm:ss.sssssssss") {
//     const ISOString = "YYYY-MM-DDThh:mm:ss.sssssssss";
//     if (!ISOString.includes(format)) return undefined;
//     const first = ISOString.indexOf(format);
//     const last = first + format.length;
//     return this.toString().slice(first, last);
// }
//#endregion

/** Invalid Dateかどうか判定
 * @returns {boolean} Invalid Dateかどうか判定
 */
Date.prototype.isInvalidDate = function() {
    return Number.isNaN(this.getTime());
}

/** URLのデコード
 * @returns {string} デコードされたURL文字列
 */
URL.prototype.toDecodedString = function() {
    return window.decodeURIComponent(this.toString().replaceAll("+", " "));
}

/** URLクエリパラメータのデコード
 * @returns {string} デコードされたURLクエリパラメータ文字列
 */
URLSearchParams.prototype.toDecodedString = function() {
    return window.decodeURIComponent(this.toString().replaceAll("+", " "));
}

/** URLクエリパラメータのクエリー文字列化
 * @returns {string} クエリー文字列
 */
URLSearchParams.prototype.toSearchString = function() {
    return `?${this.toString()}`;
}

/** 子ノード全削除メソッド(in-place)
 * @returns {Node} 子ノードを全削除したノード
 */
Node.prototype.emptyChild = function() {
    // this.innerHTML = "";
    while (this.firstChild) {
        this.removeChild(this.firstChild);
    }
    return this;
};
