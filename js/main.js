$(document).ready(function () {
  // --- State ---
  let userPosition = null;
  let map = null;
  let markers = [];
  let allPlaces = []; // To store generated places

  // --- Theme Management ---
  const applyTheme = (theme) => {
    if (theme === 'dark') {
      $('html').addClass('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      $('html').removeClass('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Initial theme check
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);

  $('#theme-toggle').on('click', function () {
    const isDark = $('html').hasClass('dark');
    applyTheme(isDark ? 'light' : 'dark');
  });

  // --- Mock Data Generator ---
  const generateMockPlaces = (lat, lng, count = 15) => {
    // ... (existing code remains same)
    const categories = ['restaurant', 'park', 'museum', 'shop'];
    const places = [];

    for (let i = 0; i < count; i++) {
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
        image: `https://loremflickr.com/320/240/${category},san-cristobal?random=${i}`
      });
    }
    return places;
  };

  const generateMockEvents = () => {
    return [
      { id: 1, name: "Concierto de Marimba", date: "20 Ene, 19:00", place: "Plaza de la Paz" },
      { id: 2, name: "Feria del Ámbar", date: "25 Ene, 10:00", place: "Musac" },
      { id: 3, name: "Noche de Leyendas", date: "02 Feb, 21:00", place: "Andador Guadalupe" },
      { id: 4, name: "Taller de Textiles", date: "10 Feb, 16:00", place: "Casa del Jade" }
    ];
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
        allPlaces = generateMockPlaces(userPosition.lat, userPosition.lng);
        renderPlaces(allPlaces);
        renderEventsList();
      },
      (error) => {
        // ... (error handling remains same)
        $("#map-loader").addClass('hidden');
        console.error("Error getting location: ", error);

        let msg = "No pudimos obtener tu ubicación.";
        if (error.code === error.TIMEOUT) msg = "La solicitud de ubicación tardó demasiado.";
        if (error.code === error.PERMISSION_DENIED) msg = "Permiso de ubicación denegado.";

        userPosition = { lat: 16.7371, lng: -92.6376 };
        alert(`${msg} Mostrando San Cristóbal de las Casas por defecto.`);

        renderMap(userPosition);
        allPlaces = generateMockPlaces(userPosition.lat, userPosition.lng);
        renderPlaces(allPlaces);
        renderEventsList();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
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
      iconAnchor: [12, 12],
      popupAnchor: [0, -15]
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
    $('#result-count-desktop').text(places.length);

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
        popupAnchor: [0, -60]
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
                        <p class="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-3">${place.description}</p>
                        <div class="grid grid-cols-2 gap-2">
                            <button class="bg-brand-blue text-white text-[10px] font-bold py-2 rounded-lg hover:bg-blue-800 transition-colors btn-more-info" data-id="${place.id}">
                                Conoce más
                            </button>
                            <button class="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors btn-directions" data-name="${place.name}">
                                Cómo llegar
                            </button>
                        </div>
                    </div>
                `, {
          maxWidth: 250,
          className: 'custom-popup'
        });

      markers.push(marker);
      markerMap[place.id] = marker;

      // Add Card to List
      const card = `
                <div class="flex-shrink-0 w-[85vw] md:w-full bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg md:shadow-sm border border-slate-200 md:border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all cursor-pointer card-item snap-center" data-id="${place.id}">
                    <div class="flex gap-4">
                        <div class="w-24 h-24 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden flex-shrink-0 relative">
                            <img src="${place.image}" alt="${place.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                        </div>
                        <div class="flex-grow min-w-0">
                            <div class="flex justify-between items-start">
                                <h4 class="font-bold text-brand-blue dark:text-brand-gold truncate pr-2">${place.name}</h4>
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 uppercase tracking-wide border border-slate-200 dark:border-slate-600">${place.category}</span>
                            </div>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">${place.description}</p>
                            <div class="mt-2 flex items-center justify-between">
                                <div class="flex items-center text-xs text-brand-gold font-medium">
                                    <span>★ 4.8</span>
                                    <span class="mx-1 text-slate-300">•</span>
                                    <span class="text-slate-400">Abierto ahora</span>
                                </div>
                                <div class="flex gap-3">
                                    <button class="text-brand-blue dark:text-brand-gold font-bold text-xs hover:underline btn-directions" data-name="${place.name}">
                                        Llegar
                                    </button>
                                    <button class="text-brand-blue dark:text-brand-gold font-bold text-xs hover:underline btn-more-info" data-id="${place.id}">
                                        Ver más →
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
      container.append(card);
    });

    // Add click event to cards to center map
    $('.card-item').on('click', function (e) {
      // Don't trigger if "Conoce más" button was clicked
      if ($(e.target).closest('.btn-more-info').length) return;

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

    // Handle "Conoce más" button clicks (Redirection)
    $(document).on('click', '.btn-more-info', function (e) {
      e.stopPropagation();
      const id = $(this).data('id');
      // Store the current places in localStorage so the detail page can find it
      localStorage.setItem('temp_places', JSON.stringify(allPlaces));
      window.location.href = `location.html?id=${id}`;
    });

    // Handle "Cómo llegar" button clicks
    $(document).on('click', '.btn-directions', function (e) {
      e.stopPropagation();
      const placeName = $(this).data('name');
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + " San Cristóbal de las Casas")}`;
      window.open(url, '_blank');
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

  function renderEventsList() {
    const events = generateMockEvents();
    const container = $('#events-container');
    container.empty();

    // Add "HOY" Header
    container.append(`
      <div class="mb-1 pointer-events-none">
        <h3 class="text-3xl font-black text-brand-gold drop-shadow-md italic uppercase tracking-tighter">HOY</h3>
      </div>
    `);

    events.slice(0, 3).forEach((event, index) => {
      const card = `
        <div class="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-3 rounded-xl shadow-xl border border-white/20 dark:border-slate-700/50 transform transition-all duration-300 hover:translate-x-1 cursor-pointer event-card opacity-0">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-gold/10 dark:bg-brand-gold/20 flex flex-col items-center justify-center text-brand-gold">
               <span class="text-[10px] font-bold uppercase leading-none">${event.date.split(' ')[1]}</span>
               <span class="text-lg font-black leading-none">${event.date.split(' ')[0]}</span>
            </div>
            <div class="flex-grow min-w-0">
              <h4 class="font-bold text-brand-blue dark:text-white text-sm truncate uppercase tracking-tight">${event.name}</h4>
              <div class="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                <span class="opacity-70">🕒 ${event.date.split(', ')[1]}</span>
                <span class="opacity-30">•</span>
                <span class="truncate">📍 ${event.place}</span>
              </div>
            </div>
          </div>
        </div>
      `;
      const $card = $(card);
      container.append($card);

      // Staggered entry animation
      gsap.to($card, {
        opacity: 1,
        x: 0,
        from: { x: 20 },
        delay: index * 0.15,
        duration: 0.6,
        ease: "power2.out"
      });
    });
  }
});
