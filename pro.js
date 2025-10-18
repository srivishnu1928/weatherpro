// === Professional Weather Dashboard JavaScript ===

// Configuration
const CONFIG = {
  API_KEY: "1f9b18fc0c048cc56554ce088ebeb8e6",
  API_BASE_URL: "https://api.openweathermap.org/data/2.5/weather",
  UNITS: "metric"
};

// Utility functions
const utils = {
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  formatTemperature: (temp) => Math.round(temp),
  
  formatWindSpeed: (speed) => Math.round(speed * 10) / 10,
  
  capitalizeWords: (str) => str.replace(/\b\w/g, l => l.toUpperCase()),

  // Enhanced UX utilities
  showSkeletonLoader: () => {
    const weatherDisplay = document.querySelector('.weather-display');
    weatherDisplay.innerHTML = `
      <div class="skeleton-loader">
        <div class="skeleton-header">
          <div class="skeleton-city shimmer"></div>
          <div class="skeleton-temp shimmer"></div>
        </div>
        <div class="skeleton-details">
          <div class="skeleton-item shimmer"></div>
          <div class="skeleton-item shimmer"></div>
          <div class="skeleton-item shimmer"></div>
          <div class="skeleton-item shimmer"></div>
        </div>
      </div>
    `;
  },

  hideSkeletonLoader: () => {
    const skeleton = document.querySelector('.skeleton-loader');
    if (skeleton) {
      skeleton.remove();
    }
  },

  showToast: (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('toast-show'), 100);
    
    // Auto hide after 3 seconds
    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },
  
  getWeatherIcon: (weatherCode) => {
    const iconMap = {
      200: "fas fa-bolt", // Thunderstorm
      300: "fas fa-cloud-rain", // Drizzle
      500: "fas fa-cloud-showers-heavy", // Rain
      600: "fas fa-snowflake", // Snow
      700: "fas fa-smog", // Atmosphere
      800: "fas fa-sun", // Clear
      801: "fas fa-cloud-sun", // Few clouds
      802: "fas fa-cloud", // Scattered clouds
      803: "fas fa-cloud", // Broken clouds
      804: "fas fa-cloud" // Overcast clouds
    };
    
    const code = Math.floor(weatherCode / 100) * 100;
    return iconMap[code] || iconMap[weatherCode] || "fas fa-cloud";
  }
};

// Smart Search Enhancement
class SmartSearchManager {
  constructor() {
    this.popularCities = [
      { name: 'London, UK', country: 'United Kingdom', searches: 15420 },
      { name: 'New York, US', country: 'United States', searches: 12340 },
      { name: 'Tokyo, Japan', country: 'Japan', searches: 11200 },
      { name: 'Paris, France', country: 'France', searches: 9800 },
      { name: 'Berlin, Germany', country: 'Germany', searches: 8500 },
      { name: 'Sydney, Australia', country: 'Australia', searches: 7200 },
      { name: 'Mumbai, India', country: 'India', searches: 6800 },
      { name: 'São Paulo, Brazil', country: 'Brazil', searches: 6200 }
    ];
    
    this.recentSearches = this.loadRecentSearches();
    this.setupSearchEnhancements();
  }

  loadRecentSearches() {
    try {
      return JSON.parse(localStorage.getItem('weatherRecentSearches') || '[]');
    } catch (error) {
      console.warn('Failed to load recent searches:', error);
      return [];
    }
  }

  saveRecentSearch(cityName) {
    try {
      let recents = this.loadRecentSearches();
      
      // Remove if already exists
      recents = recents.filter(city => city !== cityName);
      
      // Add to beginning
      recents.unshift(cityName);
      
      // Keep only last 5 searches
      recents = recents.slice(0, 5);
      
      localStorage.setItem('weatherRecentSearches', JSON.stringify(recents));
      this.recentSearches = recents;
    } catch (error) {
      console.warn('Failed to save recent search:', error);
    }
  }

