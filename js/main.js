document.addEventListener('DOMContentLoaded', () => {
    const fileList = document.getElementById('file-list');
    const createFileBtn = document.getElementById('create-file');
    const createFolderBtn = document.getElementById('create-folder');
    const uploadFileBtn = document.getElementById('upload-file');
    const editorElement = document.getElementById('editor');
    const currentFileElement = document.getElementById('current-file');
    const runCodeBtn = document.getElementById('run-code');
    const uploadInput = document.createElement('input');
    const exportFileBtn = document.getElementById('export-file');
    const importFileBtn = document.getElementById('import-file');

    uploadInput.type = 'file';
    uploadInput.multiple = true;
    uploadInput.accept = '.html,.css,.js,.py,.zip';
    document.body.appendChild(uploadInput);

    let fileSystem = {}; // Key: filePath, Value: { content, type }

    function createCustomPopup(content, onClose) {
        const popup = document.createElement('div');
        popup.className = 'custom-popup';
        popup.innerHTML = `
            <div class="popup-content">
                ${content}
                <button class="popup-close">Close</button>
            </div>
        `;
        document.body.appendChild(popup);

        popup.querySelector('.popup-close').addEventListener('click', () => {
            document.body.removeChild(popup);
            if (onClose) onClose();
        });

        return popup;
    }

    function saveFileSystem() {
        localStorage.setItem('fileSystem', JSON.stringify(fileSystem));
    }

    function loadFileSystem() {
        const savedFileSystem = localStorage.getItem('fileSystem');
        if (savedFileSystem) {
            fileSystem = JSON.parse(savedFileSystem);
            renderFileList();
        }
    }

    function renderFileList() {
        fileList.innerHTML = '';
        Object.keys(fileSystem).forEach(path => {
            const fileItem = document.createElement('li');
            fileItem.textContent = path;
            fileItem.className = 'file-item';
            fileItem.draggable = true;
            
            if (fileSystem[path].type === 'folder') {
                fileItem.textContent = '📂 ' + path;
                fileItem.classList.add('folder');
                const folderContent = document.createElement('ul');
                folderContent.className = 'folder-content';
                fileItem.appendChild(folderContent);
            }
            
            fileItem.addEventListener('dragstart', (event) => {
                event.dataTransfer.setData('text/plain', path);
            });

            fileItem.addEventListener('drop', (event) => {
                event.preventDefault();
                const targetPath = event.target.textContent.trim().replace('📂 ', '');
                const draggedPath = event.dataTransfer.getData('text/plain');
                
                if (fileSystem[draggedPath] && fileSystem[targetPath] && fileSystem[targetPath].type === 'folder' && targetPath !== draggedPath) {
                    moveFile(draggedPath, targetPath + '/' + draggedPath.split('/').pop());
                }
            });

            fileItem.addEventListener('dragover', (event) => {
                event.preventDefault();
            });

            fileItem.addEventListener('click', () => openFile(path));
            fileList.appendChild(fileItem);
        });
    }

    function openFile(path) {
        const file = fileSystem[path];
        if (file) {
            currentFileElement.textContent = `Editing: ${path}`;
            editor.setValue(file.content);
            document.querySelectorAll('.file-item').forEach(item => item.classList.remove('selected'));
            const selectedItem = Array.from(fileList.children).find(child => child.textContent.replace('📂 ', '') === path);
            if (selectedItem) selectedItem.classList.add('selected');
        }
    }

    function createFile(path, content = '') {
        if (!fileSystem[path]) {
            fileSystem[path] = { content, type: 'file' };
            saveFileSystem();
            renderFileList();
        } else {
            createCustomPopup(`
                <p>File already exists. Please rename the file.</p>
                <button class="popup-close">Close</button>
            `);
        }
    }

    function createFolder(path) {
        if (!fileSystem[path]) {
            fileSystem[path] = { content: {}, type: 'folder' };
            saveFileSystem();
            renderFileList();
        } else {
            createCustomPopup(`
                <p>Folder already exists.</p>
                <button class="popup-close">Close</button>
            `);
        }
    }

    function deleteFile(path) {
        delete fileSystem[path];
        saveFileSystem();
        renderFileList();
        currentFileElement.textContent = 'Please select a file to get started, Or create one';
        editor.setValue('');
    }

    function renameFile(oldPath, newPath) {
        if (fileSystem[oldPath] && !fileSystem[newPath]) {
            fileSystem[newPath] = fileSystem[oldPath];
            delete fileSystem[oldPath];
            saveFileSystem();
            renderFileList();
        }
    }

    function moveFile(oldPath, newPath) {
        if (fileSystem[oldPath]) {
            fileSystem[newPath] = fileSystem[oldPath];
            delete fileSystem[oldPath];
            saveFileSystem();
            renderFileList();
        }
    }

    function handleRunCode() {
        const content = editor.getValue(); 
        const currentPath = currentFileElement.textContent.replace('Editing: ', '');
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    }

    function handleFileUpload(files) {
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const path = file.name;
                if (fileSystem[path]) {
                    createCustomPopup(`
                        <p>File already exists. Please rename the file.</p>
                        <button class="popup-close">Close</button>
                    `);
                } else {
                    fileSystem[path] = { content: event.target.result, type: 'file' };
                    saveFileSystem();
                    renderFileList();
                }
            };
            reader.readAsText(file);
        });
    }

    function exportFileSystem() {
        const blob = new Blob([JSON.stringify(fileSystem)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fileSystem.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function importFileSystem(file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                fileSystem = JSON.parse(event.target.result);
                saveFileSystem();
                renderFileList();
            } catch (e) {
                createCustomPopup(`
                    <p>Error importing file. Please ensure it's a valid JSON file.</p>
                    <button class="popup-close">Close</button>
                `);
            }
        };
        reader.readAsText(file);
    }

    exportFileBtn.addEventListener('click', exportFileSystem);

    importFileBtn.addEventListener('click', () => {
        uploadInput.accept = '.json';
        uploadInput.onchange = () => {
            const file = uploadInput.files[0];
            if (file) {
                importFileSystem(file);
            }
        };
        uploadInput.click();
    });

    uploadFileBtn.addEventListener('click', () => {
        uploadInput.accept = '.html,.css,.js,.py,.zip';
        uploadInput.click();
    });

    uploadInput.addEventListener('change', (event) => handleFileUpload(event.target.files));

    createFileBtn.addEventListener('click', () => {
        const filePath = prompt('Enter the file path (e.g., index.html):');
        if (filePath) {
            createFile(filePath);
        }
    });

    createFolderBtn.addEventListener('click', () => {
        const folderPath = prompt('Enter the folder path (e.g., folder/):');
        if (folderPath) {
            createFolder(folderPath);
        }
    });

    runCodeBtn.addEventListener('click', handleRunCode);

    loadFileSystem();

    // Monaco Editor setup
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.0/min/vs' } });
    require(['vs/editor/editor.main'], function() {
        window.editor = monaco.editor.create(editorElement, {
            value: '',
            language: 'html',
            language: 'css',

            theme: 'vs-dark'
        });

        editor.onDidChangeModelContent(() => {
            const currentPath = currentFileElement.textContent.replace('Editing: ', '');
            if (fileSystem[currentPath]) {
                fileSystem[currentPath].content = editor.getValue();
                saveFileSystem();
            }
        });
    });

    // Custom Popup for unsaved changes warning
    window.addEventListener('beforeunload', (event) => {
        if (Object.keys(fileSystem).length) {
            event.preventDefault();
            event.returnValue = ''; // Show default browser message
            
            // Create custom popup
            const savePrompt = createCustomPopup(`
                <p>You have unsaved changes. Would you like to save them?</p>
                <button id="save-file">Save and Close</button>
                <button id="discard-changes">Discard</button>
            `, () => {
                document.getElementById('save-file').addEventListener('click', () => {
                    exportFileSystem();
                    window.close();
                });
                document.getElementById('discard-changes').addEventListener('click', () => {
                    window.close();
                });
            });
        }
    });
});



