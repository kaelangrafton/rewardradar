const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const BrowserManager = require('./browserManager');
const MockAirlineScraper = require('./mockAirlineScraper');
const BritishAirwaysScraper = require('./britishAirwaysScraper');
const DataStandardizer = require('./dataStandardizer');

const app = express();
const PORT = 3000;

// Initialize browser manager and scrapers
let browserManager;
let scrapers = [];
let dataStandardizer;

async function initializeScrapers() {
    console.log('Initializing browser automation...');
    
    browserManager = new BrowserManager();
    await browserManager.initialize();
    
    dataStandardizer = new DataStandardizer();
    
    // Create mix of real and mock scrapers
    scrapers = [
        // Real airline scraper
        new BritishAirwaysScraper(browserManager, {
            timeout: 60000, // Longer timeout for real scraper
            maxRetries: 2    // Fewer retries to avoid being blocked
        }),
        
        // Mock scrapers for testing and comparison
        new MockAirlineScraper(browserManager, { 
            name: 'Emirates (Demo)', 
            failureRate: 0.1,
            responseTime: { min: 2000, max: 4000 }
        }),
        new MockAirlineScraper(browserManager, { 
            name: 'Qatar Airways (Demo)', 
            failureRate: 0.15,
            responseTime: { min: 1500, max: 3500 }
        })
    ];
    
    console.log(`Initialized ${scrapers.length} airline scrapers (${scrapers.filter(s => s.name === 'British Airways').length} real, ${scrapers.length - 1} mock)`);
}

