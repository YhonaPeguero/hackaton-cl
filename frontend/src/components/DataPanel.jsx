export default function DataPanel({ data, onGenerateVideo, loading }) {
  const fmt = (n) => {
    if (!n && n !== 0) return '—';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  };

  return (
    <div className="data-panel">
      <div className="data-panel-header">
        <div>
          <div className="comuna-name">{data.nombre}</div>
          <div className="comuna-region">{data.region} · Ejercicio {data.anno}</div>
        </div>
        <button className="video-btn" onClick={onGenerateVideo} disabled={loading}>
          🎬 Genera el minuto de tu comuna
        </button>
      </div>

      <div className="data-grid">
        <div className="data-card">
          <div className="data-card-label">Presupuesto Total</div>
          <div className="data-card-value">{fmt(data.presupuesto_total)}</div>
          <div className="data-card-sub">Ingresos municipales {data.anno}</div>
        </div>

        <div className="data-card">
          <div className="data-card-label">Gasto Educación</div>
          <div className="data-card-value">{fmt(data.gasto_educacion)}</div>
          <div className="data-card-sub">{data.matriculas_formatted || `${data.matricula_total?.toLocaleString('es-CL')} matriculados`}</div>
        </div>

        <div className="data-card">
          <div className="data-card-label">Gasto Salud</div>
          <div className="data-card-value">{fmt(data.gasto_salud)}</div>
          <div className="data-card-sub">Atención primaria municipal</div>
        </div>

        <div className="data-card">
          <div className="data-card-label">Gasto Infraestructura</div>
          <div className="data-card-value">{fmt(data.gasto_infraestructura)}</div>
          <div className="data-card-sub">Obras públicas y mantención</div>
        </div>

        <div className="data-card">
          <div className="data-card-label">Áreas Verdes</div>
          <div className="data-card-value">{data.m2_areas_verdes ? `${(data.m2_areas_verdes / 1000000).toFixed(2)} km²` : '—'}</div>
          <div className="data-card-sub">{data.numero_parques} parques</div>
        </div>

        <div className="data-card">
          <div className="data-card-label">Plazas</div>
          <div className="data-card-value">{data.m2_plazas ? `${(data.m2_plazas / 10000).toFixed(1)} ha` : '—'}</div>
          <div className="data-card-sub">Espacios públicos</div>
        </div>

        <div className="data-card">
          <div className="data-card-label">SIMCE Matemática</div>
          <div className="data-card-value">{data.promedio_simce_matematica || '—'}</div>
          <div className="data-card-sub">Promedio comunal {data.anno}</div>
        </div>

        <div className="data-card">
          <div className="data-card-label">SIMCE Lenguaje</div>
          <div className="data-card-value">{data.promedio_simce_lenguaje || '—'}</div>
          <div className="data-card-sub">Promedio comunal {data.anno}</div>
        </div>
      </div>

      {/* Contraloria findings */}
      {data.observaciones_contraloria > 0 && (
        <div style={{
          marginTop: 16,
          padding: '14px 16px',
          background: 'rgba(229, 83, 75, 0.08)',
          border: '1px solid rgba(229, 83, 75, 0.2)',
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e5534b', marginBottom: 6 }}>
            Hallazgos de la Contraloría ({data.observaciones_contraloria})
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {data.detalle_contraloria || 'La Contraloría General de la República registró hallazgos oficiales en esta municipalidad. Consulta los informes completos en contraloria.cl'}
          </div>
        </div>
      )}

      {data.observaciones_contraloria === 0 && (
        <div style={{
          marginTop: 16,
          padding: '14px 16px',
          background: 'rgba(62, 207, 142, 0.08)',
          border: '1px solid rgba(62, 207, 142, 0.2)',
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#3ecf8e', marginBottom: 4 }}>
            Sin hallazgos registrados
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            La Contraloría no registró observaciones para esta municipalidad en el último ciclo de auditoría.
          </div>
        </div>
      )}
    </div>
  );
}