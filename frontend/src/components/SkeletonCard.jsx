export default function SkeletonCard() {
  return (
    <div className="event-card" style={{ cursor: 'default', pointerEvents: 'none' }}>
      <div className="skeleton" style={{ height: '160px', borderRadius: '0' }} />
      <div className="event-card-body">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <div className="skeleton" style={{ height: '22px', width: '110px', borderRadius: '50px' }} />
        </div>
        <div className="skeleton" style={{ height: '20px', width: '90%', borderRadius: '4px', marginBottom: '8px' }} />
        <div className="skeleton" style={{ height: '14px', width: '100%', borderRadius: '4px', marginBottom: '4px' }} />
        <div className="skeleton" style={{ height: '14px', width: '65%', borderRadius: '4px', marginBottom: '14px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div className="skeleton" style={{ height: '13px', width: '45%', borderRadius: '4px' }} />
          <div className="skeleton" style={{ height: '13px', width: '30%', borderRadius: '4px' }} />
        </div>
      </div>
    </div>
  );
}
