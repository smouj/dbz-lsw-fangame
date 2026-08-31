import { type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLang } from '../i18n/useLang';

export function GamePageHeader({ title, onBack, children }: { title: string; onBack: () => void; children?: ReactNode }) {
  const { lang } = useLang();
  return <header className="page-header">
    <button type="button" className="btn-back" onClick={onBack} aria-label={lang === 'es' ? 'Volver al menú' : 'Back to menu'} title="Esc">
      <ArrowLeft size={20} aria-hidden="true" />
    </button>
    <h1 className="page-title">{title}</h1>
    <div className="page-header-meta">{children ?? <span className="page-header-hint">ESC · {lang === 'es' ? 'VOLVER' : 'BACK'}</span>}</div>
  </header>;
}
