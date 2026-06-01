export default function Loading() {
  return (
    <div style={{
      minHeight: '100vh', background: '#060d06',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid rgba(0,255,136,0.2)',
          borderTop: '3px solid #00ff88',
          animation: 'spin 0.8s linear infinite',
        }} />
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
          Loading Wave CRM...
        </div>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}