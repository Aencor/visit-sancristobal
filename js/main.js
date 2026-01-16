$(document).ready(function () {
  // --- State ---
  let userPosition = null;
  let map = null;
  let markers = [];
  let allPlaces = []; // To store generated places

  // --- Mock Data Generator ---
  const generateMockPlaces = (lat, lng, count = 15) => {
    const categories = ['restaurant', 'park', 'museum', 'shop'];
    const places = [];

    for (let i = 0; i < count; i++) {
      // Random offset within ~2km (approx 0.018 degrees)
      const latOffset = (Math.random() - 0.5) * 0.036;
      const lngOffset = (Math.random() - 0.5) * 0.036;

      const category = categories[Math.floor(Math.random() * categories.length)];

      places.push({
        id: i,
        name: `Lugar Mock ${category} ${i + 1}`,
        category: category,
        lat: lat + latOffset,
        lng: lng + lngOffset,
        description: `Descripción breve del ${category} número ${i + 1}. Un lugar excelente para visitar en San Cris.`,
        image: `https://source.unsplash.com/random/300x200?sig=${i}&${category}` // Placeholder
      });
    }
    return places;
  };

  // --- GSAP Animations ---
  const tl = gsap.timeline();

  // Initial load animation
  tl.from("#landing-section img", { y: -50, opacity: 0, duration: 1, ease: "power3.out" })
    .from("#landing-section h1", { cy: 30, opacity: 0, duration: 0.8 }, "-=0.5")
    .from("#main-search", { scale: 0.8, opacity: 0, duration: 0.5 }, "-=0.3")
    .from("#landing-section p", { y: 20, opacity: 0, duration: 0.5 }, "-=0.3");


  // --- Interactions ---

  $('#search-btn').on('click', function () {
    handleSearch();
  });

  $('#main-search').on('keypress', function (e) {
    if (e.which == 13) {
      handleSearch();
    }
  });

  // Header Search Input (New Single ID)
  $('#header-search').on('keypress', function (e) {
    if (e.which == 13) {
      const query = $(this).val();
      filterPlacesByText(query);
    }
  });

  $('.category-filter').on('click', function () {
    // Reset all specific category styles
    $('.category-filter').removeClass('bg-brand-blue text-white border-transparent').addClass('bg-white border-slate-200 text-slate-700 hover:bg-slate-50');

    // Active Style
    $(this).removeClass('bg-white border-slate-200 text-slate-700 hover:bg-slate-50').addClass('bg-brand-blue text-white border-transparent');

    const category = $(this).data('cat');
    filterPlaces(category);
  });

  function handleSearch() {
    const query = $('#main-search').val();

    // Retrieve geolocation
    if (navigator.geolocation) {
      // Show loading state if needed, or just transition

      // Transition Animation
      gsap.to("#landing-section", {
        y: -window.innerHeight,
        duration: 1,
        ease: "power4.inOut",
        onComplete: () => {
          $("#landing-section").hide();
        }
      });

      $("#map-section").removeClass('hidden-section').show();
      gsap.fromTo("#map-section",
        { opacity: 0, y: window.innerHeight },
        { opacity: 1, y: 0, duration: 1, ease: "power4.inOut" }
      );

      // Init Map logic
      initDirectory(query);

    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  function initDirectory(query) {
    $("#map-loader").removeClass('hidden');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        userPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        $("#map-loader").addClass('hidden');
        renderMap(userPosition);

        // Fetch mock data based on location
        allPlaces = generateMockPlaces(userPosition.lat, userPosition.lng);

        // Filter if query exists (simple mock text filter) or show all
        renderPlaces(allPlaces);
      },
      (error) => {
        $("#map-loader").addClass('hidden');
        console.error("Error getting location: ", error);

        // Default to San Cristobal de las Casas if geo fails or denied
        // San Cris Coords: 16.7370, -92.6376
        userPosition = { lat: 16.7371, lng: -92.6376 };
        alert("No pudimos obtener tu ubicación, mostrando San Cristóbal de las Casas por defecto.");

        renderMap(userPosition);
        allPlaces = generateMockPlaces(userPosition.lat, userPosition.lng);
        renderPlaces(allPlaces);
      }
    );
  }

  function renderMap(center) {
    if (map) return; // Already initialized

    map = L.map('map').setView([center.lat, center.lng], 14);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Add user marker
    const userIcon = L.divIcon({
      className: 'custom-div-icon',
      html: '<div style="background-color: #3b82f6; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    L.marker([center.lat, center.lng], { icon: userIcon }).addTo(map)
      .bindPopup("<b>Estás aquí</b>").openPopup();

    // Add radius circle (2km)
    L.circle([center.lat, center.lng], {
      color: '#d97706',
      fillColor: '#d97706',
      fillOpacity: 0.1,
      radius: 2000
    }).addTo(map);
  }

  function renderPlaces(places) {
    // Clear existing markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    const container = $('#cards-container');
    container.empty();
    $('#result-count').text(places.length);

    if (places.length === 0) {
      container.append('<div class="p-4 text-center text-slate-500">No se encontraron lugares en esta categoría.</div>');
      return;
    }
    // Helper for icons
    const getIcon = (category) => {
      const emojis = {
        restaurant: '🍽️',
        park: '🌳',
        museum: '🏛️',
        shop: '🛍️'
      };
      return L.divIcon({
        className: 'custom-marker',
        html: `<div class="flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-lg border-2 border-brand-blue text-xl">${emojis[category] || '📍'}</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -45]
      });
    };

    const markerMap = {}; // Map ID to Marker

    places.forEach(place => {
      // Add Marker to Map with Custom Icon and Rich Popup
      const marker = L.marker([place.lat, place.lng], { icon: getIcon(place.category) })
        .addTo(map)
        .bindPopup(`
                    <div class="min-w-[200px]">
                        <img src="${place.image}" class="w-full h-32 object-cover rounded-t-lg mb-2" alt="${place.name}">
                        <h3 class="font-bold text-lg text-brand-blue leading-tight">${place.name}</h3>
                        <div class="text-xs font-semibold text-slate-500 uppercase mb-1">${place.category}</div>
                        <p class="text-sm text-slate-600 line-clamp-3">${place.description}</p>
                    </div>
                `, {
          maxWidth: 250,
          className: 'custom-popup'
        });

      markers.push(marker);
      markerMap[place.id] = marker;

      // Add Card to List
      const card = `
                <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer card-item" data-id="${place.id}">
                    <div class="flex gap-4">
                        <div class="w-20 h-20 bg-slate-200 rounded-md overflow-hidden flex-shrink-0">
                            <img src="https://placehold.co/100x100?text=${place.category}" alt="${place.name}" class="w-full h-full object-cover">
                        </div>
                        <div>
                            <h4 class="font-bold text-brand-blue">${place.name}</h4>
                            <span class="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600 uppercase">${place.category}</span>
                            <p class="text-sm text-slate-500 mt-2 line-clamp-2">${place.description}</p>
                        </div>
                    </div>
                </div>
            `;
      container.append(card);
    });

    // Add click event to cards to center map
    $('.card-item').on('click', function () {
      const id = $(this).data('id');
      const place = places.find(p => p.id === id);
      if (place) {
        map.flyTo([place.lat, place.lng], 16, { animate: true, duration: 1.5 });

        const marker = markerMap[id];
        if (marker) {
          marker.openPopup();
        }
      }
    });
  }

  function filterPlaces(category) {
    if (category === 'all') {
      renderPlaces(allPlaces);
    } else {
      const filtered = allPlaces.filter(p => p.category === category);
      renderPlaces(filtered);
    }
  }

  function filterPlacesByText(text) {
    if (!text) {
      renderPlaces(allPlaces);
      return;
    }
    const lowerText = text.toLowerCase();
    const filtered = allPlaces.filter(p =>
      p.name.toLowerCase().includes(lowerText) ||
      p.description.toLowerCase().includes(lowerText) ||
      p.category.toLowerCase().includes(lowerText)
    );
    renderPlaces(filtered);
  }
});
