const darkModeToggle = document.getElementById('dark-mode-toggle');
const sidebar = document.getElementById('sidebar');
const logo = document.querySelector('.logo');
const container = document.getElementById('mapid');
let isDarkMode = false;
let mode = "light"; // Initialize mode to light

darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';



darkModeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    sidebar.classList.toggle('dark-mode');

    if (isDarkMode) {
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        sidebar.style.backgroundColor = '#121212';
        container.style.backgroundColor = '#121212';
        sidebar.style.color = '#ffffff';
        logo.src = './img/logodark.svg';
        mode = "dark";
    } else {
        darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        sidebar.style.backgroundColor = '#ffffff';
        container.style.backgroundColor = '#ffffff';
        sidebar.style.color = '#000000';
        logo.src = './img/logo.svg';
        mode = "light";
    }

    document.cookie = `darkMode=${isDarkMode}; expires=Thu, 31 Dec 2099 23:59:59 UTC; path=/`;

    darkModeToggle.classList.add('clicked');
    setTimeout(() => {
        darkModeToggle.classList.remove('clicked');
    }, 200);

    // Update the tile layer URL based on the new mode
    tileLayer.setUrl('https://tile.jawg.io/jawg-' + mode + '/{z}/{x}/{y}{r}.png?access-token=Odj6prjRlxlRJ78z8eEVI8NWyQ6Ywr4hLlVEXsfkCSHnb1LT1vpOgwBHrg9JHd2v');

    // Refresh the map tiles and layout
    map.invalidateSize();

    // Update the color of the selected area based on the mode
    if (ausgewählterBereich) {
        ausgewählterBereich.setStyle({
            color: isDarkMode ? '#121212' : '#ffffff',
            weight: 5,
        });
    }
});

let map = L.map('mapid').setView([52.65, 9.07], 8);
let zeitungsdaten;
let layers = [];

// Initialize tileLayer with the initial mode value
let tileLayer = L.tileLayer('https://tile.jawg.io/jawg-' + mode + '/{z}/{x}/{y}{r}.png?access-token=Odj6prjRlxlRJ78z8eEVI8NWyQ6Ywr4hLlVEXsfkCSHnb1LT1vpOgwBHrg9JHd2v', {
    maxZoom: 12,
}).addTo(map);

// Fetch Zeitungsdaten
fetch('../files/Zeitungsdaten.json')
.then(response => response.json())
.then(data => {
    zeitungsdaten = data;
    // Wenn die Zeitungsdaten geladen sind, laden Sie die GeoJSON-Daten
    fetchGeoJSON();
});

function fetchGeoJSON() {
    fetch('../files/gemeinden_simplify200.geojson')
    .then(response => response.json())
    .then(data => {
        // Hinzufügen der GeoJSON-Daten zur Karte
        L.geoJSON(data, {
            onEachFeature: onEachFeature
        }).addTo(map);
    });
}

