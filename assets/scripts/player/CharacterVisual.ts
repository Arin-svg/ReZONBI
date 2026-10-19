import { Animation, Node } from 'cc';
export type CharacterAction = 'shoot' | 'slash' | 'dodge' | 'hurt' | 'die' | 'victory';
export interface CharacterVisual {
    root: Node;
    play(action: CharacterAction, duration: number): void;
    reset(): void;
    animate(dt: number, moving: number): void;
}
/** Adapter for an artist-authored prefab. Clip names: idle, run, shoot, slash, dodge, hurt, die, victory. */
export class RiggedCharacterVisual implements CharacterVisual {
    private animation: Animation | null;
    private state = '';
    private locked = 0;
    private terminal = false;
    constructor(public readonly root: Node) { this.animation = root.getComponentInChildren(Animation); this.reset(); }
    private crossFade(name: string): void {
        if (name === this.state || !this.animation?.getState(name)) return;
        this.state = name; this.animation.crossFade(name, .12);
    }
    play(action: CharacterAction, duration: number): void {
        if (this.terminal) return;
        this.locked = duration; this.terminal = action === 'die' || action === 'victory'; this.crossFade(action);
    }
    reset(): void { this.terminal = false; this.locked = 0; this.state = ''; this.crossFade('idle'); }
    animate(dt: number, moving: number): void { this.locked = Math.max(0, this.locked - dt); if (!this.terminal && !this.locked) this.crossFade(moving > .05 ? 'run' : 'idle'); }
}
