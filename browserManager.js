const puppeteer = require('puppeteer');

class BrowserManager {
    constructor() {
        this.browsers = [];
        this.availablePages = [];
        this.busyPages = new Set();
        this.maxBrowsers = 3;
        this.maxPagesPerBrowser = 4;
        this.requestQueue = [];
        this.isProcessingQueue = false;
    }
    
    async initialize() {
        console.log('Initializing browser manager...');
        
        try {
            // Create initial browser
            const browser = await this.createBrowser();
            this.browsers.push(browser);
            
            // Pre-warm some pages
            await this.createPages(browser, 2);
            
            console.log(`Browser manager initialized with ${this.availablePages.length} available pages`);
        } catch (error) {
            console.error('Failed to initialize browser manager:', error);
            throw error;
        }
    }
    
    async createBrowser() {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        });
        
        // Handle browser disconnect
        browser.on('disconnected', () => {
            console.log('Browser disconnected, removing from pool');
            this.browsers = this.browsers.filter(b => b !== browser);
        });
        
        return browser;
    }
    
    async createPages(browser, count) {
        const pages = [];
        for (let i = 0; i < count; i++) {
            try {
                const page = await browser.newPage();
                
                // Set user agent
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                
                // Set viewport
                await page.setViewport({ width: 1920, height: 1080 });
                
                // Disable images and CSS for faster loading (can be overridden)
                await page.setRequestInterception(true);
                page.on('request', (request) => {
                    const resourceType = request.resourceType();
                    if (['image', 'stylesheet', 'font'].includes(resourceType)) {
                        request.abort();
                    } else {
                        request.continue();
                    }
                });
                
                pages.push(page);
                this.availablePages.push(page);
            } catch (error) {
                console.error('Failed to create page:', error);
            }
        }
        return pages;
    }
    
    async getPage() {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ resolve, reject });
            this.processQueue();
        });
    }
    
    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();
            
            try {
                let page = null;
                
                // Try to get an available page
                if (this.availablePages.length > 0) {
                    page = this.availablePages.pop();
                } else {
                    // Try to create more pages if we haven't hit limits
                    page = await this.createNewPage();
                }
                
                if (page) {
                    this.busyPages.add(page);
                    request.resolve(page);
                } else {
                    // No pages available, reject or wait
                    request.reject(new Error('No browser pages available'));
                }
            } catch (error) {
                request.reject(error);
            }
        }
        
        this.isProcessingQueue = false;
    }
    
    async createNewPage() {
        // Find browser with capacity
        for (const browser of this.browsers) {
            try {
                const pages = await browser.pages();
                if (pages.length < this.maxPagesPerBrowser) {
                    const newPages = await this.createPages(browser, 1);
                    return newPages[0];
                }
            } catch (error) {
                console.error('Error checking browser pages:', error);
            }
        }
        
        // Create new browser if under limit
        if (this.browsers.length < this.maxBrowsers) {
            try {
                const browser = await this.createBrowser();
                this.browsers.push(browser);
                const newPages = await this.createPages(browser, 1);
                return newPages[0];
            } catch (error) {
                console.error('Error creating new browser:', error);
            }
        }
        
        return null;
    }
    
    releasePage(page) {
        if (this.busyPages.has(page)) {
            this.busyPages.delete(page);
            
            // Reset page state
            page.goto('about:blank').catch(() => {});
            
            this.availablePages.push(page);
            
            // Process any queued requests
            if (this.requestQueue.length > 0) {
                setImmediate(() => this.processQueue());
            }
        }
    }
    
    async cleanup() {
        console.log('Cleaning up browser manager...');
        
        for (const browser of this.browsers) {
            try {
                await browser.close();
            } catch (error) {
                console.error('Error closing browser:', error);
            }
        }
        
        this.browsers = [];
        this.availablePages = [];
        this.busyPages.clear();
        this.requestQueue = [];
    }
    
    getStats() {
        return {
            browsers: this.browsers.length,
            availablePages: this.availablePages.length,
            busyPages: this.busyPages.size,
            queuedRequests: this.requestQueue.length
        };
    }
}

module.exports = BrowserManager;