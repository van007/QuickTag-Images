// QuickTag Images - Performance Optimization Module
// Handles virtual scrolling, lazy loading, thumbnail generation, and memory management

class ImageOptimizer {
    constructor(options = {}) {
        this.options = {
            thumbnailSize: options.thumbnailSize || 150,
            batchSize: options.batchSize || 50,
            visibleBuffer: options.visibleBuffer || 5,
            maxConcurrent: options.maxConcurrent || 5,
            cacheSize: options.cacheSize || 200,
            enableIndexedDB: options.enableIndexedDB !== false,
            virtualScrolling: options.virtualScrolling !== false,
            ...options
        };

        this.imageCache = new Map();
        this.thumbnailCache = new Map();
        this.processingQueue = [];
        this.activeProcessing = 0;
        this.observer = null;
        this.db = null;
        this.virtualScroller = null;
        
        this.initializeIndexedDB();
    }

    // Initialize IndexedDB for persistent thumbnail storage
    async initializeIndexedDB() {
        if (!this.options.enableIndexedDB) return;
        
        try {
            const request = indexedDB.open('QuickTagThumbnails', 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('thumbnails')) {
                    const store = db.createObjectStore('thumbnails', { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.cleanOldThumbnails();
            };
        } catch (error) {
            console.warn('IndexedDB not available:', error);
            this.options.enableIndexedDB = false;
        }
    }

    // Clean thumbnails older than 7 days
    async cleanOldThumbnails() {
        if (!this.db) return;
        
        const transaction = this.db.transaction(['thumbnails'], 'readwrite');
        const store = transaction.objectStore('thumbnails');
        const index = store.index('timestamp');
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        const range = IDBKeyRange.upperBound(weekAgo);
        const request = index.openCursor(range);
        
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                store.delete(cursor.primaryKey);
                cursor.continue();
            }
        };
    }

    // Generate thumbnail using canvas
    async generateThumbnail(file) {
        const cacheKey = `${file.name}-${file.lastModified}`;
        
        // Check memory cache first
        if (this.thumbnailCache.has(cacheKey)) {
            return this.thumbnailCache.get(cacheKey);
        }
        
        // Check IndexedDB cache
        const cached = await this.getThumbnailFromDB(cacheKey);
        if (cached) {
            this.thumbnailCache.set(cacheKey, cached);
            return cached;
        }
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const reader = new FileReader();
            
            reader.onload = (e) => {
                img.onload = () => {
                    const size = this.options.thumbnailSize;
                    
                    // Calculate dimensions maintaining aspect ratio
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > size) {
                            height = height * (size / width);
                            width = size;
                        }
                    } else {
                        if (height > size) {
                            width = width * (size / height);
                            height = size;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Use better image smoothing
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
                    
                    // Cache in memory (with size limit)
                    if (this.thumbnailCache.size >= this.options.cacheSize) {
                        const firstKey = this.thumbnailCache.keys().next().value;
                        this.thumbnailCache.delete(firstKey);
                    }
                    this.thumbnailCache.set(cacheKey, thumbnailUrl);
                    
                    // Save to IndexedDB
                    this.saveThumbnailToDB(cacheKey, thumbnailUrl);
                    
                    resolve(thumbnailUrl);
                };
                
                img.onerror = () => {
                    reject(new Error('Failed to load image'));
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Save thumbnail to IndexedDB
    async saveThumbnailToDB(id, dataUrl) {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction(['thumbnails'], 'readwrite');
            const store = transaction.objectStore('thumbnails');
            store.put({
                id: id,
                data: dataUrl,
                timestamp: Date.now()
            });
        } catch (error) {
            console.warn('Failed to save thumbnail to DB:', error);
        }
    }

    // Get thumbnail from IndexedDB
    async getThumbnailFromDB(id) {
        if (!this.db) return null;
        
        return new Promise((resolve) => {
            try {
                const transaction = this.db.transaction(['thumbnails'], 'readonly');
                const store = transaction.objectStore('thumbnails');
                const request = store.get(id);
                
                request.onsuccess = () => {
                    resolve(request.result?.data || null);
                };
                
                request.onerror = () => {
                    resolve(null);
                };
            } catch (error) {
                resolve(null);
            }
        });
    }

    // Virtual Scroller implementation
    createVirtualScroller(container, items, renderItem) {
        this.virtualScroller = new VirtualScroller(
            container,
            items,
            renderItem,
            {
                itemHeight: 200,
                buffer: this.options.visibleBuffer,
                batchSize: this.options.batchSize
            }
        );
        return this.virtualScroller;
    }

    // Lazy loading with Intersection Observer
    setupLazyLoading(container, loadCallback) {
        if (this.observer) {
            this.observer.disconnect();
        }
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    if (element.dataset.imageId && !element.dataset.loaded) {
                        loadCallback(element);
                        element.dataset.loaded = 'true';
                    }
                }
            });
        }, {
            root: container,
            rootMargin: '50px',
            threshold: 0.01
        });
        
        return this.observer;
    }

    // Process images in batches
    async processBatch(images, processCallback, progressCallback) {
        const batches = [];
        for (let i = 0; i < images.length; i += this.options.batchSize) {
            batches.push(images.slice(i, i + this.options.batchSize));
        }
        
        let processed = 0;
        for (const batch of batches) {
            await Promise.all(
                batch.map(async (image) => {
                    await this.addToQueue(async () => {
                        await processCallback(image);
                        processed++;
                        if (progressCallback) {
                            progressCallback(processed, images.length);
                        }
                    });
                })
            );
        }
    }

    // Queue management for concurrent processing
    async addToQueue(task) {
        return new Promise((resolve, reject) => {
            const runTask = async () => {
                if (this.activeProcessing >= this.options.maxConcurrent) {
                    this.processingQueue.push(runTask);
                    return;
                }
                
                this.activeProcessing++;
                try {
                    const result = await task();
                    resolve(result);
                } catch (error) {
                    reject(error);
                } finally {
                    this.activeProcessing--;
                    if (this.processingQueue.length > 0) {
                        const nextTask = this.processingQueue.shift();
                        nextTask();
                    }
                }
            };
            
            runTask();
        });
    }

    // Memory management
    clearCache() {
        this.imageCache.clear();
        this.thumbnailCache.clear();
        if (this.virtualScroller) {
            this.virtualScroller.destroy();
        }
        if (this.observer) {
            this.observer.disconnect();
        }
    }

    // Get memory usage estimate
    getMemoryUsage() {
        let size = 0;
        
        // Estimate cache sizes
        this.thumbnailCache.forEach(value => {
            size += value.length; // Data URL string length
        });
        
        this.imageCache.forEach(value => {
            if (value instanceof ArrayBuffer) {
                size += value.byteLength;
            } else if (typeof value === 'string') {
                size += value.length;
            }
        });
        
        return {
            bytes: size,
            mb: (size / 1024 / 1024).toFixed(2),
            thumbnailCount: this.thumbnailCache.size,
            imageCount: this.imageCache.size
        };
    }
}

