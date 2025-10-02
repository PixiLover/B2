import { Application, Container, Sprite, Texture, Assets } from "pixi.js";

export interface ParallaxConfig {
    speed: number;
    zIndex: number;
    scale?: number;
    offsetY?: number;
}

export interface CityConfig {
    id: number;
    name: string;
    layers: ParallaxConfig[];
}

export class ParallaxBackground {
    private app: Application;
    private container: Container;
    private cities: Map<number, CityConfig> = new Map();
    private currentTimeOfDay: 'Day' | 'Night' = 'Day';
    private layers: Sprite[][] = [];
    private isLoaded: boolean = false;
    private citySequence: number[] = [1, 2, 3, 5];
    private layerCityIndices: number[] = [0, 0, 0, 0, 0]; // Track which city each layer is currently showing
    private isSwitchingCity: boolean[] = [false, false, false, false, false]; // Prevent multiple switches per layer
    private lastSwitchTime: number[] = [0, 0, 0, 0, 0]; // Track when each layer last switched
    private switchCooldown: number = 1000; // 1 second cooldown between switches

    constructor(app: Application) {
        this.app = app;
        this.container = new Container();
        this.container.zIndex = 1; // Behind the plane
        this.app.stage.addChild(this.container);
        
        this.initializeCities();
    }

    private initializeCities() {
        // Define layer configurations - each layer has different speed and z-index
        // Layer 1 (1.png) - slowest, farthest background
        // Layer 2 (2.png) - slow
        // Layer 3 (3.png) - medium speed
        // Layer 4 (4.png) - faster
        // Layer 5 (5.png) - fastest, closest to screen
        const layerConfigs: ParallaxConfig[] = [
            { speed: 0.1, zIndex: 0, scale: 1.0, offsetY: 0 },    // 1.png - slowest
            { speed: 0.2, zIndex: 1, scale: 1.0, offsetY: 0 },    // 2.png
            { speed: 0.4, zIndex: 2, scale: 1.0, offsetY: 0 },    // 3.png
            { speed: 0.6, zIndex: 3, scale: 1.0, offsetY: 0 },    // 4.png
            { speed: 0.8, zIndex: 4, scale: 1.0, offsetY: 0 }     // 5.png - fastest
        ];

        // Create city configs with the same layer structure
        this.citySequence.forEach(cityId => {
            this.cities.set(cityId, {
                id: cityId,
                name: `City ${cityId}`,
                layers: layerConfigs
            });
        });
    }

