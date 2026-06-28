// QuickTag Images - Main Application JavaScript

// Language Configuration
const LANGUAGES = {
    'en': { 
        code: 'en', 
        name: 'English', 
        nativeName: 'English',
        promptInstruction: '' // Empty for English (default behavior)
    },
    'fr': { 
        code: 'fr', 
        name: 'French', 
        nativeName: 'Français',
        promptInstruction: 'Respond entirely in French. Use only French words for the filename and description.'
    },
    'de': { 
        code: 'de', 
        name: 'German', 
        nativeName: 'Deutsch',
        promptInstruction: 'Respond entirely in German. Use only German words for the filename and description.'
    },
    'es': { 
        code: 'es', 
        name: 'Spanish', 
        nativeName: 'Español',
        promptInstruction: 'Respond entirely in Spanish. Use only Spanish words for the filename and description.'
    },
    'hi': { 
        code: 'hi', 
        name: 'Hindi', 
        nativeName: 'हिन्दी',
        promptInstruction: 'Respond entirely in Hindi. Use Hindi script (देवनागरी) for both FILENAME and DESCRIPTION. For filename use underscores between words (e.g., "सुंदर_तस्वीर").'
    }
};

// LLM Configuration
const LLM_CONFIG = {
    baseUrl: localStorage.getItem('llmBaseUrl') || "http://127.0.0.1:1234",
    selectedModel: localStorage.getItem('llmSelectedModel') || "gpt-4-vision-preview",
    endpoints: {
        models: "/v1/models",
        chat: "/v1/chat/completions",
        embeddings: "/v1/embeddings"
    },
    streaming: true,
    timeout: 30000,
    maxRetries: 3
};

// Application State
const appState = {
    selectedFolders: [],
    allImages: [],
    selectedImages: new Set(),
    processedImages: [],
    isProcessing: false,
    shouldStop: false,
    llmConnected: false,
    processingStartTime: null,
    processingEndTime: null,
    descriptiveMode: false, // For longer, keyword-rich filenames
    selectedLanguage: 'en', // Default to English for backwards compatibility
    imageOptimizer: null, // Performance optimizer instance
    useOptimizer: false // Auto-enabled for large image sets
};

// DOM Elements
const elements = {
    folderInput: document.getElementById('folderInput'),
    addFolderBtn: document.getElementById('addFolderBtn'),
    selectedFolders: document.getElementById('selectedFolders'),
    folderStats: document.getElementById('folderStats'),
    totalFolders: document.getElementById('totalFolders'),
    totalImages: document.getElementById('totalImages'),
    imagePreview: document.getElementById('imagePreview'),
    imageGrid: document.getElementById('imageGrid'),
    selectAllBtn: document.getElementById('selectAllBtn'),
    deselectAllBtn: document.getElementById('deselectAllBtn'),
    processBtn: document.getElementById('processBtn'),
    currentProcessing: document.getElementById('currentProcessing'),
    currentThumbnail: document.getElementById('currentThumbnail'),
    statusText: document.getElementById('statusText'),
    generatedName: document.getElementById('generatedName'),
    generatedMetadata: document.getElementById('generatedMetadata'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    timelineSection: document.getElementById('timelineSection'),
    timelineItems: document.getElementById('timelineItems'),
    resultsModal: document.getElementById('resultsModal'),
    resultsSummary: document.getElementById('resultsSummary'),
    closeModal: document.getElementById('closeModal'),
    downloadResults: document.getElementById('downloadResults'),
    exportLog: document.getElementById('exportLog'),
    processMore: document.getElementById('processMore'),
    llmStatus: document.getElementById('llmStatus'),
    statusIndicator: document.getElementById('statusIndicator'),
    statusLabel: document.getElementById('statusLabel'),
    stopProcessingBtn: document.getElementById('stopProcessingBtn'),
    timelineControls: document.getElementById('timelineControls'),
    timelineDownloadBtn: document.getElementById('timelineDownloadBtn'),
    timelineExportBtn: document.getElementById('timelineExportBtn'),
    newBatchBtn: document.getElementById('newBatchBtn'),
    descriptiveModeToggle: document.getElementById('descriptiveModeToggle'),
    languageSelector: document.getElementById('languageSelector'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsModal: document.getElementById('closeSettingsModal'),
    llmUrlInput: document.getElementById('llmUrlInput'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
    testConnectionBtn: document.getElementById('testConnectionBtn'),
    connectionStatus: document.getElementById('connectionStatus'),
    llmModelSelect: document.getElementById('llmModelSelect'),
    refreshModelsBtn: document.getElementById('refreshModelsBtn')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    loadUserPreferences();
    initializeEventListeners();
    initializePhase4UX();
    checkLLMConnection();
    initializeOptimizer();
});

// Expose for testing
window.appState = appState;
window.elements = elements;
window.mockLLMResponse = mockLLMResponse;

// Initialize performance optimizer
function initializeOptimizer() {
    if (typeof ImageOptimizer !== 'undefined') {
        appState.imageOptimizer = new ImageOptimizer({
            thumbnailSize: 150,
            batchSize: 50,
            maxConcurrent: 5,
            cacheSize: 200,
            enableIndexedDB: true,
            virtualScrolling: true
        });
        console.log('Image optimizer initialized');
    } else {
        console.warn('ImageOptimizer not loaded - performance optimizations disabled');
    }
}

// Show performance mode indicator
function showPerformanceIndicator() {
    // Check if indicator already exists
    let indicator = document.getElementById('performanceIndicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'performanceIndicator';
        indicator.className = 'performance-mode-badge';
        indicator.innerHTML = `
            <span>⚡</span>
            <span>Performance Mode Active</span>
        `;
        
        // Add to preview header
        const previewHeader = document.querySelector('.preview-header h2');
        if (previewHeader) {
            previewHeader.appendChild(indicator);
        }
    }
    
    // Also show memory usage indicator
    showMemoryUsage();
}

// Hide performance mode indicator
function hidePerformanceIndicator() {
    const indicator = document.getElementById('performanceIndicator');
    if (indicator) {
        indicator.remove();
    }
    hideMemoryUsage();
}

// Show memory usage indicator
function showMemoryUsage() {
    if (!appState.imageOptimizer) return;
    
    let memoryDiv = document.getElementById('memoryUsage');
    if (!memoryDiv) {
        memoryDiv = document.createElement('div');
        memoryDiv.id = 'memoryUsage';
        memoryDiv.className = 'memory-usage';
        document.body.appendChild(memoryDiv);
    }
    
    // Update memory usage periodically
    const updateMemory = () => {
        if (!appState.useOptimizer) return;
        
        const usage = appState.imageOptimizer.getMemoryUsage();
        memoryDiv.innerHTML = `
            <div>Memory: ${usage.mb} MB</div>
            <div>Cached: ${usage.thumbnailCount} thumbnails</div>
            <div class="memory-usage-bar">
                <div class="memory-usage-fill" style="width: ${Math.min(100, (usage.mb / 100) * 100)}%"></div>
            </div>
        `;
        memoryDiv.classList.add('visible');
    };
    
    updateMemory();
    appState.memoryUpdateInterval = setInterval(updateMemory, 2000);
}

// Hide memory usage indicator
function hideMemoryUsage() {
    const memoryDiv = document.getElementById('memoryUsage');
    if (memoryDiv) {
        memoryDiv.classList.remove('visible');
    }
    if (appState.memoryUpdateInterval) {
        clearInterval(appState.memoryUpdateInterval);
        appState.memoryUpdateInterval = null;
    }
}

// User Preferences Management
function loadUserPreferences() {
    const savedPreferences = localStorage.getItem('quicktagPreferences');
    if (savedPreferences) {
        try {
            const preferences = JSON.parse(savedPreferences);
            appState.descriptiveMode = preferences.descriptiveMode || false;
            appState.selectedLanguage = preferences.selectedLanguage || 'en'; // Fallback to English for backwards compatibility
            
            // Update toggle UI
            if (elements.descriptiveModeToggle) {
                elements.descriptiveModeToggle.checked = appState.descriptiveMode;
            }
            
            // Update language selector UI
            if (elements.languageSelector) {
                elements.languageSelector.value = appState.selectedLanguage;
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    }
    
    // Load LLM URL separately (not part of preferences object for backwards compatibility)
    const savedLlmUrl = localStorage.getItem('llmBaseUrl');
    if (savedLlmUrl) {
        LLM_CONFIG.baseUrl = savedLlmUrl;
        // Update the input field if it exists
        if (elements.llmUrlInput) {
            elements.llmUrlInput.value = savedLlmUrl;
        }
    }
}

function saveUserPreferences() {
    const preferences = {
        descriptiveMode: appState.descriptiveMode,
        selectedLanguage: appState.selectedLanguage
    };
    localStorage.setItem('quicktagPreferences', JSON.stringify(preferences));
}

// Event Listeners
function initializeEventListeners() {
    elements.addFolderBtn.addEventListener('click', () => {
        if (!appState.isProcessing) {
            elements.folderInput.click();
        }
    });

    elements.folderInput.addEventListener('change', handleFolderSelection);
    elements.selectAllBtn.addEventListener('click', selectAllImages);
    elements.deselectAllBtn.addEventListener('click', deselectAllImages);
    elements.processBtn.addEventListener('click', processImages);
    elements.stopProcessingBtn.addEventListener('click', stopProcessing);
    elements.closeModal.addEventListener('click', closeResultsModal);
    elements.downloadResults.addEventListener('click', downloadAllResults);
    elements.exportLog.addEventListener('click', exportProcessingLog);
    
    // Timeline buttons
    elements.timelineDownloadBtn?.addEventListener('click', downloadAllResults);
    elements.timelineExportBtn?.addEventListener('click', exportProcessingLog);
    elements.newBatchBtn?.addEventListener('click', () => {
        if (confirm('This will clear all current results and start a new batch. Are you sure you want to continue?')) {
            resetForNewBatch();
        }
    });
    
    // Descriptive mode toggle
    elements.descriptiveModeToggle?.addEventListener('change', (e) => {
        appState.descriptiveMode = e.target.checked;
        saveUserPreferences();
        console.log('Descriptive mode:', appState.descriptiveMode ? 'Enabled' : 'Disabled');
    });
    
    // Language selector
    elements.languageSelector?.addEventListener('change', (e) => {
        appState.selectedLanguage = e.target.value;
        saveUserPreferences();
        console.log('Language selected:', LANGUAGES[appState.selectedLanguage].nativeName);
    });
    
    // Settings Modal Event Listeners
    elements.llmStatus?.addEventListener('click', () => {
        openSettingsModal();
    });
    
    elements.closeSettingsModal?.addEventListener('click', () => {
        closeSettingsModal();
    });
    
    elements.cancelSettingsBtn?.addEventListener('click', () => {
        closeSettingsModal();
    });
    
    elements.saveSettingsBtn?.addEventListener('click', async () => {
        await saveSettings();
    });
    
    elements.testConnectionBtn?.addEventListener('click', async () => {
        await testLlmConnection();
    });
    
    // Model selection event listeners
    elements.llmModelSelect?.addEventListener('change', (e) => {
        // Update the selected model immediately when changed
        LLM_CONFIG.selectedModel = e.target.value;
        console.log('Model selected:', LLM_CONFIG.selectedModel);
    });
    
    elements.refreshModelsBtn?.addEventListener('click', async () => {
        await refreshModels();
    });
    
    // Close modal when clicking outside
    elements.settingsModal?.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) {
            closeSettingsModal();
        }
    });
    
    // Prevent page unload during processing
    window.addEventListener('beforeunload', (e) => {
        if (appState.isProcessing) {
            e.preventDefault();
            e.returnValue = 'Processing is in progress. Are you sure you want to leave?';
        }
    });
}

// Phase 4 — additive layout/IA wiring: settings gear, empty-state entry,
// clear-all, drag-and-drop, and keyboard access for the LLM pill.
function initializePhase4UX() {
    // Visible Settings trigger (the LLM pill click is kept as well)
    const settingsBtn = document.getElementById('settingsBtn');
    settingsBtn?.addEventListener('click', () => openSettingsModal());

    // Make the LLM status pill keyboard-operable (it opens settings on click)
    elements.llmStatus?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openSettingsModal();
        }
    });

    // Empty-state "Add Folder" mirrors the header CTA
    const emptyAddFolderBtn = document.getElementById('emptyAddFolderBtn');
    emptyAddFolderBtn?.addEventListener('click', () => {
        if (!appState.isProcessing) elements.folderInput.click();
    });

    // Clear all folders from the context bar
    const clearAllBtn = document.getElementById('clearAllFoldersBtn');
    clearAllBtn?.addEventListener('click', () => {
        if (appState.isProcessing) return;
        clearAllFolders();
    });

    // Drag-and-drop onto the work area
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        let dragDepth = 0;
        const clearActive = () => { dragDepth = 0; mainContent.classList.remove('drag-active'); };

        mainContent.addEventListener('dragenter', (e) => {
            e.preventDefault();
            if (appState.isProcessing) return;
            dragDepth++;
            mainContent.classList.add('drag-active');
        });
        mainContent.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (appState.isProcessing) return;
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        });
        mainContent.addEventListener('dragleave', () => {
            dragDepth = Math.max(0, dragDepth - 1);
            if (dragDepth === 0) mainContent.classList.remove('drag-active');
        });
        mainContent.addEventListener('drop', async (e) => {
            e.preventDefault();
            clearActive();
            if (appState.isProcessing) return;
            await handleDroppedItems(e.dataTransfer);
        });
    }
}

