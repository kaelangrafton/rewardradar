class DateGrid {
    constructor() {
        this.gridSize = 7;
    }
    
    generateDateGrid(centerDate) {
        const center = new Date(centerDate);
        const dateGrid = [];
        
        for (let outboundOffset = -3; outboundOffset <= 3; outboundOffset++) {
            const outboundDate = new Date(center);
            outboundDate.setDate(center.getDate() + outboundOffset);
            
            const row = [];
            for (let returnOffset = 1; returnOffset <= 7; returnOffset++) {
                const returnDate = new Date(outboundDate);
                returnDate.setDate(outboundDate.getDate() + returnOffset);
                
                row.push({
                    outbound: new Date(outboundDate),
                    return: new Date(returnDate),
                    outboundStr: this.formatDate(outboundDate),
                    returnStr: this.formatDate(returnDate),
                    key: `${this.formatDateKey(outboundDate)}-${this.formatDateKey(returnDate)}`
                });
            }
            dateGrid.push(row);
        }
        
        return dateGrid;
    }
    
    formatDate(date) {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
    }
    
    formatDateKey(date) {
        return date.toISOString().split('T')[0];
    }
    
    formatDateHeader(date) {
        return date.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric' 
        });
    }
    
    generateGridHTML(centerDate) {
        const dateGrid = this.generateDateGrid(centerDate);
        const center = new Date(centerDate);
        
        let html = '<div class="date-grid">';
        
        html += '<div class="grid-header">';
        html += '<div class="grid-cell header-corner">Outbound \\ Return</div>';
        
        for (let i = 1; i <= 7; i++) {
            const returnDate = new Date(center);
            returnDate.setDate(center.getDate() + i);
            html += `<div class="grid-cell header-cell return-header">${this.formatDateHeader(returnDate)}</div>`;
        }
        html += '</div>';
        
        dateGrid.forEach((row, rowIndex) => {
            html += '<div class="grid-row">';
            
            const outboundDate = row[0].outbound;
            html += `<div class="grid-cell header-cell outbound-header">${this.formatDateHeader(outboundDate)}</div>`;
            
            row.forEach((dateCombo, colIndex) => {
                html += `<div class="grid-cell data-cell" data-key="${dateCombo.key}" data-outbound="${dateCombo.outboundStr}" data-return="${dateCombo.returnStr}">
                    <div class="cell-content">
                        <div class="loading-spinner"></div>
                        <div class="price-display" style="display: none;"></div>
                    </div>
                </div>`;
            });
            
            html += '</div>';
        });
        
        html += '</div>';
        return html;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DateGrid;
} else {
    window.DateGrid = DateGrid;
}