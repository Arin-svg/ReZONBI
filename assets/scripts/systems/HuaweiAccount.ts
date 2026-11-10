/** Runtime Quick Game sign-in for the Malaysia prototype. No client secrets belong here. */
declare const qg: HuaweiRuntime | undefined;
interface LoginResult { playerId?: string; displayName?: string; isAuth?: number; code?: number; }
interface HuaweiRuntime {
    gameLogin(options: { appid: string; forceLogin: number; success: (data: LoginResult) => void; fail: (data: unknown, code?: number) => void }): void;
}
export const HUAWEI_APP_ID = '119747847';
export class HuaweiAccount {
    status: 'guest'|'pending'|'signed-in'|'unavailable'|'cancelled'|'failed'|'verification-required' = 'guest';
    displayName = '';
    private attempt = 0;
    private remaining = 0;
    private changed: (() => void) | undefined;
    constructor(private runtime = (): HuaweiRuntime | undefined => typeof qg !== 'undefined' ? qg : undefined) {}
    signIn(changed: () => void): void {
        if (this.status === 'pending') return;
        this.displayName = '';
        const api = this.runtime();
        if (!api || typeof api.gameLogin !== 'function') { this.status = 'unavailable'; changed(); return; }
        const attempt = ++this.attempt;
        this.status = 'pending'; this.remaining = 60; this.changed = changed;
        const finish = (status: HuaweiAccount['status']) => {
            if (attempt !== this.attempt || this.status !== 'pending') return;
            this.status = status; this.remaining = 0; this.changed = undefined; changed();
        };
        changed();
        try {
            api.gameLogin({ appid: HUAWEI_APP_ID, forceLogin: 1,
                success: data => {
                    if (attempt !== this.attempt || this.status !== 'pending') return;
                    if (!data || (data.code !== undefined && data.code !== 0) || typeof data.playerId !== 'string' || !data.playerId) { finish('failed'); return; }
                    // A backend must verify these responses; never treat them as authenticated locally.
                    if (data.isAuth === 1) { finish('verification-required'); return; }
                    this.displayName = typeof data.displayName === 'string' ? data.displayName.slice(0, 40).replace(/[\r\n]/g, ' ') : '';
                    finish('signed-in');
                },
                fail: (data, code) => {
                    const result = Number(code ?? (typeof data === 'object' && data !== null ? (data as {code?: number}).code : undefined));
                    finish(result === 7004 || result === 2012 ? 'cancelled' : 'failed');
                },
            });
        } catch { finish('failed'); }
    }
    tick(dt: number): void {
        if (this.status !== 'pending') return;
        this.remaining -= dt;
        if (this.remaining > 0) return;
        ++this.attempt; this.status = 'failed';
        const changed = this.changed; this.changed = undefined; changed?.();
    }
}
