window.addEventListener("DOMContentLoaded", async () => {
"use strict";  // 厳格モード
// console.trace("DOMContentLoaded");  // デバッグ用

/** 自作ライブラリ */
// const Library = await import("../library/library.js");  // デバッグ用
const Library = await import("../library/library.min.js");

// div#template-area
const DOMTemplate = document.querySelector("template#template-area").content;
const DOMTemplateCells = DOMTemplate.querySelectorAll("svg.cell");
const DOMTemplateHighlights = DOMTemplate.querySelectorAll("svg.highlight");
const DOMTemplateAssists = DOMTemplate.querySelectorAll("svg.assist");
const DOMTemplateColors = DOMTemplate.querySelectorAll("span.color-text");
// details#parameter-area
const DOM_PARAMETERS = Object.freeze({
    COLOR_NUM   : document.querySelector("select#COLOR_NUM"),
    BOARD_WIDTH : document.querySelector("input#BOARD_WIDTH"),
    BOARD_HEIGHT: document.querySelector("input#BOARD_HEIGHT"),
    TURN_NUM    : document.querySelector("select#TURN_NUM"),
    AI_LIST     : document.querySelectorAll("ul#AI_LIST input"),
    AI_LEVEL    : document.querySelector("select#AI_LEVEL"),
    DELAY_MSEC  : document.querySelector("select#DELAY_MSEC"),
    LUCKY_MODE  : document.querySelector("input#LUCKY_MODE"),
    HAND_MODE   : document.querySelector("input#HAND_MODE"),
    REVIVE_MODE : document.querySelector("input#REVIVE_MODE"),
});
const DOMAIAll = document.querySelector("label#ai-all");
const DOMEnter = document.querySelector("button#enter");
const DOMDefault = document.querySelector("button#default");
const DOMSlide = document.querySelector("button#slide");
// div#board-area
const DOMBoard = document.querySelector("table#board");
// div#button-area
const DOMAssist = document.querySelector("button#assist");
const DOMHint = document.querySelector("button#hint");
const DOMReset = document.querySelector("button#reset");
// div#info-area
const DOMTurn = document.querySelector("div#turn");
const DOMMessage = document.querySelector("div#message");
const DOMWait = document.querySelector("div#wait");
const DOMResult = document.querySelector("div#result");
const DOMLog = document.querySelector("div#log");

/** パラメータ既定値 */
const DEFAULT_PARAMETERS = Object.freeze({
    COLOR_NUM   : 2    ,  // 対局人数
    BOARD_WIDTH : 8    ,  // 盤面横幅
    BOARD_HEIGHT: 8    ,  // 盤面縦幅
    TURN_NUM    : 1    ,  // 1手番当たりの手数
    AI_LIST     : []   ,  // AI手番
    AI_LEVEL    : 3    ,  // AIレベル
    DELAY_MSEC  : 500  ,  // 待機時間[ms]
    LUCKY_MODE  : false,  // ラッキー(個数重み付け)マス有りモードかどうか
    HAND_MODE   : false,  // 初期配置を手動で行うかどうか
    REVIVE_MODE : false,  // パスのとき1マス置くかどうか
});

/** パラメータ設定検証用 */
let PARAMETERS = window.structuredClone(DEFAULT_PARAMETERS);
let COLOR_NUM_PLUS = 0;  // 番兵含む対局人数
let TURN_NUM = 0;  // 1手番当たりの手数復元用
let HAND_MODE = false;  // 初期配置手動モード復元用

// 色
const COLOR_TEXT = Object.freeze([...DOMTemplateColors].map((DOMColor) => DOMColor.textContent.toUpperCase()));
const COLOR_ID = Object.freeze(Library.createEnum(...COLOR_TEXT));

// 進捗
const PHASE_ID = Object.freeze(Library.createEnum(
    "EARLY",
    "MID",
    "LATE",
    "NUM",
));
let PASS_MAX = 0;  // あり得る最大パス回数
let STEP_MAX = 0;  // 終局手数
let step = 0;  // 試合進捗(パス含む手数)
// let passCount = 0;  // パス回数 デバッグ用

let board = [];  // 盤面
let scoreBoard = [];  // 盤面評価値
let virtualBoard = [];  // AI先読み用盤面
let weightBoard = [];  // 個数重み付け
let DOMBoardCells = [];  // 描画用盤面
let turn = 0;  // 手番
let turnCount = 0;  // 手数
let isInput = false;  // パラメータ編集済みかどうか
let isEntered = false;  // パラメータ確定済みかどうか
let isInAssist = false;  // アシスト表示中かどうか
let isInHint = false;  // ヒント表示中かどうか
let isGameOver = false;  // ゲームオーバーかどうか
let isPassTurn = false;  // パスかどうか
let isAITurn = false;  // AIが操作中かどうか
let isOnlyAI = false;  // AIvsAIかどうか
let record = "";  // 棋譜
let intervalID = 0;  // タイマーのclear用
let INIT_NUM = 0;  // 各色の初期配置個数
let INIT_AREA = {};  // 初期配置範囲4端点

// エントリー
main();

/** メイン
 * @description DOM要素にイベントリスナーを登録する
 */
function main() {
    // console.trace("main");  // デバッグ用

    const DOMParameterArea = document.querySelector("details#parameter-area");  // バブリング用
    const DOMBoardArea = document.querySelector("div#board-area");
    const DOMLogArea = document.querySelector("details#log-area");

    // 既定初期化
    document.documentElement.scrollIntoView();  // ページ上端にスクロール
    initialize(false);  // 新規作成しない(手書きHTMLを使う)

    // パラメータ設定検証
    DOMParameterArea.addEventListener("input", (event) => {
        // console.trace("parameter-area input");  // デバッグ用

        event.target.focus();  // イベント対象にフォーカス

        if (!validateParameter()) return;
        initialize();

        if (!isInput) {
            isInput = true;
            DOMTurn.classList.replace("shown", "hidden");

            // 無効化
            DOMAssist.disabled = true;
            DOMHint.disabled = true;
        }
    });

    // AI手番全色選択/解除
    DOMAIAll.addEventListener("click", (() => {
        let isAIAll = true;  // トグル用

        return (event) => {
            // console.trace("ai-all click");  // デバッグ用

            // AI手番が選択無効なら無効
            if (DOM_PARAMETERS.AI_LIST[0].disabled) return;

            event.preventDefault();  // デフォルトのクリックを抑止する

            for (const i of Library.rangeInt(PARAMETERS.COLOR_NUM)) {
                DOM_PARAMETERS.AI_LIST[i].checked = isAIAll;
            }
            isAIAll ^= true;
            DOM_PARAMETERS.AI_LIST[0].focus();

            DOMParameterArea.dispatchEvent(new Event("input"));
        };
    })());

    // パラメータ設定確定
    DOMEnter.addEventListener("click", async (event) => {
        // console.trace("enter click");  // デバッグ用

        event.currentTarget.focus();  // イベント対象にフォーカス

        await enter();
    });

    // パラメータ設定初期化
    DOMDefault.addEventListener("click", (event) => {
        // console.trace("default click");  // デバッグ用

        event.currentTarget.focus();  // イベント対象にフォーカス

        defineParameter();
        initialize();
        isInput = false;
        DOMTurn.classList.replace("hidden", "shown");

        // 有効化
        DOMAssist.disabled = false;
        DOMHint.disabled = false;
    });

    // 盤面位置にスライド
    DOMSlide.addEventListener("click", (event) => {
        // console.trace("slide click");  // デバッグ用

        event.currentTarget.focus();  // イベント対象にフォーカス

        DOMBoardArea.scrollIntoView();  // 盤面上端にスクロール
    });

    // アシスト表示/非表示
    DOMAssist.addEventListener("click", async (event) => {
        // console.trace("assist click");  // デバッグ用

        event.currentTarget.focus();  // イベント対象にフォーカス

        // パラメータがデフォルト値なら設定確定
        if (!isInput && !isEntered) {
            await enter();
        }

        assist(turn, !isInAssist);
    });

    // ヒント表示/非表示
    DOMHint.addEventListener("click", async (event) => {
        // console.trace("hint click");  // デバッグ用

        event.currentTarget.focus();  // イベント対象にフォーカス

        // パラメータがデフォルト値なら設定確定
        if (!isInput && !isEntered) {
            await enter();
        }

        hint(!isInHint);
    });

    // リセット
    DOMReset.addEventListener("click", (event) => {
        // console.trace("reset click");  // デバッグ用

        event.currentTarget.focus();  // イベント対象にフォーカス

        // 対局中なら確認を求める
        const isInGame = isEntered && !isGameOver;
        if (isInGame) {
            if (!window.confirm("Realy reset?")) return;
        }

        document.documentElement.scrollIntoView();  // ページ上端にスクロール

        if (isInput) {
            DOMTurn.classList.replace("shown", "hidden");

            // 無効化
            DOMAssist.disabled = true;
            DOMHint.disabled = true;
        } else {
            DOMTurn.classList.replace("hidden", "shown");

            // 有効化
            DOMAssist.disabled = false;
            DOMHint.disabled = false;
        }

        reset();

        if (isInGame) {
            // メッセージ出力
            const message = "This game was reset.";
            DOMMessage.textContent = message;
            // ログ出力
            const log = message;
            // console.log(log);  // デバッグ用
            DOMLog.textContent += `${log}\n`;
            DOMLog.scroll(0, DOMLog.scrollHeight);  // ログ内下端にスクロール
        }
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
                if (DOMFirstWidget.matches("details#parameter-area *")) {
                    DOMParameterArea.open = true;
                }
                DOMFirstWidget.focus();
                break;
            case "p":  // パラメータ設定アコーディオン開閉切り替え
                DOMParameterArea.querySelector("summary").focus();  // アコーディオン見出しにフォーカス
                DOMParameterArea.open ^= true;
                break;
            case "e":  // パラメータ設定確定
                if (!DOMEnter.disabled) {
                    DOMEnter.click();
                }
                break;
            case "d":  // パラメータ設定初期化
                if (!DOMDefault.disabled) {
                    DOMDefault.click();
                }
                break;
            case "s":  // 盤面位置にスライド
                DOMSlide.click();
                break;
            case "a":  // アシスト表示/非表示切り替え
                if (!DOMAssist.disabled) {
                    DOMAssist.click();
                }
                break;
            case "h":  // ヒント表示/非表示切り替え
                if (!DOMHint.disabled) {
                    DOMHint.click();
                }
                break;
            case "r":  // リセット
                if (!DOMReset.disabled) {
                    DOMReset.click();
                }
                break;
            case "l":  // ログアコーディオン開閉切り替え
                DOMLogArea.querySelector("summary").focus();  // アコーディオン見出しにフォーカス
                DOMLogArea.open ^= true;
                break;
            default:
                break;
        }
    });

    // ウィンドウ離脱抑止(確認を求める)
    window.addEventListener("beforeunload", (event) => {
        // console.trace("window beforeunload");  // デバッグ用

        // 対局中でないなら確認を求めない
        const isInGame = isEntered && !isGameOver;
        if (!isInGame) return;

        event.preventDefault();  // デフォルトのウィンドウ(ページ)離脱を抑止する
    });

}

/** リセット */
function reset() {
    // console.trace("reset");  // デバッグ用

    // AI停止
    window.clearInterval(intervalID);

    // DOMTurn.classList.replace("hidden", "shown");
    DOMMessage.classList.replace("hidden", "shown");
    DOMWait.classList.replace("shown", "hidden");
    DOMResult.classList.replace("shown", "hidden");

    // 初期配置手動モード復元
    PARAMETERS.HAND_MODE = HAND_MODE;

    // 初期化
    initialize();

    // 有効化
    DOM_PARAMETERS.forEach((DOM_PARAMETER, key) => {
        if (key === "AI_LIST") {
            DOM_PARAMETER.forEach((DOM_AI_COLOR) => {
                DOM_AI_COLOR.disabled = false;
            });
            const DOM_AI_LIST = document.querySelector("ul#AI_LIST");
            DOM_AI_LIST.classList.remove("disabled");
        } else {
            if (DOM_PARAMETER.matches("option")) {
                DOM_PARAMETER = DOM_PARAMETER.parentNode;  // select
            }
            DOM_PARAMETER.disabled = false;
        }
    });
    DOMEnter.disabled = false;
    DOMDefault.disabled = false;
}

/** 初期化群
 * @param {boolean} [isNew=true] 新規作成するかどうか(描画用盤面用)
 */
function initialize(isNew = true) {
    // console.trace("initialize");  // デバッグ用

    init();
    if (!PARAMETERS.HAND_MODE) {
        setInitBoard();
    }
    setScoreBoard();
    setWeightBoard();
    createBoard(isNew);
    Object.freeze(scoreBoard);
    Object.freeze(weightBoard);
    Object.freeze(DOMBoardCells);
}

/** パラメータ既定値設定 */
function defineParameter() {
    // console.trace("defineParameter");  // デバッグ用

    DOM_PARAMETERS.forEach((DOM_PARAMETER, key) => {
        if (key === "AI_LIST") {
            DOM_PARAMETER.forEach((DOM_AI_COLOR, i) => {
                DOM_AI_COLOR.checked = false;
                const DOMAIColor = DOM_AI_COLOR.parentNode;  // li
                if (i >= DEFAULT_PARAMETERS.COLOR_NUM) {
                    DOMAIColor.classList.replace("shown", "hidden");
                } else {
                    DOMAIColor.classList.replace("hidden", "shown");
                }
            });
            DEFAULT_PARAMETERS[key].forEach((AIColor) => {
                DOM_PARAMETER[AIColor-1].checked = true;
            });
            const DOMAILevel = DOM_PARAMETERS.AI_LEVEL.parentNode;  // li
            if (DEFAULT_PARAMETERS[key].length === 0) {
                DOMAILevel.classList.replace("shown", "hidden");
            } else {
                DOMAILevel.classList.replace("hidden", "shown");
            }
        } else {
            if (DOM_PARAMETER.matches("select")) {
                const selectIndex = [...DOM_PARAMETER.options].findIndex((option) => Number(option.value) === DEFAULT_PARAMETERS[key]);
                DOM_PARAMETER = DOM_PARAMETER.options[selectIndex];
                DOM_PARAMETER.selected = true;
                DOM_PARAMETER.textContent = String(DEFAULT_PARAMETERS[key]);
                if (key === "DELAY_MSEC") {
                    DOM_PARAMETER.textContent += "ms";
                }
            }
            if (DOM_PARAMETER.matches('input[type="checkbox"]')) {
                DOM_PARAMETER.checked = DEFAULT_PARAMETERS[key];
            }
            DOM_PARAMETER.value = String(DEFAULT_PARAMETERS[key]);
        }
    });
    PARAMETERS = window.structuredClone(DEFAULT_PARAMETERS);
    isInput = false;
}

/** パラメータ設定検証 */
function validateParameter() {
    // console.trace("validateParameter");  // デバッグ用

    let isValidAll = true;  // すべて制約を満たすかどうか

    DOM_PARAMETERS.forEach((DOM_PARAMETER, key) => {
        const value = DOM_PARAMETER.value;
        const valueNum = Number(DOM_PARAMETER.value);
        const validity = DOM_PARAMETER.validity;

        if (key === "AI_LIST") {
            PARAMETERS[key] = [];
            DOM_PARAMETER.forEach((DOM_AI_COLOR, i) => {
                const DOMAIColor = DOM_AI_COLOR.parentNode;  // li
                if (i >= PARAMETERS.COLOR_NUM) {
                    DOMAIColor.classList.replace("shown", "hidden");
                    DOM_AI_COLOR.checked = false;
                } else {
                    DOMAIColor.classList.replace("hidden", "shown");
                }
                if (DOM_AI_COLOR.checked) {
                    PARAMETERS[key].push(i+1);
                }
            });
            const DOMAILevel = DOM_PARAMETERS.AI_LEVEL.parentNode;  // li
            if (PARAMETERS[key].length === 0) {
                DOMAILevel.classList.replace("shown", "hidden");
            } else {
                DOMAILevel.classList.replace("hidden", "shown");
            }
        } else if (DOM_PARAMETER.matches("select")) {
            PARAMETERS[key] = valueNum;
        } else if (DOM_PARAMETER.matches('input[type="checkbox"]')) {
            PARAMETERS[key] = DOM_PARAMETER.checked;
        } else {  // input[type="number"]
            let minNum = Number(DOM_PARAMETER.min);
            let maxNum = Number(DOM_PARAMETER.max);
            let patternReg = new RegExp(DOM_PARAMETER.pattern);
            let title = DOM_PARAMETER.title;

            if (Library.isEqOr(key, "BOARD_WIDTH", "BOARD_HEIGHT")) {
                minNum = [0,0,4,6,6,8,8,8,8][PARAMETERS.COLOR_NUM];
            }
            title = `${minNum}以上${maxNum}以下の整数を入力してください`;
            DOM_PARAMETER.setCustomValidity("");
            DOM_PARAMETER.min = String(minNum);
            DOM_PARAMETER.max = String(maxNum);
            DOM_PARAMETER.title = title;
            if (validity.valid && patternReg.test(value) && minNum <= valueNum && valueNum <= maxNum) {
                PARAMETERS[key] = valueNum;
            } else {
                isValidAll = false;
                DOM_PARAMETER.setCustomValidity("invalid");
                if (validity.badInput) {
                    DOM_PARAMETER.setCustomValidity("invalid: badInput");
                } else if (validity.valueMissing) {
                    DOM_PARAMETER.setCustomValidity("invalid: valueMissing");
                } else if (validity.rangeOverflow || valueNum > maxNum) {
                    DOM_PARAMETER.setCustomValidity("invalid: rangeOverflow");
                } else if (validity.rangeUnderflow || valueNum < minNum) {
                    DOM_PARAMETER.setCustomValidity("invalid: rangeUnderflow");
                } else if (validity.stepMismatch) {
                    DOM_PARAMETER.setCustomValidity("invalid: stepMismatch");
                }
            }
            DOM_PARAMETER.reportValidity();
        }
    });

    // パラメータのいずれかが制約を満たさないなら無効化
    DOMEnter.disabled = !isValidAll;

    return isValidAll;
}

/** 初期化 */
function init() {
    // console.trace("init");  // デバッグ用

    DOMMessage.emptyChild();  // メッセージ初期化
    DOMResult.emptyChild();  // リザルト初期化

    board = Library.createArray2D(PARAMETERS.BOARD_HEIGHT+2, PARAMETERS.BOARD_WIDTH+2, COLOR_ID.NONE);  // 外周は番兵
    scoreBoard = window.structuredClone(board);
    virtualBoard = window.structuredClone(board);
    weightBoard = window.structuredClone(board);
    DOMBoardCells = window.structuredClone(board);

    isOnlyAI = false;  // プレイヤーvsプレイヤー
    COLOR_NUM_PLUS = PARAMETERS.COLOR_NUM;
    if (PARAMETERS.AI_LIST.length === PARAMETERS.COLOR_NUM) {  // AIvsAI
        isOnlyAI = true;
        COLOR_NUM_PLUS++;  // 番兵プレイヤー
    }
    TURN_NUM = PARAMETERS.TURN_NUM;
    HAND_MODE = PARAMETERS.HAND_MODE;

    // 先手
    [turn, turnCount] = [COLOR_ID.BLACK, 0];
    const DOMTurnColor = DOMTurn.querySelector("span.color-text");
    const DOMColor = DOMTemplateColors[turn].cloneNode(true);
    DOMTurnColor.replaceWith(DOMColor);

    // isInput = false;
    isEntered = false;
    isInAssist = false;
    isInHint = false;
    isGameOver = false;
    isPassTurn = false;
    isAITurn = false;
    record = "";
    intervalID = 0;
    INIT_NUM = (Library.isEqOr(PARAMETERS.COLOR_NUM, 2, 4)) ?2 :4;
    INIT_AREA = (() => {
        const x = Math.trunc(PARAMETERS.BOARD_WIDTH/2);  // 中心
        const y = Math.trunc(PARAMETERS.BOARD_HEIGHT/2);  // 中心
        const w = Number(DOM_PARAMETERS.BOARD_WIDTH.min)-2;  // 最遠周は必ず空ける
        const h = Number(DOM_PARAMETERS.BOARD_HEIGHT.min)-2;  // 最遠周は必ず空ける
        return Object.freeze({
            WEST : x - Math.trunc(w/2) + 1,
            EAST : x - Math.trunc(w/2) + w,
            NORTH: y - Math.trunc(h/2) + 1,
            SOUTH: y - Math.trunc(h/2) + h,
        });
    })();

    const MIN_NUM = 2;  // 最小対局人数
    const CELL_MAX = PARAMETERS.BOARD_WIDTH*PARAMETERS.BOARD_HEIGHT;  // マス総数
    const COLOR_INIT_NUM = PARAMETERS.COLOR_NUM*INIT_NUM;  // 初期配置マス数
    const HAND_INIT_NUM = (PARAMETERS.HAND_MODE) ?0 :COLOR_INIT_NUM;  // 初期配置済みマス数
    const PUT_MAX = CELL_MAX-COLOR_INIT_NUM;  // 最大着手可能マス数
    const PASS_NUM_MAX = Math.max(PARAMETERS.COLOR_NUM-MIN_NUM, 1);  // 最大パス人数
    const PASS_RATIO = 0.5;  // 最大パス回数に対する予想パス回数の割合
    // const PASS_EXPECTED = PASS_RATIO*PASS_MAX;  // 予想パス回数
    const PASS_EXPECTED = PASS_RATIO*0;  // 予想パス回数
    // 最小対局人数で着手可能なマスをすべて置ききる(埋め尽くす)場合
    // 第一巡で最大パス人数が全滅する場合
    PASS_MAX = Math.trunc(PUT_MAX/MIN_NUM)*PASS_NUM_MAX;
    STEP_MAX = CELL_MAX-HAND_INIT_NUM+PASS_EXPECTED;
    step = 0;
    // passCount = 0;  // デバッグ用
}

/** 初期配置設定 */
function setInitBoard() {
    // console.trace("setInitBoard");  // デバッグ用

    // 中心4点
    const CENTER4 = Object.freeze({
        WEST : Math.trunc(PARAMETERS.BOARD_WIDTH /2)  ,
        EAST : Math.trunc(PARAMETERS.BOARD_WIDTH /2)+1,
        NORTH: Math.trunc(PARAMETERS.BOARD_HEIGHT/2)  ,
        SOUTH: Math.trunc(PARAMETERS.BOARD_HEIGHT/2)+1,
    });
    switch (PARAMETERS.COLOR_NUM) {
        case 2:
            // NW
            board[CENTER4.NORTH][CENTER4.WEST] = COLOR_ID.WHITE;
            // NE
            board[CENTER4.NORTH][CENTER4.EAST] = COLOR_ID.BLACK;
            // SW
            board[CENTER4.SOUTH][CENTER4.WEST] = COLOR_ID.BLACK;
            // SE
            board[CENTER4.SOUTH][CENTER4.EAST] = COLOR_ID.WHITE;

            //#region 最短5連続パス, 黒にパスさせる デバッグ用
            /*
            if (PARAMETERS.COLOR_NUM    === 2
             && PARAMETERS.BOARD_WIDTH  === 8
             && PARAMETERS.BOARD_HEIGHT === 8) {
                board[4][3] = COLOR_ID.BLACK;
                board[4][4] = COLOR_ID.BLACK;
                board[4][5] = COLOR_ID.BLACK;
                board[5][4] = COLOR_ID.BLACK;
                board[5][5] = COLOR_ID.BLACK;
                board[5][6] = COLOR_ID.BLACK;
                board[5][7] = COLOR_ID.BLACK;
                board[5][8] = COLOR_ID.BLACK;
                board[6][6] = COLOR_ID.WHITE;
                board[7][4] = COLOR_ID.BLACK;
                board[7][5] = COLOR_ID.BLACK;
                board[7][6] = COLOR_ID.BLACK;
                board[7][7] = COLOR_ID.BLACK;
                board[7][8] = COLOR_ID.BLACK;
                board[8][8] = COLOR_ID.WHITE;
            }
            */
            //#endregion
            break;
        case 3:
            // NW
            board[CENTER4.NORTH-1][CENTER4.WEST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.WEST-1] = COLOR_ID.RED;
            board[CENTER4.NORTH  ][CENTER4.WEST  ] = COLOR_ID.WHITE;
            // NE
            board[CENTER4.NORTH-1][CENTER4.EAST  ] = COLOR_ID.RED;
            board[CENTER4.NORTH  ][CENTER4.EAST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.EAST+1] = COLOR_ID.WHITE;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.WEST-1] = COLOR_ID.WHITE;
            board[CENTER4.SOUTH  ][CENTER4.WEST  ] = COLOR_ID.BLACK;
            board[CENTER4.SOUTH+1][CENTER4.WEST  ] = COLOR_ID.RED;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.EAST  ] = COLOR_ID.RED;
            board[CENTER4.SOUTH  ][CENTER4.EAST+1] = COLOR_ID.BLACK;
            board[CENTER4.SOUTH+1][CENTER4.EAST  ] = COLOR_ID.WHITE;
            break;
        case 4:
            //#region 4x1
            /*
            // NW
            board[CENTER4.NORTH][CENTER4.WEST] = COLOR_ID.WHITE;
            // NE
            board[CENTER4.NORTH][CENTER4.EAST] = COLOR_ID.BLACK;
            // SW
            board[CENTER4.SOUTH][CENTER4.WEST] = COLOR_ID.RED;
            // SW
            board[CENTER4.SOUTH][CENTER4.EAST] = COLOR_ID.BLUE;
            */
            //#endregion

            //#region 4x2 1
            /*
            // NW
            board[CENTER4.NORTH-1][CENTER4.WEST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.WEST  ] = COLOR_ID.WHITE;
            // NE
            board[CENTER4.NORTH  ][CENTER4.EAST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.EAST+1] = COLOR_ID.BLUE;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.WEST-1] = COLOR_ID.WHITE;
            board[CENTER4.SOUTH  ][CENTER4.WEST  ] = COLOR_ID.RED;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.EAST  ] = COLOR_ID.BLUE;
            board[CENTER4.SOUTH+1][CENTER4.EAST  ] = COLOR_ID.RED;
            */
            //#endregion

            //#region 4x2 2
            // NW
            board[CENTER4.NORTH-1][CENTER4.WEST  ] = COLOR_ID.BLUE;
            board[CENTER4.NORTH  ][CENTER4.WEST  ] = COLOR_ID.WHITE;
            // NE
            board[CENTER4.NORTH  ][CENTER4.EAST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.EAST+1] = COLOR_ID.RED;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.WEST-1] = COLOR_ID.BLACK;
            board[CENTER4.SOUTH  ][CENTER4.WEST  ] = COLOR_ID.RED;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.EAST  ] = COLOR_ID.BLUE;
            board[CENTER4.SOUTH+1][CENTER4.EAST  ] = COLOR_ID.WHITE;
            //#endregion

            //#region 4x3
            /*
            // NW
            board[CENTER4.NORTH-1][CENTER4.WEST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.WEST  ] = COLOR_ID.WHITE;
            board[CENTER4.NORTH  ][CENTER4.WEST-1] = COLOR_ID.BLACK;
            // NE
            board[CENTER4.NORTH-1][CENTER4.EAST  ] = COLOR_ID.BLUE;
            board[CENTER4.NORTH  ][CENTER4.EAST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.EAST+1] = COLOR_ID.BLUE;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.WEST-1] = COLOR_ID.WHITE;
            board[CENTER4.SOUTH  ][CENTER4.WEST  ] = COLOR_ID.RED;
            board[CENTER4.SOUTH+1][CENTER4.WEST  ] = COLOR_ID.WHITE;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.EAST  ] = COLOR_ID.BLUE;
            board[CENTER4.SOUTH  ][CENTER4.EAST+1] = COLOR_ID.RED;
            board[CENTER4.SOUTH+1][CENTER4.EAST  ] = COLOR_ID.RED;
            */
            //#endregion
            break;
        case 5:
            // NW
            board[CENTER4.NORTH-2][CENTER4.WEST  ] = COLOR_ID.BLUE;
            board[CENTER4.NORTH-1][CENTER4.WEST-1] = COLOR_ID.BLACK;
            board[CENTER4.NORTH-1][CENTER4.WEST  ] = COLOR_ID.CYAN;
            board[CENTER4.NORTH  ][CENTER4.WEST-1] = COLOR_ID.BLUE;
            board[CENTER4.NORTH  ][CENTER4.WEST  ] = COLOR_ID.WHITE;
            // NE
            board[CENTER4.NORTH-1][CENTER4.EAST  ] = COLOR_ID.WHITE;
            board[CENTER4.NORTH-1][CENTER4.EAST+1] = COLOR_ID.BLUE;
            board[CENTER4.NORTH  ][CENTER4.EAST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.EAST+1] = COLOR_ID.RED;
            board[CENTER4.NORTH  ][CENTER4.EAST+2] = COLOR_ID.WHITE;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.WEST-2] = COLOR_ID.RED;
            board[CENTER4.SOUTH  ][CENTER4.WEST-1] = COLOR_ID.BLACK;
            board[CENTER4.SOUTH  ][CENTER4.WEST  ] = COLOR_ID.RED;
            board[CENTER4.SOUTH+1][CENTER4.WEST-1] = COLOR_ID.CYAN;
            board[CENTER4.SOUTH+1][CENTER4.WEST  ] = COLOR_ID.BLACK;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.EAST  ] = COLOR_ID.BLUE;
            board[CENTER4.SOUTH  ][CENTER4.EAST+1] = COLOR_ID.CYAN;
            board[CENTER4.SOUTH+1][CENTER4.EAST  ] = COLOR_ID.WHITE;
            board[CENTER4.SOUTH+1][CENTER4.EAST+1] = COLOR_ID.RED;
            board[CENTER4.SOUTH+2][CENTER4.EAST  ] = COLOR_ID.CYAN;
            break;
        case 6:
            //#region 6x2
            /*
            // NW
            board[CENTER4.NORTH-1][CENTER4.WEST  ] = COLOR_ID.BLUE;
            board[CENTER4.NORTH  ][CENTER4.WEST-1] = COLOR_ID.MAGENTA;
            board[CENTER4.NORTH  ][CENTER4.WEST  ] = COLOR_ID.WHITE;
            // NE
            board[CENTER4.NORTH-1][CENTER4.EAST  ] = COLOR_ID.CYAN;
            board[CENTER4.NORTH  ][CENTER4.EAST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.EAST+1] = COLOR_ID.RED;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.WEST-1] = COLOR_ID.BLACK;
            board[CENTER4.SOUTH  ][CENTER4.WEST  ] = COLOR_ID.RED;
            board[CENTER4.SOUTH+1][CENTER4.WEST  ] = COLOR_ID.CYAN;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.EAST  ] = COLOR_ID.BLUE;
            board[CENTER4.SOUTH  ][CENTER4.EAST+1] = COLOR_ID.MAGENTA;
            board[CENTER4.SOUTH+1][CENTER4.EAST  ] = COLOR_ID.WHITE;
            */
            //#endregion

            //#region 6x4
            // NW
            board[CENTER4.NORTH-2][CENTER4.WEST  ] = COLOR_ID.RED;
            board[CENTER4.NORTH-1][CENTER4.WEST-1] = COLOR_ID.CYAN;
            board[CENTER4.NORTH-1][CENTER4.WEST  ] = COLOR_ID.BLUE;
            board[CENTER4.NORTH  ][CENTER4.WEST-2] = COLOR_ID.WHITE;
            board[CENTER4.NORTH  ][CENTER4.WEST-1] = COLOR_ID.MAGENTA;
            board[CENTER4.NORTH  ][CENTER4.WEST  ] = COLOR_ID.WHITE;
            // NE
            board[CENTER4.NORTH-2][CENTER4.EAST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH-1][CENTER4.EAST  ] = COLOR_ID.CYAN;
            board[CENTER4.NORTH-1][CENTER4.EAST+1] = COLOR_ID.MAGENTA;
            board[CENTER4.NORTH  ][CENTER4.EAST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.EAST+1] = COLOR_ID.RED;
            board[CENTER4.NORTH  ][CENTER4.EAST+2] = COLOR_ID.BLUE;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.WEST-2] = COLOR_ID.BLUE;
            board[CENTER4.SOUTH  ][CENTER4.WEST-1] = COLOR_ID.BLACK;
            board[CENTER4.SOUTH  ][CENTER4.WEST  ] = COLOR_ID.RED;
            board[CENTER4.SOUTH+1][CENTER4.WEST-1] = COLOR_ID.MAGENTA;
            board[CENTER4.SOUTH+1][CENTER4.WEST  ] = COLOR_ID.CYAN;
            board[CENTER4.SOUTH+2][CENTER4.WEST  ] = COLOR_ID.BLACK;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.EAST  ] = COLOR_ID.BLUE;
            board[CENTER4.SOUTH  ][CENTER4.EAST+1] = COLOR_ID.MAGENTA;
            board[CENTER4.SOUTH  ][CENTER4.EAST+2] = COLOR_ID.WHITE;
            board[CENTER4.SOUTH+1][CENTER4.EAST  ] = COLOR_ID.WHITE;
            board[CENTER4.SOUTH+1][CENTER4.EAST+1] = COLOR_ID.CYAN;
            board[CENTER4.SOUTH+2][CENTER4.EAST  ] = COLOR_ID.RED;
            //#endregion
            break;
        case 7:
            // NW
            board[CENTER4.NORTH-2][CENTER4.WEST-1] = COLOR_ID.WHITE;
            board[CENTER4.NORTH-2][CENTER4.WEST  ] = COLOR_ID.MAGENTA;
            board[CENTER4.NORTH-1][CENTER4.WEST-1] = COLOR_ID.CYAN;
            board[CENTER4.NORTH-1][CENTER4.WEST  ] = COLOR_ID.BLUE;
            board[CENTER4.NORTH  ][CENTER4.WEST-2] = COLOR_ID.BLUE;
            board[CENTER4.NORTH  ][CENTER4.WEST-1] = COLOR_ID.YELLOW;
            board[CENTER4.NORTH  ][CENTER4.WEST  ] = COLOR_ID.WHITE;
            // NE
            board[CENTER4.NORTH-2][CENTER4.EAST  ] = COLOR_ID.RED;
            board[CENTER4.NORTH-1][CENTER4.EAST  ] = COLOR_ID.CYAN;
            board[CENTER4.NORTH-1][CENTER4.EAST+1] = COLOR_ID.YELLOW;
            board[CENTER4.NORTH-1][CENTER4.EAST+2] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.EAST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.EAST+1] = COLOR_ID.RED;
            board[CENTER4.NORTH  ][CENTER4.EAST+2] = COLOR_ID.CYAN;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.WEST-2] = COLOR_ID.RED;
            board[CENTER4.SOUTH  ][CENTER4.WEST-1] = COLOR_ID.BLACK;
            board[CENTER4.SOUTH  ][CENTER4.WEST  ] = COLOR_ID.RED;
            board[CENTER4.SOUTH+1][CENTER4.WEST-2] = COLOR_ID.YELLOW;
            board[CENTER4.SOUTH+1][CENTER4.WEST-1] = COLOR_ID.MAGENTA;
            board[CENTER4.SOUTH+1][CENTER4.WEST  ] = COLOR_ID.CYAN;
            board[CENTER4.SOUTH+2][CENTER4.WEST  ] = COLOR_ID.BLACK;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.EAST  ] = COLOR_ID.BLUE;
            board[CENTER4.SOUTH  ][CENTER4.EAST+1] = COLOR_ID.MAGENTA;
            board[CENTER4.SOUTH  ][CENTER4.EAST+2] = COLOR_ID.WHITE;
            board[CENTER4.SOUTH+1][CENTER4.EAST  ] = COLOR_ID.WHITE;
            board[CENTER4.SOUTH+1][CENTER4.EAST+1] = COLOR_ID.YELLOW;
            board[CENTER4.SOUTH+2][CENTER4.EAST  ] = COLOR_ID.BLUE;
            break;
        case 8:
            //#region 8x2
            /*
            // NW
            board[CENTER4.NORTH-1][CENTER4.WEST-1] = COLOR_ID.MAGENTA;
            board[CENTER4.NORTH-1][CENTER4.WEST  ] = COLOR_ID.BLUE;
            board[CENTER4.NORTH  ][CENTER4.WEST-1] = COLOR_ID.ORANGE;
            board[CENTER4.NORTH  ][CENTER4.WEST  ] = COLOR_ID.WHITE;
            // NE
            board[CENTER4.NORTH-1][CENTER4.EAST  ] = COLOR_ID.YELLOW;
            board[CENTER4.NORTH-1][CENTER4.EAST+1] = COLOR_ID.CYAN;
            board[CENTER4.NORTH  ][CENTER4.EAST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.EAST+1] = COLOR_ID.RED;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.WEST-1] = COLOR_ID.BLACK;
            board[CENTER4.SOUTH  ][CENTER4.WEST  ] = COLOR_ID.RED;
            board[CENTER4.SOUTH+1][CENTER4.WEST-1] = COLOR_ID.YELLOW;
            board[CENTER4.SOUTH+1][CENTER4.WEST  ] = COLOR_ID.CYAN;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.EAST  ] = COLOR_ID.BLUE;
            board[CENTER4.SOUTH  ][CENTER4.EAST+1] = COLOR_ID.MAGENTA;
            board[CENTER4.SOUTH+1][CENTER4.EAST  ] = COLOR_ID.WHITE;
            board[CENTER4.SOUTH+1][CENTER4.EAST+1] = COLOR_ID.ORANGE;
            */
            //#endregion

            //#region 8x3
            /*
            // NW
            board[CENTER4.NORTH-2][CENTER4.WEST  ] = COLOR_ID.ORANGE;
            board[CENTER4.NORTH-1][CENTER4.WEST-1] = COLOR_ID.MAGENTA;
            board[CENTER4.NORTH-1][CENTER4.WEST  ] = COLOR_ID.BLUE;
            board[CENTER4.NORTH  ][CENTER4.WEST-2] = COLOR_ID.BLUE;
            board[CENTER4.NORTH  ][CENTER4.WEST-1] = COLOR_ID.ORANGE;
            board[CENTER4.NORTH  ][CENTER4.WEST  ] = COLOR_ID.WHITE;
            // NE
            board[CENTER4.NORTH-2][CENTER4.EAST  ] = COLOR_ID.RED;
            board[CENTER4.NORTH-1][CENTER4.EAST  ] = COLOR_ID.YELLOW;
            board[CENTER4.NORTH-1][CENTER4.EAST+1] = COLOR_ID.CYAN;
            board[CENTER4.NORTH  ][CENTER4.EAST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.EAST+1] = COLOR_ID.RED;
            board[CENTER4.NORTH  ][CENTER4.EAST+2] = COLOR_ID.YELLOW;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.WEST-2] = COLOR_ID.CYAN;
            board[CENTER4.SOUTH  ][CENTER4.WEST-1] = COLOR_ID.BLACK;
            board[CENTER4.SOUTH  ][CENTER4.WEST  ] = COLOR_ID.RED;
            board[CENTER4.SOUTH+1][CENTER4.WEST-1] = COLOR_ID.YELLOW;
            board[CENTER4.SOUTH+1][CENTER4.WEST  ] = COLOR_ID.CYAN;
            board[CENTER4.SOUTH+2][CENTER4.WEST  ] = COLOR_ID.BLACK;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.EAST  ] = COLOR_ID.BLUE;
            board[CENTER4.SOUTH  ][CENTER4.EAST+1] = COLOR_ID.MAGENTA;
            board[CENTER4.SOUTH  ][CENTER4.EAST+2] = COLOR_ID.WHITE;
            board[CENTER4.SOUTH+1][CENTER4.EAST  ] = COLOR_ID.WHITE;
            board[CENTER4.SOUTH+1][CENTER4.EAST+1] = COLOR_ID.ORANGE;
            board[CENTER4.SOUTH+2][CENTER4.EAST  ] = COLOR_ID.MAGENTA;
            */
            //#endregion

            //#region 8x4
            // NW
            board[CENTER4.NORTH-2][CENTER4.WEST-1] = COLOR_ID.YELLOW;
            board[CENTER4.NORTH-2][CENTER4.WEST  ] = COLOR_ID.ORANGE;
            board[CENTER4.NORTH-1][CENTER4.WEST-2] = COLOR_ID.RED;
            board[CENTER4.NORTH-1][CENTER4.WEST-1] = COLOR_ID.MAGENTA;
            board[CENTER4.NORTH-1][CENTER4.WEST  ] = COLOR_ID.BLUE;
            board[CENTER4.NORTH  ][CENTER4.WEST-2] = COLOR_ID.BLUE;
            board[CENTER4.NORTH  ][CENTER4.WEST-1] = COLOR_ID.ORANGE;
            board[CENTER4.NORTH  ][CENTER4.WEST  ] = COLOR_ID.WHITE;
            // NE
            board[CENTER4.NORTH-2][CENTER4.EAST  ] = COLOR_ID.RED;
            board[CENTER4.NORTH-2][CENTER4.EAST+1] = COLOR_ID.WHITE;
            board[CENTER4.NORTH-1][CENTER4.EAST  ] = COLOR_ID.YELLOW;
            board[CENTER4.NORTH-1][CENTER4.EAST+1] = COLOR_ID.CYAN;
            board[CENTER4.NORTH-1][CENTER4.EAST+2] = COLOR_ID.MAGENTA;
            board[CENTER4.NORTH  ][CENTER4.EAST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.EAST+1] = COLOR_ID.RED;
            board[CENTER4.NORTH  ][CENTER4.EAST+2] = COLOR_ID.YELLOW;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.WEST-2] = COLOR_ID.CYAN;
            board[CENTER4.SOUTH  ][CENTER4.WEST-1] = COLOR_ID.BLACK;
            board[CENTER4.SOUTH  ][CENTER4.WEST  ] = COLOR_ID.RED;
            board[CENTER4.SOUTH+1][CENTER4.WEST-2] = COLOR_ID.ORANGE;
            board[CENTER4.SOUTH+1][CENTER4.WEST-1] = COLOR_ID.YELLOW;
            board[CENTER4.SOUTH+1][CENTER4.WEST  ] = COLOR_ID.CYAN;
            board[CENTER4.SOUTH+2][CENTER4.WEST-1] = COLOR_ID.BLUE;
            board[CENTER4.SOUTH+2][CENTER4.WEST  ] = COLOR_ID.BLACK;
            // SW
            board[CENTER4.SOUTH  ][CENTER4.EAST  ] = COLOR_ID.BLUE;
            board[CENTER4.SOUTH  ][CENTER4.EAST+1] = COLOR_ID.MAGENTA;
            board[CENTER4.SOUTH  ][CENTER4.EAST+2] = COLOR_ID.WHITE;
            board[CENTER4.SOUTH+1][CENTER4.EAST  ] = COLOR_ID.WHITE;
            board[CENTER4.SOUTH+1][CENTER4.EAST+1] = COLOR_ID.ORANGE;
            board[CENTER4.SOUTH+1][CENTER4.EAST+2] = COLOR_ID.BLACK;
            board[CENTER4.SOUTH+2][CENTER4.EAST  ] = COLOR_ID.MAGENTA;
            board[CENTER4.SOUTH+2][CENTER4.EAST+1] = COLOR_ID.CYAN;
            //#endregion
            break;
        default:
            Library.exit();
            break;
    }
}

