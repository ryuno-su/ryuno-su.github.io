window.addEventListener("DOMContentLoaded", async () => {
"use strict";  // 厳格モード
// console.trace("DOMContentLoaded");  // デバッグ用

/** 自作ライブラリ */
// const Library = await import("../library/library.js");  // デバッグ用
const Library = await import("../library/library.min.js");

// div#edit-area
const DOM_INSTRUCTIONS = document.querySelectorAll("details#instruction-area input");
const DOM_ENVIRONMENTS = document.querySelectorAll("details#environment-area input");
const DOMSource = document.querySelector("textarea#source");
const DOMInput = document.querySelector("textarea#input");
const DOMRun = document.querySelector("button#run");
const DOMStepRun = document.querySelector("button#step-run");
const DOMKill = document.querySelector("button#kill");
// div#result-area
const DOMProgram = document.querySelector("div#program");
const DOMMemory = document.querySelector("div#memory");
const DOMOutput = document.querySelector("div#output");
const DOMLog = document.querySelector("div#log");

/** Brainfuck命令パラメータ既定値 */
const DEFAULT_INSTRUCTIONS = Object.freeze({
    PTR_INCREMENT: ">",  // ポインタをインクリメントする
    PTR_DECREMENT: "<",  // ポインタをデクリメントする
    VAL_INCREMENT: "+",  // ポインタが指す値をインクリメントする
    VAL_DECREMENT: "-",  // ポインタが指す値をデクリメントする
    VAL_INPUT    : ",",  // 入力から1文字読み込んで、ポインタが指す先に代入する
    VAL_OUTPUT   : ".",  // ポインタが指す値を文字として出力に書き出す
    LOOP_BEGIN   : "[",  // ポインタが指す値が0なら、対応する]の直後にジャンプする
    LOOP_END     : "]",  // ポインタが指す値が0でないなら、対応する[の直後にジャンプする
    BREAK_POINT  : "@",  // ブレークポイント(実行を一時停止する)
    COMMENT_LINE : "#",  // コメント行
});

/** Brainfuck環境パラメータ既定値 */
const DEFAULT_ENVIRONMENTS = Object.freeze({
    PTR_MAX   : 255  ,  // メモリアドレスの上限値(下限値は0)
    VAL_MAX   : 255  ,  // メモリセルに格納できる上限値(下限値は0)
    STEP_MAX  : 20000,  // 実行ステップ数の上限値(max値を指定すると上限解除)
    DELAY_MSEC: 1    ,  // 一括実行時の各命令の待機時間[ms](0[ms]は最終結果のみ表示)
});

// Brainfuck用パラメータ設定検証用
let INSTRUCTIONS = window.structuredClone(DEFAULT_INSTRUCTIONS);
let ENVIRONMENTS = window.structuredClone(DEFAULT_ENVIRONMENTS);

// Brainfuck用変数
let program = "";  // プログラム
let programCounter = 0;  // プログラムカウンタ
let programCounterPrev = 0;  // 直前のプログラムカウンタ
let loop = new Library.Stack();  // ループネスト用スタック
let memory = [];  // メモリ
let pointer = 0;  // ポインタ
let pointerPrev = 0;  // 直前のポインタ
let input = "";  // 入力バッファ
let inputCounter = 0;  // 入力バッファのカウンタ
let output = "";  // 出力バッファ
let isInit = false;  // 初期化済みかどうか
let isStepRun = false;  // ステップ実行かどうか
let isFirstRun = true;  // 初回実行かどうか
let isError = false;  // プログラムにエラーがあるかどうか
let step = 0;  // 実行ステップ数
let timeoutID = 0;  // タイマーのclear用

// エントリー
main();

/** メイン
 * @description DOM要素にイベントリスナーを登録する
 */
function main() {
    // console.trace("main");  // デバッグ用

    const DOMEditArea = document.querySelector("div#edit-area");  // バブリング用
    const DOMInstructionArea = document.querySelector("details#instruction-area");
    const DOMEnvironmentArea = document.querySelector("details#environment-area");

    // 既定初期化
    document.documentElement.scrollIntoView();  // ページ上端にスクロール
    initialize();

    // Brainfuck用パラメータ設定検証
    DOMEditArea.addEventListener("input", (event) => {
        // console.trace("edit-area input");  // デバッグ用

        event.target.focus();  // イベント対象にフォーカス

        if (!validateParameter()) return;
        initialize();
    });

    // 一括実行
    DOMRun.addEventListener("click", async (event) => {
        // console.trace("run click");  // デバッグ用

        event.currentTarget.focus();  // イベント対象にフォーカス

        // 無効化
        DOMRun.disabled = true;
        DOMStepRun.disabled = true;

        isStepRun = false;
        await run();
    });

    // ステップ実行
    DOMStepRun.addEventListener("click", async (event) => {
        // console.trace("step-run click");  // デバッグ用

        event.currentTarget.focus();  // イベント対象にフォーカス

        isStepRun = true;
        await run();
    });

    // 強制終了
    DOMKill.addEventListener("click", async (event) => {
        // console.trace("kill click");  // デバッグ用

        event.currentTarget.focus();  // イベント対象にフォーカス

        if (!isInit) return;

        // 実行中なら確認を求める
        if (!window.confirm("Realy kill?")) return;

        window.clearTimeout(timeoutID);
        isError = true;
        runAfter();
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
                if (DOMFirstWidget.matches("details#instruction-area *")) {
                    DOMInstructionArea.open = true;
                }
                if (DOMFirstWidget.matches("details#environment-area *")) {
                    DOMEnvironmentArea.open = true;
                }
                DOMFirstWidget.focus();
                break;
            case "i":  // Brainfuck命令パラメータ設定アコーディオン開閉切り替え
                DOMInstructionArea.querySelector("summary").focus();  // アコーディオン見出しにフォーカス
                DOMInstructionArea.open ^= true;
                break;
            case "e":  // Brainfuck環境パラメータ設定アコーディオン開閉切り替え
                DOMEnvironmentArea.querySelector("summary").focus();  // アコーディオン見出しにフォーカス
                DOMEnvironmentArea.open ^= true;
                break;
            case "r":  // 一括実行
                if (!DOMRun.disabled) {
                    DOMRun.click();
                }
                break;
            case "s":  // ステップ実行
                if (!DOMStepRun.disabled) {
                    DOMStepRun.click();
                }
                break;
            case "k":  // 強制終了
                if (!DOMKill.disabled) {
                    DOMKill.click();
                }
                break;
            default:
                break;
        }
    });

    // ウィンドウ離脱抑止(確認を求める)
    window.addEventListener("beforeunload", (event) => {
        // console.trace("window beforeunload");  // デバッグ用

        // 実行中でないなら確認を求めない
        if (isInit) return;

        event.preventDefault();  // デフォルトのウィンドウ(ページ)離脱を抑止する
    });
}

/** 初期化群 */
function initialize() {
    // console.trace("initialize");  // デバッグ用

    init();
    createResult();
    drawResult();
}

/** Brainfuck用パラメータ既定値設定 */
function defineParameter() {
    // console.trace("defineParameter");  // デバッグ用

    // Brainfuck命令パラメータ
    DOM_INSTRUCTIONS.forEach((DOM_INSTRUCTION) => {
        DOM_INSTRUCTION.value = DEFAULT_INSTRUCTIONS[DOM_INSTRUCTION.id];
    });
    INSTRUCTIONS = window.structuredClone(DEFAULT_INSTRUCTIONS);

    // Brainfuck環境パラメータ
    DOM_ENVIRONMENTS.forEach((DOM_ENVIRONMENT) => {
        DOM_ENVIRONMENT.value = DEFAULT_ENVIRONMENTS[DOM_ENVIRONMENT.id];
    });
    ENVIRONMENTS = window.structuredClone(DEFAULT_ENVIRONMENTS);
}

/** Brainfuck用パラメータ設定検証 */
function validateParameter() {
    // console.trace("validateParameter");  // デバッグ用

    let isValidAll = true;  // すべて制約を満たすかどうか

    // Brainfuck命令パラメータ
    DOM_INSTRUCTIONS.forEach((DOM_INSTRUCTION) => {  // input[type="text"]
        const id = DOM_INSTRUCTION.id;
        const value = DOM_INSTRUCTION.value;
        const validity = DOM_INSTRUCTION.validity;

        DOM_INSTRUCTION.setCustomValidity("");
        if (validity.valid) {
            INSTRUCTIONS[id] = value;
        } else {
            isValidAll = false;
            DOM_INSTRUCTION.setCustomValidity("invalid");
            if (validity.badInput) {
                DOM_INSTRUCTION.setCustomValidity("invalid: badInput");
            } else if (validity.valueMissing) {
                DOM_INSTRUCTION.setCustomValidity("invalid: valueMissing");
            } else if (validity.tooLong) {
                DOM_INSTRUCTION.setCustomValidity("invalid: tooLong");
            } else if (validity.tooShort) {
                DOM_INSTRUCTION.setCustomValidity("invalid: tooShort");
            }
        }
    });
    // 重複は不可
    DOM_INSTRUCTIONS.forEach((DOM_INSTRUCTION) => {
        if (Object.values(INSTRUCTIONS).filter((value) => value === DOM_INSTRUCTION.value).length > 1) {
            isValidAll = false;
            DOM_INSTRUCTION.setCustomValidity("invalid: unique");
        }
        DOM_INSTRUCTION.reportValidity();
    });

    // Brainfuck環境パラメータ
    DOM_ENVIRONMENTS.forEach((DOM_ENVIRONMENT) => {  // input[type="number"]
        const id = DOM_ENVIRONMENT.id;
        const value = DOM_ENVIRONMENT.value;
        const valueNum = Number(DOM_ENVIRONMENT.value);
        const minNum = Number(DOM_ENVIRONMENT.min);
        const maxNum = Number(DOM_ENVIRONMENT.max);
        const patternReg = new RegExp(DOM_ENVIRONMENT.pattern);
        const validity = DOM_ENVIRONMENT.validity;

        DOM_ENVIRONMENT.setCustomValidity("");
        if (validity.valid && patternReg.test(value) && minNum <= valueNum && valueNum <= maxNum) {
            ENVIRONMENTS[id] = valueNum;
        } else {
            isValidAll = false;
            DOM_ENVIRONMENT.setCustomValidity("invalid");
            if (validity.badInput) {
                DOM_ENVIRONMENT.setCustomValidity("invalid: badInput");
            } else if (validity.valueMissing) {
                DOM_ENVIRONMENT.setCustomValidity("invalid: valueMissing");
            } else if (validity.rangeOverflow || valueNum > maxNum) {
                DOM_ENVIRONMENT.setCustomValidity("invalid: rangeOverflow");
            } else if (validity.rangeUnderflow || valueNum < minNum) {
                DOM_ENVIRONMENT.setCustomValidity("invalid: rangeUnderflow");
            } else if (validity.stepMismatch) {
                DOM_ENVIRONMENT.setCustomValidity("invalid: stepMismatch");
            }
        }
        DOM_ENVIRONMENT.reportValidity();
    });
    if (isValidAll) {
        ENVIRONMENTS.PTR_MAX++;
        ENVIRONMENTS.VAL_MAX++;
    }

    // Brainfuck用パラメータのいずれかが制約を満たさないなら無効化
    DOMRun.disabled = !isValidAll;
    DOMStepRun.disabled = !isValidAll;

    return isValidAll;
}

/** Brainfuck用変数初期化 */
function init() {
    // console.trace("init");  // デバッグ用

    program = DOMSource.value;
    programCounter = 0;
    programCounterPrev = 0;
    loop = new Library.Stack();
    memory = new Uint32Array(ENVIRONMENTS.PTR_MAX).fill(0);
    pointer = 0;
    pointerPrev = 0;
    input = DOMInput.value;
    inputCounter = 0;
    output = "";
    isInit = true;
    // isStepRun = false;
    isFirstRun = true;
    isError = false;
    step = 0;
    timeoutID = 0;
}

/** 描画初期化 */
function createResult() {
    // console.trace("createResult");  // デバッグ用

    // プログラム
    DOMProgram.emptyChild();
    program.forEach((p, i) => {
        const DOMSpan = document.createElement("span");
        DOMSpan.dataset.index = String(i);
        DOMSpan.className = "";
        DOMSpan.textContent = (p === "\n") ?" \n" :p;
        DOMProgram.appendChild(DOMSpan);
    });

    // メモリ
    DOMMemory.emptyChild();
    memory.forEach((m, i) => {
        const DOMSpan = document.createElement("span");
        DOMSpan.dataset.index = String(i);
        DOMSpan.className = "";
        DOMSpan.textContent = Library.padDigit(m, ENVIRONMENTS.VAL_MAX-1, "0");
        DOMMemory.appendChild(DOMSpan);
        DOMMemory.appendChild(document.createTextNode(" "));
    });

    // 出力
    DOMOutput.textContent = "";
}

/** 描画 */
function drawResult() {
    // console.trace("drawResult");  // デバッグ用

    // ステップ実行または待機有りなら途中結果を描画
    // そうでなければ最終結果のみ描画
    if (!isInit || isStepRun || ENVIRONMENTS.DELAY_MSEC > 0) {
        // プログラム
        if (programCounterPrev < program.length) {
            const DOMProgramCounterPrev = DOMProgram.querySelector(`span[data-index="${programCounterPrev}"]`);
            DOMProgramCounterPrev.classList.remove("highlight");
        }
        if (programCounter < program.length) {
            const DOMProgramCounter = DOMProgram.querySelector(`span[data-index="${programCounter}"]`);
            DOMProgramCounter.classList.add("highlight");
        }
        programCounterPrev = programCounter;

        // メモリ
        const DOMPointerPrev = DOMMemory.querySelector(`span[data-index="${pointerPrev}"]`);
        DOMPointerPrev.classList.remove("highlight");
        const DOMPointer = DOMMemory.querySelector(`span[data-index="${pointer}"]`);
        DOMPointer.classList.add("highlight");
        DOMPointer.textContent = Library.padDigit(memory[pointer], ENVIRONMENTS.VAL_MAX-1, "0");
        pointerPrev = pointer;
    } else {
        // プログラム
        const DOMProgramCounterAll = DOMProgram.querySelectorAll(`span[data-index]`);
        DOMProgramCounterAll.forEach((DOMProgramCounter) => {
            DOMProgramCounter.classList.remove("highlight");
        });

        // メモリ
        memory.forEach((m, i) => {
            const DOMPointer = DOMMemory.querySelector(`span[data-index="${i}"]`);
            DOMPointer.classList.remove("highlight");
            if (i === pointer) {
                DOMPointer.classList.add("highlight");
            }
            DOMPointer.textContent = Library.padDigit(m, ENVIRONMENTS.VAL_MAX-1, "0");
        });
    }

    // 出力
    DOMOutput.textContent = output;
}

/** 実行 */
async function run() {
    // console.trace("run");  // デバッグ用

    // 初期化
    if (!isInit) {
        initialize();
    }

    // 初回
    if (isFirstRun) {
        // 前処理
        runBefore();
        isFirstRun = false;
    }

    // 本処理
    await runMain();
    // Library.consoleTime.log("run time");  // デバッグ用
    if (!isError && isStepRun && programCounter < program.length) return;

    // 後処理
    runAfter();
}

/** 前処理 */
function runBefore() {
    // console.trace("runBefore");  // デバッグ用

    // ログ出力
    const log = "This code was begun.";
    console.log(log);
    DOMLog.textContent += `${log}\n`;
    DOMLog.scroll(0, DOMLog.scrollHeight);  // ログ内下端にスクロール
    Library.consoleTime.begin("run time");  // ログ用

    // 無効化
    DOM_INSTRUCTIONS.forEach((DOM_INSTRUCTION) => {
        DOM_INSTRUCTION.disabled = true;
    });
    DOM_ENVIRONMENTS.forEach((DOM_ENVIRONMENT) => {
        DOM_ENVIRONMENT.disabled = true;
    });
    DOMSource.disabled = true;
    DOMInput.disabled = true;
}

/** 本処理 */
async function runMain() {
    // console.trace("runMain");  // デバッグ用

    while (!isError && programCounter < program.length) {
        // console.log({programCounter});  // デバッグ用
        // console.log({step});  // デバッグ用

        // 無限ループならエラー
        if (ENVIRONMENTS.STEP_MAX !== Number(DOM_ENVIRONMENTS[2].max)  // STEP_MAX === maxなら無限ループ可
         && step >= ENVIRONMENTS.STEP_MAX) {
            // ログ出力
            const log = `Cannot run more than ${ENVIRONMENTS.STEP_MAX} steps.`;
            Library.errorAlert(log);  // アラート用
            Library.errorLog(log);
            DOMLog.textContent += `${log}\n`;
            DOMLog.scroll(0, DOMLog.scrollHeight);  // ログ内下端にスクロール
            isError = true;
            break;
        }

        // コード解析
        interpret();
        programCounter++;

        // エラーがあれば終了
        if (isError) break;

        // ステップ実行または待機有りなら描画
        if (isStepRun || ENVIRONMENTS.DELAY_MSEC > 0) {
            drawResult();
        }

        // console.time("wait");  // デバッグ用
        await wait(ENVIRONMENTS.DELAY_MSEC);  // 一時停止
        // console.timeEnd("wait");  // デバッグ用

        // ステップ実行はループしない
        if (isStepRun) break;
    }
}

/** 後処理 */
function runAfter() {
    // console.trace("runAfter");  // デバッグ用

    drawResult();
    isInit = false;

    // 有効化
    DOM_INSTRUCTIONS.forEach((DOM_INSTRUCTION) => {
        DOM_INSTRUCTION.disabled = false;
    });
    DOM_ENVIRONMENTS.forEach((DOM_ENVIRONMENT) => {
        DOM_ENVIRONMENT.disabled = false;
    });
    DOMSource.disabled = false;
    DOMInput.disabled = false;
    DOMRun.disabled = false;
    DOMStepRun.disabled = false;

    // ログ出力
    let time = Library.consoleTime.end("run time");  // ログ用
    const log = Library.dedent(`
        run time: ${time}ms
        run step: ${step}
        This code was ${(isError) ?"terminated" :"finished"}.
    `);
    // console.log(log);  // デバッグ用
    DOMLog.textContent += `${log}\n`;
    DOMLog.scroll(0, DOMLog.scrollHeight);  // ログ内下端にスクロール
}

/** コード解析 */
function interpret() {
    // console.trace("interpret");  // デバッグ用

    step++;

    switch (program[programCounter]) {
        case INSTRUCTIONS.PTR_INCREMENT:  // ポインタをインクリメントする
            pointer++;
            pointer += ENVIRONMENTS.PTR_MAX;
            pointer %= ENVIRONMENTS.PTR_MAX;
            break;
        case INSTRUCTIONS.PTR_DECREMENT:  // ポインタをデクリメントする
            pointer--;
            pointer += ENVIRONMENTS.PTR_MAX;
            pointer %= ENVIRONMENTS.PTR_MAX;
            break;
        case INSTRUCTIONS.VAL_INCREMENT:  // ポインタが指す値をインクリメントする
            memory[pointer]++;
            memory[pointer] += ENVIRONMENTS.VAL_MAX;
            memory[pointer] %= ENVIRONMENTS.VAL_MAX;
            break;
        case INSTRUCTIONS.VAL_DECREMENT:  // ポインタが指す値をデクリメントする
            memory[pointer]--;
            memory[pointer] += ENVIRONMENTS.VAL_MAX;
            memory[pointer] %= ENVIRONMENTS.VAL_MAX;
            break;
        case INSTRUCTIONS.VAL_INPUT:  // 入力から1文字読み込んで、ポインタが指す先に代入する
            if (inputCounter >= input.length) {
                memory[pointer] = 0;  // 入力命令に対して不足分はNULL文字
            } else {
                memory[pointer] = input.charCodeAt(inputCounter)%ENVIRONMENTS.VAL_MAX;  // 文字として入力
                inputCounter++;
            }
            break;
        case INSTRUCTIONS.VAL_OUTPUT:  // ポインタが指す値を文字として出力に書き出す
            output += String.fromCharCode(memory[pointer]);  // 文字として出力
            break;
        case INSTRUCTIONS.LOOP_BEGIN:  // ポインタが指す値が0なら、対応する]の直後にジャンプする
            loop.push(programCounter);  // [のプログラムカウンタを保存
            // 対応する]にジャンプ
            if (memory[pointer] === 0) {
                let depth = 0  // ネストの深さ
                while (programCounter < program.length) {  // コード終端まで探索
                    // [を見つけたらネストを深くする
                    if (program[programCounter] === INSTRUCTIONS.LOOP_BEGIN) {
                        depth++;
                    }
                    // ]を見つけたらネストを浅くする
                    if (program[programCounter] === INSTRUCTIONS.LOOP_END) {
                        depth--;
                    }
                    // 対応する]が見つかったので抜ける
                    if (depth === 0) break;
                    programCounter++;  // プログラムカウンタを進める
                }

                // 対応する]が見つかってないならエラー
                // console.log({depth});  // デバッグ用
                if (depth > 0) {
                    // ログ出力
                    const log = `Cannot find "${INSTRUCTIONS.LOOP_END}".`;
                    Library.errorAlert(log);  // アラート用
                    Library.errorLog(log);
                    DOMLog.textContent += `${log}\n`;
                    DOMLog.scroll(0, DOMLog.scrollHeight);  // ログ内下端にスクロール
                    isError = true;
                    return;
                }
                loop.pop();  // ループ終わり
            }
            break;
        case INSTRUCTIONS.LOOP_END:  // ポインタが指す値が0でないなら、対応する[の直後にジャンプする
            // [と]の対をチェック
            // console.log({loop});  // デバッグ用
            if (loop.size() === 0) {  // スタックが空なら対応する[がない
                // ログ出力
                const log = `Cannot find "${INSTRUCTIONS.LOOP_BEGIN}".`;
                Library.errorAlert(log);  // アラート用
                Library.errorLog(log);
                DOMLog.textContent += `${log}\n`;
                DOMLog.scroll(0, DOMLog.scrollHeight);  // ログ内下端にスクロール
                isError = true;
                return;
            }
            programCounter = loop.pop()-1;  // [にジャンプ
            break;
        case INSTRUCTIONS.BREAK_POINT:  // ブレークポイント(実行を一時停止する)
            drawResult();  // 強制描画
            isStepRun = true  // ステップ実行に移行
            // 無効化
            DOMRun.disabled = false;
            DOMStepRun.disabled = false;
            break;
        case INSTRUCTIONS.COMMENT_LINE:   // コメント行
            // 行末にジャンプ
            while (program[programCounter] !== "\n") {
                programCounter++;
                if (!(programCounter < program.length)) break;
            }
            break;
        default:  // 他は無視
            step--;
            break;
    }
}

/** 指定ミリ秒停止
 * @param {number} delayMsec 停止時間[ms]
 * @returns {Promise<any>|void} プロミス
 */
function wait(delayMsec) {
    // console.trace("wait");  // デバッグ用

    // ステップ実行なら停止しない
    if (isStepRun) return;

    // 待機無しなら停止しない
    if (delayMsec <= 0) return;

    return new Promise((resolve) => {
        // delayMsecミリ秒後に履行
        timeoutID = window.setTimeout(() => {
            resolve();
        }, delayMsec);
    });
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
