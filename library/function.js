"use strict";

// import { COUNTRY, TIMEZONE } from "./const.js";  // デバッグ用
import { COUNTRY, TIMEZONE } from "./const.min.js";
// import "./prototype.js";  // { prefixSum, bisectLeft }  // デバッグ用
import "./prototype.min.js";  // { prefixSum, bisectLeft }

/** 強制終了
 * @description 呼び出し元にcatchがなければプログラムが終了する
 * @param {string} [str="exit"] エラーメッセージ
 */
export function exit(message = "exit") {
    throw new Error(message);
}

/** エラー用アラート
 * @description 先行処理が完了してからエラー用アラートを表示する
 * @param {string} [message="alert"] エラーメッセージ
 * @returns {string} 表示したエラーメッセージ
 */
export function errorAlert(message = "alert") {
    const alert = `Error: ${message}`;
    window.setTimeout(() => window.alert(alert), 0);
    return alert;
}

/** エラー用ログ
 * @description エラー用ログを表示する
 * @param {string} [message="log"] エラーメッセージ
 * @returns {string} 表示したエラーメッセージ
 */
export function errorLog(message = "log") {
    const log = `Error: ${message}`;
    console.error(log);
    return log;
}

/** モバイル端末判定
 * @returns {boolean} モバイル端末でアクセスしているかどうか
 */
export function isMobileDevice() {
    //#region window
    // 画面の向きに縦横の区別が存在するかどうか
    if ("orientation" in window) return true;
    // 画面に指を触れたときのイベントが存在するかどうか
    if ("ontouchstart" in window) return true;
    // 画面に触れている指が移動したときのイベントが存在するかどうか
    if ("ontouchmove" in window) return true;
    // 画面から指を離したときのイベントが存在するかどうか
    if ("ontouchend" in window) return true;
    //#endregion

    //#region window.matchMedia
    // 画面幅が閾値未満かどうか
    // 320px <= iPhone <= 440px
    // 744px <= iPad <= 1032px
    const sizePx = 560;  // 画面横幅及び画面縦幅の閾値
    // const sizePx = 1120;  // 画面横幅及び画面縦幅の閾値
    if (window.matchMedia(`(width < ${sizePx}px) or (height < ${sizePx}px)`).matches) return true;
    // ポインターの正確性が粗いかどうか
    if (window.matchMedia("(pointer: coarse)").matches) return true;
    //#endregion

    //#region navigator.maxTouchPoints
    // 同時タッチ点数(指の本数)の最大数が1以上かどうか
    if (navigator.maxTouchPoints > 0) return true;
    //#endregion

    //#region navigator.userAgent
    // ユーザーエージェントに指定文字列が含まれているかどうか
    const regex = /ipod|ipad|iphone|android|mobile/i;
    if (regex.test(navigator.userAgent)) return true;
    //#endregion

    //#region navigator.userAgentData
    // // モバイル端末で閲覧しているかどうか
    // if (navigator.userAgentData.mobile) return true;
    //#endregion

    return false;
}

/** インデント削除
 * @description 先頭行のインデントを基準とする
 * @param {string} text インデントを含む文字列
 * @returns {string} インデント削除済み文字列
 */
export function dedent(text) {
    const lines = text.split("\n");  // 文字列を行単位に分割
    const blank = /^(\s+)?$/;  // 空白のみまたは空
    const firstLine = lines.find((line) => !blank.test(line));  // 空白のみまたは空でない先頭行
    const headSpace = /^\s+/;  // 行頭の空白文字
    // const indentLen = firstLine.match(headSpace)?.[0].length ?? 0;  // 行頭の空白文字数
    const matchArray = firstLine.match(headSpace);
    const indentLen = (matchArray != null) ?matchArray[0].length :0;  // 行頭の空白文字数
    const indent = `^\\s{${indentLen}}`;  // 行頭の空白文字に一致する正規表現
    return lines
        .map((line) => line.replace(new RegExp(indent), ""))  // 各行の行頭の空白文字を削除
        .join("\n")  // 改行で結合
        .trim();  // 文字列前後の空白削除
}

