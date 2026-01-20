$(document).ready(function () {
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

  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);

  $('#theme-toggle').on('click', function () {
    const isDark = $('html').hasClass('dark');
    applyTheme(isDark ? 'light' : 'dark');
  });

  // --- Data Management ---
  const urlParams = new URLSearchParams(window.location.search);
  const locationId = parseInt(urlParams.get('id'));

  // Try to get data from localStorage (saved by main.js)
  const cachedPlaces = JSON.parse(localStorage.getItem('temp_places') || '[]');
  let currentLocation = cachedPlaces.find(p => p.id === locationId);

  // --- UI Population ---
  if (currentLocation) {
    // Hero
    $('#location-hero-image').attr('src', currentLocation.image);
    $('#location-name').text(currentLocation.name);
    $('#location-category').text(currentLocation.category);

    // Content
    $('#location-description').text(currentLocation.description);

    // Page Title
    document.title = `${currentLocation.name} - Visita San Cris`;

    // Update category color (optional enhancement)
    const catColors = {
      restaurant: 'bg-orange-500',
      park: 'bg-green-500',
      museum: 'bg-blue-500',
      shop: 'bg-purple-500'
    };
    if (catColors[currentLocation.category]) {
      $('#location-category')
        .removeClass('bg-brand-gold')
        .addClass(catColors[currentLocation.category]);
    }

  } else {
    // Fallback/Error state
    $('#location-name').text("Locación no encontrada");
    $('#location-description').html(`
            <div class="bg-red-50 border border-red-200 p-6 rounded-2xl text-red-700">
                <p class="font-bold mb-2">¡Ups! No pudimos encontrar esta locación.</p>
                <p class="text-sm">Puede que el enlace haya expirado o la información no esté disponible en este momento.</p>
                <button onclick="window.location.href='index.html'" class="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors">Volver al inicio</button>
            </div>
        `);
    $('#location-hero-image').attr('src', 'https://images.unsplash.com/photo-1594322436404-5a0526db4d13?q=80&w=2000&auto=format&fit=crop');
  }

  // --- Directions Functionality ---
  const handleDirections = () => {
    if (currentLocation) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentLocation.name + " San Cristóbal de las Casas")}`;
      window.open(url, '_blank');
    }
  };

  $('#btn-directions-main, #btn-directions-sidebar').on('click', handleDirections);

  // --- Aesthetic Enhancements ---
  // Smooth reveal animation
  $('body').css('opacity', 0).animate({ opacity: 1 }, 800);
});
