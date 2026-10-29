import fonteUrl from 'dejavu-fonts-ttf/ttf/DejaVuSans.ttf?url';
import fonteNegritoUrl from 'dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf?url';

// Identidade fixa de impressão; independente do tema da aplicação.
export const CORES_EXPORTACAO = Object.freeze({
  institucional: '#1E3A8A', texto: '#0F172A', secundario: '#64748B',
  borda: '#E2E8F0', superficie: '#F8FAFC', cabecalho: '#F1F5F9', branco: '#FFFFFF',
  alerta: '#B45309', alertaFundo: '#FFFBEB', alertaBorda: '#FDE68A',
  negativo: '#B91C1C', alertaFinanceiro: '#92400E',
});
export const FONTES_EXPORTACAO = Object.freeze({ pdf: Object.freeze({ regular: fonteUrl, negrito: fonteNegritoUrl }), planilha: 'Calibri', alternativasPlanilha: 'Arial, sans-serif' });
