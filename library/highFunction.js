"use strict";

/** for-range callback function
 * @callback rangeCallback
 * @param {number} i 項番
 * @returns {void}
 */

/** pythonのfor-range相当
 * @param {number} start 初項(包括)
 * @param {number} end 末項(排他)
 * @param {number} step 公差
 * @param {rangeCallback} callbackfn ループ処理
 */
export function forRange(start, end, step, callbackfn) {
    const n = Math.trunc((end-start+step-Math.sign(step))/step);
    [...Array(n)].forEach((_, i) => {
        callbackfn(i*step + start);
    });
}

/** pythonのfor-range相当(省略形)
 * @param {number} num 項数
 * @param {rangeCallback} callbackfn ループ処理
 */
export function forRangeInt(num, callbackfn) {
    [...Array(num)].forEach((_, i) => {
        callbackfn(i);
    });
}

/** 閉区間指定のforRangeInt
 * @param {number} first 初項(包括)
 * @param {number} last 末項(包括)
 * @param {rangeCallback} callbackfn ループ処理
 */
export function forRangeIntAll(first, last, callbackfn) {
    const s = (last-first >= 0) ?1 :-1;
    const f = first;
    const l = last+s;
    forRange(f, l, s, callbackfn);
}

/** for-range2 callback function
 * @callback range2Callback
 * @param {number} i 第2次元項番
 * @param {number} j 第1次元項番
 * @returns {void}
 */

/** 2次元のforRangeInt
 * @param {number} iNum 第2次元項数
 * @param {number} jNum 第1次元項数
 * @param {range2Callback} callbackfn ループ処理
 */
export function forRange2Int(iNum, jNum, callbackfn) {
    [...Array(iNum*jNum)].map((_, ij) => {
        const i = Math.trunc(ij/jNum);
        const j = ij%jNum;
        callbackfn(i, j);
    });
}

/** 2次元の閉区間指定のforRangeInt
 * @param {number} iFirst 第2次元初項(包括)
 * @param {number} iLast 第2次元末項(包括)
 * @param {number} jFirst 第1次元初項(包括)
 * @param {number} jLast 第1次元末項(包括)
 * @param {range2Callback} callbackfn ループ処理
 */
export function forRange2IntAll(iFirst, iLast, jFirst, jLast, callbackfn) {
    const s1 = (iLast-iFirst >= 0) ?1 :-1;
    const f1 = iFirst;
    const l1 = iLast+s1;
    const n1 = (l1-f1)*s1;
    const s2 = (jLast-jFirst >= 0) ?1 :-1;
    const f2 = jFirst;
    const l2 = jLast+s2;
    const n2 = (l2-f2)*s2;
    [...Array(n1*n2)].map((_, ij) => {
        const i = Math.trunc(s1*ij/n2) + iFirst;
        const j = s2*ij%n2 + jFirst;
        callbackfn(i, j);
    });
}

/** トランポリン
 * @description 再帰関数実行のスタックオーバーフローを回避
 * @param {Function} fn 再帰関数
 * - 形式 : 末尾再帰かつ戻り値が関数
 * @param {...any} args 再帰関数の引数並び
 * @returns {any} 再帰関数の最終実行の戻り値
 */
export function trampoline(fn, ...args) {
    let ret = fn(...args);
    while (typeof ret === "function") {
        ret = ret();
    }
    return ret;
}

/** イベントリスナー登録
 * @description 複数DOM要素に複数イベントリスナーを登録
 * @param {string} selector 妥当なCSSセレクター
 * @param {string} eventNames イベント名の空白区切りのリスト
 * @param {EventListener} listener イベントリスナー
 */
export function registerEventListener(selector, eventNames, listener) {
    document.querySelectorAll(selector).forEach((element) => {
        eventNames.split(" ").forEach((eventName) => {
            element.addEventListener(eventName, (event) => {
                listener(event);
            });
        });
    });
}

/** イベント間引き処理(高頻度呼び出しの減速化)
 * @description イベント発火から一定時間毎に1回だけリスナーを実行する
 * @param {Function} listener リスナー
 * @param {number} wait 待機時間[ms]
 * @returns {Function} 間引き処理したリスナー
 */
export function throttle(listener, wait) {
    let inThrottle = false;
    return (...args) => {
        if (inThrottle) return;
        listener(...args);
        inThrottle = true;
        window.setTimeout(() => inThrottle = false, wait);
    };
}

/** イベント間引き処理(多数呼び出しの単一化)
 * @description イベント終了から一定時間後に1回だけリスナー実行する
 * @param {Function} listener リスナー
 * @param {number} wait 待機時間[ms]
 * @returns {Function} 間引き処理したリスナー
 */
export function debounce(listener, wait) {
    let timeoutID;
    return (...args) => {
        window.clearTimeout(timeoutID);
        timeoutID = window.setTimeout(() => listener(...args), wait);
    };
}
