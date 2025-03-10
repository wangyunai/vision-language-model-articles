/**
 * Debug script for vision-language-model-articles dashboard
 * 
 * Add this to the page by pasting in the browser console:
 * var script = document.createElement('script'); script.src = 'debug.js'; document.body.appendChild(script);
 */

console.log("✅ Debug script loaded");

// Check if Chart.js is available
if (typeof Chart === 'undefined') {
    console.error("❌ Chart.js is not loaded");
} else {
    console.log("✅ Chart.js is loaded", Chart.version);
}

// Force initialize tabs
function forceInitTabs() {
    console.log("🔄 Force initializing tabs...");
    
    // Get all tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    console.log(`Found ${tabButtons.length} tab buttons and ${tabContents.length} tab contents`);
    
    // Force load all tabs
    const trendsTab = document.getElementById('trends-tab');
    const impactTab = document.getElementById('impact-tab');
    
    if (trendsTab) {
        console.log("🔄 Force loading trends tab...");
        
        // Get trend chart elements
        const trendChart = document.getElementById('trend-chart');
        const timeRange = document.getElementById('time-range');
        const trendType = document.getElementById('trend-type');
        
        console.log("Trend elements:", {
            trendChart: !!trendChart,
            timeRange: !!timeRange,
            trendType: !!trendType
        });
        
        // Force create a simple chart
        if (trendChart) {
            console.log("🔄 Creating test chart...");
            try {
                // Clear any existing chart
                if (window.debugChart) {
                    window.debugChart.destroy();
                }
                
                const ctx = trendChart.getContext('2d');
                window.debugChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                        datasets: [{
                            label: 'Test Data',
                            data: [12, 19, 3, 5, 2, 3],
                            borderColor: 'rgba(75, 192, 192, 1)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderWidth: 2,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
                console.log("✅ Test chart created successfully");
            } catch (error) {
                console.error("❌ Error creating test chart:", error);
            }
        }
        
        // Try to trigger the real chart loading
        if (typeof updateTrendChart === 'function') {
            console.log("🔄 Calling updateTrendChart()...");
            try {
                updateTrendChart();
                console.log("✅ updateTrendChart() called successfully");
            } catch (error) {
                console.error("❌ Error calling updateTrendChart():", error);
            }
        } else {
            console.error("❌ updateTrendChart function not found");
        }
    }
    
    if (impactTab) {
        console.log("🔄 Force loading impact tab...");
        
        // Try to trigger the real data loading
        if (typeof loadPaperAttentionData === 'function') {
            console.log("🔄 Calling loadPaperAttentionData()...");
            try {
                loadPaperAttentionData();
                console.log("✅ loadPaperAttentionData() called successfully");
            } catch (error) {
                console.error("❌ Error calling loadPaperAttentionData():", error);
            }
        } else {
            console.error("❌ loadPaperAttentionData function not found");
        }
    }
}

// Check fetch capability with keyword stats
function testFetch() {
    console.log("🔄 Testing fetch capabilities...");
    
    fetch('articles/keyword_stats.json')
        .then(response => {
            console.log("📊 keyword_stats.json status:", response.status);
            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("✅ Successfully fetched keyword_stats.json");
            console.log("📊 Keywords count:", Object.keys(data.keywords || {}).length);
            console.log("📊 Updated at:", data.updated_at);
        })
        .catch(error => {
            console.error("❌ Error fetching keyword_stats.json:", error);
        });
    
    fetch('paper_attention.json')
        .then(response => {
            console.log("📊 paper_attention.json status:", response.status);
            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("✅ Successfully fetched paper_attention.json");
            console.log("📊 Papers count:", data.length);
        })
        .catch(error => {
            console.error("❌ Error fetching paper_attention.json:", error);
        });
}

// Add a debug button to the page
function addDebugButton() {
    const button = document.createElement('button');
    button.textContent = '🛠️ Debug Dashboard';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '9999';
    button.style.padding = '10px';
    button.style.backgroundColor = '#ff0066';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    
    button.addEventListener('click', () => {
        console.log("🔄 Running full diagnostics...");
        forceInitTabs();
        testFetch();
    });
    
    document.body.appendChild(button);
    console.log("✅ Debug button added to the page");
}

// Start debugging
setTimeout(() => {
    console.log("🔄 Starting debug process...");
    addDebugButton();
}, 2000);

console.log("✅ Debug script initialized"); 