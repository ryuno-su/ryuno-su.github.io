window.addEventListener("DOMContentLoaded", () => {
"use strict";  // 厳格モード

// div#template-area
const DOMTemplateCells = document.querySelectorAll("div#template-area > svg.cell");
const DOMTemplateHighlights = document.querySelectorAll("div#template-area > svg.highlight");
const DOMTemplateAssists = document.querySelectorAll("div#template-area > svg.assist");
const DOMTemplateColors = document.querySelectorAll("div#template-area > span.color-text");
// details#parameter-area
const DOM_PARAMETERS = Object.freeze({
    COLOR_NUM   : document.querySelector("select#COLOR_NUM"),
    BOARD_WIDTH : document.querySelector("input#BOARD_WIDTH"),
    BOARD_HEIGHT: document.querySelector("input#BOARD_HEIGHT"),
    AI_LIST     : document.querySelectorAll("ul#AI_LIST input"),
    AI_LEVEL    : document.querySelector("select#AI_LEVEL"),
    DELAY_MSEC  : document.querySelector("select#DELAY_MSEC"),
    LUCKY_MODE  : document.querySelector("input#LUCKY_MODE"),
    HAND_MODE   : document.querySelector("input#HAND_MODE"),
});
const DOMEnter = document.querySelector("button#enter");
const DOMReset = document.querySelector("button#reset");
// main
const DOMBoard = document.querySelector("div#board");
// div#button-area
const DOMAssist = document.querySelector("button#assist");
const DOMHint = document.querySelector("button#hint");
// div#info-area
const DOMTurn = document.querySelector("div#turn");
const DOMMessage = document.querySelector("div#message");
const DOMWait = document.querySelector("div#wait");
const DOMResult = document.querySelector("div#result");
const DOMRecord = document.querySelector("div#record");

/** パラメータ既定値 */
const DEFAULT_PARAMETERS = Object.freeze({
    COLOR_NUM   : 2    ,  // 対局人数
    BOARD_WIDTH : 8    ,  // 盤面横幅
    BOARD_HEIGHT: 8    ,  // 盤面縦幅
    AI_LIST     : []   ,  // AI手番
    AI_LEVEL    : 3    ,  // AIレベル
    DELAY_MSEC  : 500  ,  // 待機時間[ms]
    LUCKY_MODE  : false,  // ラッキー(枚数重み付け)マス有りモードかどうか
    HAND_MODE   : false,  // 初期配置を手動で行うかどうか
});

// パラメータ設定検証用
let PARAMETERS = structuredClone(DEFAULT_PARAMETERS);

// 手番
const COLOR_TEXT = Object.freeze([...DOMTemplateColors].map((DOMText) => DOMText.textContent.toUpperCase()));
const COLOR_ID = Object.freeze(createEnum(...COLOR_TEXT));

// 進捗
let PASS_MAX = 0;  // あり得る最大パス回数
let GAME_PROGRESS_MAX = 0;  // 終局
let gameProgress = 0;  // 試合進捗

let board = [];  // 盤面
let scoreBoard = [];  // 盤面評価値
let virtualBoard = [];  // AI先読み用盤面
let weightBoard = [];  // 枚数重み付け
let DOMBoardCells = [];  // 描画用盤面
let turn = 0;  // 手番
let isOnAssist = false;  // アシスト表示中かどうか
let isOnHint = false;  // ヒント表示中かどうか
let isOnInput = false;  // パラメータ変更済みかどうか
let isGameOver = false;  // ゲームオーバーかどうか
let isPassed = false;  // パスかどうか
let isAITurn = false;  // AIが操作中かどうか
let isOnlyAI = false;  // AIvsAIかどうか
let record = "";  // 棋譜
let intervalID = 0;  // タイマーのclear用
let INIT_AREA = {};  // 初期配置範囲端点

// エントリー
main();

/** メイン */
function main() {
    // console.group("main");  // デバッグ用

    const DOMParameterArea = document.querySelector("details#parameter-area");  // バブリング用

    let isFocusedAny = false;  // フォーカス中かどうか

    // モバイル端末用設定
    setMobileDevice();

    // 初期化全般
    scroll(0, 0);
    defineParameter();
    onReset();

    // パラメータ設定検証
    DOMParameterArea.addEventListener("input", () => {
        // console.group("parameter-area input");  // デバッグ用

        initialize();

        if (!isOnInput) {
            isOnInput = true;
            // 無効化
            isAITurn = true;  // onCellPut用
            DOMAssist.disabled = true;
            DOMHint.disabled = true;
        }

        // console.groupEnd("parameter-area input");  // デバッグ用
    });

    // パラメータ設定確定
    DOMEnter.addEventListener("click", async () => {
        // console.group("enter click");  // デバッグ用

        await onEnter();

        // console.groupEnd("enter click");  // デバッグ用
    });

    // リセット
    DOMReset.addEventListener("click", () => {
        // console.group("reset click");  // デバッグ用

        // 対局中なら確認を求める
        const isInGame = DOMEnter.disabled && !isGameOver;
        if (isInGame) {
            if (!confirm("Realy reset?")) return;
        }

        onReset();
        if (isInGame) {
            console.log("This game was reset.");  // ログ用
            DOMMessage.textContent = "This game was reset.";
        }

        // console.groupEnd("reset click");  // デバッグ用
    });

    // アシスト表示/非表示
    DOMAssist.addEventListener("click", async () => {
        // console.group("assist click");  // デバッグ用

        if (!isOnInput) {
            isOnInput = true;
            await onEnter();
        }

        onAssist(turn, !isOnAssist);

        // console.groupEnd("assist click");  // デバッグ用
    });

    // ヒント表示/非表示
    DOMHint.addEventListener("click", async () => {
        // console.group("hint click");  // デバッグ用

        if (!isOnInput) {
            isOnInput = true;
            await onEnter();
        }

        onHint(!isOnHint);

        // console.groupEnd("hint click");  // デバッグ用
    });

    // フォーカス判定
    DOMParameterArea.addEventListener("focusin", (event) => {
        // console.group("parameter-area focusin");  // デバッグ用

        const isFocusabled = event.target.matches('input:is([type="text"], [type="number"]), textarea');
        // console.log({isFocusabled});  // デバッグ用
        if (!isFocusabled) return;

        isFocusedAny = true;

        // console.groupEnd("parameter-area focusin");  // デバッグ用
    });
    DOMParameterArea.addEventListener("focusout", () => {
        // console.group("parameter-area focusout");  // デバッグ用

        isFocusedAny = false;

        // console.groupEnd("parameter-area focusout");  // デバッグ用
    });

    // ショートカットキー設定
    window.addEventListener("keyup", (event) => {
        // console.group(`window keyup ${event.key}`);  // デバッグ用

        // console.log({isFocusedAny});  // デバッグ用

        // フォーカス中なら無効
        if (isFocusedAny) return;

        const clickEvent = new Event("click");
        switch (event.key) {
            case "e": // パラメータ設定確定
                if (!DOMEnter.disabled) {
                    DOMEnter.dispatchEvent(clickEvent);
                }
                break;
            case "r": // リセット
                if (!DOMReset.disabled) {
                    DOMReset.dispatchEvent(clickEvent);
                }
                break;
            case "p": // パラメータ設定アコーディオン開閉
                DOMParameterArea.open = !DOMParameterArea.open;
                break;
            case "/": // 最上位のウィジェットにフォーカス
                const DOMFirstWidget = document.querySelector(":is(input, textarea, button, select):not(:disabled)");
                const DOMDetails = DOMFirstWidget.parentNode;
                if (DOMDetails.matches("details")) {
                    DOMDetails.open = true;
                }
                DOMFirstWidget.focus();
                break;
            case "a": // アシスト表示
                if (!DOMAssist.disabled) {
                    DOMAssist.dispatchEvent(clickEvent);
                }
                break;
            case "h": // ヒント表示
                if (!DOMHint.disabled) {
                    DOMHint.dispatchEvent(clickEvent);
                }
                break;
            case "Escape": // アシスト,ヒント非表示
                if (isOnAssist) {
                    onAssist(turn, false);
                }
                if (isOnHint) {
                    onHint(false);
                }
                break;
            default:
                break;
        }

        // console.groupEnd(`window keyup ${event.key}`);  // デバッグ用
    });

    // ウィンドウ離脱抑止
    window.addEventListener("beforeunload", (event) => {
        // console.group("window beforeunload");  // デバッグ用

        // 対局中でないなら確認を求めない
        if (!DOMEnter.disabled || isGameOver) return;

        event.preventDefault();
        event.returnValue = "";
        return "";

        // console.groupEnd("window beforeunload");  // デバッグ用
    });

    // console.groupEnd("main");  // デバッグ用
}

/** リセット */
function onReset() {
    // console.group("onReset");  // デバッグ用

    // AI停止
    clearInterval(intervalID);

    DOMTurn.classList.replace("hidden", "shown");
    DOMMessage.classList.replace("hidden", "shown");
    DOMWait.classList.replace("shown", "hidden");
    DOMResult.classList.replace("shown", "hidden");
    DOMRecord.classList.replace("shown", "hidden");

    initialize();
    isOnInput = false;
    isAITurn = false;

    // 有効化
    for (let [key, DOM_PARAMETER] of Object.entries(DOM_PARAMETERS)) {
        if (key === "AI_LIST") continue;
        if (DOM_PARAMETER.matches("option")) {
            DOM_PARAMETER = DOM_PARAMETER.parentNode;  // select
        }
        DOM_PARAMETER.disabled = false;
    }
    DOM_PARAMETERS.AI_LIST.forEach((DOM_AI_COLOR) => {
        DOM_AI_COLOR.disabled = false;
    });
    const DOM_AI_LIST = document.querySelector("ul#AI_LIST");
    DOM_AI_LIST.classList.remove("disabled");
    DOMEnter.disabled = false;

    // console.groupEnd("onReset");  // デバッグ用
}

/** 初期化群 */
function initialize() {
    // console.group("initialize");  // デバッグ用

    if (validateParameter()) {
        init();
        if (!PARAMETERS.HAND_MODE) {
            setInitBoard();
        }
        setScoreBoard();
        setWeightBoard();
        createBoard();
        Object.freeze(scoreBoard);
        Object.freeze(weightBoard);
        Object.freeze(DOMBoardCells);
    }

    // console.groupEnd("initialize");  // デバッグ用
}

/** パラメータ既定値設定 */
function defineParameter() {
    // console.group("defineParameter");  // デバッグ用

    for (let [key, DOM_PARAMETER] of Object.entries(DOM_PARAMETERS)) {
        if (key === "AI_LIST") continue;
        if (DOM_PARAMETER.matches("select")) {
            let selectIndex = 0;
            if (key === "AI_LEVEL") {
                selectIndex = DEFAULT_PARAMETERS[key];
            }
            if (key === "DELAY_MSEC") {
                selectIndex = 3;
            }
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
        DOM_PARAMETER.value = DEFAULT_PARAMETERS[key];
    }

    for (const DOM_AI_LIST of DOM_PARAMETERS.AI_LIST) {
        DOM_AI_LIST.checked = false;
    }
    for (const AIColor of DEFAULT_PARAMETERS.AI_LIST) {
        DOM_PARAMETERS.AI_LIST[AIColor-1].checked = true;
    }

    // console.groupEnd("defineParameter");  // デバッグ用
}

/** パラメータ設定検証 */
function validateParameter() {
    // console.group("validateParameter");  // デバッグ用

    let isValidAll = true;  // すべて制約を満たすかどうか

    const regExpInt = /^([1-9][0-9]*|0)$/;  // 整数のみ可
    for (let [key, DOM_PARAMETER] of Object.entries(DOM_PARAMETERS)) {
        const value = Number(DOM_PARAMETER.value);
        let min = Number(DOM_PARAMETER.min);
        let max = Number(DOM_PARAMETER.max);
        let title = DOM_PARAMETER.title;
        const validity = DOM_PARAMETER.validity;

        if (key === "AI_LIST") continue;
        if (DOM_PARAMETER.matches("select")) {
            PARAMETERS[key] = value;
            continue;
        }

        if (DOM_PARAMETER.matches("input")) {
            if (DOM_PARAMETER.matches('[type="checkbox"]')) {
                PARAMETERS[key] = DOM_PARAMETER.checked;
                continue;
            } else {
                min = Math.trunc(Math.log2(PARAMETERS.COLOR_NUM-1))*2 + 4;
                title = `${min}以上${max}以下の整数を入力してください`;
            }
        }

        DOM_PARAMETER.setCustomValidity("");
        if (validity.valid && regExpInt.test(String(value)) && min <= value && value <= max) {
            PARAMETERS[key] = value;
        } else {
            isValidAll = false;
            DOM_PARAMETER.setCustomValidity("invalid");
            if (validity.badInput) {
                DOM_PARAMETER.setCustomValidity("invalid: badInput");
            } else if (validity.valueMissing) {
                DOM_PARAMETER.setCustomValidity("invalid: valueMissing");
            } else if (validity.rangeOverflow || value > max) {
                DOM_PARAMETER.setCustomValidity("invalid: rangeOverflow");
            } else if (validity.rangeUnderflow || value < min) {
                DOM_PARAMETER.setCustomValidity("invalid: rangeUnderflow");
            } else if (validity.stepMismatch) {
                DOM_PARAMETER.setCustomValidity("invalid: stepMismatch");
            }
        }
        DOM_PARAMETER.reportValidity();
        DOM_PARAMETER.min = String(min);
        DOM_PARAMETER.max = String(max);
        DOM_PARAMETER.title = title;
    }

    PARAMETERS.AI_LIST = [];
    for (let i = 0; i < DOM_PARAMETERS.AI_LIST.length; i++) {
        const DOMListItem = DOM_PARAMETERS.AI_LIST[i].parentNode;  // li
        DOMListItem.classList.replace("hidden", "shown");
        if (i >= PARAMETERS.COLOR_NUM) {
            DOMListItem.classList.replace("shown", "hidden");
            DOM_PARAMETERS.AI_LIST[i].checked = false;
        }
        if (DOM_PARAMETERS.AI_LIST[i].checked) {
            PARAMETERS.AI_LIST.push(i+1);
        }
    }
    const DOMListItem = DOM_PARAMETERS.AI_LEVEL.parentNode;  // li
    DOMListItem.classList.replace("hidden", "shown");
    if (PARAMETERS.AI_LIST.length === 0) {
        DOMListItem.classList.replace("shown", "hidden");
    }

    // パラメータのいずれかが制約を満たさないなら無効化
    DOMEnter.disabled = !isValidAll;

    // console.log(`DOM_PARAMETERS.DELAY_MSEC.value: ${DOM_PARAMETERS.DELAY_MSEC.value}`);  // デバッグ用
    // console.groupEnd("validateParameter");  // デバッグ用

    return isValidAll;
}

/** 初期化 */
function init() {
    // console.group("init");  // デバッグ用

    // DOMTurn.textContent = "";
    DOMMessage.textContent = "";
    DOMResult.textContent = "";
    DOMRecord.textContent = "";

    board = new Array(PARAMETERS.BOARD_HEIGHT+2);
    for (let y = 0; y < PARAMETERS.BOARD_HEIGHT+2; y++) {
        board[y] = new Array(PARAMETERS.BOARD_WIDTH+2).fill(COLOR_ID.NONE);  // 外周は番兵
    }
    scoreBoard = structuredClone(board);
    virtualBoard = structuredClone(board);
    weightBoard = structuredClone(board);
    DOMBoardCells = structuredClone(board);

    isOnlyAI = false;  // プレイヤーvsプレイヤー
    if (PARAMETERS.AI_LIST.length === PARAMETERS.COLOR_NUM) {  // AIvsAI
        isOnlyAI = true;
        PARAMETERS.COLOR_NUM++;  // 番兵プレイヤー
    }


    PASS_MAX = Math.trunc(PARAMETERS.BOARD_WIDTH+PARAMETERS.BOARD_HEIGHT)/2;
    GAME_PROGRESS_MAX = PARAMETERS.BOARD_WIDTH*PARAMETERS.BOARD_HEIGHT + PASS_MAX;
    gameProgress = 0;

    // 先手
    turn = COLOR_ID.BLACK;
    const DOMTurnColor = DOMTurn.querySelector("span.color-text");
    DOMTurnColor.textContent = COLOR_TEXT[turn];
    DOMTurnColor.dataset.color = COLOR_TEXT[turn].toLowerCase();

    isOnAssist = false;
    isOnHint = false;
    // isOnInput = false;
    isGameOver = false;
    isPassed = false;
    // isAITurn = false;
    record = "";
    INIT_AREA = (() => {
        const x = Math.trunc(PARAMETERS.BOARD_WIDTH/2);
        const y = Math.trunc(PARAMETERS.BOARD_HEIGHT/2);
        const w = Number(DOM_PARAMETERS.BOARD_WIDTH.min)-2;
        const h = Number(DOM_PARAMETERS.BOARD_HEIGHT.min)-2;
        return Object.freeze({
            WEST : x-Math.trunc(w/2)+1,
            EAST : x-Math.trunc(w/2)+w,
            NORTH: y-Math.trunc(h/2)+1,
            SOUTH: y-Math.trunc(h/2)+h,
        });
    })();

    // console.groupEnd("init");  // デバッグ用
}

/** 初期配置設定 */
function setInitBoard() {
    // console.group("setInitBoard");  // デバッグ用

    let colorNum = PARAMETERS.COLOR_NUM;
    if (isOnlyAI) {
        colorNum--;
    }

    const CENTER4 = Object.freeze({  // 中心4点
        WEST : Math.trunc(PARAMETERS.BOARD_WIDTH /2)  ,
        EAST : Math.trunc(PARAMETERS.BOARD_WIDTH /2)+1,
        NORTH: Math.trunc(PARAMETERS.BOARD_HEIGHT/2)  ,
        SOUTH: Math.trunc(PARAMETERS.BOARD_HEIGHT/2)+1,
    });
    switch (colorNum) {
        case 2:
            board[CENTER4.NORTH][CENTER4.WEST] = COLOR_ID.WHITE;
            board[CENTER4.NORTH][CENTER4.EAST] = COLOR_ID.BLACK;
            board[CENTER4.SOUTH][CENTER4.WEST] = COLOR_ID.BLACK;
            board[CENTER4.SOUTH][CENTER4.EAST] = COLOR_ID.WHITE;

            /*
            // 最短5連続パス, 黒にパスさせるデバッグ用
            if (PARAMETERS.BOARD_WIDTH === 8 && PARAMETERS.BOARD_HEIGHT === 8) {
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
            break;
        case 3:
            board[CENTER4.NORTH-1][CENTER4.WEST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.WEST-1] = COLOR_ID.RED;
            board[CENTER4.NORTH  ][CENTER4.WEST  ] = COLOR_ID.WHITE;

            board[CENTER4.NORTH-1][CENTER4.EAST  ] = COLOR_ID.RED;
            board[CENTER4.NORTH  ][CENTER4.EAST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.EAST+1] = COLOR_ID.WHITE;

            board[CENTER4.SOUTH  ][CENTER4.WEST-1] = COLOR_ID.WHITE;
            board[CENTER4.SOUTH  ][CENTER4.WEST  ] = COLOR_ID.BLACK;
            board[CENTER4.SOUTH+1][CENTER4.WEST  ] = COLOR_ID.RED;

            board[CENTER4.SOUTH  ][CENTER4.EAST  ] = COLOR_ID.RED;
            board[CENTER4.SOUTH  ][CENTER4.EAST+1] = COLOR_ID.BLACK;
            board[CENTER4.SOUTH+1][CENTER4.EAST  ] = COLOR_ID.WHITE;
            break;
        case 4:
            board[CENTER4.NORTH-1][CENTER4.WEST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.WEST  ] = COLOR_ID.WHITE;
            board[CENTER4.NORTH  ][CENTER4.EAST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.EAST+1] = COLOR_ID.BLUE;
            board[CENTER4.SOUTH  ][CENTER4.WEST-1] = COLOR_ID.WHITE;
            board[CENTER4.SOUTH  ][CENTER4.WEST  ] = COLOR_ID.RED;
            board[CENTER4.SOUTH  ][CENTER4.EAST  ] = COLOR_ID.BLUE;
            board[CENTER4.SOUTH+1][CENTER4.EAST  ] = COLOR_ID.RED;
            break;
        case 5:
            board[CENTER4.NORTH-2][CENTER4.WEST  ] = COLOR_ID.CYAN;
            board[CENTER4.NORTH-1][CENTER4.WEST-1] = COLOR_ID.BLUE;
            board[CENTER4.NORTH-1][CENTER4.WEST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.WEST-1] = COLOR_ID.RED;
            board[CENTER4.NORTH  ][CENTER4.WEST  ] = COLOR_ID.WHITE;

            board[CENTER4.NORTH-1][CENTER4.EAST  ] = COLOR_ID.WHITE;
            board[CENTER4.NORTH-1][CENTER4.EAST+1] = COLOR_ID.RED;
            board[CENTER4.NORTH  ][CENTER4.EAST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.EAST+1] = COLOR_ID.CYAN;
            board[CENTER4.NORTH  ][CENTER4.EAST+2] = COLOR_ID.BLUE;

            board[CENTER4.SOUTH  ][CENTER4.WEST-2] = COLOR_ID.BLACK;
            board[CENTER4.SOUTH  ][CENTER4.WEST-1] = COLOR_ID.WHITE;
            board[CENTER4.SOUTH  ][CENTER4.WEST  ] = COLOR_ID.RED;
            board[CENTER4.SOUTH+1][CENTER4.WEST-1] = COLOR_ID.CYAN;
            board[CENTER4.SOUTH+1][CENTER4.WEST  ] = COLOR_ID.BLUE;

            board[CENTER4.SOUTH  ][CENTER4.EAST  ] = COLOR_ID.BLUE;
            board[CENTER4.SOUTH  ][CENTER4.EAST+1] = COLOR_ID.CYAN;
            board[CENTER4.SOUTH+1][CENTER4.EAST  ] = COLOR_ID.RED;
            board[CENTER4.SOUTH+1][CENTER4.EAST+1] = COLOR_ID.BLACK;
            board[CENTER4.SOUTH+2][CENTER4.EAST  ] = COLOR_ID.WHITE;
            break;
        case 6:
            board[CENTER4.NORTH-2][CENTER4.WEST-1] = COLOR_ID.CYAN;
            board[CENTER4.NORTH-2][CENTER4.WEST  ] = COLOR_ID.MAGENTA;
            board[CENTER4.NORTH-1][CENTER4.WEST-1] = COLOR_ID.BLUE;
            board[CENTER4.NORTH-1][CENTER4.WEST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.WEST-1] = COLOR_ID.RED;
            board[CENTER4.NORTH  ][CENTER4.WEST  ] = COLOR_ID.WHITE;

            board[CENTER4.NORTH-1][CENTER4.EAST  ] = COLOR_ID.WHITE;
            board[CENTER4.NORTH-1][CENTER4.EAST+1] = COLOR_ID.RED;
            board[CENTER4.NORTH-1][CENTER4.EAST+2] = COLOR_ID.BLUE;
            board[CENTER4.NORTH  ][CENTER4.EAST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.EAST+1] = COLOR_ID.MAGENTA;
            board[CENTER4.NORTH  ][CENTER4.EAST+2] = COLOR_ID.CYAN;

            board[CENTER4.SOUTH  ][CENTER4.WEST-2] = COLOR_ID.BLACK;
            board[CENTER4.SOUTH  ][CENTER4.WEST-1] = COLOR_ID.WHITE;
            board[CENTER4.SOUTH  ][CENTER4.WEST  ] = COLOR_ID.RED;
            board[CENTER4.SOUTH+1][CENTER4.WEST-2] = COLOR_ID.MAGENTA;
            board[CENTER4.SOUTH+1][CENTER4.WEST-1] = COLOR_ID.CYAN;
            board[CENTER4.SOUTH+1][CENTER4.WEST  ] = COLOR_ID.BLUE;

            board[CENTER4.SOUTH  ][CENTER4.EAST  ] = COLOR_ID.BLUE;
            board[CENTER4.SOUTH  ][CENTER4.EAST+1] = COLOR_ID.CYAN;
            board[CENTER4.SOUTH+1][CENTER4.EAST  ] = COLOR_ID.RED;
            board[CENTER4.SOUTH+1][CENTER4.EAST+1] = COLOR_ID.MAGENTA;
            board[CENTER4.SOUTH+2][CENTER4.EAST  ] = COLOR_ID.WHITE;
            board[CENTER4.SOUTH+2][CENTER4.EAST+1] = COLOR_ID.BLACK;
            break;
        case 7:
            board[CENTER4.NORTH-2][CENTER4.WEST  ] = COLOR_ID.YELLOW;
            board[CENTER4.NORTH-1][CENTER4.WEST-2] = COLOR_ID.CYAN;
            board[CENTER4.NORTH-1][CENTER4.WEST-1] = COLOR_ID.MAGENTA;
            board[CENTER4.NORTH-1][CENTER4.WEST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.WEST-2] = COLOR_ID.BLUE;
            board[CENTER4.NORTH  ][CENTER4.WEST-1] = COLOR_ID.RED;
            board[CENTER4.NORTH  ][CENTER4.WEST  ] = COLOR_ID.WHITE;

            board[CENTER4.NORTH-2][CENTER4.EAST  ] = COLOR_ID.RED;
            board[CENTER4.NORTH-2][CENTER4.EAST+1] = COLOR_ID.BLUE;
            board[CENTER4.NORTH-1][CENTER4.EAST  ] = COLOR_ID.WHITE;
            board[CENTER4.NORTH-1][CENTER4.EAST+1] = COLOR_ID.CYAN;
            board[CENTER4.NORTH  ][CENTER4.EAST  ] = COLOR_ID.BLACK;
            board[CENTER4.NORTH  ][CENTER4.EAST+1] = COLOR_ID.YELLOW;
            board[CENTER4.NORTH  ][CENTER4.EAST+2] = COLOR_ID.MAGENTA;

            board[CENTER4.SOUTH  ][CENTER4.WEST-2] = COLOR_ID.BLACK;
            board[CENTER4.SOUTH  ][CENTER4.WEST-1] = COLOR_ID.WHITE;
            board[CENTER4.SOUTH  ][CENTER4.WEST  ] = COLOR_ID.RED;
            board[CENTER4.SOUTH+1][CENTER4.WEST-1] = COLOR_ID.YELLOW;
            board[CENTER4.SOUTH+1][CENTER4.WEST  ] = COLOR_ID.BLUE;
            board[CENTER4.SOUTH+2][CENTER4.WEST-1] = COLOR_ID.MAGENTA;
            board[CENTER4.SOUTH+2][CENTER4.WEST  ] = COLOR_ID.CYAN;

            board[CENTER4.SOUTH  ][CENTER4.EAST  ] = COLOR_ID.BLUE;
            board[CENTER4.SOUTH  ][CENTER4.EAST+1] = COLOR_ID.CYAN;
            board[CENTER4.SOUTH  ][CENTER4.EAST+1] = COLOR_ID.MAGENTA;
            board[CENTER4.SOUTH+1][CENTER4.EAST  ] = COLOR_ID.RED;
            board[CENTER4.SOUTH+1][CENTER4.EAST+1] = COLOR_ID.BLACK;
            board[CENTER4.SOUTH+1][CENTER4.EAST+2] = COLOR_ID.YELLOW;
            board[CENTER4.SOUTH+2][CENTER4.EAST  ] = COLOR_ID.WHITE;
            break;
        default:
            exit();
            break;
    }

    // console.groupEnd("setInitBoard");  // デバッグ用
}

/** AI思考基準評価値設定 */
function setScoreBoard() {
    // console.group("setScoreBoard");  // デバッグ用

    const BOARD_WIDTH  = PARAMETERS.BOARD_WIDTH;
    const BOARD_HEIGHT = PARAMETERS.BOARD_HEIGHT;
    const BOARD_MAX = (BOARD_WIDTH >  BOARD_HEIGHT) ?BOARD_WIDTH :BOARD_HEIGHT;
    const BOARD_MIN = (BOARD_WIDTH <= BOARD_HEIGHT) ?BOARD_WIDTH :BOARD_HEIGHT;
    const BOARD_MAX_HALF = Math.trunc(BOARD_MAX/2);
    const BOARD_MIN_HALF = Math.trunc(BOARD_MIN/2);

    const SCORE_MIN = 0;
    const SCORE_MAX = BOARD_MAX_HALF+3;
    // 外周は番兵
    for (let x = 0; x <= BOARD_WIDTH+1; x++) {
        scoreBoard[0             ][x] = SCORE_MIN;
        scoreBoard[BOARD_HEIGHT+1][x] = SCORE_MIN;
    }
    for (let y = 0; y <= BOARD_HEIGHT+1; y++) {
        scoreBoard[y][0            ] = SCORE_MIN;
        scoreBoard[y][BOARD_WIDTH+1] = SCORE_MIN;
    }

    /* 名前(8x8)
        隅 Ⅽ Ａ Ｂ Ｂ Ａ Ⅽ 隅
        Ⅽ Ｘ 辺 辺 辺 辺 Ｘ Ⅽ
        Ａ 辺 Ｘ 辺 辺 Ｘ 辺 Ａ
        Ｂ 辺 辺 初 初 辺 辺 Ｂ
        Ｂ 辺 辺 初 初 辺 辺 Ｂ
        Ａ 辺 Ｘ 辺 辺 Ｘ 辺 Ａ
        Ⅽ Ｘ 辺 辺 辺 辺 Ｘ Ⅽ
        隅 Ⅽ Ａ Ｂ Ｂ Ａ Ⅽ 隅
    */
    /* 評価値(8x8)
        7  2  6  5  5  6  2  7
        2  1  3  3  3  3  1  2
        6  3  6  4  4  6  3  6
        5  3  4  0  0  4  3  5
        5  3  4  0  0  4  3  5
        6  3  6  4  4  6  3  6
        2  1  3  3  3  3  1  2
        7  2  6  5  5  6  2  7
    */

    // i: 外周から数えて何番目
    // i === 0: 外周

    // i === 1

    // 隅
    const SCORE_CORNER = SCORE_MAX;
    scoreBoard[1           ][1          ] = SCORE_CORNER;
    scoreBoard[1           ][BOARD_WIDTH] = SCORE_CORNER;
    scoreBoard[BOARD_HEIGHT][1          ] = SCORE_CORNER;
    scoreBoard[BOARD_HEIGHT][BOARD_WIDTH] = SCORE_CORNER;

    // Ａ
    const SCORE_A = SCORE_CORNER-1;
    scoreBoard[1             ][3            ] = SCORE_A;
    scoreBoard[1             ][BOARD_WIDTH-2] = SCORE_A;
    scoreBoard[3             ][1            ] = SCORE_A;
    scoreBoard[3             ][BOARD_WIDTH  ] = SCORE_A;
    scoreBoard[BOARD_HEIGHT-2][1            ] = SCORE_A;
    scoreBoard[BOARD_HEIGHT-2][BOARD_WIDTH  ] = SCORE_A;
    scoreBoard[BOARD_HEIGHT  ][3            ] = SCORE_A;
    scoreBoard[BOARD_HEIGHT  ][BOARD_WIDTH-2] = SCORE_A;

    // Ｂ
    const SCORE_B = SCORE_A-1;
    for (let x = 4; x <= BOARD_WIDTH-3; x++) {
        scoreBoard[1           ][x] = SCORE_B;
        scoreBoard[BOARD_HEIGHT][x] = SCORE_B;
    }
    for (let y = 4; y <= BOARD_HEIGHT-3; y++) {
        scoreBoard[y][1          ] = SCORE_B;
        scoreBoard[y][BOARD_WIDTH] = SCORE_B;
    }

    // Ⅽ
    const SCORE_C = SCORE_MIN+1;;
    scoreBoard[1             ][2            ] = SCORE_C;
    scoreBoard[1             ][BOARD_WIDTH-1] = SCORE_C;
    scoreBoard[2             ][1            ] = SCORE_C;
    scoreBoard[2             ][BOARD_WIDTH  ] = SCORE_C;
    scoreBoard[BOARD_HEIGHT-1][1            ] = SCORE_C;
    scoreBoard[BOARD_HEIGHT-1][BOARD_WIDTH  ] = SCORE_C;
    scoreBoard[BOARD_HEIGHT  ][2            ] = SCORE_C;
    scoreBoard[BOARD_HEIGHT  ][BOARD_WIDTH-1] = SCORE_C;

    for (let i = 2; i <= BOARD_MIN_HALF; i++) {
        // Ｘ
        const iHalf = Math.trunc(i/2);
        let SCORE_STAR = (i%2 === 0) ?iHalf :SCORE_CORNER-iHalf;
        SCORE_STAR = (SCORE_STAR === SCORE_C) ?SCORE_C+1 :SCORE_STAR;
        scoreBoard[i               ][i              ] = SCORE_STAR;
        scoreBoard[i               ][BOARD_WIDTH-i+1] = SCORE_STAR;
        scoreBoard[BOARD_HEIGHT-i+1][i              ] = SCORE_STAR;
        scoreBoard[BOARD_HEIGHT-i+1][BOARD_WIDTH-i+1] = SCORE_STAR;

        // 辺
        const SCORE_MID = (i%2 === 0) ?SCORE_C+1+iHalf :SCORE_B-iHalf;
        for (let x = i+1; x <= BOARD_WIDTH-i; x++) {
            scoreBoard[i               ][x] = SCORE_MID;
            scoreBoard[BOARD_HEIGHT-i+1][x] = SCORE_MID;
        }
        for (let y = i+1; y <= BOARD_HEIGHT-i; y++) {
            scoreBoard[y][i              ] = SCORE_MID;
            scoreBoard[y][BOARD_WIDTH-i+1] = SCORE_MID;
        }
    }

    // console.table(scoreBoard);  // デバッグ用
    // console.groupEnd("setScoreBoard");  // デバッグ用
}

/** 枚数重み付け設定 */
function setWeightBoard() {
    // console.group("setWeightBoard");  // デバッグ用

    // 既定値
    for (let y = 1; y <= PARAMETERS.BOARD_HEIGHT; y++) {
        for (let x = 1; x <= PARAMETERS.BOARD_WIDTH; x++) {
            weightBoard[y][x] = 1;
        }
    }

    if (!PARAMETERS.LUCKY_MODE) return;

    const luckyWeight = randomIntRange(4, 10);
    console.log(`luckyWeight: ${luckyWeight}`);  // ログ用
    const totalNum = PARAMETERS.BOARD_WIDTH*PARAMETERS.BOARD_HEIGHT;
    const luckyNum = randomIntRange(1, Math.trunc(totalNum/8));
    let n = 0;
    while (n < luckyNum) {
        const luckyX = randomIntRange(1, PARAMETERS.BOARD_WIDTH);
        const luckyY = randomIntRange(1, PARAMETERS.BOARD_HEIGHT);
        if (weightBoard[luckyY][luckyX] > 1) continue;
        weightBoard[luckyY][luckyX] = luckyWeight;
        n++;
    }

    // console.groupEnd("setWeightBoard");  // デバッグ用
}

/** 描画用盤面生成 */
function createBoard() {
    // console.group("createBoard");  // デバッグ用

    DOMBoard.emptyChild();
    for (let y = 1; y <= PARAMETERS.BOARD_HEIGHT; y++) {
        for (let x = 1; x <= PARAMETERS.BOARD_WIDTH; x++) {
            const DOMCell = DOMTemplateCells[board[y][x]].cloneNode(true);

            // 1次元座標付与
            DOMCell.dataset.index = String(xyToIndex(x, y));
            // 評価値付与
            DOMCell.querySelector("text").textContent = String(scoreBoard[y][x]);
            // ラッキーマス色付与
            if (weightBoard[y][x] > 1) {
                DOMCell.classList.add("lucky");
            }
            // 初期配置手動時範囲外判定
            if (PARAMETERS.HAND_MODE
             && !checkInsideBoard(x, y, INIT_AREA.WEST, INIT_AREA.EAST, INIT_AREA.NORTH, INIT_AREA.SOUTH)) {
                DOMCell.classList.add("not-init_area");
            }
            // クリックによる着手位置指定登録
            DOMCell.addEventListener("click", () => {
                onCellPut(x, y);
            });

            DOMBoard.appendChild(DOMCell);
            DOMBoardCells[y][x] = DOMBoard.querySelector(`svg[data-index="${xyToIndex(x, y)}"]`);
        }
        const DOMTextBR = document.createElement("br");
        DOMBoard.appendChild(DOMTextBR);
    }

    // console.groupEnd("createBoard");  // デバッグ用
}

/** パラメータ設定確定 */
async function onEnter() {
    // console.group("onEnter");  // デバッグ用

    // 有効化
    isAITurn = false;  // onCellPut用
    DOMAssist.disabled = false;
    DOMHint.disabled = false;

    // 無効化
    for (let [key, DOM_PARAMETER] of Object.entries(DOM_PARAMETERS)) {
        if (key === "AI_LIST") continue;
        if (DOM_PARAMETER.matches("option")) {
            DOM_PARAMETER = DOM_PARAMETER.parentNode;  // select
        }
        DOM_PARAMETER.disabled = true;
    }
    DOM_PARAMETERS.AI_LIST.forEach((DOM_AI_COLOR) => {
        DOM_AI_COLOR.disabled = true;
    });
    const DOM_AI_LIST = document.querySelector("ul#AI_LIST");
    DOM_AI_LIST.classList.add("disabled");
    DOMEnter.disabled = true;

    console.log("This game was started.");  // ログ用
    DOMMessage.textContent = "This game was started.";

    console.log(`COLOR_NUM: ${PARAMETERS.COLOR_NUM}`);  // ログ用
    console.log(`BOARD_WIDTH: ${PARAMETERS.BOARD_WIDTH}`);  // ログ用
    console.log(`BOARD_HEIGHT: ${PARAMETERS.BOARD_HEIGHT}`);  // ログ用
    console.log(`AI_LIST: ${(PARAMETERS.AI_LIST.length === 0) ?COLOR_TEXT[0] :PARAMETERS.AI_LIST.map((i) => COLOR_TEXT[i])}`);  // ログ用
    console.log(`AI_LEVEL: ${(PARAMETERS.AI_LIST.length === 0) ?COLOR_TEXT[0] :PARAMETERS.AI_LEVEL}`);  // ログ用
    console.log(`DELAY_MSEC: ${PARAMETERS.DELAY_MSEC}ms`);  // ログ用
    console.log(`LUCKY_MODE: ${PARAMETERS.LUCKY_MODE}`);  // ログ用
    console.log(`HAND_MODE: ${PARAMETERS.HAND_MODE}`);  // ログ用

    await AIListPut();  // 先手AI

    // console.groupEnd("onEnter");  // デバッグ用
}

/** アシスト表示
 * @param {number} [color=turn] 手番
 * @param {boolean} [isOn=true] 表示するかどうか
 * @returns {boolean} 表示中かどうか
 */
function onAssist(color = turn, isOn = true) {
    // console.group("onAssist");  // デバッグ用

    const DOMAssistCell = DOMTemplateAssists[color].cloneNode(true);
    const assistCellClass = DOMAssistCell.getAttribute("class");

    for (let y = 1; y <= PARAMETERS.BOARD_HEIGHT; y++) {
        for (let x = 1; x <= PARAMETERS.BOARD_WIDTH; x++) {
            const DOMBoardCell = DOMBoardCells[y][x];
            if (isOn) {  // 表示
                if (!checkCanPut(x, y)) continue;
                DOMBoardCell.setAttribute("class", assistCellClass);
                DOMBoardCell.dataset.color = DOMAssistCell.dataset.color;
                DOMBoardCell.innerHTML = DOMAssistCell.innerHTML;
            } else {  // 非表示
                const DOMCell = DOMTemplateCells[board[y][x]].cloneNode(true);
                const boardCellClass = DOMBoardCell.getAttribute("class");
                const cellClass = DOMCell.getAttribute("class");
                if (boardCellClass !== assistCellClass) continue;
                DOMBoardCell.setAttribute("class", cellClass);
                DOMBoardCell.dataset.color = DOMCell.dataset.color;
                DOMBoardCell.innerHTML = DOMCell.innerHTML;
            }
            const DOMScore = DOMBoardCell.querySelector("text");
            DOMScore.textContent = String(scoreBoard[y][x]);
            if (isOnHint) {
                DOMScore.classList.replace("hidden", "shown");
            }
        }
    }

    // console.groupEnd("onAssist");  // デバッグ用

    return isOnAssist = isOn;
}

/** ヒント表示
 * @param {boolean} [isOn=true] 表示するかどうか
 * @returns {boolean} 表示中かどうか
 */
function onHint(isOn = true) {
    // console.group("onHint");  // デバッグ用

    const DOMScores = DOMBoard.querySelectorAll("svg > text");
    DOMScores.forEach((DOMScore) => {
        if (isOn) {
            DOMScore.classList.replace("hidden", "shown");
        } else {
            DOMScore.classList.replace("shown", "hidden");
        }
    });

    // console.groupEnd("onHint");  // デバッグ用

    return isOnHint = isOn;
}

/** 盤面の2次元座標の1次元化
 * @param {number} x 盤面のx座標
 * @param {number} y 盤面のy座標
 * @param {number} [W=PARAMETERS.BOARD_WIDTH] 盤面の横幅
 * @returns {number} 盤面の1次元座標
 */
function xyToIndex(x, y, W = PARAMETERS.BOARD_WIDTH) {
    // console.group("xyToIndex");  // デバッグ用

    const Nx = W+2;
    const index = y*Nx + x;

    // console.groupEnd("xyToIndex");  // デバッグ用
    return index;
}

/** 盤面の1次元座標の2次元化
 * @param {number} index 盤面の1次元座標
 * @param {number} [W=PARAMETERS.BOARD_WIDTH] 盤面の横幅
 * @returns {number[]} 盤面のx座標とy座標の組
 */
function indexToXY(index, W = PARAMETERS.BOARD_WIDTH) {
    // console.group("indexToXY");  // デバッグ用

    const Nx = W+2;
    const x = index%Nx;
    const y = Math.trunc(index/Nx);

    // console.groupEnd("indexToXY");  // デバッグ用
    return [x, y];
}

/** 着手位置指定
 * @param {number} x 盤面のx座標
 * @param {number} y 盤面のy座標
 */
async function onCellPut(x, y) {
    // console.group("onCellPut");  // デバッグ用

    // 無効化
    if (isGameOver || isAITurn || isPassed) return;

    // パラメータ設定確定
    if (!isOnInput) {
        isOnInput = true;
        await onEnter();
    }

    // 着手
    if (!checkCanPut(x, y, turn, true)) {
        DOMMessage.textContent = `Cannot put ${COLOR_TEXT[turn]} here.\n`;
        return;
    }
    DOMMessage.textContent = "";

    await changeTurn();
    await AIListPut();

    // console.groupEnd("onCellPut");  // デバッグ用
}

/** 着手可能位置判定
 * @param {number} x 盤面のx座標
 * @param {number} y 盤面のy座標
 * @param {number} [color=turn] 手番
 * @param {boolean} [isFlip=false] 実際に着手する(反転を行う)かどうか
 * @param {boolean} [isReal=true] 走査対象がboardかどうか
 * @returns {number} 反転可能個数
 */
function checkCanPut(x, y, color = turn, isFlip = false, isReal = true) {
    // console.group("checkCanPut");  // デバッグ用

    const DOMBoardCell = DOMBoardCells[y][x];
    let countFlip = 0;  // 反転可能個数

    // 外周は着手不可
    if (!checkInsideBoard(x, y)) return 0;

    // 着手済みなら着手不可
    const board_yx = (isReal) ?board[y][x] :virtualBoard[y][x];
    if (board_yx > COLOR_ID.NONE) return 0;

    // 初期配置手動モード
    if (PARAMETERS.HAND_MODE) {
        if (checkInsideBoard(x, y, INIT_AREA.WEST, INIT_AREA.EAST, INIT_AREA.NORTH, INIT_AREA.SOUTH)) {
            if (isFlip) {
                if (isReal) {
                    onHighlightAllHide();
                    put(x, y, color);
                    const strXY = `${String.fromCharCode(x-1+"A".charCodeAt(0))}${y}`;
                    console.log(`turn: ${COLOR_TEXT[color]}, x: ${x}, y: ${y}, xy: ${strXY}`);  // ログ用
                    record += strXY;  // ログ用
                    onHighlight(x, y, color, true);
                    DOMBoardCell.querySelector("rect.highlight-stone").classList.add("highlight-put");
                } else {
                    virtualBoard[y][x] = color;
                }
            }
            return 1;
        } else {
            return 0;
        }
    }

    let isFirstPut = true;  // 指定位置に置くのは1回だけ
    for (let dy = -1; dy <= 1; dy++) {  // 縦方向
        for (let dx = -1; dx <= 1; dx++) {  // 横方向
            if (dx === 0 && dy === 0) continue;
            let flipX = x+dx;  // 横隣接
            let flipY = y+dy;  // 縦隣接
            let flipN = 0;     // 挟んだ個数
            let board_filpYX = (isReal) ?board[flipY][flipX] :virtualBoard[flipY][flipX];
            while (! (board_filpYX === color || board_filpYX === COLOR_ID.NONE)) {  // 自色または外周に到達するまで
                flipX += dx;
                flipY += dy;
                flipN++;
                board_filpYX = (isReal) ?board[flipY][flipX] :virtualBoard[flipY][flipX];
            }
            if (flipN === 0 || board_filpYX === COLOR_ID.NONE) continue;
            // 挟んでいるなら反転可能としてカウント
            countFlip += flipN;

            if (!isFlip) continue;
            if (isFirstPut) {
                if (isReal) {
                    isFirstPut = false;
                    // 全位置のハイライト非表示
                    onHighlightAllHide();
                    // 実際に着手する
                    put(x, y, color);
                    const strXY = `${String.fromCharCode(x-1+"A".charCodeAt(0))}${y}`;
                    console.log(`turn: ${COLOR_TEXT[color]}, x: ${x}, y: ${y}, xy: ${strXY}`);  // ログ用
                    record += strXY;  // ログ用
                    // 着手位置のハイライト表示
                    onHighlight(x, y, color, true);
                    DOMBoardCell.querySelector("rect.highlight-stone").classList.add("highlight-put");
                } else {
                    virtualBoard[y][x] = color;
                }
            }

            flipX = x+dx;
            flipY = y+dy;
            while (flipN > 0) {
                if (isReal) {
                    // 実際に反転する
                    put(flipX, flipY, color);
                    // 反転位置のハイライト表示
                    onHighlight(flipX, flipY, color, true);
                } else {
                    virtualBoard[flipY][flipX] = color;
                }
                flipX += dx;
                flipY += dy;
                flipN--;
            }
        }
    }
    // console.groupEnd("checkCanPut");  // デバッグ用

    return countFlip;
}

/** 着手可能盤面判定(パスでないか判定)
 * @param {number} [color=turn] 手番
 * @returns {boolean} 着手可能な位置がある盤面かどうか
 */
function checkCanPutAny(color = turn) {
    // console.group("checkCanPutAny");  // デバッグ用

    for (let y = 1; y <= PARAMETERS.BOARD_HEIGHT; y++) {
        for (let x = 1; x <= PARAMETERS.BOARD_WIDTH; x++) {
            if (checkCanPut(x, y, color)) return true;
        }
    }

    // console.groupEnd("checkCanPutAny");  // デバッグ用

    return false;
}

/** 盤面範囲内判定
 * @param {number} x 盤面のx座標
 * @param {number} y 盤面のy座標
 * @param {number} [xFirst=1] x軸始点
 * @param {number} [xLast=PARAMETERS.BOARD_WIDTH] x軸終点
 * @param {number} [yFirst=1] y軸始点
 * @param {number} [yLast=PARAMETERS.BOARD_HEIGHT] y軸終点
 */
function checkInsideBoard(x, y, xFirst = 1, xLast = PARAMETERS.BOARD_WIDTH,
                                yFirst = 1, yLast = PARAMETERS.BOARD_HEIGHT) {
    // console.group("checkInsideBoard");  // デバッグ用

    const isInX = xFirst <= x && x <= xLast;
    const isInY = yFirst <= y && y <= yLast;

    // console.groupEnd("checkInsideBoard");  // デバッグ用
    return isInX && isInY;
}

/** 指定位置のハイライト表示
 * @param {number} x 盤面のx座標
 * @param {number} y 盤面のy座標
 * @param {number} [color=turn] 手番
 * @param {boolean} [isOn=true] 表示するかどうか
 * @returns {boolean} 表示中かどうか
 */
function onHighlight(x, y, color = turn, isOn = true) {
    // console.group("onHighlight");  // デバッグ用

    if (!checkInsideBoard(x, y)) return;

    const DOMBoardCell = DOMBoardCells[y][x];
    const DOMCell = DOMTemplateCells[board[y][x]].cloneNode(true);
    const DOMHighlightCell = DOMTemplateHighlights[color].cloneNode(true);
    const cellClass = DOMCell.getAttribute("class");
    const highLightCellClass = DOMHighlightCell.getAttribute("class");

    if (isOn) {  // 表示
        DOMBoardCell.setAttribute("class", highLightCellClass);
        DOMBoardCell.dataset.color = DOMHighlightCell.dataset.color;
        DOMBoardCell.innerHTML = DOMHighlightCell.innerHTML;
    } else {  // 非表示
        DOMBoardCell.setAttribute("class", cellClass);
        DOMBoardCell.dataset.color = DOMCell.dataset.color;
        DOMBoardCell.innerHTML = DOMCell.innerHTML;
    }
    DOMBoardCell.querySelector("text").textContent = String(scoreBoard[y][x]);
    if (weightBoard[y][x] > 1) {
        DOMBoardCell.classList.add("lucky");
    }
    if (PARAMETERS.HAND_MODE
     && !checkInsideBoard(x, y, INIT_AREA.WEST, INIT_AREA.EAST, INIT_AREA.NORTH, INIT_AREA.SOUTH)) {
        DOMBoardCell.classList.add("not-init_area");
    }

    // console.groupEnd("onHighlight");  // デバッグ用

    return isOn;
}

/** 全位置のハイライト非表示 */
function onHighlightAllHide() {
    // console.group("onHighlightAllHide");  // デバッグ用

    for (let y = 1; y <= PARAMETERS.BOARD_HEIGHT; y++) {
        for (let x = 1; x <= PARAMETERS.BOARD_WIDTH; x++) {
            onHighlight(x, y, turn, false);
        }
    }

    // console.groupEnd("onHighlightAllHide");  // デバッグ用
}

/** 設置
 * @description 盤面の指定位置を指定色で上書き
 * @param {number} x 盤面のx座標
 * @param {number} y 盤面のy座標
 * @param {number} [color=turn] 手番
 */
function put(x, y, color = turn) {
    // console.group("put");  // デバッグ用

    if (!checkInsideBoard(x, y)) return;

    board[y][x] = color;
    const DOMBoardCell = DOMBoardCells[y][x];
    const DOMCell = DOMTemplateCells[color].cloneNode(true);
    DOMBoardCell.dataset.color = DOMCell.dataset.color;
    DOMBoardCell.innerHTML = DOMCell.innerHTML;
    DOMBoardCell.querySelector("text").textContent = String(scoreBoard[y][x]);
    if (weightBoard[y][x] > 1) {
        DOMCell.classList.add("lucky");
    }
    if (PARAMETERS.HAND_MODE
     && !checkInsideBoard(x, y, INIT_AREA.WEST, INIT_AREA.EAST, INIT_AREA.NORTH, INIT_AREA.SOUTH)) {
        DOMCell.classList.add("not-init_area");
    }

    // console.groupEnd("put");  // デバッグ用
}

/** 手番変更 */
async function changeTurn() {
    // console.group("changeTurn");  // デバッグ用

    // 番兵プレイヤー判定
    let isSentinelTurn = checkSentinelTurn(turn);

    // 進捗カウント
    if (!isSentinelTurn || !isPassed) {
        gameProgress++;
    }
    // console.log({gameProgress});  // デバッグ用

    // 初期配置手動モード継続判定
    if (PARAMETERS.HAND_MODE) {
        let colorNum = PARAMETERS.COLOR_NUM;
        if (isOnlyAI) {
            colorNum--;
        }
        const initNum = 2;  // 各色の初期配置枚数
        const isHand = gameProgress < colorNum*initNum;
        // 各色置ききれば(初期配置終了すれば)通常着手モードに移行
        if (!isHand) {
            for (let y = 1; y <= PARAMETERS.BOARD_HEIGHT; y++) {
                for (let x = 1; x <= PARAMETERS.BOARD_WIDTH; x++) {
                    const DOMCell = DOMBoardCells[y][x];
                    if (x < INIT_AREA.WEST  || INIT_AREA.EAST  < x
                     || y < INIT_AREA.NORTH || INIT_AREA.SOUTH < y) {
                        DOMCell.classList.remove("not-init_area");
                    }
                }
            }
        }
        PARAMETERS.HAND_MODE = isHand;
    }

    // 終了判定
    isGameOver = checkGameOver();
    if (isGameOver) return;

    // アシスト非表示
    if (isOnAssist) {
        onAssist(turn, false);
    }
    // ヒント非表示
    if (isOnHint) {
        onHint(false);
    }

    // 手番更新
    turn = nextTurn(turn);
    const DOMTurnColor = DOMTurn.querySelector("span.color-text");
    DOMTurnColor.textContent = COLOR_TEXT[turn];
    DOMTurnColor.dataset.color = COLOR_TEXT[turn].toLowerCase();

    // 番兵プレイヤー判定
    isSentinelTurn = checkSentinelTurn(turn);

    // パス判定
    if (isSentinelTurn) {  // 番兵プレイヤーならパス
        isPassed = true;
    } else {  // 着手可能な位置がないならパス
        isPassed = !checkCanPutAny(turn);
    }

    if (isPassed) {
        if (!isSentinelTurn) {  // 番兵プレイヤーなら何もしない
            DOMMessage.textContent = `Cannot put ${COLOR_TEXT[turn]} any position. ${COLOR_TEXT[turn]} is passed.\n`;
            console.log(`turn: ${COLOR_TEXT[turn]}, pass`);  // ログ用
            // 無効化
            DOMAssist.disabled = true;
            DOMHint.disabled = true;
            // console.time("wait");  // デバッグ用
            await wait(PARAMETERS.DELAY_MSEC);
            // console.timeEnd("wait");  // デバッグ用
            // 有効化
            DOMAssist.disabled = false;
            DOMHint.disabled = false;
        }
        await changeTurn();
        await AIListPut();
    }

    // console.groupEnd("changeTurn");  // デバッグ用
}

/** 番兵プレイヤー判定
 * @param {number} [color=turn] 手番
 * @returns {boolean} 番兵プレイヤーかどうか
 */
function checkSentinelTurn(color = turn) {
    // console.group("checkSentinelTurn");  // デバッグ用

    // console.groupEnd("checkSentinelTurn");  // デバッグ用
    return isOnlyAI && !PARAMETERS.AI_LIST.includes(color);
}

/** 次の手番
 * @param {number} [color=turn] 手番
 * @returns {number} 次の手番
 */
function nextTurn(color = turn, N = PARAMETERS.COLOR_NUM) {
    // console.group("nextTurn");  // デバッグ用

    // console.groupEnd("nextTurn");  // デバッグ用
    return (color+N)%N + 1;
}

/** 前の手番
 * @param {number} [color=turn] 手番
 * @returns {number} 前の手番
 */
function prevTurn(color = turn, N = PARAMETERS.COLOR_NUM) {
    // console.group("prevTurn");  // デバッグ用

    // console.groupEnd("prevTurn");  // デバッグ用
    return nextTurn(color-2, N);
}

/** 指定色の個数をカウント
 * @param {number} [color=turn] 手番
 * @returns {number} 個数
 */
function colorCount(color = turn) {
    // console.group("colorCount");  // デバッグ用

    let count = 0;
    for (let y = 1; y <= PARAMETERS.BOARD_HEIGHT; y++) {
        for (let x = 1; x <= PARAMETERS.BOARD_WIDTH; x++) {
            if (board[y][x] === color) {
                count += weightBoard[y][x];
            }
        }
    }

    // console.groupEnd("colorCount");  // デバッグ用

    return count
}

/** 終了判定, 勝敗判定
 * @returns {boolean} 終了かどうか
 */
function checkGameOver() {
    // console.group("checkGameOver");  // デバッグ用

    let colorNum = PARAMETERS.COLOR_NUM;

    // 全員パスかどうか判定
    for (let c = COLOR_ID.NONE+1; c <= colorNum; c++) {
        if (checkCanPutAny(c)) return false;  // 続行
    }

    // 各色の個数をカウント
    const colorCounts = new Array(colorNum+1).fill(0);
    for (let c = COLOR_ID.NONE; c <= colorNum; c++) {
        colorCounts[c] = colorCount(c);
    }

    // 結果表示
    let result = "";
    let isEqAll = true;  // すべて同個数かどうか
    let maxCount = 0;  // 最大個数
    let maxColor = COLOR_ID.NONE;  // 最大個数手番
    if (isOnlyAI) {
        colorNum--;
    }
    for (let c = COLOR_ID.NONE+1; c <= colorNum; c++) {
        result += `${COLOR_TEXT[c]}=${colorCounts[c]}, `;
        if (c < colorNum && colorCounts[c] !== colorCounts[c+1]) {
            isEqAll = false;
        }
        if (maxCount < colorCounts[c]) {
            maxCount = colorCounts[c];
            maxColor = c;
        }
    }
    if (isEqAll) {  // すべて同個数なら引き分け
        result += "draw.";
    } else {  // 最大個数が勝ち
        result += `${COLOR_TEXT[maxColor]} won.`;
    }

    // DOMTurn.textContent = "";
    DOMMessage.textContent = "This game was over.";
    DOMResult.textContent = result;
    DOMRecord.textContent = record;

    DOMTurn.classList.replace("shown", "hidden");
    DOMMessage.classList.replace("hidden", "shown");
    DOMResult.classList.replace("hidden", "shown");
    DOMRecord.classList.replace("hidden", "shown");

    // ハイライト非表示
    onHighlightAllHide();
    // アシスト非表示
    onAssist(turn, false);
    // ヒント非表示
    onHint(false);
    // 無効化
    DOMAssist.disabled = true;
    DOMHint.disabled = true;

    // setTimeout(() => alert("This game was over."), 0);  // アラート用
    console.log("This game was over.");  // ログ用
    console.log(`result: ${result}`);  // ログ用
    console.log(`record: ${record}`);  // ログ用

    // console.groupEnd("checkGameOver");  // デバッグ用

    return true;  // 終了
}

/** 指定ミリ秒停止, AIの思考時間の視覚化
 * @param {number} delayMsec 停止時間[ms]
 */
function wait(delayMsec) {
    // console.group("wait");  // デバッグ用

    // 停止しない
    if (delayMsec <= 0) {
        return new Promise((resolve) => {
            // console.groupEnd("wait");  // デバッグ用
            resolve();
        });
    }

    // プレイヤーのパスなら長くする
    if (!isAITurn) {
        const ext = 2;
        delayMsec *= ext;
    }

    const DOMProgress = DOMWait.querySelector("progress#progress");
    const DOMLabel = DOMWait.querySelector('label[for="progress"]');
    const DOMOutput = DOMWait.querySelector('output[for="progress"]');

    let progress = 0;  // AIの思考の進捗
    DOMLabel.textContent = (isAITurn && !isPassed) ?"AI thinking ..." :"Please wait ...";
    DOMProgress.value = `${progress}`;
    DOMProgress.textContent = `${progress}%`;
    DOMOutput.textContent = `${progress}%`;
    DOMWait.classList.replace("hidden", "shown");

    let intervalMsec = Math.max(delayMsec/Number(DOMProgress.max), 4);
    let intervalStep = Math.trunc(Number(DOMProgress.max)/(delayMsec/intervalMsec));

    return new Promise((resolve) => {
        // console.time("setInterval");  // デバッグ用
        intervalID = setInterval(() => {
            // console.timeLog("setInterval");  // デバッグ用
            progress += intervalStep;
            DOMProgress.value = `${progress}`;
            DOMProgress.textContent = `${progress}%`;
            DOMOutput.textContent = `${progress}%`;
            // console.log({progress});  // デバッグ用
            if (progress >= Number(DOMProgress.max)) {
                // console.groupEnd("wait");  // デバッグ用
                // console.log({resolve});  // デバッグ用
                DOMWait.classList.replace("shown", "hidden");
                clearInterval(intervalID);
                // console.timeEnd("setInterval");  // デバッグ用
                resolve();
            }
        }, intervalMsec);
    });
}

/** AIList着手 */
async function AIListPut() {
    // console.group("AIListPut");  // デバッグ用

    for (const _ of PARAMETERS.AI_LIST) {
        await AIPut();
    }

    // console.groupEnd("AIListPut");  // デバッグ用
}

/** AI着手 */
async function AIPut() {
    // console.group("AIPut");  // デバッグ用

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
    checkCanPut(AIx, AIy, turn, true);
    DOMMessage.textContent = "";
    isAITurn = false;
    // 有効化
    DOMAssist.disabled = false;
    DOMHint.disabled = false;

    await changeTurn();

    // console.groupEnd("AIPut");  // デバッグ用
}

/** AI思考
 * @param {number} [level=0] AI思考レベル
 * @returns {number[]} 盤面のx座標とy座標の組
 */
function AIThink(level = 0) {
    // console.group("AIThink");  // デバッグ用

    /*
    // 最短5連続パス, 黒プレイヤーにパスさせるデバッグ用
    if (PARAMETERS.BOARD_WIDTH === 8 && PARAMETERS.BOARD_HEIGHT === 8
     && turn === COLOR_ID.WHITE) {
        if (checkCanPut(6, 8, COLOR_ID.WHITE, true)) return [6, 8];
        if (checkCanPut(4, 8, COLOR_ID.WHITE, true)) return [4, 8];
        if (checkCanPut(3, 7, COLOR_ID.WHITE, true)) return [3, 7];
        if (checkCanPut(8, 4, COLOR_ID.WHITE, true)) return [8, 4];
    }
    */

    switch (level) {
        case 0: return AIThink0();
        case 1: return AIThink1();
        case 2: return AIThink2();
        case 3: return AIThink3();
        case 4: return AIThink4();
        case 5: return AIThink5();
        default: exit();
    }

    // console.groupEnd("AIThink");  // デバッグ用
}

/** AI思考レベル0
 * @description 着手可能な位置のうち(左上から)最初に見つけた位置に着手する
 * @returns {number[]} 盤面のx座標とy座標の組
 */
function AIThink0() {
    // console.group("AIThink0");  // デバッグ用

    for (let y = 1; y <= PARAMETERS.BOARD_HEIGHT; y++) {
        for (let x = 1; x <= PARAMETERS.BOARD_WIDTH; x++) {
            if (checkCanPut(x, y)) return [x, y];
        }
    }

    // console.groupEnd("AIThink0");  // デバッグ用
}

/** AI思考レベル1
 * @description 着手可能な位置のうち無作為に選ばれた位置に着手する
 * @returns {number[]} 盤面のx座標とy座標の組
 */
function AIThink1() {
    // console.group("AIThink1");  // デバッグ用

    let canPutXYList = [];  // 着手位置の候補リスト
    for (let y = 1; y <= PARAMETERS.BOARD_HEIGHT; y++) {
        for (let x = 1; x <= PARAMETERS.BOARD_WIDTH; x++) {
            if (!checkCanPut(x, y)) continue;
            canPutXYList.push([x, y]);
        }
    }
    // console.log(canPutXYList);  // デバッグ用
    // console.groupEnd("AIThink1");  // デバッグ用

    return canPutXYList[randomInt(canPutXYList.length)];
}

/** AI思考レベル2
 * @description 着手可能なうち反転可能個数が最大な位置に着手する(その位置が複数あるなら無作為に選択する)
 * @returns {number[]} 盤面のx座標とy座標の組
 */
function AIThink2() {
    // console.group("AIThink2");  // デバッグ用

    let canPutCountFlipMax = 1;  // 着手可能なうちの最大反転個数
    let canPutXYList = [];  // 着手位置の候補リスト
    for (let y = 1; y <= PARAMETERS.BOARD_HEIGHT; y++) {
        for (let x = 1; x <= PARAMETERS.BOARD_WIDTH; x++) {
            let canPutCountFlip = checkCanPut(x, y);
            if (canPutCountFlipMax <= canPutCountFlip) {
                if (canPutCountFlipMax < canPutCountFlip) {
                    canPutXYList = [];
                }
                canPutCountFlipMax = canPutCountFlip;
                canPutXYList.push([x, y]);
            }
        }
    }
    // console.log(canPutXYList);  // デバッグ用
    // console.groupEnd("AIThink2");  // デバッグ用

    return canPutXYList[randomInt(canPutXYList.length)];
}

/** AI思考レベル3
 * @description 着手可能な位置で評価値が最大の位置に着手する(その位置が複数ある場合は無作為に選ぶ)
 * @returns {number[]} 盤面のx座標とy座標の組
 */
function AIThink3() {
    // console.group("AIThink3");  // デバッグ用

    let canPutScoreMax = scoreBoard[0][0]-1;  // 着手可能な位置の最大評価値
    let canPutXYList = [];  // 着手位置の候補リスト
    for (let y = 1; y <= PARAMETERS.BOARD_HEIGHT; y++) {
        for (let x = 1; x <= PARAMETERS.BOARD_WIDTH; x++) {
            if (checkCanPut(x, y) && canPutScoreMax <= scoreBoard[y][x]) {
                if (canPutScoreMax < scoreBoard[y][x]) {
                    canPutXYList = [];
                }
                canPutScoreMax = scoreBoard[y][x];
                canPutXYList.push([x, y]);
            }
        }
    }
    // console.log(canPutXYList);  // デバッグ用
    // console.groupEnd("AIThink3");  // デバッグ用

    return canPutXYList[randomInt(canPutXYList.length)];
}

/** AI思考レベル4
 * @description 次の手番の着手可能な位置の評価値の最大値が最小になる位置に着手する(その位置が複数ある場合は無作為に選ぶ)
 * @returns {number[]} 盤面のx座標とy座標の組
 */
function AIThink4() {
    // console.group("AIThink4");  // デバッグ用

    let nextCanPutScoreMaxMin = scoreBoard[1][1]+1;  // 次の手番の着手可能な位置の評価値の最大値の最小値
    let canPutXYList = [];  // 着手位置の候補リスト
    for (let y = 1; y <= PARAMETERS.BOARD_HEIGHT; y++) {
        for (let x = 1; x <= PARAMETERS.BOARD_WIDTH; x++) {
            virtualBoard = structuredClone(board);
            if (!checkCanPut(x, y, turn, true, false)) continue;
            // console.log(`x=${x}, y=${y}, score=${scoreBoard[y][x]}`);  // デバッグ用

            let nextCanPutScoreMax = scoreBoard[0][0]-1;  // 次の手番の着手可能な位置の評価値の最大値
            for (let nextY = 1; nextY <= PARAMETERS.BOARD_HEIGHT; nextY++) {
                for (let nextX = 1; nextX <= PARAMETERS.BOARD_WIDTH; nextX++) {
                    if (!checkCanPut(nextX, nextY, nextTurn(turn), false, false)) continue;
                    nextCanPutScoreMax = Math.max(nextCanPutScoreMax, scoreBoard[nextY][nextX]);
                    // console.group("nextX=", nextX, "nextY=", nextY, "score=", scoreBoard[nextY][nextX]);  // デバッグ用
                }
            }

            if (nextCanPutScoreMaxMin >= nextCanPutScoreMax) {
                if (nextCanPutScoreMaxMin > nextCanPutScoreMax) {
                    canPutXYList = [];
                }
                nextCanPutScoreMaxMin = nextCanPutScoreMax;
                canPutXYList.push([x, y]);
            }
        }
    }
    // console.log(canPutXYList);  // デバッグ用
    // return canPutXYList[randomInt(canPutXYList.length)];

    let canPutScoreMax = scoreBoard[0][0];  // 着手位置の候補リストのうち自手番の評価値の最大値
    let canPutScoreMaxXYList = [];  // 着手位置の候補リストのうち自手番の評価値が最大になる位置のリスト
    for (const [x, y] of canPutXYList) {
        if (canPutScoreMax <= scoreBoard[y][x]) {
            if (canPutScoreMax < scoreBoard[y][x]) {
                canPutScoreMaxXYList = [];
            }
            canPutScoreMax = scoreBoard[y][x];
            canPutScoreMaxXYList.push([x, y]);
        }
    }
    // console.log(canPutScoreMaxXYList);  // デバッグ用
    // console.groupEnd("AIThink4");  // デバッグ用

    return canPutScoreMaxXYList[randomInt(canPutScoreMaxXYList.length)];
}

/** AI思考レベル5
 * @description 試合進捗によってAI思考レベルを変動させる
 * @returns {number[]} 盤面のx座標とy座標の組
 */
function AIThink5() {
    // console.group("AIThink5");  // デバッグ用

    // console.groupEnd("AIThink5");  // デバッグ用

    const PHASE_NUM = 4;
    if (gameProgress < Math.trunc(GAME_PROGRESS_MAX/PHASE_NUM)) {  // 序盤
        // console.group("序盤");  // デバッグ用
        return AIThink3();
    } else if (gameProgress < Math.trunc(GAME_PROGRESS_MAX*2/PHASE_NUM)) {  // 中盤1
        // console.group("中盤1");  // デバッグ用
        return AIThink3();
    } else if (gameProgress < Math.trunc(GAME_PROGRESS_MAX*3/PHASE_NUM)) {  // 中盤2
        // console.group("中盤2");  // デバッグ用
        return AIThink4();
    } else {  // 終盤
        // console.group("終盤");  // デバッグ用
        return AIThink2();
    }
}
});
