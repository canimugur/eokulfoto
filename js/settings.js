const Settings = (function() {
    const DEFAULT_SETTINGS = {
        photoWidth: 133,
        photoHeight: 171,
        compressionMode: 'range',
        minFileSizeKB: 20,
        maxFileSizeKB: 150
    };
    const STORAGE_KEY = 'school_photo_settings';

    function load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        } catch (e) {
            console.error('Ayarlar yüklenemedi:', e);
        }
        return { ...DEFAULT_SETTINGS };
    }

    function save(settings) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {
            console.error('Ayarlar kaydedilemedi:', e);
        }
    }

    function getAll() {
        return load();
    }

    return { load, save, getAll, DEFAULT_SETTINGS };
})();