function clearAllFolders() {
    appState.selectedFolders = [];
    elements.folderInput.value = '';
    updateAllImages();
    updateFolderDisplay();
    updateImageGrid();
}

// Collect image files from a drop (folders traversed via webkitGetAsEntry),
// then funnel through the same ingest path as the file picker.
async function handleDroppedItems(dataTransfer) {
    if (!dataTransfer) return;
    const files = [];
    const items = dataTransfer.items;
    const canTraverse = items && items.length &&
        typeof items[0].webkitGetAsEntry === 'function';

    if (canTraverse) {
        const entries = [];
        for (const item of items) {
            const entry = item.webkitGetAsEntry && item.webkitGetAsEntry();
            if (entry) entries.push(entry);
        }
        for (const entry of entries) {
            await traverseEntry(entry, files);
        }
    } else if (dataTransfer.files) {
        for (const file of dataTransfer.files) files.push(file);
    }

    const imageFiles = files.filter(isImageFile);
    ingestImageFiles(imageFiles);
}

// Recursively walk a FileSystemEntry, tagging files with a relative path so
// getFolderPath can group them by their source folder.
function traverseEntry(entry, out) {
    return new Promise((resolve) => {
        if (!entry) { resolve(); return; }
        if (entry.isFile) {
            entry.file((file) => {
                try { file._relativePath = (entry.fullPath || file.name).replace(/^\//, ''); } catch (_) {}
                out.push(file);
                resolve();
            }, () => resolve());
        } else if (entry.isDirectory) {
            const reader = entry.createReader();
            const collected = [];
            const readBatch = () => {
                reader.readEntries(async (batch) => {
                    if (!batch.length) {
                        for (const child of collected) {
                            await traverseEntry(child, out);
                        }
                        resolve();
                    } else {
                        collected.push(...batch);
                        readBatch();
                    }
                }, () => resolve());
            };
            readBatch();
        } else {
            resolve();
        }
    });
}

// LLM Connection Check
async function checkLLMConnection() {
    try {
        const response = await fetch(`${LLM_CONFIG.baseUrl}${LLM_CONFIG.endpoints.models}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            appState.llmConnected = true;
            updateLLMStatus('connected', 'LLM Connected');
        } else {
            throw new Error('LLM not responding');
        }
    } catch (error) {
        console.error('LLM connection error:', error);
        appState.llmConnected = false;
        updateLLMStatus('error', 'LLM Offline');
        setTimeout(checkLLMConnection, 5000); // Retry after 5 seconds
    }
}

function updateLLMStatus(status, label) {
    elements.statusIndicator.className = `status-indicator ${status}`;
    elements.statusLabel.textContent = label;
    elements.llmStatus.className = `llm-status ${status}`;
}

// Model Management Functions
async function fetchAvailableModels(baseUrl = LLM_CONFIG.baseUrl) {
    try {
        const response = await fetch(`${baseUrl}${LLM_CONFIG.endpoints.models}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.data || []; // OpenAI API format returns models in 'data' array
        }
        return [];
    } catch (error) {
        console.error('Error fetching models:', error);
        return [];
    }
}

function populateModelDropdown(models, currentModel = null) {
    const selectElement = elements.llmModelSelect;
    
    // Clear existing options
    selectElement.innerHTML = '';
    
    if (models.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No models available';
        selectElement.appendChild(option);
        selectElement.disabled = true;
        return;
    }
    
    selectElement.disabled = false;
    
    // Add models as options
    models.forEach(model => {
        const option = document.createElement('option');
        const modelId = typeof model === 'string' ? model : model.id;
        option.value = modelId;
        option.textContent = modelId;
        
        // Select current model if it matches
        if (currentModel && modelId === currentModel) {
            option.selected = true;
        } else if (!currentModel && modelId === LLM_CONFIG.selectedModel) {
            option.selected = true;
        }
        
        selectElement.appendChild(option);
    });
    
    // If no model is selected, select the first one
    if (!selectElement.value && models.length > 0) {
        selectElement.selectedIndex = 0;
    }
}

async function refreshModels() {
    const selectElement = elements.llmModelSelect;
    
    // Show loading state
    selectElement.innerHTML = '<option value="">Loading models...</option>';
    selectElement.disabled = true;
    
    const models = await fetchAvailableModels();
    populateModelDropdown(models, LLM_CONFIG.selectedModel);
}

// Settings Modal Functions
async function openSettingsModal() {
    // Set current URL in input
    elements.llmUrlInput.value = LLM_CONFIG.baseUrl;
    elements.settingsModal.style.display = 'flex';
    elements.connectionStatus.className = 'connection-status';
    elements.connectionStatus.textContent = '';
    
    // Load available models
    await refreshModels();
}

function closeSettingsModal() {
    elements.settingsModal.style.display = 'none';
    elements.connectionStatus.className = 'connection-status';
    elements.connectionStatus.textContent = '';
}

async function saveSettings() {
    const newUrl = elements.llmUrlInput.value.trim();
    const selectedModel = elements.llmModelSelect.value;
    
    if (!newUrl) {
        showConnectionStatus('error', 'Please enter a valid URL');
        return;
    }
    
    if (!selectedModel) {
        showConnectionStatus('error', 'Please select a model');
        return;
    }
    
    // Save to localStorage
    localStorage.setItem('llmBaseUrl', newUrl);
    localStorage.setItem('llmSelectedModel', selectedModel);
    LLM_CONFIG.baseUrl = newUrl;
    LLM_CONFIG.selectedModel = selectedModel;
    
    showConnectionStatus('success', 'Settings saved successfully!');
    
    // Test the new connection
    await checkLLMConnection();
    
    // Close modal after a short delay
    setTimeout(() => {
        closeSettingsModal();
    }, 1500);
}

async function testLlmConnection() {
    const testUrl = elements.llmUrlInput.value.trim();
    
    if (!testUrl) {
        showConnectionStatus('error', 'Please enter a valid URL');
        return;
    }
    
    showConnectionStatus('testing', 'Testing connection...');
    
    try {
        const response = await fetch(`${testUrl}${LLM_CONFIG.endpoints.models}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (response.ok) {
            const data = await response.json();
            showConnectionStatus('success', `Connected! Found ${data.data?.length || 0} model(s)`);
        } else {
            throw new Error(`Server responded with status ${response.status}`);
        }
    } catch (error) {
        console.error('Connection test failed:', error);
        showConnectionStatus('error', `Connection failed: ${error.message}`);
    }
}

function showConnectionStatus(type, message) {
    elements.connectionStatus.className = `connection-status ${type}`;
    elements.connectionStatus.textContent = message;
}

// Folder Selection Handler
function handleFolderSelection(event) {
    const files = Array.from(event.target.files);
    const imageFiles = files.filter(file => isImageFile(file));
    ingestImageFiles(imageFiles);
}

// Shared ingest path for both the file picker and drag-and-drop
function ingestImageFiles(imageFiles) {
    if (imageFiles.length === 0) {
        alert('No image files found in the selected folder.');
        return;
    }

    // Group files by folder
    const folderMap = new Map();
    imageFiles.forEach(file => {
        const folderPath = getFolderPath(file);
        if (!folderMap.has(folderPath)) {
            folderMap.set(folderPath, []);
        }
        folderMap.get(folderPath).push(file);
    });

    // Add folders to state
    folderMap.forEach((files, folderPath) => {
        if (!appState.selectedFolders.find(f => f.path === folderPath)) {
            appState.selectedFolders.push({
                path: folderPath,
                files: files,
                count: files.length
            });
        }
    });

    // Update all images
    updateAllImages();
    updateFolderDisplay();
    updateImageGrid();
}

function isImageFile(file) {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg'];
    return imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
}

function getFolderPath(file) {
    // _relativePath is set by the drag-and-drop traversal (webkitGetAsEntry)
    const path = file._relativePath || file.webkitRelativePath || file.name;
    const parts = path.split('/');
    parts.pop(); // Remove filename
    return parts.join('/') || 'Root';
}

function updateAllImages() {
    appState.allImages = [];
    appState.selectedFolders.forEach(folder => {
        folder.files.forEach(file => {
            appState.allImages.push({
                file: file,
                folder: folder.path,
                selected: true,
                id: `${folder.path}-${file.name}`
            });
        });
    });
    appState.selectedImages = new Set(appState.allImages.map(img => img.id));
}

// Phase 4: drive the adaptive column grid + section visibility by workflow stage.
// 'empty'  -> no folders: show onboarding/drop-zone card, hide both panels.
// 'selecting' -> folders chosen, not processed: Preview gets the room, Timeline hidden.
// 'processing' -> processing/done: balanced two columns, both panels shown.
function setStage(stage) {
    const cc = document.querySelector('.content-columns');
    if (cc) cc.className = 'content-columns stage-' + stage;
    if (elements.imagePreview) {
        elements.imagePreview.style.display = stage === 'empty' ? 'none' : 'flex';
    }
    if (elements.timelineSection) {
        elements.timelineSection.style.display = stage === 'processing' ? 'flex' : 'none';
    }
}

function updateFolderDisplay() {
    const contextBar = document.getElementById('folderContextBar');
    if (appState.selectedFolders.length === 0) {
        elements.selectedFolders.innerHTML = '';
        elements.folderStats.style.display = 'none';
        if (contextBar) contextBar.style.display = 'none';
        return;
    }
    if (contextBar) contextBar.style.display = 'flex';

    elements.selectedFolders.innerHTML = appState.selectedFolders.map(folder => {
        const folderName = folder.path.split('/').pop() || folder.path;
        return `
            <div class="folder-tag">
                <span class="folder-name">${folderName}</span>
                <span class="image-count-tag">
                    ${folder.count} images
                    <button class="remove-folder" data-path="${folder.path}" aria-label="Remove folder">×</button>
                </span>
            </div>
        `;
    }).join('');

    // Add remove folder listeners
    document.querySelectorAll('.remove-folder').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const path = e.target.dataset.path;
            removeFolder(path);
        });
    });

    // Update stats
    elements.folderStats.style.display = 'inline-flex';
    elements.totalFolders.textContent = appState.selectedFolders.length;
    elements.totalImages.textContent = appState.allImages.length;
}

function removeFolder(path) {
    appState.selectedFolders = appState.selectedFolders.filter(f => f.path !== path);
    updateAllImages();
    updateFolderDisplay();
    updateImageGrid();
}

function updateImageGrid() {
    if (appState.allImages.length === 0) {
        setStage('empty');
        return;
    }

    // Folders loaded: 'selecting' until a batch has been processed, then keep 'processing'
    if (appState.isProcessing || appState.processedImages.length > 0) {
        setStage('processing');
    } else {
        setStage('selecting');
    }

    // Check if we should use optimizer (50+ images)
    const shouldUseOptimizer = appState.imageOptimizer && appState.allImages.length >= 50;
    appState.useOptimizer = shouldUseOptimizer;
    
    if (shouldUseOptimizer) {
        console.log(`Using optimizer for ${appState.allImages.length} images`);
        showPerformanceIndicator();
        updateImageGridOptimized();
    } else {
        // Original implementation for smaller sets
        elements.imageGrid.innerHTML = '';
        appState.allImages.forEach(image => {
            const card = createImageCard(image);
            elements.imageGrid.appendChild(card);
        });
    }
}

// Optimized image grid with virtual scrolling and lazy loading
function updateImageGridOptimized() {
    const optimizer = appState.imageOptimizer;
    
    // Clear existing content
    elements.imageGrid.innerHTML = '';
    elements.imageGrid.className = 'image-grid optimized-grid';
    
    // Show loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'optimizer-loading';
    loadingDiv.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Optimizing ${appState.allImages.length} images for performance...</p>
    `;
    elements.imageGrid.appendChild(loadingDiv);
    
    // Use virtual scroller for large image sets
    if (appState.allImages.length >= 100) {
        // Virtual scrolling for large sets (100+ images)
        setTimeout(() => {
            elements.imageGrid.innerHTML = '';
            const virtualScroller = optimizer.createVirtualScroller(
                elements.imageGrid,
                appState.allImages,
                (image, index) => createOptimizedImageCard(image, index)
            );
            
            // Store reference for cleanup
            appState.virtualScroller = virtualScroller;
        }, 100);
    } else {
        // Lazy loading with progressive rendering for medium sets (50-99 images)
        elements.imageGrid.innerHTML = '';
        renderImagesProgressively();
    }
}

// Progressive rendering for medium-sized image sets
function renderImagesProgressively() {
    const optimizer = appState.imageOptimizer;
    const batchSize = 30;
    let currentIndex = 0;
    
    const observer = optimizer.setupLazyLoading(elements.imageGrid, async (element) => {
        const imageId = element.dataset.imageId;
        const image = appState.allImages.find(img => img.id === imageId);
        if (image && element.querySelector('.image-placeholder')) {
            await loadImageThumbnail(element, image);
        }
    });
    
    function renderBatch() {
        const batch = appState.allImages.slice(currentIndex, currentIndex + batchSize);
        
        batch.forEach(image => {
            const card = createOptimizedImageCard(image);
            elements.imageGrid.appendChild(card);
            observer.observe(card);
        });
        
        currentIndex += batchSize;
        
        // Continue rendering if more images
        if (currentIndex < appState.allImages.length) {
            requestAnimationFrame(renderBatch);
        }
    }
    
    renderBatch();
}

// Create optimized image card with lazy loading
function createOptimizedImageCard(image, index) {
    const card = document.createElement('div');
    card.className = `image-card ${appState.selectedImages.has(image.id) ? 'selected' : ''} optimized-card`;
    card.dataset.id = image.id;
    card.dataset.imageId = image.id;
    card.dataset.index = index;
    
    // Create placeholder initially
    card.innerHTML = `
        <input type="checkbox" class="image-checkbox" ${appState.selectedImages.has(image.id) ? 'checked' : ''}>
        <div class="image-placeholder">
            <div class="placeholder-shimmer">
                <div class="shimmer"></div>
            </div>
        </div>
        <div class="image-name">${image.file.name}</div>
        <div class="image-folder">${image.folder}</div>
    `;
    
    // Event listeners
    const checkbox = card.querySelector('.image-checkbox');
    checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        toggleImageSelection(image.id);
    });
    
    card.addEventListener('click', (e) => {
        if (e.target.type !== 'checkbox') {
            toggleImageSelection(image.id);
        }
    });
    
    return card;
}

// Load image thumbnail asynchronously
async function loadImageThumbnail(element, image) {
    const optimizer = appState.imageOptimizer;
    
    try {
        // Generate or get cached thumbnail
        const thumbnailUrl = await optimizer.generateThumbnail(image.file);
        
        // Replace placeholder with actual image
        const placeholder = element.querySelector('.image-placeholder');
        if (placeholder) {
            const img = document.createElement('img');
            img.src = thumbnailUrl;
            img.alt = image.file.name;
            img.className = 'image-preview-thumb optimized-thumb';
            img.loading = 'lazy';
            
            // Fade in effect
            img.style.opacity = '0';
            placeholder.replaceWith(img);
            
            requestAnimationFrame(() => {
                img.style.transition = 'opacity 0.3s';
                img.style.opacity = '1';
            });
        }
    } catch (error) {
        console.error('Failed to load thumbnail:', error);
        // Show error placeholder
        const placeholder = element.querySelector('.image-placeholder');
        if (placeholder) {
            placeholder.innerHTML = '<div class="thumbnail-error">⚠️</div>';
        }
    }
}

function createImageCard(image) {
    const card = document.createElement('div');
    card.className = `image-card ${appState.selectedImages.has(image.id) ? 'selected' : ''}`;
    card.dataset.id = image.id;

    const reader = new FileReader();
    reader.onload = (e) => {
        card.innerHTML = `
            <input type="checkbox" class="image-checkbox" ${appState.selectedImages.has(image.id) ? 'checked' : ''}>
            <img src="${e.target.result}" alt="${image.file.name}" class="image-preview-thumb">
            <div class="image-name">${image.file.name}</div>
            <div class="image-folder">${image.folder}</div>
        `;

        const checkbox = card.querySelector('.image-checkbox');
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            toggleImageSelection(image.id);
        });
    };
    reader.readAsDataURL(image.file);

    card.addEventListener('click', (e) => {
        if (e.target.type !== 'checkbox') {
            toggleImageSelection(image.id);
        }
    });

    return card;
}

