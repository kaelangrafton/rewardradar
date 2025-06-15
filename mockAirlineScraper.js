const AirlineScraper = require('./airlineScraper');

class MockAirlineScraper extends AirlineScraper {
    constructor(browserManager, config = {}) {
        super(browserManager, {
            name: config.name || 'MockAirline',
            maxRetries: 2,
            timeout: 10000,
            delay: 500,
            ...config
        });
        
        this.failureRate = config.failureRate || 0.2; // 20% failure rate
        this.responseTime = config.responseTime || { min: 2000, max: 8000 };
    }
    
    async search(searchParams, page) {
        const { origin, destination, outboundDate, returnDate } = searchParams;
        
        console.log(`${this.name}: Searching ${origin} -> ${destination}`);
        console.log(`${this.name}: Outbound: ${outboundDate}, Return: ${returnDate}`);
        
        // Simulate navigation to airline website
        await this.simulateNavigation(page);
        
        // Simulate form filling
        await this.simulateFormFilling(page, searchParams);
        
        // Simulate search execution
        await this.simulateSearchExecution(page);
        
        // Simulate results processing
        const results = await this.simulateResultsProcessing(searchParams);
        
        return results;
    }
    
    async simulateNavigation(page) {
        console.log(`${this.name}: Simulating navigation to airline website...`);
        
        // Navigate to a real page for realism
        await page.goto('https://httpbin.org/delay/1', { 
            waitUntil: 'networkidle2',
            timeout: this.timeout 
        });
        
        await this.sleep(Math.random() * 1000 + 500);
    }
    
    async simulateFormFilling(page, searchParams) {
        console.log(`${this.name}: Simulating form filling...`);
        
        // Simulate typing delays
        const formSteps = [
            'Origin airport',
            'Destination airport', 
            'Departure date',
            'Return date',
            'Passengers'
        ];
        
        for (const step of formSteps) {
            console.log(`${this.name}: Filling ${step}...`);
            await this.sleep(Math.random() * 800 + 300);
        }
    }
    
    async simulateSearchExecution(page) {
        console.log(`${this.name}: Simulating search execution...`);
        
        // Simulate clicking search button
        await this.sleep(Math.random() * 500 + 200);
        
        // Simulate waiting for results
        const searchTime = Math.random() * 
            (this.responseTime.max - this.responseTime.min) + 
            this.responseTime.min;
            
        console.log(`${this.name}: Waiting for results (${Math.round(searchTime)}ms)...`);
        await this.sleep(searchTime);
        
        // Randomly fail some searches
        if (Math.random() < this.failureRate) {
            const errorTypes = [
                'Network timeout',
                'No availability found',
                'Rate limit exceeded',
                'Page load error',
                'Anti-bot detection'
            ];
            
            const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
            throw new Error(`Simulated error: ${randomError}`);
        }
    }
    
    async simulateResultsProcessing(searchParams) {
        console.log(`${this.name}: Processing search results...`);
        
        const { origin, destination, outboundDate, returnDate } = searchParams;
        
        // Generate mock flight data
        const hasResults = Math.random() > 0.3; // 70% chance of having results
        
        if (!hasResults) {
            return [];
        }
        
        const numResults = Math.floor(Math.random() * 3) + 1; // 1-3 results
        const results = [];
        
        for (let i = 0; i < numResults; i++) {
            const basePoints = Math.floor(Math.random() * 80000) + 25000; // 25k-105k points
            const taxes = Math.floor(Math.random() * 300) + 50; // $50-$350 taxes
            const stops = Math.random() > 0.6 ? 0 : Math.floor(Math.random() * 2) + 1; // Mostly direct
            
            const result = this.createFlightResult({
                outboundDate: outboundDate,
                returnDate: returnDate,
                points: basePoints + (i * 5000), // Slightly different prices
                taxes: taxes,
                total: `${Math.floor((basePoints + (i * 5000)) / 1000)}k + $${taxes}`,
                outboundFlights: this.generateMockFlights(origin, destination, outboundDate, stops),
                returnFlights: this.generateMockFlights(destination, origin, returnDate, stops),
                duration: this.calculateDuration(origin, destination, stops),
                stops: stops,
                aircraft: this.getRandomAircraft(),
                bookingClass: 'Economy',
                availability: 'Available'
            });
            
            results.push(result);
        }
        
        console.log(`${this.name}: Found ${results.length} flight options`);
        return results;
    }
    
    generateMockFlights(origin, destination, date, stops) {
        const flights = [];
        const baseTime = new Date(date);
        baseTime.setHours(Math.floor(Math.random() * 12) + 6); // 6 AM - 6 PM
        
        if (stops === 0) {
            // Direct flight
            flights.push({
                flightNumber: `${this.name.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 9000) + 1000}`,
                departure: {
                    airport: origin,
                    time: baseTime.toISOString()
                },
                arrival: {
                    airport: destination,
                    time: new Date(baseTime.getTime() + (Math.random() * 8 + 4) * 3600000).toISOString() // 4-12 hour flight
                },
                aircraft: this.getRandomAircraft()
            });
        } else {
            // Connecting flights
            const stopCodes = ['DXB', 'DOH', 'IST', 'CDG', 'AMS', 'FRA'];
            const stopover = stopCodes[Math.floor(Math.random() * stopCodes.length)];
            
            // First leg
            const firstArrival = new Date(baseTime.getTime() + (Math.random() * 6 + 2) * 3600000);
            flights.push({
                flightNumber: `${this.name.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 9000) + 1000}`,
                departure: {
                    airport: origin,
                    time: baseTime.toISOString()
                },
                arrival: {
                    airport: stopover,
                    time: firstArrival.toISOString()
                },
                aircraft: this.getRandomAircraft()
            });
            
            // Second leg
            const secondDeparture = new Date(firstArrival.getTime() + (Math.random() * 4 + 1) * 3600000); // 1-5 hour layover
            flights.push({
                flightNumber: `${this.name.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 9000) + 1000}`,
                departure: {
                    airport: stopover,
                    time: secondDeparture.toISOString()
                },
                arrival: {
                    airport: destination,
                    time: new Date(secondDeparture.getTime() + (Math.random() * 8 + 3) * 3600000).toISOString()
                },
                aircraft: this.getRandomAircraft()
            });
        }
        
        return flights;
    }
    
    calculateDuration(origin, destination, stops) {
        // Mock duration calculation
        const baseDuration = Math.random() * 8 + 4; // 4-12 hours base
        const stopPenalty = stops * (Math.random() * 3 + 2); // 2-5 hours per stop
        
        const totalMinutes = Math.floor((baseDuration + stopPenalty) * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        return `${hours}h ${minutes}m`;
    }
    
    getRandomAircraft() {
        const aircraft = [
            'Boeing 777-300ER',
            'Boeing 787-9',
            'Airbus A350-900',
            'Airbus A380-800',
            'Boeing 747-8',
            'Airbus A330-300'
        ];
        
        return aircraft[Math.floor(Math.random() * aircraft.length)];
    }
}

module.exports = MockAirlineScraper;