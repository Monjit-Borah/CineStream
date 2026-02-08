/**
 * UI Module - Handles all DOM manipulations and UI updates
 */

class UIManager {
    constructor() {
        this.elements = {
            navbar: document.querySelector('.navbar'),
            searchInput: document.querySelector('.search-input'),
            searchResults: document.querySelector('.search-results'),
            categoriesList: document.getElementById('categories-list'),
            watchlistContainer: document.getElementById('watchlist-container'),
            movieModal: document.getElementById('movie-modal'),
            trailerModal: document.getElementById('trailer-modal'),
            skeletonLoader: document.querySelector('.skeleton-loader'),
            categoryFilter: document.getElementById('category-filter')
        };
        
        this.currentMovie = null;
        this.watchlist = this.loadWatchlist();
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.renderWatchlist();
    }
    
    bindEvents() {
        // Navbar scroll effect
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                this.elements.navbar.classList.add('scrolled');
            } else {
                this.elements.navbar.classList.remove('scrolled');
            }
        });
        
        // Search functionality
        this.elements.searchInput.addEventListener('input', 
            utils.debounce(this.handleSearch.bind(this), 300)
        );
        
        // Modal close buttons
        document.querySelectorAll('.modal-close, .trailer-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });
        
        // Close modals on overlay click
        this.elements.movieModal.addEventListener('click', (e) => {
            if (e.target === this.elements.movieModal) this.closeModals();
        });
        
        this.elements.trailerModal.addEventListener('click', (e) => {
            if (e.target === this.elements.trailerModal) this.closeModals();
        });
        
        // Close modals on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModals();
        });
        
        // Category filter
        if (this.elements.categoryFilter) {
            this.elements.categoryFilter.addEventListener('change', (e) => {
                this.filterCategories(e.target.value);
            });
        }
        
        // Clear watchlist button
        const clearBtn = document.querySelector('.clear-watchlist');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearWatchlist());
        }
    }
    
    // Handle search input
    async handleSearch(e) {
        const query = e.target.value.trim();
        const searchResults = this.elements.searchResults;
        
        if (!query) {
            searchResults.classList.remove('active');
            return;
        }
        
        try {
            const data = await api.searchMovies(query);
            this.displaySearchResults(data.results);
            searchResults.classList.add('active');
        } catch (error) {
            searchResults.innerHTML = `
                <div class="search-result-item">
                    <p>Error searching movies. Please try again.</p>
                </div>
            `;
            searchResults.classList.add('active');
        }
    }
    
    // Display search results
    displaySearchResults(movies) {
        const searchResults = this.elements.searchResults;
        
        if (!movies || movies.length === 0) {
            searchResults.innerHTML = `
                <div class="search-result-item">
                    <p>No movies found. Try a different search.</p>
                </div>
            `;
            return;
        }
        
        searchResults.innerHTML = movies.slice(0, 10).map(movie => `
            <div class="search-result-item" data-id="${movie.id}">
                <img src="${api.getImageUrl(movie.poster_path, 'w92')}" 
                     alt="${movie.title}" 
                     class="search-result-poster">
                <div class="search-result-info">
                    <h4>${movie.title}</h4>
                    <p>${movie.release_date ? utils.getYearFromDate(movie.release_date) : 'N/A'}</p>
                    <p>⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</p>
                </div>
            </div>
        `).join('');
        
        // Add click event to search results
        searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', async () => {
                const movieId = item.dataset.id;
                await this.showMovieDetails(movieId);
                searchResults.classList.remove('active');
                this.elements.searchInput.value = '';
            });
        });
    }
    
    // Show movie details modal
    async showMovieDetails(movieId) {
        try {
            this.showSkeletonLoader();
            
            const movieData = await api.getMovieDetails(movieId);
            this.currentMovie = movieData;
            
            this.hideSkeletonLoader();
            this.renderMovieModal(movieData);
            this.elements.movieModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Update watchlist button
            this.updateWatchlistButton(movieId);
            
        } catch (error) {
            console.error('Error loading movie details:', error);
            this.showError('Failed to load movie details. Please try again.');
            this.hideSkeletonLoader();
        }
    }
    
    // Render movie modal
    renderMovieModal(movie) {
        const modal = this.elements.movieModal;
        const trailerKey = api.getTrailerKey(movie.videos);
        
        // Update modal content
        modal.querySelector('.modal-poster').src = api.getImageUrl(movie.poster_path);
        modal.querySelector('.modal-poster').alt = movie.title;
        modal.querySelector('.rating-value').textContent = movie.vote_average.toFixed(1);
        modal.querySelector('.modal-title').textContent = movie.title;
        modal.querySelector('.modal-release').textContent = utils.formatDate(movie.release_date);
        modal.querySelector('.modal-runtime').textContent = utils.formatRuntime(movie.runtime);
        modal.querySelector('.modal-genres').textContent = movie.genres.map(g => g.name).join(', ');
        modal.querySelector('.modal-overview').textContent = movie.overview || 'No overview available.';
        
        // Cast section
        const castContainer = modal.querySelector('.cast-container');
        const cast = movie.credits?.cast?.slice(0, 10) || [];
        
        castContainer.innerHTML = cast.map(person => `
            <div class="cast-member">
                <img src="${api.getImageUrl(person.profile_path, 'w185')}" 
                     alt="${person.name}"
                     onerror="this.src='https://via.placeholder.com/185x185?text=No+Image'">
                <p>${utils.truncateText(person.name, 15)}</p>
                <p><small>${utils.truncateText(person.character, 20)}</small></p>
            </div>
        `).join('');
        
        // Play trailer button
        const playBtn = modal.querySelector('.play-trailer');
        if (trailerKey) {
            playBtn.disabled = false;
            playBtn.onclick = () => this.playTrailer(trailerKey);
        } else {
            playBtn.disabled = true;
            playBtn.textContent = 'No Trailer Available';
        }
        
        // Watchlist button
        const watchlistBtn = modal.querySelector('.toggle-watchlist');
        watchlistBtn.onclick = () => this.toggleWatchlist(movie);
    }
    
    // Update watchlist button state
    updateWatchlistButton(movieId) {
        const btn = this.elements.movieModal.querySelector('.toggle-watchlist');
        const isInWatchlist = this.watchlist.some(m => m.id === movieId);
        
        btn.innerHTML = isInWatchlist ? 
            '<i class="fas fa-bookmark"></i> Remove from Watchlist' :
            '<i class="far fa-bookmark"></i> Add to Watchlist';
        
        btn.classList.toggle('btn-secondary', !isInWatchlist);
        btn.classList.toggle('btn-primary', isInWatchlist);
    }
    
    // Toggle movie in watchlist
    toggleWatchlist(movie) {
        const index = this.watchlist.findIndex(m => m.id === movie.id);
        
        if (index === -1) {
            // Add to watchlist
            this.watchlist.push({
                id: movie.id,
                title: movie.title,
                poster_path: movie.poster_path,
                vote_average: movie.vote_average,
                release_date: movie.release_date
            });
        } else {
            // Remove from watchlist
            this.watchlist.splice(index, 1);
        }
        
        // Save to localStorage
        utils.saveToLocalStorage('netflix-watchlist', this.watchlist);
        
        // Update UI
        this.updateWatchlistButton(movie.id);
        this.renderWatchlist();
        
        // Show notification
        this.showNotification(
            index === -1 ? 'Added to watchlist!' : 'Removed from watchlist!'
        );
    }
    
    // Render watchlist
    renderWatchlist() {
        const container = this.elements.watchlistContainer;
        
        if (!this.watchlist || this.watchlist.length === 0) {
            container.innerHTML = '<p class="empty-watchlist">Your watchlist is empty. Add movies by clicking the bookmark icon!</p>';
            return;
        }
        
        container.innerHTML = this.watchlist.map(movie => `
            <div class="watchlist-card">
                <img src="${api.getImageUrl(movie.poster_path, 'w300')}" 
                     alt="${movie.title}"
                     onclick="ui.showMovieDetails(${movie.id})">
                <button class="watchlist-card-remove" onclick="ui.removeFromWatchlist(${movie.id})">
                    <i class="fas fa-times"></i>
                </button>
                <div class="watchlist-card-info">
                    <h4>${utils.truncateText(movie.title, 20)}</h4>
                    <p>⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</p>
                </div>
            </div>
        `).join('');
    }
    
    // Remove movie from watchlist
    removeFromWatchlist(movieId) {
        this.watchlist = this.watchlist.filter(m => m.id !== movieId);
        utils.saveToLocalStorage('netflix-watchlist', this.watchlist);
        this.renderWatchlist();
        
        // Update modal button if this movie is currently open
        if (this.currentMovie && this.currentMovie.id === movieId) {
            this.updateWatchlistButton(movieId);
        }
        
        this.showNotification('Removed from watchlist!');
    }
    
    // Clear entire watchlist
    clearWatchlist() {
        if (confirm('Are you sure you want to clear your entire watchlist?')) {
            this.watchlist = [];
            utils.removeFromLocalStorage('netflix-watchlist');
            this.renderWatchlist();
            this.showNotification('Watchlist cleared!');
        }
    }
    
    // Load watchlist from localStorage
    loadWatchlist() {
        return utils.loadFromLocalStorage('netflix-watchlist') || [];
    }
    
    // Play trailer
    playTrailer(youtubeKey) {
        const iframe = document.getElementById('trailer-video');
        iframe.src = utils.getYouTubeUrl(youtubeKey);
        this.elements.trailerModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    // Close all modals
    closeModals() {
        this.elements.movieModal.classList.remove('active');
        this.elements.trailerModal.classList.remove('active');
        
        // Stop video playback
        const iframe = document.getElementById('trailer-video');
        iframe.src = '';
        
        document.body.style.overflow = '';
    }
    
    // Show notification
    showNotification(message, duration = 3000) {
        // Remove existing notification
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: var(--netflix-red);
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(notification);
        
        // Remove after duration
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
        
        // Add CSS animation if not already present
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Show skeleton loader
    showSkeletonLoader() {
        this.elements.skeletonLoader.classList.remove('hidden');
    }
    
    // Hide skeleton loader
    hideSkeletonLoader() {
        this.elements.skeletonLoader.classList.add('hidden');
    }
    
    // Show error message
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        errorDiv.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: #f44336;
            color: white;
            padding: 16px 24px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 5000);
    }
    
    // Filter categories
    filterCategories(filter) {
        const rows = document.querySelectorAll('.movie-row');
        
        rows.forEach(row => {
            if (filter === 'all' || row.dataset.category === filter) {
                row.style.display = 'block';
            } else {
                row.style.display = 'none';
            }
        });
    }
    
    // Render movie categories
    renderCategories(categories) {
        const container = this.elements.categoriesList;
        
        categories.forEach((category, index) => {
            if (!category.movies || category.movies.length === 0) return;
            
            const row = document.createElement('div');
            row.className = 'movie-row';
            row.dataset.category = category.id;
            
            // Create trending badges for first 3 trending movies
            const isTrending = category.id === 'trending';
            
            row.innerHTML = `
                <div class="row-header">
                    <h2 class="row-title">${category.name}</h2>
                    <div class="row-controls">
                        <button class="row-prev" data-row="${category.id}">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button class="row-next" data-row="${category.id}">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
                <div class="movies-container" id="${category.id}-movies">
                    ${category.movies.map((movie, idx) => `
                        <div class="movie-card" onclick="ui.showMovieDetails(${movie.id})">
                            <div class="movie-poster-container">
                                <img src="${api.getImageUrl(movie.poster_path)}" 
                                     alt="${movie.title}" 
                                     class="movie-poster"
                                     loading="lazy">
                                
                                ${isTrending && idx < 3 ? `
                                    <div class="trending-badge">${idx + 1}</div>
                                ` : ''}
                                
                                ${movie.vote_average >= 8 ? `
                                    <div class="top-rated-badge">TOP RATED</div>
                                ` : ''}
                                
                                <div class="movie-overlay">
                                    <h3 class="movie-title">${movie.title}</h3>
                                    <div class="movie-rating">
                                        <i class="fas fa-star"></i>
                                        <span>${movie.vote_average.toFixed(1)}</span>
                                    </div>
                                    <p class="movie-overview">${utils.truncateText(movie.overview || 'No description available.', 120)}</p>
                                </div>
                                
                                <div class="movie-actions">
                                    <button onclick="event.stopPropagation(); ui.toggleWatchlist(${JSON.stringify(movie).replace(/"/g, '&quot;')})">
                                        <i class="far fa-bookmark"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            container.appendChild(row);
            
            // Add scroll functionality for this row
            this.addRowScrollFunctionality(category.id);
        });
    }
    
    // Add horizontal scroll functionality to movie rows
    addRowScrollFunctionality(rowId) {
        const container = document.getElementById(`${rowId}-movies`);
        const prevBtn = document.querySelector(`.row-prev[data-row="${rowId}"]`);
        const nextBtn = document.querySelector(`.row-next[data-row="${rowId}"]`);
        
        if (!container || !prevBtn || !nextBtn) return;
        
        const scrollAmount = 300;
        
        nextBtn.addEventListener('click', () => {
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });
        
        prevBtn.addEventListener('click', () => {
            container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });
        
        // Update button states based on scroll position
        const updateButtons = () => {
            prevBtn.disabled = container.scrollLeft <= 0;
            nextBtn.disabled = container.scrollLeft >= (container.scrollWidth - container.clientWidth);
        };
        
        container.addEventListener('scroll', updateButtons);
        updateButtons();
        
        // Add keyboard navigation
        container.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                e.preventDefault();
            }
        });
        
        // Make container focusable
        container.tabIndex = 0;
    }
}

// Initialize UI Manager
let ui;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    ui = new UIManager();
    window.ui = ui; // Make globally available
});