function toggleImageSelection(imageId) {
    if (appState.selectedImages.has(imageId)) {
        appState.selectedImages.delete(imageId);
    } else {
        appState.selectedImages.add(imageId);
    }

    const card = document.querySelector(`[data-id="${imageId}"]`);
    if (card) {
        card.classList.toggle('selected');
        const checkbox = card.querySelector('.image-checkbox');
        if (checkbox) {
            checkbox.checked = appState.selectedImages.has(imageId);
        }
    }
}

function selectAllImages() {
    appState.allImages.forEach(image => {
        appState.selectedImages.add(image.id);
    });
    updateImageGrid();
}

function deselectAllImages() {
    appState.selectedImages.clear();
    updateImageGrid();
}

// Image Processing
async function processImages() {
    if (!appState.llmConnected) {
        alert('LLM is not connected. Please ensure the LLM server is running at ' + LLM_CONFIG.baseUrl);
        return;
    }

    if (appState.selectedImages.size === 0) {
        alert('Please select at least one image to process.');
        return;
    }

    appState.isProcessing = true;
    appState.shouldStop = false;
    appState.processedImages = [];
    appState.processingStartTime = Date.now();
    
    const imagesToProcess = appState.allImages.filter(img => appState.selectedImages.has(img.id));
    
    // Disable all interactive elements
    disableAllControls();
    
    // Show processing UI — reveal the Timeline column (balanced two-column stage)
    elements.currentProcessing.style.display = 'block';
    elements.stopProcessingBtn.style.display = 'flex';
    setStage('processing');
    elements.timelineItems.innerHTML = '';

    let processed = 0;
    const total = imagesToProcess.length;

    for (const image of imagesToProcess) {
        // Check if user requested stop
        if (appState.shouldStop) {
            console.log('Processing stopped by user');
            break;
        }
        
        try {
            await processImage(image, processed, total);
            processed++;
            updateProgress(processed, total);
        } catch (error) {
            console.error(`Error processing ${image.file.name}:`, error);
            processed++;
            updateProgress(processed, total);
        }
    }

    appState.isProcessing = false;
    appState.processingEndTime = Date.now();
    elements.stopProcessingBtn.style.display = 'none';
    
    // Re-enable all controls
    enableAllControls();
    
    // Show results
    if (appState.shouldStop) {
        showPartialResults(processed, total);
    } else {
        showResults();
    }
    
    // Show timeline download controls if we have processed images
    updateTimelineControls();
}

