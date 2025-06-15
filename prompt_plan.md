# Reward Flight Search Tool - Implementation Prompt Plan

## Detailed Blueprint

### Phase 1: Foundation and Infrastructure
1. **Project Setup**
   - Initialize project structure
   - Set up development environment
   - Configure build tools and dependencies

2. **Basic Frontend Framework**
   - Create HTML skeleton
   - Set up CSS framework
   - Initialize JavaScript module structure

3. **Backend Foundation**
   - Set up Node.js server
   - Configure Express.js
   - Create basic API structure

4. **Browser Automation Setup**
   - Install and configure Puppeteer/Playwright
   - Create browser instance manager
   - Implement basic page navigation

### Phase 2: Core Components
5. **Search Form UI**
   - Build basic form with required fields
   - Add validation
   - Implement form submission

6. **Date Grid Component**
   - Create 7x7 grid structure
   - Implement date calculations
   - Add basic styling

7. **API Endpoints**
   - Create search endpoint
   - Implement request validation
   - Set up response structure

8. **Airline Scraper Base Class**
   - Define common interface
   - Implement shared functionality
   - Create error handling framework

### Phase 3: Integration and Airlines
9. **Frontend-Backend Connection**
   - Connect form to API
   - Implement loading states
   - Handle API responses

10. **First Airline Implementation**
    - Implement simplest airline scraper
    - Test end-to-end flow
    - Refine base class

11. **Progressive Results Loading**
    - Implement WebSocket/SSE
    - Update grid cells in real-time
    - Handle partial results

12. **Additional Airlines**
    - Add remaining airline scrapers
    - Test each individually
    - Ensure consistent data format

### Phase 4: Enhancement and Polish
13. **Advanced Search Options**
    - Add collapsible options panel
    - Implement filters
    - Update API to handle options

14. **Flight Details Modal**
    - Create detail view
    - Display multiple options
    - Add formatting and styling

15. **Error Handling and Resilience**
    - Implement retry logic
    - Add comprehensive error messages
    - Create fallback behaviors

16. **Performance and Polish**
    - Optimize search performance
    - Add caching where appropriate
    - Final UI polish

## Iterative Development Chunks

### Iteration 1: Minimal Viable Foundation
- **Step 1.1**: Project setup with basic HTML page
- **Step 1.2**: Simple form with origin/destination inputs
- **Step 1.3**: Basic Express server with single endpoint
- **Step 1.4**: Puppeteer setup with simple test

### Iteration 2: Basic Search Flow
- **Step 2.1**: Form validation and submission
- **Step 2.2**: API endpoint that receives search parameters
- **Step 2.3**: Mock airline scraper that returns dummy data
- **Step 2.4**: Display single result on page

### Iteration 3: Date Grid Foundation
- **Step 3.1**: Create 7x7 grid HTML/CSS structure
- **Step 3.2**: Generate date labels for grid
- **Step 3.3**: Update API to return grid-compatible data
- **Step 3.4**: Populate grid cells with mock data

### Iteration 4: Real Airline Integration
- **Step 4.1**: Create base scraper class
- **Step 4.2**: Implement first real airline scraper
- **Step 4.3**: Handle scraping errors gracefully
- **Step 4.4**: Display real data in grid

### Iteration 5: Progressive Loading
- **Step 5.1**: Set up Server-Sent Events
- **Step 5.2**: Stream results as they complete
- **Step 5.3**: Update grid cells dynamically
- **Step 5.4**: Add loading indicators

### Iteration 6: Multiple Airlines
- **Step 6.1**: Add second airline scraper
- **Step 6.2**: Implement parallel execution
- **Step 6.3**: Merge results from multiple airlines
- **Step 6.4**: Show best price per cell

### Iteration 7: Enhanced UI
- **Step 7.1**: Add advanced search options
- **Step 7.2**: Create flight details modal
- **Step 7.3**: Implement click handlers for grid cells
- **Step 7.4**: Polish UI with final styling

## Implementation Prompts

### Prompt 1: Project Foundation

```text
Create a basic web application structure for a flight search tool. Set up:

1. An index.html file with:
   - A simple form containing origin and destination input fields
   - A submit button
   - A div with id="results" for displaying search results
   - Basic CSS for clean presentation

2. A server.js file using Express that:
   - Serves the static HTML file
   - Has a POST endpoint at /api/search that accepts origin and destination
   - Returns a simple JSON response with the received parameters
   - Runs on port 3000

3. A package.json with necessary dependencies (express, body-parser)

Keep it minimal but functional. The form should submit to the API endpoint and display the response.
```

