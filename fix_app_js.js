// Patch for app.js to fix attention score display issues
// Copy this code to app.js after loadPaperAttentionData function 
// Or use it as a reference to fix the existing code

// Fixed version of loadPaperAttentionData function
function loadPaperAttentionData() {
    console.log("Loading paper attention data...");
    
    const attentionChart = document.getElementById('attention-chart');
    const paperRankingList = document.getElementById('paper-ranking-list');
    const attentionView = document.getElementById('attention-view');
    const attentionCount = document.getElementById('attention-count');
    
    if (!paperRankingList) {
        console.error("Paper ranking list element not found!");
        return;
    }
    
    // Show loading state
    paperRankingList.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading paper rankings...</p>
        </div>
    `;
    
    // Get selected values
    const viewType = attentionView ? attentionView.value : 'attention';
    const count = attentionCount ? parseInt(attentionCount.value) : 10;
    
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    // Debug: log the request URL
    console.log("Fetching paper_attention.json with timestamp:", timestamp);
    
    // Load paper attention data
    fetch(`paper_attention.json?t=${timestamp}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch paper attention data: ${response.status}`);
            }
            return response.json();
        })
        .then(papers => {
            console.log(`Loaded ${papers.length} papers with attention data`);
            
            // Debug: log the first paper's data
            if (papers.length > 0) {
                console.log("First paper data:", papers[0]);
                console.log("First paper attention score:", papers[0].attention_score);
                console.log("First paper attention score type:", typeof papers[0].attention_score);
            }
            
            // Ensure attention scores are numbers
            papers = papers.map(paper => {
                if (paper.attention_score === undefined || paper.attention_score === null) {
                    paper.attention_score = 0;
                } else if (typeof paper.attention_score === 'string') {
                    paper.attention_score = parseFloat(paper.attention_score) || 0;
                }
                return paper;
            });
            
            // Sort papers based on view type
            let sortedPapers;
            
            if (viewType === 'attention') {
                // Sort by overall attention score
                sortedPapers = papers.sort((a, b) => b.attention_score - a.attention_score);
            } else if (viewType === 'recent') {
                // Sort by recency-weighted attention
                sortedPapers = papers.sort((a, b) => {
                    const aDate = new Date(a.date);
                    const bDate = new Date(b.date);
                    // Weight: 70% attention score, 30% recency
                    const aScore = 0.7 * a.attention_score + 0.3 * (aDate.getTime() / 1000000000);
                    const bScore = 0.7 * b.attention_score + 0.3 * (bDate.getTime() / 1000000000);
                    return bScore - aScore;
                });
            } else if (viewType === 'velocity') {
                // Sort by velocity (citation velocity if available, otherwise attention score)
                sortedPapers = papers.sort((a, b) => {
                    const aVelocity = a.attention_components?.citation_velocity || 0;
                    const bVelocity = b.attention_components?.citation_velocity || 0;
                    return bVelocity - aVelocity || b.attention_score - a.attention_score;
                });
            }
            
            // Limit to the requested count
            const topPapers = sortedPapers.slice(0, count);
            
            // Display in the ranking list
            paperRankingList.innerHTML = '';
            
            if (topPapers.length === 0) {
                paperRankingList.innerHTML = `<p class="no-data">No paper attention data available.</p>`;
                return;
            }
            
            // Create ranking list
            topPapers.forEach((paper, index) => {
                const paperItem = document.createElement('div');
                paperItem.className = 'ranking-item';
                
                // Format attention score for display
                const displayScore = Math.round(paper.attention_score * 10) / 10;
                
                // Debug: log each paper's score
                console.log(`Paper #${index + 1}: "${paper.title.substring(0, 30)}..." - Score: ${displayScore}`);
                
                // Create paper ranking item
                paperItem.innerHTML = `
                    <div class="ranking-number">#${index + 1}</div>
                    <div class="ranking-content">
                        <h4 class="paper-title">
                            <a href="${paper.url}" target="_blank">${paper.title}</a>
                        </h4>
                        <div class="paper-meta">
                            <span class="paper-source">${paper.source || 'Unknown source'}</span>
                            <span class="paper-date">${paper.date || 'Unknown date'}</span>
                        </div>
                        <div class="paper-metrics">
                            <span class="attention-score">Attention Score: <strong>${displayScore}</strong></span>
                        </div>
                    </div>
                `;
                
                paperRankingList.appendChild(paperItem);
            });
            
            // Draw chart if canvas exists
            if (attentionChart) {
                // Prepare chart data
                const chartData = {
                    labels: topPapers.map(p => p.title.substring(0, 30) + '...'),
                    datasets: [{
                        label: 'Attention Score',
                        data: topPapers.map(p => p.attention_score),
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }]
                };
                
                // Clear any existing chart
                if (window.attentionScoreChart) {
                    window.attentionScoreChart.destroy();
                }
                
                // Create chart
                window.attentionScoreChart = new Chart(attentionChart, {
                    type: 'bar',
                    data: chartData,
                    options: {
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        },
                        plugins: {
                            legend: {
                                display: false
                            }
                        }
                    }
                });
            }
        })
        .catch(error => {
            console.error("Error loading paper attention data:", error);
            paperRankingList.innerHTML = `
                <div class="error-message">
                    <p>Failed to load paper attention data: ${error.message}</p>
                    <p>Check the browser console for details.</p>
                </div>
            `;
        });
} 