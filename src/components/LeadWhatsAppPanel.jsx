import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, RefreshCw } from 'lucide-react';
import { fetchCommercialLeadWhatsAppHistory } from '../api/evolution.js';
import { AppLoadingPanel } from './crud/AppLoading.jsx';
import { WhatsAppMessageBody } from './WhatsAppMessageBody.jsx';
import { WhatsAppMessageMedia } from './WhatsAppMessageMedia.jsx';
import { isReactionPlaceholderBody } from '../utils/whatsappContactDisplay.js';
import { formatBrazilMessageTime } from '../utils/brazilDateTime.js';

export function LeadWhatsAppPanel({ lead }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    if (!lead?.id) return;
    setLoading(true);
    setError('');
    try {
      const row = await fetchCommercialLeadWhatsAppHistory(lead.id, { limit: 200 });
      setData(row ?? null);
    } catch (err) {
      setError(err.message || 'Não foi possível carregar o WhatsApp.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [lead?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const primaryThread = data?.threads?.[0];

  return (
    <aside className="commercial-lead-whatsapp-panel" aria-label="Conversas WhatsApp do lead">
      <div className="commercial-lead-panel-head">
        <h3>WhatsApp</h3>
        <button type="button" className="btn-ghost btn-ghost--sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} aria-hidden />
          Atualizar
        </button>
      </div>

      {loading ? <AppLoadingPanel label="Carregando conversas…" /> : null}

      {!loading && error ? <p className="form-error">{error}</p> : null}

      {!loading && !error && data && !data.hasPhone ? (
        <p className="field-hint">
          Cadastre um telefone (WhatsApp) no lead para localizar o histórico de conversas.
        </p>
      ) : null}

      {!loading && !error && data?.hasPhone ? (
        <>
          {data.phones?.length ? (
            <p className="field-hint">Números vinculados: {data.phones.join(' · ')}</p>
          ) : null}

          {primaryThread ? (
            <Link to="/m/comercial/whatsapp" className="commercial-lead-whatsapp-inbox-link">
              <MessageCircle size={16} aria-hidden />
              Abrir no inbox ({primaryThread.instanceName})
            </Link>
          ) : null}

          {!data.messages?.length ? (
            <p className="field-hint">Nenhuma mensagem encontrada para estes números ainda.</p>
          ) : (
            <ol className="commercial-lead-whatsapp-timeline">
              {data.messages.map((msg) => {
                if (!msg?.id) return null;
                if (msg.mediaKind === 'reaction' || isReactionPlaceholderBody(msg.body)) return null;
                const outgoing = msg.direction === 'out';
                return (
                  <li
                    key={msg.id}
                    className={`commercial-lead-whatsapp-bubble${outgoing ? ' commercial-lead-whatsapp-bubble--out' : ''}`}
                  >
                    <time dateTime={msg.messageAt}>{formatBrazilMessageTime(msg.messageAt)}</time>
                    <WhatsAppMessageBody body={msg.body} />
                    <WhatsAppMessageMedia message={msg} />
                  </li>
                );
              })}
            </ol>
          )}
        </>
      ) : null}
    </aside>
  );
}
