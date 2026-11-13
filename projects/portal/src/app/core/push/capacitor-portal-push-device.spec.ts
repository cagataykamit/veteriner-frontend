import type { Mock } from 'vitest';
import { CapacitorPortalPushDevice, type PortalPushPlugin } from './capacitor-portal-push-device';

type Listener = (event: never) => void;

describe('CapacitorPortalPushDevice', () => {
    let listeners: Map<string, Listener>;
    let removed: string[];
    let plugin: {
        checkPermissions: Mock;
        requestPermissions: Mock;
        register: Mock;
        addListener: Mock;
    };

    const emit = (name: string, event: unknown) => (listeners.get(name) as (e: unknown) => void)(event);

    beforeEach(() => {
        listeners = new Map();
        removed = [];
        plugin = {
            checkPermissions: vi.fn().mockResolvedValue({ receive: 'granted' }),
            requestPermissions: vi.fn().mockResolvedValue({ receive: 'granted' }),
            register: vi.fn().mockImplementation(() => {
                queueMicrotask(() => emit('registration', { value: 'fcm-token' }));

                return Promise.resolve();
            }),
            addListener: vi.fn().mockImplementation((name: string, fn: Listener) => {
                listeners.set(name, fn);

                return Promise.resolve({ remove: () => Promise.resolve(void removed.push(name)) });
            })
        };
    });

    const device = (platform = 'android') => new CapacitorPortalPushDevice(plugin as unknown as PortalPushPlugin, platform);

    it('platformu Capacitor platformundan türetir', () => {
        expect(device('android').platform).toBe('Android');
        expect(device('ios').platform).toBe('Ios');
        expect(device().supported).toBe(true);
    });

    it('izin sorulacaksa ister, verilince jetonu döner ve dinleyicileri kaldırır', async () => {
        plugin.checkPermissions.mockResolvedValue({ receive: 'prompt' });

        await expect(device().obtainToken()).resolves.toBe('fcm-token');

        expect(plugin.requestPermissions).toHaveBeenCalledTimes(1);
        await vi.waitFor(() => expect(removed.sort()).toEqual(['registration', 'registrationError']));
    });

    it('izin reddedilirse kayıt yapılmaz, hata döner', async () => {
        plugin.checkPermissions.mockResolvedValue({ receive: 'prompt' });
        plugin.requestPermissions.mockResolvedValue({ receive: 'denied' });

        await expect(device().obtainToken()).rejects.toThrow();
        expect(plugin.register).not.toHaveBeenCalled();
    });

    it('kayıt hatası olayı hata olarak döner', async () => {
        plugin.register.mockImplementation(() => {
            queueMicrotask(() => emit('registrationError', { error: 'firebase yok' }));

            return Promise.resolve();
        });

        await expect(device().obtainToken()).rejects.toThrow('firebase yok');
    });

    it('sessiz jeton izin sormaz: izin yoksa null, varsa jeton', async () => {
        plugin.checkPermissions.mockResolvedValue({ receive: 'prompt' });
        await expect(device().silentToken()).resolves.toBeNull();
        expect(plugin.requestPermissions).not.toHaveBeenCalled();
        expect(plugin.register).not.toHaveBeenCalled();

        plugin.checkPermissions.mockResolvedValue({ receive: 'granted' });
        await expect(device().silentToken()).resolves.toBe('fcm-token');
    });

    it('sessiz jetonda eklenti hatası null döner', async () => {
        plugin.checkPermissions.mockRejectedValue(new Error('yok'));

        await expect(device().silentToken()).resolves.toBeNull();
    });
});
