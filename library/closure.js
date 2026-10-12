"use strict";

/** 経過時間計測
 * @description コンソールタイマーの模倣
 * @method begin 開始 console.time()
 * @method log 記録 console.timeLog()
 * @method end 終了 console.timeEnd()
 * @param {string} [label="default"] タイマーのラベル
 * @returns {number} 経過時間[ms]
 */
export const consoleTime = (() => {
    const lastDateMap = new Map();
    const MAP_SIZE_MAX = 10000;
    return Object.freeze({
        /** 開始
         * @description タイマーの作成
         * @param {string} [label="default"] タイマーのラベル
         * @returns {number} 経過時間[ms]
         */
        begin(label = "default") {
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
         * @returns {number} 経過時間[ms]
         */
        log(label = "default") {
            if (!lastDateMap.has(label)) {
                console.warn(`Timer "${label}" doesn't exist.`);
                return;
            }

            const lastDate = lastDateMap.get(label);
            const nowDate = performance.now();
            const pastTimeMS = nowDate - lastDate;
            console.log(`${label}: ${pastTimeMS}ms`);
            return pastTimeMS;
        },

        /** 終了
         * @description 経過時間をコンソール表示, タイマーの削除
         * @param {string} [label="default"] タイマーのラベル
         * @returns {number} 経過時間[ms]
         */
        end(label = "default") {
            if (!lastDateMap.has(label)) {
                console.warn(`Timer "${label}" doesn't exist.`);
                return;
            }

            const lastDate = lastDateMap.get(label);
            const nowDate = performance.now();
            const pastTimeMS = nowDate - lastDate;
            lastDateMap.delete(label);
            console.log(`${label}: ${pastTimeMS}ms`);
            return pastTimeMS;
        },
    });
})();