function onEachFeature(feature, layer) {
    // Sammle alle Zeitungen, die für den aktuellen Bereich zuständig sind
    let zuständigeZeitungen = zeitungsdaten.filter(zeitung => {
        let landkreise = zeitung.GEN.split(', ');
        return landkreise.includes(feature.properties.GEN);
    });

    // Erstelle einen Inhalt für die Seitenleiste basierend auf den zuständigen Zeitungen
    let sidebarInhalt = `<h1>${feature.properties.GEN}</h1>
    
    <h3>Zuständige Zeitungen:</h3>
    `;
    if (zuständigeZeitungen.length > 0) {
        zuständigeZeitungen.forEach(zeitung => {
            sidebarInhalt += `
            <div class="zeitung-info" style="border-left: solid ${zeitung.farbe} !important; border-width: 5px; padding-left: 10px">
                <img class="zeitungslogo" src="${zeitung.Logo}" alt="${zeitung.Zeitungsname}" style="width: 100%;"/>
                <p class="Sitz"><i class="fa-solid fa-location-dot"></i> ${zeitung.Sitz}</p>
                <p class="Erscheinungsweise"><i class="fa-solid fa-calendar-days"></i> ${zeitung.Erscheinungsweise}</p>
                <p class="Auflage"><i class="fas fa-chart-line"></i> ${zeitung.Auflage}</p>
                <p class="Erstausgabe"><i class="fas fa-history"></i> ${zeitung.Erstausgabe}</p>
                <p class="Verlag"><i class="fas fa-building"></i> ${zeitung.Verlag}</p>
            </div>`;
        });

        // Wenn mehrere Zeitungen zuständig sind, erstelle ein Streifenmuster
        if (zuständigeZeitungen.length > 1) {
            let patternId = 'pattern' + Math.random().toString(36).substr(2, 9);
            let svgDefs = document.querySelector('svg defs');
            if (!svgDefs) {
                let svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svgDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                svgEl.appendChild(svgDefs);
                document.body.appendChild(svgEl);
            }
            let pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
            pattern.setAttribute('id', patternId);
            pattern.setAttribute('patternUnits', 'userSpaceOnUse');
            pattern.setAttribute('width', '20');
            pattern.setAttribute('height', zuständigeZeitungen.length * 10);
            pattern.setAttribute('patternTransform', 'rotate(-45)');

            // Linien erstellen
            for (let i = 0; i < zuständigeZeitungen.length; i++) {
                let rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', '0');
                rect.setAttribute('y', i * 10);
                rect.setAttribute('width', '20');
                rect.setAttribute('height', '10');
                rect.setAttribute('fill', zuständigeZeitungen[i].farbe);
                pattern.appendChild(rect);
            }

            svgDefs.appendChild(pattern);
            layer.setStyle({ color: '#00000040', weight: 1, fillColor: 'url(#' + patternId + ')', fillOpacity: 0.5 });
        }
        else {
            // Färbe den Bereich entsprechend der Farbe der zuständigen Zeitung
            layer.setStyle({ color: '#00000040', weight: 1, fillColor: zuständigeZeitungen[0].farbe, fillOpacity: 0.5 });
        }
    } else {
        sidebarInhalt += `Keine Zeitungsinformationen gefunden.`;
        layer.setStyle({ color: '#00000040', weight: 1});
    }

    layers.push(layer);

    let ausgewählterBereich = null; // Variable, um den ausgewählten Bereich zu speichern
    
    // Layer dem Klick-Handler hinzufügen
    layer.on('click', function (e) {
        // Wenn ein Bereich ausgewählt ist, setze dessen Stil zurück
        if (ausgewählterBereich) {
            ausgewählterBereich.setStyle({
                color: '#00000040',
                weight: 1,
                fillColor: ausgewählterBereich.defaultColor,
                fillOpacity: 0.5
            });
        }
        // Markiere den neuen Bereich
        for (let i = 0; i < layers.length; i++) {
            layers[i].setStyle({
                color: '#00000040', // Schwarzer Rand
                weight: 1, // Breite des Randes
                fillColor: layers[i].defaultColor,
                fillOpacity: 0.5
            });
        }
        // Markiere den neuen Bereich
        this.setStyle({
            color: isDarkMode ? '#121212' : '#ffffff', // Use appropriate background color based on mode
            weight: 5,        // Breite des Randes
        }).bringToFront();
    
        // Aktualisiere den ausgewählten Bereich
        ausgewählterBereich = this;
    
        // Zeige die Zeitungsinformationen in der Seitenleiste
        document.getElementById('zeitung').innerHTML = sidebarInhalt;
    });
    
    layer.defaultColor = layer.options.fillColor; // speichert die Standardfarbe für späteren Gebrauch
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// Check if the "darkMode" cookie exists
const storedDarkMode = getCookie('darkMode');
if (storedDarkMode !== undefined) {
    isDarkMode = storedDarkMode === 'true';

    if (isDarkMode) {
        sidebar.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        sidebar.style.backgroundColor = '#121212';
        sidebar.style.color = '#ffffff';
        logo.src = './img/logodark.svg';
        mode = "dark";
    } else {
        sidebar.classList.remove('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        sidebar.style.backgroundColor = '#ffffff';
        sidebar.style.color = '#000000';
        logo.src = './img/logo.svg';
        mode = "light";
    }
    tileLayer.setUrl('https://tile.jawg.io/jawg-' + mode + '/{z}/{x}/{y}{r}.png?access-token=Odj6prjRlxlRJ78z8eEVI8NWyQ6Ywr4hLlVEXsfkCSHnb1LT1vpOgwBHrg9JHd2v');

    map.invalidateSize();
}