// Virtual Scroller Class
class VirtualScroller {
    constructor(container, items, renderItem, options = {}) {
        this.container = container;
        this.items = items;
        this.renderItem = renderItem;
        this.options = {
            itemHeight: options.itemHeight || 200,
            buffer: options.buffer || 5,
            batchSize: options.batchSize || 20,
            ...options
        };
        
        this.scrollTop = 0;
        this.visibleStart = 0;
        this.visibleEnd = 0;
        this.renderedItems = new Map();
        
        this.init();
    }

    init() {
        // Create scroll container structure
        this.viewport = document.createElement('div');
        this.viewport.className = 'virtual-scroll-viewport';
        this.viewport.style.height = '100%';
        this.viewport.style.overflow = 'auto';
        this.viewport.style.position = 'relative';
        
        this.spacer = document.createElement('div');
        this.spacer.style.height = `${this.items.length * this.options.itemHeight}px`;
        this.spacer.style.position = 'relative';
        
        this.content = document.createElement('div');
        this.content.className = 'virtual-scroll-content';
        this.content.style.position = 'absolute';
        this.content.style.top = '0';
        this.content.style.left = '0';
        this.content.style.right = '0';
        
        this.spacer.appendChild(this.content);
        this.viewport.appendChild(this.spacer);
        
        // Replace container content
        this.container.innerHTML = '';
        this.container.appendChild(this.viewport);
        
        // Setup scroll listener with debouncing
        let scrollTimeout;
        this.viewport.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => this.onScroll(), 16);
        });
        
        // Initial render
        this.render();
    }

    onScroll() {
        this.scrollTop = this.viewport.scrollTop;
        this.render();
    }

    render() {
        const viewportHeight = this.viewport.clientHeight;
        
        // Calculate visible range with buffer
        this.visibleStart = Math.max(0, 
            Math.floor(this.scrollTop / this.options.itemHeight) - this.options.buffer
        );
        this.visibleEnd = Math.min(this.items.length - 1,
            Math.ceil((this.scrollTop + viewportHeight) / this.options.itemHeight) + this.options.buffer
        );
        
        // Remove items outside visible range
        for (const [index, element] of this.renderedItems) {
            if (index < this.visibleStart || index > this.visibleEnd) {
                element.remove();
                this.renderedItems.delete(index);
            }
        }
        
        // Add items in visible range
        for (let i = this.visibleStart; i <= this.visibleEnd; i++) {
            if (!this.renderedItems.has(i)) {
                const item = this.items[i];
                const element = this.renderItem(item, i);
                element.style.position = 'absolute';
                element.style.top = `${i * this.options.itemHeight}px`;
                element.style.left = '0';
                element.style.right = '0';
                element.style.height = `${this.options.itemHeight}px`;
                
                this.content.appendChild(element);
                this.renderedItems.set(i, element);
            }
        }
    }

    scrollToIndex(index) {
        const scrollTop = index * this.options.itemHeight;
        this.viewport.scrollTop = scrollTop;
    }

    updateItems(items) {
        this.items = items;
        this.spacer.style.height = `${this.items.length * this.options.itemHeight}px`;
        this.render();
    }

    destroy() {
        this.renderedItems.clear();
        this.container.innerHTML = '';
    }
}

// Utility functions
class ImageOptimizerUtils {
    // Create placeholder element
    static createPlaceholder(width = 150, height = 150) {
        const placeholder = document.createElement('div');
        placeholder.className = 'image-placeholder';
        placeholder.style.width = `${width}px`;
        placeholder.style.height = `${height}px`;
        placeholder.innerHTML = `
            <div class="placeholder-shimmer">
                <div class="shimmer"></div>
            </div>
        `;
        return placeholder;
    }

    // Format file size
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Debounce function
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Check if browser supports required features
    static checkBrowserSupport() {
        const support = {
            intersectionObserver: 'IntersectionObserver' in window,
            indexedDB: 'indexedDB' in window,
            canvas: !!document.createElement('canvas').getContext,
            fileReader: typeof FileReader !== 'undefined',
            weakMap: typeof WeakMap !== 'undefined'
        };
        
        support.allFeatures = Object.values(support).every(v => v);
        return support;
    }
}

// Export for use in main app
window.ImageOptimizer = ImageOptimizer;
window.VirtualScroller = VirtualScroller;
window.ImageOptimizerUtils = ImageOptimizerUtils;