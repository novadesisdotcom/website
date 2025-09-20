let map;
let markers = [];
let infoWindow;

function createRestaurantCard(place, details) {
  const card = document.createElement('div');
  card.className = 'restaurant-card';

  const photoUrl = place.photos && place.photos.length
    ? place.photos[0].getUrl({maxWidth: 400, maxHeight: 150})
    : 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80';

  card.innerHTML = `
    <img src="${photoUrl}" alt="${place.name}" />
    <h2>${place.name}</h2>
    <div class="rating">⭐ ${place.rating || 'N/A'} (${place.user_ratings_total || 0} reviews)</div>
    <div class="address">${place.vicinity || place.formatted_address || ''}</div>
    <div class="reviews">${formatReviews(details?.reviews)}</div>
  `;
  card.onclick = () => {
    google.maps.event.trigger(place.marker, 'click');
    map.panTo(place.marker.getPosition());
    map.setZoom(16);
  };
  return card;
}

function formatReviews(reviews) {
  if (!reviews || !reviews.length) return '<em>No reviews available.</em>';
  return reviews.slice(0, 2).map(r =>
    `<strong>${r.author_name}:</strong> ${r.text ? r.text.substring(0, 80) : ''} 
     <span style="color:#fbc02d;">(${r.rating}⭐)</span>`
  ).join('<br>');
}

function clearMarkers() {
  for (const m of markers) m.setMap(null);
  markers = [];
}

function showRestaurants(places, detailsMap) {
  const listDiv = document.getElementById('restaurant-list');
  listDiv.innerHTML = '';
  clearMarkers();

  places.forEach(place => {
    const details = detailsMap[place.place_id];
    const card = createRestaurantCard(place, details);
    listDiv.appendChild(card);

    // Marker
    const marker = new google.maps.Marker({
      position: place.geometry.location,
      map,
      title: place.name,
      animation: google.maps.Animation.DROP,
      icon: {
        url: "https://maps.gstatic.com/mapfiles/ms2/micons/orange-dot.png",
        scaledSize: new google.maps.Size(32, 32)
      }
    });
    markers.push(marker);
    place.marker = marker;

    marker.addListener('click', () => {
      infoWindow.setContent(`
        <div style="min-width:200px">
          <strong>${place.name}</strong><br>
          ${place.vicinity || place.formatted_address || ''}<br>
          Rating: <b>${place.rating || 'N/A'}</b> (${place.user_ratings_total || 0} reviews)<br>
          <img src="${(place.photos && place.photos[0]) ? place.photos[0].getUrl({maxWidth:220}) : ''}" 
               style="width:100%;border-radius:8px;margin:6px 0;">
          <div><strong>Reviews:</strong>
            <ul style="padding-left:15px;">
              ${formatReviews(details?.reviews)}
            </ul>
          </div>
        </div>
      `);
      infoWindow.open(map, marker);
    });
  });
}

function fetchPlaceDetails(service, places, callback) {
  let detailsMap = {};
  let done = 0;
  for (const place of places) {
    service.getDetails(
      {placeId: place.place_id, fields: ['reviews']},
      (result, status) => {
        detailsMap[place.place_id] = status === google.maps.places.PlacesServiceStatus.OK ? result : {};
        done++;
        if (done === places.length) callback(detailsMap);
      }
    );
  }
}

function searchRestaurants(location) {
  const service = new google.maps.places.PlacesService(map);
  infoWindow.close();

  service.textSearch({
    query: 'indian restaurant',
    location: location,
    radius: 6000
  }, (results, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      fetchPlaceDetails(service, results, detailsMap => showRestaurants(results, detailsMap));
      map.setCenter(results[0].geometry.location);
    } else {
      document.getElementById('restaurant-list').innerHTML = '<p>No restaurants found.</p>';
    }
  });
}

function geocodeLocation(address, cb) {
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({address: address}, (results, status) => {
    if (status === 'OK' && results[0]) {
      cb(results[0].geometry.location);
    } else {
      alert('Location not found! Try another city or area.');
    }
  });
}

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 28.6139, lng: 77.2090}, // Default: New Delhi
    zoom: 13,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    styles: [ { featureType: "poi.business", stylers: [ { visibility: "off" } ] } ]
  });
  infoWindow = new google.maps.InfoWindow();

  // Initial search
  searchRestaurants(map.getCenter());

  // Form search
  document.getElementById('searchForm').onsubmit = function(e) {
    e.preventDefault();
    const loc = document.getElementById('locationInput').value;
    geocodeLocation(loc, (location) => {
      map.setCenter(location);
      searchRestaurants(location);
    });
  };
}

window.onload = initMap;