function updateTimelineControls() {
    if (appState.processedImages.length > 0) {
        elements.timelineControls.style.display = 'flex';
        elements.timelineDownloadBtn.innerHTML = `
            <span class="btn-icon">💾</span>
            Download All (${appState.processedImages.length} images)
        `;
    } else {
        elements.timelineControls.style.display = 'none';
    }
}

function stopProcessing() {
    appState.shouldStop = true;
    elements.statusText.textContent = 'Stopping...';
    elements.stopProcessingBtn.disabled = true;
}

function disableAllControls() {
    // Disable all buttons
    elements.addFolderBtn.disabled = true;
    elements.selectAllBtn.disabled = true;
    elements.deselectAllBtn.disabled = true;
    elements.processBtn.disabled = true;
    elements.folderInput.disabled = true;
    
    // Disable all checkboxes
    document.querySelectorAll('.image-checkbox').forEach(checkbox => {
        checkbox.disabled = true;
    });
    
    // Disable remove folder buttons
    document.querySelectorAll('.remove-folder').forEach(btn => {
        btn.disabled = true;
    });
    
    // Add visual feedback
    const folderSection = document.querySelector('.folder-selection');
    if (folderSection) folderSection.classList.add('processing-overlay');
    if (elements.imagePreview) elements.imagePreview.classList.add('processing-overlay');
}

function enableAllControls() {
    // Re-enable all buttons
    elements.addFolderBtn.disabled = false;
    elements.selectAllBtn.disabled = false;
    elements.deselectAllBtn.disabled = false;
    elements.processBtn.disabled = false;
    elements.folderInput.disabled = false;
    elements.stopProcessingBtn.disabled = false;
    
    // Re-enable all checkboxes
    document.querySelectorAll('.image-checkbox').forEach(checkbox => {
        checkbox.disabled = false;
    });
    
    // Re-enable remove folder buttons
    document.querySelectorAll('.remove-folder').forEach(btn => {
        btn.disabled = false;
    });
    
    // Remove visual feedback
    const folderSection = document.querySelector('.folder-selection');
    if (folderSection) folderSection.classList.remove('processing-overlay');
    if (elements.imagePreview) elements.imagePreview.classList.remove('processing-overlay');
}

function showPartialResults(processed, total) {
    const stopped = total - processed;
    
    elements.resultsSummary.innerHTML = `
        <div class="result-stat">
            <span class="result-label">Processing Stopped</span>
            <span class="result-value" style="color: var(--warning);">User Cancelled</span>
        </div>
        <div class="result-stat">
            <span class="result-label">Images Processed:</span>
            <span class="result-value">${processed} / ${total}</span>
        </div>
        <div class="result-stat">
            <span class="result-label">Images Skipped:</span>
            <span class="result-value">${stopped}</span>
        </div>
        <div class="result-stat">
            <span class="result-label">Processing Time:</span>
            <span class="result-value">${calculateProcessingTime()}</span>
        </div>
    `;

    elements.resultsModal.style.display = 'flex';
    elements.currentProcessing.style.display = 'none';
}

async function processImage(image, current, total) {
    const imageStartTime = Date.now();
    
    // Update current processing display
    elements.statusText.textContent = 'Analyzing image...';
    elements.generatedName.textContent = 'Processing...';
    elements.generatedMetadata.textContent = 'Generating description...';
    elements.progressText.textContent = `${current + 1} / ${total}`;

    // Read and display image
    const imageData = await readImageAsBase64(image.file);
    elements.currentThumbnail.src = imageData;

    // Add language instruction if not English
    const languageInstruction = appState.selectedLanguage !== 'en' 
        ? LANGUAGES[appState.selectedLanguage].promptInstruction + '\n\n' 
        : '';
    
    // Prepare LLM request based on mode
    const prompt = languageInstruction + (appState.descriptiveMode ? 
        `Analyze this image and provide:
1. A detailed, keyword-rich filename (5-8 descriptive words, without extension, use underscores for spaces)
   Include important details like: colors, objects, actions, locations, time of day, weather, mood
2. A comprehensive description of the image content (3-4 sentences with many searchable keywords)

Format your response as:
FILENAME: [filename]
DESCRIPTION: [description]` :
        `Analyze this image and provide:
1. A short, descriptive filename (without extension, use underscores for spaces)
2. A detailed description of the image content (2-3 sentences)

Format your response as:
FILENAME: [filename]
DESCRIPTION: [description]`);

    try {
        const response = await callLLM(imageData, prompt);
        const { filename, description } = parseAIResponse(response);

        // Update UI with results
        elements.generatedName.textContent = filename + getFileExtension(image.file.name);
        elements.generatedMetadata.textContent = description;

        // Store processed image data with base64 for display
        const processedImage = {
            original: image,
            newName: filename + getFileExtension(image.file.name),
            description: description,
            timestamp: new Date().toISOString(),
            base64Data: imageData, // Store for timeline display
            processingTime: Date.now() - imageStartTime // Store individual processing time
        };
        appState.processedImages.push(processedImage);

        // Add to timeline
        addToTimeline(processedImage, imageData);

    } catch (error) {
        console.error('LLM processing error:', error);
        elements.generatedName.textContent = 'Error processing';
        elements.generatedMetadata.textContent = error.message;
    }
}

