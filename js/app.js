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
            setupView: document.getElementById('setup-view'),
            mainView: document.getElementById('main-view'),
            
            btnImport: document.getElementById('btn-import'),
            excelInput: document.getElementById('excel-input'),
            importStatus: document.getElementById('import-status'),
            btnHowToPrepare: document.getElementById('btn-how-to-prepare'),
            
            searchInput: document.getElementById('search-input'),
            btnSearch: document.getElementById('btn-search'),
            studentInfoCard: document.getElementById('student-info-card'),
            infoName: document.getElementById('info-name'),
            infoMeta: document.getElementById('info-meta'),
            infoStatus: document.getElementById('info-status'),
            btnSnap: document.getElementById('btn-snap'),
            studentNotFound: document.getElementById('student-not-found'),
            btnAddNew: document.getElementById('btn-add-new'),
            
            cameraVideo: document.getElementById('camera-video'),
            cameraOverlay: document.getElementById('camera-overlay'),
            btnFinish: document.getElementById('btn-finish'),
            snapFeedback: document.getElementById('snap-feedback'),

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

            modalNewStudent: document.getElementById('modal-new-student'),
            newStudentId: document.getElementById('new-student-id'),
            newStudentName: document.getElementById('new-student-name'),
            newStudentSurname: document.getElementById('new-student-surname'),
            newStudentClass: document.getElementById('new-student-class'),
            btnSaveNewStudent: document.getElementById('btn-save-new-student'),
            btnCloseNewStudent: document.querySelectorAll('.btn-close-new-student'),

            modalHelp: document.getElementById('modal-help'),
            btnHelp: document.getElementById('btn-help'),
            btnCloseHelp: document.querySelectorAll('.btn-close-help'),
            btnDownloadTemplate: document.getElementById('btn-download-template')
        };
    }

    function bindEvents() {
        elements.btnImport.addEventListener('click', () => elements.excelInput.click());
        elements.excelInput.addEventListener('change', handleFileSelect);

        elements.btnSearch.addEventListener('click', handleSearch);
        elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
        elements.searchInput.addEventListener('input', () => {
            hideAllCards();
        });

        elements.btnSnap.addEventListener('click', handleSnap);

        elements.btnAddNew.addEventListener('click', openNewStudentModal);
        elements.btnSaveNewStudent.addEventListener('click', saveNewStudent);
        elements.btnCloseNewStudent.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.modalNewStudent.classList.add('hidden');
                elements.searchInput.focus();
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !elements.mainView.classList.contains('hidden')) {
                if (document.activeElement !== elements.searchInput && !elements.btnSnap.disabled) {
                    e.preventDefault();
                    handleSnap();
                }
            }
        });

        elements.btnFinish.addEventListener('click', finishSession);

        elements.btnSettings.addEventListener('click', () => elements.modalSettings.classList.remove('hidden'));
        elements.btnCloseSettings.addEventListener('click', () => elements.modalSettings.classList.add('hidden'));
        elements.btnCancelSettings.addEventListener('click', () => elements.modalSettings.classList.add('hidden'));
        elements.btnSaveSettings.addEventListener('click', saveSettings);
        elements.compressionModeRadios.forEach(r => r.addEventListener('change', updateCompressionRangeVisibility));

        elements.btnHelp.addEventListener('click', openHelpModal);
        elements.btnHowToPrepare.addEventListener('click', openHelpModal);
        elements.btnCloseHelp.forEach(btn => {
            btn.addEventListener('click', () => elements.modalHelp.classList.add('hidden'));
        });
        elements.btnDownloadTemplate.addEventListener('click', downloadTemplate);
    }

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

    function hideAllCards() {
        elements.studentInfoCard.classList.add('hidden');
        elements.studentNotFound.classList.add('hidden');
        elements.btnSnap.disabled = true;
        currentStudent = null;
    }

    // KRİTİK DÜZELTME: setTimeout kaldırıldı!
    // Kullanıcı etkileşimi (user gesture) korunmalı ki showDirectoryPicker çalışsın
    async function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        elements.importStatus.textContent = "Dosya işleniyor...";
        elements.importStatus.className = "status-text";

        const result = await ExcelHandler.processFile(file);
        if (result.success) {
            elements.importStatus.textContent = `Başarılı! ${result.count} öğrenci aktarıldı.`;
            elements.importStatus.classList.add('success');
            
            // HEMEN BAŞLAT - setTimeout YOK! (user gesture korunuyor)
            await startMainSession();
        } else {
            elements.importStatus.textContent = `Hata: ${result.error}`;
            elements.importStatus.classList.add('error');
        }
        elements.excelInput.value = '';
    }

    async function startMainSession() {
        elements.setupView.classList.add('hidden');
        elements.mainView.classList.remove('hidden');

        // ÖNCE DOSYA SİSTEMİNİ BAŞLAT (klasör seçme penceresi açılır)
        // Bu hala kullanıcı etkileşimi içinde sayılır
        await FileSystem.init();

        if (FileSystem.isUsingZip()) {
            elements.btnFinish.classList.remove('hidden');
            elements.btnFinish.textContent = 'Oturumu Bitir ve ZIP İndir';
        }

        // SONRA KAMERAYI AÇ
        await Camera.start(elements.cameraVideo, elements.cameraOverlay);
        elements.searchInput.focus();
    }

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

    async function handleSnap() {
        if (!currentStudent || elements.btnSnap.disabled) return;

        elements.btnSnap.textContent = "İşleniyor...";
        elements.btnSnap.disabled = true;

        try {
            const blob = await Camera.capture();

            if (!blob) {
                throw new Error("Fotoğraf oluşturulamadı. Lütfen tekrar deneyin.");
            }

            const result = await FileSystem.saveFile(blob, currentStudent);
            
            currentStudent.status = 'done';
            await Storage.saveStudent(currentStudent);

            elements.infoStatus.textContent = 'Fotoğrafı Çekildi';
            elements.infoStatus.classList.add('done');
            elements.btnSnap.textContent = 'Tekrar Çek';

            snapCount++;

            showFeedback(result);

            setTimeout(() => {
                elements.searchInput.value = '';
                hideAllCards();
                elements.searchInput.focus();
            }, 800);

        } catch (err) {
            console.error("Çekim hatası:", err);
            alert("Fotoğraf kaydedilirken bir hata oluştu: " + err.message);
            elements.btnSnap.disabled = false;
            elements.btnSnap.textContent = 'Fotoğraf Çek (Boşluk)';
        }
    }

    function showFeedback(result) {
        let msg = '';
        if (result.method === 'direct') {
            msg = `✅ Kaydedildi! (${snapCount} fotoğraf)`;
        } else {
            msg = `📦 ZIP'e eklendi! (${snapCount} fotoğraf) — İndirmek için "Oturumu Bitir" butonuna basın.`;
        }

        if (elements.snapFeedback) {
            elements.snapFeedback.textContent = msg;
            elements.snapFeedback.classList.remove('hidden');
            setTimeout(() => {
                elements.snapFeedback.classList.add('hidden');
            }, 3000);
        }
    }

    function openNewStudentModal() {
        const number = elements.searchInput.value.trim();
        elements.newStudentId.value = number;
        elements.newStudentId.readOnly = false;
        elements.newStudentName.value = '';
        elements.newStudentSurname.value = '';
        elements.newStudentClass.value = '';
        elements.modalNewStudent.classList.remove('hidden');
        elements.newStudentName.focus();
    }

    async function saveNewStudent() {
        const number = elements.newStudentId.value;
        const name = elements.newStudentName.value.trim();
        const surname = elements.newStudentSurname.value.trim();
        const studentClass = elements.newStudentClass.value.trim();

        if (!name || !surname || !studentClass) {
            alert('Lütfen tüm alanları doldurun.');
            return;
        }

        const newStudent = { number, name, surname, class: studentClass, status: 'pending' };
        await Storage.saveStudent(newStudent);
        elements.modalNewStudent.classList.add('hidden');
        
        elements.searchInput.value = number;
        await handleSearch();
    }

    function finishSession() {
        Camera.stop();

        if (FileSystem.isUsingZip()) {
            FileSystem.downloadZip();
            elements.btnFinish.textContent = "ZIP İndirildi!";
        } else {
            elements.btnFinish.textContent = "Oturum Bitti";
        }

        elements.btnFinish.disabled = true;
        alert(`Oturum tamamlandı! Toplam ${snapCount} fotoğraf işlendi.`);
    }

    function loadSettingsToUI() {
        const s = Settings.getAll();
        elements.inputWidth.value = s.photoWidth;
        elements.inputHeight.value = s.photoHeight;
        elements.inputMinKB.value = s.minFileSizeKB;
        elements.inputMaxKB.value = s.maxFileSizeKB;
        elements.compressionModeRadios.forEach(r => r.checked = (r.value === s.compressionMode));
        updateCompressionRangeVisibility();
    }

    function updateCompressionRangeVisibility() {
        const mode = document.querySelector('input[name="compression-mode"]:checked').value;
        elements.compressionRangeInputs.forEach(el => el.style.display = mode === 'range' ? 'flex' : 'none');
    }

    function saveSettings() {
        const newSettings = {
            photoWidth: parseInt(elements.inputWidth.value) || 133,
            photoHeight: parseInt(elements.inputHeight.value) || 171,
            compressionMode: document.querySelector('input[name="compression-mode"]:checked').value,
            minFileSizeKB: parseInt(elements.inputMinKB.value) || 20,
            maxFileSizeKB: parseInt(elements.inputMaxKB.value) || 150
        };
        Settings.save(newSettings);
        elements.modalSettings.classList.add('hidden');
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);