/*
上から2番目の横棒だけ最前面
フルーツ連射最短間隔は時間ではない
落下させたフルーツ(balls[newID-3])が最初に着地したときに次のフルーツが落下可能になる
テスト描画系全部消す
リテラル定数->const定数
画面拡大禁止

キャンバスの画面サイズレスポンシブにする
my -> default
const myWidth = screen.pngのwidth;
const myHeight = screen.pngのheight;
const aspectRatio = myWidth/myHeight;
const sapectRatio = 1/aspectRatio;
const widthRatio = window.innerWidth/myWidth;
// const heightRatio = window.innerHeight/myHeight;
// const myDpr = 1.5;
// const dprRatio = window.devicePixelRatio/myDpr;
const dpr = window.devicePixelRatio;
canvas.width = myWidth*widthRatio;
canvas.height = canvas.width*sapectRatio;
const wall = (() => {
    const centerX = canvas.width/2;
    const centerY = canvas.height/2;
    const lWidth = 計測ピクセル値;
    const rWidth = 計測ピクセル値;
    const tHeight = 計測ピクセル値;
    const bHeight = 計測ピクセル値;
    const myLine = 43/2;
    return {
        left  : centerX - lWidth*widthRatio;
        right : centerX + rWidth*widthRatio;
        top   : centerY - tHeight*widthRatio;
        bottom: centerY + bHeight*widthRatio;
        line: myLine*widthRatio;
    }
})();

リセット機能実装
ゲームオーバー時に、
左下にそのメッセージとリセットボタン
ベストスコアを更新、初期化はしない
スコアは最大5桁まで
*/
window.onload = () => {
"use strict";

const canvas = document.querySelector("canvas#canvas");
(() => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // console.log(window.innerWidth); // 1503
    // console.log(window.innerHeight); // 926
    // console.log(window.devicePixelRatio); // 1.5
})();
const ctx = canvas.getContext("2d");
const fruits = document.querySelectorAll("div#images > img.fruit");
const character = document.querySelector("div#images > img.character");

const widthRatio = window.innerWidth / 1503;
const heightRatio = window.innerHeight / 926;
const dprRatio = window.devicePixelRatio / 1.5;

/** 壁座標 */
const wall = (() => {
    const w = 790*widthRatio*dprRatio;
    const h = 1000*widthRatio*dprRatio;
    const l = 43/2*widthRatio*dprRatio;
    return {
        left  : canvas.width/2-w/2,
        right : canvas.width/2+w/2,
        top   : canvas.height/2-(308-l)*widthRatio,
        bottom: canvas.height/2-(308-l)*widthRatio+h,
    };
})();

const delay = 800;  // 落下開始可能時間間隔[ms]

/** ball種類別情報 */
const ballInfos = (() => {
    class BallInfo {
        /**
         * @param {string} name
         * @param {Image} image
         * @param {number} radius
         * @param {number} mass
         * @param {number} point
         * @param {number} odds
         */
        constructor(name, image, radius, mass, point, odds) {
            this.name   = name;
            this.image  = image;
            this.radius = radius;
            this.mass   = mass;
            this.point  = point;
            this.odds   = odds;
        }
    }

    return [
        new BallInfo("cherry"    , fruits[0], 59, 1000, 1, 20),
        new BallInfo("strawberry", fruits[1], 74, 980, 3, 20),
        new BallInfo("grape"     , fruits[2], 113, 960, 6, 20),
        new BallInfo("dekopon"   , fruits[3], 122, 940, 10, 20),
        new BallInfo("persimmon" , fruits[4], 156, 920, 15, 20),
        new BallInfo("apple"     , fruits[5], 193, 900, 21, 0),
        new BallInfo("pear"      , fruits[6], 230, 880, 28, 0),
        new BallInfo("peach"     , fruits[7], 280, 860, 36, 0),
        new BallInfo("pineapple" , fruits[8], 316, 840, 45, 0),
        new BallInfo("melon"     , fruits[9], 389, 820, 55, 0),
        new BallInfo("watermelon", fruits[10], 460, 800, 66, 0),
    ].map((bi, i) => {
        // bi.image = images[i];
        bi.radius *= 0.5*widthRatio*dprRatio;
        bi.point = 1+i*(i+3)/2;
        return bi;
    });
})();

/** 物理定数 */
const physics = {
    gravity   : new Vector2D(0, 10),  // 重力加速度
    deltaTime : 0.125,  // 時間刻み
    elastic   : 0.0,  // 反発係数
    damping   : 0.99,  // 速度の強制減衰の倍率
    friction  : 0.8,  // 摩擦係数
}

/** フルーツ */
class Ball {
    static newBallID = 0;  // ball管理用

