    function fetchAdelaideWeather() {
        setWeatherCity('Adelaide');
    }

    function setWeatherCity(city) {
        document.getElementById('weatherCity').value = city;
        getLiveWeather();
    }

    async function getLiveWeather(event) {
        if (event) event.preventDefault();
        var input = document.getElementById('weatherCity');
        var city = input.value.trim();
        var status = document.getElementById('weatherStatus');
        if (!city) {
            status.textContent = 'Enter a town or city to check the weather.';
            input.focus();
            return;
        }
        var button = document.getElementById('weatherSearchButton');
        button.disabled = true;
        button.textContent = 'Checking…';
        status.textContent = 'Getting current conditions…';
        try {
            var res = await fetch('https://wttr.in/' + encodeURIComponent(city) + '?format=j1');
            if (!res.ok) throw new Error('Weather service returned ' + res.status + '. Try another location later.');
            var data = await res.json();
            var condition = data && data.current_condition && data.current_condition[0] ? data.current_condition[0] : null;
            if (!condition || !condition.temp_C || !Array.isArray(condition.weatherDesc) || !condition.weatherDesc[0]) {
                throw new Error('No current weather data was found for that location.');
            }
            var area = data.nearest_area && data.nearest_area[0];
            var locationName = area && area.areaName && area.areaName[0] ? area.areaName[0].value : city;
            var country = area && area.country && area.country[0] ? area.country[0].value : '';
            var description = condition.weatherDesc[0].value;
            document.getElementById('wLocation').textContent = locationName + (country ? ', ' + country : '');
            document.getElementById('wTemp').textContent = condition.temp_C + '°C';
            document.getElementById('wDesc').textContent = description;
            document.getElementById('wFeelsLike').textContent = condition.FeelsLikeC + '°C';
            document.getElementById('wHumidity').textContent = condition.humidity + '%';
            document.getElementById('wWind').textContent = condition.windspeedKmph + ' km/h';
            var lowerDescription = description.toLowerCase();
            document.getElementById('wIcon').textContent = /rain|drizzle|shower/.test(lowerDescription) ? '🌧️' : /snow|sleet|ice/.test(lowerDescription) ? '❄️' : /thunder|storm/.test(lowerDescription) ? '⛈️' : /cloud|overcast|mist|fog/.test(lowerDescription) ? '☁️' : '☀️';
            var forecast = document.getElementById('weatherForecast');
            forecast.replaceChildren();
            (Array.isArray(data.weather) ? data.weather.slice(0, 3) : []).forEach(function(day, index) {
                if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day.date || '') || !Number.isFinite(Number(day.maxtempC)) || !Number.isFinite(Number(day.mintempC))) return;
                var card = document.createElement('article');
                card.className = 'forecast-day';
                var date = new Date(day.date + 'T12:00:00');
                var dayName = document.createElement('div');
                dayName.className = 'forecast-day-name';
                dayName.textContent = index === 0 ? 'Today' : new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);
                var dayCondition = day.hourly && day.hourly[4] && day.hourly[4].weatherDesc && day.hourly[4].weatherDesc[0]
                    ? day.hourly[4].weatherDesc[0].value
                    : description;
                var daySummary = document.createElement('p');
                daySummary.className = 'forecast-condition';
                daySummary.textContent = dayCondition;
                var temperatures = document.createElement('div');
                temperatures.className = 'forecast-temperatures';
                var high = document.createElement('span');
                high.textContent = day.maxtempC + '°';
                var low = document.createElement('span');
                low.textContent = day.mintempC + '°';
                temperatures.append(high, low);
                card.append(dayName, daySummary, temperatures);
                forecast.appendChild(card);
            });
            if (!forecast.children.length) {
                var forecastEmpty = document.createElement('p');
                forecastEmpty.className = 'forecast-empty';
                forecastEmpty.textContent = 'An upcoming forecast is unavailable for this location.';
                forecast.appendChild(forecastEmpty);
            }
            status.textContent = 'Updated just now · Weather provided by wttr.in';
            updateExtraHomeWidgets();
        } catch (error) {
            status.textContent = error.message || 'Could not fetch weather. Check your connection and try again.';
        } finally {
            button.disabled = false;
            button.textContent = 'Check weather';
        }
    }
