/**
 * Main Application - Entry point for Netflix Clone
 */

class NetflixClone {
    constructor() {
        this.currentPage = 1;
        this.isLoading = false;
        this.categories = [];
        this.init();
    }
    
    async init() {
        console.log('NetflixClone initializing...');
        
        // Initialize theme first
        this.initTheme();
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Wait for DOM to be ready
        await this.waitForDOM();
        
        // Load initial data
        await this.loadInitialData();
        
        // Setup infinite scroll
        this.setupInfiniteScroll();
    }
    
    async waitForDOM() {
        return new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }
    
    initTheme() {
        // Load theme preference from localStorage
        const savedTheme = localStorage.getItem('netflix-theme') || 'dark';
        document.body.classList.toggle('light-theme', savedTheme === 'light');
        
        // Update theme toggle button
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.innerHTML = savedTheme === 'dark' ? 
                '<i class="fas fa-moon"></i>' : 
                '<i class="fas fa-sun"></i>';
            
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
    }
    
    toggleTheme() {
        const isLight = document.body.classList.toggle('light-theme');
        const theme = isLight ? 'light' : 'dark';
        
        // Update button icon
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.innerHTML = isLight ? 
                '<i class="fas fa-sun"></i>' : 
                '<i class="fas fa-moon"></i>';
        }
        