    /**
     * @param {Vector2D} center
     * @param {Vector2D} velocity
     * @param {number} type
     */
    constructor(center, velocity, type) {
        this.id         = Ball.newBallID++;
        this.center     = center;
        this.velocity   = velocity;
        this.isActive   = false;
        this.isInit     = true;
        this.isCollided = false;
        this.type       = type;
        this.info       = ballInfos[type];
    }
    draw() {
        // ショートカット
        const id         = this.id;
        const center     = this.center;
        const velocity   = this.velocity;
        const isActive   = this.isActive;
        const isInit     = this.isInit;
        const isCollided = this.isCollided;
        const type       = this.type;
        const info       = this.info;
        const name       = info.name;
        const image      = info.image;
        const radius     = info.radius;
        const mass       = info.mass;
        const point      = info.point;
        const odds       = info.odds;

        // if (!isActive) return;

        const width = image.width;
        const height = image.height;
        const scale = radius/(width/2);
        const sx = 0;
        const sy = 0;
        const sw = width;
        const sh = height;
        const dw = sw*scale;
        const dh = sh*scale;
        const dx = center.x - dw/2;
        const dy = center.y - dh + dw/2;
        ctx.save();
        ctx.beginPath();
        ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
        /*
        // 当たり判定用
        ctx.lineWidth = 1;
        ctx.strokeStyle = "black";
        ctx.fillStyle = "lime";
        ctx.arc(center.x, center.y, radius, 0, 2*Math.PI);
        ctx.stroke();
        if (isCollided) {
            ctx.fill();
        }
        */
        ctx.closePath();
        ctx.restore();

        return this;
    }
    update() {
        // ショートカット
        const id         = this.id;
        const center     = this.center;
        const velocity   = this.velocity;
        const isActive   = this.isActive;
        const isInit     = this.isInit;
        const isCollided = this.isCollided;
        const type       = this.type;
        const info       = this.info;
        const name       = info.name;
        const image      = info.image;
        const radius     = info.radius;
        const mass       = info.mass;
        const point      = info.point;
        const odds       = info.odds;
        const gravity    = physics.gravity;
        const deltaTime  = physics.deltaTime;
        const elastic    = physics.elastic;
        const damping    = physics.damping;
        const friction   = physics.friction;

        if (!isActive) return;

        this.center = center.add(
            velocity.mul(deltaTime)
        );/*.add(
            gravity.mul(0.5*deltaTime**2)
        );*/
        this.velocity = velocity.add(
            gravity.mul(deltaTime)
        );
        this.velocity = this.velocity.mul(damping);
        if (isCollided) {
            // this.velocity = this.velocity.mul(friction);
            if (this.center.distance(center) < ZERO.MILI) {
                this.center = center;
                this.velocity = Vector2D.zero;
            }
        }
        this.isCollided = false;

        return this;
    }
    collisionWall() {
        // ショートカット
        const id         = this.id;
        const center     = this.center;
        const velocity   = this.velocity;
        const isActive   = this.isActive;
        const isInit     = this.isInit;
        const isCollided = this.isCollided;
        const type       = this.type;
        const info       = this.info;
        const name       = info.name;
        const image      = info.image;
        const radius     = info.radius;
        const mass       = info.mass;
        const point      = info.point;
        const odds       = info.odds;
        const gravity    = physics.gravity;
        const deltaTime  = physics.deltaTime;
        const elastic    = physics.elastic;
        const damping    = physics.damping;
        const friction   = physics.friction;

        if (!isActive) return;

        /** 境界座標 */
        const bound = {
            left  : wall.left   + radius,
            right : wall.right  - radius,
            top   : wall.top    + radius,
            bottom: wall.bottom - radius,
        };
        if (this.center.x < bound.left) {
            this.center.x = bound.left;
            this.velocity.x *= -elastic;
            this.isCollided = true;
        }
        if (this.center.x > bound.right) {
            this.center.x = bound.right;
            this.velocity.x *= -elastic;
            this.isCollided = true;
        }
        if (this.center.y < bound.top) {
            if (!this.isInit) {
                gameOver();
            }
        } else {
            this.isInit = false;
        }
        if (this.center.y > bound.bottom) {
            this.center.y = bound.bottom;
            this.velocity.y *= -elastic;
            this.velocity.x *= friction;
            this.isCollided = true;
        }

        return this;
    }
    collisionBall() {
        // ショートカット
        const id1         = this.id;
        const center1     = this.center;
        const velocity1   = this.velocity;
        const isActive1   = this.isActive;
        const isInit1     = this.isInit;
        const isCollided1 = this.isCollided;
        const type1       = this.type;
        const info1       = this.info;
        const name1       = info1.name;
        const image1      = info1.image;
        const radius1     = info1.radius;
        const mass1       = info1.mass;
        const point1      = info1.point;
        const odds1       = info1.odds;
        const gravity     = physics.gravity;
        const deltaTime   = physics.deltaTime;
        const elastic     = physics.elastic;
        const damping     = physics.damping;
        const friction   = physics.friction;

        if (!isActive1) return;

        for (const ball of [...balls.values()].toSorted((ball1, ball2) => {
            const center1 = new Vector2D(ball1.center.y, ball1.center.x);
            const center2 = new Vector2D(ball2.center.y, ball2.center.x);
            if (center1.lt(center2)) return -1;
            if (center1.gt(center2)) return 1;
            return 0;
        })) {
            // ショートカット
            const id2         = ball.id;
            const center2     = ball.center;
            const velocity2   = ball.velocity;
            const isActive2   = ball.isActive;
            const isInit2     = ball.isInit;
            const isCollided2 = ball.isCollided;
            const type2       = ball.type;
            const info2       = ball.info;
            const name2       = info2.name;
            const image2      = info2.image;
            const radius2     = info2.radius;
            const mass2       = info2.mass;
            const point2      = info2.point;
            const odds2       = info2.odds;

            if (!isActive2) continue;
            if (id1 === id2) continue;
            if (center1.distance(center2) >= radius1+radius2) continue;

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
                    score += ballInfos.slice(-1)[0].point;
                    balls.delete(id1);
                    continue;
                }
                this.info = ballInfos[this.type];
            }

