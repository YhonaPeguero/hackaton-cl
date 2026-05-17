export default function VideoModal({ comuna, videoUrl, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">🎬 El minuto de {comuna}</div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="video-wrapper">
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              autoPlay
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div className="video-placeholder">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎬</div>
                <div style={{ fontSize: 15, marginBottom: 4 }}>Generando video de {comuna}...</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Esto puede tomar unos segundos
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
          {videoUrl
            ? 'Video listo para compartir en WhatsApp, Twitter o Instagram Stories.'
            : 'El video se generará en el servidor y estará disponible para descargar y compartir.'}
        </div>
      </div>
    </div>
  );
}