    async loadInitialLayers(timeOfDay: 'Day' | 'Night' = 'Day'): Promise<void> {
        this.currentTimeOfDay = timeOfDay;

        // Clear existing layers
        this.clearLayers();

        // Load textures for all layers from all cities
        const allTextures: Map<number, Texture[]> = new Map();
        
        for (const cityId of this.citySequence) {
            const cityTextures: Texture[] = [];
            for (let layerNumber = 1; layerNumber <= 5; layerNumber++) {
                // Use night for all layers
                const texturePath = `cities/${cityId}/Night/${layerNumber}.png`;
                try {
                    const texture = await Assets.load(texturePath);
                    cityTextures.push(texture);
                } catch (error) {
                    console.warn(`Failed to load texture: ${texturePath}`, error);
                    cityTextures.push(Texture.EMPTY);
                }
            }
            allTextures.set(cityId, cityTextures);
        }

        // Create sprites for each layer (5 layers total: 1.png, 2.png, 3.png, 4.png, 5.png)
        for (let layerIndex = 0; layerIndex < 5; layerIndex++) {
            this.layers[layerIndex] = [];
            
            // Get the layer config
            const layerConfig = this.cities.get(this.citySequence[0])!.layers[layerIndex];
            
            // Create multiple sprites for seamless scrolling
            for (let i = 0; i < 3; i++) {
                // Start with first city for each layer
                const currentCityId = this.citySequence[this.layerCityIndices[layerIndex]];
                const cityTextures = allTextures.get(currentCityId)!;
                const texture = cityTextures[layerIndex];
                
                const sprite = new Sprite(texture);
                sprite.anchor.set(0, 0);
                sprite.scale.set(layerConfig.scale || 1);
                sprite.zIndex = layerConfig.zIndex;
                sprite.x = i * this.app.screen.width;
                
                if (layerIndex === 0) {
                    // Background layer (1.png) - full height, positioned at top
                    sprite.y = (layerConfig.offsetY || 0);
                } else {
                    // City layers (2.png, 3.png, 4.png, 5.png) - positioned at bottom
                    const targetHeight = this.app.screen.height * 0.85;
                    sprite.y = this.app.screen.height - targetHeight + (layerConfig.offsetY || 0);
                }
                
                // Scale sprites based on layer type
                const scaleX = this.app.screen.width / sprite.texture.width;
                let scaleY: number;
                
                if (layerIndex === 0) {
                    // Background layer (1.png) - full height
                    scaleY = this.app.screen.height / sprite.texture.height;
                } else {
                    // City layers (2.png, 3.png, 4.png, 5.png) - 85% height from bottom
                    const targetHeight = this.app.screen.height * 0.85;
                    scaleY = targetHeight / sprite.texture.height;
                }
                
                sprite.scale.set(scaleX, scaleY);
                
                this.container.addChild(sprite);
                this.layers[layerIndex].push(sprite);
            }
        }

        this.isLoaded = true;
    }

    private clearLayers(): void {
        this.layers.forEach(layerSprites => {
            layerSprites.forEach(sprite => {
                this.container.removeChild(sprite);
                sprite.destroy();
            });
        });
        this.layers = [];
    }

    update(_deltaTime: number, scrollOffset: number = 0): void {
        if (!this.isLoaded) return;

        this.layers.forEach((layerSprites, layerIndex) => {
            const layerConfig = this.cities.get(this.citySequence[0])!.layers[layerIndex];
            const speed = layerConfig.speed;
            const screenWidth = this.app.screen.width;

            layerSprites.forEach((sprite, spriteIndex) => {
                // Calculate parallax movement (reversed direction - move left)
                const parallaxOffset = -scrollOffset * speed;
                let newX = (spriteIndex * screenWidth) + parallaxOffset;

                // Wrap around for seamless scrolling
                // Keep sprites within the range [-screenWidth, screenWidth * 2]
                const totalWidth = screenWidth * 3; // 3 sprites total
                newX = ((newX % totalWidth) + totalWidth) % totalWidth;
                
                // If sprite is off-screen to the left, move it to the right side
                if (newX < -screenWidth) {
                    newX += totalWidth;
                }
                // If sprite is off-screen to the right, move it to the left side
                else if (newX > screenWidth * 2) {
                    newX -= totalWidth;
                }
                
                sprite.x = newX;
            });

            // Temporarily disabled city switching - using only city 1
            // TODO: Re-enable city switching later
            /*
            // Check if we need to switch to next city for this layer
            // Only switch when the first sprite is completely out of view
            const firstSprite = layerSprites[0];
            if (firstSprite && !this.isSwitchingCity[layerIndex]) {
                const currentTime = performance.now();
                const timeSinceLastSwitch = currentTime - this.lastSwitchTime[layerIndex];
                const citySwitchThreshold = -screenWidth; // Switch when sprite is completely out
                
                // Only switch if enough time has passed and sprite is completely out of view
                if (firstSprite.x < citySwitchThreshold && timeSinceLastSwitch > this.switchCooldown) {
                    // Switch to next city for this layer
                    this.isSwitchingCity[layerIndex] = true;
                    this.lastSwitchTime[layerIndex] = currentTime;
                    
                    const oldCityId = this.citySequence[this.layerCityIndices[layerIndex]];
                    this.layerCityIndices[layerIndex] = (this.layerCityIndices[layerIndex] + 1) % this.citySequence.length;
                    const newCityId = this.citySequence[this.layerCityIndices[layerIndex]];
                    
                    console.log(`Layer ${layerIndex + 1} switching from city ${oldCityId} to city ${newCityId} (cooldown: ${timeSinceLastSwitch}ms, cityIndex: ${this.layerCityIndices[layerIndex]})`);
                    
                    // Update all sprites in this layer with the new city texture
                    this.loadLayerTextureForAllSprites(layerIndex, newCityId, layerSprites).then(() => {
                        this.isSwitchingCity[layerIndex] = false;
                    });
                }
            }
            */
        });
    }

