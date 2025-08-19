import { Application, Assets, AnimatedSprite } from "pixi.js";
import { Howl } from "howler";

const app = new Application();
await app.init({ background: 0x0b1020, resizeTo: window });
document.getElementById("app")?.appendChild(app.canvas);

const sheet = await Assets.load("plane-data-49.json");

const plane = new AnimatedSprite(sheet.animations.fly);
plane.scale.set(0.5);
plane.animationSpeed = 0.17;
plane.play();
plane.anchor.set(0.5);
plane.x = app.screen.width * 0.3;
plane.y = app.screen.height * 0.5;
app.stage.addChild(plane);

const planeSound = new Howl({
  src: ["audio.mp3"],
  loop: true,
  volume: 0.7,
});
planeSound.play();

// params

const hoverY = app.screen.height * 0.35; // ceiling to stop climbing
const edgeMargin = 250;

let hovering = false;
const targetX = () => app.screen.width - edgeMargin;
let t0 = performance.now();

app.ticker.add(() => {
  const t = performance.now() - t0;

  if (!hovering) {
    // smooth approach on X
    const dx = targetX() - plane.x;
    plane.x += Math.min(2.0, dx * 0.08);

    // smooth climb on Y
    plane.y += (hoverY - plane.y) * 0.06;

    const pad = 40;
    plane.y = Math.max(pad, Math.min(app.screen.height - pad, plane.y));

    if (Math.abs(dx) < 1.5) {
      plane.x = targetX();
      hovering = true;
    }
  } else {
    // horizontal swing + vertical bob
    const offsetX = Math.sin(t * 0.0008) * 40; // slower side-to-side
    const offsetY = Math.sin(t * 0.001) * 20; // slower up-down

    plane.x = targetX() + offsetX;
    plane.y = hoverY + offsetY;
  }
});
