import {
  Application,
  Assets,
  AnimatedSprite,
  Sprite,
  Graphics,
  Ticker,
} from "pixi.js";
import { Howl } from "howler";

const app = new Application();
await app.init({ background: 0x0b1020, resizeTo: window });
document.getElementById("app")?.appendChild(app.canvas);

const sheet = await Assets.load("plane-data-64.json");
function speedForFrame(frame: number) {
  const targets = [0, 17, 37, 48];

  // find nearest slow point
  const nearest = targets.reduce(
    (a, b) => (Math.abs(frame - b) < Math.abs(frame - a) ? b : a),
    targets[0],
  );

  const dist = Math.abs(frame - nearest);

  // normalize distance (0 → 1)
  const factor = Math.min(dist / 10, 1);

  // map to range 0.11 .. 0.17
  const minSpeed = 0.12;
  const maxSpeed = 0.15;
  return minSpeed + (maxSpeed - minSpeed) * factor;
}
const plane = new AnimatedSprite(sheet.animations.fly);
plane.scale.set(0.5);
plane.animationSpeed = speedForFrame(0);
plane.onFrameChange = () => {
  plane.animationSpeed = speedForFrame(plane.currentFrame);
};
plane.zIndex = 102;
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

const romeTexture = await Assets.load("/cities/Rome.webp");
const londonTexture = await Assets.load("/cities/london.webp");
const brasilTexture = await Assets.load("/cities/brazil.webp");
const canadaTexture = await Assets.load("/cities/canada.webp");
const parisTexture = await Assets.load("/cities/paris.webp");
const nyTexture = await Assets.load("/cities/ny.webp");
const egyptTexture = await Assets.load("/cities/egypt.webp");
const maliTexture = await Assets.load("/cities/mali.webp");
const indiaTexture = await Assets.load("/cities/india.webp");

const cityTextures = [
  romeTexture,
  londonTexture,
  brasilTexture,
  canadaTexture,
  parisTexture,
  nyTexture,
  egyptTexture,
  maliTexture,
  indiaTexture,
];

const cities: Sprite[] = [];
const speed = 2;

function spawnCity(x: number) {
  const tex = cityTextures[(Math.random() * cityTextures.length) | 0];
  const city = new Sprite(tex);

  city.zIndex = 101;
  city.anchor.set(0.5);
  city.scale.set(1.5);
  city.x = x;
  city.y = app.screen.height + 50;
  city.alpha = 0.1;
  app.stage.addChild(city);
  cities.push(city);
}

// first city
spawnCity(app.screen.width * 0.7);

app.ticker.add(() => {
  for (let i = cities.length - 1; i >= 0; i--) {
    const c = cities[i];
    c.x -= speed;

    // if off left, remove
    if (c.x < -100) {
      app.stage.removeChild(c);
      cities.splice(i, 1);
    }
  }

  // if only one city left and it's near the left side, spawn next
  if (cities.length === 1 && cities[0].x < app.screen.width * 0.4) {
    spawnCity(app.screen.width + 150); // new one from right
  }
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
    // const offsetX = Math.sin(t * 0.0008) * 40; // slower side-to-side
    const offsetY = Math.sin(t * 0.001) * 20; // slower up-down

    // plane.x = targetX() + offsetX;
    plane.y = hoverY + offsetY;
  }
});

function addStars() {
  type Star = Graphics & {
    speed: number;
    blink?: boolean;
    blinkPhase?: number;
    blinkSpeed?: number;
  };

  app.stage.sortableChildren = true;

  const STAR_MARGIN = 300;
  const starCount = Math.ceil(app.screen.width / 15);
  const stars: Star[] = [];

  // create and add to stage
  for (let i = 0; i < starCount; i++) {
    const star = new Graphics() as Star;

    // position within screen, with small overscan so edges aren't empty
    star.x = Math.random() * (app.screen.width + STAR_MARGIN * 2) - STAR_MARGIN;
    star.y =
      Math.random() * (app.screen.height + STAR_MARGIN * 2) - STAR_MARGIN;

    // size
    const small = 0.2 + Math.random() * 1.1;
    const big = 1 + Math.random() * 1.2;
    const r = Math.random() < 0.5 ? small : big;

    // blink
    if (Math.random() < 0.1) {
      star.blink = true;
      star.blinkPhase = Math.random() * Math.PI * 3;
      star.blinkSpeed = 2000 + Math.random() * 3000;
    }

    // draw
    star.star(0, 0, 4, r, r / 2);
    star.fill({ color: 0xffffff, alpha: 0.7 });
    star.zIndex = 100;

    // speed: small stars a bit slower, big a bit faster
    const minSpeed = 1.2;
    const maxSpeed = 2.6;
    const t = Math.min(1, Math.max(0, (r - 0.2) / (2.2 - 0.2))); // 0..1
    star.speed = minSpeed + t * (maxSpeed - minSpeed);

    app.stage.addChild(star);
    stars.push(star);
  }

  // multipliers and tickers
  let accel = 0; // extra scroll after a few seconds
  let frames = 0;

  const moveTicker = new Ticker();
  moveTicker.add((ticker) => {
    const dt = ticker.deltaTime; // frames at 60 fps ≈ 1
    frames += dt;

    if (frames > 240 && accel < 2.5) {
      accel = Math.min(2.5, accel + 0.005 * dt);
    }

    for (const s of stars) {
      s.x -= (s.speed + accel) * dt; // dt is number now
      if (s.x < -STAR_MARGIN) {
        s.x = app.screen.width + STAR_MARGIN;
        s.y = Math.random() * app.screen.height;
      }
    }
  });
  moveTicker.start();

  const blinkTicker = new Ticker();
  blinkTicker.add((_ticker) => {
    const now = performance.now();
    for (const s of stars) {
      if (s.blink) {
        const a = Math.abs(Math.sin(now / s.blinkSpeed! + s.blinkPhase!));
        s.alpha = 0.35 + 0.65 * a;
      }
    }
  });
  blinkTicker.start();
}

addStars();