async function readImageAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function callLLM(imageData, prompt) {
    // For testing without LLM, return mock response
    if (!appState.llmConnected) {
        return mockLLMResponse(imageData);
    }

    const response = await fetch(`${LLM_CONFIG.baseUrl}${LLM_CONFIG.endpoints.chat}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: LLM_CONFIG.selectedModel || "gpt-4-vision-preview",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: imageData } }
                    ]
                }
            ],
            max_tokens: 300,
            stream: false
        })
    });

    if (!response.ok) {
        throw new Error(`LLM request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

function mockLLMResponse(imageData) {
    // Language-specific mock responses for testing
    const lang = appState.selectedLanguage || 'en';
    
    // Mock data organized by language
    const LANGUAGE_MOCKS = {
        'en': {
            names: appState.descriptiveMode ? [
                'golden_sunset_beach_ocean_waves_tropical_paradise',
                'snowy_mountain_peaks_alpine_landscape_winter_wonderland',
                'urban_city_skyline_night_lights_downtown_metropolitan',
                'serene_forest_pathway_green_trees_nature_trail',
                'ocean_waves_rocky_shores_coastal_seascape_dramatic'
            ] : [
                'sunset_beach_view',
                'mountain_landscape',
                'city_skyline_night',
                'forest_pathway',
                'ocean_waves'
            ],
            descriptions: appState.descriptiveMode ? [
                'A breathtaking golden sunset over the tropical ocean with vibrant orange and pink hues reflecting on the calm water surface. Palm trees silhouetted against the colorful sky create a paradise-like atmosphere. The peaceful beach scene captures the serene beauty of a perfect evening by the sea.',
                'Majestic snow-covered mountain peaks rising dramatically into a crystal clear blue winter sky. The alpine landscape showcases pristine white slopes and rugged rocky formations. This stunning winter wonderland captures the raw beauty and grandeur of high-altitude mountain terrain.',
                'Vibrant urban cityscape at night with countless illuminated skyscrapers creating a dazzling display of lights. The bustling metropolitan downtown area pulses with energy and activity. Modern architecture and city lights paint a dynamic picture of contemporary urban life.',
                'A peaceful forest pathway winding through tall green trees in a lush natural setting. Sunlight filters through the dense canopy creating beautiful patterns on the forest floor. This serene nature trail invites exploration and offers a tranquil escape into the wilderness.',
                'Powerful ocean waves crashing dramatically against rugged rocky shores under a moody cloudy sky. The dynamic coastal seascape captures the raw energy of the sea meeting land. Foam and spray create a spectacular display of nature\'s force along the dramatic coastline.'
            ] : [
                'A beautiful sunset over the ocean with golden colors reflecting on the water.',
                'Majestic mountain peaks covered in snow under a clear blue sky.',
                'Urban cityscape at night with illuminated buildings and busy streets.',
                'A serene forest path surrounded by tall green trees and natural beauty.',
                'Ocean waves crashing against rocky shores under cloudy skies.'
            ]
        },
        'fr': {
            names: appState.descriptiveMode ? [
                'coucher_soleil_plage_ocean_vagues_paradis_tropical',
                'sommets_montagne_neige_paysage_alpin_merveille_hivernale',
                'paysage_urbain_nuit_lumieres_centre_ville_metropolitain',
                'sentier_foret_paisible_arbres_verts_nature_sauvage',
                'vagues_ocean_rochers_littoral_paysage_marin_dramatique'
            ] : [
                'coucher_soleil_plage',
                'paysage_montagne',
                'ville_nuit',
                'sentier_foret',
                'vagues_ocean'
            ],
            descriptions: appState.descriptiveMode ? [
                'Un coucher de soleil doré à couper le souffle sur l\'océan tropical avec des teintes orange et rose vibrantes se reflétant sur la surface calme de l\'eau. Les palmiers silhouettés contre le ciel coloré créent une atmosphère paradisiaque. Cette scène de plage paisible capture la beauté sereine d\'une soirée parfaite au bord de la mer.',
                'Des sommets majestueux couverts de neige s\'élevant dramatiquement dans un ciel d\'hiver cristallin. Le paysage alpin présente des pentes blanches immaculées et des formations rocheuses rugueuses. Cette merveille hivernale époustouflante capture la beauté brute et la grandeur du terrain montagneux de haute altitude.',
                'Paysage urbain vibrant la nuit avec d\'innombrables gratte-ciel illuminés créant un spectacle éblouissant de lumières. Le centre-ville métropolitain animé pulse d\'énergie et d\'activité. L\'architecture moderne et les lumières de la ville peignent une image dynamique de la vie urbaine contemporaine.',
                'Un sentier forestier paisible serpentant à travers de grands arbres verts dans un cadre naturel luxuriant. La lumière du soleil filtre à travers la canopée dense créant de beaux motifs sur le sol forestier. Ce sentier naturel serein invite à l\'exploration et offre une évasion tranquille dans la nature sauvage.',
                'Des vagues océaniques puissantes s\'écrasant dramatiquement contre des rivages rocheux accidentés sous un ciel nuageux. Le paysage marin côtier dynamique capture l\'énergie brute de la mer rencontrant la terre. L\'écume et les embruns créent un spectacle spectaculaire de la force de la nature le long du littoral dramatique.'
            ] : [
                'Un magnifique coucher de soleil sur l\'océan avec des couleurs dorées se reflétant sur l\'eau.',
                'Des sommets majestueux couverts de neige sous un ciel bleu clair.',
                'Paysage urbain de nuit avec des bâtiments illuminés et des rues animées.',
                'Un sentier forestier serein entouré de grands arbres verts et de beauté naturelle.',
                'Des vagues océaniques s\'écrasant contre des rivages rocheux sous des cieux nuageux.'
            ]
        },
        'de': {
            names: appState.descriptiveMode ? [
                'goldener_sonnenuntergang_strand_ozean_wellen_tropisches_paradies',
                'schneebedeckte_berggipfel_alpenlandschaft_winterwunderland',
                'stadtsilhouette_nacht_lichter_innenstadt_grossstadt',
                'friedlicher_waldweg_gruene_baeume_naturpfad',
                'ozeanwellen_felsige_kueste_kuestenlandschaft_dramatisch'
            ] : [
                'sonnenuntergang_strand',
                'berglandschaft',
                'stadtsilhouette_nacht',
                'waldweg',
                'ozeanwellen'
            ],
            descriptions: appState.descriptiveMode ? [
                'Ein atemberaubender goldener Sonnenuntergang über dem tropischen Ozean mit lebhaften orangen und rosa Tönen, die sich auf der ruhigen Wasseroberfläche spiegeln. Palmen als Silhouetten gegen den farbenfrohen Himmel schaffen eine paradiesische Atmosphäre. Die friedliche Strandszene fängt die ruhige Schönheit eines perfekten Abends am Meer ein.',
                'Majestätische schneebedeckte Berggipfel, die sich dramatisch in einen kristallklaren blauen Winterhimmel erheben. Die Alpenlandschaft zeigt makellose weiße Hänge und raue Felsformationen. Dieses atemberaubende Winterwunderland fängt die rohe Schönheit und Erhabenheit des Hochgebirgsterrains ein.',
                'Lebendige städtische Skyline bei Nacht mit unzähligen beleuchteten Wolkenkratzern, die ein schillerndes Lichtspiel erzeugen. Das geschäftige Stadtzentrum pulsiert vor Energie und Aktivität. Moderne Architektur und Stadtlichter malen ein dynamisches Bild des zeitgenössischen urbanen Lebens.',
                'Ein friedlicher Waldweg, der sich durch hohe grüne Bäume in einer üppigen natürlichen Umgebung schlängelt. Sonnenlicht filtert durch das dichte Blätterdach und erzeugt schöne Muster auf dem Waldboden. Dieser ruhige Naturpfad lädt zur Erkundung ein und bietet eine friedliche Flucht in die Wildnis.',
                'Kraftvolle Ozeanwellen, die dramatisch gegen raue felsige Küsten unter einem stimmungsvollen bewölkten Himmel brechen. Die dynamische Küstenlandschaft fängt die rohe Energie des Meeres ein, das auf Land trifft. Schaum und Gischt erzeugen ein spektakuläres Schauspiel der Naturgewalt entlang der dramatischen Küstenlinie.'
            ] : [
                'Ein wunderschöner Sonnenuntergang über dem Ozean mit goldenen Farben, die sich auf dem Wasser spiegeln.',
                'Majestätische Berggipfel bedeckt mit Schnee unter einem klaren blauen Himmel.',
                'Städtische Skyline bei Nacht mit beleuchteten Gebäuden und belebten Straßen.',
                'Ein ruhiger Waldweg umgeben von hohen grünen Bäumen und natürlicher Schönheit.',
                'Ozeanwellen brechen gegen felsige Küsten unter bewölktem Himmel.'
            ]
        },
        'es': {
            names: appState.descriptiveMode ? [
                'atardecer_dorado_playa_oceano_olas_paraiso_tropical',
                'cumbres_montana_nieve_paisaje_alpino_maravilla_invernal',
                'horizonte_urbano_noche_luces_centro_metropolitano',
                'sendero_bosque_tranquilo_arboles_verdes_naturaleza',
                'olas_oceano_costa_rocosa_paisaje_marino_dramatico'
            ] : [
                'atardecer_playa',
                'paisaje_montana',
                'ciudad_noche',
                'sendero_bosque',
                'olas_oceano'
            ],
            descriptions: appState.descriptiveMode ? [
                'Un impresionante atardecer dorado sobre el océano tropical con vibrantes tonos naranjas y rosados reflejándose en la superficie tranquila del agua. Las palmeras silueteadas contra el cielo colorido crean una atmósfera paradisíaca. La pacífica escena de playa captura la belleza serena de una tarde perfecta junto al mar.',
                'Majestuosas cumbres montañosas cubiertas de nieve elevándose dramáticamente hacia un cielo invernal cristalino. El paisaje alpino muestra laderas blancas prístinas y formaciones rocosas escarpadas. Esta impresionante maravilla invernal captura la belleza cruda y la grandeza del terreno montañoso de gran altitud.',
                'Vibrante paisaje urbano nocturno con innumerables rascacielos iluminados creando un deslumbrante despliegue de luces. El bullicioso centro metropolitano pulsa con energía y actividad. La arquitectura moderna y las luces de la ciudad pintan una imagen dinámica de la vida urbana contemporánea.',
                'Un tranquilo sendero forestal serpenteando a través de altos árboles verdes en un entorno natural exuberante. La luz del sol se filtra a través del denso dosel creando hermosos patrones en el suelo del bosque. Este sereno sendero natural invita a la exploración y ofrece un escape tranquilo hacia la naturaleza salvaje.',
                'Poderosas olas oceánicas rompiendo dramáticamente contra costas rocosas escarpadas bajo un cielo nublado temperamental. El dinámico paisaje marino costero captura la energía cruda del mar encontrándose con la tierra. La espuma y el rocío crean un espectáculo espectacular de la fuerza de la naturaleza a lo largo de la dramática línea costera.'
            ] : [
                'Un hermoso atardecer sobre el océano con colores dorados reflejándose en el agua.',
                'Majestuosas cumbres montañosas cubiertas de nieve bajo un cielo azul claro.',
                'Paisaje urbano nocturno con edificios iluminados y calles concurridas.',
                'Un sereno sendero forestal rodeado de altos árboles verdes y belleza natural.',
                'Olas oceánicas rompiendo contra costas rocosas bajo cielos nublados.'
            ]
        },
        'hi': {
            names: appState.descriptiveMode ? [
                'सुनहरी_सूर्यास्त_समुद्री_तट_लहरें_उष्णकटिबंधीय_स्वर्ग',
                'बर्फीली_पर्वत_शिखर_अल्पाइन_दृश्य_शीतकालीन_अद्भुत',
                'शहरी_दृश्य_रात_प्रकाश_शहर_केंद्र_महानगरीय',
                'शांत_वन_पथ_हरे_वृक्ष_प्राकृतिक_मार्ग',
                'समुद्री_लहरें_चट्टान_तट_समुद्री_दृश्य_नाटकीय'
            ] : [
                'सूर्यास्त_समुद्र_दृश्य',
                'पर्वत_दृश्य',
                'शहर_रात',
                'वन_पथ',
                'समुद्री_लहरें'
            ],
            descriptions: appState.descriptiveMode ? [
                'उष्णकटिबंधीय समुद्र पर एक अद्भुत सुनहरी सूर्यास्त जिसमें नारंगी और गुलाबी रंग की जीवंत छायाएं शांत जल की सतह पर प्रतिबिंबित हो रही हैं। रंगीन आकाश के विरुद्ध सिल्हूट में खड़े नारियल के वृक्ष स्वर्ग जैसी वातावरण बनाते हैं। यह शांत समुद्री तट का दृश्य समुद्र के किनारे एक संपूर्ण शाम की शांत सुंदरता को दर्शाता है।',
                'स्फटिक जैसी साफ नीली शीतकालीन आकाश में नाटकीय रूप से उठते हुए बर्फीली पर्वत शिखर। अल्पाइन दृश्य में निष्कलंकित सफेद ढलानें और कठोर चट्टान संरचनाएं दिखती हैं। यह अद्भुत शीतकालीन चमत्कार उच्च ऊंचाई के पर्वतीय क्षेत्र की कच्ची सुंदरता और भव्यता को दर्शाता है।',
                'रात में जीवंत शहरी दृश्य जहां अनेक प्रकाशित गगनचुंबी इमारतें चमकदार प्रकाश प्रदर्शन बनाती हैं। व्यस्त महानगरीय केंद्र ऊर्जा और गतिविधि से स्पंदन करता है। आधुनिक वास्तुकला और शहर की बत्तियां समकालीन शहरी जीवन की गतिशील तस्वीर प्रस्तुत करती हैं।',
                'हरे-भरे प्राकृतिक वातावरण में लंबे हरे वृक्षों के बीच से घूमता हुआ एक शांत वन पथ। घने छतनार से छनती हुई सूर्य की किरणें वन की जमीन पर सुंदर पैटर्न बनाती हैं। यह शांत प्राकृतिक मार्ग खोज के लिए आमंत्रित करता है और जंगल में एक शांत पलायन प्रदान करता है।',
                'मूडी बादलों भरे आकाश के नीचे कठोर चट्टानी किनारों पर नाटकीय रूप से टकराती हुई शक्तिशाली समुद्री लहरें। गतिशील तटीय समुद्री दृश्य समुद्र और भूमि के मिलन की कच्ची ऊर्जा को दर्शाता है। झाग और छींटे तटीय रेखा के साथ प्रकृति की शक्ति का एक शानदार प्रदर्शन बनाते हैं।'
            ] : [
                'समुद्र पर एक सुंदर सूर्यास्त जिसमें सुनहरे रंग पानी पर प्रतिबिंबित हो रहे हैं।',
                'साफ नीले आकाश के नीचे बर्फ से ढके हुए भव्य पर्वत शिखर।',
                'रात में शहरी दृश्य जिसमें प्रकाशित इमारतें और व्यस्त सड़कें हैं।',
                'लंबे हरे वृक्षों और प्राकृतिक सुंदरता से घिरा हुआ एक शांत वन पथ।',
                'बादलों भरे आकाश के नीचे चट्टानी किनारों पर टकराती हुई समुद्री लहरें।'
            ]
        }
    };
    
    // Use English as fallback if language not found
    const mockData = LANGUAGE_MOCKS[lang] || LANGUAGE_MOCKS['en'];
    const randomIndex = Math.floor(Math.random() * mockData.names.length);
    
    return `FILENAME: ${mockData.names[randomIndex]}
DESCRIPTION: ${mockData.descriptions[randomIndex]}`;
}

function parseAIResponse(response) {
    const lines = response.split('\n');
    let filename = 'processed_image';
    let description = 'AI-processed image';

    lines.forEach(line => {
        if (line.startsWith('FILENAME:')) {
            filename = line.replace('FILENAME:', '').trim();
        } else if (line.startsWith('DESCRIPTION:')) {
            description = line.replace('DESCRIPTION:', '').trim();
        }
    });

    // Sanitize filename based on language
    if (appState.selectedLanguage === 'hi') {
        // For Hindi: preserve Devanagari script with proper handling
        filename = filename
            .trim()
            .replace(/\s+/g, '_')  // Replace spaces with underscores
            // Keep Devanagari range including vowel signs, numerals, and punctuation
            .replace(/[^\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\p{N}_-]/gu, '')  
            .replace(/_+/g, '_')  // Replace multiple underscores with single
            .replace(/^_|_$/g, '');  // Remove leading/trailing underscores
        // Don't lowercase Hindi text as case doesn't apply to Devanagari script
    } else {
        // For other languages: allow international characters
        filename = filename
            .replace(/\s+/g, '_')  // Replace spaces with underscores
            .replace(/[^\p{L}\p{N}_-]/gu, '_')  // Keep letters (any language), numbers, underscores, hyphens
            .replace(/_+/g, '_')  // Replace multiple underscores with single
            .replace(/^_|_$/g, '')  // Remove leading/trailing underscores
            .toLowerCase();
    }

    // Fallback to basic filename if the result is empty or too short
    if (filename.length < 3) {
        filename = 'processed_image_' + Date.now();
    }

    return { filename, description };
}

function getFileExtension(filename) {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
}

function updateProgress(current, total) {
    const percentage = (current / total) * 100;
    elements.progressFill.style.width = `${percentage}%`;
    elements.progressText.textContent = `${current} / ${total}`;
}

function addToTimeline(processedImage, imageData) {
    const timelineItem = document.createElement('div');
    timelineItem.className = 'timeline-item';
    timelineItem.style.animationDelay = `${appState.processedImages.length * 0.1}s`;

    const isEven = appState.processedImages.length % 2 === 0;
    
    timelineItem.innerHTML = `
        <div class="timeline-content">
            <img src="${imageData}" alt="${processedImage.newName}" class="timeline-thumbnail">
            <div class="timeline-name">${processedImage.newName}</div>
            <div class="timeline-description">${processedImage.description}</div>
            <div class="timeline-timestamp">${new Date(processedImage.timestamp).toLocaleTimeString()}</div>
        </div>
        <div class="timeline-dot"></div>
    `;

    elements.timelineItems.appendChild(timelineItem);
}

// Results Modal
function showResults() {
    const successCount = appState.processedImages.length;
    const totalSelected = appState.selectedImages.size;
    const failedCount = totalSelected - successCount;

    elements.resultsSummary.innerHTML = `
        <div class="result-stat">
            <span class="result-label">Total Processed:</span>
            <span class="result-value">${successCount}</span>
        </div>
        <div class="result-stat">
            <span class="result-label">Successfully Renamed:</span>
            <span class="result-value">${successCount}</span>
        </div>
        <div class="result-stat">
            <span class="result-label">Failed:</span>
            <span class="result-value">${failedCount}</span>
        </div>
        <div class="result-stat">
            <span class="result-label">Processing Time:</span>
            <span class="result-value">${calculateProcessingTime()}</span>
        </div>
    `;

    elements.resultsModal.style.display = 'flex';
    elements.currentProcessing.style.display = 'none';
}

function closeResultsModal() {
    elements.resultsModal.style.display = 'none';
}

function calculateProcessingTime() {
    if (!appState.processingStartTime || !appState.processingEndTime) {
        return 'N/A';
    }
    
    const durationMs = appState.processingEndTime - appState.processingStartTime;
    return formatDuration(durationMs);
}

function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        const remainingMinutes = minutes % 60;
        const remainingSeconds = seconds % 60;
        return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
    } else if (minutes > 0) {
        const remainingSeconds = seconds % 60;
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
    } else {
        // Show with decimal for short durations
        const secondsWithDecimal = (milliseconds / 1000).toFixed(1);
        return `${secondsWithDecimal} second${secondsWithDecimal !== '1.0' ? 's' : ''}`;
    }
}