    private async loadLayerTextureForAllSprites(layerIndex: number, cityId: number, sprites: Sprite[]): Promise<void> {
        const layerNumber = layerIndex + 1; // Start from 1.png
        // Use night for all layers
        const texturePath = `cities/${cityId}/Night/${layerNumber}.png`;
        
        try {
            const texture = await Assets.load(texturePath);
            
            // Update all sprites in this layer with the new texture
            sprites.forEach((sprite, spriteIndex) => {
                sprite.texture = texture;
                
                // Rescale based on layer type
                const scaleX = this.app.screen.width / texture.width;
                let scaleY: number;
                
                if (layerIndex === 0) {
                    // Background layer (1.png) - full height
                    scaleY = this.app.screen.height / texture.height;
                } else {
                    // City layers (2.png, 3.png, 4.png, 5.png) - 85% height from bottom
                    const targetHeight = this.app.screen.height * 0.85;
                    scaleY = targetHeight / texture.height;
                }
                
                sprite.scale.set(scaleX, scaleY);
                
                // Reposition if it's a city layer
                if (layerIndex !== 0) {
                    const targetHeight = this.app.screen.height * 0.85;
                    sprite.y = this.app.screen.height - targetHeight;
                }
                
                // Position sprites properly after city switch to prevent immediate re-switching
                const screenWidth = this.app.screen.width;
                // Reset all sprites to their proper positions for seamless scrolling
                sprite.x = spriteIndex * screenWidth;
            });
        } catch (error) {
            console.warn(`Failed to load texture: ${texturePath}`, error);
        }
    }

    private async loadLayerTexture(layerIndex: number, cityId: number, sprite: Sprite): Promise<void> {
        const layerNumber = layerIndex + 1; // Start from 1.png
        // Use night for all layers
        const texturePath = `cities/${cityId}/Night/${layerNumber}.png`;
        
        try {
            const texture = await Assets.load(texturePath);
            sprite.texture = texture;
            
            // Rescale based on layer type
            const scaleX = this.app.screen.width / texture.width;
            let scaleY: number;
            
            if (layerIndex === 0) {
                // Background layer (1.png) - full height
                scaleY = this.app.screen.height / texture.height;
            } else {
                // City layers (2.png, 3.png, 4.png, 5.png) - 85% height from bottom
                const targetHeight = this.app.screen.height;
                scaleY = targetHeight / texture.height;
            }
            
            sprite.scale.set(scaleX, scaleY);
            
            // Reposition if it's a city layer
            if (layerIndex !== 0) {
                const targetHeight = this.app.screen.height;
                sprite.y = this.app.screen.height - targetHeight;
            }
            
            // Position the sprite at the far right to come into view from the right
            const screenWidth = this.app.screen.width;
            sprite.x = screenWidth * 2; // Position it at the far right
        } catch (error) {
            console.warn(`Failed to load texture: ${texturePath}`, error);
        }
    }

    getCurrentTimeOfDay(): 'Day' | 'Night' {
        return this.currentTimeOfDay;
    }

    getCitySequence(): number[] {
        return [...this.citySequence];
    }

    destroy(): void {
        this.clearLayers();
        this.app.stage.removeChild(this.container);
        this.container.destroy();
    }
}
