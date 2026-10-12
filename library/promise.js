"use strict";

/** 指定ミリ秒停止
 * @param {number} wait 停止時間[ms]
 * @returns {Promise<any>|void} プロミス
 */
export function sleep(wait) {
    if (wait <= 0) return;  // 停止しない
    return new Promise((resolve) => window.setTimeout(resolve, wait));
}