// Export Functions
async function downloadAllResults() {
    if (appState.processedImages.length === 0) {
        alert('No processed images to download.');
        return;
    }

    // Show progress
    showDownloadProgress();

    try {
        // Create ZIP package with renamed images
        const zip = new JSZip();
        const manifest = {
            processedAt: new Date().toISOString(),
            totalImages: appState.processedImages.length,
            changes: []
        };

        // Process each image
        for (let i = 0; i < appState.processedImages.length; i++) {
            const processedImg = appState.processedImages[i];
            const progress = ((i + 1) / appState.processedImages.length) * 100;
            updateDownloadProgress(progress, `Processing ${processedImg.newName}...`);

            try {
                // Read the original file
                const arrayBuffer = await readFileAsArrayBuffer(processedImg.original.file);
                
                // Add image to ZIP with new name
                const folderPath = processedImg.original.folder || '';
                const fullPath = folderPath ? `${folderPath}/${processedImg.newName}` : processedImg.newName;
                
                // Add the image with metadata if possible
                const imageWithMetadata = await addMetadataToImage(
                    arrayBuffer, 
                    processedImg.newName, 
                    processedImg.description
                );
                
                zip.file(fullPath, imageWithMetadata);

                // Add to manifest
                manifest.changes.push({
                    originalName: processedImg.original.file.name,
                    newName: processedImg.newName,
                    description: processedImg.description,
                    folder: folderPath,
                    timestamp: processedImg.timestamp
                });
            } catch (error) {
                console.error(`Error processing ${processedImg.original.file.name}:`, error);
            }
        }

        // Add manifest file
        zip.file('manifest.json', JSON.stringify(manifest, null, 2));

        // Add README
        const readme = createReadmeContent(manifest);
        zip.file('README.txt', readme);

        // Generate and download ZIP
        updateDownloadProgress(90, 'Creating ZIP file...');
        const blob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        }, (metadata) => {
            const progress = 90 + (metadata.percent / 10);
            updateDownloadProgress(progress, 'Compressing...');
        });

        // Download the ZIP file
        downloadBlob(blob, `quicktag-images-${Date.now()}.zip`);
        hideDownloadProgress();
        
        // Show success message
        setTimeout(() => {
            alert(`Successfully downloaded ${appState.processedImages.length} renamed images!`);
        }, 500);

    } catch (error) {
        console.error('Error creating ZIP:', error);
        hideDownloadProgress();
        alert('Error creating download package. Please try again.');
    }
}

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