/** AI思考基準評価値設定 */
function setScoreBoard() {
    // console.trace("setScoreBoard");  // デバッグ用

    const W = PARAMETERS.BOARD_WIDTH;
    const H = PARAMETERS.BOARD_HEIGHT;
    const BOARD_MAX = (W >  H) ?W :H;
    const BOARD_MIN = (W <= H) ?W :H;
    const BOARD_MAX_HALF = Math.trunc(BOARD_MAX/2);
    const BOARD_MIN_HALF = Math.trunc(BOARD_MIN/2);

    const SCORE_MIN = 0;
    const SCORE_MAX = BOARD_MAX_HALF+3;
    // 外周は番兵
    for (const x of Library.rangeInt(W+2)) {
        scoreBoard[0  ][x] = SCORE_MIN;
        scoreBoard[H+1][x] = SCORE_MIN;
    }
    for (const y of Library.rangeInt(H+2)) {
        scoreBoard[y][0  ] = SCORE_MIN;
        scoreBoard[y][W+1] = SCORE_MIN;
    }

    //#region 名前(8x8)
    /*
    隅 Ⅽ Ａ Ｂ Ｂ Ａ Ⅽ 隅
    Ⅽ Ｘ 辺 辺 辺 辺 Ｘ Ⅽ
    Ａ 辺 Ｘ 辺 辺 Ｘ 辺 Ａ
    Ｂ 辺 辺 初 初 辺 辺 Ｂ
    Ｂ 辺 辺 初 初 辺 辺 Ｂ
    Ａ 辺 Ｘ 辺 辺 Ｘ 辺 Ａ
    Ⅽ Ｘ 辺 辺 辺 辺 Ｘ Ⅽ
    隅 Ⅽ Ａ Ｂ Ｂ Ａ Ⅽ 隅
    */
    //#endregion
    //#region 評価値(8x8)
    /*
    7 2 6 5 5 6 2 7
    2 1 3 3 3 3 1 2
    6 3 6 4 4 6 3 6
    5 3 4 0 0 4 3 5
    5 3 4 0 0 4 3 5
    6 3 6 4 4 6 3 6
    2 1 3 3 3 3 1 2
    7 2 6 5 5 6 2 7
    */
    //#endregion

    // i: 外周から数えて何番目
    // i === 0: 外周

    // i === 1

    // 隅
    const SCORE_CORNER = SCORE_MAX;
    scoreBoard[1][1] = SCORE_CORNER;
    scoreBoard[1][W] = SCORE_CORNER;
    scoreBoard[H][1] = SCORE_CORNER;
    scoreBoard[H][W] = SCORE_CORNER;

    // Ａ
    const SCORE_A = SCORE_CORNER-1;
    scoreBoard[1  ][3  ] = SCORE_A;
    scoreBoard[1  ][W-2] = SCORE_A;
    scoreBoard[3  ][1  ] = SCORE_A;
    scoreBoard[3  ][W  ] = SCORE_A;
    scoreBoard[H-2][1  ] = SCORE_A;
    scoreBoard[H-2][W  ] = SCORE_A;
    scoreBoard[H  ][3  ] = SCORE_A;
    scoreBoard[H  ][W-2] = SCORE_A;

    // Ｂ
    const SCORE_B = SCORE_A-1;
    for (const x of Library.rangeIntAll(4, W-3)) {
        scoreBoard[1][x] = SCORE_B;
        scoreBoard[H][x] = SCORE_B;
    }
    for (const y of Library.rangeIntAll(4, H-3)) {
        scoreBoard[y][1] = SCORE_B;
        scoreBoard[y][W] = SCORE_B;
    }

    // Ⅽ
    const SCORE_C = SCORE_MIN+1;
    scoreBoard[1  ][2  ] = SCORE_C;
    scoreBoard[1  ][W-1] = SCORE_C;
    scoreBoard[2  ][1  ] = SCORE_C;
    scoreBoard[2  ][W  ] = SCORE_C;
    scoreBoard[H-1][1  ] = SCORE_C;
    scoreBoard[H-1][W  ] = SCORE_C;
    scoreBoard[H  ][2  ] = SCORE_C;
    scoreBoard[H  ][W-1] = SCORE_C;

    for (const i of Library.rangeIntAll(2, BOARD_MIN_HALF)) {
        // Ｘ
        const iHalf = Math.trunc(i/2);
        let SCORE_STAR = (i%2 === 0) ?iHalf :SCORE_CORNER-iHalf;
        SCORE_STAR = (SCORE_STAR === SCORE_C) ?SCORE_C+1 :SCORE_STAR;
        scoreBoard[i    ][i    ] = SCORE_STAR;
        scoreBoard[i    ][W-i+1] = SCORE_STAR;
        scoreBoard[H-i+1][i    ] = SCORE_STAR;
        scoreBoard[H-i+1][W-i+1] = SCORE_STAR;

        // 辺
        const SCORE_MID = (i%2 === 0) ?SCORE_C+1+iHalf :SCORE_B-iHalf;
        for (const x of Library.rangeIntAll(i+1, W-i)) {
            scoreBoard[i    ][x] = SCORE_MID;
            scoreBoard[H-i+1][x] = SCORE_MID;
        }
        for (const y of Library.rangeIntAll(i+1, H-i)) {
            scoreBoard[y][i    ] = SCORE_MID;
            scoreBoard[y][W-i+1] = SCORE_MID;
        }
    }

    // console.table(scoreBoard);  // デバッグ用
}

