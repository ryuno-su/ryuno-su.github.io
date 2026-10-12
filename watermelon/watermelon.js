window.addEventListener("DOMContentLoaded", async () => {
"use strict";  // 厳格モード
// console.trace("DOMContentLoaded");  // デバッグ用

/** 自作ライブラリ */
// const Library = await import("../library/library.js");  // デバッグ用
const Library = await import("../library/library.min.js");

const canvas = document.querySelector("canvas#canvas");
const ctx = canvas.getContext("2d");
const dpr = window.devicePixelRatio || 1;

const canvasAspect = 16 / 9;  // キャンバス横縦比
const canvasWidth = 1984;  // キャンバス横幅
const canvasHeight = canvasWidth / canvasAspect;  // キャンバス縦幅

/** 壁座標 */
const wall = (() => {
    const width = 692;
    const height = 854;
    const offsetX = 645;
    const offsetY = 192;
    return Object.freeze({
        left  : offsetX,
        right : offsetX + width,
        top   : offsetY,
        bottom: offsetY + height,
    });
})();

/** ボールの情報
 * @typedef {object} BallInfo ボールの情報
 * @property {string} name 名前
 * @property {number} radius 半径
 * @property {number} mass 質量
 * @property {number} point 素点
 * @property {number} odds 出現割合
 */
/** ball種類別情報 */
const ballInfos = Object.freeze([
    {name: "cherry"    , radius:  34, mass: 100, point:  1, odds: 20},
    {name: "strawberry", radius:  45, mass:  96, point:  3, odds: 20},
    {name: "grape"     , radius:  62, mass:  92, point:  6, odds: 20},
    {name: "dekopon"   , radius:  71, mass:  88, point: 10, odds: 20},
    {name: "persimmon" , radius:  90, mass:  84, point: 15, odds: 20},
    {name: "apple"     , radius: 116, mass:  80, point: 21, odds:  0},
    {name: "pear"      , radius: 131, mass:  76, point: 28, odds:  0},
    {name: "peach"     , radius: 162, mass:  72, point: 36, odds:  0},
    {name: "pineapple" , radius: 178, mass:  68, point: 45, odds:  0},
    {name: "melon"     , radius: 221, mass:  64, point: 55, odds:  0},
    {name: "watermelon", radius: 260, mass:  60, point: 66, odds:  0},
]);

/** 物理定数 */
const PHYSICS = Object.freeze({
    GRAVITY  : new Library.Vector2D(0, 9.8),  // 重力加速度
    DELTATIME: 0.2 ,  // 時間刻み
    ELASTIC  : 0.5 ,  // 反発係数
    DAMPING  : 0.99,  // 速度の強制減衰の倍率
    FRICTION : 0.9 ,  // 摩擦係数
});

/** ボール */
class Ball {
    // static newBallID = 0;  // ball管理用

    /**
     * @param {Vector2D} center
     * @param {Vector2D} velocity
     * @param {number} type
     */
    constructor(center, velocity, type) {
        this.id         = newBallID++;
        this.center     = center;
        this.velocity   = velocity;
        this.isActive   = false;
        this.isInit     = true;  // 上壁通過が初かどうか
        this.isCollided = false;
        this.type       = type;
        this.info       = ballInfos[type];
    }
    /**
     * @param {object} [changes={}]
     * @param {number} [changes.id]
     * @param {Vector2D} [changes.center]
     * @param {Vector2D} [changes.velocity]
     * @param {boolean} [changes.isActive]
     * @param {boolean} [changes.isInit]
     * @param {boolean} [changes.isCollided]
     * @param {number} [changes.type]
     * @param {BallInfo} [changes.info]
     * @returns {Ball} cloned
     */
    with(changes = {}) {
        const {id, center, velocity, isActive, isInit, isCollided, type, info} = {...this, ...changes};
        const ball = new Ball();
        ball.id         = id;
        ball.center     = center;
        ball.velocity   = velocity;
        ball.isActive   = isActive;
        ball.isInit     = isInit;
        ball.isCollided = isCollided;
        ball.type       = type;
        ball.info       = info;
        return ball;
        // return new Ball(center, velocity, type);
    }
    draw() {
        // ショートカット
        const {id, center, velocity, isActive, isInit, isCollided, type, info} = this;
        const {name, radius, mass, point, odds} = info;

        // if (!isActive) return;

        const lineWidth = 5;
        const typePx = 40;

        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = "black";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `900 ${typePx}px monospace`;
        // // 当たり判定確認用
        // if (isCollided) {
        //     ctx.strokeStyle = "lime";  // デバッグ用
        // }
        ctx.arc(center.x, center.y, radius-lineWidth/2, 0, 2*Math.PI);
        ctx.stroke();
        // ctx.fillText(name, center.x, center.y);
        ctx.fillText(`${type+1}`, center.x, center.y);
        ctx.closePath();
        ctx.restore();
    }
    update() {
        // ショートカット
        const {id, center, velocity, isActive, isInit, isCollided, type, info} = this;
        const {name, radius, mass, point, odds} = info;
        const {GRAVITY, DELTATIME, ELASTIC, DAMPING, FRICTION} = PHYSICS;

        if (!isActive) return;

        this.center = center
            .add(velocity.mul(DELTATIME))
            .add(GRAVITY.mul(0.5*DELTATIME**2));
        this.velocity = velocity.add(GRAVITY.mul(DELTATIME));
        this.velocity = this.velocity.mul(DAMPING);
        // // 振動抑止
        // if (isCollided) {
        //     // this.velocity = this.velocity.mul(FRICTION);
        //     // if (this.center.distance(center) < Library.ZERO.MILI) {
        //     if (this.center.distance(center) < 1.5*DELTATIME) {
        //         this.center = center;
        //         this.velocity = Vector2D_ZERO;
        //     }
        // }
        // // this.isCollided = false;
    }
    collideWall() {
        // ショートカット
        const {id, center, velocity, isActive, isInit, isCollided, type, info} = this;
        const {name, radius, mass, point, odds} = info;
        const {GRAVITY, DELTATIME, ELASTIC, DAMPING, FRICTION} = PHYSICS;

        if (!isActive) return;

        /** 境界座標 */
        const bound = {
            left  : wall.left + radius,
            right : wall.right - radius,
            top   : wall.top + radius,
            bottom: wall.bottom - radius,
        };
        if (this.center.x < bound.left) {
            this.center = new Library.Vector2D(bound.left, this.center.y);
            this.velocity = new Library.Vector2D(this.velocity.x * -ELASTIC, this.velocity.y);
            this.isCollided = true;
        }
        if (this.center.x > bound.right) {
            this.center = new Library.Vector2D(bound.right, this.center.y);
            this.velocity = new Library.Vector2D(this.velocity.x * -ELASTIC, this.velocity.y);
            this.isCollided = true;
        }
        if (this.center.y < bound.top) {
            if (!this.isInit) {
                isGameOver = true;
            }
        } else {
            this.isInit = false;
        }
        if (this.center.y > bound.bottom) {
            this.center = new Library.Vector2D(this.center.x, bound.bottom);
            this.velocity = new Library.Vector2D(this.velocity.x * FRICTION, this.velocity.y * -ELASTIC);
            this.isCollided = true;
        }
    }
    collideBall() {
        // ショートカット
        const {
            id        : id1,
            center    : center1,
            velocity  : velocity1,
            isActive  : isActive1,
            isInit    : isInit1,
            isCollided: isCollided1,
            type      : type1,
            info      : info1,
        } = this;
        const {
            name  : name1,
            radius: radius1,
            mass  : mass1,
            point : point1,
            odds  : odds1,
        } = info1;
        const {GRAVITY, DELTATIME, ELASTIC, DAMPING, FRICTION} = PHYSICS;

        if (!isActive1) return;

        for (const ball of balls.values()) {
            // ショートカット
            const {
                id        : id2,
                center    : center2,
                velocity  : velocity2,
                isActive  : isActive2,
                isInit    : isInit2,
                isCollided: isCollided2,
                type      : type2,
                info      : info2,
            } = ball;
            const {
                name  : name2,
                radius: radius2,
                mass  : mass2,
                point : point2,
                odds  : odds2,
            } = info2;

            if (!isActive2) continue;
            if (id1 === id2) continue;
            if (center1.distance(center2) >= radius1 + radius2) continue;

            this.isCollided = true;
            ball.isCollided = true;

            if (type1 === type2) {
                this.center = center1.add(center2).div(2);
                score += point1;
                // ballを削除
                balls.delete(id2);
                // thisを進化
                this.type++;
                // スイカ同士は互いに削除
                if (this.type >= ballInfos.length) {
                    score += ballInfos.at(-1).point;
                    balls.delete(id1);
                    continue;
                }
                this.info = ballInfos[this.type];
            }

            const YUnit = center2.sub(center1).normalize();  // Y軸(接触面法線)方向の単位ベクトル
            const XUnit = YUnit.rotate(Math.PI/2);  // X軸(接触面接線)方向の単位ベクトル
            const U1Velocity = new Library.Vector2D(  // XY平面上でのthisの衝突前の速度ベクトル
                velocity1.dot(XUnit),  // X軸(接触面接線)方向への射影
                velocity1.dot(YUnit),  // Y軸(接触面接線)方向への射影
            );
            const U2Velocity = new Library.Vector2D(  // XY平面上でのballの衝突前の速度ベクトル
                velocity2.dot(XUnit),  // X軸(接触面接線)方向への射影
                velocity2.dot(YUnit),  // Y軸(接触面接線)方向への射影
            );
            const massRatio12 = mass1 / mass2;  // ballに対するthisの質量比
            const massRatio21 = mass2 / mass1;  // thisに対するballの質量比
            const V1Velocity = new Library.Vector2D(  // XY平面上でのthisの衝突後の速度ベクトル
                U1Velocity.x,
                (U1Velocity.y*(massRatio12-ELASTIC) + U2Velocity.y*(1+ELASTIC)) / (1+massRatio12),
            );
            const V2Velocity = new Library.Vector2D(  // XY平面上でのballの衝突後の速度ベクトル
                U2Velocity.x,
                (U1Velocity.y*(1+ELASTIC) + U2Velocity.y*(massRatio21-ELASTIC)) / (1+massRatio21),
            );
            const coli1Position = center1.add(YUnit.mul(radius1));  // this視点の衝突点
            const coli2Position = center2.sub(YUnit.mul(radius2));  // ball視点の衝突点
            const coliPosition = coli1Position.add(coli2Position).div(2);  // thisとballの衝突点
            this.center = coliPosition.sub(YUnit.mul(radius1));  // thisをballにY軸方向で外接
            ball.center = coliPosition.add(YUnit.mul(radius2));  // ballをthisにY軸方向で外接
            this.velocity = XUnit.mul(V1Velocity.x).add(YUnit.mul(V1Velocity.y));  // 元のxy平面の座標に戻す
            ball.velocity = XUnit.mul(V2Velocity.x).add(YUnit.mul(V2Velocity.y));  // 元のxy平面の座標に戻す
        }
    }
}

const Vector2D_ZERO = Object.freeze(new Library.Vector2D(0, 0));  // 零ベクトル

let newBallID = 0;  // ball管理用
let balls = new Map();  // ボール群
let curBall = new Ball();  // ユーザー操作対象
let nextBall = new Ball();  // ネクスト
let isGameOver = false;  // ゲームオーバーかどうか
let score = 0;  // 得点
let requestID = 0;  // 描画ループ離脱用

// エントリー
main();

/** メイン
 * @description DOM要素にイベントリスナーを登録する
 */
function main() {
    // console.trace("main");  // デバッグ用

    init();
    resize();

    // window.addEventListener("resize", resize);
    const waitMsec = 250;
    window.addEventListener("resize", Library.throttle(resize, waitMsec));
    window.addEventListener("resize", Library.debounce(resize, waitMsec));
    canvas.addEventListener("pointermove", aim);
    canvas.addEventListener("pointerup", drop);

    //#region ResizeObserver版
    // const resizeObserver = new ResizeObserver(([entry]) => resize());
    // resizeObserver.observe(document.documentElement);
    //#endregion

    requestID = window.requestAnimationFrame(loop);
}

/** 初期化 */
function init() {
    // console.trace("init");  // デバッグ用

    newBallID = 0;
    balls = new Map();
    isGameOver = false;
    score = 0;
    requestID = 0;

    const type = Library.randomIntPdf(ballInfos.map((ballInfo) => ballInfo.odds));
    const radius = ballInfos[type].radius;
    curBall = new Ball(
        new Library.Vector2D(wall.left+radius, wall.top-radius),
        Vector2D_ZERO,
        type,
    );
    const nextBallX = 1680;
    const nextBallY = 294;
    nextBall = new Ball(
        new Library.Vector2D(nextBallX, nextBallY),
        Vector2D_ZERO,
        Library.randomIntPdf(ballInfos.map((ballInfo) => ballInfo.odds)),
    );
}

/** 画面リサイズ */
function resize() {
    // console.trace("resize");  // デバッグ用

    canvas.style.width = "0px";
    canvas.style.height = "0px";
    canvas.style.left = "0px";
    canvas.style.top = "0px";

    const aspect = window.innerWidth / window.innerHeight;
    if (aspect > canvasAspect) {  // 横長
        const displayWidth = window.innerHeight * canvasAspect
        const displayHeight = window.innerHeight;
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        const scale = canvas.width / canvasWidth;
        ctx.scale(scale, scale);
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
        canvas.style.left = `${(window.innerWidth - displayWidth) / 2}px`;
        canvas.style.top = "0px";
    } else {  // 縦長
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerWidth / canvasAspect;
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        const scale = canvas.width / canvasWidth;
        ctx.scale(scale, scale);
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
        canvas.style.left = "0px";
        canvas.style.top = `${(window.innerHeight - displayHeight) / 2}px`;
    }

    window.requestAnimationFrame(drawAll);
}

/** 投下位置指定
 * @param {MouseEvent} event イベント
 */
function aim(event) {
    // console.trace("aim");  // デバッグ用

    const scale = canvas.width / canvasWidth;
    const mouseX = event.offsetX;
    const mouseY = event.offsetY;
    const radius = ballInfos[curBall.type].radius;

    let x = mouseX * dpr / scale;
    let y = mouseY * dpr / scale;

    x = Library.clamp(x, wall.left+radius, wall.right-radius);
    curBall.center.x = x;
}

/** 投下開始
 * @param {MouseEvent} event イベント
 */
function drop(event) {
    // console.trace("drop");  // デバッグ用

    const scale = canvas.width / canvasWidth;
    const mouseX = event.offsetX;
    const mouseY = event.offsetY;
    const radius = ballInfos[nextBall.type].radius;

    let x = mouseX * dpr / scale;
    let y = mouseY * dpr / scale;
    // console.log(x, y);  // デバッグ用

    curBall.isActive = true;
    balls.set(curBall.id, curBall);

    x = Library.clamp(x, wall.left+radius, wall.right-radius);
    curBall = new Ball(
        new Library.Vector2D(x, wall.top-radius),
        Vector2D_ZERO,
        nextBall.type,
    );
    const nextBallX = 1680;
    const nextBallY = 294;
    nextBall = new Ball(
        new Library.Vector2D(nextBallX, nextBallY),
        Vector2D_ZERO,
        Library.randomIntPdf(ballInfos.map((ballInfo) => ballInfo.odds)),
    );
}

/** 描画ループ */
function loop() {
    // console.trace("loop");  // デバッグ用

    drawBackground();
    drawWall();
    drawScore();
    drawNext();
    drawEvolution();
    drawCurrent();

    for (const ball of balls.values()) {
        ball.draw();
        ball.update();
        ball.collideWall();
        ball.collideBall();
    }

    if (isGameOver) {
        drawGameOver();
        return;
    }

    requestID = window.requestAnimationFrame(loop);
}

/** 全部描画 */
function drawAll() {
    // console.trace("drawAll");  // デバッグ用

    drawBackground();
    drawWall();
    drawScore();
    drawNext();
    drawEvolution();
    drawCurrent();

    for (const ball of balls.values()) {
        ball.draw();
    }

    if (isGameOver) {
        drawGameOver();
    }
}

/** 全体背景描画 */
function drawBackground() {
    // console.trace("drawBackground");  // デバッグ用

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);  // 消去(透明な黒(rgb(0 0 0 / 0%)))

    // ctx.save();
    // ctx.beginPath();
    // ctx.fillStyle = "white";
    // ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    // ctx.closePath();
    // ctx.restore();
}

/** 壁描画 */
function drawWall() {
    // console.trace("drawWall");  // デバッグ用

    const lineWidth = 20;
    const lineWidthTop = 5;

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.lineWidth = lineWidth;

    ctx.moveTo(wall.left-lineWidth/2, wall.top-lineWidthTop);
    ctx.lineTo(wall.left-lineWidth/2, wall.bottom+lineWidth/2);
    ctx.lineTo(wall.right+lineWidth/2, wall.bottom+lineWidth/2);
    ctx.lineTo(wall.right+lineWidth/2, wall.top-lineWidthTop);
    ctx.stroke();

    ctx.lineWidth = lineWidthTop;
    ctx.setLineDash([10, 10]);
    ctx.moveTo(wall.right+lineWidth, wall.top-lineWidthTop/2);
    ctx.lineTo(wall.left-lineWidth, wall.top-lineWidthTop/2);
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
}

/** スコア描画 */
function drawScore() {
    // console.trace("drawScore");  // デバッグ用

    const scoreTextPx = 60;
    const scoreTextX = 297;
    // const scoreTextY = 85;
    const scoreTextY = 160;

    const scorePx = 80;
    const scoreX = scoreTextX;
    // const scoreY = 245;
    const scoreY = 320;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "black";

    ctx.font = `900 ${scoreTextPx}px monospace`;
    ctx.fillText("SCORE", scoreTextX, scoreTextY);

    ctx.font = `900 ${scorePx}px monospace`;
    ctx.fillText(`${score}`, scoreX, scoreY);
    ctx.restore();
}

/** ネクスト描画 */
function drawNext() {
    // console.trace("drawNext");  // デバッグ用

    const nextTextPx = 55;
    const nextTextX = nextBall.center.x;
    const nextTextY = 160;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "black";

    ctx.font = `900 ${nextTextPx}px monospace`;
    ctx.fillText("NEXT", nextTextX, nextTextY);
    ctx.restore();

    nextBall.draw();
}

/** 進化リスト描画 */
function drawEvolution() {
    // console.trace("drawEvolution");  // デバッグ用

    const evolutionTextPx = 55;
    const evolutionTextX = nextBall.center.x;
    const evolutionTextY = 564;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "black";
    ctx.font = `900 ${evolutionTextPx}px monospace`;
    ctx.fillText("EVOLUTION", evolutionTextX, evolutionTextY);
    ctx.textAlign = "left";
    for (const [i, ballInfo] of ballInfos.entries()) {
        const evolutionPx = 40;
        const evolutionX = nextBall.center.x - 4*evolutionPx;
        const evolutionY = 564 + (i+2)*evolutionPx;
        const typeStr = Library.padDigit(i+1, ballInfos.length, " ");
        ctx.font = `900 ${evolutionPx}px monospace`;
        ctx.fillText(`${typeStr}: ${ballInfo.name}`, evolutionX, evolutionY);
    }
    ctx.restore();
}

/** 操作対象描画 */
function drawCurrent() {
    // console.trace("drawCurrent");  // デバッグ用

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 5;
    ctx.moveTo(curBall.center.x, curBall.center.y+curBall.info.radius);
    ctx.lineTo(curBall.center.x, wall.bottom);
    ctx.stroke();
    ctx.closePath();
    ctx.restore();

    curBall.draw();
}

/** ゲームオーバー描画 */
function drawGameOver() {
    // console.trace("drawGameOver");  // デバッグ用

    const gameOverTextPx = 350;
    const gameOverTextX = canvasWidth/2;
    const gameOverTextY = canvasHeight/2;

    ctx.save();
    ctx.font = `900 ${gameOverTextPx}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Game Over", gameOverTextX, gameOverTextY);
    ctx.restore();
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
        // window.dispatchEvent(new Event("DOMContentLoaded"));
    }
});
