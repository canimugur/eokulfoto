const FileSystem = (function() {
    let dirHandle = null;
    let zip = null;

    // iOS tespiti (Safari'de showDirectoryPicker desteklenmez)
    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    // File System Access API destek kontrolü
    function isFileSystemAccessSupported() {
        return 'showDirectoryPicker' in window && !isIOS();
    }

    async function init() {
        // Sadece desteklenen tarayıcılarda klasör seçimi dene
        if (isFileSystemAccessSupported()) {
            try {
                console.log("Klasör seçme penceresi açılıyor...");
                dirHandle = await window.showDirectoryPicker({ 
                    mode: 'readwrite',
                    startIn: 'downloads' // Varsayılan olarak İndirilenler klasörünü aç
                });
                console.log("Klasör seçildi:", dirHandle.name);
            } catch (e) {
                console.log("Klasör seçimi iptal edildi veya hata:", e.message);
                dirHandle = null;
            }
        } else {
            console.log("File System Access API desteklenmiyor. ZIP moduna geçiliyor.");
        }

        // Klasör seçilemediyse ZIP modu
        if (!dirHandle) {
            zip = new JSZip();
            console.log("ZIP modu aktif");
        }
    }

    async function saveFile(blob, student) {
        const fileName = `${student.number}.jpg`;

        if (dirHandle) {
            try {
                const root = await dirHandle.getDirectoryHandle('Vesikaliklar', { create: true });
                const classDir = await root.getDirectoryHandle(student.class, { create: true });
                const fileHandle = await classDir.getFileHandle(fileName, { create: true });
                
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                return { success: true, method: 'direct' };
            } catch (e) {
                console.error("Dosya yazma hatası:", e);
                return saveToZip(blob, fileName, student.class);
            }
        } else {
            return saveToZip(blob, fileName, student.class);
        }
    }

    function saveToZip(blob, fileName, className) {
        if (!zip) zip = new JSZip();
        const folderName = `Vesikaliklar/${className}`;
        zip.folder(folderName).file(fileName, blob);
        return { success: true, method: 'zip' };
    }

    function downloadZip() {
        if (zip && Object.keys(zip.files).length > 0) {
            zip.generateAsync({ type: 'blob' }).then(function(content) {
                saveAs(content, "Vesikaliklar.zip");
            });
        }
    }

    function isUsingZip() {
        return !dirHandle;
    }

    return { init, saveFile, downloadZip, isUsingZip };
})();