/** オブジェクトの全階層の凍結
 * @description Object.freeze(obj)を再帰的に適用する
 * @param {any} obj 
 * @returns {any} 凍結済みオブジェクト
 */
export function deepFreeze(obj) {
    Object.values(obj).forEach((val) => {
        if (val === null) return;
        if (typeof val !== "object") return;
        if (Object.isFrozen(val)) return;
        if (val instanceof Element) return;
        deepFreeze(val);
    });
    return Object.freeze(obj);
}

/** 列挙定数群生成
 * @description C言語のenum(列挙定数)形式のObjectを作成
 * @param {...string} keys キー並び
 * @returns {object.<string, number>} 列挙定数群
 */
export function createEnum(...keys) {
    return Object.fromEntries(Object.entries(keys).map(([index, key]) => [String(key), Number(index)]));
}

/** 二次元配列生成
 * @param {number} row 行数
 * @param {number} col 列数
 * @param {any} [val=0] 初期値
 * @returns {any[]} 二次元配列
 */
export function createArray2D(row, col, val = 0) {
    return [...Array(row)].map((_) => Array(col).fill(val));
}

/** 個数指定の疑似整数乱数(0-indexed)
 * @param {number} num 個数
 * @returns {number} 疑似整数乱数
 */
export function randomInt(num) {
    return Math.trunc(Math.random()*num);
}

/** 閉区間指定の疑似整数乱数
 * @param {number} min 下限値(包括)
 * @param {number} max 上限値(包括)
 * @returns {number} 疑似整数乱数
 */
export function randomIntRange(min, max) {
    if (min > max) return undefined;
    min = Math.ceil(min);
    max = Math.floor(max) + 1;
    return randomInt(max-min) + min;
}

/** 複数閉区間指定の疑似整数乱数
 * @param {[number, number][]} ranges 下限値(包括)と上限値(包括)の組の配列
 * @returns {number} 疑似整数乱数
 */
export function randomIntRanges(ranges) {
    const rands = ranges.map(([min, max]) => {
        if (min > max) return undefined;
        min = Math.ceil(min);
        max = Math.floor(max) + 1;
        return randomInt(max-min) + min;
    });
    const i = Math.trunc(Math.random()*rands.length);
    return rands[i];
}

/** 離散確率密度関数pdfに従う疑似整数乱数(0-indexed)
 * @param {number[]} pdf 離散確率密度関数列(すべて非負)
 * @returns {number} 疑似整数乱数
 */
export function randomIntPdf(pdf) {
    if (pdf.length === 0) return undefined;
    if (pdf.some((p) => p < 0)) return undefined;
    const cdf = pdf.prefixSum();
    const total = cdf.at(-1);
    const rand = Math.random()*total;
    return cdf.bisectLeft(rand);
}

/** 数値英字変換(0-indexed)
 * @param {number} int 0以下26未満の整数
 * @returns {string} 辞書順でint番目の長さ1の英小文字
 */
export function intToAlp(int) {
    // return "abcdefghijklmnopqrstuvwxyz"[int];
    if (!(0 <= int && int < 26)) return undefined;
    const inta = "a".charCodeAt();
    const alp = String.fromCharCode(int+inta);
    return alp;
}

/** 英字数値変換(0-indexed)
 * @param {string} alp 長さ1の英小文字
 * @returns {number} alpが辞書順で何番目かを表す整数
 */
export function alpToInt(alp) {
    // return "abcdefghijklmnopqrstuvwxyz".indexOf(alp);
    if (alp.length !== 1) return undefined;
    alp = alp.toLowerCase();
    const inta = "a".charCodeAt();
    const int = alp.charCodeAt() - inta;
    if (!(0 <= int && int < 26)) return undefined;
    return int;
}

/** 英序数詞
 * @param {number} int 整数
 * @returns {string} 英序数詞
 */
export function ordinal(int) {
    int = Math.abs(int);
    const cent = int % 100;
    const deci = int % 10;
    if (10 <= cent && cent <= 20) return "th";
    if (deci === 1) return "st";
    if (deci === 2) return "nd";
    if (deci === 3) return "rd";
    return "th";
}