/** 個数重み付け設定 */
function setWeightBoard() {
    // console.trace("setWeightBoard");  // デバッグ用

    // 既定値
    for (const [x, y] of rangeBoard()) {
        weightBoard[y][x] = 1;
    }

    if (!PARAMETERS.LUCKY_MODE) return;

    const luckyWeight = Library.randomIntRange(4, 10);
    const totalNum = PARAMETERS.BOARD_WIDTH*PARAMETERS.BOARD_HEIGHT;
    const luckyNum = Library.randomIntRange(1, Math.trunc(totalNum/8));
    let n = 0;
    while (n < luckyNum) {
        const luckyX = Library.randomIntRange(1, PARAMETERS.BOARD_WIDTH);
        const luckyY = Library.randomIntRange(1, PARAMETERS.BOARD_HEIGHT);
        if (weightBoard[luckyY][luckyX] > 1) continue;
        weightBoard[luckyY][luckyX] = luckyWeight;
        n++;
    }
}

/** 描画用盤面生成
 * @description 各マスにイベントリスナーを登録する
 * @param {boolean} [isNew=true] 新規作成するかどうか
 */
function createBoard(isNew = true) {
    // console.trace("createBoard");  // デバッグ用

    const DOMThead = document.createElement("thead");
    const DOMTbody = document.createElement("tbody");

    // 新規作成する
    if (isNew) {
        DOMBoard.emptyChild();  // 全マス削除
        for (const y of Library.rangeIntAll(0, PARAMETERS.BOARD_HEIGHT)) {
            // 行
            const DOMTr = document.createElement("tr");
            for (const x of Library.rangeIntAll(0, PARAMETERS.BOARD_WIDTH)) {
                // 座標軸
                const DOMTh = document.createElement("th");
                if (y === 0) {
                    DOMTh.textContent = (x === 0) ?" " :Library.intToAlp(x-1).toUpperCase();
                    DOMTr.appendChild(DOMTh);
                    continue;
                }
                if (x === 0) {
                    DOMTh.textContent = String(y);
                    DOMTr.appendChild(DOMTh);
                    continue;
                }

                // 列
                const DOMTd = document.createElement("td");
                const DOMCell = DOMTemplateCells[board[y][x]].cloneNode(true);

                // 1次元座標付与
                DOMCell.dataset.index = String(xyToIndex(x, y));
                // 評価値付与
                const DOMScore = DOMCell.querySelector("text.score");
                DOMScore.textContent = String(scoreBoard[y][x]);
                DOMScore.classList.add("hidden");
                // ラッキーマス色付与
                if (weightBoard[y][x] > 1) {
                    DOMCell.classList.add("lucky");
                }
                // 初期配置手動時範囲外判定
                if (PARAMETERS.HAND_MODE && !checkInsideBoard(x, y, INIT_AREA)) {
                    DOMCell.classList.add("out-init_area");
                }

                DOMTd.appendChild(DOMCell);
                DOMTr.appendChild(DOMTd);
                DOMBoardCells[y][x] = DOMCell;
            }
            if (y === 0) {
                DOMThead.appendChild(DOMTr);
                DOMBoard.appendChild(DOMThead);
                continue;
            }
            DOMTbody.appendChild(DOMTr);
            DOMBoard.appendChild(DOMTbody);
        }
    }

    // 各マスに着手位置指定登録
    for (const [x, y] of rangeBoard()) {
        // 新規作成しない
        if (!isNew) {
            DOMBoardCells[y][x] = DOMBoard.querySelector(`svg.cell[data-index="${xyToIndex(x, y)}"]`);
        }

        // 着手位置指定
        const DOMBoardCell = DOMBoardCells[y][x];
        DOMBoardCell.addEventListener("click", async () => {
            // console.trace("cell click");  // デバッグ用

            // 無効化
            if (isInput && !isEntered) {
                // メッセージ出力
                const message = "Please push ENTER or DEFAULT.";
                DOMMessage.textContent = message;
                return;
            }
            if (!PARAMETERS.REVIVE_MODE && isPassTurn) return;
            if (isAITurn) return;
            if (isGameOver) return;

            // パラメータがデフォルト値なら設定確定
            if (!isInput && !isEntered) {
                await enter();
            } else {
                DOMMessage.emptyChild();  // メッセージ初期化
            }

            await move(x, y);
        });

        // ショートカットキー設定
        DOMBoardCell.addEventListener("keydown", (event) => {
            // console.trace("cell keydown");  // デバッグ用
            // console.log(event.cancelable);  // デバッグ用
            // console.log(event.defaultPrevented);  // デバッグ用

            // // 長押しは無効
            // if (event.repeat) return;

            const [W, H] = [PARAMETERS.BOARD_WIDTH, PARAMETERS.BOARD_HEIGHT];
            let [dx, dy] = [0, 0];
            let [focusX, focusY] = [x, y];

            switch (event.key) {
                //#region Tabキーでのシーケンシャルフォーカスを模倣
                /*
                case "Tab":  // フォーカスを次のマスに移動
                    dx = (event.shiftKey) ?-1 :1;
                    focusX = Library.mod(x-1+dx, W) + 1;
                    focusY += Math.floor((x-1+dx)/W);
                    // console.log(`focus ${focusX} ${focusY}`);  // デバッグ用
                    if (checkInsideBoard(focusX, focusY)) {
                        event.preventDefault();  // デフォルトのフォーカス移動を抑止する
                        DOMBoardCells[focusY][focusX].focus();
                    }
                    break;
                */
                //#endregion
                case event.key.startsWith("Arrow") && event.key:  // フォーカスを左右上下のマスに移動
                    switch (event.key) {
                        case "ArrowLeft":  // フォーカスを左のマスに移動
                            [dx, dy] = [-1, 0];
                            break;
                        case "ArrowRight":  // フォーカスを右のマスに移動
                            [dx, dy] = [1, 0];
                            break;
                        case "ArrowUp":  // フォーカスを上のマスに移動
                            [dx, dy] = [0, -1];
                            break;
                        case "ArrowDown":  // フォーカスを下のマスに移動
                            [dx, dy] = [0, 1];
                            break;
                        default:
                            return;
                    }
                    if (event.ctrlKey) {
                        // 空か端にジャンプ
                        let [fx, fy] = [x, y];
                        fx = Library.mod(x-1+dx, W) + 1;
                        fy = Library.mod(y-1+dy, H) + 1;
                        if (board[y][x] === COLOR_ID.NONE && board[fy][fx] === COLOR_ID.NONE) {
                            // 最後の空か端
                            while (true) {
                                focusX = fx;
                                focusY = fy;
                                fx = Library.mod(fx-1+dx, W) + 1;
                                fy = Library.mod(fy-1+dy, H) + 1;
                                if (board[fy][fx] !== COLOR_ID.NONE) break;
                                if (dy === 0 && Library.isEqOr(focusX, 1, W)) break;
                                if (dx === 0 && Library.isEqOr(focusY, 1, H)) break;
                            };
                        } else {
                            // 最初の空か端
                            while (true) {
                                focusX = Library.mod(focusX-1+dx, W) + 1;
                                focusY = Library.mod(focusY-1+dy, H) + 1;
                                if (board[focusY][focusX] === COLOR_ID.NONE) break;
                                if (dy === 0 && Library.isEqOr(focusX, 1, W)) break;
                                if (dx === 0 && Library.isEqOr(focusY, 1, H)) break;
                            }
                        }
                    } else {
                        // 隣(周期境界)
                        focusX = Library.mod(x-1+dx, W) + 1;
                        focusY = Library.mod(y-1+dy, H) + 1;
                    }
                    // console.log(`focus ${focusX} ${focusY}`);  // デバッグ用
                    event.preventDefault();  // デフォルトのスクロールを抑止する
                    DOMBoardCells[focusY][focusX].focus();
                    break;
                case " ":  // デフォルトのスクロールを抑止する
                    event.preventDefault();  // デフォルトのスクロールを抑止する
                    break;
                case "Enter":  // 着手位置指定
                    event.currentTarget.dispatchEvent(new Event("click"));
                    break;
                default:
                    break;
            }
        });
        DOMBoardCell.addEventListener("keyup", (event) => {
            // console.trace("cell keyup");  // デバッグ用

            switch (event.key) {
                case " ":  // 着手位置指定
                    event.currentTarget.dispatchEvent(new Event("click"));
                    break;
                default:
                    break;
            }
        });
    }

    // console.table(DOMBoardCells);  // デバッグ用
}

