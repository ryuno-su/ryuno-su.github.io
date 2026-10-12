window.addEventListener("DOMContentLoaded", async () => {
"use strict";  // 厳格モード
// console.trace("DOMContentLoaded");  // デバッグ用

/** 自作ライブラリ */
// const Library = await import("../library/library.js");  // デバッグ用
const Library = await import("../library/library.min.js");

/** div#result-area */
const DOMResult = Library.deepFreeze({
    countdown1: {
        name    : document.querySelector("div#result-area div.countdown1 > div.name"),
        nameText: document.querySelector("div#result-area div.countdown1 > div.name-text"),
        day     : document.querySelector("div#result-area div.countdown1 > div.day"),
        time    : document.querySelector("div#result-area div.countdown1 > div.time"),
    },
    countdown2: {
        name    : document.querySelector("div#result-area div.countdown2 > div.name"),
        nameText: document.querySelector("div#result-area div.countdown2 > div.name-text"),
        day     : document.querySelector("div#result-area div.countdown2 > div.day"),
        time    : document.querySelector("div#result-area div.countdown2 > div.time"),
    },
    live: {
        name    : document.querySelector("div#result-area div.live > div.name"),
        nameText: document.querySelector("div#result-area div.live > div.name-text"),
        day     : document.querySelector("div#result-area div.live > div.day"),
        time    : document.querySelector("div#result-area div.live > div.time"),
    }
});
const DOMFull = document.querySelector("button#full");
const DOMPopup = document.querySelector("button#popup");
const DOMSlide = document.querySelector("button#slide");

/** div#edit-area */
const DOMEdit = Library.deepFreeze({
    countdown1: {
        name    : document.querySelector("div#edit-area li.countdown1 > input#name1"),
        nameText: document.querySelector("div#edit-area li.countdown1 > input#name-text1"),
        date    : document.querySelector("div#edit-area li.countdown1 > input#date1"),
    },
    countdown2: {
        name    : document.querySelector("div#edit-area li.countdown2 > input#name2"),
        nameText: document.querySelector("div#edit-area li.countdown2 > input#name-text2"),
        date    : document.querySelector("div#edit-area li.countdown2 > input#date2"),
    },
});
const DOMUrlSavedParameter = document.querySelector("a#url-saved-parameter");
const DOMCopy = document.querySelector("button#copy");

/** パラメータ既定値 */
const DEFAULT_PARAMETERS = Library.deepFreeze({
    countdown1: {
        name    : "TODO名1" ,  // TODO名
        nameText: "TODO-name1" ,  // TODO英語名
        date    : new Date().localDate().toISOStringSlice("YYYY-MM-DDThh:mm:ss"),  // 期限日時
        // date    : Temporal.Now.plainDateTimeISO().toISOStringSlice("YYYY-MM-DDThh:mm:ss"),  // Temporal版
    },
    countdown2: {
        name    : "TODO名2" ,  // TODO名
        nameText: "TODO-name2" ,  // TODO英語名
        date    : new Date().localDate().toISOStringSlice("YYYY-MM-DDThh:mm:ss"),  // 期限日時
        // date    : Temporal.Now.plainDateTimeISO().toISOStringSlice("YYYY-MM-DDThh:mm:ss"),  // Temporal版
    },
});

//#region URLクエリ デバッグ用
/*
?name1=梗概集提出期限&name-text1=Deadline For Submitting Abstracts&date1=2030-01-19T16:51:52&name2=卒業論文提出期限&name-text2=Deadline For Submission Of Papers&date2=2031-01-30T20:21:52
http://127.0.0.1:5500/yashima/yashima.html?name1=梗概集提出期限&name-text1=Deadline For Submitting Abstracts&date1=2030-01-19T16:51:52&name2=卒業論文提出期限&name-text2=Deadline For Submission Of Papers&date2=2031-01-30T20:21:52
http://127.0.0.1:5500/yashima/yashima.html?name1=%E6%A2%97%E6%A6%82%E9%9B%86%E6%8F%90%E5%87%BA%E6%9C%9F%E9%99%90&name-text1=Deadline+For+Submitting+Abstracts&date1=2026-06-01T16%3A51%3A52&name2=%E5%8D%92%E6%A5%AD%E8%AB%96%E6%96%87%E6%8F%90%E5%87%BA%E6%9C%9F%E9%99%90&name-text2=Deadline+For+Submission+Of+Papers&date2=2026-06-11T20%3A21%3A52
https://ryuno-su.github.io/yashima/yashima.html?name1=%E6%A2%97%E6%A6%82%E9%9B%86%E6%8F%90%E5%87%BA%E6%9C%9F%E9%99%90&name-text1=Deadline+For+Submitting+Abstracts&date1=2026-06-01T16%3A51%3A52&name2=%E5%8D%92%E6%A5%AD%E8%AB%96%E6%96%87%E6%8F%90%E5%87%BA%E6%9C%9F%E9%99%90&name-text2=Deadline+For+Submission+Of+Papers&date2=2026-06-11T20%3A21%3A52
*/
//#endregion

//#region パラメータ既定値 デバッグ用
/*
const DEFAULT_PARAMETERS = Library.deepFreeze({
    countdown1: {
        name    : "梗概集提出期限",  // TODO名
        nameText: "Deadline For Submitting Abstracts",  // TODO英語名
        date    : new Date(
                    new Date().localDate().getTime() + new Date("1970-01-19T16:51:52").getTime()
                  )
                  .localDate()
                  .toISOStringSlice("YYYY-MM-DDThh:mm:ss"),  // 期限日時
    },
    countdown2: {
        name    : "卒業論文提出期限",  // TODO名
        nameText: "Deadline For Submission Of Papers",  // TODO英語名
        date    : new Date(
                    new Date().localDate().getTime() + new Date("1970-01-30T20:21:52").getTime()
                  )
                  .localDate()
                  .toISOStringSlice("YYYY-MM-DDThh:mm:ss"),  // 期限日時
    },
});
*/
//#endregion

/** URLクエリパラメータ用 */
let URL_PARAMETERS = window.structuredClone(DEFAULT_PARAMETERS);

/** パラメータ設定検証用 */
let PARAMETERS = window.structuredClone(DEFAULT_PARAMETERS);

// 期限日時
let date1 = new Date();
let date2 = new Date();
// let date1 = new Temporal.PlainDateTime(0, 1, 1);  // Temporal版
// let date2 = new Temporal.PlainDateTime(0, 1, 1);  // Temporal版

// エントリー
main();

/** メイン
 * @description DOM要素にイベントリスナーを登録する
 */
function main() {
    // console.trace("main");  // デバッグ用

    const DOMResultArea = document.querySelector("div#result-area");
    const DOMEditArea = document.querySelector("div#edit-area");  // バブリング用

    // 既定初期化
    document.documentElement.scrollIntoView();  // ページ上端にスクロール
    defineParameter();
    initialize();

    // アクセス元の国名
    //#region 外部APIを使う(非同期)
    /*
    (async () => {
        // const url = "https://ipinfo.io/json";
        const url = "https://ipapi.co/json";
        let countryCode = "JP";
        try {
            const response = await window.fetch(url);
            if (!response.ok) {
                throw new Error(response.status);
            }
            const json = await response.json();
            countryCode = json.country;
        } catch (error) {
            console.error(error.message);
        }
        const countryNameJa = new Intl.DisplayNames(["ja"], {type: "region"}).of(countryCode);
        const countryNameEn = new Intl.DisplayNames(["en"], {type: "region"}).of(countryCode);
        DOMResult.live.name.textContent = `${countryNameJa}標準時`;
        DOMResult.live.nameText.textContent = `${countryNameEn} Standard Time`;
    })();
    */
    //#endregion
    const countryCode = Library.getCountryCode();
    const countryNameJa = new Intl.DisplayNames(["ja"], {type: "region"}).of(countryCode);
    const countryNameEn = new Intl.DisplayNames(["en"], {type: "region"}).of(countryCode);
    DOMResult.live.name.textContent = `${countryNameJa}標準時`;
    DOMResult.live.nameText.textContent = `${countryNameEn} Standard Time`;

    // URLクエリ初期化
    parseUrlQuery();
    urlQueryParameter();
    if (validateParameter()) {
        initialize();
        appendUrlQuery();
    }

    // 一定時間毎に更新
    const intervalMsec = 200;
    update();
    window.setInterval(() => {
        update();
    }, intervalMsec);

    // パラメータ設定検証
    DOMEditArea.addEventListener("input", (event) => {
        // console.trace("edit-area input");  // デバッグ用

        event.target.focus();  // イベント対象にフォーカス

        if (!validateParameter()) return;
        initialize();
        appendUrlQuery();
    });

    // 全画面表示
    DOMFull.addEventListener("click", (event) => {
        // console.trace("full click");  // デバッグ用

        event.currentTarget.focus();  // イベント対象にフォーカス

        // 全画面表示が未対応なら無効
        if (!document.fullscreenEnabled) {
            window.alert("This browser does not support fullscreen.");
            return;
        }

        if (document.fullscreenElement === null) {  // 全画面化
            DOMResultArea.requestFullscreen();
            // document.documentElement.requestFullscreen();  // F11キー模倣
        } else {  // 解除
            document.exitFullscreen();
        }
    });

    // 新規ポップアップウィンドウ表示
    DOMPopup.addEventListener("click", (event) => {
        // console.trace("popup click");  // デバッグ用

        event.currentTarget.focus();  // イベント対象にフォーカス

        // モバイル端末なら無効
        if (Library.isMobileDevice()) {
        // if (event.pointerType === "touch") {
            window.alert("This browser does not support popup.");
            return;
        }

        window.open("#", "_blank", "popup,noopener,noreferrer");  // 新規ポップアップウィンドウ

        //#region 複数ポップアップタイル
        /*
        // ポップアップのブロック解除必須
        // console.log(`screen.width = ${screen.width}`);  // デバッグ用
        // console.log(`screen.height = ${screen.height}`);  // デバッグ用

        const [Nj, Ni] = [2, 2];  // ポップアップの個数
        const [BAR_WIDTH, BAR_HEIGHT] = [0, 65];  // 上端の(タイトル+アドレス)バーの縦幅
        const [WIDTH, HEIGHT] = [screen.width-BAR_WIDTH, screen.height-BAR_HEIGHT];  // 際上端の(タイトル+アドレス)バーを除外した領域
        for (const [i, j] of Library.range2Int(Ni, Nj).toReversed()) {  // 下から表示
            const [innerWidth, innerHeight] = [WIDTH/Nj, HEIGHT/Ni];  // タイマー画面の領域
            const [outerWidth, outerHeight] = [innerWidth, innerHeight+BAR_HEIGHT];  // ポップアップウィンドウの領域
            const [offsetW, offsetH] = [14.5, 86.5];  // 領域の負の補正
            const [width, height] = [outerWidth-offsetW, outerHeight-offsetH];  // 補正ポップアップウィンドウの領域
            const [x, y] = [outerWidth*j, outerHeight*i];  // ポップアップウィンドウの始点
            const [offsetX, offsetY] = [5, BAR_HEIGHT];  // 始点の負の補正
            const [left, top] = [x-offsetX, y-offsetY];  // 補正ポップアップウィンドウの始点

            const area = `width=${width},height=${height},left=${left},top=${top}`;  // ウィンドウの領域と始点
            const features = `popup,noopener,noreferrer,${area}`;  // ウィンドウの特性
            // const features = `popup,${area}`;  // ウィンドウの特性  // デバッグ用
            const popup = window.open("#", "_blank", features);  // 新規ポップアップウィンドウ
            // 寸法(width,height)と位置(left,top)は自動で修正される
            // - 画面外に配置することはできない
            // - 寸法(width,height)は指定より大きくなる傾向にある

            // // デバッグ用
            // window.setTimeout(() => {
            //     popup.close();
            // }, 10000);

            // console.log(features);  // デバッグ用
            // console.log(`popup.innerWidth = ${popup.innerWidth}`);  // デバッグ用
            // console.log(`popup.innerHeight = ${popup.innerHeight}`);  // デバッグ用
            // console.log(`popup.outerWidth = ${popup.outerWidth}`);  // デバッグ用
            // console.log(`popup.outerHeight = ${popup.outerHeight}`);  // デバッグ用
        }
        */
        //#endregion
    });

    // タイマー画面位置にスライド
    DOMSlide.addEventListener("click", (event) => {
        // console.trace("slide click");  // デバッグ用

        event.currentTarget.focus();  // イベント対象にフォーカス

        DOMResultArea.scrollIntoView();  // タイマー画面上端にスクロール
    });

    // パラメータ保存済みURLコピー
    DOMCopy.addEventListener("click", (event) => {
        // console.trace("copy click");  // デバッグ用

        event.currentTarget.focus();  // イベント対象にフォーカス

        // コピー
        navigator.clipboard.writeText(DOMUrlSavedParameter.href);

        // 一定時間だけ変更
        const timeoutMsec = 1500;
        DOMCopy.textContent = "COPIED";
        window.setTimeout(() => {
            DOMCopy.textContent = "COPY";
        }, timeoutMsec);
    });

    // ショートカットキー設定
    document.addEventListener("keydown", (event) => {
        // console.trace("document keydown");  // デバッグ用

        // フォーカス中(テキスト入力中)なら無効
        const DOMFocused = document.activeElement;
        const isFocused = DOMFocused.matches('input:is([type="text"], [type="number"]), textarea');
        if (isFocused) return;

        // 修飾キーは無効
        if (event.altKey) return;
        if (event.ctrlKey) return;
        if (event.metaKey) return;
        if (event.shiftKey) return;

        // // 長押しは無効
        // if (event.repeat) return;

        switch (event.key) {
            case "/":  // 最上位のウィジェットにフォーカス
                const DOMFirstWidget = document.querySelector(":is(input, textarea, button, select):not(:disabled)");
                DOMFirstWidget.focus();
                break;
            case "f":  // 全画面表示
                DOMFull.click();
                break;
            case "p":  // 新規ポップアップウィンドウ表示
                DOMPopup.click();
                break;
            case "s":  // 盤面位置にスライド
                DOMSlide.click();
                break;
            case "c":  // パラメータ保存済みURLコピー
                DOMCopy.click();
                break;
            default:
                break;
        }
    });
}

/** 初期化群 */
function initialize() {
    // console.trace("initialize");  // デバッグ用

    // countdown2がすべて空なら非表示
    const isEmptyCountdown2 = Object.values(DOMEdit.countdown2).every((DOMKey) => DOMKey.value === "");
    const DOMResultCountdown2 = document.querySelectorAll("div#result-area div.countdown2");
    if (isEmptyCountdown2) {
        DOMResultCountdown2.forEach((DOMKey) => DOMKey.classList.replace("shown", "hidden"));
    } else {
        DOMResultCountdown2.forEach((DOMKey) => DOMKey.classList.replace("hidden", "shown"));
    }

    // 初期化
    init();

    // 非更新データ
    DOMResult.countdown1.name.textContent = PARAMETERS.countdown1.name;
    DOMResult.countdown1.nameText.textContent = PARAMETERS.countdown1.nameText;
    DOMResult.countdown2.name.textContent = PARAMETERS.countdown2.name;
    DOMResult.countdown2.nameText.textContent = PARAMETERS.countdown2.nameText;
}

/** URLクエリ抽出 */
function parseUrlQuery() {
    // console.trace("parseUrlQuery");  // デバッグ用

    const searchParams = new URLSearchParams(location.search);

    DOMEdit.forEach((DOMCountdown, countdown) => {
        DOMCountdown.forEach((DOMKey, key) => {
            const id = DOMKey.id;
            if (!searchParams.has(id)) return;
            URL_PARAMETERS[countdown][key] = searchParams.get(id);
        });
    });

    Library.deepFreeze(URL_PARAMETERS);
    // console.log(URL_PARAMETERS);  // デバッグ用
}

/** URLクエリ付加 */
function appendUrlQuery() {
    // console.trace("appendUrlQuery");  // デバッグ用

    const searchParams = new URLSearchParams();

    DOMEdit.forEach((DOMCountdown, countdown) => {
        DOMCountdown.forEach((DOMKey, key) => {
            const id = DOMKey.id;
            searchParams.append(id, PARAMETERS[countdown][key]);
        });
    });

    const url = new URL(location.toString());
    url.search = searchParams.toSearchString();
    DOMUrlSavedParameter.href = url.toString();
    DOMUrlSavedParameter.textContent = url.toDecodedString();
    // DOMUrlSavedParameter.textContent = `${url.toDecodedString().replaceAll(/&|\?/g, "\n$&")}`;  // デバッグ用
}

/** パラメータ既定値設定 */
function defineParameter() {
    // console.trace("defineParameter");  // デバッグ用

    DOMEdit.forEach((DOMCountdown, countdown) => {
        DOMCountdown.forEach((DOMKey, key) => {
            DOMKey.value = DEFAULT_PARAMETERS[countdown][key];
        });
    });
    PARAMETERS = window.structuredClone(DEFAULT_PARAMETERS);
}

/** パラメータURLクエリ設定 */
function urlQueryParameter() {
    // console.trace("urlQueryParameter");  // デバッグ用

    DOMEdit.forEach((DOMCountdown, countdown) => {
        DOMCountdown.forEach((DOMKey, key) => {
            DOMKey.value = URL_PARAMETERS[countdown][key];
            // DOMKey.value += ":00";  // デバッグ用
            // console.log(DOMKey.value, URL_PARAMETERS[countdown][key]);  // デバッグ用
        });
    });
}

/** パラメータ設定検証 */
function validateParameter() {
    // console.trace("validateParameter");  // デバッグ用

    let isValidAll = true;  // すべて制約を満たすかどうか

    DOMEdit.forEach((DOMCountdown, countdown) => {
        DOMCountdown.forEach((DOMKey, key) => {
            const value = DOMKey.value;
            const validity = DOMKey.validity;

            if (key !== "date") {
                PARAMETERS[countdown][key] = value;
            } else {
                // const valueNum = new Date(value).getTime();  // validate前のvalueをnew Date()してしまっている
                // const minNum = new Date(DOMKey.min).getTime();
                // const maxNum = new Date(DOMKey.max).getTime();
                const patternReg = new RegExp(DOMKey.pattern);
                // // console.log(value, validity.valid, valueNum, minNum, maxNum, patternReg, patternReg.test(value));  // デバッグ用

                DOMKey.setCustomValidity("");
                if (validity.valid) {
                // if (validity.valid && patternReg.test(value)) {  // 0001-02-03T00:00:00と入力してもvalueは0001-02-03T00:00になってしまう
                // if (validity.valid && minNum <= valueNum && valueNum <= maxNum) {  // 0000と入力してもvalueは0001になってしまう
                // if (validity.valid && patternReg.test(value) && minNum <= valueNum && valueNum <= maxNum) {
                    PARAMETERS[countdown][key] = (value === "") ?DEFAULT_PARAMETERS[countdown][key] :value;
                } else {
                    isValidAll = false;
                    DOMKey.setCustomValidity("invalid");
                    if (validity.badInput) {
                        DOMKey.setCustomValidity("invalid: badInput");
                    } else if (validity.valueMissing) {
                        DOMKey.setCustomValidity("invalid: valueMissing");
                    } else if (validity.tooLong) {
                        DOMKey.setCustomValidity("invalid: tooLong");
                    } else if (validity.tooShort) {
                        DOMKey.setCustomValidity("invalid: tooShort");
                    }
                }
            }
        });
    });

    return isValidAll;
}

/** 初期化 */
function init() {
    // console.trace("init");  // デバッグ用

    date1 = new Date(PARAMETERS.countdown1.date);
    date2 = new Date(PARAMETERS.countdown2.date);
    // date1 = Temporal.PlainDateTime.from(PARAMETERS.countdown1.date);  // Temporal版
    // date2 = Temporal.PlainDateTime.from(PARAMETERS.countdown2.date);  // Temporal版
}

/** 更新 */
function update() {
    // console.trace("update");  // デバッグ用

    // 現在時刻
    const now = new Date();
    // const now = Temporal.Now.plainDateTimeISO();  // Temporal版
    // 猶予期間
    const until1 = new Date(Math.max(date1.getTime() - now.getTime(), 0));  // カウントダウン終了後は0
    const until2 = new Date(Math.max(date2.getTime() - now.getTime(), 0));  // カウントダウン終了後は0
    const day1 = Math.trunc(until1.getTime() / Library.TIME.MSEC_PAR_DAY);
    const day2 = Math.trunc(until2.getTime() / Library.TIME.MSEC_PAR_DAY);
    //#region Temporal版
    // const until1 = (Temporal.PlainDateTime.compare(date1, now) > 0) ?now.until(date1) :new Temporal.Duration();  // カウントダウン終了後は0
    // const until2 = (Temporal.PlainDateTime.compare(date2, now) > 0) ?now.until(date2) :new Temporal.Duration();  // カウントダウン終了後は0
    // const day1 = until1.days;
    // const day2 = until2.days;
    //#endregion

    // 更新
    DOMResult.countdown1.day.textContent = String(day1).padStart(2, "0");
    DOMResult.countdown1.time.textContent = until1.toISOStringSlice("hh:mm:ss");
    DOMResult.countdown2.day.textContent = String(day2).padStart(2, "0");
    DOMResult.countdown2.time.textContent = until2.toISOStringSlice("hh:mm:ss");
    DOMResult.live.day.textContent = now.localDate().toISOStringSlice("MM-DD");
    DOMResult.live.time.textContent = now.localDate().toISOStringSlice("hh:mm:ss");
    //#region Temporal版
    // const base = Temporal.PlainDateTime.from("0000-01-01T00:00:00");
    // DOMResult.countdown1.day.textContent = String(day1).padStart(2, "0");
    // DOMResult.countdown1.time.textContent = base.add(until1).toISOStringSlice("hh:mm:ss");
    // DOMResult.countdown2.day.textContent = String(day2).padStart(2, "0");
    // DOMResult.countdown2.time.textContent = base.add(until2).toISOStringSlice("hh:mm:ss");
    // DOMResult.live.day.textContent = now.toISOStringSlice("MM-DD");
    // DOMResult.live.time.textContent = now.toISOStringSlice("hh:mm:ss");
    //#endregion
}
});

window.addEventListener("pageshow", (event) => {
    // console.trace("pageshow");  // デバッグ用

    // ブラウザバックでページ表示した時
    const isPersisted = event.persisted;
    const isBackForward = performance.getEntriesByType("navigation")[0].type === "back_forward";
    // console.log(`isPersisted = ${isPersisted}`);  // デバッグ用
    // console.log(`isBackForward = ${isBackForward}`);  // デバッグ用
    if (isPersisted || isBackForward) {
        location.reload();  // 強制再読み込み
    }
});
