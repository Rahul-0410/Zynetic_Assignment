import './App.css';
import { useState, useEffect } from 'react';
import { getData, getCity, getForecastData } from './api';

const weatherIcons = {
  clear: "https://cdn-icons-png.flaticon.com/512/869/869869.png",
  clouds: "https://cdn-icons-png.flaticon.com/512/1163/1163624.png",
  rain: "https://cdn-icons-png.flaticon.com/512/1163/1163634.png",
  snow: "https://cdn-icons-png.flaticon.com/512/1163/1163625.png",
  storm: "https://cdn-icons-png.flaticon.com/512/1779/1779802.png"
};

function App() {
  const [data, setData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("dark");
  const [city, setCity] = useState("");
  const [inputCity, setInputCity] = useState("");
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem("cities")) || []);
  const [historyData, setHistoryData] = useState([]);
  const [error, setError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  function handleHistory(city) {
    if (!history.includes(city)) {
      const updatedHistory = [city, ...history].slice(0, 5);
      setHistory(updatedHistory);
      localStorage.setItem("cities", JSON.stringify(updatedHistory));
    }
  }

  useEffect(() => {
    const fetchData = async (city) => {
      setLoading(true);
      setError(null);
      try {
        const d = await getData(city);
        setData(d);
        if (d && d.name) {
          handleHistory(d.name);
          try {
            const forecast = await getForecastData(d.name);
            setForecastData(forecast);
          } catch (err) {
            console.error("Forecast fetch error:", err);
          }
        }
      } catch (err) {
        console.error("Weather fetch error:", err);
        setError("City not found or weather data unavailable");
      } finally {
        setLoading(false);
      }
    };

    const getcity = async () => {
      try {
        const response = await getCity();
        if (response) {
          setCity(response);
          fetchData(response);
        }
      } catch (err) {
        console.error("Geolocation error:", err);
        setLoading(false);
        setError("Could not detect your location");
      }
    };

    city ? fetchData(city) : getcity();
  }, [city]);

  useEffect(() => {
    const fetchHistoryData = async () => {
      setHistoryData([]);
      try {
        const weatherData = await Promise.all(
          history.map(async (city) => {
            try {
              return await getData(city);
            } catch (error) {
              console.error(`Error fetching data for ${city}:`, error);
              return null;
            }
          })
        );
        setHistoryData(weatherData.filter(data => data !== null));
      } catch (error) {
        console.error("Failed to fetch history data:", error);
      }
    };

    if (history.length) {
      fetchHistoryData();
    }
  }, [history]);

  const getWeatherIcon = (description) => {
    if (description.includes("clear")) return weatherIcons.clear;
    if (description.includes("cloud")) return weatherIcons.clouds;
    if (description.includes("rain")) return weatherIcons.rain;
    if (description.includes("snow")) return weatherIcons.snow;
    if (description.includes("storm") || description.includes("thunder")) return weatherIcons.storm;
    return weatherIcons.clear;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputCity.trim()) {
      setCity(inputCity);
    }
  };

  const handleRefresh = () => {
    if (city) {
      setCity(city);
    }
  };

  const handleGetUserLocation = () => {
    setLocationLoading(true);
    setError(null);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Get weather data using coordinates instead of city name
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            const weatherData = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.REACT_APP_API || process.env.VITE_API_KEY}&units=metric`
            ).then(res => res.json());
            
            if (weatherData.name) {
              setCity(weatherData.name);
              setInputCity(weatherData.name);
            } else {
              throw new Error("Location data unavailable");
            }
          } catch (err) {
            console.error("Error fetching weather by coordinates:", err);
            setError("Could not get weather for your location");
          } finally {
            setLocationLoading(false);
          }
        },
        (err) => {
          console.error("Geolocation permission denied:", err);
          setError("Location permission denied. Please enable location access.");
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      setError("Geolocation is not supported by your browser");
      setLocationLoading(false);
    }
  };

  // Group forecast data by day
  const groupForecastByDay = (forecastData) => {
    if (!forecastData || !forecastData.list) return [];
    
    const dailyForecasts = {};
    const today = new Date().setHours(0, 0, 0, 0);
    
    forecastData.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const day = date.setHours(0, 0, 0, 0);
      
      // Skip today's remaining hours
      if (day === today) return;
      
      if (!dailyForecasts[day] || (dailyForecasts[day].main.temp_max < item.main.temp_max)) {
        dailyForecasts[day] = item;
      }
    });
    
    return Object.values(dailyForecasts).slice(0, 5);
  };

  const formatDay = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-US", { weekday: 'short' });
  };

  return (
    <div className={`app ${theme}`}>
      <h1>Weather Dashboard</h1>
      <div className="app-controls">
        <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? "🌞 Light Mode" : "🌙 Dark Mode"}
        </button>
        <button className="refresh-btn" onClick={handleRefresh}>
          🔄 Refresh
        </button>
      </div>

      <form className="search-box" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter city name"
          value={inputCity}
          onChange={(e) => setInputCity(e.target.value)}
        />
        <button type="submit">Get Weather</button>
        <button 
          type="button" 
          className="location-btn" 
          onClick={handleGetUserLocation}
          disabled={locationLoading}
        >
          {locationLoading ? "Getting Location..." : "📍 Use My Location"}
        </button>
      </form>

      {loading ? (
        <div className="loader">
          <div className="spinner"></div>
          <p>Loading weather data...</p>
        </div>
      ) : error ? (
        <div className="error-message">
          <p>{error}</p>
        </div>
      ) : data ? (
        <div className="weather-container">
          <div className="current-weather">
            <div className="weather-card">
              <h2>{data.name}, {data.sys.country}</h2>
              <div className="weather-main">
                <img 
                  src={getWeatherIcon(data.weather[0].description)} 
                  alt="weather icon" 
                  className="weather-icon" 
                />
                <div className="temp-container">
                  <span className="current-temp">{Math.round(data.main.temp)}°C</span>
                  <span className="feels-like">Feels like: {Math.round(data.main.feels_like)}°C</span>
                </div>
              </div>
              <p className="weather-description">{data.weather[0].description}</p>
              <div className="weather-details">
                <div className="detail-item">
                  <span className="detail-label">Humidity:</span>
                  <span className="detail-value">{data.main.humidity}%</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Wind:</span>
                  <span className="detail-value">{data.wind.speed} km/h</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Pressure:</span>
                  <span className="detail-value">{data.main.pressure} hPa</span>
                </div>
              </div>
            </div>
          </div>

          {forecastData && (
            <div className="forecast-section">
              <h3>5-Day Forecast</h3>
              <div className="forecast-container">
                {groupForecastByDay(forecastData).map((forecast, index) => (
                  <div key={index} className="forecast-card">
                    <h4>{formatDay(forecast.dt)}</h4>
                    <img 
                      src={getWeatherIcon(forecast.weather[0].description)} 
                      alt="forecast icon" 
                      className="forecast-icon" 
                    />
                    <p className="forecast-temp">{Math.round(forecast.main.temp)}°C</p>
                    <p className="forecast-desc">{forecast.weather[0].description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {historyData.length > 0 && (
        <div className="history-section">
          <h3>Recent Searches</h3>
          <div className="history-container">
            {historyData.map((weather, index) => (
              <div key={index} onClick={() => setCity(weather.name)} className="history-card">
                <h4>{weather.name}, {weather.sys.country}</h4>
                <div className="history-content">
                  <img 
                    src={getWeatherIcon(weather.weather[0].description)} 
                    alt="weather" 
                    className="history-icon" 
                  />
                  <div>
                    <p className="history-temp">{Math.round(weather.main.temp)}°C</p>
                    <p className="history-desc">{weather.weather[0].description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;