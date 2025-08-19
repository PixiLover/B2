import { Application, Assets, AnimatedSprite } from "pixi.js";
import { Howl } from "howler";

const app = new Application();
await app.init({ background: 0x0b1020, resizeTo: window });
document.getElementById("app")?.appendChild(app.canvas);

const sheet = await Assets.load("plane-data-36.json");

const anim = new AnimatedSprite(sheet.animations.fly);
anim.animationSpeed = 0.35;
anim.play();
anim.anchor.set(0.5);
anim.x = app.screen.width / 2;
anim.y = app.screen.height / 2;
app.stage.addChild(anim);

const planeSound = new Howl({
  src: ["audio.mp3"],
  loop: true,
  volume: 0.7,
});
planeSound.play();