/** パラメータ設定確定 */
async function enter() {
    // console.trace("enter");  // デバッグ用

    isEntered = true;

    DOMTurn.classList.replace("hidden", "shown");

    // 有効化
    DOMAssist.disabled = false;
    DOMHint.disabled = false;

    // 無効化
    DOM_PARAMETERS.forEach((DOM_PARAMETER, key) => {
        if (key === "AI_LIST") {
            DOM_PARAMETER.forEach((DOM_AI_COLOR) => {
                DOM_AI_COLOR.disabled = true;
            });
            const DOM_AI_LIST = document.querySelector("ul#AI_LIST");
            DOM_AI_LIST.classList.add("disabled");
        } else {
            if (DOM_PARAMETER.matches("option")) {
                DOM_PARAMETER = DOM_PARAMETER.parentNode;  // select
            }
            DOM_PARAMETER.disabled = true;
        }
    });
    DOMEnter.disabled = true;
    DOMDefault.disabled = true;

    // メッセージ出力
    const message = "This game was started.";
    DOMMessage.textContent = message;
    // ログ出力
    const log = Library.dedent(`
        ${message}
        COLOR_NUM   : ${PARAMETERS.COLOR_NUM}
        BOARD_WIDTH : ${PARAMETERS.BOARD_WIDTH}
        BOARD_HEIGHT: ${PARAMETERS.BOARD_HEIGHT}
        TURN_NUM    : ${PARAMETERS.TURN_NUM}
        AI_LIST     : ${(PARAMETERS.AI_LIST.length === 0) ?COLOR_TEXT[0] :PARAMETERS.AI_LIST.map((i) => COLOR_TEXT[i])}
        AI_LEVEL    : ${(PARAMETERS.AI_LIST.length === 0) ?COLOR_TEXT[0] :PARAMETERS.AI_LEVEL}
        DELAY_MSEC  : ${PARAMETERS.DELAY_MSEC}
        LUCKY_MODE  : ${PARAMETERS.LUCKY_MODE}
        LUCKY_WEIGHT: ${weightBoard.flat().max()}
        HAND_MODE   : ${PARAMETERS.HAND_MODE}
        REVIVE_MODE : ${PARAMETERS.REVIVE_MODE}
    `);/* + Library.dedent(`
        PASS_MAX    : ${PASS_MAX}
        STEP_MAX    : ${STEP_MAX}
    `);*/  // デバッグ用
    // console.log(log);  // デバッグ用
    DOMLog.textContent += `${log}\n`;
    DOMLog.scroll(0, DOMLog.scrollHeight);  // ログ内下端にスクロール

    await AIListMove();  // 先手AI
}