### Prompt 2: Date Grid Component

```text
Building on the previous code, add a date grid component:

1. Create a dateGrid.js module that:
   - Generates a 7x7 grid of dates centered on a given date
   - Returns an array of date objects with outbound and return dates
   - Exports a function to create the grid HTML

2. Update index.html to:
   - Add a date input field for the center date
   - Include a div with id="dateGrid" for the grid display
   - Import and use the dateGrid module

3. Add CSS to style the grid:
   - Display as a CSS grid with 8 columns (1 for labels + 7 for dates)
   - Make cells clickable with hover effects
   - Show loading state for empty cells

4. Update the API response to include the date grid structure

Test that the grid displays correctly with proper date calculations.
```

### Prompt 3: Browser Automation Setup

```text
Add Puppeteer browser automation to the project:

1. Install Puppeteer and create a browserManager.js module that:
   - Manages a pool of browser instances
   - Provides methods to get and release browser pages
   - Handles browser crashes gracefully
   - Implements a queue for managing concurrent requests

2. Create an airlineScraper.js base class that:
   - Defines the interface all airline scrapers must implement
   - Provides common methods like navigating to URL, waiting for elements
   - Implements retry logic with configurable attempts
   - Has error handling and timeout management

3. Create a mockAirlineScraper.js that extends the base class:
   - Simulates searching an airline website
   - Returns dummy flight data after a short delay
   - Randomly fails 20% of the time to test error handling

4. Update server.js to:
   - Use the mock scraper when handling search requests
   - Return results in a format compatible with the date grid

Test the browser automation with various failure scenarios.
```

### Prompt 4: Progressive Results Loading

```text
Implement Server-Sent Events for progressive loading:

1. Update server.js to:
   - Change /api/search to return an SSE stream
   - Send results as they complete from each airline
   - Include airline name and status in each event
   - Send a final 'complete' event when done

2. Create a client-side resultStream.js module that:
   - Establishes SSE connection to the server
   - Handles incoming result events
   - Updates specific grid cells as data arrives
   - Shows loading spinner for pending cells
   - Handles connection errors and retries

3. Update the date grid to:
   - Show loading state initially
   - Update individual cells with lowest price
   - Store full result data for each cell
   - Change cell color based on price ranges

4. Add visual feedback:
   - Progress bar showing airlines completed
   - Status messages for each airline
   - Error indicators for failed searches

Test with multiple mock scrapers running at different speeds.
```

### Prompt 5: First Real Airline Scraper

```text
Implement a real airline scraper (choose the simplest airline website):

1. Create britishAirwaysScraper.js that:
   - Navigates to BA's award search page
   - Fills in the search form with provided parameters
   - Waits for results to load
   - Extracts points, taxes, and flight details
   - Handles common issues (popups, cookie banners)
   - Returns standardized flight data

2. Update the scraper to handle:
   - Different date formats
   - Multiple flight options per day
   - Missing availability
   - Dynamic content loading
   - Anti-bot detection (add realistic delays)

3. Create a data standardizer that:
   - Converts BA's data format to common structure
   - Calculates total journey time
   - Extracts connection information
   - Handles missing fields gracefully

4. Add configuration for:
   - Timeout values
   - Retry attempts
   - Wait selectors
   - Data extraction patterns

Test with various routes and dates, ensuring reliable data extraction.
```

### Prompt 6: Parallel Airline Execution

```text
Implement parallel execution for multiple airlines:

1. Create an airlineRegistry.js that:
   - Maintains a list of available airline scrapers
   - Provides methods to get scrapers by name or alliance
   - Handles dynamic loading of scraper modules
   - Validates scraper implementations

2. Update server.js to:
   - Execute multiple airline searches in parallel
   - Respect individual airline rate limits
   - Track success/failure per airline
   - Continue even if some airlines fail
   - Merge results as they complete

3. Add a second airline scraper (e.g., klmScraper.js):
   - Implement using the same base class
   - Handle KLM-specific page structure
   - Test alongside British Airways

4. Create a resultMerger.js module that:
   - Combines results from multiple airlines
   - Finds the lowest points option per date cell
   - Maintains source airline information
   - Handles different point currencies

Test with both airlines running simultaneously.
```

### Prompt 7: Flight Details Modal

