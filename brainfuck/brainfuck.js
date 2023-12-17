window.addEventListener("DOMContentLoaded", () => {
"use strict";  // 厳格モード

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
    PTR_MAX   : 255  ,  // メモリアドレスの上限値(下限値は0);
    VAL_MAX   : 255  ,  // メモリセルに格納できる上限値(下限値は0);
    STEP_MAX  : 20000,  // 総実行ステップ数の上限値(無限ループ抑止);
    DELAY_MSEC: 1    ,  // 一括実行時の各命令の待機時間[ms], 0[ms]は最終結果のみ表示
});

// Brainfuck用パラメータ設定検証用
let INSTRUCTIONS = structuredClone(DEFAULT_INSTRUCTIONS);
let ENVIRONMENTS = structuredClone(DEFAULT_ENVIRONMENTS);

// Brainfuck用変数
let program = "";  // プログラム
let programCounter = 0;  // プログラムカウンタ
let programCounterPrev = 0;  // 直前のプログラムカウンタ
let loopStack = [];  // ループネスト用スタック
let memory = [];  // メモリ
let pointer = 0;  // ポインタ
let pointerPrev = 0;  // 直前のポインタ
let input = "";  // 入力バッファ
let inputCounter = 0;  // 入力バッファのカウンタ
let output = "";  // 出力バッファ
let isInit = false;  // 初期化済みかどうか
let isStepRun = false;  // ステップ実行かどうか
let isError = false;  // プログラムにエラーがあるかどうか
let step = 0;  // 総ステップ数

// エントリー
main();