            const YUnit = center2.sub(center1).normalize();  // Y軸(接触面法線)方向の単位ベクトル
            const XUnit = YUnit.rotate(Math.PI/2);  // X軸(接触面接線)方向の単位ベクトル
            const U1Velocity = new Vector2D(  // XY平面上でのthisの衝突前の速度ベクトル
                velocity1.dot(XUnit),  // X軸(接触面接線)方向への射影
                velocity1.dot(YUnit),  // Y軸(接触面接線)方向への射影
            );
            const U2Velocity = new Vector2D(  // XY平面上でのballの衝突前の速度ベクトル
                velocity2.dot(XUnit),  // X軸(接触面接線)方向への射影
                velocity2.dot(YUnit),  // Y軸(接触面接線)方向への射影
            );
            const massRatio12 = mass1 / mass2;  // ballに対するthisの質量比
            const massRatio21 = mass2 / mass1;  // thisに対するballの質量比
            const V1Velocity = new Vector2D(  // XY平面上でのthisの衝突後の速度ベクトル
                U1Velocity.x,
                (U1Velocity.y*(massRatio12-elastic) + U2Velocity.y*(1+elastic)) / (1+massRatio12),
            );
            const V2Velocity = new Vector2D(  // XY平面上でのballの衝突後の速度ベクトル
                U2Velocity.x,
                (U1Velocity.y*(1+elastic) + U2Velocity.y*(massRatio21-elastic)) / (1+massRatio21),
            );
            const coli1Position = center1.add(YUnit.mul(radius1));  // this視点の衝突点
            const coli2Position = center2.sub(YUnit.mul(radius2));  // ball視点の衝突点
            const coliPosition = coli1Position.add(coli2Position).div(2);  // thisとballの衝突点
            this.center = coliPosition.sub(YUnit.mul(radius1));  // thisをballにY軸方向で外接
            ball.center = coliPosition.add(YUnit.mul(radius2));  // ballをthisにY軸方向で外接
            this.velocity = XUnit.mul(V1Velocity.x).add(YUnit.mul(V1Velocity.y));  // 元のxy平面の座標に戻す
            ball.velocity = XUnit.mul(V2Velocity.x).add(YUnit.mul(V2Velocity.y));  // 元のxy平面の座標に戻す
        }

        return this;
    }
}

let balls = new Map();  // フルーツ群
let curBall = new Ball(Vector2D.zero, Vector2D.zero, 0);  // ユーザー操作対象
let nextBall = new Ball(Vector2D.zero, Vector2D.zero, 0);  // ネクスト

let score = 0;  // 総得点
let bestScore = 0;  // 最高得点
let requestID = 0;  // clear用

// エントリー
main();

