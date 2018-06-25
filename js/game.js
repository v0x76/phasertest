var config = {
    type: Phaser.AUTO,
    width: 768,
    height: 1024,
    backgroundColor: '#444',
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game;

window.onload = function() {
    game = new Phaser.Game(config);
    resize();
    window.addEventListener("resize", resize, false);
}

var player;
var SHOT_DELAY, BULLET_SPEED, NUMBER_OF_BULLETS, bulletPool, lastBulletShotAt;
var INPUT_X, INPUT_Y;
var inputin, inputout;
var inputon;

SHOT_DELAY        = 200;
BULLET_SPEED      = 200;
NUMBER_OF_BULLETS = 20;

INPUT_MAXDIST = 45;
INPUT_X = 100;
INPUT_Y = 925;

function resize() {
    var canvas = document.querySelector("canvas");
    var winwidth = window.innerWidth;
    var winheight = window.innerHeight;
    var winratio = winwidth / winheight;
    var gameratio = game.config.width / game.config.height;

    if(winratio < gameratio) {
        canvas.style.width = winwidth+"px";
        canvas.style.height = (winwidth/gameratio)+"px";
    } else {
        canvas.style.width = (winheight*gameratio)+"px";
        canvas.style.height = winheight+"px";
    }
}

function preload() {
    this.load.image('player', 'img/player.png');
    this.load.image('bullet', 'img/bullet.png');
    this.load.image('input-outer', 'img/input-circleout.png');
    this.load.image('input-inner', 'img/input-circlein.png');
}

function create() {
    player = this.physics.add.sprite(50, 50, 'player');
    player.body.setOffset(8, 8);
    player.setScale(6);

    this.cameras.main.startFollow(player);

    inputout = this.add.image( INPUT_X, INPUT_Y, 'input-outer' );
    inputin  = this.add.image( INPUT_X, INPUT_Y, 'input-inner' );

    inputout.setScrollFactor(0);
    inputin.setScrollFactor(0);
    inputout.setInteractive();

    this.input.addPointer(1);

    this.input.on('gameobjectdown', function(pointer) {
        inputon = pointer;
    });

    this.input.on('pointerup', function(pointer) {
        if(pointer == inputon) {
            inputon = null;

            inputin.x = inputout.x;
            inputin.y = inputout.y;
        }
    });

    this.key_W = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.key_A = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.key_S = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.key_D = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    bulletPool = this.physics.add.group();
    for(var i=0; i<NUMBER_OF_BULLETS; i++) {
        var bullet = this.physics.add.sprite(0, 0, 'bullet');
        bullet.setScale(3);
        bulletPool.add(bullet);
        bullet.disableBody(true, true);
    }
}

function update() {
    var hspeed = 0;
    var vspeed = 0;

    if(this.key_W.isDown)
        vspeed -= 2;
    if(this.key_A.isDown)
        hspeed -= 2;
    if(this.key_S.isDown)
        vspeed += 2;
    if(this.key_D.isDown)
        hspeed += 2;

    if(inputon) {
        var uiinput = setDirection();
    }

    if(game.input.activePointer.isDown && inputon!=game.input.activePointer) {
        var swipe = hasSwiped(this.time);
        if( swipe.up ) {
            vspeed -= 8;
        } else if( swipe.down ) {
            vspeed += 8; 
        }
        if( swipe.left ) {
            hspeed -= 8;
        } else if( swipe.right ) {
            hspeed += 8;
        }

        player.body.rotation = Phaser.Math.Angle.BetweenPoints(player.body.position, {x:game.input.activePointer.worldX, y:game.input.activePointer.worldY}); 
        player.rotation = player.body.rotation;
        shootBullet(this.time);
    }

    player.x += hspeed;
    player.y += vspeed;

}

function setDirection() {
    var vspeed = 0;
    var hspeed = 0;

    var d = distance({x:INPUT_X, y:INPUT_Y}, inputon);
    var dx = inputon.x - INPUT_X;
    var dy = inputon.y - INPUT_Y;

    var angle = Phaser.Math.Angle.BetweenPoints({x:INPUT_X, y:INPUT_Y}, inputon.position);

    if(d > INPUT_MAXDIST) {
        dx = (dx===0) ? 0 : Math.cos(angle) * INPUT_MAXDIST;
        dy = (dy===0) ? 0 : Math.sin(angle) * INPUT_MAXDIST;
    }

    // update UI position
    inputin.x = INPUT_X+dx;
    inputin.y = INPUT_Y+dy;

    if(dx>-25 && dx<25 && dy<25 && dy>-25) {
        return false;
    } else {

        if(dy <= -20) {
            vspeed -= 2;
        } else if(dy >= 20) {
            vspeed += 2;
        }
        if(dx <= -20) {
            hspeed -= 2;
        } else if(dx >= 20) {
            hspeed += 2;
        }

        player.x += hspeed;
        player.y += vspeed;

        return true;
    }
}

function hasSwiped(timer) {
    var pointer = game.input.activePointer;
    var duration = timer.now - pointer.downTime; // Assumes a single scene
    if ( distance(pointer.position, {x:pointer.downX, y:pointer.downY})>150 && duration>100 && duration<250 ) {
        return {
            right:(pointer.x-pointer.downX > 60),
            left: (pointer.x-pointer.downX < -60),
            down: (pointer.y-pointer.downY > 60),
            up:   (pointer.y-pointer.downY < -60),
        };
    } else {
        return {
            right:false,
            left: false,
            down: false,
            up:   false
        };
    }
}

function shootBullet(timer) {
    if(lastBulletShotAt === undefined) lastBulletShotAt=0;
    if(timer.now-lastBulletShotAt < SHOT_DELAY) return;
    lastBulletShotAt = timer.now;

    var bullet = bulletPool.getFirstDead();

    if(bullet === null || bullet === undefined) return;

    bullet.enableBody(true, player.x, player.y, true, true)

    bullet.rotation = player.body.rotation;
    bullet.body.velocity.x = Math.cos(bullet.rotation) * BULLET_SPEED;
    bullet.body.velocity.y = Math.sin(bullet.rotation) * BULLET_SPEED;

    timer.delayedCall(2000, ()=>{bullet.disableBody(true, true);}, [], this);
}

function distance(posa, posb) {
    var dx = posa.x - posb.x;
    var dy = posa.y - posb.y;
    return Math.sqrt(dx*dx + dy*dy);
}
