const ExcelHandler = (function() {
    async function processFile(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            const ext = file.name.split('.').pop().toLowerCase();

            if (ext === 'csv') {
                reader.readAsText(file, 'UTF-8');
            } else {
                reader.readAsArrayBuffer(file);
            }

            reader.onload = async (e) => {
                try {
                    let workbook;
                    if (ext === 'csv') {
                        workbook = XLSX.read(e.target.result, { type: 'string', codepage: 65001 });
                    } else {
                        const data = new Uint8Array(e.target.result);
                        workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
                    }

                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
                    
                    if (jsonData.length < 2) throw new Error("Dosya boş veya geçersiz.");

                    const headers = jsonData[0].map(h => String(h).trim());
                    const mapping = mapHeaders(headers);
                    let successCount = 0;

                    for (let i = 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || row.length === 0) continue;

                        const student = {
                            number: String(row[mapping.number] || '').trim(),
                            name: String(row[mapping.name] || '').trim(),
                            surname: String(row[mapping.surname] || '').trim(),
                            class: String(row[mapping.class] || '').trim(),
                            status: 'pending'
                        };

                        if (student.number && student.name) {
                            await Storage.saveStudent(student);
                            successCount++;
                        }
                    }
                    resolve({ success: true, count: successCount });
                } catch (error) {
                    resolve({ success: false, error: error.message });
                }
            };
            reader.onerror = () => resolve({ success: false, error: "Dosya okunamadı." });
        });
    }

    function mapHeaders(headers) {
        const map = { number: 0, name: 1, surname: 2, class: 3 };

        headers.forEach((header, index) => {
            if (!header) return;
            
            const h = header.toLocaleLowerCase('tr-TR');

            if (h.includes('numara') || h.includes('no') || h.includes('tc') || h.includes('kimlik') || h.includes('öğrenci no')) {
                map.number = index;
            } 
            else if ((h.includes('ad') || h.includes('isim')) && !h.includes('soyad') && !h.includes('soyisim')) {
                map.name = index;
            } 
            else if (h.includes('soyad') || h.includes('soyisim')) {
                map.surname = index;
            } 
            else if (h.includes('sınıf') || h.includes('sinif') || h.includes('şube') || h.includes('sube') || h.includes('class')) {
                map.class = index;
            }
        });

        return map;
    }

    return { processFile };
})();