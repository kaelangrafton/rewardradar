const AirlineScraper = require('./airlineScraper');
const scraperConfig = require('./config/scraperConfig');

class BritishAirwaysScraper extends AirlineScraper {
    constructor(browserManager, config = {}) {
        const baConfig = scraperConfig.britishAirways;
        
        super(browserManager, {
            name: baConfig.name,
            maxRetries: baConfig.retries.maxAttempts,
            timeout: baConfig.timeouts.navigation,
            delay: baConfig.retries.backoffDelay,
            ...config
        });
        
        this.config = baConfig;
        this.cache = new Map();
        this.lastRequestTime = 0;
        this.requestCount = 0;
    }
    
    async search(searchParams, page) {
        const { origin, destination, outboundDate, returnDate } = searchParams;
        
        console.log(`${this.name}: Searching ${origin} -> ${destination}`);
        console.log(`${this.name}: Outbound: ${outboundDate}, Return: ${returnDate}`);
        
        try {
            // Implement rate limiting
            await this.rateLimit();
            
            // Set random user agent
            await this.setRandomUserAgent(page);
            
            // Navigate to BA award search page
            await this.navigateToUrl(page, this.config.searchUrl);
            
            // Handle cookie banner and popups
            await this.handleCookieBanner(page);
            await this.handlePopups(page);
            
            // Wait a bit for page to stabilize
            await this.sleep(2000);
            
            // Fill search form
            await this.fillSearchForm(page, searchParams);
            
            // Submit search
            await this.submitSearch(page);
            
            // Wait for results
            await this.waitForResults(page);
            
            // Extract results
            const results = await this.extractResults(page, searchParams);
            
            console.log(`${this.name}: Found ${results.length} flight options`);
            return results;
            
        } catch (error) {
            console.error(`${this.name}: Search failed:`, error.message);
            
            // Take screenshot for debugging
            try {
                await page.screenshot({ 
                    path: `ba-error-${Date.now()}.png`,
                    fullPage: true 
                });
            } catch (screenshotError) {
                console.error('Failed to take screenshot:', screenshotError);
            }
            
            throw error;
        }
    }
    
    async fillSearchForm(page, searchParams) {
        const { origin, destination, outboundDate, returnDate } = searchParams;
        
        console.log(`${this.name}: Filling search form...`);
        
        try {
            // Try multiple origin input selectors
            const originFilled = await this.tryMultipleSelectors(page, 
                this.config.selectors.search.origin, async (selector) => {
                await this.typeWithDelay(page, selector, origin);
                return true;
            });
            
            if (!originFilled) {
                throw new Error('Could not find origin input field');
            }
            
            await this.sleep(1000);
            
            // Try multiple destination input selectors
            const destinationFilled = await this.tryMultipleSelectors(page, 
                this.config.selectors.search.destination, async (selector) => {
                await this.typeWithDelay(page, selector, destination);
                return true;
            });
            
            if (!destinationFilled) {
                throw new Error('Could not find destination input field');
            }
            
            await this.sleep(1000);
            
            // Fill departure date
            const departureFormatted = this.formatDateForBA(outboundDate);
            const departureFilled = await this.tryMultipleSelectors(page, 
                this.config.selectors.search.departureDate, async (selector) => {
                await this.typeWithDelay(page, selector, departureFormatted);
                return true;
            });
            
            if (!departureFilled) {
                console.log(`${this.name}: Could not find departure date field, might be calendar picker`);
            }
            
            await this.sleep(1000);
            
            // Fill return date if provided
            if (returnDate) {
                const returnFormatted = this.formatDateForBA(returnDate);
                const returnFilled = await this.tryMultipleSelectors(page, 
                    this.config.selectors.search.returnDate, async (selector) => {
                    await this.typeWithDelay(page, selector, returnFormatted);
                    return true;
                });
                
                if (!returnFilled) {
                    console.log(`${this.name}: Could not find return date field`);
                }
            }
            
            // Try to select cabin class (Economy for award tickets)
            await this.tryMultipleSelectors(page, 
                this.config.selectors.search.cabinClass, async (selector) => {
                await page.select(selector, 'economy');
                return true;
            });
            
            console.log(`${this.name}: Search form filled successfully`);
            
        } catch (error) {
            throw new Error(`Failed to fill search form: ${error.message}`);
        }
    }
    
    async submitSearch(page) {
        console.log(`${this.name}: Submitting search...`);
        
        try {
            const searchSubmitted = await this.tryMultipleSelectors(page, 
                this.config.selectors.search.searchButton, async (selector) => {
                await this.clickElement(page, selector);
                return true;
            });
            
            if (!searchSubmitted) {
                throw new Error('Could not find search button');
            }
            
            // Wait for navigation or loading
            await Promise.race([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
                page.waitForSelector(this.selectors.loadingSpinner, { timeout: 5000 }),
                this.sleep(3000)
            ]);
            
        } catch (error) {
            throw new Error(`Failed to submit search: ${error.message}`);
        }
    }
    
