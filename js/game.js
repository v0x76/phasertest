var config = {
    type: Phaser.AUTO,
    width: 768,
    height: 1024,
    backgroundColor: '#444',
    pixelArt: true,
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
}

var game
window.onload = function() {
    game = new Phaser.Game(config)
    resize()
    window.addEventListener("resize", resize, false)
}

var player
  , SHOT_DELAY, BULLET_SPEED, NUMBER_OF_BULLETS, bulletPool, lastBulletShotAt
  , INPUT_X, INPUT_Y
  , inputin, inputout
  , inputon

SHOT_DELAY        = 500
BULLET_SPEED      = 500
NUMBER_OF_BULLETS = 10

INPUT_MAXDIST = 45
INPUT_X = 100
INPUT_Y = 925

function resize() {
    var canvas = document.querySelector("canvas")
      , winwidth = window.innerWidth
      , winheight = window.innerHeight
      , winratio = winwidth / winheight
      , gameratio = game.config.width / game.config.height

    if(winratio < gameratio) {
        canvas.style.width = winwidth+"px"
        canvas.style.height = (winwidth/gameratio)+"px"
    } else {
        canvas.style.width = (winheight*gameratio)+"px"
        canvas.style.height = winheight+"px"
    }
}

function preload() {
    this.load.image('bg', 'img/bg.png')
    this.load.image('wall', 'img/wall.png')
    this.load.spritesheet('crate', 'img/box.png', {frameWidth: 8})
    this.load.image('player', 'img/player.png')
    this.load.image('bullet', 'img/bullet.png')
    this.load.image('input-outer', 'img/input-circleout.png')
    this.load.image('input-inner', 'img/input-circlein.png')
}

function create() {
    this.add.image(0, 250, 'bg')

    var walls = this.physics.add.staticGroup()
    walls.create(0, 0, 'wall').setScale(6).refreshBody()

    var crates = this.physics.add.staticGroup()
    for(var i=0; i<12; i++) {
        var spawnarea = Phaser.Geom.Triangle.BuildEquilateral(240, 100, 600)
        var pos = spawnarea.getRandomPoint()
        crates.create(pos.x, pos.y, 'crate').setScale(6).refreshBody()
    }

    player = this.physics.add.sprite(0, 250, 'player')
    player.body.setCircle(2, 6, 6)
    player.setScale(6)

    this.cameras.main.startFollow(player)

    inputout = this.add.image( INPUT_X, INPUT_Y, 'input-outer' )
    inputin  = this.add.image( INPUT_X, INPUT_Y, 'input-inner' )

    inputout.setScrollFactor(0)
    inputin.setScrollFactor(0)
    inputout.setInteractive()

    this.input.addPointer(1)

    this.input.on('gameobjectdown', function(pointer) {
        inputon = pointer
    })

    this.input.on('pointerup', function(pointer) {
        if(pointer == inputon) {
            inputon = null

            inputin.x = inputout.x
            inputin.y = inputout.y
        }
    })

    this.key_W = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this.key_A = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.key_S = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S)
    this.key_D = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)

    bulletPool = this.physics.add.group()
    for(var i=0; i<NUMBER_OF_BULLETS; i++) {
        var bullet = this.physics.add.sprite(0, 0, 'bullet')
        bullet.body.setSize(4, 4)
        bullet.setScale(3)
        bulletPool.add(bullet)
        bullet.disableBody(true, true)
    }

    this.physics.add.collider(player, [walls, crates])
    this.physics.add.collider(bulletPool, walls, (bullet)=>{ bullet.body.setVelocity(0,0) })
    this.physics.add.collider(bulletPool, crates, (bullet, crate)=>{ 
        bullet.setVelocity(0, 0)
        crate.disableBody(true, false)
        crate.setFrame(1)
    })
}

function update() {
    var hspeed = 0 
    var vspeed = 0
    var uiinput = 0

    if(player.body.velocity.x > 1 || player.body.velocity.x < 1)
        hspeed = player.body.velocity.x / 2
    if(player.body.velocity.y > 1 || player.body.velocity.y < 1)
        vspeed = player.body.velocity.y / 2

    if(inputon) {
        uiinput = setDirection()
    }

    if(this.key_W.isDown || uiinput.up)
        vspeed -= 50
    if(this.key_A.isDown || uiinput.left)
        hspeed -= 50
    if(this.key_S.isDown || uiinput.down)
        vspeed += 50
    if(this.key_D.isDown || uiinput.right)
        hspeed += 50

    if(game.input.activePointer.isDown && inputon!=game.input.activePointer) {
        var swipe = hasSwiped(this.time)
        if( swipe.up ) {
            vspeed -= 150
        } else if( swipe.down ) {
            vspeed += 150
        }
        if( swipe.left ) {
            hspeed -= 150
        } else if( swipe.right ) {
            hspeed += 150
        }

        player.body.rotation = Phaser.Math.Angle.BetweenPoints(player.body.position, {x:game.input.activePointer.worldX-24, y:game.input.activePointer.worldY-24}) 
        player.rotation = player.body.rotation
        shootBullet(this.time)
    }

    player.body.setVelocityX(hspeed)
    player.body.setVelocityY(vspeed)

}

function setDirection() {
    var vspeed = 0
    var hspeed = 0

    var d = distance({x:INPUT_X, y:INPUT_Y}, inputon)
    var dx = inputon.x - INPUT_X
    var dy = inputon.y - INPUT_Y

    var angle = Phaser.Math.Angle.BetweenPoints({x:INPUT_X, y:INPUT_Y}, inputon.position)

    if(d > INPUT_MAXDIST) {
        dx = (dx===0) ? 0 : Math.cos(angle) * INPUT_MAXDIST
        dy = (dy===0) ? 0 : Math.sin(angle) * INPUT_MAXDIST
    }

    // update UI position
    inputin.x = INPUT_X+dx
    inputin.y = INPUT_Y+dy

    return {
        up: (dy < -20),
        down: (dy > 20),
        left: (dx < -20),
        right: (dx > 20)
    }
}

function hasSwiped(timer) {
    var pointer = game.input.activePointer
    var duration = timer.now - pointer.downTime // Assumes a single scene
    if ( distance(pointer.position, {x:pointer.downX, y:pointer.downY})>150 && duration>100 && duration<250 ) {
        return {
            right:(pointer.x-pointer.downX > 60),
            left: (pointer.x-pointer.downX < -60),
            down: (pointer.y-pointer.downY > 60),
            up:   (pointer.y-pointer.downY < -60),
        }
    } else {
        return {
            right:false,
            left: false,
            down: false,
            up:   false
        }
    }
}

function shootBullet(timer) {
    if(lastBulletShotAt === undefined) lastBulletShotAt=0
    if(timer.now-lastBulletShotAt < SHOT_DELAY) return
    lastBulletShotAt = timer.now

    var bullet = bulletPool.getFirstDead()

    if(bullet === null || bullet === undefined) return

    bullet.enableBody(true, player.x, player.y, true, true)

    bullet.rotation = player.body.rotation
    bullet.body.rotation = bullet.rotation
    bullet.body.velocity.x = Math.cos(bullet.rotation) * BULLET_SPEED
    bullet.body.velocity.y = Math.sin(bullet.rotation) * BULLET_SPEED

    timer.delayedCall(500, ()=>{bullet.disableBody(true, true)}, [], this)
}

function distance(posa, posb) {
    var dx = posa.x - posb.x
    var dy = posa.y - posb.y
    return Math.sqrt(dx*dx + dy*dy)
}