/** 桁埋め
 * @param {number} int 整数
 * @param {number} max 最大値
 * @param {string} [fill=" "] 埋める文字
 * @param {boolean} [isStart=true] 先頭埋めかどうか
 * @returns {string} 桁埋め済み文字列
 */
export function padDigit(int, max, fill = " ", isStart = true) {
    if (isStart) return String(int).padStart(String(max).length, fill);
    return String(int).padEnd(String(max).length, fill);
}

/** 複数の非負の最大公約数
 * @param {...number} ints 整数列
 * @returns {number} 非負の最大公約数
 */
export function gcd(...ints) {
    return ints.reduce((a, b) => gcd2(a, b), 0);

    /** 2数の非負の最大公約数
     * @param {number} a 整数
     * @param {number} b 整数
     * @returns {number} 非負の最大公約数
     */
    function gcd2(a, b) {
        a = Math.abs(a);
        b = Math.abs(b);
        if (b === 0) return a;
        return gcd2(b, a%b);
    }
}

/** 複数の非負の最小公倍数
 * @param {...number} ints 整数列
 * @returns {number} 非負の最小公倍数
 */
export function lcm(...ints) {
    return ints.reduce((a, b) => lcm2(a, b), 1);

    /** 2数の非負の最小公倍数
     * @param {number} a 整数
     * @param {number} b 整数
     * @returns {number} 非負の最小公倍数
     */
    function lcm2(a, b) {
        if (a*b === 0) return 0;
        return Math.abs(a*b) / gcd(a, b);
    }
}

/** 整数の商(quotient)
 * @param {number} a 被除数
 * @param {number} b 除数
 * @returns {number} 商
 */
export function div(a, b) {
    return Math.trunc(a/b);
}

/** 正の剰余(modulo)
 * @param {number} a 被除数
 * @param {number} b 正の除数
 * @returns {number} 正の剰余
 */
export function mod(a, b) {
    return (a % b + b) % b;
}

/** 整数のべき乗(二乗法)
 * @param {number} a 整数
 * @param {number} b 非負整数
 * @returns {number} 整数のべき乗
 */
export function ipow(a, b) {
    let p = 1;
    while (b > 0) {
        if (b%2 !== 0) {
            p *= a;
        }
        a *= a;
        b /= 2;
    }
    return p;
}

/** 整数の平方根
 * @param {number} a 非負整数
 * @returns {number} 整数の平方根
 */
export function isqrt(a) {
    if (a <= 0) return 0;
    let r = Math.sqrt(a);
    while ((r+1)*(r+1) <= a) r++;
    while (r*r > a) r--;
    return r;
}

/** xがいずれかと等価かどうか
 * - `x === a || x === b || ...`
 * @param {any} x 検査対象
 * @param {any[]} values 検査集合
 * @returns {boolean} いずれかと等価かどうか
 */
export function isEqOr(x, ...values) {
    return values.includes(x);
}

/** 範囲内判定(半開区間)
 * @param {number} val 数値
 * @param {number} min 下限(包括)
 * @param {number} max 上限(排他)
 * @returns {boolean} 範囲内かどうか
 */
export function isInRange(val, min, max) {
    return min <= val && val < max;
}

/** 範囲内判定(閉区間)
 * @param {number} val 数値
 * @param {number} min 下限(包括)
 * @param {number} max 上限(包括)
 * @returns {boolean} 範囲内かどうか
 */
export function isBetween(val, min, max) {
    return min <= val && val <= max;
}

/** 範囲内固定
 * @param {number} val 既定数値
 * @param {number} min 下限(包括)
 * @param {number} max 上限(包括)
 * @returns {number} 範囲内数値
 */
export function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

/** 任意桁で四捨五入
 * @description 10のdigit-1乗の桁を四捨五入し10のdigit乗の桁に丸める
 * @param {number} value 数値
 * @param {number} digit 整数
 * @returns {number} 四捨五入値
 */
export function roundDigit(value, digit) {
    const pow10 = ipow(10, digit);
    return Math.round(value/pow10) * pow10;
}