/** アシスト表示
 * @description 着手可能な位置を強調表示
 * @param {number} [color=turn] 手番
 * @param {boolean} [isOn=true] 表示するかどうか
 * @returns {boolean} 表示中かどうか
 */
function assist(color = turn, isOn = true) {
    // console.trace("assist");  // デバッグ用

    const DOMAssistCell = DOMTemplateAssists[color];
    const assistCellClass = DOMAssistCell.getAttribute("class");
    const DOMHighlightCell = DOMTemplateHighlights[color];
    const highLightCellClass = DOMHighlightCell.getAttribute("class");

    for (const [x, y] of rangeBoard()) {
        const DOMBoardCell = DOMBoardCells[y][x];
        const boardCellClass = DOMBoardCell.getAttribute("class");
        const DOMCell = DOMTemplateCells[board[y][x]];
        const cellClass = DOMCell.getAttribute("class");
        if (isOn) {  // 表示
            if (!checkCanPut(x, y, color)) continue;
            if (DOMBoardCell.classList.contains(assistCellClass)) continue;
            DOMBoardCell.classList.replace(cellClass, assistCellClass);
            DOMBoardCell.classList.replace(highLightCellClass, assistCellClass);
            DOMBoardCell.dataset.color = DOMAssistCell.dataset.color;
            DOMBoardCell.innerHTML = DOMAssistCell.innerHTML;
        } else {  // 非表示
            if (!DOMBoardCell.classList.contains(assistCellClass)) continue;
            DOMBoardCell.classList.replace(assistCellClass, cellClass);
            DOMBoardCell.dataset.color = DOMCell.dataset.color;
            DOMBoardCell.innerHTML = DOMCell.innerHTML;
        }
        const DOMScore = DOMBoardCell.querySelector("text.score");
        DOMScore.textContent = String(scoreBoard[y][x]);
        if (isInHint) {
            DOMScore.classList.replace("hidden", "shown");
        }
    }

    return isInAssist = isOn;
}

/** ヒント表示
 * @description 各位置の評価値を表示
 * @param {boolean} [isOn=true] 表示するかどうか
 * @returns {boolean} 表示中かどうか
 */
function hint(isOn = true) {
    // console.trace("hint");  // デバッグ用

    const DOMScores = DOMBoard.querySelectorAll("svg > text.score");
    DOMScores.forEach((DOMScore) => {
        if (isOn) {
            DOMScore.classList.replace("hidden", "shown");
        } else {
            DOMScore.classList.replace("shown", "hidden");
        }
    });

    return isInHint = isOn;
}

/** 盤面の2次元座標の1次元化
 * @param {number} x 盤面のx座標
 * @param {number} y 盤面のy座標
 * @param {number} [W=PARAMETERS.BOARD_WIDTH] 盤面の横幅
 * @returns {number} 盤面の1次元座標
 */
function xyToIndex(x, y, W = PARAMETERS.BOARD_WIDTH+2) {
    // console.trace("xyToIndex");  // デバッグ用

    const index = y*W + x;

    return index;
}

/** 盤面の1次元座標の2次元化
 * @param {number} index 盤面の1次元座標
 * @param {number} [W=PARAMETERS.BOARD_WIDTH] 盤面の横幅
 * @returns {number[]} 盤面のx座標とy座標の組
 */
function indexToXY(index, W = PARAMETERS.BOARD_WIDTH+2) {
    // console.trace("indexToXY");  // デバッグ用

    const x = index%W;
    const y = Math.trunc(index/W);

    return [x, y];
}

/** 着手位置指定
 * @param {number} x 盤面のx座標
 * @param {number} y 盤面のy座標
 */
async function move(x, y) {
    // console.trace("move");  // デバッグ用

    // 着手
    if (!checkCanPut(x, y, turn, true)) {
        // メッセージ出力
        const head = (!isInput && DOMMessage.hasChildNodes()) ?" " :"";
        DOMMessage.appendChild(document.createTextNode(`${head}Cannot put `));
        DOMMessage.appendChild(DOMTemplateColors[turn].cloneNode(true));
        DOMMessage.appendChild(document.createTextNode(" here."));
        return;
    }

    await changeTurn();
    await AIListMove();
}

/** 着手可能位置判定
 * @param {number} x 盤面のx座標
 * @param {number} y 盤面のy座標
 * @param {number} [color=turn] 手番
 * @param {boolean} [isFlip=false] 実際に着手する(反転を行う)かどうか
 * @param {boolean} [isReal=true] 走査対象がboardかどうか
 * @returns {boolean} 着手可能かどうか
 */
function checkCanPut(x, y, color = turn, isFlip = false, isReal = true) {
    // console.trace("checkCanPut");  // デバッグ用

    return tallyCanPutFlip(x, y, color, isFlip, isReal) > 0;
}

/** 着手可能盤面判定(パスでないか判定)
 * @param {number} [color=turn] 手番
 * @returns {boolean} 着手可能盤面かどうか
 */
function checkCanPutAny(color = turn) {
    // console.trace("checkCanPutAny");  // デバッグ用

    for (const [x, y] of rangeBoard()) {
        if (checkCanPut(x, y, color)) return true;
    }

    return false;

    // return filterCanPutXY(color).length > 0;
}

