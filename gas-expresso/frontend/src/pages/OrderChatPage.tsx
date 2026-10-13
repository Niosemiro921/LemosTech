import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { extractMessage, getCurrentUser } from '../services/auth';
import {
  fetchOrderChat,
  markOrderChatRead,
  sendOrderChatMessage,
  type CallSessionInfo,
  type ChatMessage,
} from '../services/chat';
import { openOrderRealtime } from '../services/realtime';
import { InAppVoiceCallModal } from '../components/InAppVoiceCallModal';

const CUSTOMER_QUICK_REPLIES = [
  '👋 Olá! Já estou a aguardar na morada.',
  '📍 Ponto de referência: portão azul junto à padaria.',
  '🔔 Pode tocar a campainha quando chegar.',
  '💵 Preciso de troco para dinheiro vivo.',
  '🛡️ /bot Dicas de segurança na instalação do gás',
];

const DRIVER_QUICK_REPLIES = [
  '🚚 Olá! Já estou a caminho do seu endereço.',
  '📍 Cheguei ao local da entrega!',
  '🚪 Pode confirmar o número da porta / andar?',
  '🛡️ Trago esponja e sabão para testar a vedação da botija.',
  '✅ Entrega concluída com segurança. Obrigado!',
];

export default function OrderChatPage() {
  const { orderId } = useParams();
  const user = getCurrentUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [driverPhone, setDriverPhone] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);

  // Voice Call state
  const [showCallModal, setShowCallModal] = useState(false);
  const [isInitiator, setIsInitiator] = useState(false);
  const [incomingCall, setIncomingCall] = useState<CallSessionInfo | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isCustomer = user?.role === 'CUSTOMER';
  const otherPartyLabel = isCustomer ? 'Entregador' : 'Cliente';
  const otherPartyPhone = isCustomer ? driverPhone : customerPhone;

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await fetchOrderChat(orderId);
      setMessages(data.messages);
      setDriverPhone(data.driverPhone ?? null);
      setCustomerPhone(data.customerPhone ?? null);
      if (data.activeCall && data.activeCall.receiverId === user?.id && data.activeCall.status === 'OFFERING') {
        setIncomingCall(data.activeCall);
        setShowCallModal(true);
      }
      await markOrderChatRead(orderId).catch(() => undefined);
      setError('');
    } catch (e) {
      setError(extractMessage(e, 'Não foi possível carregar a conversa.'));
    } finally {
      setLoading(false);
    }
  }, [orderId, user?.id]);

  useEffect(() => {
    void load();
    if (!orderId) return;

    const close = openOrderRealtime(orderId, {
      onChatMessage: (raw) => {
        const msg = raw as ChatMessage;
        setMessages((current) =>
          current.some((item) => item.id === msg.id) ? current : [...current, msg],
        );
        if (msg.senderId !== user?.id) {
          void markOrderChatRead(orderId).catch(() => undefined);
        }
      },
      onCallOffer: (raw) => {
        const payload = raw as CallSessionInfo;
        if (payload.receiverId === user?.id) {
          setIncomingCall(payload);
          setIsInitiator(false);
          setShowCallModal(true);
        }
      },
      onCallEnded: () => {
        setShowCallModal(false);
        setIncomingCall(null);
      },
      onState: setConnection,
    });

    return close;
  }, [load, orderId, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !orderId) return;
    try {
      const msg = await sendOrderChatMessage(orderId, trimmed);
      setMessages((current) =>
        current.some((item) => item.id === msg.id) ? current : [...current, msg],
      );
      setInput('');
    } catch (e) {
      setError(extractMessage(e, 'Não foi possível enviar a mensagem.'));
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const startVoiceCall = () => {
    setIsInitiator(true);
    setIncomingCall(null);
    setShowCallModal(true);
  };

  const quickReplies = isCustomer ? CUSTOMER_QUICK_REPLIES : DRIVER_QUICK_REPLIES;

  return (
    <div className="page chat-page">
      <div className="chat-shell">
        <header className="chat-header">
          <div>
            <Link
              className="back-link"
              to={
                user?.role === 'CUSTOMER'
                  ? '/rastrear'
                  : user?.role === 'SUPPLIER'
                    ? '/fornecedor'
                    : user?.role === 'PRESTADOR'
                      ? '/prestador'
                      : '/driver'
              }
            >
              ← Voltar ao pedido
            </Link>
            <span className="section-kicker">Comunicação direta · Pedido</span>
            <h1>Fale com o {otherPartyLabel.toLowerCase()}</h1>
            <p>Combine pontos de encontro, referências de entrega e confirme detalhes de troco.</p>
          </div>
          <div className="chat-header-actions">
            <button
              type="button"
              className="primary-btn call-trigger-btn"
              onClick={startVoiceCall}
              title="Chamada de voz gratuita via internet"
            >
              📞 Chamada Grátis
            </button>
            <span className={`chat-connection ${connection}`}>
              {connection === 'connected'
                ? '● Realtime ativo'
                : connection === 'error'
                  ? '● Realtime indisponível'
                  : '● A sincronizar'}
            </span>
          </div>
        </header>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <section className="chat-panel">
          <div className="chat-notice">
            🛡️ <strong>Gás Expresso Seguro:</strong> Chamadas de voz e mensagens são encriptadas. Nunca partilhe códigos bancários ou senhas.
          </div>

          <div className="chat-messages">
            {loading ? (
              <div className="loading-panel">A carregar conversa…</div>
            ) : messages.length ? (
              messages.map((msg) => {
                const isOwn = msg.senderId === user?.id;
                const isBot = msg.isBot || msg.message.startsWith('🤖') || msg.message.startsWith('🛡️');
                return (
                  <div key={msg.id} className={`chat-message ${isOwn ? 'own' : ''} ${isBot ? 'bot-message' : ''}`}>
                    <div className="chat-bubble">
                      <small>
                        {isBot ? '🤖 Assistente Gás Expresso' : isOwn ? 'Você' : otherPartyLabel}
                      </small>
                      <p>{msg.message}</p>
                      <time>
                        {new Date(msg.createdAt).toLocaleTimeString('pt-AO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state compact">
                <h3>Sem mensagens ainda</h3>
                <p>Envie uma mensagem ou use uma resposta rápida abaixo para combinar a entrega.</p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="chat-quick-replies" aria-label="Respostas rápidas">
            <span className="quick-reply-label">Sugestões rápidas:</span>
            <div className="quick-reply-chips">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  className="quick-reply-chip"
                  onClick={() => void sendMessage(reply)}
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>

          <form className="chat-compose" onSubmit={submit}>
            <input
              className="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Escreva ao ${otherPartyLabel.toLowerCase()} ou digite /bot para ajuda…`}
              maxLength={1000}
            />
            <button className="primary-btn" disabled={!input.trim()}>
              Enviar <span>→</span>
            </button>
          </form>
        </section>
      </div>

      {showCallModal && orderId && user && (
        <InAppVoiceCallModal
          orderId={orderId}
          currentUserId={user.id}
          otherPartyName={otherPartyLabel}
          otherPartyPhone={otherPartyPhone}
          incomingCall={incomingCall}
          isInitiator={isInitiator}
          onClose={() => {
            setShowCallModal(false);
            setIncomingCall(null);
          }}
        />
      )}
    </div>
  );
}
