import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, X, Loader2, Volume2 } from 'lucide-react';

interface LiveVoiceChatProps {
  onClose: () => void;
  apiKey: string;
  onPrepareTransaction?: (text: string) => void;
}

export const LiveVoiceChat: React.FC<LiveVoiceChatProps> = ({ onClose, apiKey, onPrepareTransaction }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  useEffect(() => {
    startLiveSession();
    return () => {
      stopLiveSession();
    };
  }, []);

  const startLiveSession = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const ai = new GoogleGenAI({ apiKey });
      
      // Initialize Audio Context for playback (24kHz is standard for Gemini Live)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass({ sampleRate: 24000 });
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioContextRef.current = audioCtx;
      nextPlayTimeRef.current = audioCtx.currentTime;

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: async () => {
            setIsConnecting(false);
            setIsActive(true);
            await startAudioCapture(sessionPromise);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle tool calls
            const toolCall = message.toolCall?.functionCalls?.[0];
            if (toolCall && toolCall.name === 'prepareTransaction') {
              const description = (toolCall.args as any)?.description as string;
              if (description && onPrepareTransaction) {
                onPrepareTransaction(description);
                // Send response back to the model
                sessionPromise.then((session) => {
                  session.sendToolResponse({
                    functionResponses: [{
                      id: toolCall.id,
                      name: toolCall.name,
                      response: { result: "Transacción preparada. El usuario la está revisando en pantalla." }
                    }]
                  });
                });
              }
            }

            // Handle incoming audio
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  playAudioChunk(part.inlineData.data);
                }
              }
            }
            
            // Handle interruption
            if (message.serverContent?.interrupted) {
              if (audioContextRef.current) {
                // Clear queued audio by suspending and resuming or resetting play time
                nextPlayTimeRef.current = audioContextRef.current.currentTime;
              }
            }

            // Handle transcription (optional, if enabled in config)
            // Note: Gemini Live API might not always return transcription natively unless configured,
            // but we can check if there's text.
            const textPart = message.serverContent?.modelTurn?.parts[0]?.text;
            if (textPart) {
              setTranscript(prev => prev + textPart);
            }
          },
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            setError("Error de conexión con el asistente de voz.");
            setIsConnecting(false);
            setIsActive(false);
          },
          onclose: () => {
            setIsActive(false);
            setIsConnecting(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{
            functionDeclarations: [{
              name: "prepareTransaction",
              description: "Prepara un movimiento financiero (gasto, ingreso, transferencia, etc.) basado en la descripción del usuario. Úsalo cuando el usuario te pida registrar algo.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  description: {
                    type: Type.STRING,
                    description: "La descripción completa del movimiento que el usuario quiere registrar. Ej: 'Compré un café por 50 pesos con la tarjeta de crédito'"
                  }
                },
                required: ["description"]
              }
            }]
          }],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "Eres ContaBot, un asistente financiero personal amigable. Responde siempre en español, con tono cercano y humano. Sé conciso en tus respuestas habladas.",
        },
      });

      sessionRef.current = sessionPromise;

    } catch (err) {
      console.error("Failed to start live session:", err);
      setError("No se pudo iniciar la conversación de voz.");
      setIsConnecting(false);
    }
  };

  const startAudioCapture = async (sessionPromise: Promise<any>) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // We need 16kHz for Gemini input
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputAudioCtx = new AudioContextClass({ sampleRate: 16000 });
      if (inputAudioCtx.state === 'suspended') {
        await inputAudioCtx.resume();
      }
      
      const source = inputAudioCtx.createMediaStreamSource(stream);
      const processor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(inputAudioCtx.destination);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        const buffer = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < buffer.byteLength; i++) {
          binary += String.fromCharCode(buffer[i]);
        }
        const base64 = btoa(binary);
        
        sessionPromise.then((session) => {
          session.sendRealtimeInput({
            audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
          });
        }).catch(err => console.error(err));
      };
    } catch (err) {
      console.error("Microphone access denied:", err);
      setError("No se pudo acceder al micrófono.");
    }
  };

  const playAudioChunk = (base64Data: string) => {
    const audioCtx = audioContextRef.current;
    if (!audioCtx) return;

    try {
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }
      
      const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);
      
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      
      const currentTime = audioCtx.currentTime;
      if (nextPlayTimeRef.current < currentTime) {
        nextPlayTimeRef.current = currentTime;
      }
      
      source.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += audioBuffer.duration;
    } catch (err) {
      console.error("Error playing audio chunk:", err);
    }
  };

  const stopLiveSession = () => {
    setIsActive(false);
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close()).catch(() => {});
      sessionRef.current = null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mb-8 mt-4 relative">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" style={{ animationDuration: '3s', display: isActive ? 'block' : 'none' }}></div>
          <div className="absolute inset-[-20px] bg-emerald-500/10 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s', display: isActive ? 'block' : 'none' }}></div>
          <div className={`w-24 h-24 rounded-full flex items-center justify-center relative z-10 transition-colors duration-500 ${isActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40' : isConnecting ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'}`}>
            {isConnecting ? (
              <Loader2 size={40} className="animate-spin" />
            ) : isActive ? (
              <Volume2 size={40} className="animate-pulse" />
            ) : (
              <MicOff size={40} />
            )}
          </div>
        </div>

        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
          {isConnecting ? 'Conectando...' : isActive ? 'ContaBot te escucha' : 'Conversación finalizada'}
        </h3>
        
        <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-8">
          {isConnecting 
            ? 'Preparando conexión de voz en tiempo real...' 
            : isActive 
              ? 'Habla naturalmente. ContaBot te responderá con voz.' 
              : error || 'La conexión se ha cerrado.'}
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-xl transition-colors"
        >
          Finalizar
        </button>
      </motion.div>
    </div>
  );
};