/** 着手可能位置取得
 * @param {number} [color=turn] 手番
 * @param {boolean} [isReal=true] 走査対象がboardかどうか
 * @returns {number[][]} 着手可能位置の配列
 */
function filterCanPutXY(color = turn, isReal = true) {
    // console.trace("filterCanPutXY");  // デバッグ用

    return rangeBoard().filter(([x, y]) => checkCanPut(x, y, color, false, isReal));
}

/** 着手及び反転可能個数
 * @param {number} x 盤面のx座標
 * @param {number} y 盤面のy座標
 * @param {number} [color=turn] 手番
 * @param {boolean} [isFlip=false] 実際に着手する(反転を行う)かどうか
 * @param {boolean} [isReal=true] 走査対象がboardかどうか
 * @returns {number} 着手及び反転可能個数
 */
function tallyCanPutFlip(x, y, color = turn, isFlip = false, isReal = true) {
    // console.trace("tallyCanPutFlip");  // デバッグ用

    return pickCanPutFlipXY(x, y, color, isFlip, isReal).length;
}

/** 着手及び反転可能位置取得
 * @param {number} x 盤面のx座標
 * @param {number} y 盤面のy座標
 * @param {number} [color=turn] 手番
 * @param {boolean} [isFlip=false] 実際に着手する(反転を行う)かどうか
 * @param {boolean} [isReal=true] 走査対象がboardかどうか
 * @returns {number[][]} 着手及び反転可能位置の組
 */
function pickCanPutFlipXY(x, y, color = turn, isFlip = false, isReal = true) {
    // console.trace("pickCanPutFlipXY");  // デバッグ用

    const aliasBoard = (isReal) ?board :virtualBoard;
    const DOMBoardCell = DOMBoardCells[y][x];

    // 外周は着手不可
    if (!checkInsideBoard(x, y)) return [];

    // 着手済みなら着手不可
    if (aliasBoard[y][x] !== COLOR_ID.NONE) return [];

    // 空は着手不可
    if (color === COLOR_ID.NONE) return [];

    // 初期配置手動モード
    if (PARAMETERS.HAND_MODE) {
        if (checkInsideBoard(x, y, INIT_AREA)) {
            if (isFlip) {
                if (isReal) {
                    // 着手とハイライトとログ出力
                    putHighlightLog();
                } else {
                    aliasBoard[y][x] = color;
                }
            }
            return [[x, y]];
        } else {
            return [];
        }
    }

    // パス救済モード
    if (PARAMETERS.REVIVE_MODE && isPassTurn) {
        if (isFlip) {
            if (isReal) {
                // 着手とハイライトとログ出力
                putHighlightLog();
            } else {
                aliasBoard[y][x] = color;
            }
        }
        return [[x, y]];
    }

    let canFlipXYList = [];  // 反転可能位置の組
    let isFirstPut = true;  // 指定位置に置くのは1回だけ
    for (const [dy, dx] of Library.range2IntAll(-1,1, -1,1)) {  // 8方向走査
        if (dx === 0 && dy === 0) continue;
        let flipXYList = [];
        let [flipX, flipY] = [x+dx, y+dy];
        let flipN = 0;  // 挟んだ個数
        while (!(aliasBoard[flipY][flipX] === color  // 自色またはに到達するまで
              || aliasBoard[flipY][flipX] === COLOR_ID.NONE)) {  // 空色または外周に到達するまで
            flipXYList.push([flipX, flipY]);  // 反転可能位置を記録
            flipX += dx;
            flipY += dy;
            flipN++;
        }
        // 自色で挟んでいないなら反転不可能
        if (flipN === 0 || aliasBoard[flipY][flipX] === COLOR_ID.NONE) continue;
        canFlipXYList.push(...flipXYList);  // 反転可能位置を記録

        if (!isFlip) continue;
        if (isFirstPut) {
            if (isReal) {
                isFirstPut = false;
                // 着手とハイライトとログ出力
                putHighlightLog();
            } else {
                aliasBoard[y][x] = color;
            }
        }

        [flipX, flipY] = [x+dx, y+dy];
        while (flipN > 0) {
            if (isReal) {
                // 実際に反転する
                put(flipX, flipY, color);
                // 反転位置のハイライト表示
                highlight(flipX, flipY, color, true);
            } else {
                aliasBoard[flipY][flipX] = color;
            }
            flipX += dx;
            flipY += dy;
            flipN--;
        }
    }

    const canPutFlipXYList = (canFlipXYList.length > 0) ?[[x, y], ...canFlipXYList] :[];
    return canPutFlipXYList;

    /** 着手とハイライトとログ出力 */
    function putHighlightLog() {
        // console.trace("putHighlightLog");  // デバッグ用

        // 全位置のハイライト非表示
        highlightAllHide();

        // 実際に着手する
        put(x, y, color);

        // 着手位置のハイライト表示
        highlight(x, y, color, true);
        DOMBoardCell.querySelector("rect.highlight-disc").classList.add("highlight-put");

        // ログ出力
        const strStepPad = Library.padDigit(step+1, STEP_MAX, " ");
        const longest = COLOR_TEXT
            .slice(COLOR_ID.BLACK, COLOR_ID.BLACK+PARAMETERS.COLOR_NUM)
            .reduce((long, ct) => (long.length >= ct.length) ?long :ct);
        const colorTextPad = Library.padDigit(COLOR_TEXT[color], longest, " ", false);
        const strXPad = Library.padDigit(x, PARAMETERS.BOARD_WIDTH, " ");
        const strYPad = Library.padDigit(y, PARAMETERS.BOARD_HEIGHT, " ");
        const strXY = `${Library.intToAlp(x-1).toUpperCase()}${y}`;
        const strWH = `${Library.intToAlp(PARAMETERS.BOARD_WIDTH-1).toUpperCase()}${PARAMETERS.BOARD_HEIGHT}`;
        const strXYPad = Library.padDigit(strXY, strWH, " ", false);
        const log = `step: ${strStepPad}, turn: ${colorTextPad}, x: ${strXPad}, y: ${strYPad}, xy: ${strXYPad}`;
        // console.log(log);  // デバッグ用
        DOMLog.textContent += `${log}\n`;
        DOMLog.scroll(0, DOMLog.scrollHeight);  // ログ内下端にスクロール
        record += strXY;
    }
}

/** 盤面範囲内判定
 * @param {number} x 盤面のx座標
 * @param {number} y 盤面のy座標
 * @param {object} [area={}] 範囲4端点
 * @param {number} [area.WEST=1] x軸始点
 * @param {number} [area.EAST=PARAMETERS.BOARD_WIDTH] x軸終点
 * @param {number} [area.NORTH=1] y軸始点
 * @param {number} [area.SOUTH=PARAMETERS.BOARD_HEIGHT] y軸終点
 * @returns {boolean} 盤面範囲内かどうか
 */
function checkInsideBoard(x, y, area = {}) {
    // console.trace("checkInsideBoard");  // デバッグ用

    const {
        WEST : xFirst = 1,
        EAST : xLast  = PARAMETERS.BOARD_WIDTH,
        NORTH: yFirst = 1,
        SOUTH: yLast  = PARAMETERS.BOARD_HEIGHT
    } = area;
    const isInX = Library.isBetween(x, xFirst, xLast);
    const isInY = Library.isBetween(y, yFirst, yLast);

    return isInX && isInY;
}

/** 盤面走査
 * @param {object} [area={}] 範囲4端点
 * @param {number} [area.WEST=1] x軸始点
 * @param {number} [area.EAST=PARAMETERS.BOARD_WIDTH] x軸終点
 * @param {number} [area.NORTH=1] y軸始点
 * @param {number} [area.SOUTH=PARAMETERS.BOARD_HEIGHT] y軸終点
 * @returns {number[][]} 盤面のx座標とy座標の組の配列
 */
function rangeBoard(area = {}) {
    // console.trace("rangeBoard");  // デバッグ用

    const {
        WEST : xFirst = 1,
        EAST : xLast  = PARAMETERS.BOARD_WIDTH,
        NORTH: yFirst = 1,
        SOUTH: yLast  = PARAMETERS.BOARD_HEIGHT
    } = area;

    return [...Library.range2IntAll(yFirst, yLast, xFirst, xLast)].map(([y, x]) => [x, y]);
}

/** 指定位置のハイライト表示
 * @description 着手及び反転位置を強調表示
 * @param {number} x 盤面のx座標
 * @param {number} y 盤面のy座標
 * @param {number} [color=turn] 手番
 * @param {boolean} [isOn=true] 表示するかどうか
 * @returns {boolean} 表示中かどうか
 */
function highlight(x, y, color = turn, isOn = true) {
    // console.trace("highlight");  // デバッグ用

    if (!checkInsideBoard(x, y)) return false;

    const DOMBoardCell = DOMBoardCells[y][x];
    const boardCellClass = DOMBoardCell.getAttribute("class");
    const DOMCell = DOMTemplateCells[board[y][x]];
    const cellClass = DOMCell.getAttribute("class");
    const DOMAssistCell = DOMTemplateAssists[color];
    const assistCellClass = DOMAssistCell.getAttribute("class");
    const DOMHighlightCell = DOMTemplateHighlights[color];
    const highLightCellClass = DOMHighlightCell.getAttribute("class");

    if (isOn) {  // 表示
        if (DOMBoardCell.classList.contains(highLightCellClass)) return false;
        DOMBoardCell.classList.replace(cellClass, highLightCellClass);
        DOMBoardCell.classList.replace(assistCellClass, highLightCellClass);
        DOMBoardCell.dataset.color = DOMHighlightCell.dataset.color;
        DOMBoardCell.innerHTML = DOMHighlightCell.innerHTML;
    } else {  // 非表示
        if (!DOMBoardCell.classList.contains(highLightCellClass)) return false;
        DOMBoardCell.classList.replace(highLightCellClass, cellClass);
        DOMBoardCell.dataset.color = DOMCell.dataset.color;
        DOMBoardCell.innerHTML = DOMCell.innerHTML;
    }
    const DOMScore = DOMBoardCell.querySelector("text.score");
    DOMScore.textContent = String(scoreBoard[y][x]);

    return isOn;
}

/** 全位置のハイライト非表示 */
function highlightAllHide() {
    // console.trace("highlightAllHide");  // デバッグ用

    for (const [x, y] of rangeBoard()) {
        highlight(x, y, turn, false);
    }
}

/** 設置
 * @description 盤面の指定位置を指定色で上書き
 * @param {number} x 盤面のx座標
 * @param {number} y 盤面のy座標
 * @param {number} [color=turn] 手番
 */
function put(x, y, color = turn) {
    // console.trace("put");  // デバッグ用

    if (!checkInsideBoard(x, y)) return;

    board[y][x] = color;
    const DOMBoardCell = DOMBoardCells[y][x];
    const DOMCell = DOMTemplateCells[color];
    DOMBoardCell.dataset.color = DOMCell.dataset.color;
}

