// Configuration for airline scrapers

const scraperConfig = {
    britishAirways: {
        // Basic configuration
        name: 'British Airways',
        baseUrl: 'https://www.britishairways.com',
        searchUrl: 'https://www.britishairways.com/travel/redeem/execclub/_gf/en_gb',
        
        // Timing configuration
        timeouts: {
            navigation: 45000,
            elementWait: 10000,
            searchResults: 30000,
            pageLoad: 20000
        },
        
        // Retry configuration
        retries: {
            maxAttempts: 3,
            backoffDelay: 2000,
            maxDelay: 10000
        },
        
        // Anti-detection measures
        delays: {
            betweenActions: [500, 1500],
            typing: [50, 150],
            afterClick: [1000, 2000],
            pageStabilization: 2000
        },
        
        // Selectors organized by purpose
        selectors: {
            cookies: {
                accept: [
                    '#ensCloseBanner',
                    '.cmp-button_button',
                    '[data-module="cookie-banner"] button',
                    'button[aria-label*="Accept"]',
                    '.cookie-accept'
                ]
            },
            
            search: {
                origin: [
                    '#oneWayFlightSearchOriginStationInput',
                    'input[name="origin"]',
                    '#departurePoint',
                    '.flight-search input[placeholder*="from"]',
                    '.departure input'
                ],
                destination: [
                    '#oneWayFlightSearchDestinationStationInput', 
                    'input[name="destination"]',
                    '#arrivalPoint',
                    '.flight-search input[placeholder*="to"]',
                    '.arrival input'
                ],
                departureDate: [
                    '#oneWayFlightSearchOutboundDateInput',
                    'input[name="departureDate"]',
                    '#departureDate',
                    'input[placeholder*="departure"]'
                ],
                returnDate: [
                    '#returnFlightSearchInboundDateInput',
                    'input[name="returnDate"]',
                    '#returnDate',
                    'input[placeholder*="return"]'
                ],
                cabinClass: [
                    '#oneWayFlightSearchCabinClassInput',
                    'select[name="cabinClass"]',
                    '#cabinClass'
                ],
                searchButton: [
                    '#flightSearchSubmitBtn',
                    'button[type="submit"]',
                    '.search-button',
                    '.flight-search-submit',
                    '.search-flights-btn'
                ]
            },
            
            results: {
                container: [
                    '.flight-results',
                    '.search-results',
                    '.flights-list'
                ],
                flightCard: [
                    '.flight-results .flight-item',
                    '.flight-option',
                    '.flight-card',
                    '.flight-result'
                ],
                price: [
                    '.price',
                    '.avios-price', 
                    '.point-price',
                    '.fare-price',
                    '[data-testid="price"]'
                ],
                details: [
                    '.flight-details',
                    '.flight-info',
                    '.journey-details'
                ],
                noResults: [
                    '.no-flights',
                    '.no-results',
                    '.empty-results',
                    '.no-availability'
                ]
            },
            
            loading: [
                '.loading',
                '.spinner',
                '.loading-flights',
                '[data-testid="loading"]'
            ],
            
            errors: [
                '.error-message',
                '.alert-error',
                '.validation-error',
                '.system-error'
            ]
        },
        
        // Data extraction patterns
        patterns: {
            aviosPoints: /(\d+(?:,\d+)?)\s*(?:avios|points?)/i,
            taxes: /\+?\s*[£$€](\d+(?:\.\d{2})?)/,
            flightNumber: /[A-Z]{2,3}\s*(\d+)/,
            duration: /(\d+)h?\s*(\d+)?m?/,
            aircraft: /(boeing|airbus|embraer|bombardier)[\s-]*([\w\d-]+)/i
        },
        
        // User agent rotation
        userAgents: [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
        ],
        
        // Date formats accepted by BA
        dateFormats: {
            input: 'DD/MM/YYYY',
            display: 'DD MMM YYYY',
            api: 'YYYY-MM-DD'
        },
        
        // Cache configuration
        cache: {
            enabled: true,
            ttl: 300000, // 5 minutes
            maxSize: 100
        }
    },
    
    // Configuration for future airline scrapers
    emirates: {
        name: 'Emirates',
        baseUrl: 'https://www.emirates.com',
        // ... similar structure
    },
    
    qatarAirways: {
        name: 'Qatar Airways', 
        baseUrl: 'https://www.qatarairways.com',
        // ... similar structure
    }
};

module.exports = scraperConfig;