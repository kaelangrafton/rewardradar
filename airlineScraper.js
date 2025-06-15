class AirlineScraper {
    constructor(browserManager, config = {}) {
        this.browserManager = browserManager;
        this.name = config.name || 'Unknown';
        this.maxRetries = config.maxRetries || 3;
        this.timeout = config.timeout || 30000;
        this.delay = config.delay || 1000;
    }
    
    async search(searchParams) {
        throw new Error('search method must be implemented by subclass');
    }
    
    async executeWithRetry(searchParams) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            console.log(`${this.name}: Attempt ${attempt}/${this.maxRetries}`);
            
            let page = null;
            try {
                page = await this.browserManager.getPage();
                
                // Set timeout for the page
                page.setDefaultTimeout(this.timeout);
                
                const result = await this.search(searchParams, page);
                
                console.log(`${this.name}: Search completed successfully`);
                return {
                    success: true,
                    data: result,
                    airline: this.name,
                    attempt: attempt
                };
                
            } catch (error) {
                lastError = error;
                console.error(`${this.name}: Attempt ${attempt} failed:`, error.message);
                
                // Take screenshot on error (in development)
                if (page && process.env.NODE_ENV === 'development') {
                    try {
                        await page.screenshot({ 
                            path: `error-${this.name}-${Date.now()}.png`,
                            fullPage: true 
                        });
                    } catch (screenshotError) {
                        console.error('Failed to take error screenshot:', screenshotError);
                    }
                }
                
                // Exponential backoff
                if (attempt < this.maxRetries) {
                    const backoffDelay = this.delay * Math.pow(2, attempt - 1);
                    console.log(`${this.name}: Waiting ${backoffDelay}ms before retry...`);
                    await this.sleep(backoffDelay);
                }
                
            } finally {
                if (page) {
                    this.browserManager.releasePage(page);
                }
            }
        }
        
        console.error(`${this.name}: All attempts failed`);
        return {
            success: false,
            error: lastError?.message || 'Unknown error',
            airline: this.name,
            attempts: this.maxRetries
        };
    }
    
    async navigateToUrl(page, url) {
        console.log(`${this.name}: Navigating to ${url}`);
        
        try {
            await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: this.timeout 
            });
            
            // Random delay to appear more human
            await this.sleep(Math.random() * 2000 + 1000);
            
        } catch (error) {
            throw new Error(`Navigation failed: ${error.message}`);
        }
    }
    
    async waitForElement(page, selector, timeout = 10000) {
        try {
            await page.waitForSelector(selector, { timeout });
        } catch (error) {
            throw new Error(`Element not found: ${selector}`);
        }
    }
    
    async typeWithDelay(page, selector, text) {
        await this.waitForElement(page, selector);
        
        // Clear existing text
        await page.click(selector);
        await page.keyboard.down('Control');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        
        // Type with human-like delays
        for (const char of text) {
            await page.type(selector, char, { delay: Math.random() * 100 + 50 });
        }
        
        await this.sleep(500);
    }
    
    async clickElement(page, selector) {
        await this.waitForElement(page, selector);
        
        // Random delay before click
        await this.sleep(Math.random() * 1000 + 500);
        
        await page.click(selector);
        
        // Random delay after click
        await this.sleep(Math.random() * 1000 + 500);
    }
    
    async handleCookieBanner(page) {
        const cookieSelectors = [
            '[data-testid="cookie-accept"]',
            '#cookie-accept',
            '.cookie-accept',
            'button[aria-label*="accept"]',
            'button[aria-label*="Accept"]',
            'button:contains("Accept")',
            'button:contains("OK")',
            'button:contains("Agree")'
        ];
        
        for (const selector of cookieSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 2000 });
                await page.click(selector);
                console.log(`${this.name}: Accepted cookies using selector: ${selector}`);
                await this.sleep(1000);
                break;
            } catch (error) {
                // Continue to next selector
            }
        }
    }
    
    async handlePopups(page) {
        // Handle common popup patterns
        const popupSelectors = [
            '[data-testid="modal-close"]',
            '.modal-close',
            '.popup-close',
            'button[aria-label*="close"]',
            'button[aria-label*="Close"]',
            '.close-button'
        ];
        
        for (const selector of popupSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 1000 });
                await page.click(selector);
                console.log(`${this.name}: Closed popup using selector: ${selector}`);
                await this.sleep(500);
            } catch (error) {
                // Continue to next selector
            }
        }
    }
    
    formatDateForInput(date, format = 'YYYY-MM-DD') {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        switch (format) {
            case 'MM/DD/YYYY':
                return `${month}/${day}/${year}`;
            case 'DD/MM/YYYY':
                return `${day}/${month}/${year}`;
            default:
                return `${year}-${month}-${day}`;
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Standardized data format for all airlines
    createFlightResult(data) {
        return {
            airline: this.name,
            outboundDate: data.outboundDate,
            returnDate: data.returnDate,
            price: {
                points: data.points || null,
                cash: data.cash || null,
                taxes: data.taxes || null,
                total: data.total || null
            },
            flights: {
                outbound: data.outboundFlights || [],
                return: data.returnFlights || []
            },
            duration: data.duration || null,
            stops: data.stops || 0,
            aircraft: data.aircraft || null,
            bookingClass: data.bookingClass || null,
            availability: data.availability || 'unknown'
        };
    }
}

module.exports = AirlineScraper;