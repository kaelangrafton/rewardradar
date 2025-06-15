class ResultStream {
    constructor(onUpdate, onError, onComplete) {
        this.onUpdate = onUpdate;
        this.onError = onError;
        this.onComplete = onComplete;
        this.eventSource = null;
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }
    
    async startSearch(searchParams) {
        const { origin, destination, centerDate } = searchParams;
        
        console.log('Starting SSE search stream...');
        
        // Close existing connection
        this.close();
        
        try {
            // Use fetch to POST the search parameters, then switch to EventSource
            const response = await fetch('/api/search-stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ origin, destination, centerDate })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Read the stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            this.isConnected = true;
            this.retryCount = 0;
            
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                        console.log('SSE stream completed');
                        this.isConnected = false;
                        break;
                    }
                    
                    // Decode the chunk
                    const chunk = decoder.decode(value, { stream: true });
                    
                    // Parse SSE data
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.substring(6));
                                this.handleMessage(data);
                            } catch (parseError) {
                                console.error('Error parsing SSE data:', parseError);
                            }
                        }
                    }
                }
            } catch (streamError) {
                console.error('Stream reading error:', streamError);
                this.handleError(streamError);
            }
            
        } catch (error) {
            console.error('SSE connection error:', error);
            this.handleError(error);
        }
    }
    
    handleMessage(data) {
        console.log('SSE message received:', data.type, data);
        
        switch (data.type) {
            case 'status':
                this.onUpdate({
                    type: 'status',
                    message: data.message,
                    timestamp: data.timestamp
                });
                break;
                
            case 'progress':
                this.onUpdate({
                    type: 'progress',
                    message: data.message,
                    totalCombinations: data.totalCombinations,
                    totalAirlines: data.totalAirlines
                });
                break;
                
            case 'airline-status':
                this.onUpdate({
                    type: 'airline-status',
                    airline: data.airline,
                    status: data.status,
                    message: data.message
                });
                break;
                
            case 'result-update':
                this.onUpdate({
                    type: 'result-update',
                    key: data.key,
                    price: data.price,
                    airline: data.airline,
                    outbound: data.outbound,
                    return: data.return
                });
                break;
                
            case 'progress-update':
                this.onUpdate({
                    type: 'progress-update',
                    completed: data.completed,
                    total: data.total,
                    percentage: data.percentage
                });
                break;
                
            case 'error':
                this.onUpdate({
                    type: 'error',
                    airline: data.airline,
                    key: data.key,
                    message: data.message
                });
                break;
                
            case 'complete':
                console.log('Search completed:', data);
                this.isConnected = false;
                this.onComplete({
                    totalResults: data.totalResults,
                    timestamp: data.timestamp,
                    browserStats: data.browserStats
                });
                break;
                
            default:
                console.log('Unknown SSE message type:', data.type);
        }
    }
    
    handleError(error) {
        console.error('SSE error:', error);
        this.isConnected = false;
        
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.log(`Retrying SSE connection (${this.retryCount}/${this.maxRetries}) in ${this.retryDelay}ms...`);
            
            setTimeout(() => {
                if (this.onError) {
                    this.onError({
                        type: 'retry',
                        message: `Connection lost. Retrying... (${this.retryCount}/${this.maxRetries})`,
                        error: error.message
                    });
                }
            }, this.retryDelay);
            
            this.retryDelay *= 2; // Exponential backoff
        } else {
            console.error('Max retries exceeded');
            if (this.onError) {
                this.onError({
                    type: 'failed',
                    message: 'Connection failed after multiple retries',
                    error: error.message
                });
            }
        }
    }
    
    close() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.isConnected = false;
        console.log('SSE connection closed');
    }
    
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            retryCount: this.retryCount
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResultStream;
} else {
    window.ResultStream = ResultStream;
}