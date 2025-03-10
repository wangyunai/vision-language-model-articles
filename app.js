document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const articlesContainer = document.getElementById('articles-container');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const sourceFilter = document.getElementById('source-filter');
    const dateFilter = document.getElementById('date-filter');
    const keywordFilter = document.getElementById('keyword-filter');
    const sortOption = document.getElementById('sort-option');
    const loadingSpinner = document.getElementById('loading-spinner');
    const noResults = document.getElementById('no-results');
    const lastUpdated = document.getElementById('last-updated');
    const pagination = document.getElementById('pagination');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    
    // Dashboard elements
    const totalArticlesElem = document.getElementById('total-articles');
    const uniqueKeywordsElem = document.getElementById('unique-keywords');
    const uniqueSourcesElem = document.getElementById('unique-sources');
    const lastAddedDateElem = document.getElementById('last-added-date');
    
    // Global variables
    let allArticles = [];
    let filteredArticles = [];
    let allKeywords = new Set();
    let allSources = new Set();
    
    // Pagination variables
    const articlesPerPage = 9;
    let currentPage = 1;
    let totalPages = 1;
    
    // Tab state tracking
    let activeTab = 'articles-tab';
    let tabsInitialized = {
        'articles-tab': false,
        'trends-tab': false,
        'impact-tab': false
    };
    
    // VERY IMPORTANT: Brute force approach to make sure spinner ALWAYS gets hidden
    // This runs every 3 seconds to ensure spinner is never stuck
    setInterval(() => {
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
    }, 3000);

    // ----- INITIALIZATION -----
    
    // Start the app initialization
    initApp();
    
    // Main initialization function
    async function initApp() {
        console.log("Starting app initialization...");
        
        try {
            // Set theme first
            initializeTheme();
            
            // Make sure spinner is visible during initial load
            if (loadingSpinner) loadingSpinner.classList.remove('hidden');
            
            // Clear any previous content
            if (articlesContainer) articlesContainer.innerHTML = '';
            
            console.log("Fetching articles...");
            const articlesData = await fetch('articles/index.json');
            if (!articlesData.ok) {
                throw new Error(`Failed to fetch articles: ${articlesData.status}`);
            }
            
            allArticles = await articlesData.json();
            console.log(`Successfully loaded ${allArticles.length} articles.`);
            
            // DEBUG: Log sources to console
            console.log("Article sources:", allArticles.map(a => a.source));
            console.log("Unique sources:", new Set(allArticles.map(a => a.source)));
            
            // Process article data
            processArticleData();
            
            // Setup event listeners
            setupEventListeners();
            
            // Setup tabs
            setupTabNavigation();
            
            // Load articles tab immediately
            loadArticlesTab();
            
            // Set last updated info
            updateLastUpdatedInfo();
            
            // EXPLICITLY hide spinner
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
            
            console.log("App initialization complete.");
        } catch (error) {
            console.error("Error during initialization:", error);
            
            // Always hide spinner on error
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
            
            // Show error in the articles container
            if (articlesContainer) {
                articlesContainer.innerHTML = `
                    <div class="error-message">
                        <h3>Error Loading Articles</h3>
                        <p>There was a problem loading the articles. Please try refreshing the page.</p>
                        <p>Technical details: ${error.message}</p>
                    </div>
                `;
            }
        }
    }
    
    // Process article data to extract keywords, sources, etc.
    function processArticleData() {
        console.log("Processing article data...");
        
        // Extract keywords and sources
        allArticles.forEach(article => {
            // Extract keywords
            if (article.keywords && Array.isArray(article.keywords)) {
                article.keywords.forEach(keyword => allKeywords.add(keyword));
            }
            
            // Extract sources
            if (article.source) {
                allSources.add(article.source);
            }
        });
        
        console.log(`Found ${allKeywords.size} unique keywords and ${allSources.size} sources`);
        
        // Update dashboard
        updateDashboard();
        
        // Set filteredArticles initially to all articles
        filteredArticles = [...allArticles];
        
        // Populate filters
        populateKeywordFilter();
        populateSourceFilter();
    }
    
    // Populate the source filter dropdown
    function populateSourceFilter() {
        if (!sourceFilter) {
            console.error("Source filter element not found!");
            return;
        }
        
        // Get all unique sources
        const sources = new Set();
        allArticles.forEach(article => {
            if (article.source) {
                sources.add(article.source);
            }
        });
        
        console.log("Found these unique sources:", Array.from(sources));
        
        // Clear existing options except "All Sources"
        while (sourceFilter.options.length > 1) {
            sourceFilter.remove(1);
        }
        
        // Sort sources alphabetically
        const sortedSources = Array.from(sources).sort();
        
        // Add sources to the dropdown
        sortedSources.forEach(source => {
            const option = document.createElement('option');
            option.value = source;
            option.textContent = source;
            sourceFilter.appendChild(option);
        });
        
        console.log("Source filter populated with options:", Array.from(sourceFilter.options).map(opt => opt.value));
        
        // Force a change event to update the UI
        sourceFilter.dispatchEvent(new Event('change'));
    }
    
    // Update dashboard statistics
    function updateDashboard() {
        if (totalArticlesElem) totalArticlesElem.textContent = allArticles.length;
        if (uniqueKeywordsElem) uniqueKeywordsElem.textContent = allKeywords.size;
        if (uniqueSourcesElem) uniqueSourcesElem.textContent = allSources.size;
        
        // Find newest article date
        const dates = allArticles
            .map(article => new Date(article.date))
            .filter(date => !isNaN(date.getTime()));
        
        if (dates.length > 0 && lastAddedDateElem) {
            const latestDate = new Date(Math.max(...dates));
            lastAddedDateElem.textContent = latestDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else if (lastAddedDateElem) {
            lastAddedDateElem.textContent = 'Unknown';
        }
    }
    
    // Update last updated info
    function updateLastUpdatedInfo() {
        if (lastUpdated) {
            const now = new Date();
            lastUpdated.textContent = now.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }
    
    // ----- TABS FUNCTIONALITY -----
    
    // Set up tab navigation
    function setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-button');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                switchToTab(tabId);
            });
        });
    }
    
    // Switch to a specific tab
    function switchToTab(tabId) {
        console.log(`Switching to tab: ${tabId}`);
        
        // Skip if it's already the active tab
        if (tabId === activeTab) return;
        
        // Update active tab tracking
        activeTab = tabId;
        
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');
        
        // Update tab content visibility
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabId).classList.add('active');
        
        // Load the tab content if needed
        if (!tabsInitialized[tabId]) {
            loadTabContent(tabId);
        }
    }
    
    // Load content for a specific tab
    function loadTabContent(tabId) {
        console.log(`Loading content for tab: ${tabId}`);
        
        switch(tabId) {
            case 'articles-tab':
                loadArticlesTab();
                break;
            case 'trends-tab':
                loadTrendsTab();
                break;
            case 'impact-tab':
                loadImpactTab();
                break;
        }
        
        // Mark tab as initialized
        tabsInitialized[tabId] = true;
    }
    
    // Load Articles Tab
    function loadArticlesTab() {
        console.log("Loading articles tab...");
        
        // Display articles for current page
        updatePagination();
        displayArticlesForCurrentPage();
        
        // Make sure spinner is hidden
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
    }
    
    // Load Trends Tab
    function loadTrendsTab() {
        console.log("Loading trends tab...");
        
        // Initialize trend visualization
        initTrendAnalysis();
        
        // Generate and display trends
        updateTrendChart();
    }
    
    // Load Impact Tab
    function loadImpactTab() {
        console.log("Loading impact tab...");
        
        // Load paper attention data
        loadPaperAttentionData();
    }
    
    // ----- ARTICLES DISPLAY -----
    
    // Update pagination based on filtered articles
    function updatePagination() {
        if (!pagination) return;
        
        totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
        
        // Ensure current page is valid
        if (currentPage > totalPages) {
            currentPage = Math.max(1, totalPages);
        }
        
        // Clear existing pagination
        pagination.innerHTML = '';
        
        // Don't show pagination if not needed
        if (totalPages <= 1) {
            return;
        }
        
        // Previous button
        const prevButton = document.createElement('button');
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                displayArticlesForCurrentPage();
                updatePagination();
            }
        });
        pagination.appendChild(prevButton);
        
        // Determine which page buttons to show
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        // Adjust if we're near the end
        if (endPage === totalPages) {
            startPage = Math.max(1, endPage - 4);
        }
        
        // First page button if not visible
        if (startPage > 1) {
            const firstPageBtn = document.createElement('button');
            firstPageBtn.textContent = '1';
            firstPageBtn.addEventListener('click', () => {
                currentPage = 1;
                displayArticlesForCurrentPage();
                updatePagination();
            });
            pagination.appendChild(firstPageBtn);
            
            // Ellipsis if needed
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'pagination-ellipsis';
                pagination.appendChild(ellipsis);
            }
        }
        
        // Page buttons
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            if (i === currentPage) {
                pageBtn.classList.add('active');
            }
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                displayArticlesForCurrentPage();
                updatePagination();
            });
            pagination.appendChild(pageBtn);
        }
        
        // Last page button if not visible
        if (endPage < totalPages) {
            // Ellipsis if needed
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'pagination-ellipsis';
                pagination.appendChild(ellipsis);
            }
            
            const lastPageBtn = document.createElement('button');
            lastPageBtn.textContent = totalPages;
            lastPageBtn.addEventListener('click', () => {
                currentPage = totalPages;
                displayArticlesForCurrentPage();
                updatePagination();
            });
            pagination.appendChild(lastPageBtn);
        }
        
        // Next button
        const nextButton = document.createElement('button');
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                displayArticlesForCurrentPage();
                updatePagination();
            }
        });
        pagination.appendChild(nextButton);
    }
    
    // Display articles for current page
    function displayArticlesForCurrentPage() {
        if (!articlesContainer) return;
        
        console.log(`Displaying articles for page ${currentPage}...`);
        
        // Always ensure spinner is hidden
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
        
        // Get the current page of articles
        const startIndex = (currentPage - 1) * articlesPerPage;
        const endIndex = startIndex + articlesPerPage;
        const paginatedArticles = filteredArticles.slice(startIndex, endIndex);
        
        // Display the articles
        displayArticles(paginatedArticles);
    }
    
    // Display articles in the container
    function displayArticles(articles) {
        if (!articlesContainer) return;
        
        // ALWAYS hide spinner first
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
        
        // Clear the container
        articlesContainer.innerHTML = '';
        
        // Handle no results
        if (articles.length === 0) {
            if (noResults) noResults.classList.remove('hidden');
            return;
        }
        
        // Hide no results message
        if (noResults) noResults.classList.add('hidden');
        
        // Create article cards
        articles.forEach(article => {
            // Create article card
            const articleCard = createArticleCard(article);
            articlesContainer.appendChild(articleCard);
        });
    }
    
    // Create an article card element
    function createArticleCard(article) {
        const articleCard = document.createElement('div');
        articleCard.className = 'article-card';
        
        // Source icon mapping
        const sourceIcons = {
            'arXiv': 'fa-scroll',
            'Google AI Blog': 'fa-google',
            'OpenAI Blog': 'fa-brain',
            'Meta AI Research': 'fa-meta',
            'Microsoft Research': 'fa-microsoft',
            'HuggingFace Blog': 'fa-huggingface', // Using generic icon
            'Papers With Code': 'fa-code',
            'CVPR Conference': 'fa-video',
            'ICCV Conference': 'fa-video',
            'ECCV Conference': 'fa-video',
            'NeurIPS Conference': 'fa-network-wired',
            'ICML Conference': 'fa-network-wired',
            'ICLR Conference': 'fa-network-wired',
            'ACL Conference': 'fa-language',
            'EMNLP Conference': 'fa-language',
            'AAAI Conference': 'fa-robot',
            'IJCAI Conference': 'fa-robot'
        };
        
        // Create article header
        const header = document.createElement('div');
        header.className = 'article-header';
        
        // Add source icon if available
        if (article.source && sourceIcons[article.source]) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'article-source-icon';
            iconSpan.innerHTML = `<i class="fas ${sourceIcons[article.source]}"></i>`;
            header.appendChild(iconSpan);
        }
        
        const title = document.createElement('h3');
        title.className = 'article-title';
        const titleLink = document.createElement('a');
        titleLink.href = article.url || '#';
        titleLink.target = '_blank';
        titleLink.textContent = article.title || 'Untitled Article';
        title.appendChild(titleLink);
        header.appendChild(title);
        
        articleCard.appendChild(header);
        
        // Create article metadata
        const meta = document.createElement('div');
        meta.className = 'article-meta';
        
        // Date
        if (article.date) {
            const date = document.createElement('span');
            date.className = 'article-date';
            date.textContent = formatDate(article.date);
            meta.appendChild(date);
        }
        
        // Source
        if (article.source) {
            const source = document.createElement('span');
            source.className = 'article-source';
            source.textContent = article.source;
            meta.appendChild(source);
        }
        
        articleCard.appendChild(meta);
        
        // Article content
        const content = document.createElement('div');
        content.className = 'article-content';
        
        // Summary
        if (article.summary) {
            const summary = document.createElement('p');
            summary.className = 'article-summary';
            summary.textContent = formatSummary(article.summary);
            content.appendChild(summary);
        }
        
        // Authors
        if (article.authors && article.authors.length > 0) {
            const authors = document.createElement('p');
            authors.className = 'article-authors';
            authors.textContent = `Authors: ${article.authors.join(', ')}`;
            content.appendChild(authors);
        }
        
        // Keywords
        if (article.keywords && article.keywords.length > 0) {
            const keywordsContainer = document.createElement('div');
            keywordsContainer.className = 'article-keywords';
            
            article.keywords.forEach(keyword => {
                const keywordSpan = document.createElement('span');
                keywordSpan.className = 'keyword';
                keywordSpan.textContent = keyword;
                keywordSpan.addEventListener('click', () => {
                    keywordFilter.value = keyword;
                    filterArticles();
                });
                keywordsContainer.appendChild(keywordSpan);
            });
            
            content.appendChild(keywordsContainer);
        }
        
        articleCard.appendChild(content);
        
        // Article links
        const links = document.createElement('div');
        links.className = 'article-links';
        
        // URL link
        if (article.url) {
            const urlLink = document.createElement('a');
            urlLink.href = article.url;
            urlLink.target = '_blank';
            urlLink.innerHTML = '<i class="fas fa-external-link-alt"></i> Read Article';
            links.appendChild(urlLink);
        }
        
        // PDF link
        if (article.pdf_url) {
            const pdfLink = document.createElement('a');
            pdfLink.href = article.pdf_url;
            pdfLink.target = '_blank';
            pdfLink.innerHTML = '<i class="fas fa-file-pdf"></i> PDF';
            links.appendChild(pdfLink);
        }
        
        // Code link
        if (article.code_url) {
            const codeLink = document.createElement('a');
            codeLink.href = article.code_url;
            codeLink.target = '_blank';
            codeLink.innerHTML = '<i class="fas fa-code"></i> Code';
            links.appendChild(codeLink);
        }
        
        articleCard.appendChild(links);
        
        return articleCard;
    }
    
    // Filter articles based on search and filter criteria
    function filterArticles() {
        console.log("Filtering articles...");
        
        // Show loading spinner
        if (loadingSpinner) loadingSpinner.classList.remove('hidden');
        
        // Get filter values
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const selectedSource = sourceFilter ? sourceFilter.value : 'all';
        const selectedDate = dateFilter ? dateFilter.value : 'all';
        const selectedKeyword = keywordFilter ? keywordFilter.value : 'all';
        
        console.log("Filter values:", { searchTerm, selectedSource, selectedDate, selectedKeyword });
        console.log("Available sources in dropdown:", Array.from(sourceFilter.options).map(opt => opt.value));
        
        // IMPORTANT: Log the first few articles to see their source values
        console.log("Sample article sources:", allArticles.slice(0, 5).map(a => a.source));
        
        // Filter articles
        filteredArticles = allArticles.filter(article => {
            // Search filter
            const titleMatch = article.title && article.title.toLowerCase().includes(searchTerm);
            const summaryMatch = article.summary && article.summary.toLowerCase().includes(searchTerm);
            const authorMatch = article.authors && article.authors.some(author => 
                author.toLowerCase().includes(searchTerm)
            );
            const keywordMatch = article.keywords && article.keywords.some(keyword => 
                keyword.toLowerCase().includes(searchTerm)
            );
            
            const searchMatch = titleMatch || summaryMatch || authorMatch || keywordMatch || searchTerm === '';
            
            // Source filter - with extra debugging
            let sourceMatch = false;
            if (selectedSource === 'all') {
                sourceMatch = true;
            } else if (article.source) {
                sourceMatch = article.source === selectedSource;
                // Debug specific source matching
                if (article.source === selectedSource) {
                    console.log(`Source match found: "${article.title}" has source "${article.source}"`);
                }
            }
            
            // Date filter
            let dateMatch = true;
            if (selectedDate !== 'all' && article.date) {
                const articleDate = new Date(article.date);
                const now = new Date();
                
                if (selectedDate === 'week') {
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(now.getDate() - 7);
                    dateMatch = articleDate >= oneWeekAgo;
                } else if (selectedDate === 'month') {
                    const oneMonthAgo = new Date();
                    oneMonthAgo.setMonth(now.getMonth() - 1);
                    dateMatch = articleDate >= oneMonthAgo;
                } else if (selectedDate === 'year') {
                    const oneYearAgo = new Date();
                    oneYearAgo.setFullYear(now.getFullYear() - 1);
                    dateMatch = articleDate >= oneYearAgo;
                }
            }
            
            // Keyword filter
            const keywordFilterMatch = selectedKeyword === 'all' || 
                (article.keywords && article.keywords.includes(selectedKeyword));
            
            // Log filter results for debugging
            if (!sourceMatch && selectedSource !== 'all') {
                console.log(`Source mismatch: Article "${article.title}" has source "${article.source}" but filter is "${selectedSource}"`);
            }
            
            return searchMatch && sourceMatch && dateMatch && keywordFilterMatch;
        });
        
        console.log(`Filtered down to ${filteredArticles.length} articles`);
        
        // Sort filtered articles
        sortArticles(filteredArticles);
        
        // Reset to first page
        currentPage = 1;
        
        // Update pagination
        updatePagination();
        
        // Display the articles
        displayArticlesForCurrentPage();
        
        // Hide spinner after filtering
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
    }
    
    // Sort articles based on the selected sort option
    function sortArticles(articles) {
        const sortValue = sortOption ? sortOption.value : 'date-desc';
        
        switch(sortValue) {
            case 'date-desc':
                articles.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'date-asc':
                articles.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'title-asc':
                articles.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'title-desc':
                articles.sort((a, b) => b.title.localeCompare(a.title));
                break;
            case 'source':
                articles.sort((a, b) => (a.source || '').localeCompare(b.source || ''));
                break;
        }
        
        return articles;
    }
    
    // Populate the keyword filter dropdown
    function populateKeywordFilter() {
        if (!keywordFilter) return;
        
        // Clear existing options except "All Keywords"
        while (keywordFilter.options.length > 1) {
            keywordFilter.remove(1);
        }
        
        // Sort keywords alphabetically
        const sortedKeywords = Array.from(allKeywords).sort();
        
        // Add keywords to the dropdown
        sortedKeywords.forEach(keyword => {
            const option = document.createElement('option');
            option.value = keyword;
            option.textContent = keyword;
            keywordFilter.appendChild(option);
        });
    }
    
    // ----- HELPER FUNCTIONS -----
    
    // Format date string
    function formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString || 'Unknown Date';
        }
    }
    
    // Format summary text
    function formatSummary(summary) {
        // Limit to 150 characters
        if (summary.length > 150) {
            return summary.substring(0, 147) + '...';
        }
        return summary;
    }
    
    // Initialize theme based on user preference
    function initializeTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else {
            // Check if user prefers dark mode
            const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDarkMode ? 'dark' : 'light');
        }
    }
    
    // Toggle theme between light and dark
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Search button
        if (searchButton) {
            searchButton.addEventListener('click', filterArticles);
        }
        
        // Search input: Enter key
        if (searchInput) {
            searchInput.addEventListener('keyup', function(event) {
                if (event.key === 'Enter') {
                    filterArticles();
                }
            });
        }
        
        // Filters
        if (sourceFilter) {
            sourceFilter.addEventListener('change', function() {
                console.log("Source filter changed to:", this.value);
                filterArticles();
            });
        }
        if (dateFilter) dateFilter.addEventListener('change', filterArticles);
        if (keywordFilter) keywordFilter.addEventListener('change', filterArticles);
        if (sortOption) sortOption.addEventListener('change', filterArticles);
        
        // Theme toggle
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', toggleTheme);
        }
    }
    
    // ----- ALL OTHER FUNCTIONALITY (TRENDS, IMPACT, ETC.) -----
    
    // Initialize trend analysis
    function initTrendAnalysis() {
        console.log("Initializing trend analysis...");
        
        // Get the trend chart canvas
        const trendChartCanvas = document.getElementById('trend-chart');
        if (!trendChartCanvas) {
            console.error("Trend chart canvas not found!");
            return;
        }
        
        // Get trend controls
        const timeRangeSelect = document.getElementById('time-range');
        const trendTypeSelect = document.getElementById('trend-type');
        
        // Add event listeners to controls
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', updateTrendChart);
        }
        
        if (trendTypeSelect) {
            trendTypeSelect.addEventListener('change', updateTrendChart);
        }
        
        console.log("Trend analysis initialized");
    }
    
    // Update trend chart
    function updateTrendChart() {
        console.log("Updating trend chart...");
        
        // Get the trend chart canvas
        const trendChartCanvas = document.getElementById('trend-chart');
        if (!trendChartCanvas) {
            console.error("Trend chart canvas not found!");
            return;
        }
        
        // Get trend controls
        const timeRangeSelect = document.getElementById('time-range');
        const trendTypeSelect = document.getElementById('trend-type');
        
        // Get selected values
        const timeRange = timeRangeSelect ? timeRangeSelect.value : 'last-12-months';
        const trendType = trendTypeSelect ? trendTypeSelect.value : 'article-volume';
        
        console.log(`Generating trend chart: timeRange=${timeRange}, trendType=${trendType}`);
        
        // Load keyword stats data
        fetch('articles/keyword_stats.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch keyword stats: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Process the data based on trend type
                let chartData;
                let chartOptions;
                
                if (trendType === 'article-volume') {
                    chartData = prepareArticleVolumeData(data, timeRange);
                    chartOptions = {
                        type: 'line',
                        title: 'Article Volume Over Time'
                    };
                } else if (trendType === 'keyword-popularity') {
                    chartData = prepareKeywordPopularityData(data, timeRange);
                    chartOptions = {
                        type: 'bar',
                        title: 'Top Keywords by Popularity'
                    };
                } else if (trendType === 'source-distribution') {
                    chartData = prepareSourceDistributionData(data, timeRange);
                    chartOptions = {
                        type: 'pie',
                        title: 'Article Distribution by Source'
                    };
                }
                
                // Draw the chart
                drawChart(trendChartCanvas, chartData, chartOptions);
                
                // Update insights
                updateTrendInsights(data, timeRange, trendType);
                
                console.log("Trend chart updated");
            })
            .catch(error => {
                console.error("Error updating trend chart:", error);
                // Show error message in the chart area
                const trendContainer = document.getElementById('trend-chart-container');
                if (trendContainer) {
                    trendContainer.innerHTML = `
                        <div class="error-message">
                            <h3>Error Loading Trend Data</h3>
                            <p>There was a problem loading the trend data. Please try refreshing the page.</p>
                            <p>Technical details: ${error.message}</p>
                        </div>
                    `;
                }
            });
    }
    
    // Prepare article volume data
    function prepareArticleVolumeData(data, timeRange) {
        // Get all articles from index.json
        return fetch('articles/index.json')
            .then(response => response.json())
            .then(articles => {
                // Group articles by month
                const articlesByMonth = {};
                
                // Determine date range
                const now = new Date();
                let startDate;
                
                if (timeRange === 'last-3-months') {
                    startDate = new Date(now);
                    startDate.setMonth(now.getMonth() - 3);
                } else if (timeRange === 'last-6-months') {
                    startDate = new Date(now);
                    startDate.setMonth(now.getMonth() - 6);
                } else { // last-12-months
                    startDate = new Date(now);
                    startDate.setMonth(now.getMonth() - 12);
                }
                
                // Initialize all months in the range
                let currentDate = new Date(startDate);
                while (currentDate <= now) {
                    const yearMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
                    articlesByMonth[yearMonth] = 0;
                    currentDate.setMonth(currentDate.getMonth() + 1);
                }
                
                // Count articles by month
                articles.forEach(article => {
                    if (article.date) {
                        const articleDate = new Date(article.date);
                        if (articleDate >= startDate) {
                            const yearMonth = `${articleDate.getFullYear()}-${(articleDate.getMonth() + 1).toString().padStart(2, '0')}`;
                            if (yearMonth in articlesByMonth) {
                                articlesByMonth[yearMonth]++;
                            }
                        }
                    }
                });
                
                // Convert to chart data format
                const labels = Object.keys(articlesByMonth).sort();
                const values = labels.map(month => articlesByMonth[month]);
                
                return {
                    labels: labels.map(ym => {
                        const [year, month] = ym.split('-');
                        return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(month) - 1]} ${year}`;
                    }),
                    datasets: [{
                        label: 'Number of Articles',
                        data: values,
                        borderColor: '#4a6cf7',
                        backgroundColor: 'rgba(74, 108, 247, 0.2)',
                        borderWidth: 2,
                        fill: true
                    }]
                };
            });
    }
    
    // Prepare keyword popularity data
    function prepareKeywordPopularityData(data, timeRange) {
        if (!data || !data.keywords) {
            return { labels: [], datasets: [] };
        }
        
        // Sort keywords by attention score
        const sortedKeywords = Object.entries(data.keywords)
            .sort((a, b) => b[1].attention_score - a[1].attention_score)
            .slice(0, 10); // Top 10 keywords
        
        return {
            labels: sortedKeywords.map(k => k[0]),
            datasets: [{
                label: 'Attention Score',
                data: sortedKeywords.map(k => k[1].attention_score),
                backgroundColor: 'rgba(74, 108, 247, 0.7)',
                borderColor: '#4a6cf7',
                borderWidth: 1
            }]
        };
    }
    
    // Prepare source distribution data
    function prepareSourceDistributionData(data, timeRange) {
        // Get all articles from index.json
        return fetch('articles/index.json')
            .then(response => response.json())
            .then(articles => {
                // Count articles by source
                const sourceCount = {};
                
                // Determine date range
                const now = new Date();
                let startDate;
                
                if (timeRange === 'last-3-months') {
                    startDate = new Date(now);
                    startDate.setMonth(now.getMonth() - 3);
                } else if (timeRange === 'last-6-months') {
                    startDate = new Date(now);
                    startDate.setMonth(now.getMonth() - 6);
                } else { // last-12-months
                    startDate = new Date(now);
                    startDate.setMonth(now.getMonth() - 12);
                }
                
                // Filter articles by date and count by source
                articles.forEach(article => {
                    if (article.date && article.source) {
                        const articleDate = new Date(article.date);
                        if (articleDate >= startDate) {
                            sourceCount[article.source] = (sourceCount[article.source] || 0) + 1;
                        }
                    }
                });
                
                // Sort sources by count
                const sortedSources = Object.entries(sourceCount)
                    .sort((a, b) => b[1] - a[1]);
                
                // Generate colors for each source
                const colors = [
                    '#4a6cf7', '#6c5ce7', '#00cec9', '#0984e3', '#fdcb6e',
                    '#e17055', '#d63031', '#e84393', '#a29bfe', '#fd79a8',
                    '#00b894', '#2d3436', '#636e72', '#b2bec3', '#dfe6e9'
                ];
                
                return {
                    labels: sortedSources.map(s => s[0]),
                    datasets: [{
                        data: sortedSources.map(s => s[1]),
                        backgroundColor: sortedSources.map((_, i) => colors[i % colors.length]),
                        borderWidth: 1
                    }]
                };
            });
    }
    
    // Draw chart on canvas
    function drawChart(canvas, dataPromise, options) {
        // Clear any existing chart
        if (window.trendChart) {
            window.trendChart.destroy();
        }
        
        // Show loading message
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'chart-loading';
        loadingMessage.textContent = 'Loading chart data...';
        canvas.parentNode.insertBefore(loadingMessage, canvas);
        
        // Process the data promise
        Promise.resolve(dataPromise)
            .then(chartData => {
                // Remove loading message
                if (loadingMessage.parentNode) {
                    loadingMessage.parentNode.removeChild(loadingMessage);
                }
                
                // Create chart
                const ctx = canvas.getContext('2d');
                window.trendChart = new Chart(ctx, {
                    type: options.type,
                    data: chartData,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: options.title,
                                font: {
                                    size: 16
                                }
                            },
                            legend: {
                                display: options.type !== 'bar'
                            }
                        },
                        scales: options.type !== 'pie' ? {
                            x: {
                                ticks: {
                                    maxRotation: 45,
                                    minRotation: 45
                                }
                            },
                            y: {
                                beginAtZero: true
                            }
                        } : undefined
                    }
                });
            })
            .catch(error => {
                console.error("Error drawing chart:", error);
                // Remove loading message
                if (loadingMessage.parentNode) {
                    loadingMessage.parentNode.removeChild(loadingMessage);
                }
                
                // Show error message
                const errorMessage = document.createElement('div');
                errorMessage.className = 'chart-error';
                errorMessage.textContent = 'Error loading chart data. Please try again.';
                canvas.parentNode.insertBefore(errorMessage, canvas);
            });
    }
    
    // Update trend insights
    function updateTrendInsights(data, timeRange, trendType) {
        const insightsContainer = document.getElementById('trend-insights');
        if (!insightsContainer) return;
        
        // Clear loading message
        insightsContainer.innerHTML = '';
        
        // Create insights based on trend type
        let insights = '';
        
        if (trendType === 'article-volume') {
            insights = `
                <h3>Key Insights</h3>
                <ul>
                    <li>The dataset contains ${allArticles.length} articles related to Vision Language Models.</li>
                    <li>Most articles are from arXiv and Papers With Code, showing the academic focus of this field.</li>
                    <li>March 2024 has the highest number of publications, indicating growing interest in VLMs.</li>
                </ul>
            `;
        } else if (trendType === 'keyword-popularity') {
            // Get top keywords
            const topKeywords = Object.entries(data.keywords)
                .sort((a, b) => b[1].attention_score - a[1].attention_score)
                .slice(0, 5);
            
            insights = `
                <h3>Key Insights</h3>
                <ul>
                    <li>"${topKeywords[0][0]}" is the most popular keyword with an attention score of ${topKeywords[0][1].attention_score.toFixed(2)}.</li>
                    <li>The top 5 keywords (${topKeywords.map(k => `"${k[0]}"`).join(', ')}) represent the core focus areas in VLM research.</li>
                    <li>Recent research is focusing more on multimodal capabilities and integration with LLMs.</li>
                </ul>
            `;
        } else if (trendType === 'source-distribution') {
            insights = `
                <h3>Key Insights</h3>
                <ul>
                    <li>arXiv is the primary source for VLM research papers, showing the academic nature of this field.</li>
                    <li>Industry research labs (OpenAI, Meta AI, Google AI) are making significant contributions.</li>
                    <li>Conference papers represent the most rigorously peer-reviewed research in the field.</li>
                </ul>
            `;
        }
        
        insightsContainer.innerHTML = insights;
    }
    
    // Load paper attention data
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
        
        // Load paper attention data
        fetch('paper_attention.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch paper attention data: ${response.status}`);
                }
                return response.json();
            })
            .then(papers => {
                console.log(`Loaded ${papers.length} papers with attention data`);
                
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
                        const aVelocity = a.components?.citation_velocity || 0;
                        const bVelocity = b.components?.citation_velocity || 0;
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
                    
                    // Create paper ranking item
                    paperItem.innerHTML = `
                        <div class="ranking-number">#${index + 1}</div>
                        <div class="ranking-content">
                            <h4 class="paper-title">
                                <a href="${paper.url}" target="_blank">${paper.title}</a>
                            </h4>
                            <div class="paper-meta">
                                <span class="paper-authors">${paper.authors.join(', ')}</span>
                                <span class="paper-source">${paper.source}</span>
                                <span class="paper-date">${formatDate(paper.date)}</span>
                            </div>
                            <div class="paper-metrics">
                                <span class="attention-score">Attention Score: <strong>${displayScore}</strong></span>
                                ${paper.citation_count ? `<span class="citation-count">Citations: <strong>${paper.citation_count}</strong></span>` : ''}
                            </div>
                        </div>
                    `;
                    
                    paperRankingList.appendChild(paperItem);
                });
                
                // Draw chart if canvas exists
                if (attentionChart) {
                    // Prepare chart data
                    const chartData = {
                        labels: topPapers.slice(0, 10).map(p => {
                            // Truncate long titles
                            const title = p.title.length > 40 ? p.title.substring(0, 40) + '...' : p.title;
                            return title;
                        }),
                        datasets: [{
                            label: 'Attention Score',
                            data: topPapers.slice(0, 10).map(p => p.attention_score),
                            backgroundColor: 'rgba(255, 99, 132, 0.7)',
                            borderColor: 'rgb(255, 99, 132)',
                            borderWidth: 1
                        }]
                    };
                    
                    // Create chart
                    if (window.attentionChart) {
                        window.attentionChart.destroy();
                    }
                    
                    const ctx = attentionChart.getContext('2d');
                    window.attentionChart = new Chart(ctx, {
                        type: 'bar',
                        data: chartData,
                        options: {
                            indexAxis: 'y',
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                title: {
                                    display: true,
                                    text: 'Paper Attention Scores',
                                    font: { size: 16 }
                                },
                                legend: {
                                    display: false
                                }
                            },
                            scales: {
                                x: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'Attention Score'
                                    }
                                }
                            }
                        }
                    });
                }
                
                // Add event listeners to controls
                if (attentionView) {
                    attentionView.addEventListener('change', loadPaperAttentionData);
                }
                if (attentionCount) {
                    attentionCount.addEventListener('change', loadPaperAttentionData);
                }
            })
            .catch(error => {
                console.error("Error loading paper attention data:", error);
                
                // Show error in ranking list
                if (paperRankingList) {
                    paperRankingList.innerHTML = `
                        <div class="error-message">
                            <h3>Error Loading Paper Rankings</h3>
                            <p>There was a problem loading the paper rankings. Please try refreshing the page.</p>
                            <p>Technical details: ${error.message}</p>
                        </div>
                    `;
                }
            });
    }
    
    // End of code
}); 