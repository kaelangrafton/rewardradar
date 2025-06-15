class DataStandardizer {
    constructor() {
        this.airportCodes = {
            // Major international airports
            'LHR': { name: 'London Heathrow', city: 'London', country: 'UK', timezone: 'Europe/London' },
            'JFK': { name: 'John F. Kennedy International', city: 'New York', country: 'US', timezone: 'America/New_York' },
            'LAX': { name: 'Los Angeles International', city: 'Los Angeles', country: 'US', timezone: 'America/Los_Angeles' },
            'CDG': { name: 'Charles de Gaulle', city: 'Paris', country: 'FR', timezone: 'Europe/Paris' },
            'DXB': { name: 'Dubai International', city: 'Dubai', country: 'AE', timezone: 'Asia/Dubai' },
            'SYD': { name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'AU', timezone: 'Australia/Sydney' },
            'NRT': { name: 'Narita International', city: 'Tokyo', country: 'JP', timezone: 'Asia/Tokyo' },
            'SIN': { name: 'Singapore Changi', city: 'Singapore', country: 'SG', timezone: 'Asia/Singapore' },
            'FRA': { name: 'Frankfurt am Main', city: 'Frankfurt', country: 'DE', timezone: 'Europe/Berlin' },
            'AMS': { name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'NL', timezone: 'Europe/Amsterdam' }
        };
        
        this.aircraftTypes = {
            // Common aircraft with standardized names
            'B777': 'Boeing 777',
            'B787': 'Boeing 787',
            'A350': 'Airbus A350',
            'A380': 'Airbus A380',
            'B747': 'Boeing 747',
            'A330': 'Airbus A330'
        };
        
        this.currencies = {
            'GBP': { symbol: '£', name: 'British Pound' },
            'USD': { symbol: '$', name: 'US Dollar' },
            'EUR': { symbol: '€', name: 'Euro' },
            'AUD': { symbol: 'A$', name: 'Australian Dollar' }
        };
    }
    
    standardizeFlightResult(rawData, airline) {
        try {
            return {
                // Metadata
                airline: airline,
                searchId: this.generateSearchId(),
                timestamp: new Date().toISOString(),
                
                // Route information
                route: {
                    origin: this.standardizeAirport(rawData.origin),
                    destination: this.standardizeAirport(rawData.destination),
                    outboundDate: this.standardizeDate(rawData.outboundDate),
                    returnDate: rawData.returnDate ? this.standardizeDate(rawData.returnDate) : null
                },
                
                // Pricing information
                pricing: this.standardizePricing(rawData.pricing || rawData.price),
                
                // Flight segments
                segments: {
                    outbound: this.standardizeSegments(rawData.outboundFlights || []),
                    return: this.standardizeSegments(rawData.returnFlights || [])
                },
                
                // Journey details
                journey: {
                    totalDuration: this.standardizeDuration(rawData.duration),
                    totalStops: this.calculateTotalStops(rawData),
                    cabinClass: this.standardizeCabinClass(rawData.bookingClass || rawData.class),
                    bookingCode: rawData.bookingCode || null
                },
                
                // Availability
                availability: {
                    status: this.standardizeAvailability(rawData.availability),
                    seats: rawData.seatsAvailable || null,
                    lastUpdated: new Date().toISOString()
                },
                
                // Raw data for debugging
                raw: rawData
            };
        } catch (error) {
            console.error('Error standardizing flight result:', error);
            return null;
        }
    }
    
    standardizeAirport(airportCode) {
        const code = airportCode ? airportCode.toUpperCase() : null;
        const airportInfo = this.airportCodes[code];
        
        return {
            code: code,
            name: airportInfo?.name || `Unknown Airport (${code})`,
            city: airportInfo?.city || 'Unknown',
            country: airportInfo?.country || 'Unknown',
            timezone: airportInfo?.timezone || 'UTC'
        };
    }
    
    standardizeDate(dateInput) {
        if (!dateInput) return null;
        
        try {
            const date = new Date(dateInput);
            return {
                iso: date.toISOString(),
                date: date.toISOString().split('T')[0],
                display: date.toLocaleDateString('en-GB', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                })
            };
        } catch (error) {
            console.error('Error standardizing date:', error);
            return null;
        }
    }
    
    standardizePricing(pricingData) {
        if (!pricingData) return null;
        
        try {
            // Handle different pricing formats
            let points = null;
            let cash = null;
            let taxes = null;
            let currency = 'GBP';
            
            if (typeof pricingData === 'string') {
                // Parse string like "75k + £150" or "50000 Avios"
                const pointsMatch = pricingData.match(/(\d+(?:,\d+)?)\s*k?/);
                const cashMatch = pricingData.match(/[£$€](\d+(?:\.\d{2})?)/);
                
                if (pointsMatch) {
                    points = parseInt(pointsMatch[1].replace(/,/g, '')) * (pricingData.includes('k') ? 1000 : 1);
                }
                if (cashMatch) {
                    taxes = parseFloat(cashMatch[1]);
                }
            } else if (typeof pricingData === 'object') {
                points = pricingData.points || pricingData.avios;
                cash = pricingData.cash || pricingData.money;
                taxes = pricingData.taxes || pricingData.fees;
                currency = pricingData.currency || currency;
            }
            
            return {
                points: {
                    amount: points,
                    type: this.determinePointsType(points),
                    display: points ? this.formatPoints(points) : null
                },
                cash: {
                    amount: cash,
                    currency: currency,
                    display: cash ? this.formatCash(cash, currency) : null
                },
                taxes: {
                    amount: taxes,
                    currency: currency,
                    display: taxes ? this.formatCash(taxes, currency) : null
                },
                total: {
                    display: this.formatTotalPrice(points, cash, taxes, currency)
                }
            };
        } catch (error) {
            console.error('Error standardizing pricing:', error);
            return null;
        }
    }
    
    standardizeSegments(segments) {
        if (!Array.isArray(segments)) return [];
        
        return segments.map((segment, index) => {
            try {
                return {
                    segmentNumber: index + 1,
                    flightNumber: segment.flightNumber || `Unknown${index + 1}`,
                    aircraft: this.standardizeAircraft(segment.aircraft),
                    departure: this.standardizeFlightPoint(segment.departure),
                    arrival: this.standardizeFlightPoint(segment.arrival),
                    duration: this.calculateSegmentDuration(segment),
                    distance: this.estimateDistance(segment.departure?.airport, segment.arrival?.airport)
                };
            } catch (error) {
                console.error('Error standardizing segment:', error);
                return null;
            }
        }).filter(segment => segment !== null);
    }
    
    standardizeFlightPoint(flightPoint) {
        if (!flightPoint) return null;
        
        try {
            return {
                airport: this.standardizeAirport(flightPoint.airport),
                time: this.standardizeDateTime(flightPoint.time),
                terminal: flightPoint.terminal || null,
                gate: flightPoint.gate || null
            };
        } catch (error) {
            console.error('Error standardizing flight point:', error);
            return null;
        }
    }
    
    standardizeDateTime(timeInput) {
        if (!timeInput) return null;
        
        try {
            const date = new Date(timeInput);
            return {
                iso: date.toISOString(),
                date: date.toISOString().split('T')[0],
                time: date.toTimeString().substr(0, 5),
                display: date.toLocaleString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            };
        } catch (error) {
            console.error('Error standardizing date time:', error);
            return null;
        }
    }
    
    standardizeAircraft(aircraftInput) {
        if (!aircraftInput) return null;
        
        const aircraft = aircraftInput.toString();
        
        // Try to match common aircraft codes
        for (const [code, fullName] of Object.entries(this.aircraftTypes)) {
            if (aircraft.includes(code) || aircraft.includes(fullName)) {
                return {
                    code: code,
                    name: fullName,
                    display: fullName
                };
            }
        }
        
        return {
            code: null,
            name: aircraft,
            display: aircraft
        };
    }
    
    standardizeDuration(durationInput) {
        if (!durationInput) return null;
        
        try {
            // Parse duration like "8h 30m" or "8:30" or 510 (minutes)
            let totalMinutes = 0;
            
            if (typeof durationInput === 'number') {
                totalMinutes = durationInput;
            } else if (typeof durationInput === 'string') {
                const hoursMatch = durationInput.match(/(\d+)h/);
                const minutesMatch = durationInput.match(/(\d+)m/);
                const colonMatch = durationInput.match(/(\d+):(\d+)/);
                
                if (hoursMatch || minutesMatch) {
                    totalMinutes = (hoursMatch ? parseInt(hoursMatch[1]) * 60 : 0) + 
                                 (minutesMatch ? parseInt(minutesMatch[1]) : 0);
                } else if (colonMatch) {
                    totalMinutes = parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
                }
            }
            
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            
            return {
                totalMinutes: totalMinutes,
                hours: hours,
                minutes: minutes,
                display: `${hours}h ${minutes}m`
            };
        } catch (error) {
            console.error('Error standardizing duration:', error);
            return null;
        }
    }
    
    standardizeCabinClass(classInput) {
        if (!classInput) return 'Economy';
        
        const classLower = classInput.toLowerCase();
        
        if (classLower.includes('first')) return 'First';
        if (classLower.includes('business')) return 'Business';
        if (classLower.includes('premium')) return 'Premium Economy';
        
        return 'Economy';
    }
    
    standardizeAvailability(availabilityInput) {
        if (!availabilityInput) return 'Unknown';
        
        const availability = availabilityInput.toString().toLowerCase();
        
        if (availability.includes('available')) return 'Available';
        if (availability.includes('waitlist')) return 'Waitlist';
        if (availability.includes('sold') || availability.includes('full')) return 'Sold Out';
        
        return 'Unknown';
    }
    
    calculateTotalStops(rawData) {
        if (rawData.stops !== undefined) return rawData.stops;
        
        const outboundStops = (rawData.outboundFlights?.length || 1) - 1;
        const returnStops = (rawData.returnFlights?.length || 0) - (rawData.returnFlights?.length > 0 ? 1 : 0);
        
        return Math.max(outboundStops, returnStops);
    }
    
    calculateSegmentDuration(segment) {
        if (!segment.departure?.time || !segment.arrival?.time) return null;
        
        try {
            const depTime = new Date(segment.departure.time);
            const arrTime = new Date(segment.arrival.time);
            const durationMs = arrTime - depTime;
            const totalMinutes = Math.floor(durationMs / 60000);
            
            return this.standardizeDuration(totalMinutes);
        } catch (error) {
            return null;
        }
    }
    
    estimateDistance(originCode, destinationCode) {
        // Simple distance estimation (in miles)
        const distances = {
            'LHR-JFK': 3459,
            'LHR-LAX': 5440,
            'JFK-LAX': 2475,
            'LHR-CDG': 214,
            'LHR-DXB': 3414
        };
        
        const route = `${originCode}-${destinationCode}`;
        const reverseRoute = `${destinationCode}-${originCode}`;
        
        return distances[route] || distances[reverseRoute] || null;
    }
    
    determinePointsType(points) {
        if (!points) return null;
        
        // Simple heuristic based on point amounts
        if (points < 20000) return 'Low';
        if (points < 50000) return 'Medium';
        if (points < 100000) return 'High';
        return 'Premium';
    }
    
    formatPoints(points) {
        if (!points) return null;
        
        if (points >= 1000) {
            return `${Math.floor(points / 1000)}k`;
        }
        return points.toLocaleString();
    }
    
    formatCash(amount, currency) {
        if (!amount) return null;
        
        const symbol = this.currencies[currency]?.symbol || currency;
        return `${symbol}${amount.toFixed(2)}`;
    }
    
    formatTotalPrice(points, cash, taxes, currency) {
        const parts = [];
        
        if (points) {
            parts.push(this.formatPoints(points));
        }
        
        if (cash) {
            parts.push(this.formatCash(cash, currency));
        } else if (taxes) {
            parts.push(`+ ${this.formatCash(taxes, currency)}`);
        }
        
        return parts.join(' ') || 'Price not available';
    }
    
    generateSearchId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // Utility method to merge results from multiple airlines
    mergeAirlineResults(resultsArray) {
        const mergedResults = [];
        const routeMap = new Map();
        
        for (const airlineResults of resultsArray) {
            for (const result of airlineResults) {
                const routeKey = `${result.route.origin.code}-${result.route.destination.code}-${result.route.outboundDate.date}`;
                
                if (!routeMap.has(routeKey)) {
                    routeMap.set(routeKey, []);
                }
                
                routeMap.get(routeKey).push(result);
            }
        }
        
        // Sort results by price for each route
        for (const [routeKey, results] of routeMap) {
            results.sort((a, b) => {
                const pointsA = a.pricing?.points?.amount || Infinity;
                const pointsB = b.pricing?.points?.amount || Infinity;
                return pointsA - pointsB;
            });
            
            mergedResults.push(...results);
        }
        
        return mergedResults;
    }
}

module.exports = DataStandardizer;