const App = (function() {
    let elements = {};
    let currentStudent = null;
    let snapCount = 0;

    async function init() {
        await Storage.init();
        cacheDOMElements();
        bindEvents();
        loadSettingsToUI();
    }

    function cacheDOMElements() {
        elements = {
            // Views
            setupView: document.getElementById('setup-view'),
            mainView: document.getElementById('main-view'),
            
            // Setup
            btnImport: document.getElementById('btn-import'),
            excelInput: document.getElementById('excel-input'),
            importStatus: document.getElementById('import-status'),
            btnHowToPrepare: document.getElementById('btn-how-to-prepare'),
            
            // Main View - Search
            searchInput: document.getElementById('search-input'),
            btnSearch: document.getElementById('btn-search'),
            studentInfoCard: document.getElementById('student-info-card'),
            infoName: document.getElementById('info-name'),
            infoMeta: document.getElementById('info-meta'),
            infoStatus: document.getElementById('info-status'),
            btnSnap: document.getElementById('btn-snap'),
            studentNotFound: document.getElementById('student-not-found'),
            btnAddNew: document.getElementById('btn-add-new'),
            
            // Main View - Camera
            cameraVideo: document.getElementById('camera-video'),
            cameraOverlay: document.getElementById('camera-overlay'),
            btnFinish: document.getElementById('btn-finish'),
            snapFeedback: document.getElementById('snap-feedback'),

            // Settings Modal
            modalSettings: document.getElementById('modal-settings'),
            btnSettings: document.getElementById('btn-settings'),
            btnCloseSettings: document.getElementById('btn-close-settings'),
            btnSaveSettings: document.getElementById('btn-save-settings'),
            btnCancelSettings: document.getElementById('btn-cancel-settings'),
            inputWidth: document.getElementById('input-width'),
            inputHeight: document.getElementById('input-height'),
            inputMinKB: document.getElementById('input-min-kb'),
            inputMaxKB: document.getElementById('input-max-kb'),
            compressionRangeInputs: document.querySelectorAll('.compression-range'),
            compressionModeRadios: document.querySelectorAll('input[name="compression-mode"]'),

            // New Student Modal
            modalNewStudent: document.getElementById('modal-new-student'),
            newStudentId: document.getElementById('new-student-id'),
            newStudentName: document.getElementById('new-student-name'),
            newStudentSurname: document.getElementById('new-student-surname'),
            newStudentClass: document.getElementById('new-student-class'),
            btnSaveNewStudent: document.getElementById('btn-save-new-student'),
            btnCloseNewStudent: document.querySelectorAll('.btn-close-new-student'),

            // Help Modal (YENİ)
            modalHelp: document.getElementById('modal-help'),
            btnHelp: document.getElementById('btn-help'),
            btnCloseHelp: document.querySelectorAll('.btn-close-help'),
            btnDownloadTemplate: document.getElementById('btn-download-template')
        };
    }

    function bindEvents() {
        // Import
        elements.btnImport.addEventListener('click', () => elements.excelInput.click());
        elements.excelInput.addEventListener('change', handleFileSelect);

        // Search
        elements.btnSearch.addEventListener('click', handleSearch);
        elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
        elements.searchInput.addEventListener('input', () => {
            hideAllCards();
        });

        // Snap
        elements.btnSnap.addEventListener('click', handleSnap);

        // Add New Student
        elements.btnAddNew.addEventListener('click', openNewStudentModal);
        elements.btnSaveNewStudent.addEventListener('click', saveNewStudent);
        elements.btnCloseNewStudent.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.modalNewStudent.classList.add('hidden');
                elements.searchInput.focus();
            });
        });

        // Keyboard Shortcut (Space to snap)
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !elements.mainView.classList.contains('hidden')) {
                if (document.activeElement !== elements.searchInput && !elements.btnSnap.disabled) {
                    e.preventDefault();
                    handleSnap();
                }
            }
        });

        // Finish Session
        elements.btnFinish.addEventListener('click', finishSession);

        // Settings
        elements.btnSettings.addEventListener('click', () => elements.modalSettings.classList.remove('hidden'));
        elements.btnCloseSettings.addEventListener('click', () => elements.modalSettings.classList.add('hidden'));
        elements.btnCancelSettings.addEventListener('click', () => elements.modalSettings.classList.add('hidden'));
        elements.btnSaveSettings.addEventListener('click', saveSettings);
        elements.compressionModeRadios.forEach(r => r.addEventListener('change', updateCompressionRangeVisibility));

        // Help (YENİ)
        elements.btnHelp.addEventListener('click', openHelpModal);
        elements.btnHowToPrepare.addEventListener('click', openHelpModal);
        elements.btnCloseHelp.forEach(btn => {
            btn.addEventListener('click', () => elements.modalHelp.classList.add('hidden'));
        });
        elements.btnDownloadTemplate.addEventListener('click', downloadTemplate);
    }

    // --- HELP (YENİ) ---
    function openHelpModal() {
        elements.modalHelp.classList.remove('hidden');
    }

    function downloadTemplate() {
        const csvContent = `Numara,Ad,Soyad,Sınıf
101,Ahmet,Yılmaz,9-A
102,Ayşe,Demir,9-A
103,Mehmet,Kaya,10-B
104,Fatma,Çelik,10-B
105,Ali,Veli,11-C`;

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ogrenci_sablonu.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // --- UTILS ---
    function hideAllCards() {
        elements.studentInfoCard.classList.add('hidden');
        elements.studentNotFound.classList.add('hidden');
        elements.btnSnap.disabled = true;
        currentStudent = null;
    }

    // --- EXCEL IMPORT ---
    async function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        elements.importStatus.textContent = "Dosya işleniyor...";
        elements.importStatus.className = "status-text";

        const result = await ExcelHandler.processFile(file);
        if (result.success) {
            elements.importStatus.textContent = `Başarılı! ${result.count} öğrenci aktarıldı. Kamera başlatılıyor...`;
            elements.importStatus.classList.add('success');
            setTimeout(startMainSession, 1000);
        } else {
            elements.importStatus.textContent = `Hata: ${result.error}`;
            elements.importStatus.classList.add('error');
        }
        elements.excelInput.value = '';
    }

    async function startMainSession() {
        elements.setupView.classList.add('hidden');
        elements.mainView.classList.remove('hidden');

        // Dosya sistemini başlat
        await FileSystem.init();

        // ZIP modundaysa "Oturumu Bitir" butonunu hemen göster
        if (FileSystem.isUsingZip()) {
            elements.btnFinish.classList.remove('hidden');
            elements.btnFinish.textContent = 'Oturumu Bitir ve ZIP İndir';
        }

        // Kamerayı aç
        await Camera.start(elements.cameraVideo, elements.cameraOverlay);
        elements.searchInput.focus();
    }

    // --- SEARCH ---
    async function handleSearch() {
        const query = elements.searchInput.value.trim();
        
        if (!query) {
            hideAllCards();
            return;
        }

        const student = await Storage.getStudent(query);
        
        hideAllCards();

        if (student) {
            currentStudent = student;
            elements.infoName.textContent = `${student.name} ${student.surname}`;
            elements.infoMeta.textContent = `Sınıf: ${student.class} | No: ${student.number}`;
            
            if (student.status === 'done') {
                elements.infoStatus.textContent = 'Fotoğrafı Çekildi';
                elements.infoStatus.classList.add('done');
                elements.btnSnap.textContent = 'Tekrar Çek';
            } else {
                elements.infoStatus.textContent = 'Bekliyor';
                elements.infoStatus.classList.remove('done');
                elements.btnSnap.textContent = 'Fotoğraf Çek (Boşluk)';
            }
            
            elements.studentInfoCard.classList.remove('hidden');
            elements.btnSnap.disabled = false;
            elements.btnSnap.focus();
        } else {
            elements.studentNotFound.classList.remove('hidden');
            elements.btnAddNew.focus();
        }
    }

    // --- SNAP ---
    async function handleSnap() {
        if (!currentStudent || elements.btnSnap.disabled) return;

        elements.btnSnap.textContent = "İşleniyor...";
        elements.btnSnap.disabled = true;

        try {
            // 1. Fotoğrafı çek, kırp ve sıkıştır
            const blob = await Camera.capture();

            if (!blob) {
                throw new Error("Fotoğraf oluşturulamadı. Lütfen tekrar deneyin