async function addMetadataToImage(arrayBuffer, filename, description) {
    const extension = getFileExtension(filename).toLowerCase();
    const keywords = extractKeywords(description);
    
    try {
        if (extension === '.jpg' || extension === '.jpeg') {
            return addJpegMetadata(arrayBuffer, description, keywords);
        } else if (extension === '.png') {
            return addPngMetadata(arrayBuffer, description, keywords);
        } else if (extension === '.webp') {
            // WebP metadata would require additional implementation
            return arrayBuffer;
        } else {
            // For other formats, return as-is
            return arrayBuffer;
        }
    } catch (error) {
        console.error(`Error adding metadata to ${filename}:`, error);
        return arrayBuffer; // Return original if metadata addition fails
    }
}

function extractKeywords(description) {
    // Extract meaningful keywords from the description
    const words = description.toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Remove punctuation
        .split(/\s+/)
        .filter(word => word.length > 3); // Filter short words
    
    // Common words to exclude
    const stopWords = new Set(['with', 'this', 'that', 'from', 'have', 'been', 'were', 'there', 'their', 'would', 'could', 'should', 'under', 'over', 'through', 'into', 'about', 'after', 'before', 'during', 'without', 'again', 'further', 'then', 'once']);
    
    // Keywords to emphasize (if found)
    const importantWords = new Set(['sunset', 'sunrise', 'beach', 'ocean', 'mountain', 'forest', 'city', 'landscape', 'portrait', 'nature', 'sky', 'water', 'golden', 'blue', 'green', 'red', 'beautiful', 'serene', 'peaceful', 'dramatic', 'vibrant', 'colorful', 'morning', 'evening', 'night', 'day', 'summer', 'winter', 'spring', 'autumn', 'fall']);
    
    const keywords = [];
    const seen = new Set();
    
    // In descriptive mode, extract more keywords
    const maxKeywords = appState.descriptiveMode ? 20 : 10;
    
    // Add important words first
    words.forEach(word => {
        if (importantWords.has(word) && !seen.has(word)) {
            keywords.push(word);
            seen.add(word);
        }
    });
    
    // Add other meaningful words
    words.forEach(word => {
        if (!stopWords.has(word) && !seen.has(word) && keywords.length < maxKeywords) {
            keywords.push(word);
            seen.add(word);
        }
    });
    
    // In descriptive mode, also add bigrams (two-word phrases) if space allows
    if (appState.descriptiveMode && keywords.length < maxKeywords) {
        const wordsArray = description.toLowerCase().split(/\s+/);
        for (let i = 0; i < wordsArray.length - 1; i++) {
            if (keywords.length >= maxKeywords) break;
            const bigram = wordsArray[i] + '_' + wordsArray[i + 1];
            if (bigram.length > 7 && bigram.length < 20 && !seen.has(bigram)) {
                keywords.push(bigram);
                seen.add(bigram);
            }
        }
    }
    
    return keywords.join(', ');
}

function addJpegMetadata(arrayBuffer, description, keywords) {
    try {
        // Convert ArrayBuffer to binary string for piexifjs
        const binaryString = arrayBufferToBinaryString(arrayBuffer);
        let dataUrl;
        try {
            dataUrl = 'data:image/jpeg;base64,' + btoa(binaryString);
        } catch (e) {
            console.warn('btoa encoding failed, using alternative method:', e);
            // Fallback: return original if encoding fails
            return arrayBuffer;
        }
        
        // Get existing EXIF data or create new
        let exifObj;
        try {
            exifObj = piexif.load(dataUrl);
        } catch (e) {
            // No existing EXIF, create new
            exifObj = { "0th": {}, "Exif": {}, "GPS": {}, "1st": {} };
        }
        
        // Add description to multiple fields for compatibility
        // Sanitize text for ASCII EXIF fields
        const sanitizedDescription = sanitizeForExif(description);
        const sanitizedKeywords = sanitizeForExif(keywords);
        
        // Standard EXIF ImageDescription (ASCII only)
        exifObj["0th"][piexif.ImageIFD.ImageDescription] = sanitizedDescription;
        
        // Windows XP compatible fields (shown in Windows Explorer)
        // These use UTF-16LE encoding for Windows and can handle Unicode
        const descriptionUtf16 = stringToUtf16Bytes(description);
        const keywordsUtf16 = stringToUtf16Bytes(keywords);
        
        exifObj["0th"][0x9C9C] = descriptionUtf16; // XPComment
        exifObj["0th"][0x9C9D] = descriptionUtf16; // XPAuthor (sometimes shown as caption)
        exifObj["0th"][0x9C9E] = keywordsUtf16;    // XPKeywords
        exifObj["0th"][0x9C9F] = descriptionUtf16; // XPSubject
        
        // EXIF UserComment (backup field) - use sanitized version
        const sanitizedBytes = new TextEncoder().encode(sanitizedDescription);
        const userCommentBytes = new Uint8Array(8 + sanitizedBytes.length);
        const ascii = 'ASCII\0\0\0';
        for (let i = 0; i < 8; i++) {
            userCommentBytes[i] = ascii.charCodeAt(i);
        }
        for (let i = 0; i < sanitizedBytes.length; i++) {
            userCommentBytes[8 + i] = sanitizedBytes[i];
        }
        exifObj["Exif"][piexif.ExifIFD.UserComment] = Array.from(userCommentBytes);
        
        // Software tag
        exifObj["0th"][piexif.ImageIFD.Software] = "QuickTag Images AI";
        
        // Convert EXIF object to bytes
        const exifBytes = piexif.dump(exifObj);
        
        // Insert EXIF into image
        const newDataUrl = piexif.insert(exifBytes, dataUrl);
        
        // Convert back to ArrayBuffer
        const base64 = newDataUrl.split(',')[1];
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        
        return bytes.buffer;
    } catch (error) {
        console.error('Error adding JPEG metadata:', error);
        return arrayBuffer;
    }
}

