import { useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// Hook: useRileyVoice
// voiceProvider: 'off' | 'kokoro' | 'browser'
export function useRileyVoice(voiceProvider) {
  const audioRef = useRef(null);
  const playingRef = useRef(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    playingRef.current = null;
  }, []);

  const speak = useCallback(async (text, onStart, onEnd) => {
    if (!text || voiceProvider === 'off') return;
    stop();

    const cleanText = text.replace(/[#*`>~]/g, '').replace(/\[.*?\]\(.*?\)/g, '').trim().slice(0, 2000);

    if (voiceProvider === 'browser') {
      if (!window.speechSynthesis) return;
      const utt = new SpeechSynthesisUtterance(cleanText);
      utt.rate = 1.0;
      utt.pitch = 0.9;
      utt.onstart = onStart;
      utt.onend = onEnd;
      utt.onerror = onEnd;
      onStart?.();
      window.speechSynthesis.speak(utt);
      return;
    }

    if (voiceProvider === 'kokoro') {
      onStart?.();
      try {
        // Use fetch directly so we can handle binary audio response
        const res = await fetch(`/api/functions/rileySpeak`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanText, provider: 'kokoro' }),
          credentials: 'include',
        });

        const contentType = res.headers.get('content-type') || '';

        if (contentType.includes('json')) {
          const json = await res.json();
          if (json.use_browser_tts) {
            // Fallback to browser TTS
            if (!window.speechSynthesis) { onEnd?.(); return; }
            const utt = new SpeechSynthesisUtterance(cleanText);
            utt.rate = 1.0; utt.pitch = 0.9;
            utt.onend = onEnd; utt.onerror = onEnd;
            window.speechSynthesis.speak(utt);
            return;
          }
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => { URL.revokeObjectURL(url); onEnd?.(); };
        audio.onerror = () => { URL.revokeObjectURL(url); onEnd?.(); };
        await audio.play();
      } catch {
        onEnd?.();
      }
    }
  }, [voiceProvider, stop]);

  return { speak, stop, isPlaying: () => !!playingRef.current };
}

// SoundWave animation component
export function SoundWave({ active }) {
  if (!active) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, height: 14, marginLeft: 6 }}>
      {[1, 2, 3, 4].map(i => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: 2,
            background: '#C9A84C',
            borderRadius: 2,
            animation: `soundwave 0.8s ${i * 0.1}s ease-in-out infinite alternate`,
            height: `${4 + i * 2}px`,
          }}
        />
      ))}
      <style>{`
        @keyframes soundwave {
          from { transform: scaleY(0.4); opacity: 0.5; }
          to { transform: scaleY(1.4); opacity: 1; }
        }
      `}</style>
    </span>
  );
}