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
    
    // Fetch articles from the JSON file
    async function fetchArticles() {
        try {
            const response = await fetch('articles/index.json');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching articles:', error);
            return [];
        }
    }

    // Initialize the page
    async function init() {
        loadingSpinner.classList.remove('hidden');
        articlesContainer.innerHTML = '';
        
        // Initialize dark/light mode
        initializeTheme();
        
        // Fetch the articles
        allArticles = await fetchArticles();
        filteredArticles = [...allArticles];
        
        // Calculate total pages
        updatePagination();
        
        // Extract all unique keywords and sources
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
        
        // Update dashboard statistics
        updateDashboardStats();
        
        // Populate keyword filter
        populateKeywordFilter();
        
        // Set last updated date
        updateLastUpdatedDate();
        
        // Display articles for first page
        displayArticlesForCurrentPage();
        
        // Hide loading spinner
        loadingSpinner.classList.add('hidden');
        
        // Set up event listeners
        setupEventListeners();
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
    }

    // Initialize the page
    init();
}); 