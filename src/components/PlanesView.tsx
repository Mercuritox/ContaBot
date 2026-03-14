import { useState, useEffect } from "react";
import { Check, Zap, Crown, Loader2, Star, ArrowLeft } from "lucide-react";

interface PlanesViewProps {
  userId: string;
  onBack?: () => void;
}

const PRICE_ID_MENSUAL = import.meta.env.VITE_PRICE_ID_MENSUAL || "";
const PRICE_ID_ANUAL = import.meta.env.VITE_PRICE_ID_ANUAL || "";

const beneficiosPremium = [
  "Análisis inteligente con IA — resúmenes y recomendaciones personalizadas",
  "Fotos de tickets ilimitadas",
  "Movimientos por audio ilimitados",
  "Gráficas precisas",
  "Metas dinámicas",
  "Registros ilimitados",
  "Exportación de datos en PDF y Excel",
  "Sin anuncios",
  "Acceso anticipado a nuevas funciones",
  "Soporte prioritario por WhatsApp / Email",
];

const beneficiosFree = [
  "Registros ilimitados",
  "Gráficas precisas",
  "Metas dinámicas",
  "5 fotos de tickets por mes",
  "5 usos de audio por mes",
  "Soporte por email",
];

export default function PlanesView({ userId, onBack }: PlanesViewProps) {
  const [billingPeriod, setBillingPeriod] = useState<"mensual" | "anual">("anual");
  const [isPremium, setIsPremium] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await fetch(`/api/user/subscription/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setIsPremium(data.isPremium);
          setPremiumUntil(data.premiumUntil);
        }
      } catch (e) {
        console.error("Error fetching subscription:", e);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchSubscription();
    else setLoading(false);
  }, [userId]);

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          planType: billingPeriod, // "mensual" o "anual"
          userId 
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "No se pudo crear la sesión de pago");
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL de pago no recibida");
      }
    } catch (e: any) {
      setError(e.message || "Error al procesar el pago");
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950 px-4 pt-6 pb-2 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all text-gray-500">
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Planes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Elige el plan que mejor se adapte a ti</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10 pt-4 flex flex-col gap-5 max-w-lg mx-auto w-full">

        {isPremium && (
          <div className="flex flex-col gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl">
                <Crown size={20} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-emerald-700 dark:text-emerald-400">¡Ya eres Premium! 🎉</p>
                {premiumUntil && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-500">
                    Activo hasta: {new Date(premiumUntil).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>
            <button 
              onClick={() => {
                setLoading(true);
                fetch(`/api/user/subscription/${userId}`)
                  .then(r => r.json())
                  .then(data => {
                    setIsPremium(data.isPremium);
                    setPremiumUntil(data.premiumUntil);
                    setLoading(false);
                  });
              }}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline text-left ml-12"
            >
              ¿Acabas de pagar? Haz clic aquí para actualizar
            </button>
          </div>
        )}

        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
          <button
            onClick={() => setBillingPeriod("mensual")}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${billingPeriod === "mensual" ? "bg-white dark:bg-gray-700 shadow-sm text-emerald-600 dark:text-emerald-400" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
          >
            Mensual
          </button>
          <button
            onClick={() => setBillingPeriod("anual")}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${billingPeriod === "anual" ? "bg-white dark:bg-gray-700 shadow-sm text-emerald-600 dark:text-emerald-400" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
          >
            Anual
          </button>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl"><Zap size={20} className="text-gray-500" /></div>
            <div>
              <h2 className="font-black text-gray-900 dark:text-white text-lg">Gratis</h2>
              <p className="text-xs text-gray-400">Para empezar a organizarte</p>
            </div>
            <div className="ml-auto text-right">
              <span className="text-2xl font-black text-gray-900 dark:text-white">$0</span>
              <span className="text-sm text-gray-400"> /mes</span>
            </div>
          </div>
          <ul className="flex flex-col gap-2.5">
            {beneficiosFree.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                <div className="w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <Check size={10} className="text-gray-500" />
                </div>
                {b}
              </li>
            ))}
          </ul>
          {!isPremium && (
            <div className="mt-5 flex flex-col gap-3">
              <div className="w-full py-3 rounded-full border-2 border-gray-200 dark:border-gray-700 text-center text-sm font-bold text-gray-400">
                Plan actual
              </div>
              <button 
                onClick={() => {
                  setLoading(true);
                  fetch(`/api/user/subscription/${userId}`)
                    .then(r => r.json())
                    .then(data => {
                      setIsPremium(data.isPremium);
                      setPremiumUntil(data.premiumUntil);
                      setLoading(false);
                    });
                }}
                className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:underline text-center"
              >
                ¿Ya pagaste? Haz clic aquí para verificar tu estado
              </button>
            </div>
          )}
        </div>

        <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[1.5rem] p-6 pt-12 shadow-xl shadow-emerald-500/20 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="absolute top-0 left-0 bg-white/20 backdrop-blur-sm text-white text-xs font-black px-4 py-2 rounded-br-2xl flex items-center gap-1 z-10">
            <Star size={10} fill="white" /> Popular
          </div>
          <div className="flex items-center gap-3 mb-5 relative">
            <div className="p-2.5 bg-white/20 rounded-xl"><Crown size={20} className="text-white" /></div>
            <div>
              <h2 className="font-black text-white text-lg">ContaBot Pro</h2>
              <p className="text-xs text-emerald-100">Todo incluido</p>
            </div>
            <div className="ml-auto text-right relative">
              {billingPeriod === "anual" ? (
                <>
                  <div className="flex items-end gap-1 justify-end">
                    <span className="text-2xl font-black text-white">$59</span>
                    <span className="text-sm text-emerald-100 mb-0.5">/mes</span>
                  </div>
                  <p className="text-xs text-emerald-100">$708/año</p>
                </>
              ) : (
                <div className="flex items-end gap-1 justify-end">
                  <span className="text-2xl font-black text-white">$79</span>
                  <span className="text-sm text-emerald-100 mb-0.5">/mes</span>
                </div>
              )}
            </div>
          </div>
          <ul className="flex flex-col gap-2.5 relative mb-6">
            {beneficiosPremium.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-sm text-white">
                <div className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0">
                  <Check size={10} className="text-white" strokeWidth={3} />
                </div>
                {b}
              </li>
            ))}
          </ul>
          {error && (
            <div className="mb-3 p-3 bg-red-500/20 border border-red-400/30 rounded-xl text-white text-xs font-medium">
              ⚠️ {error}
            </div>
          )}
          {isPremium ? (
            <div className="relative w-full py-3.5 rounded-full bg-white/20 text-center text-white font-black text-sm">
              ✅ Plan activo
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={checkoutLoading}
              className="relative w-full py-3.5 rounded-full bg-white text-emerald-600 font-black text-sm shadow-lg active:scale-[0.98] transition-all hover:shadow-xl disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {checkoutLoading ? (
                <><Loader2 size={16} className="animate-spin" />Procesando...</>
              ) : (
                <><Crown size={16} />{billingPeriod === "mensual" ? "Suscribirme por $79/mes" : "Suscribirme por $59/mes"}</>
              )}
            </button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 pb-2">
          🔒 Pago seguro procesado por Stripe. Cancela cuando quieras.
        </p>
      </div>
    </div>
  );
}
