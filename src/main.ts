import { Application, Assets, AnimatedSprite, Texture } from "pixi.js";
import { Howl } from "howler";

const IDLE = 21;
const MIN = 16;
const DEF = 21;
const MAX = 25;
const IDLE_DURATION = 5000;
const BOBBING_SPEED = 0.001;
const BOBBING_AMPLITUDE = 10;

const createSequences = () => {
    const range = (a: number, b: number) => {
        const length = Math.abs(b - a) + 1;
        const step = a <= b ? 1 : -1;
        const arr = new Array(length);
        for (let i = 0; i < length; i++) {
            arr[i] = a + i * step;
        }
        return arr;
    };

    const seqFullIdx = [...range(DEF, MIN), ...range(MIN, MAX), ...range(MAX, DEF)];
    const seqHalfIdx = [...range(DEF, MIN), ...range(MIN, DEF)];
    const seqSecondHalfIdx = [...range(DEF, MAX), MAX, ...range(MAX, DEF)];

    const tex = (i: number) => Texture.from(`plane_${Math.max(0, Math.min(MAX, i))}`);
    
    return {
        full: seqFullIdx.map(tex),
        half: seqHalfIdx.map(tex),
        secondHalf: seqSecondHalfIdx.map(tex),
        indices: {
            full: seqFullIdx,
            half: seqHalfIdx,
            secondHalf: seqSecondHalfIdx
        }
    };
};

class AnimationState {
    private currentAbsIdx: number[] = [IDLE];
    private isIdle: boolean = true;

    setState(indices: number[]) {
        this.currentAbsIdx = indices;
        this.isIdle = false;
    }

    setIdle() {
        this.currentAbsIdx = [IDLE];
        this.isIdle = true;
    }

    getCurrentIndex(): number {
        return this.currentAbsIdx[0] || IDLE;
    }

    isInIdleState(): boolean {
        return this.isIdle;
    }
}

class OptimizedAnimationController {
    private timer: number | undefined;
    private state: AnimationState;
    private plane: AnimatedSprite;
    private sequences: ReturnType<typeof createSequences>;

    constructor(plane: AnimatedSprite, sequences: ReturnType<typeof createSequences>) {
        this.plane = plane;
        this.sequences = sequences;
        this.state = new AnimationState();
        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        this.plane.onFrameChange = () => {
            this.plane.animationSpeed = 0.20;
        };

        this.plane.onComplete = () => {
            this.setIdle();
            this.scheduleNextAnimation();
        };
    }

    private setIdle() {
        this.state.setIdle();
        this.plane.textures = [this.sequences.full[0]];
        this.plane.gotoAndStop(0);
    }

    private playSequence(name: 'full' | 'half' | 'secondHalf') {
        const indices = this.sequences.indices[name];
        this.state.setState(indices);
        this.plane.textures = this.sequences[name];
        this.plane.gotoAndPlay(0);
    }

    private scheduleNextAnimation() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        
        const randomIndex = (Math.random() * 3) | 0;
        const sequenceNames: ('full' | 'half' | 'secondHalf')[] = ["full", "half", "secondHalf"];
        const randomSequence = sequenceNames[randomIndex];
        
        this.timer = window.setTimeout(() => {
            this.playSequence(randomSequence);
        }, IDLE_DURATION);
    }

    start() {
        this.setIdle();
        this.scheduleNextAnimation();
    }

    destroy() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
    }
}

async function runApplication() {
    const app = new Application();
    await app.init({ 
        background: 0x0b1020, 
        resizeTo: window,
        antialias: false,
        powerPreference: "high-performance"
    });
    
    const appElement = document.getElementById("app");
    if (appElement) {
        appElement.appendChild(app.canvas);
    }

    await Assets.load("plane-data-64.json");

    const sequences = createSequences();

    const plane = new AnimatedSprite([sequences.full[0]]);
    plane.loop = false;
    plane.scale.set(0.8);
    plane.zIndex = 102;
    plane.anchor.set(0.5);
    plane.x = app.screen.width * 0.5;
    plane.y = app.screen.height * 0.35;
    
    plane.cacheAsTexture(false);
    plane.tint = 0xFFFFFF;
    
    app.stage.addChild(plane);

    const animationController = new OptimizedAnimationController(plane, sequences);
    animationController.start();

    const planeSound = new Howl({ 
        src: ["audio.mp3"], 
        loop: true, 
        volume: 0.7 
    });
    planeSound.play();

    const startTime = performance.now();
    const hoverY = app.screen.height * 0.35;
    
    const bobbingTicker = () => {
        const elapsed = performance.now() - startTime;
        const offsetY = Math.sin(elapsed * BOBBING_SPEED) * BOBBING_AMPLITUDE;
        plane.y = hoverY + offsetY;
    };
    
    app.ticker.add(bobbingTicker);

    const cleanup = () => {
        animationController.destroy();
        planeSound.stop();
        planeSound.unload();
        app.ticker.remove(bobbingTicker);
    };

    window.addEventListener('beforeunload', cleanup);
    
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            app.ticker.stop();
        } else {
            app.ticker.start();
        }
    });
}

runApplication().catch((error) => {
    console.error('Failed to run application:', error);
});