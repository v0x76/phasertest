var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#2d2d2d',
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

var game = new Phaser.Game(config);

var player;
var SHOT_DELAY, BULLET_SPEED, NUMBER_OF_BULLETS, bulletPool, lastBulletShotAt;

function preload() {
    this.load.image('player', 'img/player.png');
    this.load.image('bullet', 'img/bullet.png');
}

function create() {
    player = this.physics.add.sprite(50, 50, 'player');

    this.key_W = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.key_A = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.key_S = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.key_D = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    SHOT_DELAY = 200;
    BULLET_SPEED = 200;
    NUMBER_OF_BULLETS = 20;

    bulletPool = this.physics.add.group();
    for(var i=0; i<NUMBER_OF_BULLETS; i++) {
        var bullet = this.physics.add.sprite(0, 0, 'bullet');
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

    player.x += hspeed;
    player.y += vspeed;

    player.rotation = Phaser.Math.Angle.BetweenPoints(player.body.position, game.input.activePointer.position); 
    if(game.input.activePointer.isDown)
        shootBullet(this.time);
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

    bullet.rotation = player.rotation;
    bullet.body.velocity.x = Math.cos(bullet.rotation) * BULLET_SPEED;
    bullet.body.velocity.y = Math.sin(bullet.rotation) * BULLET_SPEED;

    timer.delayedCall(2000, ()=>{bullet.disableBody(true, true);}, [], this);
}

function distance(posa, posb) {
    var dx = posa.x - posb.x;
    var dy = posa.y - posb.y;
    return Math.sqrt(dx*dx + dy*dy);
}