/** メイン */
function main() {
    // console.group("main");  // デバッグ用

    const DOMEditArea = document.querySelector("div#edit-area");  // バブリング用
    const DOMInstructionArea = document.querySelector("details#instruction-area");
    const DOMEnvironmentArea = document.querySelector("details#environment-area");

    let isFocusedAny = false;  // フォーカス中かどうか

    // モバイル端末用設定
    setMobileDevice();

    // 既定初期化
    scroll(0, 0);
    defineParameter();
    initialize();

    // Brainfuck用パラメータ設定検証
    DOMEditArea.addEventListener("input", () => {
        // console.group("edit-area input");  // デバッグ用

        initialize();

        // console.group("edit-area input");  // デバッグ用
    });

    // 一括実行
    DOMRun.addEventListener("click", async () => {
        // console.group("run click");  // デバッグ用

        isStepRun = false;
        await run();

        // console.groupEnd("run click");  // デバッグ用
    });

    // ステップ実行
    DOMStepRun.addEventListener("click", async () => {
        // console.group("step-run click");  // デバッグ用

        isStepRun = true;
        await run();

        // console.groupEnd("step-run click");  // デバッグ用
    });

    // 強制終了
    DOMKill.addEventListener("click", async () => {
        // console.group("kill click");  // デバッグ用

        // 実行中なら確認を求める
        if (0 < programCounter && programCounter < program.length) {
            if (!confirm("Realy kill?")) return;
        }

        isError = true;
        if (isStepRun) {
            await run();
            isStepRun = false;
            initialize();
        }

        // console.groupEnd("kill click");  // デバッグ用
    });

    // フォーカス判定
    DOMEditArea.addEventListener("focusin", (event) => {
        // console.group("edit-area focusin");  // デバッグ用

        const isFocusabled = event.target.matches('input:is([type="text"], [type="number"]), textarea');
        // console.log({isFocusabled});  // デバッグ用
        if (!isFocusabled) return;

        isFocusedAny = true;

        // console.groupEnd("edit-area focusin");  // デバッグ用
    });
    DOMEditArea.addEventListener("focusout", () => {
        // console.group("edit-area focusout");  // デバッグ用

        isFocusedAny = false;

        // console.groupEnd("edit-area focusout");  // デバッグ用
    });

    // ショートカットキー設定
    window.addEventListener("keyup", (event) => {
        // console.group(`window keyup ${event.key}`);  // デバッグ用

        // console.log({isFocusedAny});  // デバッグ用

        // フォーカス中なら無効
        if (isFocusedAny) return;

        const clickEvent = new Event("click");
        switch (event.key) {
            case "i": // Brainfuck命令パラメータ設定アコーディオン開閉
                DOMInstructionArea.open = !DOMInstructionArea.open;
                break;
            case "e": // Brainfuck環境パラメータ設定アコーディオン開閉
                DOMEnvironmentArea.open = !DOMEnvironmentArea.open;
                break;
            case "/": // 最上位のウィジェットにフォーカス
                const DOMFirstWidget = document.querySelector(":is(input, textarea, button, select):not(:disabled)");
                if (DOMFirstWidget.matches("details#instruction-area *")) {
                    DOMInstructionArea.open = true;
                }
                if (DOMFirstWidget.matches("details#environment-area *")) {
                    DOMEnvironmentArea.open = true;
                }
                DOMFirstWidget.focus();
                break;
            case "r": // 一括実行
                if (!DOMRun.disabled) {
                    DOMRun.dispatchEvent(clickEvent);
                }
                break;
            case "s": // ステップ実行
                if (!DOMStepRun.disabled) {
                    DOMStepRun.dispatchEvent(clickEvent);
                }
                break;
            case "k": // 強制終了
                if (!DOMKill.disabled) {
                    DOMKill.dispatchEvent(clickEvent);
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

        // 実行中でないなら確認を求めない
        if (!(0 < programCounter && programCounter < program.length)) return;

        event.preventDefault();
        event.returnValue = "";
        return "";

        // console.groupEnd("window beforeunload");  // デバッグ用
    });

    // console.groupEnd("main");  // デバッグ用
}

/** 初期化群 */
function initialize() {
    // console.group("initialize");  // デバッグ用

    if (validateParameter()) {
        init();
        isInit = false;
        createResult();
        drawResult();
    }

    // console.groupEnd("initialize");  // デバッグ用
}

/** Brainfuck用パラメータ既定値設定 */
function defineParameter() {
    // console.group("defineParameter");  // デバッグ用

    // Brainfuck命令パラメータ
    for (const DOM_INSTRUCTION of DOM_INSTRUCTIONS) {
        DOM_INSTRUCTION.value = DEFAULT_INSTRUCTIONS[DOM_INSTRUCTION.id];
    }
    // Brainfuck環境パラメータ
    for (const DOM_ENVIRONMENT of DOM_ENVIRONMENTS) {
        DOM_ENVIRONMENT.value = DEFAULT_ENVIRONMENTS[DOM_ENVIRONMENT.id];
    }

    // console.groupEnd("defineParameter");  // デバッグ用
}

/** Brainfuck用パラメータ設定検証 */
function validateParameter() {
    // console.group("validateParameter");  // デバッグ用

    let isValidAll = true;  // すべて制約を満たすかどうか

    // Brainfuck命令パラメータ
    for (const DOM_INSTRUCTION of DOM_INSTRUCTIONS) {
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
    }
    // 重複は不可
    for (const DOM_INSTRUCTION of DOM_INSTRUCTIONS) {
        if (Object.values(INSTRUCTIONS).filter((value) => value === DOM_INSTRUCTION.value).length > 1) {
            isValidAll = false;
            DOM_INSTRUCTION.setCustomValidity("invalid: unique");
        }
        DOM_INSTRUCTION.reportValidity();
    }

    // Brainfuck環境パラメータ
    const regExpInt = /^([1-9][0-9]*|0)$/;  // 整数のみ可
    for (const DOM_ENVIRONMENT of DOM_ENVIRONMENTS) {
        const id = DOM_ENVIRONMENT.id;
        const value = Number(DOM_ENVIRONMENT.value);
        const min = Number(DOM_ENVIRONMENT.min);
        const max = Number(DOM_ENVIRONMENT.max);
        const validity = DOM_ENVIRONMENT.validity;

        DOM_ENVIRONMENT.setCustomValidity("");
        if (validity.valid && regExpInt.test(String(value)) && min <= value && value <= max) {
            ENVIRONMENTS[id] = value;
        } else {
            isValidAll = false;
            DOM_ENVIRONMENT.setCustomValidity("invalid");
            if (validity.badInput) {
                DOM_ENVIRONMENT.setCustomValidity("invalid: badInput");
            } else if (validity.valueMissing) {
                DOM_ENVIRONMENT.setCustomValidity("invalid: valueMissing");
            } else if (validity.rangeOverflow || value > max) {
                DOM_ENVIRONMENT.setCustomValidity("invalid: rangeOverflow");
            } else if (validity.rangeUnderflow || value < min) {
                DOM_ENVIRONMENT.setCustomValidity("invalid: rangeUnderflow");
            } else if (validity.stepMismatch) {
                DOM_ENVIRONMENT.setCustomValidity("invalid: stepMismatch");
            }
        }
        DOM_ENVIRONMENT.reportValidity();
    }
    if (isValidAll) {
        ENVIRONMENTS.PTR_MAX++;
        ENVIRONMENTS.VAL_MAX++;
    }

    // Brainfuck用パラメータのいずれかが制約を満たさないなら無効化
    DOMRun.disabled = !isValidAll;
    DOMStepRun.disabled = !isValidAll;

    // console.groupEnd("validateParameter");  // デバッグ用

    return isValidAll;
}

/** Brainfuck用変数初期化 */
function init() {
    // console.group("init");  // デバッグ用

    program = DOMSource.value;
    programCounter = 0;
    programCounterPrev = 0;
    loopStack = [];
    memory = new Array(ENVIRONMENTS.PTR_MAX).fill(0);
    pointer = 0;
    pointerPrev = 0;
    input = DOMInput.value;
    inputCounter = 0;
    output = "";
    isInit = true;
    // isStepRun = false;
    isError = false;
    step = 0;

    // console.groupEnd("init");  // デバッグ用
}

/** 描画初期化 */
function createResult() {
    // console.group("createResult");  // デバッグ用

    // プログラム
    DOMProgram.emptyChild();
    for (let i = 0; i < program.length; i++) {
        const DOMSpan = document.createElement("span");
        DOMSpan.dataset.index = String(i);
        DOMSpan.className = "";
        DOMSpan.textContent = (program[i] === "\n") ?" \n" :program[i];
        DOMProgram.appendChild(DOMSpan);
    }

    // メモリ
    DOMMemory.emptyChild();
    const digit = String(ENVIRONMENTS.VAL_MAX-1).replace("-", "").length;
    for (let i = 0; i < ENVIRONMENTS.PTR_MAX; i++) {
        const DOMSpan = document.createElement("span");
        DOMSpan.dataset.index = String(i);
        DOMSpan.className = "";
        DOMSpan.textContent = String(memory[i]).padStart(digit, "0");
        DOMMemory.appendChild(DOMSpan);
        const DOMTextSP = document.createTextNode(" ");
        DOMMemory.appendChild(DOMTextSP);
    }

    // 出力
    DOMOutput.textContent = "";

    // console.groupEnd("createResult");  // デバッグ用
}

/** 描画 */
function drawResult() {
    // console.group("drawResult");  // デバッグ用

    if (!isInit || isStepRun || ENVIRONMENTS.DELAY_MSEC > 0) {
        // ステップ実行または待機有りなら途中結果を描画

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
        const digit = String(ENVIRONMENTS.VAL_MAX-1).replace("-", "").length;
        DOMPointer.textContent = String(memory[pointer]).padStart(digit, "0");
        pointerPrev = pointer;
    } else {
        // 最終結果のみ描画

        // プログラム
        const DOMProgramCounterAll = DOMProgram.querySelectorAll(`span[data-index]`);
        for (const DOMProgramCounter of DOMProgramCounterAll) {
            DOMProgramCounter.classList.remove("highlight");
        }

        // メモリ
        const digit = String(ENVIRONMENTS.VAL_MAX-1).replace("-", "").length;
        for (let i = 0; i < ENVIRONMENTS.PTR_MAX; i++) {
            const DOMPointer = DOMMemory.querySelector(`span[data-index="${i}"]`);
            DOMPointer.classList.remove("highlight");
            if (i === pointer) {
                DOMPointer.classList.add("highlight");
            }
            DOMPointer.textContent = String(memory[i]).padStart(digit, "0");
        }
    }

    // 出力
    DOMOutput.textContent = output;

    // console.groupEnd("drawResult");  // デバッグ用
}

/** 実行 */
async function run() {
    // console.group("run");  // デバッグ用

    // 初回
    if (!isInit) {
        init();
        createResult();
        drawResult();
        console.log("This code was begun.");  // ログ用
        consoleTime.begin("run time");  // ログ用
    }
    // 無効化
    for (const DOM_INSTRUCTION of DOM_INSTRUCTIONS) {
        DOM_INSTRUCTION.disabled = true;
    }
    for (const DOM_ENVIRONMENT of DOM_ENVIRONMENTS) {
        DOM_ENVIRONMENT.disabled = true;
    }
    DOMSource.disabled = true;
    DOMInput.disabled = true;
    if (!isStepRun) {
        DOMRun.disabled = true;
        DOMStepRun.disabled = true;
    }

    // 実行
    while (!isError && programCounter < program.length) {
        // console.log({programCounter});  // デバッグ用
        // console.log({step});  // デバッグ用

        // 無限ループならエラー
        if (step >= ENVIRONMENTS.STEP_MAX) {
            errorAlert(`Cannot run more than ${ENVIRONMENTS.STEP_MAX} steps.`);  // アラート用
            errorLog(`Cannot run more than ${ENVIRONMENTS.STEP_MAX} steps.`);  // ログ用
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

        // console.time("sleep");  // デバッグ用
        await sleep(ENVIRONMENTS.DELAY_MSEC);  // 一時停止
        // console.timeEnd("sleep");  // デバッグ用

        // ステップ実行はループしない
        // consoleTime.log("run time");  // ログ用
        // console.groupEnd("run");  // デバッグ用
        if (isStepRun && programCounter < program.length) return;
    }

    // 終了
    drawResult();
    isInit = false;
    // 有効化
    for (const DOM_INSTRUCTION of DOM_INSTRUCTIONS) {
        DOM_INSTRUCTION.disabled = false;
    }
    for (const DOM_ENVIRONMENT of DOM_ENVIRONMENTS) {
        DOM_ENVIRONMENT.disabled = false;
    }
    DOMSource.disabled = false;
    DOMInput.disabled = false;
    DOMRun.disabled = false;
    DOMStepRun.disabled = false;

    // ログ出力
    console.log(`run step: ${step}`);  // ログ用
    consoleTime.end("run time");  // ログ用
    console.log(`This code was ${(isError) ?"terminated" :"finished"}.`);  // ログ用

    // console.groupEnd("run");  // デバッグ用
}

/** コード解析 */
function interpret() {
    // console.group("interpret");  // デバッグ用

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
            loopStack.push(programCounter);  // [のプログラムカウンタを保存
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
                    errorAlert(`Cannot find "${INSTRUCTIONS.LOOP_END}".`);  // アラート用
                    errorLog(`Cannot find "${INSTRUCTIONS.LOOP_END}".`);  // ログ用
                    isError = true;
                    return;
                }
                loopStack.pop();  // ループ終わり
            }
            break;
        case INSTRUCTIONS.LOOP_END:  // ポインタが指す値が0でないなら、対応する[の直後にジャンプする
            // [と]の対をチェック
            // console.log({loopStack});  // デバッグ用
            if (loopStack.length === 0) {  // スタックが空なら対応する[がない
                errorAlert(`Cannot find "${INSTRUCTIONS.LOOP_BEGIN}".`);  // アラート用
                errorLog(`Cannot find "${INSTRUCTIONS.LOOP_BEGIN}".`);  // ログ用
                isError = true;
                return;
            }
            programCounter = loopStack.pop()-1;  // [にジャンプ
            break;
        case INSTRUCTIONS.BREAK_POINT:  // ブレークポイント(実行を一時停止する)
            drawResult();  // 強制描画
            isStepRun = true  // ステップ実行に移行
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

    // console.groupEnd("interpret");  // デバッグ用
}

/** 指定ミリ秒停止
 * @param {number} delayMsec 停止時間[ms]
 */
function sleep(delayMsec) {
    // console.group("sleep");  // デバッグ用

    return new Promise((resolve) => {
        // 一括実行かつ待機有りなら停止する
        if (!isStepRun && delayMsec > 0) {
            // delayMsecミリ秒後に履行
            setTimeout(() => {
                resolve();
                // console.groupEnd("sleep");  // デバッグ用
            }, delayMsec);
        } else {
            // 即時に履行
            resolve();
            // console.groupEnd("sleep");  // デバッグ用
        }
    });
}
});
