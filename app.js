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
    
    // Source Icons - mapping source names to Font Awesome icons
    const sourceIcons = {
        'arXiv': 'fa-scroll',
        'Google AI Blog': 'fa-google',
        'OpenAI Blog': 'fa-brain',
        'Meta AI Research': 'fa-meta',
        'Microsoft Research': 'fa-microsoft',
        'HuggingFace Blog': 'fa-smile',
        'Papers With Code': 'fa-code'
    };
    
    // Trend Analysis variables
    let trendChart = null;
    const colorPalette = [
        '#2196F3', '#FF5722', '#4CAF50', '#9C27B0', 
        '#FF9800', '#795548', '#607D8B', '#E91E63',
        '#00BCD4', '#FFEB3B', '#8BC34A', '#FFC107'
    ];
    
    // Fetch articles from the JSON file
    async function fetchArticles() {
        try {
            const response = await fetch('articles/index.json');
            if (!response.ok) {
                throw new Error(`Failed to fetch articles: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            console.log(`Fetched ${data.length} articles`);
            return data;
        } catch (error) {
            console.error('Error fetching articles:', error);
            return [];
        }
    }

    // Initialize the page
    async function init() {
        // Initialize dark/light mode
        initializeTheme();
        
        // Fetch the articles (needed for basic stats)
        allArticles = await fetchArticles();
        
        // Extract keywords and sources (need to be done once, not per tab)
        console.log("Extracting keywords and sources...");
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
        
        // Update dashboard statistics now that we have all the data
        updateDashboardStats();
        
        // Set last updated date
        updateLastUpdatedDate();
        
        // Set up tab navigation
        setupTabNavigation();
        
        // Initialize the default (first) tab
        initializeTab(activeTab);
    }
    
    // Initialize theme based on user preference or system setting
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
        
        // Update chart colors if trend chart exists
        if (trendChart) {
            updateTrendChart();
        }
    }
    
    // Update dashboard statistics
    function updateDashboardStats() {
        // Total articles
        totalArticlesElem.textContent = allArticles.length;
        
        // Unique keywords
        uniqueKeywordsElem.textContent = allKeywords.size;
        
        // Unique sources
        uniqueSourcesElem.textContent = allSources.size;
        
        // Last added date
        const dates = allArticles
            .map(article => new Date(article.date))
            .filter(date => !isNaN(date.getTime()));
        
        if (dates.length > 0) {
            const latestDate = new Date(Math.max(...dates));
            lastAddedDateElem.textContent = latestDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else {
            lastAddedDateElem.textContent = 'Unknown';
        }
    }

    // Populate the keyword filter dropdown
    function populateKeywordFilter() {
        keywordFilter.innerHTML = '<option value="all">All Keywords</option>';
        
        // Sort keywords alphabetically
        const sortedKeywords = Array.from(allKeywords).sort();
        
        sortedKeywords.forEach(keyword => {
            const option = document.createElement('option');
            option.value = keyword;
            option.textContent = keyword;
            keywordFilter.appendChild(option);
        });
    }

    // Update the last updated date
    function updateLastUpdatedDate() {
        if (allArticles.length > 0) {
            // Get the most recent article date
            const dates = allArticles
                .map(article => new Date(article.date))
                .filter(date => !isNaN(date.getTime()));
            
            if (dates.length > 0) {
                const latestDate = new Date(Math.max(...dates));
                lastUpdated.textContent = latestDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } else {
                lastUpdated.textContent = 'Unknown';
            }
        } else {
            lastUpdated.textContent = 'Unknown';
        }
    }
    
    // Sort articles based on selected option
    function sortArticles(articles) {
        const sortBy = sortOption.value;
        
        return [...articles].sort((a, b) => {
            switch (sortBy) {
                case 'date-desc':
                    return new Date(b.date) - new Date(a.date);
                case 'date-asc':
                    return new Date(a.date) - new Date(b.date);
                case 'title-asc':
                    return a.title.localeCompare(b.title);
                case 'title-desc':
                    return b.title.localeCompare(a.title);
                case 'source':
                    return a.source.localeCompare(b.source);
                default:
                    return new Date(b.date) - new Date(a.date);
            }
        });
    }
    
    // Update pagination UI
    function updatePagination() {
        totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
        
        // Adjust current page if it's out of bounds
        if (currentPage > totalPages) {
            currentPage = Math.max(1, totalPages);
        }
        
        // Create pagination controls
        pagination.innerHTML = '';
        
        // Only show pagination if there are multiple pages
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
        
        // Page buttons
        const maxPages = 5; // Maximum number of page buttons to show
        let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
        let endPage = Math.min(totalPages, startPage + maxPages - 1);
        
        // Adjust start page if we're near the end
        if (endPage - startPage + 1 < maxPages) {
            startPage = Math.max(1, endPage - maxPages + 1);
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
        const startIndex = (currentPage - 1) * articlesPerPage;
        const endIndex = startIndex + articlesPerPage;
        const paginatedArticles = filteredArticles.slice(startIndex, endIndex);
        
        displayArticles(paginatedArticles);
    }

    // Display articles
    function displayArticles(articles) {
        articlesContainer.innerHTML = '';
        
        // Hide loading spinner
        loadingSpinner.classList.add('hidden');
        
        if (articles.length === 0) {
            noResults.classList.remove('hidden');
            pagination.innerHTML = '';
            return;
        }
        
        noResults.classList.add('hidden');
        
        articles.forEach(article => {
            const articleCard = document.createElement('div');
            articleCard.className = 'article-card';
            
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
            titleLink.href = article.url;
            titleLink.target = '_blank';
            titleLink.textContent = article.title;
            title.appendChild(titleLink);
            
            const meta = document.createElement('div');
            meta.className = 'article-meta';
            
            const date = document.createElement('span');
            date.className = 'article-date';
            date.textContent = formatDate(article.date);
            
            const source = document.createElement('span');
            source.className = 'article-source';
            source.textContent = article.source;
            
            meta.appendChild(date);
            meta.appendChild(source);
            
            header.appendChild(title);
            header.appendChild(meta);
            
            // Create article content
            const content = document.createElement('div');
            content.className = 'article-content';
            
            const summary = document.createElement('p');
            summary.className = 'article-summary';
            summary.textContent = formatSummary(article.summary);
            
            const authors = document.createElement('div');
            authors.className = 'article-authors';
            if (article.authors && article.authors.length > 0) {
                authors.innerHTML = `<strong>Authors:</strong> ${article.authors.join(', ')}`;
            }
            
            const keywordsDiv = document.createElement('div');
            keywordsDiv.className = 'article-keywords';
            
            if (article.keywords && article.keywords.length > 0) {
                article.keywords.forEach(keyword => {
                    const keywordSpan = document.createElement('span');
                    keywordSpan.className = 'keyword';
                    keywordSpan.textContent = keyword;
                    keywordSpan.addEventListener('click', () => {
                        keywordFilter.value = keyword;
                        filterArticles();
                    });
                    keywordsDiv.appendChild(keywordSpan);
                });
            }
            
            const links = document.createElement('div');
            links.className = 'article-links';
            
            const articleLink = document.createElement('a');
            articleLink.href = article.url;
            articleLink.target = '_blank';
            articleLink.innerHTML = '<i class="fas fa-external-link-alt"></i> View Article';
            
            links.appendChild(articleLink);
            
            if (article.pdf_url) {
                const pdfLink = document.createElement('a');
                pdfLink.href = article.pdf_url;
                pdfLink.target = '_blank';
                pdfLink.innerHTML = '<i class="fas fa-file-pdf"></i> PDF';
                links.appendChild(pdfLink);
            }
            
            if (article.code_url) {
                const codeLink = document.createElement('a');
                codeLink.href = article.code_url;
                codeLink.target = '_blank';
                codeLink.innerHTML = '<i class="fas fa-code"></i> Code';
                links.appendChild(codeLink);
            }
            
            content.appendChild(summary);
            content.appendChild(authors);
            content.appendChild(keywordsDiv);
            content.appendChild(links);
            
            // Append all to article card
            articleCard.appendChild(header);
            articleCard.appendChild(content);
            
            // Add to container
            articlesContainer.appendChild(articleCard);
        });
    }

    // Format the date
    function formatDate(dateString) {
        if (!dateString) return 'Unknown Date';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    }

    // Format the summary (clean up new lines and limit length)
    function formatSummary(summary) {
        if (!summary) return '';
        
        // Replace newlines with spaces
        let cleanSummary = summary.replace(/\n/g, ' ').trim();
        
        // Limit length to ~250 characters
        if (cleanSummary.length > 250) {
            cleanSummary = cleanSummary.substring(0, 250) + '...';
        }
        
        return cleanSummary;
    }

    // Filter articles based on search and filter criteria
    function filterArticles() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedSource = sourceFilter.value;
        const selectedDate = dateFilter.value;
        const selectedKeyword = keywordFilter.value;
        
        filteredArticles = allArticles.filter(article => {
            // Search term filter
            const titleMatch = article.title && article.title.toLowerCase().includes(searchTerm);
            const summaryMatch = article.summary && article.summary.toLowerCase().includes(searchTerm);
            const authorMatch = article.authors && article.authors.some(author => 
                author.toLowerCase().includes(searchTerm)
            );
            const keywordMatch = article.keywords && article.keywords.some(keyword => 
                keyword.toLowerCase().includes(searchTerm)
            );
            
            const searchMatch = titleMatch || summaryMatch || authorMatch || keywordMatch || searchTerm === '';
            
            // Source filter
            const sourceMatch = selectedSource === 'all' || article.source === selectedSource;
            
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
            
            return searchMatch && sourceMatch && dateMatch && keywordFilterMatch;
        });
        
        // Sort filtered articles
        filteredArticles = sortArticles(filteredArticles);
        
        // Reset to first page when filter changes
        currentPage = 1;
        
        // Update pagination
        updatePagination();
        
        // Display articles for current page
        displayArticlesForCurrentPage();
    }
    
    // Initialize trend analysis
    function initTrendAnalysis() {
        const timeRangeSelect = document.getElementById('time-range');
        const trendTypeSelect = document.getElementById('trend-type');
        const keywordTrendSelect = document.getElementById('trend-keywords');
        const keywordTrendSelector = document.getElementById('keyword-trend-selector');
        
        // Populate keyword options for trend analysis
        populateKeywordTrendOptions();
        
        // Set up event listeners
        timeRangeSelect.addEventListener('change', updateTrendChart);
        trendTypeSelect.addEventListener('change', () => {
            // Show/hide keyword selector based on trend type
            if (trendTypeSelect.value === 'keywords') {
                keywordTrendSelector.classList.remove('hidden');
            } else {
                keywordTrendSelector.classList.add('hidden');
            }
            updateTrendChart();
        });
        
        // For the multi-select keyword box
        keywordTrendSelect.addEventListener('change', updateTrendChart);
        
        // Initial chart
        updateTrendChart();
    }
    
    // Populate keyword options for trend analysis
    function populateKeywordTrendOptions() {
        const keywordTrendSelect = document.getElementById('trend-keywords');
        keywordTrendSelect.innerHTML = '';
        
        // Get most frequent keywords (top 20)
        const keywordFrequency = {};
        allArticles.forEach(article => {
            if (article.keywords && Array.isArray(article.keywords)) {
                article.keywords.forEach(keyword => {
                    keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
                });
            }
        });
        
        // Sort by frequency
        const sortedKeywords = Object.entries(keywordFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(entry => entry[0]);
        
        // Add options
        sortedKeywords.forEach(keyword => {
            const option = document.createElement('option');
            option.value = keyword;
            option.textContent = `${keyword} (${keywordFrequency[keyword]})`;
            keywordTrendSelect.appendChild(option);
        });
        
        // Select top 5 by default
        for (let i = 0; i < Math.min(5, sortedKeywords.length); i++) {
            keywordTrendSelect.options[i].selected = true;
        }
    }
    
    // Update trend chart based on current selections
    function updateTrendChart() {
        const timeRangeSelect = document.getElementById('time-range');
        const trendTypeSelect = document.getElementById('trend-type');
        const keywordTrendSelect = document.getElementById('trend-keywords');
        const trendInsightsList = document.getElementById('trend-insights-list');
        
        // Get selected values
        const timeRange = timeRangeSelect.value;
        const trendType = trendTypeSelect.value;
        
        // Prepare data based on timeRange
        let filteredArticles = [...allArticles];
        if (timeRange !== 'all') {
            const months = parseInt(timeRange);
            const cutoffDate = new Date();
            cutoffDate.setMonth(cutoffDate.getMonth() - months);
            
            filteredArticles = filteredArticles.filter(article => {
                const articleDate = new Date(article.date);
                return !isNaN(articleDate.getTime()) && articleDate >= cutoffDate;
            });
        }
        
        // Get chart data based on trend type
        let chartData = {};
        let insights = [];
        
        switch(trendType) {
            case 'volume':
                chartData = getArticleVolumeData(filteredArticles);
                insights = generateVolumeInsights(chartData);
                break;
            case 'keywords':
                const selectedKeywords = Array.from(keywordTrendSelect.selectedOptions)
                    .map(option => option.value);
                chartData = getKeywordTrendData(filteredArticles, selectedKeywords);
                insights = generateKeywordInsights(chartData);
                break;
            case 'sources':
                chartData = getSourceActivityData(filteredArticles);
                insights = generateSourceInsights(chartData);
                break;
        }
        
        // Display insights
        displayInsights(insights);
        
        // Create/update chart
        createTrendChart(chartData, trendType);
    }
    
    // Process data for article volume trend
    function getArticleVolumeData(articles) {
        // Group articles by day instead of month for better granularity
        const dailyData = {};
        
        articles.forEach(article => {
            const date = new Date(article.date);
            if (!isNaN(date.getTime())) {
                const yearMonthDay = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                dailyData[yearMonthDay] = (dailyData[yearMonthDay] || 0) + 1;
            }
        });
        
        // Sort days chronologically
        const sortedDays = Object.keys(dailyData).sort();
        
        // If all data is from the same month, use daily granularity
        // Otherwise fall back to monthly granularity
        const allSameMonth = sortedDays.length > 0 && 
            sortedDays.every(day => day.substring(0, 7) === sortedDays[0].substring(0, 7));
            
        if (allSameMonth && sortedDays.length > 1) {
            // Use daily granularity
            return {
                labels: sortedDays.map(ymd => {
                    const date = new Date(ymd);
                    return `${date.getDate()} ${getMonthName(date.getMonth())}`;
                }),
                datasets: [{
                    label: 'Number of Articles',
                    data: sortedDays.map(ymd => dailyData[ymd]),
                    backgroundColor: colorPalette[0],
                    borderColor: colorPalette[0],
                    borderWidth: 2,
                    fill: false
                }]
            };
        } else {
            // Fall back to monthly granularity
            const monthlyData = {};
            
            articles.forEach(article => {
                const date = new Date(article.date);
                if (!isNaN(date.getTime())) {
                    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    monthlyData[yearMonth] = (monthlyData[yearMonth] || 0) + 1;
                }
            });
            
            // Sort months chronologically
            const sortedMonths = Object.keys(monthlyData).sort();
            
            return {
                labels: sortedMonths.map(ym => {
                    const [year, month] = ym.split('-');
                    return `${getMonthName(parseInt(month) - 1)} ${year}`;
                }),
                datasets: [{
                    label: 'Number of Articles',
                    data: sortedMonths.map(ym => monthlyData[ym]),
                    backgroundColor: colorPalette[0],
                    borderColor: colorPalette[0],
                    borderWidth: 2,
                    fill: false
                }]
            };
        }
    }
    
    // Process data for keyword trends
    function getKeywordTrendData(articles, keywords) {
        // Check if all articles are from the same month
        const months = new Set();
        articles.forEach(article => {
            if (article.date) {
                const date = new Date(article.date);
                if (!isNaN(date.getTime())) {
                    months.add(`${date.getFullYear()}-${date.getMonth() + 1}`);
                }
            }
        });
        
        // If all articles are from the same month, use daily granularity
        const useDailyGranularity = months.size <= 1 && articles.length > 1;
        
        // Group articles by appropriate time unit
        const timeKeywordData = {};
        
        articles.forEach(article => {
            const date = new Date(article.date);
            if (!isNaN(date.getTime())) {
                let timeKey;
                
                if (useDailyGranularity) {
                    // Use day granularity
                    timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                } else {
                    // Use month granularity
                    timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                }
                
                if (!timeKeywordData[timeKey]) {
                    timeKeywordData[timeKey] = {};
                    keywords.forEach(kw => timeKeywordData[timeKey][kw] = 0);
                }
                
                // Check for each keyword in the article
                if (article.keywords && Array.isArray(article.keywords)) {
                    article.keywords.forEach(kw => {
                        if (keywords.includes(kw)) {
                            timeKeywordData[timeKey][kw]++;
                        }
                    });
                }
            }
        });
        
        // Sort time units chronologically
        const sortedTimeKeys = Object.keys(timeKeywordData).sort();
        
        // Prepare dataset for each keyword
        const datasets = keywords.map((keyword, index) => {
            return {
                label: keyword,
                data: sortedTimeKeys.map(tk => timeKeywordData[tk][keyword]),
                backgroundColor: colorPalette[index % colorPalette.length],
                borderColor: colorPalette[index % colorPalette.length],
                borderWidth: 2,
                fill: false
            };
        });
        
        // Format labels based on granularity
        let labels;
        if (useDailyGranularity) {
            labels = sortedTimeKeys.map(tk => {
                const date = new Date(tk);
                return `${date.getDate()} ${getMonthName(date.getMonth())}`;
            });
        } else {
            labels = sortedTimeKeys.map(tk => {
                const [year, month] = tk.split('-');
                return `${getMonthName(parseInt(month) - 1)} ${year}`;
            });
        }
        
        return {
            labels: labels,
            datasets: datasets
        };
    }
    
    // Process data for source activity
    function getSourceActivityData(articles) {
        // Check if all articles are from the same month
        const months = new Set();
        articles.forEach(article => {
            if (article.date) {
                const date = new Date(article.date);
                if (!isNaN(date.getTime())) {
                    months.add(`${date.getFullYear()}-${date.getMonth() + 1}`);
                }
            }
        });
        
        // If all articles are from the same month, use daily granularity
        const useDailyGranularity = months.size <= 1 && articles.length > 1;
        
        // Get all unique sources
        const sources = Array.from(new Set(articles.map(article => article.source).filter(Boolean)));
        
        // Group articles by time unit and source
        const timeSourceData = {};
        
        articles.forEach(article => {
            if (!article.source) return;
            
            const date = new Date(article.date);
            if (!isNaN(date.getTime())) {
                let timeKey;
                
                if (useDailyGranularity) {
                    // Use day granularity
                    timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                } else {
                    // Use month granularity
                    timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                }
                
                if (!timeSourceData[timeKey]) {
                    timeSourceData[timeKey] = {};
                    sources.forEach(source => timeSourceData[timeKey][source] = 0);
                }
                
                timeSourceData[timeKey][article.source]++;
            }
        });
        
        // Sort time units chronologically
        const sortedTimeKeys = Object.keys(timeSourceData).sort();
        
        // Prepare dataset for each source
        const datasets = sources.map((source, index) => {
            return {
                label: source,
                data: sortedTimeKeys.map(tk => timeSourceData[tk][source]),
                backgroundColor: colorPalette[index % colorPalette.length],
                borderColor: colorPalette[index % colorPalette.length],
                borderWidth: 2,
                fill: false
            };
        });
        
        // Format labels based on granularity
        let labels;
        if (useDailyGranularity) {
            labels = sortedTimeKeys.map(tk => {
                const date = new Date(tk);
                return `${date.getDate()} ${getMonthName(date.getMonth())}`;
            });
        } else {
            labels = sortedTimeKeys.map(tk => {
                const [year, month] = tk.split('-');
                return `${getMonthName(parseInt(month) - 1)} ${year}`;
            });
        }
        
        return {
            labels: labels,
            datasets: datasets
        };
    }
    
    // Generate insights for article volume trends
    function generateVolumeInsights(chartData) {
        const insights = [];
        const data = chartData.datasets[0].data;
        const labels = chartData.labels;
        
        if (data.length === 0) {
            return ["No data available for the selected time period."];
        }
        
        // Total articles
        const totalArticles = data.reduce((sum, count) => sum + count, 0);
        insights.push(`Total of ${totalArticles} articles were published in the selected period.`);
        
        // Find peak month
        const peakIndex = data.indexOf(Math.max(...data));
        if (peakIndex >= 0) {
            insights.push(`Peak publishing month was ${labels[peakIndex]} with ${data[peakIndex]} articles.`);
        }
        
        // Calculate growth trend
        if (data.length > 1) {
            // Simple linear regression to detect trend
            const xValues = Array.from({length: data.length}, (_, i) => i);
            const xMean = xValues.reduce((sum, x) => sum + x, 0) / xValues.length;
            const yMean = data.reduce((sum, y) => sum + y, 0) / data.length;
            
            const numerator = xValues.reduce((sum, x, i) => sum + (x - xMean) * (data[i] - yMean), 0);
            const denominator = xValues.reduce((sum, x) => sum + Math.pow(x - xMean, 2), 0);
            
            const slope = denominator ? numerator / denominator : 0;
            
            if (Math.abs(slope) < 0.1) {
                insights.push("Publication volume has remained relatively stable in this period.");
            } else if (slope > 0) {
                insights.push(`Publication volume is trending upward by approximately ${(slope * 100).toFixed(1)}% per month.`);
            } else {
                insights.push(`Publication volume is trending downward by approximately ${(-slope * 100).toFixed(1)}% per month.`);
            }
        }
        
        return insights;
    }
    
    // Generate insights for keyword trends
    function generateKeywordInsights(chartData) {
        const insights = [];
        const datasets = chartData.datasets;
        const labels = chartData.labels;
        
        if (datasets.length === 0 || labels.length === 0) {
            return ["Not enough data to generate keyword insights."];
        }
        
        // Find fastest growing keyword
        const growthRates = datasets.map(dataset => {
            // Need at least 2 data points to calculate growth
            if (dataset.data.length < 2) return { keyword: dataset.label, growth: 0 };
            
            // Simple linear regression for growth rate
            const xValues = Array.from({length: dataset.data.length}, (_, i) => i);
            const xMean = xValues.reduce((sum, x) => sum + x, 0) / xValues.length;
            const yMean = dataset.data.reduce((sum, y) => sum + y, 0) / dataset.data.length;
            
            const numerator = xValues.reduce((sum, x, i) => sum + (x - xMean) * (dataset.data[i] - yMean), 0);
            const denominator = xValues.reduce((sum, x) => sum + Math.pow(x - xMean, 2), 0);
            
            const slope = denominator ? numerator / denominator : 0;
            
            return { keyword: dataset.label, growth: slope };
        });
        
        // Sort by growth rate
        growthRates.sort((a, b) => b.growth - a.growth);
        
        // Add insights about growing keywords
        if (growthRates.length > 0 && growthRates[0].growth > 0) {
            insights.push(`"${growthRates[0].keyword}" is the fastest growing keyword.`);
        }
        
        // Add insights about declining keywords
        const decliningKeywords = growthRates.filter(item => item.growth < 0);
        if (decliningKeywords.length > 0) {
            insights.push(`"${decliningKeywords[0].keyword}" is showing the most pronounced decline.`);
        }
        
        // Most popular keyword
        const totals = datasets.map(dataset => {
            return {
                keyword: dataset.label,
                total: dataset.data.reduce((sum, count) => sum + count, 0)
            };
        });
        
        totals.sort((a, b) => b.total - a.total);
        
        if (totals.length > 0) {
            insights.push(`"${totals[0].keyword}" is the most prevalent keyword with ${totals[0].total} total mentions.`);
        }
        
        return insights;
    }
    
    // Generate insights for source activity
    function generateSourceInsights(chartData) {
        const insights = [];
        const data = chartData.datasets[0].data;
        const labels = chartData.labels;
        
        if (data.length === 0) {
            return ["Not enough data to generate source insights."];
        }
        
        // Most active source
        insights.push(`"${labels[0]}" is the most active source with ${data[0]} articles.`);
        
        // Calculate percentage from top source
        const totalArticles = data.reduce((sum, count) => sum + count, 0);
        const topSourcePercentage = ((data[0] / totalArticles) * 100).toFixed(1);
        insights.push(`The top source represents ${topSourcePercentage}% of all articles in the selected period.`);
        
        // Diversity of sources
        if (labels.length >= 3) {
            const top3Percentage = ((data[0] + data[1] + data[2]) / totalArticles * 100).toFixed(1);
            insights.push(`The top 3 sources account for ${top3Percentage}% of all articles.`);
        }
        
        return insights;
    }
    
    // Helper function to display insights
    function displayInsights(insights) {
        const insightsList = document.getElementById('trend-insights-list');
        insightsList.innerHTML = '';
        
        insights.forEach(insight => {
            const li = document.createElement('li');
            li.textContent = insight;
            insightsList.appendChild(li);
        });
    }
    
    // Create or update the trend chart
    function createTrendChart(chartData, chartType) {
        const ctx = document.getElementById('trend-chart').getContext('2d');
        
        // Destroy existing chart if any
        if (window.trendChart) {
            window.trendChart.destroy();
        }
        
        // Adjust chart options based on type
        let chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        };
        
        // Determine if we're dealing with daily data (all dates in same month)
        const isUsingDailyData = chartData.labels && 
            chartData.labels.length > 1 && 
            !chartData.labels[0].includes(',') && 
            !chartData.labels[0].includes('20'); // Simple check if labels don't include year
            
        // Set chart type based on data
        let type = 'line';
        
        if (chartType === 'sources' && !isUsingDailyData) {
            type = 'bar';
            chartOptions.indexAxis = 'y'; // Horizontal bar chart
        } else if (isUsingDailyData) {
            // Add specific options for daily data
            chartOptions.scales.x = {
                title: {
                    display: true,
                    text: 'Day of Month'
                }
            };
            
            // Connect null values with dotted lines for daily data
            chartOptions.elements = {
                line: {
                    tension: 0.2  // Smooth the line a bit
                },
                point: {
                    radius: 4,    // Slightly larger points
                    hoverRadius: 6
                }
            };
        }
        
        // Create the chart
        window.trendChart = new Chart(ctx, {
            type: type,
            data: chartData,
            options: chartOptions
        });
    }
    
    // Helper: Get month name from index
    function getMonthName(monthIndex) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months[monthIndex];
    }

    // Set up event listeners
    function setupEventListeners() {
        // Search functionality
        searchButton.addEventListener('click', filterArticles);
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                filterArticles();
            }
        });
        
        // Filter and sort options
        sourceFilter.addEventListener('change', filterArticles);
        dateFilter.addEventListener('change', filterArticles);
        keywordFilter.addEventListener('change', filterArticles);
        sortOption.addEventListener('change', filterArticles);
        
        // Theme toggle
        themeToggleBtn.addEventListener('click', toggleTheme);
        
        // Trend filter event listeners
        const timeRangeSelect = document.getElementById('time-range');
        const trendTypeSelect = document.getElementById('trend-type');
        
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', updateTrendChart);
        }
        
        if (trendTypeSelect) {
            trendTypeSelect.addEventListener('change', function() {
                const keywordSelector = document.getElementById('keyword-trend-selector');
                if (this.value === 'keywords') {
                    keywordSelector.classList.remove('hidden');
                } else {
                    keywordSelector.classList.add('hidden');
                }
                updateTrendChart();
            });
        }
        
        // Attention view controls
        const attentionView = document.getElementById('attention-view');
        const attentionCount = document.getElementById('attention-count');
        
        if (attentionView) {
            attentionView.addEventListener('change', loadPaperAttentionData);
        }
        
        if (attentionCount) {
            attentionCount.addEventListener('change', loadPaperAttentionData);
        }
    }

    // Load paper attention data and display trending papers
    function loadPaperAttentionData() {
        fetch('paper_attention.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                displayPaperAttention(data);
                createAttentionChart(data);
            })
            .catch(error => {
                console.error('Error fetching paper attention data:', error);
                document.getElementById('paper-ranking-list').innerHTML = 
                    '<div class="error-message">Failed to load paper attention data. Please try again later.</div>';
            });
    }

    // Display paper attention rankings
    function displayPaperAttention(data) {
        const container = document.getElementById('paper-ranking-list');
        const attentionView = document.getElementById('attention-view').value;
        const attentionCount = parseInt(document.getElementById('attention-count').value);
        
        // Clear loading spinner
        container.innerHTML = '';
        
        if (!data.top_papers || data.top_papers.length === 0) {
            container.innerHTML = '<div class="error-message">No paper data available.</div>';
            return;
        }
        
        // Sort papers based on selected view
        let papers = [...data.top_papers];
        switch(attentionView) {
            case 'recent':
                // Sort by attention score but prioritize papers from last 6 months
                papers.sort((a, b) => {
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    const sixMonthsAgo = new Date();
                    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                    
                    const aIsRecent = dateA >= sixMonthsAgo;
                    const bIsRecent = dateB >= sixMonthsAgo;
                    
                    if (aIsRecent && !bIsRecent) return -1;
                    if (!aIsRecent && bIsRecent) return 1;
                    return b.attention_score - a.attention_score;
                });
                break;
            case 'velocity':
                // Sort by citation velocity (citations per month)
                papers.sort((a, b) => {
                    const velocityA = a.components?.citation_velocity || 0;
                    const velocityB = b.components?.citation_velocity || 0;
                    return velocityB - velocityA;
                });
                break;
            default: // 'attention'
                // Already sorted by attention score
                break;
        }
        
        // Limit to requested count
        papers = papers.slice(0, attentionCount);
        
        // Create elements for each paper
        papers.forEach((paper, index) => {
            const paperElement = document.createElement('div');
            paperElement.className = 'paper-attention-item';
            
            const rankClass = index < 3 ? 'paper-rank top-3' : 'paper-rank';
            
            // Format citation count with commas for thousands
            const citations = paper.citation_count.toLocaleString();
            
            // Format authors: show first author + et al if more than one
            let authorText = '';
            if (paper.authors && paper.authors.length > 0) {
                authorText = paper.authors.length > 1 
                    ? `${paper.authors[0]} et al.` 
                    : paper.authors[0];
            }
            
            // Create abbreviated source name
            let sourceText = paper.source;
            if (paper.source && paper.source.length > 15) {
                // If source is too long, abbreviate
                const words = paper.source.split(' ');
                if (words.length > 1) {
                    sourceText = words.map(word => word.charAt(0)).join('').toUpperCase();
                }
            }
            
            paperElement.innerHTML = `
                <div class="${rankClass}">${index + 1}</div>
                <div class="paper-info">
                    <div class="paper-title">
                        <a href="${paper.url}" target="_blank" title="${paper.title}">${paper.title}</a>
                    </div>
                    <div class="paper-meta">
                        <span>${authorText}</span>
                        <span>${paper.date}</span>
                        <span>${sourceText}</span>
                        <span>${citations} ${citations === '1' ? 'citation' : 'citations'}</span>
                    </div>
                </div>
                <div class="paper-score">
                    <span>${paper.attention_score.toFixed(1)}</span>
                    <span class="paper-score-label">Impact</span>
                </div>
            `;
            
            container.appendChild(paperElement);
        });
    }

    // Create a chart for attention visualization
    function createAttentionChart(data) {
        const ctx = document.getElementById('attention-chart').getContext('2d');
        const attentionView = document.getElementById('attention-view').value;
        const attentionCount = parseInt(document.getElementById('attention-count').value);
        
        if (!data.top_papers || data.top_papers.length === 0) {
            return;
        }
        
        // Sort and limit papers based on current view (similar to displayPaperAttention)
        let papers = [...data.top_papers];
        switch(attentionView) {
            case 'recent':
                papers.sort((a, b) => {
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    const sixMonthsAgo = new Date();
                    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                    
                    const aIsRecent = dateA >= sixMonthsAgo;
                    const bIsRecent = dateB >= sixMonthsAgo;
                    
                    if (aIsRecent && !bIsRecent) return -1;
                    if (!aIsRecent && bIsRecent) return 1;
                    return b.attention_score - a.attention_score;
                });
                break;
            case 'velocity':
                papers.sort((a, b) => {
                    const velocityA = a.components?.citation_velocity || 0;
                    const velocityB = b.components?.citation_velocity || 0;
                    return velocityB - velocityA;
                });
                break;
            default: // 'attention'
                // Already sorted
                break;
        }
        
        // Take top papers according to selected count
        papers = papers.slice(0, attentionCount);
        
        // Prepare chart data
        const labels = papers.map(paper => {
            // Create shortened title
            let shortTitle = paper.title;
            if (shortTitle.length > 30) {
                shortTitle = shortTitle.substring(0, 30) + '...';
            }
            return shortTitle;
        });
        
        // Decide what value to chart based on view type
        let dataValues;
        let chartTitle;
        switch(attentionView) {
            case 'recent':
                dataValues = papers.map(paper => paper.attention_score);
                chartTitle = 'Recent Papers by Impact Score';
                break;
            case 'velocity':
                dataValues = papers.map(paper => paper.components?.citation_velocity || 0);
                chartTitle = 'Papers by Citation Velocity (citations/month)';
                break;
            default: // 'attention'
                dataValues = papers.map(paper => paper.attention_score);
                chartTitle = 'Papers by Impact Score';
                break;
        }
        
        // Destroy existing chart if any
        if (window.attentionChart) {
            window.attentionChart.destroy();
        }
        
        // Create horizontal bar chart
        window.attentionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: chartTitle,
                    data: dataValues,
                    backgroundColor: papers.map((_, index) => 
                        index < 3 ? 'rgba(255, 87, 34, 0.8)' : 'rgba(33, 150, 243, 0.6)'),
                    borderColor: papers.map((_, index) => 
                        index < 3 ? 'rgb(255, 87, 34)' : 'rgb(33, 150, 243)'),
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                // Show full title on hover
                                const index = tooltipItems[0].dataIndex;
                                return papers[index].title;
                            },
                            afterTitle: function(tooltipItems) {
                                const index = tooltipItems[0].dataIndex;
                                const paper = papers[index];
                                return paper.authors && paper.authors.length > 0 
                                    ? 'by ' + paper.authors.join(', ')
                                    : '';
                            },
                            footer: function(tooltipItems) {
                                const index = tooltipItems[0].dataIndex;
                                const paper = papers[index];
                                return [
                                    `Source: ${paper.source}`,
                                    `Date: ${paper.date}`,
                                    `Citations: ${paper.citation_count}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value, index) {
                                return index + 1 + '. ' + this.getLabelForValue(value);
                            }
                        }
                    }
                }
            }
        });
    }

    // Set up tab navigation
    function setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-button');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                switchTab(tabId);
            });
        });
    }
    
    // Switch tabs
    function switchTab(tabId) {
        // Don't do anything if it's already the active tab
        if (tabId === activeTab) return;
        
        // Update active tab
        activeTab = tabId;
        
        // Update UI: tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');
        
        // Update UI: tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabId).classList.add('active');
        
        // Initialize tab content if it hasn't been loaded yet
        if (!tabsInitialized[tabId]) {
            initializeTab(tabId);
        }
    }
    
    // Initialize tab content based on tab ID
    function initializeTab(tabId) {
        switch(tabId) {
            case 'articles-tab':
                initializeArticlesTab();
                break;
            case 'trends-tab':
                initializeTrendsTab();
                break;
            case 'impact-tab':
                initializeImpactTab();
                break;
        }
        
        // Mark tab as initialized
        tabsInitialized[tabId] = true;
    }
    
    // Initialize articles tab
    function initializeArticlesTab() {
        // Show loading spinner
        loadingSpinner.classList.remove('hidden');
        articlesContainer.innerHTML = '';
        
        // Prepare articles for display
        filteredArticles = [...allArticles];
        console.log(`Displaying ${filteredArticles.length} articles`);
        
        // Calculate total pages
        updatePagination();
        
        // Populate keyword filter (already have the data from init)
        populateKeywordFilter();
        
        // Set up event listeners for article search and filters
        setupArticleEventListeners();
        
        // Display articles
        displayArticlesForCurrentPage();
    }
    
    // Initialize trends tab
    function initializeTrendsTab() {
        // Show loading message in the trends area
        document.getElementById('trend-insights-list').innerHTML = '<li>Loading trend data...</li>';
        
        // Initialize the trend visualization
        initTrendAnalysis();
        
        // Set up trend-specific event listeners
        setupTrendEventListeners();
        
        // Generate and display trends
        updateTrendChart();
    }
    
    // Initialize impact tab
    function initializeImpactTab() {
        // Show loading spinner in the paper ranking area
        document.getElementById('paper-ranking-list').innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading paper rankings...</p>
            </div>
        `;
        
        // Load paper attention data
        loadPaperAttentionData();
        
        // Set up impact-specific event listeners
        setupImpactEventListeners();
    }
    
    // Set up event listeners for article search and filters
    function setupArticleEventListeners() {
        // Only set up these listeners once
        if (tabsInitialized['articles-tab']) return;
        
        searchButton.addEventListener('click', filterAndDisplayArticles);
        
        searchInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                filterAndDisplayArticles();
            }
        });
        
        sourceFilter.addEventListener('change', filterAndDisplayArticles);
        dateFilter.addEventListener('change', filterAndDisplayArticles);
        keywordFilter.addEventListener('change', filterAndDisplayArticles);
        sortOption.addEventListener('change', filterAndDisplayArticles);
    }
    
    // Set up trend-specific event listeners
    function setupTrendEventListeners() {
        // Only set up these listeners once
        if (tabsInitialized['trends-tab']) return;
        
        const timeRangeSelect = document.getElementById('time-range');
        const trendTypeSelect = document.getElementById('trend-type');
        const trendKeywordsSelect = document.getElementById('trend-keywords');
        
        timeRangeSelect.addEventListener('change', updateTrendChart);
        
        trendTypeSelect.addEventListener('change', function() {
            const keywordSelector = document.getElementById('keyword-trend-selector');
            if (this.value === 'keywords') {
                keywordSelector.classList.remove('hidden');
            } else {
                keywordSelector.classList.add('hidden');
            }
            updateTrendChart();
        });
        
        trendKeywordsSelect.addEventListener('change', updateTrendChart);
    }
    
    // Set up impact-specific event listeners
    function setupImpactEventListeners() {
        // Only set up these listeners once
        if (tabsInitialized['impact-tab']) return;
        
        const attentionViewSelect = document.getElementById('attention-view');
        const attentionCountSelect = document.getElementById('attention-count');
        
        attentionViewSelect.addEventListener('change', loadPaperAttentionData);
        attentionCountSelect.addEventListener('change', loadPaperAttentionData);
    }

    // Initialize the page
    init();
}); 