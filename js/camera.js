const Camera = (function() {
    let stream = null;
    let videoEl = null;
    let overlayEl = null;

    async function start(videoElement, overlayElement) {
        videoEl = videoElement;
        overlayEl = overlayElement;
        
        const settings = Settings.getAll();
        overlayEl.style.aspectRatio = `${settings.photoWidth} / ${settings.photoHeight}`;

        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });
            videoEl.srcObject = stream;

            await new Promise((resolve) => {
                videoEl.onloadedmetadata = () => {
                    videoEl.play().then(resolve).catch(resolve);
                };
                videoEl.onerror = resolve;
                setTimeout(resolve, 5000);
            });

            console.log(`Kamera hazır: ${videoEl.videoWidth}x${videoEl.videoHeight}`);

        } catch (err) {
            console.error("Kamera hatası:", err);
            alert("Kameraya erişilemedi. Lütfen tarayıcı izinlerini kontrol edin.");
        }
    }

    async function capture() {
        if (!videoEl || videoEl.videoWidth === 0) {
            console.error("Video henüz hazır değil!");
            return null;
        }

        const settings = Settings.getAll();
        const targetW = settings.photoWidth;
        const targetH = settings.photoHeight;

        const videoRect = videoEl.getBoundingClientRect();
        const overlayRect = overlayEl.getBoundingClientRect();

        const scaleX = videoEl.videoWidth / videoRect.width;
        const scaleY = videoEl.videoHeight / videoRect.height;

        const sx = (overlayRect.left - videoRect.left) * scaleX;
        const sy = (overlayRect.top - videoRect.top) * scaleY;
        const sw = overlayRect.width * scaleX;
        const sh = overlayRect.height * scaleY;

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, targetW, targetH);

        return await compressImage(canvas, settings);
    }

    async function compressImage(canvas, settings) {
        if (settings.compressionMode === 'original') {
            return new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.95));
        }

        let quality = 0.9;
        let blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
        
        if (!blob) return null;
        
        let sizeKB = blob.size / 1024;

        const minKB = settings.minFileSizeKB;
        const maxKB = settings.maxFileSizeKB;

        while (sizeKB > maxKB && quality > 0.1) {
            quality -= 0.05;
            blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
            sizeKB = blob.size / 1024;
        }

        if (sizeKB < minKB) {
            quality = 1.0;
            blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
        }

        return blob;
    }

    function stop() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    }

    return { start, capture, stop };
})();