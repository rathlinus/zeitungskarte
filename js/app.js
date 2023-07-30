let map = L.map('mapid').setView([52.65, 9.07], 8);
let zeitungsdaten;
let layers = [];

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
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
            color: '#FFFFFF', // Weißer Rand
            weight: 5,        // Breite des Randes
        }).bringToFront();
    
        // Aktualisiere den ausgewählten Bereich
        ausgewählterBereich = this;
    
        // Zeige die Zeitungsinformationen in der Seitenleiste
        document.getElementById('zeitung').innerHTML = sidebarInhalt;
    });
    
    layer.defaultColor = layer.options.fillColor; // speichert die Standardfarbe für späteren Gebrauch
}