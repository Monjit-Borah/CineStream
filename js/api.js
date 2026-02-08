/**
 * TMDB API Module
 * Replace 'YOUR_TMDB_API_KEY' with your actual TMDB API key
 */

const API_KEY = ' Demo key - replace with your own TMDB API key';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// API endpoints
const endpoints = {
    trending: '/trending/movie/week',
    popular: '/movie/popular',
    topRated: '/movie/top_rated',
    nowPlaying: '/movie/now_playing',
    upcoming: '/movie/upcoming',
    search: '/search/movie',
    movieDetails: (id) => `/movie/${id}`,
    movieCredits: (id) => `/movie/${id}/credits`,
    movieVideos: (id) => `/movie/${id}/videos`,
    genreList: '/genre/movie/list',
    discover: '/discover/movie'
};

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch data from TMDB API
async function fetchFromAPI(endpoint, params = {}) {
    const cacheKey = `${endpoint}-${JSON.stringify(params)}`;
    const cached = cache.get(cacheKey);
    
    // Return cached data if valid
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        return cached.data;
    }
    
    try {
        const url = new URL(`${BASE_URL}${endpoint}`);
        url.searchParams.append('api_key', API_KEY);
        url.searchParams.append('language', 'en-US');
        
        // Add additional parameters
        Object.entries(params).forEach(([key, value]) => {
            if (value) url.searchParams.append(key, value);
        });
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Cache the response
        cache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });
        
        return data;
    } catch (error) {
        console.error('Error fetching from TMDB:', error);
        throw error;
    }
}

// Get movies by category
async function getMoviesByCategory(category, page = 1) {
    const endpoint = endpoints[category] || endpoints.popular;
    return fetchFromAPI(endpoint, { page });
}

// Search movies
async function searchMovies(query, page = 1) {
    if (!query.trim()) return { results: [] };
    return fetchFromAPI(endpoints.search, { query, page });
}

// Get movie details
async function getMovieDetails(movieId) {
    const [details, credits, videos] = await Promise.all([
        fetchFromAPI(endpoints.movieDetails(movieId)),
        fetchFromAPI(endpoints.movieCredits(movieId)),
        fetchFromAPI(endpoints.movieVideos(movieId))
    ]);
    
    return { ...details, credits, videos };
}

// Get genres list
async function getGenres() {
    return fetchFromAPI(endpoints.genreList);
}

// Get movies by genre
async function getMoviesByGenre(genreId, page = 1) {
    return fetchFromAPI(endpoints.discover, {
        with_genres: genreId,
        page
    });
}

// Get YouTube trailer key
function getTrailerKey(videos) {
    if (!videos || !videos.results) return null;
    
    // Try to find official trailer first
    const trailer = videos.results.find(video => 
        video.type === 'Trailer' && video.site === 'YouTube'
    );
    
    // If no trailer, try teaser
    if (!trailer) {
        return videos.results.find(video => 
            video.type === 'Teaser' && video.site === 'YouTube'
        )?.key;
    }
    
    return trailer.key;
}

// Get movies for homepage categories
async function getHomepageMovies() {
    const categories = [
        { id: 'trending', name: 'Trending Now', endpoint: endpoints.trending },
        { id: 'popular', name: 'Popular on Netflix', endpoint: endpoints.popular },
        { id: 'topRated', name: 'Top Rated', endpoint: endpoints.topRated },
        { id: 'nowPlaying', name: 'Now Playing', endpoint: endpoints.nowPlaying },
        { id: 'upcoming', name: 'Upcoming Movies', endpoint: endpoints.upcoming }
    ];
    
    const requests = categories.map(category => 
        fetchFromAPI(category.endpoint, { page: 1 })
            .then(data => ({ 
                ...category, 
                movies: data.results ? data.results.slice(0, 10) : [],
                error: false 
            }))
            .catch(() => ({ 
                ...category, 
                movies: [], 
                error: true 
            }))
    );
    
    return Promise.all(requests);
}

// Get image URL with fallback
function getImageUrl(path, size = 'w500') {
    if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
    return `${IMAGE_BASE_URL}/${size}${path}`;
}

// Export API functions
window.api = {
    fetchFromAPI,
    getMoviesByCategory,
    searchMovies,
    getMovieDetails,
    getGenres,
    getMoviesByGenre,
    getTrailerKey,
    getHomepageMovies,
    getImageUrl
};