  getSuggestions(query = '') {
    if (!query.trim()) {
      return this.getDefaultSuggestions();
    }
    
    const searchTerm = query.toLowerCase();
    const filtered = this.popularCities.filter(city => 
      city.name.toLowerCase().includes(searchTerm) ||
      city.country.toLowerCase().includes(searchTerm)
    );
    
    return [
      ...this.recentSearches.map(city => ({ name: city, type: 'recent' })),
      ...filtered.map(city => ({ ...city, type: 'popular' }))
    ].slice(0, 6);
  }

  getDefaultSuggestions() {
    return [
      ...this.recentSearches.slice(0, 2).map(city => ({ name: city, type: 'recent' })),
      ...this.popularCities.slice(0, 4).map(city => ({ ...city, type: 'popular' }))
    ];
  }

  setupSearchEnhancements() {
    const searchInput = document.querySelector('.search-input');
    const searchContainer = searchInput?.parentElement;
    
    if (!searchContainer) return;

    // Create suggestions dropdown
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'search-suggestions';
    suggestionsDiv.style.display = 'none';
    searchContainer.appendChild(suggestionsDiv);

    // Enhanced input event handler
    const debouncedSuggestions = utils.debounce((query) => {
      this.showSuggestions(query, suggestionsDiv);
    }, 200);

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value;
      if (query.length >= 0) {
        debouncedSuggestions(query);
      } else {
        this.hideSuggestions(suggestionsDiv);
      }
    });

    searchInput.addEventListener('focus', () => {
      this.showSuggestions(searchInput.value, suggestionsDiv);
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchContainer.contains(e.target)) {
        this.hideSuggestions(suggestionsDiv);
      }
    });
  }

  showSuggestions(query, container) {
    const suggestions = this.getSuggestions(query);
    
    if (suggestions.length === 0) {
      this.hideSuggestions(container);
      return;
    }

    container.innerHTML = suggestions.map(suggestion => `
      <div class="suggestion-item" data-city="${suggestion.name}">
        <div class="suggestion-icon">
          <i class="fas fa-${suggestion.type === 'recent' ? 'clock' : suggestion.type === 'popular' ? 'fire' : 'map-marker-alt'}"></i>
        </div>
        <div class="suggestion-content">
          <div class="suggestion-name">${suggestion.name}</div>
          <div class="suggestion-meta">
            ${suggestion.type === 'recent' ? 'Recent search' : 
              suggestion.type === 'popular' ? `${suggestion.searches?.toLocaleString() || ''} searches` : 
              'Popular location'}
          </div>
        </div>
      </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const cityName = item.dataset.city;
        const searchInput = document.querySelector('.search-input');
        searchInput.value = cityName;
        this.hideSuggestions(container);
        
        // Trigger search
        if (window.weatherDashboard) {
          window.weatherDashboard.searchWeather(cityName);
        }
      });
    });

    container.style.display = 'block';
  }

  hideSuggestions(container) {
    container.style.display = 'none';
  }
}

// Weather service
class WeatherService {
  static async fetchWeatherData(city) {
    const url = `${CONFIG.API_BASE_URL}?q=${encodeURIComponent(city)}&appid=${CONFIG.API_KEY}&units=${CONFIG.UNITS}`;
    
    // Show skeleton loader
    utils.showSkeletonLoader();
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorMessage = this.getErrorMessage(response.status);
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      if (data.cod !== 200) {
        throw new Error(data.message || 'City not found');
      }
      
      // Hide skeleton loader
      utils.hideSkeletonLoader();
      
      // Save to recent searches
      if (window.smartSearch) {
        window.smartSearch.saveRecentSearch(data.name + ', ' + data.sys.country);
      }
      
      // Show success toast
      utils.showToast(`Weather data loaded for ${data.name}`, 'success');
      
      return data;
    } catch (error) {
      console.error('Weather API Error:', error);
      
      // Hide skeleton loader
      utils.hideSkeletonLoader();
      
      // Show error state
      this.showErrorState(error.message);
      
      throw error;
    }
  }

  static getErrorMessage(status) {
    const errorMessages = {
      400: 'Invalid city name. Please check spelling and try again.',
      401: 'Weather service temporarily unavailable. Please try again later.',
      404: 'City not found. Please check the city name and try again.',
      429: 'Too many requests. Please wait a moment and try again.',
      500: 'Weather service error. Please try again in a few minutes.',
      503: 'Weather service temporarily down. Please try again later.'
    };
    
    return errorMessages[status] || 'Unable to fetch weather data. Please check your connection and try again.';
  }

  static showErrorState(message) {
    const weatherDisplay = document.querySelector('.weather-display');
    weatherDisplay.innerHTML = `
      <div class="error-state">
        <div class="error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="error-message">${message}</div>
        <button class="retry-button" onclick="window.weatherDashboard.retryLastSearch()">
          <i class="fas fa-redo"></i>
          Try Again
        </button>
        <div class="error-suggestions">
          <p>Suggestions:</p>
          <ul>
            <li>Check your internet connection</li>
            <li>Verify the city name spelling</li>
            <li>Try searching for a major city nearby</li>
          </ul>
        </div>
      </div>
    `;
    
    // Show error toast
    utils.showToast(message, 'error');
  }
}

// UI Controller
class UIController {
  constructor() {
    this.elements = {
      cityInput: document.getElementById('cityInput'),
      searchBtn: document.getElementById('searchBtn'),
      weatherResult: document.getElementById('weatherResult')
    };
    
    this.initializeEventListeners();
  }
  
  initializeEventListeners() {
    // Add input validation and debounced search
    this.elements.cityInput.addEventListener('input', 
      utils.debounce((e) => this.validateInput(e.target.value), 300)
    );
  }
  
  validateInput(value) {
    const isValid = value.trim().length >= 2;
    this.elements.searchBtn.disabled = !isValid;
    
    if (isValid) {
      this.elements.searchBtn.classList.remove('disabled');
    } else {
      this.elements.searchBtn.classList.add('disabled');
    }
  }
  
  showLoading() {
    this.elements.weatherResult.innerHTML = `
      <div class="loading">
        <i class="fas fa-spinner"></i>
        <span>Loading weather data...</span>
      </div>
    `;
    
    this.elements.searchBtn.disabled = true;
    this.elements.searchBtn.innerHTML = `
      <i class="fas fa-spinner"></i>
      Loading...
    `;
  }
  
  hideLoading() {
    this.elements.searchBtn.disabled = false;
    this.elements.searchBtn.innerHTML = `
      <i class="fas fa-search"></i>
      Get Weather
    `;
  }
  
  showError(message) {
    this.elements.weatherResult.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
      </div>
    `;
  }
  
  showWeatherData(data) {
    const weatherIcon = utils.getWeatherIcon(data.weather[0].id);
    const temperature = utils.formatTemperature(data.main.temp);
    const feelsLike = utils.formatTemperature(data.main.feels_like);
    const condition = utils.capitalizeWords(data.weather[0].description);
    const windSpeed = utils.formatWindSpeed(data.wind.speed);
    
    this.elements.weatherResult.innerHTML = `
      <div class="weather-card">
        <div class="weather-header">
          <h2 class="city-name">
            <i class="fas fa-map-marker-alt"></i>
            ${data.name}, ${data.sys.country}
          </h2>
          <p class="weather-condition">
            <i class="${weatherIcon}"></i>
            ${condition}
          </p>
        </div>
        
        <div class="weather-grid">
          <div class="weather-item">
            <i class="fas fa-thermometer-half"></i>
            <div class="weather-label">Temperature</div>
            <div class="weather-value">${temperature}°C</div>
          </div>
          
          <div class="weather-item">
            <i class="fas fa-eye"></i>
            <div class="weather-label">Feels Like</div>
            <div class="weather-value">${feelsLike}°C</div>
          </div>
          
          <div class="weather-item">
            <i class="fas fa-tint"></i>
            <div class="weather-label">Humidity</div>
            <div class="weather-value">${data.main.humidity}%</div>
          </div>
          
          <div class="weather-item">
            <i class="fas fa-wind"></i>
            <div class="weather-label">Wind Speed</div>
            <div class="weather-value">${windSpeed} m/s</div>
          </div>
          
          <div class="weather-item">
            <i class="fas fa-compress-arrows-alt"></i>
            <div class="weather-label">Pressure</div>
            <div class="weather-value">${data.main.pressure} hPa</div>
          </div>
          
          <div class="weather-item">
            <i class="fas fa-eye"></i>
            <div class="weather-label">Visibility</div>
            <div class="weather-value">${data.visibility ? (data.visibility / 1000).toFixed(1) + ' km' : 'N/A'}</div>
          </div>
        </div>
        
        <div class="weather-footer">
          <small>Last updated: ${new Date().toLocaleTimeString()}</small>
        </div>
      </div>
    `;
  }
}

