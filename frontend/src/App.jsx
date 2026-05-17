import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { searchComuna, getComunaDetail } from './api/comunas';
import DataPanel from './components/DataPanel';
import VideoModal from './components/VideoModal';
import './styles/global.css';

// Mapbox token — set VITE_MAPBOX_TOKEN in .env
// Get one at https://account.mapbox.com/access-tokens/
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

mapboxgl.accessToken = MAPBOX_TOKEN;

const COMUNA_COORDINATES = {
  'Santiago': [-70.6693, -33.4489],
  'Viña del Mar': [-71.5518, -33.0245],
  'Concepción': [-73.0498, -36.8201],
  'Antofagasta': [-70.4002, -23.6509],
  'La Serena': [-71.2530, -29.9023],
  'Valparaíso': [-71.6169, -33.0458],
  'Temuco': [-72.5955, -38.7356],
  'Puerto Montt': [-72.9424, -41.4689],
  'Iquique': [-70.1503, -20.2167],
  'Rancagua': [-70.7448, -34.1706],
};

export default function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedComuna, setSelectedComuna] = useState(null);
  const [comunaData, setComunaData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const markerRef = useRef(null);

  // Initialize map
  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-71.5, -33.5],
      zoom: 5,
      pitch: 45,
      bearing: -15,
      attributionControl: false,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    });

    return () => map.current?.remove();
  }, []);

  // Fly to selected comuna
  const flyToComuna = (nombre) => {
    const coords = COMUNA_COORDINATES[nombre];
    if (!coords) return;

    if (markerRef.current) markerRef.current.remove();

    map.current.flyTo({
      center: coords,
      zoom: 12,
      pitch: 55,
      bearing: -20,
      duration: 2000,
      essential: true,
    });

    const el = document.createElement('div');
    el.className = 'comuna-marker';
    el.style.cssText = `
      width: 24px; height: 24px; background: #f5a623;
      border-radius: 50%; border: 3px solid #fff;
      box-shadow: 0 0 0 4px rgba(245,166,35,0.4);
      cursor: pointer;
    `;

    markerRef.current = new mapboxgl.Marker(el)
      .setLngLat(coords)
      .addTo(map.current);
  };

  // Search handler
  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchComuna(query);
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Select comuna handler
  const handleSelectComuna = async (nombre) => {
    setSelectedComuna(nombre);
    setResults([]);
    setQuery(nombre);
    flyToComuna(nombre);

    setLoading(true);
    try {
      const data = await getComunaDetail(nombre);
      setComunaData(data);
    } catch (err) {
      console.error('Detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate video
  const handleGenerateVideo = () => {
    if (!selectedComuna) return;

    // Pre-generated hero videos for demo
    const heroVideos = {
      'Santiago': '/videos/santiago-demo.mp4',
      'Viña del Mar': '/videos/vina-del-mar-demo.mp4',
      'Concepción': '/videos/concepcion-demo.mp4',
      'Antofagasta': '/videos/antofagasta-demo.mp4',
    };

    const videoSrc = heroVideos[selectedComuna];
    if (videoSrc) {
      setVideoUrl(videoSrc);
    } else {
      // Fallback: trigger backend generation
      setVideoUrl(null);
    }
    setShowVideo(true);
  };

  return (
    <>
      <div ref={mapContainer} className="map-container" />

      {/* Search Overlay */}
      <div className="search-overlay">
        <div className="logo">hack@latam — Transparency & Corruption</div>
        <h1 className="tagline">
          Ve cómo se gastó la plata de <span>tu comuna</span>
        </h1>

        <div className="search-box">
          <input
            className="search-input"
            placeholder="Escribe tu comuna..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="search-btn" onClick={handleSearch} disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {/* Search Results */}
        {results.length > 0 && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            width: '100%',
            maxWidth: 480,
            overflow: 'hidden'
          }}>
            {results.map((r) => (
              <button
                key={r.nombre}
                onClick={() => handleSelectComuna(r.nombre)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 15,
                }}
              >
                <strong>{r.nombre}</strong>
                <span style={{ color: 'var(--text-secondary)', marginLeft: 8, fontSize: 13 }}>
                  {r.region}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Data Panel */}
      {comunaData && (
        <DataPanel
          data={comunaData}
          onGenerateVideo={handleGenerateVideo}
          loading={loading}
        />
      )}

      {/* Video Modal */}
      {showVideo && (
        <VideoModal
          comuna={selectedComuna}
          videoUrl={videoUrl}
          onClose={() => setShowVideo(false)}
        />
      )}
    </>
  );
}