const Storage = (function() {
    const DB_NAME = 'SchoolPhotoDB';
    const STORE_NAME = 'students';
    let db = null;

    function init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = (event) => {
                const database = event.target.result;
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'number' });
                    objectStore.createIndex('class', 'class', { unique: false });
                    objectStore.createIndex('status', 'status', { unique: false });
                }
            };
            request.onsuccess = (event) => {
                db = event.target.result;
                resolve(db);
            };
            request.onerror = (event) => reject(event.target.error);
        });
    }

    function getTransaction(mode = 'readonly') {
        return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
    }

    function saveStudent(student) {
        return new Promise((resolve, reject) => {
            const request = getTransaction('readwrite').put(student);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    function getStudent(number) {
        return new Promise((resolve, reject) => {
            const request = getTransaction('readonly').get(number);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    function getAllStudents() {
        return new Promise((resolve, reject) => {
            const request = getTransaction('readonly').getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    return { init, saveStudent, getStudent, getAllStudents };
})();