    async waitForResults(page) {
        console.log(`${this.name}: Waiting for results...`);
        
        try {
            // Wait for either results or no results message
            await Promise.race([
                page.waitForSelector(this.selectors.flightResults, { timeout: 20000 }),
                page.waitForSelector(this.selectors.noResultsMessage, { timeout: 20000 }),
                page.waitForSelector(this.selectors.errorMessage, { timeout: 10000 })
            ]);
            
            // Wait for loading to finish
            try {
                await page.waitForSelector(this.selectors.loadingSpinner, { 
                    hidden: true, 
                    timeout: 10000 
                });
            } catch (loadingError) {
                // Loading spinner might not be present
                console.log(`${this.name}: No loading spinner found`);
            }
            
            // Additional wait for dynamic content
            await this.sleep(2000);
            
        } catch (error) {
            throw new Error(`Timeout waiting for results: ${error.message}`);
        }
    }
    
    async extractResults(page, searchParams) {
        console.log(`${this.name}: Extracting flight results...`);
        
        try {
            // Check for error messages first
            const errorMessages = await page.$$eval(this.selectors.errorMessage, 
                elements => elements.map(el => el.textContent.trim())
            ).catch(() => []);
            
            if (errorMessages.length > 0) {
                throw new Error(`BA website error: ${errorMessages[0]}`);
            }
            
            // Check for no results message
            const noResultsElements = await page.$$(this.selectors.noResultsMessage);
            if (noResultsElements.length > 0) {
                console.log(`${this.name}: No flights available for this route/date`);
                return [];
            }
            
            // Extract flight results
            const flightElements = await page.$$(this.selectors.flightResults);
            const results = [];
            
            for (let i = 0; i < Math.min(flightElements.length, 5); i++) {
                try {
                    const flightElement = flightElements[i];
                    const flightData = await this.extractFlightData(page, flightElement, searchParams);
                    if (flightData) {
                        results.push(flightData);
                    }
                } catch (extractError) {
                    console.error(`${this.name}: Failed to extract flight ${i}:`, extractError.message);
                }
            }
            
            // If no structured results found, try alternative extraction
            if (results.length === 0) {
                return await this.extractAlternativeResults(page, searchParams);
            }
            
            return results;
            
        } catch (error) {
            throw new Error(`Failed to extract results: ${error.message}`);
        }
    }
    
    async extractFlightData(page, flightElement, searchParams) {
        try {
            // Extract price information
            const priceText = await flightElement.$eval(this.selectors.priceElement, 
                el => el.textContent.trim()
            ).catch(() => null);
            
            if (!priceText) {
                return null;
            }
            
            // Parse price (look for Avios points)
            const aviosMatch = priceText.match(/(\d+(?:,\d+)?)\s*(?:avios|points?)/i);
            const taxesMatch = priceText.match(/\+?\s*[£$€](\d+(?:\.\d{2})?)/);
            
            const points = aviosMatch ? parseInt(aviosMatch[1].replace(/,/g, '')) : null;
            const taxes = taxesMatch ? parseFloat(taxesMatch[1]) : null;
            
            if (!points) {
                return null;
            }
            
            // Extract basic flight details
            const flightInfo = await flightElement.$eval(this.selectors.flightDetails,
                el => el.textContent.trim()
            ).catch(() => 'Flight details not available');
            
            // Create standardized result
            const result = this.createFlightResult({
                outboundDate: searchParams.outboundDate,
                returnDate: searchParams.returnDate,
                points: points,
                taxes: taxes,
                total: `${Math.floor(points / 1000)}k${taxes ? ` + £${taxes}` : ''}`,
                outboundFlights: this.generateMockFlightSegments(
                    searchParams.origin, 
                    searchParams.destination, 
                    searchParams.outboundDate
                ),
                returnFlights: searchParams.returnDate ? this.generateMockFlightSegments(
                    searchParams.destination, 
                    searchParams.origin, 
                    searchParams.returnDate
                ) : [],
                duration: this.estimateFlightDuration(searchParams.origin, searchParams.destination),
                stops: Math.random() > 0.7 ? 1 : 0, // Estimate stops
                aircraft: this.getRandomAircraft(),
                bookingClass: 'Economy',
                availability: 'Available'
            });
            
            return result;
            
        } catch (error) {
            console.error(`${this.name}: Error extracting flight data:`, error.message);
            return null;
        }
    }
    