        // Save preference
        localStorage.setItem('netflix-theme', theme);
    }
    
    initEventListeners() {
        console.log('Initializing event listeners...');
        
        // Search icon click
        const searchIcon = document.querySelector('.search-icon');
        const searchInput = document.querySelector('.search-input');
        
        if (searchIcon && searchInput) {
            searchIcon.addEventListener('click', () => {
                searchInput.classList.toggle('active');
                if (searchInput.classList.contains('active')) {
                    searchInput.focus();
                }
            });
            
            // Close search when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.search-container')) {
                    searchInput.classList.remove('active');
                    searchInput.value = '';
                    document.querySelector('.search-results')?.classList.remove('active');
                }
            });
        }
        
        // Profile menu toggle
        const profileImg = document.querySelector('.profile-img');
        const profileDropdown = document.querySelector('.profile-dropdown');
        
        if (profileImg && profileDropdown) {
            profileImg.addEventListener('click', (e) => {
                e.stopPropagation();
                profileDropdown.classList.toggle('active');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                profileDropdown.classList.remove('active');
            });
        }
        
        // Watchlist link
        const watchlistLink = document.getElementById('watchlist-link');
        if (watchlistLink) {
            watchlistLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('my-list')?.scrollIntoView({ behavior: 'smooth' });
                document.querySelector('.profile-dropdown')?.classList.remove('active');
            });
        }
        
        // Hamburger menu for mobile
        const hamburger = document.querySelector('.hamburger-menu');
        const navLinks = document.querySelector('.nav-links');
        
        if (hamburger && navLinks) {
            hamburger.addEventListener('click', () => {
                const isVisible = navLinks.style.display === 'flex';
                navLinks.style.display = isVisible ? 'none' : 'flex';
            });
            
            // Close menu on resize
            window.addEventListener('resize', () => {
                if (window.innerWidth > 768) {
                    navLinks.style.display = 'flex';
                } else {
                    navLinks.style.display = 'none';
                }
            });
        }
        
        // Play button in hero section
        const heroPlay = document.querySelector('.hero-play');
        if (heroPlay) {
            heroPlay.addEventListener('click', () => {
                this.playRandomTrailer();
            });
        }
        
        // Info button in hero section
        const heroInfo = document.querySelector('.hero-info');
        if (heroInfo) {
            heroInfo.addEventListener('click', async () => {
                await this.showRandomMovie();
            });
        }
    }
    
    async loadInitialData() {
        console.log('Loading initial data...');
        
        try {
            // Show skeleton loader
            const skeleton = document.querySelector('.skeleton-loader');
            if (skeleton) {
                skeleton.classList.remove('hidden');
            }
            
            // Load categories
            console.log('Fetching homepage movies...');
            this.categories = await api.getHomepageMovies();
            console.log('Categories loaded:', this.categories);
            
            // Hide skeleton loader
            if (skeleton) {
                skeleton.classList.add('hidden');
            }
            
            // Initialize UI manager if not already initialized
            if (!window.ui) {
                console.log('UI manager not found, creating...');
                window.ui = new UIManager();
            }
            
            // Render categories
            if (window.ui && window.ui.renderCategories) {
                window.ui.renderCategories(this.categories);
            } else {
                console.error('UI manager not properly initialized');
                this.renderCategoriesFallback();
            }
            
            // Set hero banner with trending movie
            this.setHeroBanner();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            
            // Hide skeleton loader
            const skeleton = document.querySelector('.skeleton-loader');
            if (skeleton) {
                skeleton.classList.add('hidden');
            }
            
            // Show error message
            this.showError('Failed to load movies. Please check your connection and try again.');
        }
    }
    
    renderCategoriesFallback() {
        const container = document.getElementById('categories-list');
        if (!container) return;
        
        container.innerHTML = `
            <div class="error-message">
                <p>Unable to load movies. Please check:</p>
                <ul>
                    <li>Your internet connection</li>
                    <li>TMDB API key in api.js</li>
                    <li>Browser console for errors</li>
                </ul>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            background: #f44336;
            color: white;
            padding: 1rem;
            margin: 2rem auto;
            border-radius: 4px;
            text-align: center;
            max-width: 600px;
        `;
        errorDiv.innerHTML = `
            <p><i class="fas fa-exclamation-triangle"></i> ${message}</p>
            <button onclick="location.reload()" style="
                background: white;
                color: #f44336;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                margin-top: 0.5rem;
                cursor: pointer;
            ">Retry</button>
        `;
        
        const container = document.getElementById('categories-list');
        if (container) {
            container.innerHTML = '';
            container.appendChild(errorDiv);
        }
    }
    
    setHeroBanner() {
        const trendingMovies = this.categories.find(c => c.id === 'trending')?.movies;
        if (!trendingMovies || trendingMovies.length === 0) {
            console.log('No trending movies found');
            return;
        }
        
        // Get the first trending movie
        const featuredMovie = trendingMovies[0];
        
        // Update hero section
        const heroTitle = document.querySelector('.hero-title');
        const heroPlay = document.querySelector('.hero-play');
        const heroInfo = document.querySelector('.hero-info');
        
        if (heroTitle && featuredMovie) {
            heroTitle.textContent = featuredMovie.title || 'Unlimited movies, TV shows, and more';
            
            // Set up play button
            if (heroPlay) {
                heroPlay.onclick = async () => {
                    try {
                        console.log('Fetching movie details for:', featuredMovie.id);
                        const movieData = await api.getMovieDetails(featuredMovie.id);
                        const trailerKey = api.getTrailerKey(movieData.videos);
                        
                        if (trailerKey) {
                            if (window.ui) {
                                window.ui.playTrailer(trailerKey);
                            } else {
                                this.playTrailerFallback(trailerKey);
                            }
                        } else {
                            alert('No trailer available for this movie.');
                        }
                    } catch (error) {
                        console.error('Error loading trailer:', error);
                        alert('Failed to load trailer.');
                    }
                };
            }
            
            // Set up info button
            if (heroInfo) {
                heroInfo.onclick = () => {
                    if (window.ui) {
                        window.ui.showMovieDetails(featuredMovie.id);
                    } else {
                        alert('UI not ready. Please wait or refresh the page.');
                    }
                };
            }
        }
    }
    
    playTrailerFallback(youtubeKey) {
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${youtubeKey}?autoplay=1`;
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.frameBorder = '0';
        iframe.allow = 'autoplay; encrypted-media';
        iframe.allowFullscreen = true;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            z-index: 3000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        modal.innerHTML = `
            <div style="width: 90%; max-width: 900px; height: 70%; position: relative;">
                <button onclick="this.parentElement.parentElement.remove()" style="
                    position: absolute;
                    top: -40px;
                    right: 0;
                    background: none;
                    border: none;
                    color: white;
                    font-size: 2rem;
                    cursor: pointer;
                ">×</button>
                <div style="width: 100%; height: 100%; border-radius: 8px; overflow: hidden;"></div>
            </div>
        `;
        
        modal.querySelector('div > div').appendChild(iframe);
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    }
    
    async playRandomTrailer() {
        try {
            const trendingMovies = this.categories.find(c => c.id === 'trending')?.movies;
            if (!trendingMovies || trendingMovies.length === 0) {
                alert('No movies available to play trailer.');
                return;
            }
            
            // Try multiple movies until we find one with a trailer
            for (const movie of trendingMovies.slice(0, 3)) {
                try {
                    const movieData = await api.getMovieDetails(movie.id);
                    const trailerKey = api.getTrailerKey(movieData.videos);
                    
                    if (trailerKey) {
                        if (window.ui) {
                            window.ui.playTrailer(trailerKey);
                        } else {
                            this.playTrailerFallback(trailerKey);
                        }
                        return;
                    }
                } catch (error) {
                    console.error('Error loading movie:', error);
                    continue;
                }
            }
            
            alert('No trailers available at the moment.');
        } catch (error) {
            console.error('Error playing random trailer:', error);
            alert('Failed to load trailer.');
        }
    }
    
    async showRandomMovie() {
        try {
            const trendingMovies = this.categories.find(c => c.id === 'trending')?.movies;
            if (!trendingMovies || trendingMovies.length === 0) {
                alert('No movies available.');
                return;
            }
            
            const randomIndex = Math.floor(Math.random() * trendingMovies.length);
            if (window.ui) {
                await window.ui.showMovieDetails(trendingMovies[randomIndex].id);
            } else {
                alert('UI not ready. Please wait or refresh the page.');
            }
        } catch (error) {
            console.error('Error showing random movie:', error);
            alert('Failed to load movie details.');
        }
    }
    
    setupInfiniteScroll() {
        let loading = false;
        
        window.addEventListener('scroll', utils.debounce(async () => {
            // Check if we're at the bottom of the page
            const scrollPosition = window.innerHeight + window.scrollY;
            const bottomThreshold = document.body.offsetHeight - 500;
            
            if (scrollPosition >= bottomThreshold && !loading) {
                loading = true;
                await this.loadMoreMovies();
                loading = false;
            }
        }, 200));
    }
    
    async loadMoreMovies() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.currentPage++;
        
        try {
            // Show loading indicator
            const loader = document.createElement('div');
            loader.className = 'loading-more';
            loader.innerHTML = `
                <div class="spinner"></div>
                <p>Loading more movies...</p>
            `;
            
            loader.style.cssText = `
                text-align: center;
                padding: 2rem;
                color: var(--netflix-white);
            `;
            
            // Add spinner styles
            if (!document.querySelector('#spinner-styles')) {
                const style = document.createElement('style');
                style.id = 'spinner-styles';
                style.textContent = `
                    .spinner {
                        border: 3px solid rgba(255,255,255,0.3);
                        border-radius: 50%;
                        border-top: 3px solid var(--netflix-red);
                        width: 40px;
                        height: 40px;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 1rem;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            const container = document.querySelector('.categories-container');
            if (container) {
                container.appendChild(loader);
            }
            
            // Load more movies for each category
            const newCategories = await api.getHomepageMovies(this.currentPage);
            
            // Append new movies to existing categories
            newCategories.forEach(newCategory => {
                const existingCategory = this.categories.find(c => c.id === newCategory.id);
                if (existingCategory && newCategory.movies) {
                    existingCategory.movies = [...existingCategory.movies, ...newCategory.movies];
                    
                    // Update the DOM for this category
                    const container = document.getElementById(`${newCategory.id}-movies`);
                    if (container) {
                        const newMoviesHTML = newCategory.movies.map(movie => `
                            <div class="movie-card" onclick="window.ui?.showMovieDetails(${movie.id})">
                                <div class="movie-poster-container">
                                    <img src="${api.getImageUrl(movie.poster_path)}" 
                                         alt="${movie.title || 'Movie'}" 
                                         class="movie-poster"
                                         loading="lazy">
                                    
                                    ${newCategory.id === 'trending' ? '' : ''}
                                    
                                    ${movie.vote_average >= 8 ? `
                                        <div class="top-rated-badge">TOP RATED</div>
                                    ` : ''}
                                    
                                    <div class="movie-overlay">
                                        <h3 class="movie-title">${movie.title || 'Untitled'}</h3>
                                        <div class="movie-rating">
                                            <i class="fas fa-star"></i>
                                            <span>${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
                                        </div>
                                        <p class="movie-overview">${utils.truncateText(movie.overview || 'No description available.', 120)}</p>
                                    </div>
                                    
                                    <div class="movie-actions">
                                        <button onclick="event.stopPropagation(); window.ui?.toggleWatchlist(${JSON.stringify(movie).replace(/"/g, '&quot;')})">
                                            <i class="far fa-bookmark"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('');
                        
                        container.innerHTML += newMoviesHTML;
                    }
                }
            });
            
            // Remove loading indicator
            loader.remove();
            
        } catch (error) {
            console.error('Error loading more movies:', error);
            // Show error notification
            const notification = document.createElement('div');
            notification.textContent = 'Failed to load more movies.';
            notification.style.cssText = `
                background: #ff9800;
                color: white;
                padding: 1rem;
                text-align: center;
                position: fixed;
                bottom: 20px;
                right: 20px;
                border-radius: 4px;
                z-index: 1000;
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        } finally {
            this.isLoading = false;
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting NetflixClone...');
    
    // Check for API key warning
    if (window.api?.API_KEY === 'YOUR_TMDB_API_KEY') {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'api-key-warning';
        errorDiv.innerHTML = `
            <div style="
                background: #ff9800;
                color: white;
                padding: 16px;
                text-align: center;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 10000;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            ">
                <strong>⚠️ API Key Required:</strong> Please replace 'YOUR_TMDB_API_KEY' in js/api.js with your actual TMDB API key.
                <br>
                <small>Get a free API key from <a href="https://www.themoviedb.org/settings/api" target="_blank" style="color: white; text-decoration: underline;">TMDB</a></small>
                <button onclick="this.parentElement.remove()" style="
                    background: transparent;
                    border: none;
                    color: white;
                    position: absolute;
                    right: 16px;
                    top: 50%;
                    transform: translateY(-50%);
                    cursor: pointer;
                    font-size: 20px;
                ">×</button>
            </div>
        `;
        document.body.prepend(errorDiv);
    }
    
    // Start the application
    const app = new NetflixClone();
    window.app = app;
    
    console.log('NetflixClone started successfully');
});