function addPngMetadata(arrayBuffer, description, keywords) {
    try {
        const uint8Array = new Uint8Array(arrayBuffer);
        const chunks = [];
        let offset = 8; // Skip PNG signature
        
        // Read existing chunks
        while (offset < uint8Array.length) {
            const length = readUint32(uint8Array, offset);
            const type = String.fromCharCode(...uint8Array.slice(offset + 4, offset + 8));
            const data = uint8Array.slice(offset + 8, offset + 8 + length);
            const crc = uint8Array.slice(offset + 8 + length, offset + 12 + length);
            
            if (type !== 'tEXt' && type !== 'iTXt') { // Skip existing text chunks
                chunks.push({ type, data, length });
            }
            
            offset += 12 + length;
            
            if (type === 'IEND') break;
        }
        
        // Create new text chunks
        const descChunk = createPngTextChunk('Description', description);
        const keywordChunk = createPngTextChunk('Keywords', keywords);
        const commentChunk = createPngTextChunk('Comment', description);
        
        // Insert text chunks before IEND
        const iendIndex = chunks.findIndex(chunk => chunk.type === 'IEND');
        chunks.splice(iendIndex, 0, descChunk, keywordChunk, commentChunk);
        
        // Rebuild PNG
        const newPng = [];
        
        // PNG signature
        newPng.push(...[137, 80, 78, 71, 13, 10, 26, 10]);
        
        // Add all chunks
        chunks.forEach(chunk => {
            if (chunk.raw) {
                newPng.push(...chunk.raw);
            } else {
                // Original chunk
                const chunkArray = [];
                chunkArray.push(...uint32ToBytes(chunk.length));
                chunkArray.push(...chunk.type.split('').map(c => c.charCodeAt(0)));
                chunkArray.push(...chunk.data);
                const crc = calculateCrc32([...chunk.type.split('').map(c => c.charCodeAt(0)), ...chunk.data]);
                chunkArray.push(...uint32ToBytes(crc));
                newPng.push(...chunkArray);
            }
        });
        
        return new Uint8Array(newPng).buffer;
    } catch (error) {
        console.error('Error adding PNG metadata:', error);
        return arrayBuffer;
    }
}

function createPngTextChunk(keyword, text) {
    const keywordBytes = stringToBytes(keyword);
    const nullByte = [0];
    const textBytes = stringToBytes(text);
    const data = [...keywordBytes, ...nullByte, ...textBytes];
    
    const chunk = [];
    chunk.push(...uint32ToBytes(data.length));
    chunk.push(...stringToBytes('tEXt'));
    chunk.push(...data);
    
    const crc = calculateCrc32([...stringToBytes('tEXt'), ...data]);
    chunk.push(...uint32ToBytes(crc));
    
    return { type: 'tEXt', raw: chunk };
}

// Helper functions
function arrayBufferToBinaryString(buffer) {
    const bytes = new Uint8Array(buffer);
    const binary = [];
    for (let i = 0; i < bytes.byteLength; i++) {
        // Ensure each byte stays within Latin1 range (0-255)
        binary.push(String.fromCharCode(bytes[i] & 0xFF));
    }
    return binary.join('');
}

function sanitizeForExif(text) {
    // Remove non-ASCII characters to prevent encoding errors
    // Replace common special characters with ASCII equivalents
    return text
        .replace(/['']/g, "'")  // Smart quotes to regular quotes
        .replace(/[""]/g, '"')  // Smart double quotes
        .replace(/[–—]/g, '-')  // Em/en dashes to regular dash
        .replace(/…/g, '...')   // Ellipsis
        .replace(/[^\x00-\x7F]/g, '') // Remove any remaining non-ASCII
        .trim();
}

function stringToUtf16Bytes(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        bytes.push(code & 0xFF);
        bytes.push((code >> 8) & 0xFF);
    }
    // Add null terminator
    bytes.push(0, 0);
    return bytes;
}

function stringToBytes(str) {
    return str.split('').map(c => c.charCodeAt(0));
}

function readUint32(array, offset) {
    return (array[offset] << 24) | (array[offset + 1] << 16) | 
           (array[offset + 2] << 8) | array[offset + 3];
}

function uint32ToBytes(num) {
    return [
        (num >>> 24) & 0xFF,
        (num >>> 16) & 0xFF,
        (num >>> 8) & 0xFF,
        num & 0xFF
    ];
}

function calculateCrc32(bytes) {
    let crc = 0xFFFFFFFF;
    const table = getCrc32Table();
    
    for (let i = 0; i < bytes.length; i++) {
        crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xFF];
    }
    
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function getCrc32Table() {
    const table = [];
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c;
    }
    return table;
}

function createReadmeContent(manifest) {
    let content = 'QuickTag Images - Processing Results\n';
    content += '====================================\n\n';
    content += `Processed on: ${new Date(manifest.processedAt).toLocaleString()}\n`;
    content += `Total images processed: ${manifest.totalImages}\n\n`;
    content += 'File Changes:\n';
    content += '-------------\n\n';
    
    manifest.changes.forEach((change, index) => {
        content += `${index + 1}. ${change.originalName} → ${change.newName}\n`;
        content += `   Description: ${change.description}\n`;
        content += `   Folder: ${change.folder || 'Root'}\n\n`;
    });
    
    content += '\n---\n';
    content += 'Generated by QuickTag Images\n';
    content += 'AI-Powered Image Labeling & Organization\n';
    
    return content;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Progress UI functions
function showDownloadProgress() {
    // Create or show a progress modal
    let progressModal = document.getElementById('downloadProgressModal');
    if (!progressModal) {
        progressModal = document.createElement('div');
        progressModal.id = 'downloadProgressModal';
        progressModal.className = 'modal';
        progressModal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <h3 style="margin-bottom: 20px;">Creating Download Package</h3>
                <div class="progress-bar" style="margin-bottom: 16px;">
                    <div class="progress-fill" id="downloadProgressFill" style="width: 0%"></div>
                </div>
                <div id="downloadProgressText" style="text-align: center; font-size: 13px; color: var(--text-secondary);">Preparing...</div>
            </div>
        `;
        document.body.appendChild(progressModal);
    }
    progressModal.style.display = 'flex';
}

function updateDownloadProgress(percentage, text) {
    const fill = document.getElementById('downloadProgressFill');
    const progressText = document.getElementById('downloadProgressText');
    if (fill) fill.style.width = `${percentage}%`;
    if (progressText) progressText.textContent = text;
}

function hideDownloadProgress() {
    const progressModal = document.getElementById('downloadProgressModal');
    if (progressModal) {
        progressModal.style.display = 'none';
    }
}

function exportProcessingLog() {
    const log = appState.processedImages.map(img => 
        `${img.original.file.name} → ${img.newName}\n${img.description}\n---\n`
    ).join('\n');

    const blob = new Blob([log], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `processing-log-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function resetForNewBatch() {
    // Reset all state
    appState.selectedFolders = [];
    appState.allImages = [];
    appState.selectedImages.clear();
    appState.processedImages = [];
    appState.processingStartTime = null;
    appState.processingEndTime = null;
    appState.isProcessing = false;
    appState.shouldStop = false;
    
    // Clean up optimizer resources
    if (appState.imageOptimizer && appState.useOptimizer) {
        appState.imageOptimizer.clearCache();
        if (appState.virtualScroller) {
            appState.virtualScroller.destroy();
            appState.virtualScroller = null;
        }
        hidePerformanceIndicator();
    }
    appState.useOptimizer = false;
    
    // Clear UI elements
    elements.timelineItems.innerHTML = '';
    elements.imageGrid.innerHTML = '';
    elements.imageGrid.className = 'image-grid'; // Reset class
    elements.folderInput.value = '';
    
    // Hide sections — back to the empty onboarding stage
    setStage('empty');
    elements.timelineControls.style.display = 'none';
    elements.currentProcessing.style.display = 'none';
    elements.resultsModal.style.display = 'none';

    // Update folder display
    updateFolderDisplay();
    
    // Reset folder stats
    elements.folderStats.style.display = 'none';
    elements.totalFolders.textContent = '0';
    elements.totalImages.textContent = '0';
}