// Main Weather App
class WeatherApp {
  constructor() {
    this.ui = new UIController();
    this.currentCity = '';
    this.lastSearchCity = '';
  }
  
  async getWeather() {
    const city = this.ui.elements.cityInput.value.trim();
    await this.searchWeather(city);
  }

  async searchWeather(city) {
    if (!city) {
      utils.showToast('Please enter a city name', 'error');
      this.ui.elements.cityInput.focus();
      return;
    }
    
    if (city.length < 2) {
      utils.showToast('City name must be at least 2 characters long', 'error');
      this.ui.elements.cityInput.focus();
      return;
    }
    
    this.currentCity = city;
    this.lastSearchCity = city;
    
    try {
      const weatherData = await WeatherService.fetchWeatherData(city);
      this.ui.showWeatherData(weatherData);
      
      // Store in local storage for quick access
      this.saveRecentSearch(city);
      
    } catch (error) {
      // Error handling is now done in WeatherService
      console.error('Weather fetch error:', error);
    }
  }

  async retryLastSearch() {
    if (this.lastSearchCity) {
      await this.searchWeather(this.lastSearchCity);
    } else {
      utils.showToast('No previous search to retry', 'info');
    }
  }
  
  saveRecentSearch(city) {
    try {
      let recentSearches = JSON.parse(localStorage.getItem('recentWeatherSearches') || '[]');
      recentSearches = recentSearches.filter(search => search.toLowerCase() !== city.toLowerCase());
      recentSearches.unshift(city);
      recentSearches = recentSearches.slice(0, 5); // Keep only 5 recent searches
      localStorage.setItem('recentWeatherSearches', JSON.stringify(recentSearches));
    } catch (error) {
      console.warn('Could not save to localStorage:', error);
    }
  }
}

// Initialize the app
const weatherApp = new WeatherApp();

// Global functions for HTML event handlers
function getWeather() {
  weatherApp.getWeather();
}

function handleKeyPress(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    getWeather();
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('Professional Weather Dashboard initialized');
  
  // Initialize smart search
  window.smartSearch = new SmartSearchManager();
  
  // Make weather app globally available for retry functionality
  window.weatherDashboard = weatherApp;
  
  // Focus on input field
  weatherApp.ui.elements.cityInput.focus();
  
  // Show welcome message for first-time users
  const hasUsedApp = localStorage.getItem('weatherAppUsed');
  if (!hasUsedApp) {
    setTimeout(() => {
      utils.showToast('Welcome! Try searching for a city to get started.', 'info');
      localStorage.setItem('weatherAppUsed', 'true');
    }, 1000);
  }
  
  // Load recent searches if available
  try {
    const recentSearches = JSON.parse(localStorage.getItem('recentWeatherSearches') || '[]');
    if (recentSearches.length > 0) {
      console.log('Recent searches available:', recentSearches);
    }
  } catch (error) {
    console.warn('Could not load recent searches:', error);
  }
});