/** 手番変更 */
async function changeTurn() {
    // console.trace("changeTurn");  // デバッグ用
    // console.log(`step = ${step}`);  // デバッグ用
    // console.log(`turn = ${turn}, turnCount = ${turnCount}, ${COLOR_TEXT[turn]}`);  // デバッグ用

    //#region 現ターン後処理

    // 進捗カウント
    if (!checkSentinelTurn(turn)) {
        step++;
    }

    const COLOR_INIT_NUM = PARAMETERS.COLOR_NUM*INIT_NUM;  // 初期配置マス数

    // 初期配置手動モード継続判定
    if (PARAMETERS.HAND_MODE) {
        const isHand = step < COLOR_INIT_NUM;
        // 各色置ききれば(初期配置終了すれば)通常着手モードに復帰
        if (!isHand) {
            for (const [x, y] of rangeBoard()) {
                const DOMBoardCell = DOMBoardCells[y][x];
                if (!checkInsideBoard(x, y, INIT_AREA)) {
                    DOMBoardCell.classList.remove("out-init_area");
                }
            }
        }
        PARAMETERS.HAND_MODE = isHand;
    }

    // 第一巡は1手番当たりの手数は既定値
    const initNum = 1;  // 巡数
    const COLOR_FIRST_NUM = PARAMETERS.COLOR_NUM*initNum;  // 手番数
    const FIRST_NUM = COLOR_FIRST_NUM + HAND_MODE*COLOR_INIT_NUM;  // 初期配置手動を含めた手番数
    const isFirst = step <= FIRST_NUM;
    PARAMETERS.TURN_NUM = (isFirst) ?DEFAULT_PARAMETERS.TURN_NUM :TURN_NUM;

    // 終了判定
    isGameOver = checkGameOver();
    if (isGameOver) return;  // 終了

    // アシスト非表示
    if (isInAssist) {
        assist(turn, false);
    }
    // ヒント非表示
    if (isInHint) {
        hint(false);
    }

    //#endregion

    //#region 次ターン前処理

    // 手番更新
    // console.log(`currTurn: turn = ${turn}, turnCount = ${turnCount}, ${COLOR_TEXT[turn]}`);  // デバッグ用
    // prevTurn(turn, turnCount);  // デバッグ用
    [turn, turnCount] = nextTurn(turn, turnCount);
    const DOMTurnColor = DOMTurn.querySelector("span.color-text");
    const DOMColor = DOMTemplateColors[turn].cloneNode(true);
    DOMTurnColor.replaceWith(DOMColor);
    isPassTurn = false;

    // AIThink6();  // HINT表示 デバッグ用

    // 番兵プレイヤーならパス
    if (checkSentinelTurn(turn)) {
        await changeTurn();
        await AIListMove();
        return;
    }

    // 着手可能な位置がないならパス
    isPassTurn = !checkCanPutAny(turn);

    // パス処理(着手の代替処理)
    if (isPassTurn) {
        // passCount++;  // デバッグ用

        // パス救済モードならパスしない
        if (PARAMETERS.REVIVE_MODE) {
            // メッセージ出力
            DOMMessage.emptyChild();  // メッセージ初期化
            DOMMessage.appendChild(DOMTemplateColors[turn].cloneNode(true));
            DOMMessage.appendChild(document.createTextNode(" was revived. "));
            DOMMessage.appendChild(DOMTemplateColors[turn].cloneNode(true));
            DOMMessage.appendChild(document.createTextNode(" can put any position."));
            return;
        }

        // メッセージ出力
        DOMMessage.emptyChild();  // メッセージ初期化
        DOMMessage.appendChild(document.createTextNode("Cannot put "));
        DOMMessage.appendChild(DOMTemplateColors[turn].cloneNode(true));
        DOMMessage.appendChild(document.createTextNode(" any position. "));
        DOMMessage.appendChild(DOMTemplateColors[turn].cloneNode(true));
        DOMMessage.appendChild(document.createTextNode(" was passed."));

        // ログ出力
        const strStepPad = Library.padDigit(step+1, STEP_MAX, " ");
        const longest = COLOR_TEXT
            .slice(COLOR_ID.BLACK, COLOR_ID.BLACK+PARAMETERS.COLOR_NUM)
            .reduce((long, ct) => (long.length >= ct.length) ?long :ct);
        const colorTextPad = Library.padDigit(COLOR_TEXT[turn], longest, " ", false);
        const log = `step: ${strStepPad}, turn: ${colorTextPad}, pass`;
        // console.log(log);  // デバッグ用
        DOMLog.textContent += `${log}\n`;
        DOMLog.scroll(0, DOMLog.scrollHeight);  // ログ内下端にスクロール

        // 無効化
        DOMAssist.disabled = true;
        DOMHint.disabled = true;

        // console.time("wait");  // デバッグ用
        await wait(PARAMETERS.DELAY_MSEC);
        // console.timeEnd("wait");  // デバッグ用

        // 有効化
        DOMAssist.disabled = false;
        DOMHint.disabled = false;

        await changeTurn();
        await AIListMove();
    }

    //#endregion
}

/** 番兵プレイヤー判定
 * @param {number} [color=turn] 手番
 * @returns {boolean} 番兵プレイヤーかどうか
 */
function checkSentinelTurn(color = turn) {
    // console.trace("checkSentinelTurn");  // デバッグ用

    return isOnlyAI && !PARAMETERS.AI_LIST.includes(color);
}

/** 次の手番
 * @param {number} [color=turn] 手番
 * @param {number} [N=COLOR_NUM_PLUS] 対局人数
 * @returns {number} 次の手番
 */
function nextTurn1(color = turn, N = COLOR_NUM_PLUS) {
    // console.trace("nextTurn1");  // デバッグ用

    return Library.mod(color-COLOR_ID.BLACK+1, N) + COLOR_ID.BLACK;
}

/** 前の手番
 * @param {number} [color=turn] 手番
 * @param {number} [N=COLOR_NUM_PLUS] 対局人数
 * @returns {number} 前の手番
 */
function prevTurn1(color = turn, N = COLOR_NUM_PLUS) {
    // console.trace("prevTurn1");  // デバッグ用

    return nextTurn1(color-2, N);
}

/** 次の手番と手数
 * @param {number} [color=turn] 手番
 * @param {number} [colorCount=turnCount] 手数
 * @param {number} [N=COLOR_NUM_PLUS] 対局人数
 * @param {number} [M=PARAMETERS.TURN_NUM] 1手番当たりの手数
 * @returns {number[]} 次の手番と手数の組
 */
function nextTurn(color = turn, colorCount = turnCount, N = COLOR_NUM_PLUS, M = PARAMETERS.TURN_NUM) {
    // console.trace("nextTurn");  // デバッグ用

    colorCount = Library.mod(colorCount+1, M);
    if (colorCount === 0) {
        color = nextTurn1(color, N);
    }
    // console.log(`nextTurn: color = ${color}, colorCount = ${colorCount}, ${COLOR_TEXT[color]}`);  // デバッグ用

    return [color, colorCount];
}

/** 前の手番と手数
 * @param {number} [color=turn] 手番
 * @param {number} [colorCount=turnCount] 手数
 * @param {number} [N=COLOR_NUM_PLUS] 対局人数
 * @param {number} [M=PARAMETERS.TURN_NUM] 1手番当たりの手数
 * @returns {number[]} 次の手番と手数の組
 */
function prevTurn(color = turn, colorCount = turnCount, N = COLOR_NUM_PLUS, M = PARAMETERS.TURN_NUM) {
    // console.trace("prevTurn");  // デバッグ用

    colorCount = Library.mod(colorCount-1, M);
    if (colorCount === M-1) {
        color = prevTurn1(color, N);
    }
    // console.log(`prevTurn: color = ${color}, colorCount = ${colorCount}, ${COLOR_TEXT[color]}`);  // デバッグ用

    return [color, colorCount];
}

/** 終了判定, 勝敗判定
 * @returns {boolean} 終了かどうか
 */
function checkGameOver() {
    // console.trace("checkGameOver");  // デバッグ用

    // 全色パスかどうか判定
    for (const c of Library.rangeIntAll(COLOR_ID.BLACK, PARAMETERS.COLOR_NUM)) {
        if (checkCanPutAny(c)) return false;  // 続行
    }

    // 各色の個数を集計
    const TOTALS = Object.freeze(Library.rangeInt(COLOR_ID.BLACK+PARAMETERS.COLOR_NUM).map((c) => tallyColor(c)));
    const totals = Object.freeze(TOTALS.slice(COLOR_ID.BLACK));  // 空を除外

    // リザルト表示
    let result = "";
    DOMResult.emptyChild();  // リザルト初期化
    const isDraw = totals.isEqAll();  // すべて同個数(引き分け)かどうか
    const maxColor = TOTALS.indexOf(totals.max());  // 最大個数手番
    for (const c of Library.rangeIntAll(COLOR_ID.BLACK, PARAMETERS.COLOR_NUM)) {
        result += `${COLOR_TEXT[c]}=${TOTALS[c]}, `;
        DOMResult.appendChild(DOMTemplateColors[c].cloneNode(true));
        DOMResult.appendChild(document.createTextNode(`=${TOTALS[c]}, `));
    }
    if (isDraw) {  // すべて同個数なら引き分け
        result += "draw.";
        DOMResult.appendChild(document.createTextNode("draw."));
    } else {  // 最大個数が勝利
        result += `${COLOR_TEXT[maxColor]} won.`;
        DOMResult.appendChild(DOMTemplateColors[maxColor].cloneNode(true));
        DOMResult.appendChild(document.createTextNode(" won."));
    }

    DOMTurn.classList.replace("shown", "hidden");
    DOMMessage.classList.replace("hidden", "shown");
    DOMResult.classList.replace("hidden", "shown");

    // // ハイライト非表示
    // highlightAllHide();
    // アシスト非表示
    if (isInAssist) {
        assist(turn, false);
    }
    // ヒント非表示
    if (isInHint) {
        hint(false);
    }
    // 無効化
    DOMAssist.disabled = true;
    DOMHint.disabled = true;

    // メッセージ出力
    const message = "This game was over.";
    DOMMessage.textContent = message;
    // ログ出力
    const log = Library.dedent(`
        result: ${result}
        record: ${record}
        ${message}
    `);/* + Library.dedent(`
        passCount: ${passCount}
    `);*/  // デバッグ用
    // console.log(log);  // デバッグ用
    DOMLog.textContent += `${log}\n`;
    DOMLog.scroll(0, DOMLog.scrollHeight);  // ログ内下端にスクロール

    return true;  // 終了
}

/** 盤面の指定色の個数を集計
 * @param {number} [color=turn] 手番
 * @returns {number} 個数
 */
function tallyColor(color = turn) {
    // console.trace("tallyColor");  // デバッグ用

    let total = 0;
    for (const [x, y] of rangeBoard()) {
        if (board[y][x] === color) {
            total += weightBoard[y][x];
        }
    }

    return total;
}

/** 指定位置の周囲8近傍の指定色の個数を集計
 * @param {number} x 盤面のx座標
 * @param {number} y 盤面のy座標
 * @param {number} [color=turn] 手番
 * @param {boolean} [isReal=true] 走査対象がboardかどうか
 * @returns {number} 個数
 */
function tallyColorAround(x, y, color = turn, isReal = true) {
    // console.trace("tallyColorAround");  // デバッグ用

    const aliasBoard = (isReal) ?board :virtualBoard;

    if (!checkInsideBoard(x, y)) return;

    let total = 0;
    for (const [dy, dx] of Library.range2IntAll(-1,1, -1,1)) {  // 8方向走査
        if (dx === 0 && dy === 0) continue;
        let [nx, ny] = [x+dx, y+dy];  // 8近傍
        if (aliasBoard[ny][nx] === color) {
            total++;
        }
    }

    return total;
}

/** 進捗段階
 * @param {number} [s=step] 試合進捗
 * @param {number} [N=PHASE_ID.NUM] 進捗段階数
 * @param {number} [M=STEP_MAX] 終局手数
 * @returns {number} 進捗段階
 */
function phase(s = step, N = PHASE_ID.NUM, M = STEP_MAX) {
    // console.trace("phase");  // デバッグ用

    return Math.trunc(s * PHASE_ID.NUM/STEP_MAX);
}

/** 指定ミリ秒停止, AIの思考時間の視覚化
 * @param {number} [delayMsec=PARAMETERS.DELAY_MSEC] 停止時間[ms]
 * @returns {Promise<any>|void} プロミス
 */
function wait(delayMsec = PARAMETERS.DELAY_MSEC) {
    // console.trace("wait");  // デバッグ用

    // 停止しない
    if (delayMsec <= 0) return;

    // プレイヤーのパスなら長くする
    if (!isAITurn) {
        const ext = 2;
        delayMsec *= ext;
    }

    const DOMProgress = DOMWait.querySelector("progress#progress");
    const DOMLabel = DOMWait.querySelector('label[for="progress"]');
    const DOMOutput = DOMWait.querySelector('output[for="progress"]');

    const progressMaxStep = Number(DOMProgress.max);  // AIの思考の進捗の最大値[step]
    let progressStep = 0;  // AIの思考の進捗[step]
    let progressRate = Math.trunc(100*progressStep/progressMaxStep);  // AIの思考の進捗率
    DOMLabel.textContent = (isAITurn && !isPassTurn) ?"AI thinking ..." :"Please wait ...";
    DOMProgress.value = `${progressStep}`;
    DOMProgress.textContent = `${progressRate}%`;
    DOMOutput.textContent = `${progressRate}%`;
    DOMWait.classList.replace("hidden", "shown");

    const intervalMaxMsec = delayMsec/progressMaxStep;  // 1進捗での停止時間[ms/step]
    const intervalMinMsec = 4;  // setIntervalの仕様上の最小停止時間[ms]
    let intervalMsec = Math.max(intervalMaxMsec, intervalMinMsec);  // 1intervalでの停止時間[ms/step]
    let intervalStep = Math.trunc(intervalMsec/intervalMaxMsec);  // AIの思考の進捗の増分値[step]

    return new Promise((resolve) => {
        // console.time("setInterval");  // デバッグ用
        intervalID = window.setInterval(() => {
            // console.timeLog("setInterval");  // デバッグ用
            progressStep += intervalStep;
            progressRate = Math.trunc(100*progressStep/progressMaxStep);
            DOMProgress.value = `${progressStep}`;
            DOMProgress.textContent = `${progressRate}%`;
            DOMOutput.textContent = `${progressRate}%`;
            // console.log({progressStep});  // デバッグ用
            if (progressStep >= Number(DOMProgress.max)) {
                // console.log({resolve});  // デバッグ用
                DOMWait.classList.replace("shown", "hidden");
                window.clearInterval(intervalID);
                // console.timeEnd("setInterval");  // デバッグ用
                resolve();
            }
        }, intervalMsec);
    });
}

/** AIList着手 */
async function AIListMove() {
    // console.trace("AIListMove");  // デバッグ用

    for (const _ of Library.rangeInt(PARAMETERS.AI_LIST.length*PARAMETERS.TURN_NUM)) {
        // console.log(`_ = ${_}`);  // デバッグ用
        await AIMove();
    }
}

