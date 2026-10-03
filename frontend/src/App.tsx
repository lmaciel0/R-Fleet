import { Car, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow-blue)',
            }}
          >
            <Car size={24} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              R-Fleet <span style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontWeight: 600 }}>v1.0</span>
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Controle Operacional de Veículos na Oficina
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="badge badge-concluido">
            <CheckCircle2 size={14} /> Backend & DB Prontos
          </span>
          <span className="license-plate mercosul">RFL-1E26</span>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, padding: '32px 24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '32px',
            marginBottom: '24px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>
            Ambiente Base Inicializado com Sucesso 🚀
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '700px' }}>
            A infraestrutura local com <strong>PostgreSQL 16</strong> no Docker Compose, o backend{' '}
            <strong>Spring Boot 3</strong> (Java 21) e o frontend <strong>React 18 + Vite + TypeScript</strong> estão
            configurados e prontos para o desenvolvimento das próximas fases.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <CheckCircle2 size={18} color="var(--status-green)" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>PostgreSQL 16 (Porta 5433)</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Container Docker ativo e saudável. Isolado para não colidir com portas existentes.
              </p>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <ShieldCheck size={18} color="var(--brand-primary)" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Backend Spring Boot 3</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Java 21, Flyway, Spring Security + JWT, Apache POI e validações automáticas.
              </p>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Clock size={18} color="var(--status-yellow)" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Semáforo de Permanência</h3>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                <span className="badge badge-concluido">Verde</span>
                <span className="badge badge-aberto">Amarelo</span>
                <span className="badge badge-atrasado">Vermelho</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