```text
Add a detailed view for flight options:

1. Create a flightModal.js module that:
   - Displays detailed flight information in a modal
   - Shows top 5 options for selected date pair
   - Includes airline, duration, stops, aircraft type
   - Formats times and dates nicely
   - Has close button and keyboard navigation

2. Update grid cells to:
   - Store all flight options, not just cheapest
   - Add click handlers to open modal
   - Show visual indicator that cell is clickable
   - Pass date pair and results to modal

3. Enhance the modal with:
   - Tabs or accordion for multiple options
   - Visual timeline for flight segments
   - Clear pricing breakdown (points + taxes)
   - Links to airline websites (optional)

4. Add modal animations:
   - Smooth open/close transitions
   - Loading state while fetching details
   - Error state if data unavailable

Test modal with various flight combinations and edge cases.
```

### Prompt 8: Advanced Search Options

```text
Implement the advanced search functionality:

1. Update index.html with collapsible advanced options:
   - Cabin class selector (Economy, Premium, Business, First)
   - Passenger count inputs (adults, children, infants)
   - Toggle for direct flights only
   - Toggle for nearby airports
   - Alliance filter checkboxes
   - Airline multi-select

2. Create searchOptions.js module that:
   - Manages advanced option state
   - Validates passenger combinations
   - Saves preferences to localStorage
   - Provides default values
   - Generates URL parameters

3. Update all scrapers to:
   - Accept and use advanced parameters
   - Modify searches based on cabin class
   - Filter results by direct/connecting
   - Handle passenger count variations

4. Enhance the UI:
   - Smooth expand/collapse animation
   - Clear visual hierarchy
   - Reset button for defaults
   - Parameter summary when collapsed

Test with various option combinations across all airlines.
```

### Prompt 9: Error Handling and Resilience

```text
Implement comprehensive error handling:

1. Create an errorHandler.js module that:
   - Categorizes errors (network, parsing, timeout, anti-bot)
   - Implements exponential backoff for retries
   - Logs errors with context for debugging
   - Provides user-friendly error messages
   - Tracks error patterns per airline

2. Update all scrapers to:
   - Throw specific error types
   - Include screenshot on failure (development mode)
   - Implement smarter retry logic based on error type
   - Add health check before searching

3. Enhance the UI error handling:
   - Show inline errors for specific airlines
   - Provide retry button for failed searches
   - Display partial results when some airlines fail
   - Add timeout warnings for slow searches

4. Create a monitoring dashboard that:
   - Shows success rate per airline
   - Displays average search times
   - Highlights common failure patterns
   - Provides manual airline toggle

Test with network interruptions, blocked requests, and various failure modes.
```

### Prompt 10: Performance Optimization and Polish

```text
Optimize performance and add final polish:

1. Implement caching strategy:
   - Cache static data (airport codes, aircraft types)
   - Add short-term cache for identical searches
   - Implement cache invalidation logic
   - Store partial results for quick updates

2. Optimize browser automation:
   - Reuse browser contexts where possible
   - Implement request interception to block ads/images
   - Add page pooling for faster searches
   - Optimize selectors for speed

3. Enhance the UI performance:
   - Add virtual scrolling for large result sets
   - Implement lazy loading for flight details
   - Optimize grid rendering with React/Vue (if needed)
   - Add keyboard shortcuts for power users

4. Final polish:
   - Add loading skeletons instead of spinners
   - Implement smooth transitions between states
   - Add helpful tooltips and guides
   - Create a proper error boundary
   - Add accessibility features (ARIA labels, keyboard nav)
   - Implement responsive design for mobile

Test performance with stress tests and various devices/networks.
```

### Prompt 11: Integration Testing and Deployment Prep

```text
Finalize the project with comprehensive testing and deployment preparation:

1. Create an integration test suite that:
   - Tests full search flow for each airline
   - Validates data extraction accuracy
   - Checks error handling scenarios
   - Measures performance benchmarks
   - Tests concurrent user scenarios

2. Add configuration management:
   - Environment-specific configs (dev, staging, prod)
   - Feature flags for gradual airline rollout
   - Rate limiting per IP/session
   - API key management for future auth

3. Implement logging and monitoring:
   - Structured logging for all operations
   - Performance metrics collection
   - Error tracking integration
   - Usage analytics (privacy-respecting)

4. Prepare for deployment:
   - Dockerize the application
   - Add health check endpoints
   - Create deployment scripts
   - Write operational runbook
   - Set up CI/CD pipeline basics

Run full integration tests and ensure all components work together seamlessly.
```

## Notes

Each prompt builds on the previous implementation, ensuring no orphaned code and maintaining a clear progression from simple to complex. The steps are sized to be implementable in focused sessions while moving the project meaningfully forward.