/** pythonのrange関数相当
 * @param {number} start 初項(包括)
 * @param {number} end 末項(排他)
 * @param {number} [step=1] 公差
 * @returns {number[]} 初項start公差stepの等差数列
 */
export function range(start, end, step = 1) {
    const num = Math.trunc((end-start+step-Math.sign(step))/step);
    return [...Array(num)].map((_, i) => i*step + start);
}

/** pythonのrange関数相当(省略形)
 * @param {number} num 項数
 * @returns {number[]} 初項0項数numの等差整数列
 */
export function rangeInt(num) {
    return [...Array(num).keys()];
}

/** 閉区間指定のrangeInt
 * @param {number} first 初項(包括)
 * @param {number} last 末項(包括)
 * @returns {number[]} 初項first末項lastの等差整数列
 */
export function rangeIntAll(first, last) {
    const s = (last-first >= 0) ?1 :-1;
    const f = first;
    const l = last+s;
    return range(f, l, s);
}

/** 2次元のrangeInt
 * @param {number} iNum 第2次元項数
 * @param {number} jNum 第1次元項数
 * @returns {number[][]} 初項0項数iNumの等差整数列と初項0項数jNumの等差整数列の直積
 */
export function range2Int(iNum, jNum) {
    return [...Array(iNum*jNum)].map((_, ij) => {
        const i = Math.trunc(ij/jNum);
        const j = ij%jNum;
        return [i, j];
    });
}

/** 2次元の閉区間指定のrangeInt
 * @param {number} iFirst 第2次元初項(包括)
 * @param {number} iLast 第2次元末項(包括)
 * @param {number} jFirst 第1次元初項(包括)
 * @param {number} jLast 第1次元末項(包括)
 * @returns {number[][]} 初項iFirst末項iLastの等差整数列と初項jFirst末項jLastの等差整数列の直積
 */
export function range2IntAll(iFirst, iLast, jFirst, jLast) {
    const s1 = (iLast-iFirst >= 0) ?1 :-1;
    const f1 = iFirst;
    const l1 = iLast+s1;
    const n1 = (l1-f1)*s1;
    const s2 = (jLast-jFirst >= 0) ?1 :-1;
    const f2 = jFirst;
    const l2 = jLast+s2;
    const n2 = (l2-f2)*s2;
    return [...Array(n1*n2)].map((_, ij) => {
        const i = Math.trunc(s1*ij/n2) + iFirst;
        const j = s2*ij%n2 + jFirst;
        return [i, j];
    });
}

/** 国コード取得
 * @returns {string} 国コード
 */
export function getCountryCode() {
    //#region ローカルの言語コードから推測する
    // const regionCode = new Intl.Locale(navigator.language).region;  // ローカルの言語コードに付随している国コード
    // const countryCode = regionCode;
    //#endregion

    //#region ローカルのタイムゾーンから推測する
    // const timeZoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;  // ローカルのタイムゾーン
    // const countryCode = TIMEZONE[timeZoneName].c[0];
    //#endregion

    //#region ローカルの言語コードとタイムゾーンから推測する
    const regionCode = new Intl.Locale(navigator.language).region;  // ローカルの言語コードに付随している国コード
    const timeZoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;  // ローカルのタイムゾーン
    // const timeZoneName = Temporal.Now.timeZoneId();  // ローカルのタイムゾーン  // Temporal版
    const countryCode = TIMEZONE[timeZoneName].c.includes(regionCode) ?regionCode :TIMEZONE[timeZoneName].c[0];
    //#endregion

    //#region パブリックIPアドレス(API)から特定する
    // // const url = "https://ipinfo.io/json";
    // const url = "https://ipapi.co/json";
    // const response = await window.fetch(url);
    // const json = await response.json();
    // const countryCode = json.country;
    //#endregion

    return countryCode;
}

/** 国名取得
 * @description 国コードから取得する
 * @returns {string} 国名
 */
export function getCountryName() {
    const countryCode = getCountryCode();
    const countryName = COUNTRY[countryCode];
    return countryName;
}