/** AI着手 */
async function AIMove() {
    // console.trace("AIMove");  // デバッグ用
    // console.log(`turn = ${turn}, turnCount = ${turnCount}, ${COLOR_TEXT[turn]}`);  // デバッグ用

    if (!PARAMETERS.AI_LIST.includes(turn)) return;
    if (isGameOver) return;

    isAITurn = true;
    // 無効化
    DOMAssist.disabled = true;
    DOMHint.disabled = true;

    // console.time("wait");  // デバッグ用
    await wait(PARAMETERS.DELAY_MSEC);
    // console.timeEnd("wait");  // デバッグ用

    // console.time("AIThink");  // デバッグ用
    const [AIx, AIy] = AIThink(PARAMETERS.AI_LEVEL);
    // console.timeEnd("AIThink");  // デバッグ用

    // 着手(設置)
    checkCanPut(AIx, AIy, turn, true);

    DOMMessage.emptyChild();  // メッセージ初期化

    isAITurn = false;
    // 有効化
    DOMAssist.disabled = false;
    DOMHint.disabled = false;

    await changeTurn();
}

/** AI思考
 * @param {number} level AI思考レベル
 * @returns {number[]} 盤面のx座標とy座標の組
 */
function AIThink(level) {
    // console.trace("AIThink");  // デバッグ用

    //#region 最短5連続パス, 黒プレイヤーにパスさせる デバッグ用
    /*
    if (PARAMETERS.COLOR_NUM    === 2
     && PARAMETERS.BOARD_WIDTH  === 8
     && PARAMETERS.BOARD_HEIGHT === 8
     && turn === COLOR_ID.WHITE) {
        if (checkCanPut(6, 8, COLOR_ID.WHITE, false)) return [6, 8];
        if (checkCanPut(4, 8, COLOR_ID.WHITE, false)) return [4, 8];
        if (checkCanPut(3, 7, COLOR_ID.WHITE, false)) return [3, 7];
        if (checkCanPut(8, 4, COLOR_ID.WHITE, false)) return [8, 4];
    }
    */
    //#endregion

    // window.eval(`return AIThink${level}();`);

    switch (level) {
        case 0: return AIThink0();  // 着手可能な位置のうち(左上から)最初に見つけた位置に着手する
        case 1: return AIThink1();  // 着手可能な位置のうち無作為に選ばれた位置に着手する
        case 2: return AIThink2();  // 着手可能なうち反転可能個数が最大な位置に着手する(その位置が複数あるなら無作為に選ぶ)
        case 3: return AIThink3();  // 着手可能な位置のうち評価値が最大の位置に着手する(その位置が複数あるなら無作為に選ぶ)
        case 4: return AIThink4();  // 次の手番の着手可能な位置の評価値の最大値が最小になる位置に着手する(その位置が複数あるなら無作為に選ぶ)
        case 5: return AIThink5();  // 試合進捗によってAI思考レベルを変動させる
        case 6: return AIThink6();  // 着手可能な位置のうちポイントが最大の位置に着手する(その位置が複数あるなら無作為に選ぶ)
        default: Library.exit();
    }
}

/** AI思考レベル0
 * @description 着手可能な位置のうち(左上から)最初に見つけた位置に着手する
 * @returns {number[]} 盤面のx座標とy座標の組
 */
function AIThink0() {
    // console.trace("AIThink0");  // デバッグ用

    for (const [x, y] of rangeBoard()) {
        if (checkCanPut(x, y)) return [x, y];
    }

    // return filterCanPutXY(turn)[0];
}

/** AI思考レベル1
 * @description 着手可能な位置のうち無作為に選ばれた位置に着手する
 * @returns {number[]} 盤面のx座標とy座標の組
 */
function AIThink1() {
    // console.trace("AIThink1");  // デバッグ用

    let canPutXYList = [];  // 着手位置の候補リスト
    for (const [x, y] of rangeBoard()) {
        if (!checkCanPut(x, y)) continue;
        canPutXYList.push([x, y]);
    }
    // console.log(...canPutXYList);  // デバッグ用

    // return filterCanPutXY(turn).random();
    return canPutXYList.random();
}

/** AI思考レベル2
 * @description 着手可能なうち反転可能個数が最大な位置に着手する(その位置が複数あるなら無作為に選ぶ)
 * @returns {number[]} 盤面のx座標とy座標の組
 */
function AIThink2() {
    // console.trace("AIThink2");  // デバッグ用

    let canPutCountFlipMax = 0;  // 着手可能なうちの最大反転個数
    let canPutXYList = [];  // 着手位置の候補リスト
    for (const [x, y] of rangeBoard()) {
        const canPutCountFlip = tallyCanPutFlip(x, y);
        if (!canPutCountFlip) continue;
        if (canPutCountFlipMax <= canPutCountFlip) {
            if (canPutCountFlipMax < canPutCountFlip) {
                canPutXYList = [];
            }
            canPutCountFlipMax = canPutCountFlip;
            canPutXYList.push([x, y]);
        }
    }
    // console.log(canPutCountFlipMax, ...canPutXYList);  // デバッグ用

    return canPutXYList.random();
}

/** AI思考レベル3
 * @description 着手可能な位置のうち評価値が最大の位置に着手する(その位置が複数あるなら無作為に選ぶ)
 * @returns {number[]} 盤面のx座標とy座標の組
 */
function AIThink3() {
    // console.trace("AIThink3");  // デバッグ用

    let canPutScoreMax = scoreBoard[0][0]-1;  // 着手可能な位置の最大評価値
    let canPutXYList = [];  // 着手位置の候補リスト
    for (const [x, y] of rangeBoard()) {
        if (!checkCanPut(x, y)) continue;
        if (canPutScoreMax <= scoreBoard[y][x]) {
            if (canPutScoreMax < scoreBoard[y][x]) {
                canPutXYList = [];
            }
            canPutScoreMax = scoreBoard[y][x];
            canPutXYList.push([x, y]);
        }
    }
    // console.log(canPutScoreMax, ...canPutXYList);  // デバッグ用

    return canPutXYList.random();
}

/** AI思考レベル4
 * @description 次の手番の着手可能な位置の評価値の最大値が最小になる位置に着手する(その位置が複数あるなら無作為に選ぶ)
 * @returns {number[]} 盤面のx座標とy座標の組
 */
function AIThink4() {
    // console.trace("AIThink4");  // デバッグ用

    let nextCanPutScoreMaxMin = scoreBoard[1][1]+1;  // 次の手番の着手可能な位置の評価値の最大値の最小値
    let canPutXYList = [];  // 着手位置の候補リスト
    for (const [x, y] of rangeBoard()) {
        virtualBoard = window.structuredClone(board);
        if (!checkCanPut(x, y, turn, true, false)) continue;  // 仮着手
        // console.log(`x=${x}, y=${y}, score=${scoreBoard[y][x]}`);  // デバッグ用

        let nextCanPutScoreMax = scoreBoard[0][0]-1;  // 次の手番の着手可能な位置の評価値の最大値
        for (const [nextX, nextY] of rangeBoard()) {
            const nextColor = nextTurn1(turn);
            if (!checkCanPut(nextX, nextY, nextColor, false, false)) continue;
            nextCanPutScoreMax = Math.max(nextCanPutScoreMax, scoreBoard[nextY][nextX]);
            // console.trace("nextX=", nextX, "nextY=", nextY, "score=", scoreBoard[nextY][nextX]);  // デバッグ用
        }

        if (nextCanPutScoreMaxMin >= nextCanPutScoreMax) {
            if (nextCanPutScoreMaxMin > nextCanPutScoreMax) {
                canPutXYList = [];
            }
            nextCanPutScoreMaxMin = nextCanPutScoreMax;
            canPutXYList.push([x, y]);
        }
    }
    // console.log(nextCanPutScoreMaxMin, ...canPutXYList);  // デバッグ用
    // return canPutScoreMaxXYList.random();

    let canPutScoreMax = scoreBoard[0][0]-1;  // 着手位置の候補リストのうち自手番の評価値の最大値
    let canPutScoreMaxXYList = [];  // 着手位置の候補リストのうち自手番の評価値が最大になる位置のリスト
    canPutXYList.forEach(([x, y]) => {
        if (canPutScoreMax <= scoreBoard[y][x]) {
            if (canPutScoreMax < scoreBoard[y][x]) {
                canPutScoreMaxXYList = [];
            }
            canPutScoreMax = scoreBoard[y][x];
            canPutScoreMaxXYList.push([x, y]);
        }
    });
    // console.log(canPutScoreMax, ...canPutScoreMaxXYList);  // デバッグ用

    return canPutScoreMaxXYList.random();
}

/** AI思考レベル5
 * @description 試合進捗によってAI思考レベルを変動させる
 * @returns {number[]} 盤面のx座標とy座標の組
 */
function AIThink5() {
    // console.trace("AIThink5");  // デバッグ用

    const PHASE_NUM = 4;  // 進捗段階数
    if (step < Math.trunc(STEP_MAX/PHASE_NUM)) {  // 序盤
        // console.log("序盤");  // デバッグ用
        return AIThink3();
    } else if (step < Math.trunc(STEP_MAX*2/PHASE_NUM)) {  // 中盤1
        // console.log("中盤1");  // デバッグ用
        return AIThink3();
    } else if (step < Math.trunc(STEP_MAX*3/PHASE_NUM)) {  // 中盤2
        // console.log("中盤2");  // デバッグ用
        return AIThink4();
    } else {  // 終盤
        // console.log("終盤");  // デバッグ用
        return AIThink2();
    }
}

/** AI思考レベル6
 * @description 着手可能な位置のうちポイントが最大の位置に着手する(その位置が複数あるなら無作為に選ぶ)
 * - ポイント: 都度計算される，重み付き成分の和
 * @returns {number[]} 盤面のx座標とy座標の組
 */
function AIThink6() {
    // console.trace("AIThink6");  // デバッグ用

    // AI設定(ポイントの重み付け)
    const AI_WEIGHT = Object.freeze({
        position    : 100,  // 位置による重み付け(盤面評価値 x 重み)
        flipNumEarly: -23,  // 序盤での一石返しの重み(取った数 x 重み)
        chopNum     :   7,  // 中割りの重み(取った石の周りにある相手の数 x 重み)
        flipNumLate :  11,  // 終盤での大量取りの重み(取った数 x 重み)
    });
    const currPhase = phase(step);  // 現在の進捗段階

    let canPutPointMax = -Library.INF.MEGA;  // 最大ポイント
    let canPutXYList = [];  // 最大ポイントの位置
    // let pointBoard = Library.createArray2D(PARAMETERS.BOARD_HEIGHT+2, PARAMETERS.BOARD_WIDTH+2, 0);  // デバッグ用

    filterCanPutXY(turn).forEach(([x, y]) => {
        const flipXYList = pickCanPutFlipXY(x, y, turn).slice(1);  // 反転可能位置
        const flipNum = flipXYList.length;  // 反転可能個数

        let point = 0;  // ポイント: 重み付き成分の和
        // console.log(`x=${x} y=${y}`, point);  // デバッグ用

        // 位置による重み付け(隅を狙う,ⅭとＸは狙わない,など)
        point += AI_WEIGHT.position * scoreBoard[y][x];
        point -= AI_WEIGHT.position * Math.trunc(scoreBoard[1][1]/2);
        // console.log("位置", point);  // デバッグ用

        // 序盤は一石返しを狙う
        if (currPhase === PHASE_ID.EARLY) {
            point += AI_WEIGHT.flipNumEarly * flipNum;
        }
        // console.log("序盤は一石返し", point);  // デバッグ用

        // 中割りを狙う
        flipXYList.forEach(([flipX, flipY]) => {
            for (const c of Library.rangeIntAll(COLOR_ID.BLACK, PARAMETERS.COLOR_NUM)) {
                if (c === turn) continue;  // 自色は無視
                point += AI_WEIGHT.chopNum * tallyColorAround(flipX, flipY, c);
            }
        });
        // console.log("中割り", point);  // デバッグ用

        // 終盤は大量取りを狙う
        if (currPhase === PHASE_ID.LATE) {
            point += AI_WEIGHT.flipNumLate * flipNum;
        }
        // console.log("終盤は大量取り", point);  // デバッグ用

        // 最大ポイントと最大ポイントの位置を更新
        if (canPutPointMax <= point) {
            if (canPutPointMax < point) {
                canPutXYList = [];
            }
            canPutPointMax = point;
            canPutXYList.push([x, y]);
        }

        // pointBoard[y][x] = point;  // デバッグ用
    });
    //#region HINT表示 デバッグ用
    // for (const [x, y] of rangeBoard()) {
    //     const DOMScore = DOMBoardCells[y][x].querySelector("text.score");
    //     DOMScore.textContent = String(pointBoard[y][x]);
    // }
    //#endregion
    // console.table(pointBoard);  // デバッグ用
    // console.log(canPutPointMax, ...canPutXYList);  // デバッグ用

    return canPutXYList.random();
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
