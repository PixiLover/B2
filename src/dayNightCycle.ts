export class DayNightCycle {
    private isDay: boolean = true;
    private cycleDuration: number = 30000; // 30 seconds for full cycle
    private transitionDuration: number = 5000; // 5 seconds for transition
    private startTime: number = 0;
    private onTimeChange?: (isDay: boolean) => void;

    constructor(cycleDuration: number = 30000, transitionDuration: number = 5000) {
        this.cycleDuration = cycleDuration;
        this.transitionDuration = transitionDuration;
        this.startTime = performance.now();
    }

    setOnTimeChange(callback: (isDay: boolean) => void): void {
        this.onTimeChange = callback;
    }

    update(): void {
        const elapsed = performance.now() - this.startTime;
        const cycleProgress = (elapsed % this.cycleDuration) / this.cycleDuration;
        
        // Determine if it's day or night based on cycle progress
        const wasDay = this.isDay;
        this.isDay = cycleProgress < 0.5; // First half is day, second half is night
        
        // Trigger callback if time of day changed
        if (wasDay !== this.isDay && this.onTimeChange) {
            this.onTimeChange(this.isDay);
        }
    }

    getCurrentTimeOfDay(): 'Day' | 'Night' {
        return this.isDay ? 'Day' : 'Night';
    }

    getCycleProgress(): number {
        const elapsed = performance.now() - this.startTime;
        return (elapsed % this.cycleDuration) / this.cycleDuration;
    }

    getTransitionProgress(): number {
        const cycleProgress = this.getCycleProgress();
        const halfCycle = 0.5;
        
        if (cycleProgress < halfCycle) {
            // Day to night transition
            const transitionStart = halfCycle - (this.transitionDuration / this.cycleDuration) / 2;
            if (cycleProgress >= transitionStart) {
                return (cycleProgress - transitionStart) / (this.transitionDuration / this.cycleDuration);
            }
        } else {
            // Night to day transition
            const transitionStart = 1 - (this.transitionDuration / this.cycleDuration) / 2;
            if (cycleProgress >= transitionStart) {
                return (cycleProgress - transitionStart) / (this.transitionDuration / this.cycleDuration);
            }
        }
        
        return 0; // Not in transition
    }

    isInTransition(): boolean {
        return this.getTransitionProgress() > 0;
    }

    forceTimeOfDay(timeOfDay: 'Day' | 'Night'): void {
        this.isDay = timeOfDay === 'Day';
        if (this.onTimeChange) {
            this.onTimeChange(this.isDay);
        }
    }
}