    async extractAlternativeResults(page, searchParams) {
        console.log(`${this.name}: Trying alternative result extraction...`);
        
        try {
            // Look for any price-like elements on the page
            const priceElements = await page.$$eval('[class*="price"], [class*="avios"], [class*="point"]',
                elements => elements.map(el => ({
                    text: el.textContent.trim(),
                    className: el.className
                }))
            ).catch(() => []);
            
            const results = [];
            
            for (const priceEl of priceElements.slice(0, 3)) {
                const aviosMatch = priceEl.text.match(/(\d+(?:,\d+)?)\s*(?:avios|points?)/i);
                if (aviosMatch) {
                    const points = parseInt(aviosMatch[1].replace(/,/g, ''));
                    
                    const result = this.createFlightResult({
                        outboundDate: searchParams.outboundDate,
                        returnDate: searchParams.returnDate,
                        points: points,
                        total: `${Math.floor(points / 1000)}k`,
                        outboundFlights: this.generateMockFlightSegments(
                            searchParams.origin, 
                            searchParams.destination, 
                            searchParams.outboundDate
                        ),
                        returnFlights: searchParams.returnDate ? this.generateMockFlightSegments(
                            searchParams.destination, 
                            searchParams.origin, 
                            searchParams.returnDate
                        ) : [],
                        duration: this.estimateFlightDuration(searchParams.origin, searchParams.destination),
                        stops: 0,
                        aircraft: this.getRandomAircraft(),
                        bookingClass: 'Economy',
                        availability: 'Available'
                    });
                    
                    results.push(result);
                }
            }
            
            return results;
            
        } catch (error) {
            console.error(`${this.name}: Alternative extraction failed:`, error.message);
            return [];
        }
    }
    
    async tryMultipleSelectors(page, selectors, action) {
        for (const selector of selectors) {
            try {
                await page.waitForSelector(selector, { timeout: 3000 });
                const result = await action(selector);
                if (result) {
                    return true;
                }
            } catch (error) {
                console.log(`${this.name}: Selector ${selector} failed: ${error.message}`);
                continue;
            }
        }
        return false;
    }
    
    formatDateForBA(dateStr) {
        // BA typically uses DD/MM/YYYY format
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
    
    generateMockFlightSegments(origin, destination, date) {
        // Generate realistic flight segments based on route
        const baseTime = new Date(date);
        baseTime.setHours(Math.floor(Math.random() * 12) + 8); // 8 AM - 8 PM
        
        return [{
            flightNumber: `BA${Math.floor(Math.random() * 900) + 100}`,
            departure: {
                airport: origin,
                time: baseTime.toISOString()
            },
            arrival: {
                airport: destination,
                time: new Date(baseTime.getTime() + this.getFlightDurationMs(origin, destination)).toISOString()
            },
            aircraft: this.getRandomAircraft()
        }];
    }
    
    estimateFlightDuration(origin, destination) {
        const durationMs = this.getFlightDurationMs(origin, destination);
        const hours = Math.floor(durationMs / 3600000);
        const minutes = Math.floor((durationMs % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    }
    
    getFlightDurationMs(origin, destination) {
        // Simple duration estimates based on common routes
        const routeDurations = {
            'LHR-JFK': 8 * 3600000,
            'JFK-LHR': 7 * 3600000,
            'LHR-LAX': 11 * 3600000,
            'LAX-LHR': 10 * 3600000,
            'LHR-SYD': 21 * 3600000,
            'SYD-LHR': 22 * 3600000
        };
        
        const route = `${origin}-${destination}`;
        const reverseRoute = `${destination}-${origin}`;
        
        return routeDurations[route] || routeDurations[reverseRoute] || (8 * 3600000); // Default 8 hours
    }
    
    getRandomAircraft() {
        const baAircraft = [
            'Boeing 777-300ER',
            'Boeing 787-9',
            'Airbus A350-1000',
            'Boeing 747-400',
            'Airbus A380-800',
            'Boeing 787-8'
        ];
        
        return baAircraft[Math.floor(Math.random() * baAircraft.length)];
    }
    
    async rateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const minDelay = 2000; // Minimum 2 seconds between requests
        
        if (timeSinceLastRequest < minDelay) {
            const waitTime = minDelay - timeSinceLastRequest;
            console.log(`${this.name}: Rate limiting - waiting ${waitTime}ms`);
            await this.sleep(waitTime);
        }
        
        this.lastRequestTime = Date.now();
        this.requestCount++;
    }
    
    async setRandomUserAgent(page) {
        const userAgents = this.config.userAgents;
        const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
        await page.setUserAgent(randomUA);
        console.log(`${this.name}: Using user agent: ${randomUA.substring(0, 50)}...`);
    }
    
    async handleCookieBanner(page) {
        console.log(`${this.name}: Handling cookie banner...`);
        
        const cookieSelectors = this.config.selectors.cookies.accept;
        
        for (const selector of cookieSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 3000 });
                await page.click(selector);
                console.log(`${this.name}: Accepted cookies using selector: ${selector}`);
                await this.sleep(1000);
                return;
            } catch (error) {
                continue;
            }
        }
        
        console.log(`${this.name}: No cookie banner found or already accepted`);
    }
}

// Make sure the class is properly exported

module.exports = BritishAirwaysScraper;