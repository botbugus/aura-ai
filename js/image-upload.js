export class ImageUploadManager {
    constructor() {
        this.uploadButton = document.getElementById('upload-button');
        this.fileInput = document.getElementById('file-input');
        this.previewContainer = document.getElementById('image-preview-container');
        this.previewImg = document.getElementById('image-preview');
        this.previewName = document.getElementById('image-preview-name');
        this.removeBtn = document.getElementById('image-preview-remove');
        this.uploadStatus = document.getElementById('upload-status');
        
        this.currentFile = null;
        this.currentDataUrl = null;

        this.init();
    }

    init() {
        this.uploadButton.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFile(file);
            }
        });

        this.removeBtn.addEventListener('click', () => {
            this.clearPreview();
        });

        // Drag and drop support
        const inputWrapper = document.getElementById('input-wrapper');
        inputWrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            inputWrapper.style.borderColor = 'var(--ox-accent)';
        });

        inputWrapper.addEventListener('dragleave', () => {
            inputWrapper.style.borderColor = '';
        });

        inputWrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            inputWrapper.style.borderColor = '';
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                this.handleFile(files[0]);
            }
        });
    }

    handleFile(file) {
        // Validasi ukuran (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showStatus('Ukuran gambar maksimal 10MB.', 'error');
            return;
        }

        this.currentFile = file;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentDataUrl = e.target.result;
            this.previewImg.src = this.currentDataUrl;
            this.previewName.textContent = file.name.length > 30 
                ? file.name.substring(0, 27) + '...' 
                : file.name;
            this.previewContainer.classList.remove('hidden');
            this.showStatus(`Gambar terupload: ${file.name}`, 'success');
        };
        reader.readAsDataURL(file);
    }

    clearPreview() {
        this.currentFile = null;
        this.currentDataUrl = null;
        this.previewImg.src = '';
        this.previewName.textContent = '';
        this.previewContainer.classList.add('hidden');
        this.fileInput.value = '';
        this.showStatus('');
    }

    getImageData() {
        if (this.currentFile && this.currentDataUrl) {
            return {
                file: this.currentFile,
                dataUrl: this.currentDataUrl,
                name: this.currentFile.name,
                size: this.currentFile.size,
                type: this.currentFile.type
            };
        }
        return null;
    }

    hasImage() {
        return this.currentFile !== null && this.currentDataUrl !== null;
    }

    showStatus(message, type = 'info') {
        const el = this.uploadStatus;
        if (!message) {
            el.textContent = '';
            el.style.color = '';
            return;
        }
        el.textContent = message;
        el.style.color = type === 'error' ? 'var(--ox-danger)' : 'var(--ox-success)';
        
        // Auto clear after 5 seconds
        if (type === 'error') {
            setTimeout(() => {
                if (el.textContent === message) {
                    el.textContent = '';
                }
            }, 5000);
        }
    }
}