app.use(express.static('.'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Server-Sent Events endpoint for progressive loading
app.post('/api/search-stream', async (req, res) => {
    const { origin, destination, centerDate } = req.body;
    
    console.log(`SSE Search request received: ${origin} -> ${destination}, center date: ${centerDate}`);
    
    if (!origin || !destination || !centerDate) {
        return res.status(400).json({
            error: 'Origin, destination, and center date are required'
        });
    }
    
    if (!browserManager || scrapers.length === 0) {
        return res.status(503).json({
            error: 'Browser automation not initialized'
        });
    }
    
    // Set up SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    // Send initial status
    res.write(`data: ${JSON.stringify({
        type: 'status',
        message: 'Starting search...',
        timestamp: new Date().toISOString()
    })}\n\n`);
    
    try {
        // Generate date grid
        const DateGrid = require('./dateGrid');
        const dateGridGen = new DateGrid();
        const gridData = dateGridGen.generateDateGrid(centerDate);
        
        // Sample date combinations for demo
        const sampleCombos = [];
        gridData.forEach((row, rowIndex) => {
            row.forEach((dateCombo, colIndex) => {
                if ((rowIndex + colIndex) % 4 === 0) { // Sample every 4th combination
                    sampleCombos.push(dateCombo);
                }
            });
        });
        
        res.write(`data: ${JSON.stringify({
            type: 'progress',
            message: `Searching ${sampleCombos.length} date combinations across ${scrapers.length} airlines...`,
            totalCombinations: sampleCombos.length,
            totalAirlines: scrapers.length
        })}\n\n`);
        
        let completedSearches = 0;
        const results = new Map();
        
        // Run searches in parallel for each scraper
        const searchPromises = scrapers.map(async (scraper, scraperIndex) => {
            res.write(`data: ${JSON.stringify({
                type: 'airline-status',
                airline: scraper.name,
                status: 'starting',
                message: `${scraper.name}: Starting search...`
            })}\n\n`);
            
            for (const dateCombo of sampleCombos) {
                const searchParams = {
                    origin: origin.toUpperCase(),
                    destination: destination.toUpperCase(),
                    outboundDate: dateCombo.outboundStr,
                    returnDate: dateCombo.returnStr
                };
                
                try {
                    const result = await scraper.executeWithRetry(searchParams);
                    
                    if (result.success && result.data.length > 0) {
                        // Standardize the data
                        const standardizedResults = result.data.map(flight => 
                            dataStandardizer.standardizeFlightResult(flight, scraper.name)
                        ).filter(flight => flight !== null);
                        
                        if (standardizedResults.length > 0) {
                            const cheapestFlight = standardizedResults[0];
                            const price = cheapestFlight.pricing?.total?.display || 'Price not available';
                            
                            // Check if this is better than existing result for this date combo
                            const existingResult = results.get(dateCombo.key);
                            if (!existingResult || shouldUpdatePrice(price, existingResult.price)) {
                                results.set(dateCombo.key, {
                                    key: dateCombo.key,
                                    price: price,
                                    airline: scraper.name,
                                    outbound: dateCombo.outboundStr,
                                    return: dateCombo.returnStr,
                                    fullData: cheapestFlight,
                                    standardized: true
                                });
                                
                                // Send real-time update
                                res.write(`data: ${JSON.stringify({
                                    type: 'result-update',
                                    key: dateCombo.key,
                                    price: price,
                                    airline: scraper.name,
                                    outbound: dateCombo.outboundStr,
                                    return: dateCombo.returnStr,
                                    points: cheapestFlight.pricing?.points?.amount,
                                    standardized: true
                                })}\n\n`);
                            }
                        }
                    }
                    
                    completedSearches++;
                    res.write(`data: ${JSON.stringify({
                        type: 'progress-update',
                        completed: completedSearches,
                        total: sampleCombos.length * scrapers.length,
                        percentage: Math.round((completedSearches / (sampleCombos.length * scrapers.length)) * 100)
                    })}\n\n`);
                    
                } catch (error) {
                    console.error(`${scraper.name} search failed for ${dateCombo.key}:`, error);
                    res.write(`data: ${JSON.stringify({
                        type: 'error',
                        airline: scraper.name,
                        key: dateCombo.key,
                        message: `${scraper.name}: Search failed for ${dateCombo.outboundStr} - ${dateCombo.returnStr}`
                    })}\n\n`);
                }
            }
            
            res.write(`data: ${JSON.stringify({
                type: 'airline-status',
                airline: scraper.name,
                status: 'completed',
                message: `${scraper.name}: Search completed`
            })}\n\n`);
        });
        
        await Promise.allSettled(searchPromises);
        
        // Send completion event
        res.write(`data: ${JSON.stringify({
            type: 'complete',
            message: 'All searches completed',
            totalResults: results.size,
            timestamp: new Date().toISOString(),
            browserStats: browserManager.getStats()
        })}\n\n`);
        
    } catch (error) {
        console.error('SSE Search error:', error);
        res.write(`data: ${JSON.stringify({
            type: 'error',
            message: 'Search failed',
            details: error.message
        })}\n\n`);
    }
    
    res.end();
});

function shouldUpdatePrice(newPrice, existingPrice) {
    // Enhanced price comparison for standardized data
    const extractPoints = (price) => {
        if (!price) return Infinity;
        
        // Handle standardized format with points
        const match = price.match(/(\d+)k/);
        if (match) {
            return parseInt(match[1]) * 1000;
        }
        
        // Handle raw points format
        const pointsMatch = price.match(/(\d+(?:,\d+)?)\s*(?:points?|avios)/i);
        if (pointsMatch) {
            return parseInt(pointsMatch[1].replace(/,/g, ''));
        }
        
        // Handle numeric strings
        const numMatch = price.match(/(\d+)/);
        if (numMatch) {
            return parseInt(numMatch[1]);
        }
        
        return Infinity;
    };
    
    const newPoints = extractPoints(newPrice);
    const existingPoints = extractPoints(existingPrice);
    
    return newPoints < existingPoints;
}

// Keep the original endpoint for backward compatibility
app.post('/api/search', async (req, res) => {
    const { origin, destination, centerDate } = req.body;
    
    console.log(`Search request received: ${origin} -> ${destination}, center date: ${centerDate}`);
    
    if (!origin || !destination || !centerDate) {
        return res.status(400).json({
            error: 'Origin, destination, and center date are required'
        });
    }
    
    if (!browserManager || scrapers.length === 0) {
        return res.status(503).json({
            error: 'Browser automation not initialized'
        });
    }
    
    try {
        // Generate date grid
        const DateGrid = require('./dateGrid');
        const dateGridGen = new DateGrid();
        const gridData = dateGridGen.generateDateGrid(centerDate);
        
        console.log(`Running searches for ${gridData.length * gridData[0].length} date combinations...`);
        
        // Run searches for sample date combinations (limit for demo)
        const sampleCombos = [];
        gridData.forEach((row, rowIndex) => {
            row.forEach((dateCombo, colIndex) => {
                // Sample every 3rd combination to avoid too many searches
                if ((rowIndex + colIndex) % 3 === 0) {
                    sampleCombos.push(dateCombo);
                }
            });
        });
        
        console.log(`Running searches for ${sampleCombos.length} sample date combinations`);
        
        const searchPromises = sampleCombos.map(async (dateCombo) => {
            const searchParams = {
                origin: origin.toUpperCase(),
                destination: destination.toUpperCase(),
                outboundDate: dateCombo.outboundStr,
                returnDate: dateCombo.returnStr
            };
            
            // Run search with first available scraper (for demo)
            const scraper = scrapers[0];
            const result = await scraper.executeWithRetry(searchParams);
            
            return {
                key: dateCombo.key,
                result: result,
                outbound: dateCombo.outboundStr,
                return: dateCombo.returnStr
            };
        });
        
        const searchResults = await Promise.allSettled(searchPromises);
        
        // Process results into grid format
        const mockGridData = [];
        gridData.forEach(row => {
            row.forEach(dateCombo => {
                const searchResult = searchResults.find(r => 
                    r.status === 'fulfilled' && r.value.key === dateCombo.key
                );
                
                let price = null;
                if (searchResult && searchResult.value.result.success && 
                    searchResult.value.result.data.length > 0) {
                    const cheapestFlight = searchResult.value.result.data[0];
                    price = cheapestFlight.price.total || `${Math.floor(cheapestFlight.price.points / 1000)}k`;
                }
                
                mockGridData.push({
                    key: dateCombo.key,
                    price: price,
                    outbound: dateCombo.outboundStr,
                    return: dateCombo.returnStr
                });
            });
        });
        
        const response = {
            origin: origin.toUpperCase(),
            destination: destination.toUpperCase(),
            centerDate: centerDate,
            status: 'Search completed with browser automation',
            timestamp: new Date().toISOString(),
            gridData: mockGridData,
            searchStats: {
                totalCombinations: gridData.length * gridData[0].length,
                sampledCombinations: sampleCombos.length,
                successfulSearches: searchResults.filter(r => 
                    r.status === 'fulfilled' && r.value.result.success
                ).length
            },
            browserStats: browserManager.getStats(),
            message: `Successfully processed search from ${origin.toUpperCase()} to ${destination.toUpperCase()} using browser automation`
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            error: 'Search failed',
            details: error.message
        });
    }
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    if (browserManager) {
        await browserManager.cleanup();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nShutting down gracefully...');
    if (browserManager) {
        await browserManager.cleanup();
    }
    process.exit(0);
});

// Start server
async function startServer() {
    try {
        await initializeScrapers();
        
        app.listen(PORT, () => {
            console.log(`RewardRadar server running at http://localhost:${PORT}`);
            console.log(`Ready to search for award flights with browser automation!`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();