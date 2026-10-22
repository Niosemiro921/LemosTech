import { useEffect, useRef, useState } from 'react';
import {
  answerCallOffer,
  endActiveCall,
  initiateCallOffer,
  sendCallIceCandidate,
  type CallSessionInfo,
} from '../services/chat';

interface Props {
  orderId: string;
  currentUserId: string;
  otherPartyName: string;
  otherPartyPhone?: string | null;
  incomingCall?: CallSessionInfo | null;
  isInitiator?: boolean;
  onClose: () => void;
}

// Ringtone generator using Web Audio API — no external assets needed
function useRingtone(shouldRing: boolean) {
  const audioCtxRef = useRef<OscillatorNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ctxRef = useRef<HTMLAudioContext | null>(null);

  useEffect(() => {
    if (!shouldRing) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (audioCtxRef.current) { try { audioCtxRef.current.stop(); } catch {} audioCtxRef.current = null; }
      if (ctxRef.current) { ctxRef.current.close().catch(() => undefined); ctxRef.current = null; }
      return;
    }

    const playRing = () => {
      try {
        if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const ctx = ctxRef.current;
        if (ctx.state === 'suspended') void ctx.resume();

        // Classic telephone ring: two beeps then pause
        const scheduleBeep = (offset: number, freq: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0, ctx.currentTime + offset);
          gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + offset + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.4);
          osc.start(ctx.currentTime + offset);
          osc.stop(ctx.currentTime + offset + 0.42);
        };

        scheduleBeep(0, 440);     // beep 1
        scheduleBeep(0.5, 440);   // beep 2
        // pause ~1s, then repeat
        intervalRef.current = setTimeout(() => {
          audioCtxRef.current = null;
          playRing();
        }, 1400);
      } catch {
        // audio not supported — silent fallback
      }
    };

    playRing();
    return () => {
      if (intervalRef.current) { clearTimeout(intervalRef.current); intervalRef.current = null; }
      if (audioCtxRef.current) { try { audioCtxRef.current.stop(); } catch {} audioCtxRef.current = null; }
      if (ctxRef.current) { ctxRef.current.close().catch(() => undefined); ctxRef.current = null; }
    };
  }, [shouldRing]);
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function InAppVoiceCallModal({
  orderId,
  currentUserId: _currentUserId,
  otherPartyName,
  otherPartyPhone,
  incomingCall,
  isInitiator = false,
  onClose,
}: Props) {
  const [callState, setCallState] = useState<'CALLING' | 'RINGING' | 'CONNECTED' | 'ENDED' | 'ERROR'>(
    incomingCall ? 'RINGING' : isInitiator ? 'CALLING' : 'RINGING',
  );
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Ringtone: play when CALLING (waiting for callee) or RINGING (incoming call)
  useRingtone(callState === 'CALLING' || callState === 'RINGING');

  // Call duration counter
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (callState === 'CONNECTED') {
      timer = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState]);

  // Clean up streams and connection
  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  };

  // Setup Peer Connection
  const setupPeerConnection = async () => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    } catch {
      setCallState('ERROR');
      setErrorMessage('Permissão de microfone negada. Pode ligar diretamente pelo número móvel.');
      return null;
    }

    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch(() => undefined);
      }
      setCallState('CONNECTED');
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        void sendCallIceCandidate(orderId, event.candidate.toJSON()).catch(() => undefined);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setCallState('CONNECTED');
      } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        // Fallback or reconnecting
      }
    };

    return pc;
  };

  // Start outgoing call
  useEffect(() => {
    if (isInitiator) {
      let active = true;
      (async () => {
        const pc = await setupPeerConnection();
        if (!pc || !active) return;

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await initiateCallOffer(orderId, JSON.stringify(offer));
        } catch (err: unknown) {
          if (!active) return;
          setCallState('ERROR');
          setErrorMessage(err instanceof Error ? err.message : 'Não foi possível iniciar a chamada.');
        }
      })();

      return () => {
        active = false;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitiator, orderId]);

  const handleAcceptIncoming = async () => {
    if (!incomingCall?.sdpOffer) return;
    const pc = await setupPeerConnection();
    if (!pc) return;

    try {
      const offerDesc = JSON.parse(incomingCall.sdpOffer) as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(new RTCSessionDescription(offerDesc));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await answerCallOffer(orderId, JSON.stringify(answer));
      setCallState('CONNECTED');
    } catch (err: unknown) {
      setCallState('ERROR');
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao atender a chamada.');
    }
  };

  const handleHangup = async () => {
    cleanup();
    setCallState('ENDED');
    await endActiveCall(orderId, 'Chamada finalizada pelo utilizador.').catch(() => undefined);
    setTimeout(onClose, 800);
  };

  const handleToggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMuted(!audioTrack.enabled);
      }
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="call-modal-backdrop">
      <div className="call-modal-card">
        <audio ref={remoteAudioRef} autoPlay playsInline />
        <div className="call-avatar-circle">
          <span className="call-avatar-icon">👤</span>
          {callState === 'CONNECTED' && <div className="call-pulse-wave" />}
        </div>

        <div className="call-info">
          <h2>{otherPartyName}</h2>
          <span className="call-badge-free">Chamada Gratuita In-App</span>
          <p className="call-status-label">
            {callState === 'CALLING' && 'A chamar…'}
            {callState === 'RINGING' && 'A receber chamada…'}
            {callState === 'CONNECTED' && `Em chamada · ${formatDuration(duration)}`}
            {callState === 'ENDED' && 'Chamada terminada'}
            {callState === 'ERROR' && 'Ligação não estabelecida'}
          </p>
        </div>

        {errorMessage && <div className="call-error-box">{errorMessage}</div>}

        <div className="call-actions-row">
          {callState === 'RINGING' && (
            <>
              <button
                type="button"
                className="call-btn-reject"
                onClick={handleHangup}
                aria-label="Recusar chamada"
              >
                ✕ Recusar
              </button>
              <button
                type="button"
                className="call-btn-accept"
                onClick={() => void handleAcceptIncoming()}
                aria-label="Atender chamada"
              >
                📞 Atender
              </button>
            </>
          )}

          {(callState === 'CALLING' || callState === 'CONNECTED') && (
            <>
              <button
                type="button"
                className={`call-btn-circle ${muted ? 'active' : ''}`}
                onClick={handleToggleMute}
                aria-label={muted ? 'Ativar microfone' : 'Silenciar microfone'}
              >
                {muted ? '🔇' : '🎙️'}
              </button>
              <button
                type="button"
                className="call-btn-hangup"
                onClick={() => void handleHangup()}
                aria-label="Terminar chamada"
              >
                ☎️ Terminar
              </button>
            </>
          )}

          {(callState === 'ENDED' || callState === 'ERROR') && (
            <div className="call-ended-actions">
              {otherPartyPhone && (
                <a href={`tel:${otherPartyPhone}`} className="primary-btn call-fallback-link">
                  Ligar pelo Telemóvel ({otherPartyPhone})
                </a>
              )}
              <button type="button" className="secondary-btn" onClick={onClose}>
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