/** メイン */
function main() {
    /** 初期化 */
    init();

    /** 落下位置指定 */
    canvas.ontouchmove = (canvas.onmousemove = (event) => {
        const mouseX = event.offsetX;
        const mouseY = event.offsetY;

        if (mouseX < wall.left) return;
        if (mouseX > wall.right) return;
        if (mouseY < wall.top) return;
        if (mouseY > wall.bottom) return;

        let x = mouseX;
        x = Math.max(x, wall.left+60*widthRatio*dprRatio);
        x = Math.min(x, wall.right-85*widthRatio*dprRatio);
        curBall.center.x = x;
        curBall.center.y = curBall.center.y;
    });

    /** 落下開始 */
    let isAbled = true;  // 落下可能かどうか
    canvas.ontouchend = (canvas.onmouseup = (event) => {
        const mouseX = event.offsetX;
        const mouseY = event.offsetY;

        if (mouseX < wall.left || wall.right < mouseX) return;
        if (mouseY < wall.top || wall.bottom < mouseY) return;

        if (!isAbled) return;
        isAbled = false;
        setTimeout(() => isAbled = true, delay);

        curBall.isActive = true;
        balls.set(curBall.id, curBall);
        const radius = ballInfos[nextBall.type].radius;
        let x = mouseX;
        x = Math.max(x, wall.left+60*widthRatio*dprRatio);
        x = Math.min(x, wall.right-85*widthRatio*dprRatio);
        curBall = new Ball(
            new Vector2D(x, wall.top+43/2*widthRatio*dprRatio-radius),
            Vector2D.zero,
            nextBall.type,
        );
        nextBall = new Ball(
            new Vector2D((wall.right+canvas.width)/2+15*widthRatio, wall.top+90*widthRatio),
            Vector2D.zero,
            randomIntPdf(ballInfos.map((bi) => bi.odds)),
        );
    });

    // console.time("loop");
    loop();
}

/** 初期化 */
function init() {
    balls = new Map();
    score = 0;
    bestScore = Math.max(bestScore, score);
    requestID = 0;

    const type = randomIntPdf(ballInfos.map((bi) => bi.odds));
    const radius = ballInfos[type].radius;
    curBall = new Ball(
        new Vector2D(wall.left+60*widthRatio*dprRatio, wall.top+43/2*widthRatio*dprRatio-radius),
        Vector2D.zero,
        type,
    );
    nextBall = new Ball(
        new Vector2D((wall.right+canvas.width)/2+15*widthRatio, wall.top+90*widthRatio),
        Vector2D.zero,
        randomIntPdf(ballInfos.map((bi) => bi.odds)),
    );
}

/** 描画ループ */
function loop() {
    // console.timeEnd("loop");
    // console.time("loop");

    requestID = requestAnimationFrame(loop);

    /** 全体背景描画 */
    (() => {
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    })();

    /** スコア描画 */
    (() => {
        const x = wall.left/2-18*widthRatio;
        const y = wall.top+64*widthRatio;
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillStyle = "white";
        ctx.font = "900 60px cursive";
        ctx.fillText(`${score}`, x, y-40*widthRatio);

        ctx.fillStyle = "goldenrod";
        ctx.font = "1000 30px cursive";
        ctx.fillText("BESTSCORE", x, y+20*widthRatio);
        ctx.fillStyle = "saddlebrown";
        ctx.font = "950 30px cursive";
        ctx.fillText("BESTSCORE", x, y+20*widthRatio);
        ctx.fillStyle = "white";
        ctx.font = "900 30px cursive";
        ctx.fillText("BESTSCORE", x, y+20*widthRatio);

        ctx.font = "900 40px cursive";
        ctx.fillText(`${bestScore}`, x, y+50*widthRatio);
        ctx.restore();
    })();

    /** ネクスト描画 */
    (() => {
        ctx.save();
        nextBall.draw();
        ctx.restore();
    })();

    /** 操作対象描画 */
    (() => {
        const image = character;
        const width = image.width;
        const height = image.height;
        const scale = 156*widthRatio/width;
        const sx = 0;
        const sy = 0;
        const sw = width;
        const sh = height;
        const dw = sw*scale;
        const dh = sh*scale;
        const dx = curBall.center.x;
        const dy = wall.top-dh;
        ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
        curBall.draw();
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 8*dprRatio;
        ctx.moveTo(curBall.center.x, curBall.center.y+curBall.info.radius);
        ctx.lineTo(curBall.center.x, wall.bottom);
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
    })();

    /** ボール処理 */
    for (const ball of [...balls.values()].toSorted((ball1, ball2) => {
        const center1 = new Vector2D(ball1.center.y, ball1.center.x);
        const center2 = new Vector2D(ball2.center.y, ball2.center.x);
        if (center1.lt(center2)) return -1;
        if (center1.gt(center2)) return 1;
        return 0;
    })) {
        ball.draw()
            .update()
            .collisionWall()
            .collisionBall();
    }
}

/** 終了 */
function gameOver() {
    /** ゲームオーバー描画 */
    (() => {
        const x = canvas.width/6;
        const y = canvas.height*5/6;
        ctx.save();
        ctx.font = "900 60px cursive";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("ゲームオーバー", x, y);
        ctx.restore();
    })();

    cancelAnimationFrame(requestID);
}
};
