document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const articlesContainer = document.getElementById('articles-container');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const sourceFilter = document.getElementById('source-filter');
    const dateFilter = document.getElementById('date-filter');
    const keywordFilter = document.getElementById('keyword-filter');
    const loadingSpinner = document.getElementById('loading-spinner');
    const noResults = document.getElementById('no-results');
    const lastUpdated = document.getElementById('last-updated');

    // Global variables
    let allArticles = [];
    let filteredArticles = [];
    let allKeywords = new Set();

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
        
        // Fetch the articles
        allArticles = await fetchArticles();
        filteredArticles = [...allArticles];
        
        // Extract all unique keywords
        allArticles.forEach(article => {
            if (article.keywords && Array.isArray(article.keywords)) {
                article.keywords.forEach(keyword => allKeywords.add(keyword));
            }
        });
        
        // Populate keyword filter
        populateKeywordFilter();
        
        // Set last updated date
        updateLastUpdatedDate();
        
        // Display all articles initially
        displayArticles(filteredArticles);
        
        // Hide loading spinner
        loadingSpinner.classList.add('hidden');
        
        // Set up event listeners
        setupEventListeners();
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

    // Display articles
    function displayArticles(articles) {
        articlesContainer.innerHTML = '';
        
        if (articles.length === 0) {
            noResults.classList.remove('hidden');
            return;
        }
        
        noResults.classList.add('hidden');
        
        articles.forEach(article => {
            const articleCard = document.createElement('div');
            articleCard.className = 'article-card';
            
            // Create article header
            const header = document.createElement('div');
            header.className = 'article-header';
            
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
        
        // Limit length to ~200 characters
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
        
        displayArticles(filteredArticles);
    }

    // Set up event listeners
    function setupEventListeners() {
        searchButton.addEventListener('click', filterArticles);
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                filterArticles();
            }
        });
        
        sourceFilter.addEventListener('change', filterArticles);
        dateFilter.addEventListener('change', filterArticles);
        keywordFilter.addEventListener('change', filterArticles);
    }

    // Initialize the page
    init();
}); 