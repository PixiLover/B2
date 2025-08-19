import { Application, Assets, AnimatedSprite } from "pixi.js";
import { Howl } from "howler";

const app = new Application();
await app.init({ background: 0x0b1020, resizeTo: window });
document.getElementById("app")?.appendChild(app.canvas);
if (!app.canvas) console.error("No canvas appended");

try {
  const sheet = await Assets.load("/plane-data-36-grid6x6.json"); // absolute path from public root

  // Sanity checks
  if (!sheet?.animations?.fly) {
    console.error(
      "Animation 'fly' missing. Keys:",
      Object.keys(sheet.animations || {}),
    );
  }
  const anim = new AnimatedSprite(sheet.animations.fly);
  anim.scale.set(0.5);
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
} catch (err) {
  console.error("Failed to load spritesheet:", err);
}
