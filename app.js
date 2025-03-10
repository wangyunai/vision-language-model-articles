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
    
    // The rest of your functions for trends and impact tabs remain mostly unchanged
    // Just ensure they're included below this point
    
    // Initialize trend analysis
    function initTrendAnalysis() {
        // Your existing code...
    }
    
    // Update trend chart
    function updateTrendChart() {
        // Your existing code...
    }
    
    // Load paper attention data
    function loadPaperAttentionData() {
        // Your existing code...
    }
    
    // End of code
}); 