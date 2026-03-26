import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Calendar,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mic, 
  Camera, 
  Send, 
  Plus, 
  History, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Check, 
  Crown,
  Search,
  X,
  Loader2,
  AlertCircle,
  FileText,
  CreditCard,
  Banknote,
  PieChart as PieChartIcon,
  Settings as SettingsIcon,
  Home as HomeIcon,
  Moon,
  Sun,
  LogOut,
  User as UserIcon,
  Pencil,
  Save,
  Mail,
  Phone,
  Lock,
  Shield,
  ShieldAlert,
  Upload,
  Trash2,
  Image as ImageIcon,
  Maximize,
  Link as LinkIcon,
  Link2,
  Unplug,
  PiggyBank,
  Target,
  Trophy,
  Sparkles,
  Clock,
  RefreshCw,
  Download,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { GoogleGenAI } from '@google/genai';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, PixelCrop } from 'react-image-crop';
import { 
  auth, 
  db, 
  googleProvider
} from './firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithPopup,
  updateProfile,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  orderBy, 
  limit,
  setDoc,
  getDoc,
  onSnapshot,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { processMultimodalInput, GeminiContext, safeJsonStringify } from './services/geminiService';
import PlanesView from './components/PlanesView';
import { GeminiResponse, Event, Goal } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

const APP_LOGO = `data:image/svg+xml;base64,${btoa(`
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="512" height="512" rx="100" fill="#009966"/>
<path d="M391.131 161.869C355.656 126.394 308.438 106.667 256 106.667C150.144 106.667 64 192.811 64 298.667C64 404.523 150.144 490.667 256 490.667C308.438 490.667 355.656 470.94 391.131 435.465L330.869 375.203C311.931 394.141 285.438 405.333 256 405.333C197.094 405.333 149.333 357.572 149.333 298.667C149.333 239.761 197.094 192 256 192C285.438 192 311.931 203.192 330.869 222.131L391.131 161.869Z" fill="white"/>
<circle cx="213.333" cy="298.667" r="42.6667" fill="white"/>
<circle cx="341.333" cy="298.667" r="42.6667" fill="white"/>
<circle cx="426.667" cy="85.3333" r="42.6667" fill="white"/>
<path d="M341.333 170.667L426.667 85.3333" stroke="white" stroke-width="21.3333"/>
</svg>
`)}`;

const APP_LOGO_TRANSPARENT = `data:image/svg+xml;base64,${btoa(`
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M391.131 161.869C355.656 126.394 308.438 106.667 256 106.667C150.144 106.667 64 192.811 64 298.667C64 404.523 150.144 490.667 256 490.667C308.438 490.667 355.656 470.94 391.131 435.465L330.869 375.203C311.931 394.141 285.438 405.333 256 405.333C197.094 405.333 149.333 357.572 149.333 298.667C149.333 239.761 197.094 192 256 192C285.438 192 311.931 203.192 330.869 222.131L391.131 161.869Z" fill="white"/>
<circle cx="213.333" cy="298.667" r="42.6667" fill="white"/>
<circle cx="341.333" cy="298.667" r="42.6667" fill="white"/>
<circle cx="426.667" cy="85.3333" r="42.6667" fill="white"/>
<path d="M341.333 170.667L426.667 85.3333" stroke="white" stroke-width="21.3333"/>
</svg>
`)}`;

type View = 'home' | 'analytics' | 'settings' | 'auth' | 'goals' | 'planes';

const COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', 
  '#06b6d4', '#f97316', '#a855f7', '#14b8a6', '#6366f1', '#fbbf24'
];

const getEntityColor = (name: string, type: 'account' | 'category' | 'debt') => {
  const normalized = name.toLowerCase();
  
  if (type === 'account' || type === 'debt') {
    if (normalized.includes('bbva')) return '#004481'; // Azul marino
    if (normalized.includes('citibanamex') || normalized.includes('banamex')) return '#00A9E0'; // Azul celeste
    if (normalized.includes('santander')) return '#EC0000'; // Rojo intenso
    if (normalized.includes('banorte')) return '#B00030'; // Guinda
    if (normalized.includes('azteca')) return '#007A33'; // Verde bandera
    if (normalized.includes('hey') || normalized.includes('heybanco')) return '#C8B400'; // Amarillo dorado oscuro
    if (normalized.includes('hsbc')) return '#2C3E50'; // Negro azulado elegante
    if (normalized.includes('coppel') || normalized.includes('bancoppel')) return '#0047BB'; // Azul cobalto
    if (normalized.includes('uala') || normalized.includes('ualá')) return '#00B4B4'; // Cian oscurecido
    if (normalized.includes('dinn') || normalized.includes('actinver')) return '#FF7F50'; // Coral
    if (normalized.includes('nu')) return '#820AD1'; // Morado
    if (normalized.includes('stori')) return '#00897B'; // Turquesa oscurecido
    if (normalized.includes('finsus')) return '#E65100'; // Naranja quemado
    if (normalized.includes('klar')) return '#C2185B'; // Magenta oscurecido elegante
    if (normalized.includes('kubo')) return '#2E7D32'; // Verde oscuro sólido
    if (normalized.includes('mercado') || normalized.includes('mercadopago')) return '#FFCC00'; // Amarillo cromo
    if (normalized.includes('didi')) return '#FF5500'; // Naranja brillante
    if (normalized.includes('paypal')) return '#0070BA'; // Azul eléctrico
    if (normalized.includes('revolut')) return '#8B8FA8'; // Gris plateado sofisticado
    if (normalized.includes('openbank')) return '#36454F'; // Gris carbón
    if (normalized.includes('efectivo') || normalized.includes('cash')) return '#10b981'; // Green for Cash
    if (normalized.includes('amazon')) return '#ff9900'; // Orange for Amazon
  }
  
  if (type === 'category') {
    if (normalized.includes('comida') || normalized.includes('restaurante') || normalized.includes('alimento')) return '#ef4444'; // Red for Food
    if (normalized.includes('transporte') || normalized.includes('uber') || normalized.includes('didi') || normalized.includes('gasolina')) return '#3b82f6'; // Blue for Transport
    if (normalized.includes('hogar') || normalized.includes('renta')) return '#f59e0b'; // Amber for Home
    if (normalized.includes('salud') || normalized.includes('farmacia')) return '#10b981'; // Green for Health
    if (normalized.includes('entretenimiento') || normalized.includes('ocio') || normalized.includes('cine')) return '#ec4899'; // Pink for Entertainment
    if (normalized.includes('educación') || normalized.includes('curso')) return '#6366f1'; // Indigo for Education
    if (normalized.includes('servicios') || normalized.includes('luz') || normalized.includes('agua')) return '#06b6d4'; // Cyan for Services
    if (normalized.includes('compras') || normalized.includes('ropa')) return '#f97316'; // Orange for Shopping
    if (normalized.includes('suscripción') || normalized.includes('netflix') || normalized.includes('spotify')) return '#a855f7'; // Purple for Subscriptions
    if (normalized.includes('pago de préstamos') || normalized.includes('préstamo') || normalized.includes('deuda')) return '#14b8a6'; // Teal for Debt/Loans
  }

  // Default colors based on index if no match
  if (type === 'account' || type === 'category') {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
  }

  return null;
};

async function getCroppedImg(image: HTMLImageElement, pixelCrop: PixelCrop): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return '';
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = pixelCrop.width * scaleX;
  canvas.height = pixelCrop.height * scaleY;

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }
      const fileUrl = URL.createObjectURL(blob);
      resolve(fileUrl);
    }, 'image/jpeg', 0.9);
  });
}

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className}`} />
);

const HomeSkeleton = () => (
  <div className="space-y-5">
    <SkeletonBlock className="h-36 rounded-3xl" />
    <div className="grid grid-cols-2 gap-3">
      <SkeletonBlock className="h-24 rounded-2xl" />
      <SkeletonBlock className="h-24 rounded-2xl" />
    </div>
    <div className="space-y-3">
      <SkeletonBlock className="h-4 w-32 rounded-full" />
      <SkeletonBlock className="h-16 rounded-2xl" />
      <SkeletonBlock className="h-16 rounded-2xl" />
      <SkeletonBlock className="h-16 rounded-2xl" />
    </div>
  </div>
);

export default function App() {
  const [view, setView] = useState<View>('auth');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [goalForm, setGoalForm] = useState<Partial<Goal>>({
    name: '',
    emoji: '🎯',
    color: '#10b981',
    target_amount: 0,
    current_amount: 0,
    deadline: '',
    account_name: ''
  });
  const [user, setUser] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const theme = localStorage.getItem('theme');
    return theme ? theme === 'dark' : true;
  });
  const [inputText, setInputText] = useState('');
  const [showRulesHelper, setShowRulesHelper] = useState(false);

  const FIRESTORE_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /events/{eventId} {
      allow read, update, delete: if request.auth != null && (resource == null || request.auth.uid == resource.data.user_id);
      allow create: if request.auth != null && request.resource.data.user_id == request.auth.uid;
    }
    match /goals/{goalId} {
      allow read, update, delete: if request.auth != null && (resource == null || request.auth.uid == resource.data.user_id);
      allow create: if request.auth != null && request.resource.data.user_id == request.auth.uid;
    }
  }
}`;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [proposal, setProposal] = useState<GeminiResponse | null>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [hasMoreEvents, setHasMoreEvents] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [eventsPage, setEventsPage] = useState(1);
  const EVENTS_PER_PAGE = 100;
  const [summary, setSummary] = useState<any>({ balance: 0, expenses: 0, debts: 0, loans: 0 });
  const [analytics, setAnalytics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isTogglingPush, setIsTogglingPush] = useState(false);
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string>('');
  const [isCreatingReassignCategory, setIsCreatingReassignCategory] = useState(false);
  const [newReassignCategoryName, setNewReassignCategoryName] = useState('');
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetConfirmTimer, setResetConfirmTimer] = useState(5);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiChatMessages, setAiChatMessages] = useState<Array<{role: 'user' | 'ai', text: string}>>([]);
  const [aiChatInput, setAiChatInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisGenerated, setAnalysisGenerated] = useState(false);
  const [photoUsage, setPhotoUsage] = useState(0);
  const [audioUsage, setAudioUsage] = useState(0);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);
  const [showAd, setShowAd] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [canCloseAd, setCanCloseAd] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);

  const displayAccounts = useMemo(() => {
    const userAccs: any[] = user?.accounts || [];
    const autoAccs: any[] = analytics?.detectedAccounts ? Object.values(analytics.detectedAccounts) : [];
    
    const merged = [...userAccs];
    autoAccs.forEach(auto => {
      if (!merged.find((u: any) => u.name.toLowerCase() === auto.name.toLowerCase())) {
        merged.push(auto);
      }
    });
    return merged;
  }, [user?.accounts, analytics?.detectedAccounts]);

  const displayCategories = useMemo(() => {
    const categories = new Set<string>();
    recentEvents.forEach(e => {
      if (e.category) categories.add(e.category);
    });
    return Array.from(categories).sort();
  }, [recentEvents]);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // If scrolling down and past threshold (50px), hide nav
      // If scrolling up, show nav
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsNavVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        setIsNavVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const [adTimer, setAdTimer] = useState(3);
  
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    phone: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({
    id: '',
    name: '',
    type: 'debit',
    cards: '',
    interest_rate: ''
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAppReady, setIsAppReady] = useState(false);
  const [isTakingLong, setIsTakingLong] = useState(false);
  const [hasFailedLoading, setHasFailedLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showImageGroupModal, setShowImageGroupModal] = useState(false);

  const proposalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    
    // Pre-cargar voces inmediatamente
    window.speechSynthesis.getVoices();
    
    // Re-intentar cuando cambien (necesario en iOS y Chrome)
    window.speechSynthesis.onvoiceschanged = () => {
      const voices = window.speechSynthesis.getVoices();
      const best = voices.find(v => v.name === 'Paulina') ||
                   voices.find(v => v.name.includes('Google') && v.lang.startsWith('es'));
      if (best) console.log(`✅ Mejor voz disponible: ${best.name}`);
    };

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  useEffect(() => {
    if (proposal && proposalRef.current) {
      // Small delay to ensure the element is rendered and layout is updated
      setTimeout(() => {
        proposalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [proposal]);

  const [filterType, setFilterType] = useState<'day' | 'month' | 'year' | 'all'>('month');
  const [filterDate, setFilterDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isActivityExpanded, setIsActivityExpanded] = useState(true);
  const [expandedSummary, setExpandedSummary] = useState<'income' | 'expense' | 'debt' | 'loan' | null>(null);
  const [previousActivityState, setPreviousActivityState] = useState(isActivityExpanded);
  const [highlightedEventId, setHighlightedEventId] = useState<number | null>(null);
  const [highlightSourceKind, setHighlightSourceKind] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [inputText]);

  const dateRange = useMemo(() => {
    if (filterType === 'all') return { start: '1970-01-01', end: '9999-12-31' };
    
    // Handle different formats of filterDate
    let year, month, day;
    const parts = filterDate.split('-');
    year = parseInt(parts[0]);
    month = parts[1] ? parseInt(parts[1]) - 1 : 0;
    day = parts[2] ? parseInt(parts[2]) : 1;

    const date = new Date(year, month, day);
    
    const toLocalYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (filterType === 'day') {
      const start = toLocalYMD(date);
      return { start: start, end: `${start}T23:59:59.999` };
    }
    
    if (filterType === 'month') {
      const start = toLocalYMD(new Date(year, month, 1));
      const end = toLocalYMD(new Date(year, month + 1, 0));
      return { start: start, end: `${end}T23:59:59.999` };
    }
    
    if (filterType === 'year') {
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;
      return { start: start, end: `${end}T23:59:59.999` };
    }
    
    return { start: '1970-01-01', end: '9999-12-31' };
  }, [filterType, filterDate]);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmTimer, setDeleteConfirmTimer] = useState(0);
  const [isDeletingAccount, setIsDeletingAccount] = useState<string | null>(null);
  const [deleteAccountConfirmTimer, setDeleteAccountConfirmTimer] = useState(0);
  const [isDeletingGoal, setIsDeletingGoal] = useState<string | null>(null);
  const [deleteGoalConfirmTimer, setDeleteGoalConfirmTimer] = useState(0);

  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState<string | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const receiptImgRef = useRef<HTMLImageElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastInputWasVoiceRef = useRef(false);



  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('WebSocket') || event.reason?.includes?.('WebSocket')) {
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);

    let isRedirectCheckPending = !!sessionStorage.getItem('authInProgress');
    
    // If redirect check is pending, keep loading true initially
    if (isRedirectCheckPending) {
      setIsLoading(true);
    }

    let unsubscribeFirestore: (() => void) | null = null;

    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      setIsLoading((prev) => {
        if (prev) {
          console.warn("Auth check timed out, forcing app load");
          // Always force auth view if we time out, to allow retry
          setView('auth');
          return false;
        }
        return prev;
      });
    }, 8000);

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }

      if (firebaseUser) {
        try {
          // Clear flag as we have a user
          sessionStorage.removeItem('authInProgress');
          
          // Subscribe to user data changes in Firestore
          unsubscribeFirestore = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnapshot) => {
            const userData = docSnapshot.exists() ? docSnapshot.data() : {};
            
            const u = {
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              username: userData.username || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
              email: firebaseUser.email,
              phone: userData.phone || firebaseUser.phoneNumber,
              avatar: userData.avatar || firebaseUser.photoURL,
              settings: userData.settings || { theme: 'light' },
              accounts: userData.accounts || []
            };
            
            setUser(u);
            setIsDarkMode(u.settings?.theme === 'dark');
            setView(prev => prev === 'auth' ? 'home' : prev);
            setIsLoading(false);
          }, (err) => {
            console.error("Error syncing user data from Firestore:", err);
            // Fallback to basic auth user
            const u = {
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
              email: firebaseUser.email,
              phone: firebaseUser.phoneNumber,
              avatar: firebaseUser.photoURL,
              settings: { theme: 'light' },
              accounts: []
            };
            setUser(u);
            setView(prev => prev === 'auth' ? 'home' : prev);
            setError(getFriendlyErrorMessage(err));
            setIsLoading(false);
          });
        } catch (err: any) {
          console.error("Auth state change error:", err);
          setIsLoading(false);
        }
      } else {
        // Only set loading to false if we are NOT waiting for a redirect result
        if (!isRedirectCheckPending) {
          setUser(null);
          setView('auth');
          setIsLoading(false);
        }
      }
    });

    // Handle redirect result
    getRedirectResult(auth).then(async (result) => {
      isRedirectCheckPending = false;
      sessionStorage.removeItem('authInProgress');

      if (result) {
        const user = result.user;
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            username: user.displayName || user.email?.split('@')[0],
            email: user.email,
            avatar: user.photoURL,
            settings: { theme: 'light' },
            created_at: new Date().toISOString()
          });
        }
        // onAuthStateChanged will handle the rest
      } else {
        // If no result and no current user, stop loading
        if (!auth.currentUser) {
          setIsLoading(false);
          setUser(null);
          setView('auth');
        }
      }
    }).catch((error) => {
      console.error("Redirect login error:", error);
      isRedirectCheckPending = false;
      sessionStorage.removeItem('authInProgress');
      setError(getFriendlyErrorMessage(error));
      setIsLoading(false);
      if (!auth.currentUser) {
        setView('auth');
      }
    });


    return () => {
      clearTimeout(safetyTimeout);
      window.removeEventListener('unhandledrejection', handleRejection);
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  useEffect(() => {
    // Fallback: if Gemini API key is missing, try to fetch it from the server
    const checkApiKey = async () => {
      let currentKey = 
        (window as any)._SERVER_GEMINI_API_KEY ||
        (window as any).GEMINI_API_KEY ||
        (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || 
        (typeof process !== 'undefined' && process.env?.API_KEY) ||
        (import.meta.env?.VITE_GEMINI_API_KEY);

      // Clean the key
      if (typeof currentKey === 'string') {
        currentKey = currentKey.trim().replace(/^["']|["']$/g, '');
      }

      if (!currentKey || currentKey === "" || currentKey === "undefined" || currentKey === "null" || currentKey.length < 10) {
        console.log("🔍 Gemini API Key not found or invalid in frontend, attempting to fetch from server...");
        try {
          const response = await fetch('/api/config');
          if (response.ok) {
            const data = await response.json();
            let serverKey = data.geminiApiKey;
            if (typeof serverKey === 'string') {
              serverKey = serverKey.trim().replace(/^["']|["']$/g, '');
            }

            if (serverKey && serverKey !== "undefined" && serverKey !== "null" && serverKey.length >= 10) {
              console.log("✅ Gemini API Key recovered from server");
              (window as any).GEMINI_API_KEY = serverKey;
            } else {
              console.warn("⚠️ Server returned no valid Gemini API Key");
            }
          }
        } catch (err) {
          console.error("❌ Failed to fetch config from server:", err);
        }
      } else {
        // If it's valid, ensure it's set in window.GEMINI_API_KEY for geminiService to find
        (window as any).GEMINI_API_KEY = currentKey;
      }
    };

    checkApiKey();
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const enablePushNotifications = async () => {
    if (!user?.uid || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setIsTogglingPush(true);
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission !== 'granted') {
        setError('Permiso denegado. Actívalo en la configuración del navegador.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidResponse = await fetch('/api/notifications/vapid-key');
      if (!vapidResponse.ok) {
        setError('Error de configuración: no se pudo obtener la VAPID key.');
        return;
      }
      const { publicKey: vapidKey } = await vapidResponse.json();
      
      if (!vapidKey) {
        setError('Error de configuración: VAPID key no disponible.');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });

      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: user.uid,
          subscription: subscription.toJSON()
        })
      });

      if (response.ok) {
        setIsPushEnabled(true);
        setSuccess('¡Notificaciones activadas! Te avisaremos sobre tus metas y movimientos. 🔔');
        setTimeout(() => setSuccess(null), 4000);
      } else {
        throw new Error('Error al guardar suscripción en el servidor');
      }
    } catch (err: any) {
      console.error('Error activando push:', err);
      setError('No se pudieron activar las notificaciones. Intenta de nuevo.');
    } finally {
      setIsTogglingPush(false);
    }
  };

  const disablePushNotifications = async () => {
    if (!user?.uid || !('serviceWorker' in navigator)) return;
    setIsTogglingPush(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();

      await fetch('/api/notifications/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebase_uid: user.uid })
      });

      setIsPushEnabled(false);
      setSuccess('Notificaciones desactivadas.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error desactivando push:', err);
      setError('Error al desactivar notificaciones.');
    } finally {
      setIsTogglingPush(false);
    }
  };

  const loadUserCategories = async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      const firestoreCategories: string[] = 
        userSnap.exists() ? (userSnap.data().categories || []) : [];

      // Rescatar categorías de todos los eventos históricos
      const eventsSnap = await getDocs(
        query(collection(db, 'events'), where('user_id', '==', uid))
      );
      const eventCategories = Array.from(new Set(
        eventsSnap.docs
          .map(d => d.data().category)
          .filter(Boolean)
      ));

      const merged = Array.from(new Set([
        ...firestoreCategories,
        ...eventCategories
      ])).sort();

      setUserCategories(merged);

      // Persistir en Firestore si había categorías no guardadas
      if (eventCategories.some(c => !firestoreCategories.includes(c))) {
        await setDoc(userRef, { categories: merged }, { merge: true });
      }
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !user?.uid) return;
    const capitalized = newCategoryName.trim().charAt(0).toUpperCase() + 
                        newCategoryName.trim().slice(1);
    if (userCategories.includes(capitalized)) {
      setError('Esta categoría ya existe');
      return;
    }
    setIsProcessing(true);
    try {
      const updated = [...userCategories, capitalized].sort();
      await setDoc(doc(db, 'users', user.uid), 
        { categories: updated }, { merge: true });
      setUserCategories(updated);
      setNewCategoryName('');
      setIsAddingCategory(false);
      setSuccess('Categoría agregada');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Error al agregar la categoría');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRenameCategory = async () => {
    if (!editingCategory || !editingCategoryValue.trim() || !user?.uid) return;
    const newName = editingCategoryValue.trim().charAt(0).toUpperCase() + 
                    editingCategoryValue.trim().slice(1);
    if (newName === editingCategory) { setEditingCategory(null); return; }
    setIsProcessing(true);
    try {
      const updated = userCategories
        .map(c => c === editingCategory ? newName : c).sort();
      await setDoc(doc(db, 'users', user.uid), 
        { categories: updated }, { merge: true });
      
      const q = query(
        collection(db, 'events'),
        where('user_id', '==', user.uid),
        where('category', '==', editingCategory)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => {
          batch.update(doc(db, 'events', d.id), { category: newName });
        });
        await batch.commit();
      }
      setUserCategories(updated);
      setEditingCategory(null);
      setEditingCategoryValue('');
      setSuccess(`Categoría renombrada en ${snapshot.size} movimientos`);
      setTimeout(() => setSuccess(null), 4000);
      await fetchData();
    } catch (err) {
      setError('Error al renombrar la categoría');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCategory = (categoryName: string) => {
    setCategoryToDelete(categoryName);
    setReassignTarget('');
    setIsCreatingReassignCategory(false);
    setNewReassignCategoryName('');
    setShowReassignModal(true);
  };

  const executeDeleteWithReassign = async () => {
    if (!categoryToDelete || !user?.uid) return;
    
    let targetCategory = reassignTarget;
    if (isCreatingReassignCategory) {
      if (!newReassignCategoryName.trim()) {
        setError('Escribe el nombre de la nueva categoría');
        return;
      }
      targetCategory = newReassignCategoryName.trim().charAt(0).toUpperCase() + 
                       newReassignCategoryName.trim().slice(1);
    }
    if (!targetCategory) {
      setError('Selecciona o crea una categoría destino');
      return;
    }

    setIsProcessingDelete(true);
    try {
      const q = query(
        collection(db, 'events'),
        where('user_id', '==', user.uid),
        where('category', '==', categoryToDelete)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => {
          batch.update(doc(db, 'events', d.id), { category: targetCategory });
        });
        await batch.commit();
      }

      let updated = userCategories.filter(c => c !== categoryToDelete);
      if (!updated.includes(targetCategory)) {
        updated = [...updated, targetCategory].sort();
      }
      await setDoc(doc(db, 'users', user.uid), 
        { categories: updated }, { merge: true });

      setUserCategories(updated);
      setShowReassignModal(false);
      setCategoryToDelete(null);
      setReassignTarget('');
      setIsCreatingReassignCategory(false);
      setNewReassignCategoryName('');

      const msg = snapshot.empty 
        ? 'Categoría eliminada' 
        : `Categoría eliminada y ${snapshot.size} movimiento${snapshot.size !== 1 ? 's' : ''} reasignado${snapshot.size !== 1 ? 's' : ''} a "${targetCategory}"`;
      setSuccess(msg);
      setTimeout(() => setSuccess(null), 4000);
      await fetchData();
    } catch (err) {
      console.error("Error eliminando categoría:", err);
      setError('Error al eliminar la categoría');
    } finally {
      setIsProcessingDelete(false);
    }
  };

  const loadUsageCounters = async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        const usage = data.usage || { photos: 0, audio: 0, month: currentMonth };
        
        if (usage.month !== currentMonth) {
          const newUsage = { photos: 0, audio: 0, month: currentMonth };
          await updateDoc(userRef, { usage: newUsage });
          setPhotoUsage(0);
          setAudioUsage(0);
        } else {
          setPhotoUsage(usage.photos || 0);
          setAudioUsage(usage.audio || 0);
        }
      }
    } catch (err) {
      console.error("Error loading usage counters:", err);
    }
  };

  const incrementUsage = async (type: "photo" | "audio") => {
    if (!user?.uid) return;
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const newPhotoUsage = type === "photo" ? photoUsage + 1 : photoUsage;
      const newAudioUsage = type === "audio" ? audioUsage + 1 : audioUsage;
      
      if (type === "photo") setPhotoUsage(newPhotoUsage);
      if (type === "audio") setAudioUsage(newAudioUsage);
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { 
        usage: { photos: newPhotoUsage, audio: newAudioUsage, month: currentMonth } 
      });
    } catch (err) {
      console.error(`Error incrementing ${type} usage:`, err);
    }
  };

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user?.uid) return;
      
      setIsCheckingSubscription(true);
      console.log("🔍 Verificando suscripción para:", user.uid);
      
      try {
        let r;
        let retries = 3;
        while (retries > 0) {
          try {
            r = await fetch(`/api/user/subscription/${user.uid}`);
            break;
          } catch (fetchErr) {
            retries--;
            if (retries === 0) throw fetchErr;
            await new Promise(res => setTimeout(res, 1000));
          }
        }

        if (r && r.ok) {
          const data = await r.json();
          console.log("✅ Datos de suscripción recibidos:", data);
          setIsPremium(data.isPremium);
          setPremiumUntil(data.premiumUntil);
          if (data.isPremium) setShowAd(false);
        } else {
          console.warn("⚠️ Error al consultar suscripción:", r?.status);
          setIsPremium(false);
        }
      } catch (err: any) {
        console.error("❌ Error de red al verificar suscripción:", err);
        // Solo mostrar error si no es un error de cancelación o similar
        if (err.name !== 'AbortError') {
          setError(`Error de red al verificar suscripción: ${err.message || "Error desconocido"}`);
        }
        setIsPremium(false);
      } finally {
        setIsCheckingSubscription(false);
      }
    };

    if (user?.id) {
      if (user?.uid) {
        const month = getActiveChatMonth();
        loadAiChat(user.uid, month);
      }
      setEventsPage(1);
      fetchData();
      checkSubscription();
      if (user?.uid) loadUsageCounters(user.uid);
      if (user?.uid) loadUserCategories(user.uid);
    }

    // Verificar si venimos de un pago exitoso
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (urlParams.get('premium') === 'success') {
      setSuccess("¡Suscripción activada con éxito! Ya eres Premium.");
      
      // Si tenemos un session_id, verificamos manualmente para no depender solo del webhook
      if (sessionId) {
        fetch(`/api/stripe/verify-session/${sessionId}`)
          .then(r => r.json())
          .then(data => {
            if (data.isPremium) {
              checkSubscription();
            }
          })
          .catch(err => console.error("Error verificando sesión:", err));
      }

      // Limpiar la URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Re-verificar suscripción después de un momento para dar tiempo al webhook
      setTimeout(checkSubscription, 2000);
      setTimeout(checkSubscription, 5000);
    }
  }, [user?.id, dateRange]);

  useEffect(() => {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }
    setNotificationPermission(Notification.permission);
    setIsPushEnabled(Notification.permission === 'granted');
  }, []);

  useEffect(() => {
    if (showAd && !isPremium) {
      const timer = setInterval(() => {
        setAdTimer((prev) => {
          if (prev <= 1) {
            setCanCloseAd(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showAd]);

  useEffect(() => {
    if (!isLoading && !user && view !== 'auth') {
      setView('auth');
    }
  }, [isLoading, user, view]);

  const getActiveChatMonth = () => {
    if (filterType === 'month') return filterDate;
    if (filterType === 'day') return filterDate.slice(0, 7);
    if (filterType === 'year') return filterDate + "-01";
    return new Date().toISOString().slice(0, 7);
  };

  const getExportPeriodLabel = () => {
    const mesesNombres = ['enero','febrero','marzo','abril','mayo','junio',
      'julio','agosto','septiembre','octubre','noviembre','diciembre'];
    
    if (filterType === 'day') {
      const parts = filterDate.split('-');
      const year = parts[0];
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      return `el día ${day} de ${mesesNombres[month]} de ${year}`;
    }
    if (filterType === 'month') {
      const parts = filterDate.split('-');
      const year = parts[0];
      const month = parseInt(parts[1]) - 1;
      return `el mes de ${mesesNombres[month]} ${year}`;
    }
    if (filterType === 'year') {
      return `todo el año ${filterDate}`;
    }
    return "todos tus movimientos registrados";
  };

  const generatePDF = async () => {
    const cleanTextForPDF = (text: string): string => {
      return text
        .replace(/#{1,6}\s+/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/_{1,2}(.*?)_{1,2}/g, '$1')
        .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/^[-*+]\s+/gm, '• ')
        .replace(/^\d+\.\s+/gm, '')
        .replace(/[\u{1F000}-\u{1FAFF}]/gu, '')
        .replace(/[\u{2600}-\u{27FF}]/gu, '')
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
        .replace(/[^\x00-\xFF]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const html2canvas = (await import('html2canvas')).default;

    const pdf = new jsPDF('p', 'mm', 'a4');
    let yPosition = 20;

    // Header
    pdf.setFillColor(0, 153, 102); // Emerald 600
    pdf.rect(0, 0, 210, 40, 'F');
    
    const logoImg = new Image();
    logoImg.src = APP_LOGO;
    await new Promise((resolve) => { logoImg.onload = resolve; });
    const logoCanvas = document.createElement('canvas');
    logoCanvas.width = 80;
    logoCanvas.height = 80;
    const ctx = logoCanvas.getContext('2d');
    ctx?.drawImage(logoImg, 0, 0, 80, 80);
    const logoPng = logoCanvas.toDataURL('image/png');
    pdf.addImage(logoPng, 'PNG', 15, 10, 20, 20);
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(cleanTextForPDF('ContaBot'), 40, 20);
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(cleanTextForPDF('Reporte Financiero'), 40, 28);
    
    pdf.setFontSize(10);
    pdf.text(cleanTextForPDF(getExportPeriodLabel()), 40, 34);
    
    pdf.setFontSize(10);
    pdf.text(cleanTextForPDF(user?.username || 'Usuario'), 195, 20, { align: 'right' });
    
    pdf.setFontSize(8);
    pdf.text(cleanTextForPDF(new Date().toLocaleDateString('es-MX')), 195, 26, { align: 'right' });

    yPosition = 50;

    // Resumen General
    pdf.setTextColor(0, 153, 102);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(cleanTextForPDF('Resumen General'), 15, yPosition);
    yPosition += 5;

    const totalIngresos = (analytics?.incomeByAccount || []).reduce((acc: number, curr: any) => acc + curr.value, 0);
    const totalGastos = (analytics?.expensesByCategory || []).reduce((acc: number, curr: any) => acc + curr.value, 0);
    const totalDeudas = (analytics?.debtsByCounterparty || []).reduce((acc: number, curr: any) => acc + curr.value, 0);
    const totalPrestamos = (analytics?.loansByDebtor || []).reduce((acc: number, curr: any) => acc + curr.value, 0);

    autoTable(pdf, {
      startY: yPosition,
      head: [[cleanTextForPDF('Concepto'), cleanTextForPDF('Monto')]],
      body: [
        [cleanTextForPDF('Total Ingresos del período'), cleanTextForPDF(`$${formatAmount(totalIngresos)}`)],
        [cleanTextForPDF('Total Gastos del período'), cleanTextForPDF(`$${formatAmount(totalGastos)}`)],
        [cleanTextForPDF('Balance (Ingresos - Gastos)'), cleanTextForPDF(`$${formatAmount(totalIngresos - totalGastos)}`)],
        [cleanTextForPDF('Total Deudas pendientes'), cleanTextForPDF(`$${formatAmount(totalDeudas)}`)],
        [cleanTextForPDF('Total Préstamos por cobrar'), cleanTextForPDF(`$${formatAmount(totalPrestamos)}`)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [0, 153, 102] },
      margin: { left: 15, right: 15 }
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 15;

    // Movimientos
    if (pdf.getCurrentPageInfo().pageNumber !== 1) {
      // already added page
    } else if (yPosition > 250) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setTextColor(0, 153, 102);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(cleanTextForPDF('Movimientos del Período'), 15, yPosition);
    yPosition += 5;

    const kindMap: Record<string, string> = {
      expense: 'Gasto',
      income: 'Ingreso',
      debt_increase: 'T.Crédito',
      debt_payment: 'Pago Deuda',
      loan_given: 'Préstamo dado',
      loan_repayment_received: 'Préstamo cobrado',
      refund: 'Devolución',
      loss: 'Pérdida'
    };

    const movimientosBody = recentEvents.map(e => {
      const date = new Date(e.occurred_at).toLocaleDateString('es-MX');
      const desc = e.description || e.merchant_name || '';
      const cat = e.category || '';
      const acc = e.account_name || '';
      const tipo = kindMap[e.kind] || e.kind;
      const isPositive = ['income', 'refund', 'loan_repayment_received'].includes(e.kind);
      const isNegative = ['expense', 'loss', 'debt_payment', 'loan_given'].includes(e.kind);
      const isWarning = e.kind === 'debt_increase';
      const montoStr = `${isPositive ? '+' : isNegative ? '-' : ''}$${formatAmount(e.amount)}`;
      
      return [cleanTextForPDF(date), cleanTextForPDF(desc), cleanTextForPDF(cat), cleanTextForPDF(acc), cleanTextForPDF(tipo), cleanTextForPDF(montoStr), e.kind];
    });

    autoTable(pdf, {
      startY: yPosition,
      head: [[cleanTextForPDF('Fecha'), cleanTextForPDF('Descripción'), cleanTextForPDF('Categoría'), cleanTextForPDF('Cuenta'), cleanTextForPDF('Tipo'), cleanTextForPDF('Monto')]],
      body: movimientosBody.map(row => row.slice(0, 6)),
      theme: 'grid',
      headStyles: { fillColor: [0, 153, 102] },
      margin: { left: 15, right: 15 },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 5) {
          const kind = movimientosBody[data.row.index][6];
          if (['income', 'refund', 'loan_repayment_received'].includes(kind)) {
            data.cell.styles.textColor = [22, 163, 74]; // green-600
          } else if (['expense', 'loss', 'debt_payment', 'loan_given'].includes(kind)) {
            data.cell.styles.textColor = [220, 38, 38]; // red-600
          } else if (kind === 'debt_increase') {
            data.cell.styles.textColor = [217, 119, 6]; // amber-600
          }
        }
      }
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 15;

    // Gráficas
    if (pdf.getCurrentPageInfo().pageNumber !== (pdf as any).lastAutoTable.pageNumber) {
      // already added page
    } else if (yPosition > 200) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setTextColor(0, 153, 102);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(cleanTextForPDF('Análisis Visual'), 15, yPosition);
    yPosition += 10;

    const chartIds = [
      { id: 'chart-balance-account', title: 'Saldos por Cuenta' },
      { id: 'chart-expenses-category', title: 'Salidas por Categoría' },
      { id: 'chart-debts', title: 'Deudas por Acreedor' },
      { id: 'chart-loans', title: 'Préstamos por Cobrar' }
    ];

    await new Promise(resolve => setTimeout(resolve, 500));

    for (const chart of chartIds) {
      if (yPosition > 220) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.text(cleanTextForPDF(chart.title), 15, yPosition);
      yPosition += 5;

      const el = document.getElementById(chart.id);
      if (!el || el.offsetWidth === 0) {
        pdf.setTextColor(150);
        pdf.setFontSize(10);
        pdf.text(cleanTextForPDF('Gráfica no disponible en este momento'), 15, yPosition);
        pdf.setTextColor(0);
        yPosition += 10;
        continue;
      }
      
      if (el) {
        const canvas = await html2canvas(el, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = 180;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        if (yPosition + pdfHeight > 280) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.addImage(imgData, 'PNG', 15, yPosition, pdfWidth, pdfHeight);
        yPosition += pdfHeight + 15;
      } else {
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.text(cleanTextForPDF('Sin datos para este período'), 15, yPosition + 5);
        yPosition += 20;
      }
    }

    // Objetivos
    pdf.addPage();
    yPosition = 20;
    pdf.setTextColor(0, 153, 102);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(cleanTextForPDF('Mis Objetivos de Ahorro'), 15, yPosition);
    yPosition += 5;

    const objetivosBody = goals.map(g => {
      const currentAmount = g.account_name && analytics?.accountBalances
        ? (analytics.accountBalances[g.account_name] || 0)
        : (g.current_amount || 0);
      const progress = ((currentAmount / g.target_amount) * 100).toFixed(1) + '%';
      const deadline = g.deadline ? new Date(g.deadline).toLocaleDateString('es-MX') : 'Sin fecha';
      
      return [
        cleanTextForPDF(`${g.emoji || ''} ${g.name}`),
        cleanTextForPDF(`$${formatAmount(g.target_amount)}`),
        cleanTextForPDF(`$${formatAmount(currentAmount)}`),
        cleanTextForPDF(progress),
        cleanTextForPDF(g.account_name || 'Manual'),
        cleanTextForPDF(deadline)
      ];
    });

    if (objetivosBody.length > 0) {
      autoTable(pdf, {
        startY: yPosition,
        head: [[cleanTextForPDF('Objetivo'), cleanTextForPDF('Monto Meta'), cleanTextForPDF('Actual'), cleanTextForPDF('Progreso'), cleanTextForPDF('Cuenta'), cleanTextForPDF('Fecha límite')]],
        body: objetivosBody,
        theme: 'grid',
        headStyles: { fillColor: [0, 153, 102] },
        margin: { left: 15, right: 15 }
      });
    } else {
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.text(cleanTextForPDF('No hay objetivos registrados'), 15, yPosition + 5);
    }

    // Análisis IA
    if (aiChatMessages.length > 0) {
      pdf.addPage();
      yPosition = 20;
      pdf.setTextColor(0, 153, 102);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(cleanTextForPDF('Análisis Inteligente ContaBot'), 15, yPosition);
      yPosition += 10;

      const rawText = aiChatMessages[0]?.text || '';
      
      const paragraphs = rawText
        .split(/\n{1,}/)
        .map(p => cleanTextForPDF(p.trim()))
        .filter(p => p.length > 2)
        .filter(p => !/saludo\s*personalizado/i.test(p));
      
      // Eliminar saludos duplicados: si hay más de un párrafo que 
      // empieza con "¡Hola" o "Hola", conservar solo el primero
      let helloFound = false;
      const dedupedParagraphs = paragraphs.filter(p => {
        const isHello = /^[¡!]?hola/i.test(p);
        if (isHello) {
          if (helloFound) return false;
          helloFound = true;
        }
        return true;
      });
      
      for (const paragraph of dedupedParagraphs) {
        const isTitle = paragraph.startsWith('•') === false && 
          paragraph.toUpperCase() === paragraph && 
          paragraph.length < 50;
        
        if (isTitle) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.setTextColor(0, 153, 102);
        } else if (paragraph.startsWith('•')) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.setTextColor(60, 60, 60);
        } else {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.setTextColor(40, 40, 40);
        }
        
        const lines = pdf.splitTextToSize(paragraph, 178);
        
        if (yPosition + (lines.length * 6) > 270) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.text(lines, 16, yPosition);
        yPosition += (lines.length * 6) + 5;
      }
    }

    // Footer
    const pageCount = (pdf as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setDrawColor(200, 200, 200);
      pdf.line(15, 285, 195, 285);
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(8);
      pdf.text(cleanTextForPDF(`ContaBot — Reporte generado el ${new Date().toLocaleDateString('es-MX')}`), 105, 290, { align: 'center' });
      pdf.text(cleanTextForPDF(`Página ${i} de ${pageCount}`), 195, 290, { align: 'right' });
    }

    pdf.save(`ContaBot_Reporte_${getActiveChatMonth()}.pdf`);
  };

  const handleExport = async () => {
    if (isPremium !== true) {
      setError("La exportación es exclusiva de ContaBot Pro 👑");
      return;
    }
    setIsExporting(true);
    try {
      if (exportFormat === 'pdf') {
        setShowExportModal(false);
        await generatePDF();
      } else if (exportFormat === 'excel') {
        setShowExportModal(false);
        const res = await fetch('/api/export/excel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            periodLabel: getExportPeriodLabel(),
            events: recentEvents,
            analytics: analytics,
            goals: goals,
            aiChatMessages: aiChatMessages,
            username: user.username,
            dateRange: dateRange
          })
        });
        if (!res.ok) throw new Error('Error en exportación Excel');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ContaBot_Reporte_${new Date().toISOString().slice(0,7)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
      setError("Error al exportar. Intenta de nuevo.");
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const loadAiChat = async (uid: string, month: string) => {
    setIsAnalyzing(true);
    try {
      const docRef = doc(db, 'users', uid, 'aiChats', month);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().messages?.length > 0) {
        const data = docSnap.data();
        setAiChatMessages(data.messages as Array<{role: 'user' | 'ai', text: string}>);
        setAnalysisGenerated(true);
        setAiAnalysis(data.messages[0]?.text || null);
      } else {
        setAiChatMessages([]);
        setAnalysisGenerated(false);
        setAiAnalysis(null);
      }
    } catch (err) {
      console.error("Error loading AI chat:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveAiChat = async (uid: string, month: string, messages: Array<{role: 'user' | 'ai', text: string}>) => {
    try {
      const docRef = doc(db, 'users', uid, 'aiChats', month);
      const dataToSave: any = {
        messages: messages,
        updatedAt: new Date().toISOString(),
        month: month
      };
      if (messages.length === 1) {
        dataToSave.createdAt = new Date().toISOString();
      }
      await setDoc(docRef, dataToSave, { merge: true });
    } catch (err) {
      console.error("Error saving AI chat:", err);
    }
  };

  const generateAIAnalysis = async () => {
    if (isPremium !== true) {
      setError("Esta función es exclusiva de ContaBot Pro 👑");
      return;
    }
    setIsAnalyzing(true);
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const currentMonthEvents = recentEvents.filter(e => e.occurred_at && e.occurred_at.startsWith(currentMonth));
      
      const expensesParaAnalisis = (analytics?.expensesByCategory || [])
        .filter((e: any) => e.name !== 'Traspaso' && e.name !== 'Interés');

      const summaryData = {
        gastosPorCategoria: expensesParaAnalisis,
        totalIngresos: summary?.balance || 0,
        totalGastos: summary?.expenses || 0,
        objetivosActivos: goals.map(g => {
          const currentAmount = g.account_name && analytics?.accountBalances
            ? (analytics.accountBalances[g.account_name] || 0)
            : (g.current_amount || 0);
          return {
            name: g.name,
            emoji: g.emoji,
            target_amount: g.target_amount,
            current_amount: currentAmount,
            account_name: g.account_name,
            deadline: g.deadline,
            progreso: Math.min((currentAmount / g.target_amount) * 100, 100).toFixed(1) + '%'
          };
        }),
        usuario: user?.username || 'Usuario'
      };

      const systemPrompt = `Eres ContaBot, un asistente financiero personal amigable. 
  Tu tarea es analizar los gastos mensuales del usuario y darle recomendaciones personalizadas.
  Responde SIEMPRE en español, con tono amigable, cercano y motivador.
  USA emojis frecuentemente para hacer el análisis más visual y agradable.
  
  ESTRUCTURA DE TU RESPUESTA (usa este formato exacto con secciones):
  
  1. Empieza DIRECTAMENTE con el resumen del mes, sin saludo previo ni introducción. El primer párrafo debe ser el RESUMEN DEL MES con los números.
  2. 📊 RESUMEN DEL MES — breve resumen de ingresos vs gastos
  3. 🔍 GASTOS QUE PUEDES EVITAR — identifica las 2-3 categorías donde más gasta y que son evitables (no incluyas renta, servicios básicos, salud)
  4. 💡 RECOMENDACIONES — para cada gasto evitable, sugiere cuánto podría ahorrarse y qué hacer con ese dinero
  5. 🎯 CONEXIÓN CON TUS OBJETIVOS — si el usuario tiene objetivos activos, menciona cuánto más rápido podría cumplirlos si ahorra lo recomendado. Menciona el objetivo por nombre e emoji.
  6. Cierra con un párrafo motivador y personalizado, sin título ni encabezado, solo el mensaje directamente.
  
  Sé específico con los números. Si no hay suficientes datos, dilo amablemente y anima al usuario a registrar más movimientos.
  
  IMPORTANTE: Los traspasos entre cuentas propias NO son gastos evitables, 
  son movimientos internos del usuario. NUNCA los menciones como área de mejora.
  El current_amount de cada objetivo ya refleja el saldo REAL de la cuenta vinculada, 
  úsalo tal cual para calcular el progreso y las proyecciones.`;

      const apiKey = (window as any)._SERVER_GEMINI_API_KEY || (window as any).GEMINI_API_KEY;
      const genAI = new GoogleGenAI({ apiKey: apiKey });
      
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analiza mis finanzas de este mes: ${JSON.stringify(summaryData)}`,
        config: {
          systemInstruction: systemPrompt
        }
      });

      const aiText = response.text || '';
      setAiAnalysis(aiText);
      setAiChatMessages([{ role: 'ai', text: aiText }]);
      setAnalysisGenerated(true);
      
      if (user?.uid) {
        const month = getActiveChatMonth();
        await saveAiChat(user.uid, month, [{ role: 'ai', text: aiText }]);
      }
    } catch (err) {
      console.error(err);
      setError("Error al generar el análisis. Intenta de nuevo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sendAiChatMessage = async () => {
    if (aiChatInput.trim() === '') return;
    
    const userMessage = aiChatInput;
    setAiChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setAiChatInput('');
    setIsAnalyzing(true);
    
    try {
      const apiKey = (window as any)._SERVER_GEMINI_API_KEY || (window as any).GEMINI_API_KEY;
      const genAI = new GoogleGenAI({ apiKey: apiKey });
      
      const systemPrompt = `Eres ContaBot, un asistente financiero personal amigable. 
  Tu tarea es analizar los gastos mensuales del usuario y darle recomendaciones personalizadas.
  Responde SIEMPRE en español, con tono amigable, cercano y motivador.
  USA emojis frecuentemente para hacer el análisis más visual y agradable.
  
  ESTRUCTURA DE TU RESPUESTA (usa este formato exacto con secciones):
  
  1. Empieza DIRECTAMENTE con el resumen del mes, sin saludo previo ni introducción. El primer párrafo debe ser el RESUMEN DEL MES con los números.
  2. 📊 RESUMEN DEL MES — breve resumen de ingresos vs gastos
  3. 🔍 GASTOS QUE PUEDES EVITAR — identifica las 2-3 categorías donde más gasta y que son evitables (no incluyas renta, servicios básicos, salud)
  4. 💡 RECOMENDACIONES — para cada gasto evitable, sugiere cuánto podría ahorrarse y qué hacer con ese dinero
  5. 🎯 CONEXIÓN CON TUS OBJETIVOS — si el usuario tiene objetivos activos, menciona cuánto más rápido podría cumplirlos si ahorra lo recomendado. Menciona el objetivo por nombre e emoji.
  6. Cierra con un párrafo motivador y personalizado, sin título ni encabezado, solo el mensaje directamente.
  
  Sé específico con los números. Si no hay suficientes datos, dilo amablemente y anima al usuario a registrar más movimientos.
  
  El usuario ya tiene un análisis generado. Responde sus preguntas de seguimiento basándote en ese análisis y sus datos financieros.`;

      const chatHistory = aiChatMessages.map(m => `${m.role === 'ai' ? 'ContaBot' : 'Usuario'}: ${m.text}`).join('\n\n');
      
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Historial del chat:\n${chatHistory}\n\nUsuario: ${userMessage}`,
        config: {
          systemInstruction: systemPrompt
        }
      });

      const aiResponseText = response.text || '';
      const updatedMessages: Array<{role: 'user' | 'ai', text: string}> = [...aiChatMessages, 
        { role: 'user', text: userMessage },
        { role: 'ai', text: aiResponseText }
      ];
      setAiChatMessages(updatedMessages);

      if (user?.uid) {
        const month = getActiveChatMonth();
        await saveAiChat(user.uid, month, updatedMessages);
      }
    } catch (err) {
      console.error(err);
      setError("Error al enviar el mensaje. Intenta de nuevo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchGoals = async () => {
    if (!user?.id) return;
    try {
      const q = query(collection(db, 'goals'), where('user_id', '==', user.id), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const goalsList: Goal[] = [];
      querySnapshot.forEach((doc) => {
        goalsList.push({ id: doc.id, ...doc.data() } as Goal);
      });
      setGoals(goalsList);
    } catch (err: any) {
      console.error("Error fetching goals:", err);
      if (err.message && (err.message.includes('permissions') || err.message.includes('insufficient'))) {
        setError("Error de permisos al leer Objetivos. Asegúrate de actualizar las Reglas de Firestore.");
      } else if (err.message && err.message.includes('index')) {
        const link = err.message.split(': ').pop();
        setError(`Falta un índice en Firestore para ordenar los objetivos. Puedes crearlo aquí: ${link}`);
      }
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalForm.name || !goalForm.target_amount) {
      setError('Nombre y monto objetivo son requeridos');
      return;
    }

    setIsProcessing(true);
    try {
      if (goalForm.id) {
        const goalRef = doc(db, 'goals', goalForm.id);
        await updateDoc(goalRef, {
          ...goalForm,
          updated_at: Timestamp.now()
        });
        setSuccess('Objetivo actualizado con éxito');
      } else {
        await addDoc(collection(db, 'goals'), {
          ...goalForm,
          user_id: user.id,
          current_amount: goalForm.current_amount || 0,
          created_at: Timestamp.now()
        });
        setSuccess('Objetivo creado con éxito');
      }
      setIsAddingGoal(false);
      setGoalForm({ name: '', emoji: '🎯', color: '#10b981', target_amount: 0, current_amount: 0, deadline: '', account_name: '' });
      fetchGoals();
    } catch (err) {
      console.error("Error saving goal:", err);
      setError('Error al guardar el objetivo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteGoal = (id: string) => {
    setIsDeletingGoal(id);
    setDeleteGoalConfirmTimer(3);
  };

  const executeDeleteGoal = async () => {
    if (!isDeletingGoal) return;
    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, 'goals', isDeletingGoal));
      setSuccess('Objetivo eliminado con éxito');
      fetchGoals();
      setIsDeletingGoal(null);
    } catch (err) {
      console.error("Error deleting goal:", err);
      setError('Error al eliminar el objetivo');
    } finally {
      setIsProcessing(false);
    }
  };



  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setIsProcessing(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No hay usuario autenticado');

      const updates: any = {};
      if (profileForm.username) updates.username = profileForm.username;
      if (profileForm.email) updates.email = profileForm.email;
      if (profileForm.phone) updates.phone = profileForm.phone;

      await updateDoc(doc(db, 'users', currentUser.uid), updates);
      
      if (profileForm.username) {
        await updateProfile(currentUser, { displayName: profileForm.username });
      }

      setUser((prev: any) => ({ ...prev, ...updates }));
      setIsEditingProfile(false);
      setProfileForm(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
      setSuccess('Perfil actualizado con éxito');
    } catch (err: any) {
      console.error("Error updating profile:", err);
      if (err.code === 'permission-denied' || (err.message && err.message.includes('permissions'))) {
        setError('Error de permisos: No tienes permiso para actualizar este perfil. Verifica las Reglas de Firestore.');
      } else {
        setError('Error al actualizar el perfil');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.name) {
      setError('El nombre de la cuenta es requerido');
      return;
    }

    setIsProcessing(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No hay usuario autenticado');

      const newAccount = {
        id: accountForm.id || Date.now().toString(),
        name: accountForm.name,
        type: accountForm.type,
        cards: accountForm.cards.split(',').map(c => c.trim()).filter(c => c),
        interest_rate: accountForm.interest_rate ? parseFloat(accountForm.interest_rate) : null
      };

      const currentAccounts = user?.accounts || [];
      let updatedAccounts;
      
      if (accountForm.id) {
        updatedAccounts = currentAccounts.map((acc: any) => acc.id === accountForm.id ? newAccount : acc);
      } else {
        updatedAccounts = [...currentAccounts, newAccount];
      }

      await updateDoc(doc(db, 'users', currentUser.uid), { accounts: updatedAccounts });
      
      try {
        await fetch('/api/user/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.uid, settings: { accounts: updatedAccounts } })
        });
      } catch (e) {
        console.error("Error saving to SQLite:", e);
      }

      setUser((prev: any) => ({ ...prev, accounts: updatedAccounts }));
      setIsAddingAccount(false);
      setAccountForm({ id: '', name: '', type: 'debit', cards: '', interest_rate: '' });
      setSuccess('Cuenta guardada con éxito');
    } catch (err: any) {
      console.error("Error saving account:", err);
      setError('Error al guardar la cuenta');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAccount = (accountId: string) => {
    setIsDeletingAccount(accountId);
    setDeleteAccountConfirmTimer(3);
  };

  const executeDeleteAccount = async () => {
    if (!isDeletingAccount) return;
    setIsProcessing(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No hay usuario autenticado');

      const updatedAccounts = (user?.accounts || []).filter((acc: any) => acc.id !== isDeletingAccount);
      await updateDoc(doc(db, 'users', currentUser.uid), { accounts: updatedAccounts });
      
      try {
        await fetch('/api/user/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.uid, settings: { accounts: updatedAccounts } })
        });
      } catch (e) {
        console.error("Error saving to SQLite:", e);
      }

      setUser((prev: any) => ({ ...prev, accounts: updatedAccounts }));
      setIsAddingAccount(false);
      setAccountForm({ id: '', name: '', type: 'debit', cards: '', interest_rate: '' });
      setSuccess('Cuenta eliminada con éxito');
    } catch (err: any) {
      console.error("Error deleting account:", err);
      setError('Error al eliminar la cuenta');
    } finally {
      setIsProcessing(false);
      setIsDeletingAccount(null);
    }
  };

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 500;
          const MAX_HEIGHT = 500;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          } else {
            reject(new Error('Could not get canvas context'));
          }
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user?.id) {
      try {
        const base64 = await resizeImage(file);
        
        await updateDoc(doc(db, 'users', user.id), { avatar: base64 });
        
        // We don't update auth.currentUser.photoURL because base64 strings are too long for it
        // Instead we rely on Firestore data taking precedence in the UI
        
        setUser((prev: any) => ({ ...prev, avatar: base64 }));
        setSuccess('Avatar actualizado');
      } catch (err: any) {
        console.error("Error updating avatar:", err);
        if (err.code === 'permission-denied' || (err.message && err.message.includes('permissions'))) {
          setError('Error de permisos: No tienes permiso para actualizar el avatar.');
        } else {
          setError('Error al actualizar avatar');
        }
      }
    }
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    try {
      const bodyBgColor = isDarkMode ? '#030712' : '#e8ebf0';
      document.body.style.setProperty('background-color', bodyBgColor, 'important');
      document.documentElement.style.setProperty('background-color', bodyBgColor, 'important');

      if (isLoading) {
        // Durante el splash: poner verde
        let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', 'theme-color');
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', '#0d5c45');
        document.body.style.setProperty('background-color', '#0d5c45', 'important');
        document.documentElement.style.setProperty('background-color', '#0d5c45', 'important');
      } else {
        // Una vez cargada la app: ELIMINAR el meta theme-color completamente
        // Así black-translucent funciona solo y la barra de estado es transparente
        document.querySelectorAll('meta[name="theme-color"]').forEach(el => el.remove());
      }
    } catch (e) {
      console.error("Error updating theme color", e);
    }
  }, [isLoading, isDarkMode]);

    const fetchData = async () => {
    if (!user?.id) return;
    fetchGoals();
    const { start, end } = dateRange;
    
    // Helper to convert UTC event time to Local ISO string for comparison
    const toLocalISO = (dateStr: string) => {
      if (!dateStr) return new Date().toISOString();
      if (dateStr.length === 10) return `${dateStr}T12:00:00`;
      const d = new Date(dateStr);
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().slice(0, 23);
    };

    const processEvents = (querySnapshot: any) => {
      const allEvents: any[] = [];
      querySnapshot.forEach((doc: any) => {
        allEvents.push({ id: doc.id, ...doc.data() });
      });

      // Filter for the list view based on date range
      const events = allEvents
        .filter(e => {
          const localDate = toLocalISO(e.occurred_at);
          return localDate >= start && localDate <= end;
        })
        .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
      
      // Paginar los eventos de la vista (máximo EVENTS_PER_PAGE)
      const paginatedEvents = events.slice(0, EVENTS_PER_PAGE);
      setRecentEvents(paginatedEvents);
      setHasMoreEvents(events.length > EVENTS_PER_PAGE);
      setEventsPage(1);
      setError(null);

      // Calculate summary and analytics
      const summaryData = {
        balance: 0,
        expenses: 0,
        debts: 0,
        loans: 0
      };

      const accountBalances: Record<string, number> = {}; // Historical for AI
      const balanceByAccount: Record<string, number> = {}; // Period for UI Chart
      const expensesByCategory: Record<string, number> = {};
      const debtsByCounterparty: Record<string, number> = {};
      const loansByDebtor: Record<string, number> = {};

      const normalizeDebtName = (s: string) => {
        const normalized = s.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/\b(pago|abono|cobro|liquidacion|total|de|la|el|mi|su|a|con|en|cuenta|tarjeta|deuda|prestamo|credito|card|tc|deposito|transferencia|efectivo|cash)\b/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
      };

      const normalizeLoanName = (s: string) => {
        const normalized = s.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/\b(pago|abono|cobro|liquidacion|total|de|la|el|mi|su|a|con|en|prestamo|deuda|devolucion|recibido)\b/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
      };

      const knownCreditors = new Set<string>();
      allEvents.forEach(e => {
        if (e.kind === 'debt_increase') {
          let name = (!['Efectivo', 'Cash', 'cash', 'efectivo', 'Debit Card', 'Débito'].some(c => e.account_name?.toLowerCase().includes(c.toLowerCase()))) 
            ? e.account_name 
            : (e.merchant_name || e.description || 'Deuda');
          let nameStr = normalizeDebtName(String(name));
          if (nameStr) knownCreditors.add(nameStr);
        }
      });

      const knownDebtors = new Set<string>();
      allEvents.forEach(e => {
        if (e.kind === 'loan_given') {
          let nameStr = normalizeLoanName(String(e.merchant_name || e.description || 'Préstamo'));
          if (nameStr) knownDebtors.add(nameStr);
        }
      });

      // Count occurrences of group_ids to identify real linked pairs
      // and pre-process groups to find which types exist in each group for ALL events
      const groupCounts: Record<string, number> = {};
      const allGroupTypes: Record<string, string[]> = {};
      const allGroupAccounts: Record<string, string[]> = {};
      
      allEvents.forEach(e => {
        if (e.group_id) {
          groupCounts[e.group_id] = (groupCounts[e.group_id] || 0) + 1;
          if (!allGroupTypes[e.group_id]) allGroupTypes[e.group_id] = [];
          allGroupTypes[e.group_id].push(e.kind);
          if (!allGroupAccounts[e.group_id]) allGroupAccounts[e.group_id] = [];
          if (e.account_name) allGroupAccounts[e.group_id].push(e.account_name);
        }
      });

      // 1. Calculate Historical Account Balances, Debts and Loans for UI and AI Context
      const detectedAccountsMap: Record<string, { id: string, name: string, type: string, cards: string[] }> = {};

      allEvents.forEach(event => {
        const amount = event.amount || 0;
        const kind = event.kind;
        const localDate = toLocalISO(event.occurred_at);
        
        // Auto-detect accounts
        if (event.account_name) {
          let name = event.account_name.charAt(0).toUpperCase() + event.account_name.slice(1);
          let type = 'debit';
          const lower = name.toLowerCase();
          
          if (kind === 'debt_increase') {
             if (!lower.includes('crédito') && !lower.includes('credit') && !lower.includes('tarjeta') && !lower.includes('card')) {
                name = `${name} Crédito`;
             }
          }
          
          const lowerName = name.toLowerCase();
          if (lowerName.includes('crédito') || lowerName.includes('credit') || lowerName.includes('tarjeta') || lowerName.includes('card')) {
            type = 'credit';
          } else if (lowerName.includes('efectivo') || lowerName.includes('cash')) {
            type = 'cash';
          } else if (lowerName.includes('ahorro') || lowerName.includes('inversión') || lowerName.includes('savings')) {
            type = 'savings';
          }
          
          if (!detectedAccountsMap[name]) {
            detectedAccountsMap[name] = { id: `auto_${name}`, name, type, cards: [] };
          }
        }
        
        // Also check debts that are credit cards
        if (['debt_increase', 'debt_payment'].includes(kind) && event.merchant_name) {
          let name = event.merchant_name.charAt(0).toUpperCase() + event.merchant_name.slice(1);
          const lower = name.toLowerCase();
          const isCreditCard = lower.includes('crédito') || lower.includes('credit') || lower.includes('tarjeta') || lower.includes('card') || event.category === 'Tarjeta de Crédito';
          
          if (isCreditCard) {
            if (!lower.includes('crédito') && !lower.includes('credit') && !lower.includes('tarjeta') && !lower.includes('card')) {
              name = `${name} Crédito`;
            }
            if (!detectedAccountsMap[name]) {
              detectedAccountsMap[name] = { id: `auto_${name}`, name, type: 'credit', cards: [] };
            }
          }
        }

        // Account Balance logic
        if (event.account_name) {
          let accountName = event.account_name.charAt(0).toUpperCase() + event.account_name.slice(1);
          
          if (kind === 'debt_increase') {
             const lower = accountName.toLowerCase();
             if (!lower.includes('crédito') && !lower.includes('credit') && !lower.includes('tarjeta') && !lower.includes('card')) {
                accountName = `${accountName} Crédito`;
             }
          }

          const groupKinds = event.group_id ? allGroupTypes[event.group_id] : [];
          
          let skipAccountBalance = false;
          if (kind === 'loan_given' && groupKinds.includes('expense')) skipAccountBalance = true;
          if (kind === 'debt_increase' && groupKinds.includes('income')) skipAccountBalance = true;
          if (kind === 'debt_payment' && groupKinds.includes('expense')) skipAccountBalance = true;
          if (kind === 'loan_repayment_received' && groupKinds.includes('income')) skipAccountBalance = true;

          if (!skipAccountBalance) {
            if (['income', 'refund', 'loan_repayment_received'].includes(kind)) {
              accountBalances[accountName] = (accountBalances[accountName] || 0) + amount;
              if (localDate <= end) {
                balanceByAccount[accountName] = (balanceByAccount[accountName] || 0) + amount;
              }
            } else if (['expense', 'loss', 'debt_payment', 'loan_given', 'debt_increase'].includes(kind)) {
              accountBalances[accountName] = (accountBalances[accountName] || 0) - amount;
              if (localDate <= end) {
                balanceByAccount[accountName] = (balanceByAccount[accountName] || 0) - amount;
              }
            }
          }
        }

        // Debts Logic (Cumulative Historical for Charts)
        if (['debt_increase', 'debt_payment'].includes(kind)) {
          let name = (kind === 'debt_increase' && !['Efectivo', 'Cash', 'cash', 'efectivo', 'Debit Card', 'Débito'].some(c => event.account_name?.toLowerCase().includes(c.toLowerCase()))) 
            ? event.account_name 
            : (event.merchant_name || event.description || 'Deuda');
          
          let nameStr = normalizeDebtName(String(name));
          if (!nameStr) nameStr = 'General';

          const value = kind === 'debt_increase' ? amount : -amount;
          if (localDate <= end) {
            debtsByCounterparty[nameStr] = (debtsByCounterparty[nameStr] || 0) + value;
          }
        } else if (kind === 'expense' && event.category && ['tarjeta de crédito', 'tarjeta de credito', 'deudas', 'deuda', 'pago de tarjeta'].some(c => event.category?.toLowerCase().includes(c))) {
          // Fallback seguro: Si la IA registró un pago de tarjeta como un simple 'expense' en lugar de 'debt_payment'
          let creditorName = normalizeDebtName(String(event.merchant_name || event.description));
          if (creditorName && knownCreditors.has(creditorName)) {
            const groupKinds = event.group_id ? allGroupTypes[event.group_id] : [];
            if (!groupKinds.includes('debt_payment')) {
               if (localDate <= end) {
                 debtsByCounterparty[creditorName] = (debtsByCounterparty[creditorName] || 0) - amount;
               }
            }
          }
        } else if (kind === 'income' && event.group_id && allGroupTypes[event.group_id]?.includes('expense')) {
          // Fallback seguro: Si la IA registró un pago de tarjeta como una transferencia (expense + income)
          const accountsInGroup = allGroupAccounts[event.group_id] || [];
          const sourceAccount = accountsInGroup.find(a => a !== event.account_name);
          const destNameStr = normalizeDebtName(String(event.account_name));
          const sourceNameStr = sourceAccount ? normalizeDebtName(String(sourceAccount)) : null;
          
          const isDestCreditCard = String(event.account_name).toLowerCase().includes('crédito') || String(event.account_name).toLowerCase().includes('tarjeta');
          const isSameBankTransfer = sourceNameStr === destNameStr;

          if ((isDestCreditCard || isSameBankTransfer) && knownCreditors.has(destNameStr)) {
            const groupKinds = allGroupTypes[event.group_id] || [];
            if (!groupKinds.includes('debt_payment')) {
               if (localDate <= end) {
                 debtsByCounterparty[destNameStr] = (debtsByCounterparty[destNameStr] || 0) - amount;
               }
            }
          }
        }

        // Loans Logic (Cumulative Historical for Charts)
        if (['loan_given', 'loan_repayment_received'].includes(kind)) {
          let nameStr = normalizeLoanName(String(event.merchant_name || event.description || 'Préstamo'));
          if (!nameStr) nameStr = 'General';

          const value = kind === 'loan_given' ? amount : -amount;
          if (localDate <= end) {
            loansByDebtor[nameStr] = (loansByDebtor[nameStr] || 0) + value;
          }
        } else if (event.category && ['préstamo', 'prestamo'].some(c => event.category?.toLowerCase().includes(c))) {
          let debtorName = normalizeLoanName(String(event.merchant_name || event.description));
          if (debtorName && knownDebtors.has(debtorName)) {
            const groupKinds = event.group_id ? allGroupTypes[event.group_id] : [];
            if (kind === 'expense' && !groupKinds.includes('loan_given')) {
               if (localDate <= end) {
                 loansByDebtor[debtorName] = (loansByDebtor[debtorName] || 0) + amount;
               }
            } else if (kind === 'income' && !groupKinds.includes('loan_repayment_received')) {
               if (localDate <= end) {
                 loansByDebtor[debtorName] = (loansByDebtor[debtorName] || 0) - amount;
               }
            }
          }
        }
      });

      // 2. Calculate Expenses and Period Summary using FILTERED events
      events.forEach(event => {
        const amount = event.amount || 0;
        const kind = event.kind;
        
        // Add a flag for UI to know if it's a real linked pair
        event._is_linked = event.group_id && groupCounts[event.group_id] > 1;
        
        // Cash Balance logic for the period (Income/Expenses activity)
        if (['income', 'refund'].includes(kind)) {
          summaryData.balance += amount;
        } else if (['expense', 'loss'].includes(kind)) {
          summaryData.expenses += amount;
          if (event.category) {
            expensesByCategory[event.category] = (expensesByCategory[event.category] || 0) + amount;
          }
        }

        // Debts Summary (Period only - respects filters)
        if (['debt_increase', 'debt_payment'].includes(kind)) {
          const value = kind === 'debt_increase' ? amount : -amount;
          summaryData.debts += value;
        }

        // Loans Summary (Period only - respects filters)
        if (['loan_given', 'loan_repayment_received'].includes(kind)) {
          const value = kind === 'loan_given' ? amount : -amount;
          summaryData.loans += value;
        }
      });

      setSummary(summaryData);

      // Logic to determine if we should show balances
      // Rule: Show balances if (Period is Past/Present) OR (Period has Activity)
      // Hide balances if (Period is Future) AND (No Activity)
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      const today = new Date(now.getTime() - offset).toISOString().slice(0, 10);
      
      let incomeList = Object.entries(balanceByAccount)
          .filter(([_, v]) => v > 0.01)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => a.name.localeCompare(b.name));

      if (start > today && events.length === 0) {
        incomeList = [];
      }

      const usedColors = new Set<string>();
      const expensesWithColors = Object.entries(expensesByCategory)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(item => {
          let color = getEntityColor(item.name, 'category');
          if (color && !usedColors.has(color)) {
            usedColors.add(color);
            return { ...item, color };
          }
          // If color is already used or null, find an unused one from COLORS
          const unusedColor = COLORS.find(c => !usedColors.has(c));
          if (unusedColor) {
            color = unusedColor;
            usedColors.add(color);
          } else {
            // Fallback if all COLORS are used: generate a random color
            do {
              color = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            } while (usedColors.has(color));
            usedColors.add(color);
          }
          return { ...item, color };
        });

      setAnalytics({
        incomeByAccount: incomeList,
        expensesByCategory: expensesWithColors,
        debtsByCounterparty: Object.entries(debtsByCounterparty)
          .filter(([_, v]) => v > 0.01)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        loansByDebtor: Object.entries(loansByDebtor)
          .filter(([_, v]) => v > 0.01)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        allDebts: debtsByCounterparty,
        allLoans: loansByDebtor,
        accountBalances: accountBalances,
        detectedAccounts: detectedAccountsMap
      });
    };

    try {
      // Fetch ALL events for the user to ensure correct balance calculation
      const q = query(
        collection(db, 'events'),
        where('user_id', '==', user.id)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Sync Firebase events to SQLite for background processing (interest calculation)
      try {
        const eventsToSync: any[] = [];
        querySnapshot.forEach(doc => {
          eventsToSync.push({ id: doc.id, ...doc.data() });
        });
        if (eventsToSync.length > 0) {
          // Chunk events to avoid large payloads and potential timeouts
          const chunkSize = 500;
          for (let i = 0; i < eventsToSync.length; i += chunkSize) {
            const chunk = eventsToSync.slice(i, i + chunkSize);
            fetch('/api/events/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ events: chunk })
            }).catch(e => console.error("Error syncing events to SQLite:", e));
          }
        }
      } catch (e) {
        console.error("Error preparing events for sync:", e);
      }

      let sqliteEvents: any[] = [];
      try {
        const res = await fetch(`/api/events?userId=${user.id}`);
        if (res.ok) {
          sqliteEvents = await res.json();
        }
      } catch (e) {
        console.error("Error fetching SQLite events:", e);
      }

      const fakeSnapshot = {
        forEach: (cb: any) => {
          const seenIds = new Set<string>();
          querySnapshot.forEach((doc: any) => {
            seenIds.add(doc.id);
            cb(doc);
          });
          sqliteEvents.forEach(e => {
            if (!seenIds.has(e.id)) {
              cb({ id: e.id, data: () => e });
            }
          });
        }
      };

      processEvents(fakeSnapshot);
    } catch (err: any) {
      console.error("Firestore error in fetchData:", err);
      setError(getFriendlyErrorMessage(err));
    }
  };

  const loadMoreEvents = async () => {
    if (!user?.id || isLoadingMore || !hasMoreEvents) return;
    setIsLoadingMore(true);
    try {
      const { start, end } = dateRange;
      
      const toLocalISO = (dateStr: string) => {
        if (!dateStr) return new Date().toISOString();
        if (dateStr.length === 10) return `${dateStr}T12:00:00`;
        const d = new Date(dateStr);
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().slice(0, 23);
      };

      const q = query(
        collection(db, 'events'),
        where('user_id', '==', user.id)
      );
      const querySnapshot = await getDocs(q);
      
      const allEvents: any[] = [];
      querySnapshot.forEach((doc: any) => {
        allEvents.push({ id: doc.id, ...doc.data() });
      });

      const filtered = allEvents
        .filter(e => {
          const localDate = toLocalISO(e.occurred_at);
          return localDate >= start && localDate <= end;
        })
        .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

      const nextPage = eventsPage + 1;
      const paginated = filtered.slice(0, nextPage * EVENTS_PER_PAGE);
      setRecentEvents(paginated);
      setHasMoreEvents(filtered.length > nextPage * EVENTS_PER_PAGE);
      setEventsPage(nextPage);
    } catch (err) {
      console.error("Error loading more events:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const getFriendlyErrorMessage = (err: any) => {
    const code = err.code;
    const message = err.message || "";
    
    if (code === 'auth/invalid-credential' || message.includes('auth/invalid-credential')) {
      return 'Credenciales inválidas. Verifica tu correo y contraseña o regístrate si no tienes cuenta.';
    }

    switch (code) {
      case 'auth/invalid-email':
        return 'El correo electrónico no es válido.';
      case 'auth/user-disabled':
        return 'Este usuario ha sido deshabilitado.';
      case 'auth/user-not-found':
        return 'Usuario no encontrado.';
      case 'auth/wrong-password':
        return 'Contraseña incorrecta.';
      case 'auth/email-already-in-use':
        return 'Este correo ya está en uso.';
      case 'auth/weak-password':
        return 'La contraseña es muy débil (mínimo 6 caracteres).';
      case 'auth/popup-closed-by-user':
        return 'Se cerró la ventana de inicio de sesión.';
      case 'auth/unauthorized-domain':
        return `Dominio no autorizado (${window.location.hostname}). Agrégalo en Firebase Console > Authentication > Settings > Authorized Domains.`;
      case 'auth/network-request-failed':
        return 'Error de red. Verifica tu conexión.';
      case 'auth/internal-error':
        return 'Error interno del servidor de autenticación.';
      case 'auth/configuration-not-found':
        return 'Error de configuración: El método de autenticación no está habilitado en el proyecto de Firebase.';
      case 'auth/billing-not-enabled':
        return 'El inicio de sesión por teléfono requiere que el proyecto de Firebase tenga habilitado el plan de pago (Blaze). Por favor, contacta al administrador o usa el inicio de sesión por correo.';
      case 'permission-denied':
        return 'Error de permisos: No tienes autorización. Ve a Configuración para ver cómo solucionar esto.';
      default:
        if (message.toLowerCase().includes('index')) {
          const isBuilding = message.toLowerCase().includes('building');
          // Extract URL if present in the error message
          const urlMatch = message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
          const url = urlMatch ? urlMatch[0] : null;
          
          if (isBuilding) {
            return `El índice de la base de datos se está construyendo. La app funcionará en modo de respaldo mientras termina. Puedes ver el progreso aquí: ${url || 'Consola de Firebase'}`;
          }
          
          if (url) {
            return `Error de índice: Se requiere un índice compuesto. Haz clic aquí para crearlo: ${url}`;
          }
          return 'Error de índice: Se requiere un índice compuesto en Firestore para filtrar por fecha. Revisa la consola de Firebase.';
        }
        if (message.toLowerCase().includes('permissions') || message.toLowerCase().includes('permission')) {
          return 'Error de permisos: No tienes autorización. Ve a Configuración para ver cómo solucionar esto.';
        }
        return message || "Error de autenticación";
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    try {
      // If using phone method, we use a virtual email to leverage Email/Password provider without SMS
      const identifier = authMethod === 'email' 
        ? username 
        : `${phoneNumber.replace(/\D/g, '')}@phone.contabot.com`;

      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, identifier, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, identifier, password);
        // Initialize user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          username: authMethod === 'email' ? username.split('@')[0] : phoneNumber,
          email: authMethod === 'email' ? username : null,
          phone: authMethod === 'phone' ? phoneNumber : null,
          settings: { theme: 'light' },
          created_at: new Date().toISOString()
        });
      }
      setView('home');
      setUsername('');
      setPassword('');
      setPhoneNumber('');
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // We attempt signInWithPopup first for ALL devices.
      // Crucial: Do NOT await anything before this call (like setPersistence),
      // as it will break the "user interaction" context and cause Safari to block the popup.
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user doc exists, if not create it
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          username: user.displayName || user.email?.split('@')[0],
          email: user.email,
          avatar: user.photoURL,
          settings: { theme: 'light' },
          created_at: new Date().toISOString()
        });
      }
      setView('home');
    } catch (err: any) {
      console.error("Google login error:", err);
      
      // If popup is blocked (common on mobile if async delays happen, but we minimized them)
      // OR if closed by user (maybe they want to try again)
      // OR specifically on mobile where popups are aggressive, we fallback to redirect.
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        try {
          // Fallback to redirect
          sessionStorage.setItem('authInProgress', 'true');
          await signInWithRedirect(auth, googleProvider);
          return; 
        } catch (redirectErr: any) {
          console.error("Google redirect fallback error:", redirectErr);
          sessionStorage.removeItem('authInProgress');
          setError(getFriendlyErrorMessage(redirectErr));
        }
      } else {
        setError(getFriendlyErrorMessage(err));
      }
    } finally {
      // Only stop processing if we are NOT redirecting
      if (!sessionStorage.getItem('authInProgress')) {
        setIsProcessing(false);
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setView('auth');
  };

  const toggleTheme = async () => {
    const newTheme = !isDarkMode ? 'dark' : 'light';
    setIsDarkMode(!isDarkMode);
    if (user?.id) {
      const newSettings = { ...user.settings, theme: newTheme };
      try {
        // Use setDoc with merge: true to handle cases where the user document might not exist yet
        await setDoc(
          doc(db, 'users', user.id), 
          { settings: newSettings }, 
          { merge: true }
        );
        setUser({ ...user, settings: newSettings });
      } catch (err: any) {
        console.error("Error updating theme:", err);
        if (err.code === 'permission-denied' || (err.message && err.message.includes('permissions'))) {
          setError('Error de permisos: No se pudo guardar la preferencia de tema.');
        }
      }
    }
  };

  useEffect(() => {
    let timer: any;
    if (resetStep === 3 && resetConfirmTimer > 0) {
      timer = setInterval(() => {
        setResetConfirmTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resetStep, resetConfirmTimer]);

  const executeFactoryReset = async () => {
    if (resetConfirmText !== user?.username) {
      setError("El nombre de usuario no coincide");
      return;
    }
    
    setIsResetting(true);
    
    try {
      const uid = user.uid;
      
      // PASO 1: Borrar eventos por firebase uid
      const eventsQuery1 = query(
        collection(db, 'events'),
        where('user_id', '==', uid)
      );
      const eventsSnap1 = await getDocs(eventsQuery1);
      await Promise.all(eventsSnap1.docs.map(d => 
        deleteDoc(doc(db, 'events', d.id))
      ));
      
      // PASO 2: Borrar eventos por user.id (SQLite id por si acaso)
      if (user.id && user.id !== uid) {
        const eventsQuery2 = query(
          collection(db, 'events'),
          where('user_id', '==', user.id)
        );
        const eventsSnap2 = await getDocs(eventsQuery2);
        await Promise.all(eventsSnap2.docs.map(d => 
          deleteDoc(doc(db, 'events', d.id))
        ));
      }
      
      // PASO 3: Borrar metas por firebase uid
      const goalsQuery1 = query(
        collection(db, 'goals'),
        where('user_id', '==', uid)
      );
      const goalsSnap1 = await getDocs(goalsQuery1);
      await Promise.all(goalsSnap1.docs.map(d => 
        deleteDoc(doc(db, 'goals', d.id))
      ));
      
      // PASO 4: Borrar metas por user.id si es diferente
      if (user.id && user.id !== uid) {
        const goalsQuery2 = query(
          collection(db, 'goals'),
          where('user_id', '==', user.id)
        );
        const goalsSnap2 = await getDocs(goalsQuery2);
        await Promise.all(goalsSnap2.docs.map(d => 
          deleteDoc(doc(db, 'goals', d.id))
        ));
      }
      
      // PASO 5: Borrar chats de IA
      const aiChatsSnap = await getDocs(
        collection(db, 'users', uid, 'aiChats')
      );
      await Promise.all(aiChatsSnap.docs.map(d => 
        deleteDoc(doc(db, 'users', uid, 'aiChats', d.id))
      ));
      
      // PASO 6: Resetear documento del usuario en Firestore
      // merge: false para sobreescribir completamente
      await setDoc(doc(db, 'users', uid), {
        username: user.username,
        email: user.email || null,
        phone: user.phone || null,
        avatar: user.avatar || null,
        accounts: [],
        settings: { theme: user.settings?.theme || 'light' },
        usage: { 
          photos: 0, 
          audio: 0, 
          month: new Date().toISOString().slice(0, 7) 
        }
      }, { merge: false });
      
      // PASO 7: Borrar eventos de SQLite via API
      try {
        await fetch(`/api/events?userId=${uid}`, { method: 'DELETE' });
      } catch (e) {
        console.error('Error borrando SQLite events:', e);
        // No es crítico, continuar
      }
      
      // PASO 8: Resetear estados locales inmediatamente
      setRecentEvents([]);
      setSummary({ balance: 0, expenses: 0, debts: 0, loans: 0 });
      setAnalytics(null);
      setGoals([]);
      setAiChatMessages([]);
      setAiAnalysis(null);
      setAnalysisGenerated(false);
      setProposal(null);
      setPhotoUsage(0);
      setAudioUsage(0);
      setUser((prev: any) => ({
        ...prev,
        accounts: [],
        settings: { theme: prev.settings?.theme || 'light' }
      }));
      
      // PASO 9: Cerrar modal y limpiar
      setShowResetModal(false);
      setResetStep(1);
      setResetConfirmText('');
      setResetConfirmTimer(5);
      
      // PASO 10: Mostrar éxito
      setSuccess("¡App reiniciada exitosamente! Empieza de nuevo 🌱");
      
    } catch (err: any) {
      console.error("Error en factory reset:", err);
      setError("Error al reiniciar la app. Intenta de nuevo.");
    } finally {
      setIsResetting(false);
    }
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetStep(1);
    setResetConfirmText('');
    setResetConfirmTimer(5);
  };

  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const getBestSpanishVoice = (): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    // Orden de preferencia por calidad y naturalidad
    return (
      // iOS — Paulina es la mejor voz en español
      voices.find(v => v.name === 'Paulina') ||
      voices.find(v => v.name === 'Monica') ||
      // Android / Chrome — voces Google son naturales  
      voices.find(v => v.name.includes('Google') && v.lang === 'es-US') ||
      voices.find(v => v.name.includes('Google') && v.lang === 'es-MX') ||
      voices.find(v => v.name.includes('Google') && v.lang.startsWith('es')) ||
      // Windows — Microsoft voces online son aceptables
      voices.find(v => v.name.includes('Microsoft') && v.lang === 'es-MX' && !v.localService) ||
      voices.find(v => v.name.includes('Microsoft') && v.lang.startsWith('es') && !v.localService) ||
      // Cualquier voz online en español (no local = mejor calidad)
      voices.find(v => v.lang === 'es-MX' && !v.localService) ||
      voices.find(v => v.lang === 'es-US' && !v.localService) ||
      voices.find(v => v.lang.startsWith('es') && !v.localService) ||
      // Fallback a cualquier voz en español
      voices.find(v => v.lang === 'es-MX') ||
      voices.find(v => v.lang === 'es-US') ||
      voices.find(v => v.lang.startsWith('es')) ||
      null
    );
  };

  const speakText = (text: string) => {
    stopSpeaking();
    if (!text.trim() || !window.speechSynthesis) return;

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);

    // Dividir en chunks cortos (máx 80 chars) para evitar corte en iOS
    const splitIntoChunks = (str: string): string[] => {
      // Dividir por puntuación y comas
      const raw = str.split(/(?<=[.!?,;])\s+/).map(s => s.trim()).filter(Boolean);
      const result: string[] = [];
      
      for (const segment of raw) {
        if (segment.length <= 80) {
          result.push(segment);
        } else {
          // Si aún es largo, cortar por palabras
          const words = segment.split(' ');
          let current = '';
          for (const word of words) {
            if ((current + ' ' + word).trim().length > 80) {
              if (current) result.push(current.trim());
              current = word;
            } else {
              current = (current + ' ' + word).trim();
            }
          }
          if (current) result.push(current.trim());
        }
      }
      return result.length > 0 ? result : [str];
    };

    const doSpeak = () => {
      const chunks = splitIntoChunks(text);
      let currentIndex = 0;
      let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

      // iOS necesita este keepalive para no cortar el audio
      if (isIOS) {
        keepAliveInterval = setInterval(() => {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        }, 500);
      }

      const cleanup = () => {
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }
        setIsSpeaking(false);
      };

      const speakChunk = (index: number) => {
        if (index >= chunks.length) {
          cleanup();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[index]);
        utterance.lang = 'es-MX';
        utterance.volume = 1.0;
        utterance.rate = isIOS ? 0.95 : isAndroid ? 1.0 : 1.0;
        utterance.pitch = isIOS ? 1.15 : 1.0;

        const voice = getBestSpanishVoice();
        if (voice) utterance.voice = voice;

        if (index === 0) setIsSpeaking(true);

        utterance.onend = () => {
          currentIndex++;
          // Pequeño delay entre chunks para iOS
          setTimeout(() => speakChunk(currentIndex), isIOS ? 50 : 0);
        };

        utterance.onerror = (e) => {
          if (e.error !== 'interrupted') {
            console.warn('Speech error:', e.error);
            cleanup();
          }
        };

        window.speechSynthesis.speak(utterance);
      };

      setTimeout(() => speakChunk(0), isIOS ? 150 : 0);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        doSpeak();
      };
      setTimeout(doSpeak, 300);
    } else {
      doSpeak();
    }
  };

  // Esta función ya no se necesita como separada, pero mantener referencia por si acaso
  const speakTextFallback = speakText;

  const buildSpeechFromProposal = (proposal: GeminiResponse): string => {
    const cleanText = (str: string) => str
      .replace(/[\u{1F000}-\u{1FAFF}]/gu, '')
      .replace(/[\u{2600}-\u{27FF}]/gu, '')
      .replace(/[✅❌⚠️💰📊🎉🙏👍🔔💳🏦🎯📈💡🌟⭐😊🤖]/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\bMXN\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    const formatMoney = (amount: number) =>
      `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(amount)} pesos`;

    const parts: string[] = [];

    if (proposal.operation === 'query') {
      // Para consultas, solo leer el mensaje limpio y corto
      const msg = cleanText(proposal.result.user_feedback_message || '');
      // Máximo 150 chars para no aburrir
      return msg.length > 150 ? msg.substring(0, 147) + '.' : msg;
    }

    if (proposal.operation === 'create' && proposal.result.create?.event) {
      const event = proposal.result.create.event;
      const kindMap: Record<string, string> = {
        expense: 'gasto',
        income: 'ingreso',
        debt_increase: 'cargo a tarjeta',
        debt_payment: 'pago de deuda',
        loan_given: 'préstamo',
        loan_repayment_received: 'cobro',
        refund: 'devolución',
        loss: 'pérdida'
      };

      const kindText = kindMap[event.kind || ''] || 'movimiento';
      const amount = event.amount != null ? formatMoney(event.amount) : null;
      const description = cleanText(event.description || event.merchant?.name || '');
      const account = cleanText(event.accounts?.primary_account_ref?.name || '');

      // Mensaje corto y directo
      let msg = amount ? `${kindText} de ${amount}` : kindText;
      if (description) msg += `, ${description}`;
      if (account) msg += `, en ${account}`;
      parts.push(msg + '.');
    }

    if (proposal.operation === 'create_goal' && proposal.result.create_goal?.goal) {
      const goal = proposal.result.create_goal.goal;
      parts.push(`Objetivo: ${goal.name}, meta ${formatMoney(goal.target_amount || 0)}.`);
    }

    // Pregunta de confirmación corta
    if (proposal.status === 'ready_to_confirm') {
      parts.push('¿Lo registramos?');
    } else if (proposal.status === 'needs_clarification') {
      const questions = proposal.follow_up_questions?.[0];
      if (questions) {
        parts.push(cleanText(questions));
      } else {
        parts.push('¿Me das más detalles?');
      }
    }

    return parts.join(' ');
  };

  const handleTextInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    lastInputWasVoiceRef.current = false;
    await processInput({ text: inputText });
    setInputText('');
  };

  const processInput = async (input: { text?: string; audio?: string; audioMimeType?: string; image?: string; images?: string[]; instruction?: string }) => {
    // ⚠️ Capturar el proposal ANTES de cualquier setState para evitar el stale closure bug.
    // Si usáramos `proposal` dentro del try/catch, React ya lo habría puesto a null
    // con setProposal(null) pero el closure aún tendría el valor viejo — enviando
    // el proposal anterior como active_proposal a Gemini y confundiéndola.
    const capturedProposal = proposal;

    try {
      setIsProcessing(true);
      setError(null);
      setProposal(null);
      
      const debtBalances: Record<string, number> = {};
      if (analytics?.allDebts) {
        Object.entries(analytics.allDebts).forEach(([name, value]: [string, any]) => {
          if (Math.abs(value) > 0.01) debtBalances[name] = value;
        });
      }

      const loanBalances: Record<string, number> = {};
      if (analytics?.allLoans) {
        Object.entries(analytics.allLoans).forEach(([name, value]: [string, any]) => {
          if (Math.abs(value) > 0.01) loanBalances[name] = value;
        });
      }

      // Use pre-calculated balances from analytics if available to avoid full DB scan
      const rawAccountBalances: Record<string, number> = analytics?.accountBalances || {};
      const accountBalances: Record<string, number> = {};
      
      if (!analytics?.accountBalances) {
        try {
          const q = query(collection(db, 'events'), where('user_id', '==', user.id));
          const snapshot = await getDocs(q);
          
          let sqliteEvents: any[] = [];
          try {
            const res = await fetch(`/api/events?userId=${user.id}`);
            if (res.ok) {
              sqliteEvents = await res.json();
            }
          } catch (e) {
            console.error("Error fetching SQLite events:", e);
          }

          const fakeSnapshot = {
            forEach: (cb: any) => {
              const seenIds = new Set<string>();
              snapshot.forEach((doc: any) => {
                seenIds.add(doc.id);
                cb(doc);
              });
              sqliteEvents.forEach(e => {
                if (!seenIds.has(e.id)) {
                  cb({ id: e.id, data: () => e });
                }
              });
            }
          };

          fakeSnapshot.forEach(doc => {
            const e = doc.data();
            const amount = e.amount || 0;
            const kind = e.kind;
            if (e.account_name) {
              if (['income', 'refund', 'loan_repayment_received'].includes(kind)) {
                rawAccountBalances[e.account_name] = (rawAccountBalances[e.account_name] || 0) + amount;
              } else if (['expense', 'loss', 'debt_payment', 'loan_given', 'debt_increase'].includes(kind)) {
                rawAccountBalances[e.account_name] = (rawAccountBalances[e.account_name] || 0) - amount;
              }
            }
          });
        } catch (err) {
          console.error("Error calculating balances:", err);
        }
      }

      // Filter out zero balances
      Object.entries(rawAccountBalances).forEach(([name, value]) => {
        if (Math.abs(value) > 0.01) accountBalances[name] = value;
      });

      // Use configured accounts if available, otherwise fallback to recent events
      let existingAccounts: any[] = [];
      if (user?.accounts && user.accounts.length > 0) {
        existingAccounts = user.accounts.map((acc: any) => ({
          name: acc.name,
          type: acc.type === 'credit' ? 'credit_card' : acc.type,
          cards: acc.cards || [],
          interest_rate: acc.interest_rate
        }));
      } else {
        existingAccounts = recentEvents.slice(0, 50)
          .map(e => e.account_name)
          .filter((v, i, a) => v && a.indexOf(v) === i)
          .map(name => ({ name, type: name.toLowerCase().includes('crédito') || name.toLowerCase().includes('card') ? 'credit_card' : 'other' }));
      }

      const existingCategories = userCategories.length > 0 
        ? userCategories 
        : recentEvents.slice(0, 50)
            .map((e: any) => e.category)
            .filter((v: any, i: number, a: any[]) => v && a.indexOf(v) === i);

      const knownCounterparties = [
        ...recentEvents.slice(0, 50).map(e => e.merchant_name),
        ...existingAccounts.map(a => a.name)
      ].filter((v, i, a) => v && a.indexOf(v) === i);

      // Strip large images from active_proposal to save tokens
      // Use a safe clone method to avoid circular structure issues
      const safeClone = (obj: any) => {
        try {
          return JSON.parse(safeJsonStringify(obj));
        } catch (e) {
          console.warn("Circular structure detected in proposal, using fallback clone", e);
          // Fallback: shallow clone or manual deep clone if needed
          return { ...obj };
        }
      };
      // Usar capturedProposal (no el closure stale) para evitar enviar proposal
      // equivocado como contexto cuando el usuario envía un mensaje nuevo
      const sanitizedProposal = capturedProposal ? safeClone(capturedProposal) : null;
      if (sanitizedProposal?.result?.create?.event?.receipt_image) {
        sanitizedProposal.result.create.event.receipt_image = "[IMAGE_DATA]";
      }

      const context: GeminiContext = {
        now: new Date().toLocaleString('sv-SE', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }).replace(' ', 'T'),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        default_currency: "MXN",
        allowed_payment_methods: ["cash", "debit_card", "credit_card", "bank_transfer"],
        known_entities: {
          accounts: existingAccounts.length > 0 ? existingAccounts : [{ id: "acc_cash", name: "Efectivo", type: "cash" }],
          categories: existingCategories.length > 0 ? existingCategories : ["Comida", "Transporte", "Hogar", "Salud", "Entretenimiento", "Deudas", "Tarjeta de Crédito", "Préstamo"],
          counterparties: knownCounterparties
        },
        debt_balances: debtBalances,
        loan_balances: loanBalances,
        account_balances: accountBalances,
        recent_events: recentEvents.slice(0, 15).map(e => ({
          event_id: e.id,
          kind: e.kind,
          amount: e.amount,
          currency: e.currency,
          occurred_at: e.occurred_at,
          summary: e.description || e.merchant_name,
          account: e.account_name
        })),
        active_proposal: sanitizedProposal
      };

      const result = await processMultimodalInput(input, context);
      console.log("Raw Gemini Result:", result);
      if (result) {
        // Assign a shared group ID to all events from this prompt so they can be deleted together
        result.shared_group_id = crypto.randomUUID();

        // If we have an image input, attach it to the event
        if (input.image && result.result?.create?.event) {
          result.result.create.event.receipt_image = input.image;
        }

        // Refinement logic: merge with previous proposal if it's a creation refinement
        // Usar capturedProposal (no el closure `proposal`) para que el merge use
        // el proposal que estaba activo cuando el usuario envió el mensaje
        if (capturedProposal?.result?.create?.event && result.result?.create?.event && result.operation === 'create') {
          const prevEvent = capturedProposal.result.create.event;
          const nextEvent = result.result.create.event;
          
          // Merge accounts carefully
          const mergedAccounts = {
            ...prevEvent.accounts,
            ...nextEvent.accounts,
            primary_account_ref: nextEvent.accounts?.primary_account_ref || prevEvent.accounts?.primary_account_ref
          };

          result.result.create.event = {
            ...prevEvent,
            ...nextEvent,
            accounts: mergedAccounts,
            receipt_image: nextEvent.receipt_image || prevEvent.receipt_image
          };
        }

        setProposal(result);
        
        // Solo hablar si el input fue por voz
        if (result && lastInputWasVoiceRef.current) {
          const speechText = buildSpeechFromProposal(result);
          speakText(speechText);
        }
        lastInputWasVoiceRef.current = false;
      } else {
        setError("No pude procesar la solicitud. El servidor de IA devolvió una respuesta vacía.");
      }
    } catch (err: any) {
      console.error("processInput error:", err);
      if (err.message === 'API_KEY_MISSING') {
        setError(`El servicio de IA no está configurado. Por favor, configura la variable de entorno GEMINI_API_KEY.`);
      } else if (err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
        setError(`Se ha agotado la cuota de la IA. Por favor, selecciona una API Key de pago para continuar.`);
      } else if (err.message === 'INVALID_JSON_RESPONSE') {
        setError(`La IA devolvió un formato no válido. Intenta simplificar tu mensaje.`);
      } else {
        setError(`Error al conectar con la IA: ${err.message || "Error desconocido"}. Verifica tu conexión.`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    if (isPremium === false && audioUsage >= 3) {
      setError("Has alcanzado el límite de 3 audios por mes del plan gratuito. ¡Mejora a Pro para uso ilimitado! 🎙️");
      return;
    }

    // Desbloquear Web Speech API en iOS Safari (requiere gesto del usuario)
    if (window.speechSynthesis) {
      const unlock = new SpeechSynthesisUtterance('');
      unlock.volume = 0;
      window.speechSynthesis.speak(unlock);
      window.speechSynthesis.cancel();
    }

    stopSpeaking(); // Detener voz si ContaBot estaba hablando
    lastInputWasVoiceRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        setIsVoiceProcessing(true); // Start voice processing animation
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = (reader.result as string).split(',')[1];
          processInput({ audio: base64Audio, audioMimeType: mediaRecorder.mimeType })
            .catch(err => console.error("Error processing voice input:", err))
            .finally(() => setIsVoiceProcessing(false)); // Stop voice processing animation when done
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      incrementUsage("audio");
    } catch (err) {
      setError("No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      setIsVoiceProcessing(true);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPremium === false && photoUsage >= 3) {
      setError("Has alcanzado el límite de 3 fotos por mes del plan gratuito. ¡Mejora a Pro para uso ilimitado! 📸");
      return;
    }

    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length === 1) {
      const file = files[0];
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
        setShowCropModal(true);
        setShowCameraMenu(false);
      };
    } else {
      setSelectedFiles(files);
      setShowImageGroupModal(true);
      setShowCameraMenu(false);
    }
    
    incrementUsage("photo");
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleProcessMultipleImages = async (mode: 'single' | 'multiple') => {
    setIsProcessing(true);
    
    try {
      const base64Images = await Promise.all(selectedFiles.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              resolve(reader.result.split(',')[1]);
            } else {
              reject(new Error('Failed to convert image to base64'));
            }
          };
          reader.onerror = reject;
        });
      }));

      const instruction = mode === 'single' 
        ? "These images are all parts of the SAME single receipt/ticket. Combine them to extract one single transaction." 
        : "These images are from DIFFERENT receipts. Please extract a separate transaction for EACH image/receipt.";

      await processInput({ images: base64Images, instruction });
    } catch (e) {
      console.error(e);
      setError("Error al procesar las imágenes.");
      setIsProcessing(false);
    } finally {
      setShowImageGroupModal(false);
      setSelectedFiles([]);
    }
  };

  const startWebcam = async () => {
    setShowWebcamModal(true);
    setShowCameraMenu(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setError("No se pudo acceder a la cámara. Asegúrate de dar permisos.");
      setShowWebcamModal(false);
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowWebcamModal(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImageToCrop(dataUrl);
        setShowCropModal(true);
        stopWebcam();
      }
    }
  };

  const handleConfirmCrop = async () => {
    if (imgRef.current && completedCrop) {
      setIsProcessing(true);
      try {
        const croppedImage = await getCroppedImg(imgRef.current, completedCrop);
        const response = await fetch(croppedImage);
        const blob = await response.blob();
        
        const base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              resolve(reader.result.split(',')[1]);
            } else {
              reject(new Error('Failed to convert image to base64'));
            }
          };
          reader.onerror = (error) => reject(error);
        });

        await processInput({ image: base64Image });
        
        setShowCropModal(false);
        setImageToCrop(null);
        setCrop(undefined);
        setCompletedCrop(undefined);
      } catch (e) {
        console.error(e);
        setError("Error al procesar la imagen recortada.");
        setIsProcessing(false);
      }
    }
  };

  const handleFullScreen = () => {
    if (receiptImgRef.current) {
      if (receiptImgRef.current.requestFullscreen) {
        receiptImgRef.current.requestFullscreen();
      } else if ((receiptImgRef.current as any).webkitRequestFullscreen) { /* Safari */
        (receiptImgRef.current as any).webkitRequestFullscreen();
      } else if ((receiptImgRef.current as any).msRequestFullscreen) { /* IE11 */
        (receiptImgRef.current as any).msRequestFullscreen();
      }
    }
  };

  const confirmProposal = async () => {
    if (!proposal?.result || !user?.id) return;
    
    setIsProcessing(true);
    try {
      let body = null;

      if (proposal.operation === 'create' && proposal.result.create?.event) {
        body = proposal.result.create.event;
      } else if (proposal.operation === 'update' && proposal.result.update) {
        body = { ...proposal.result.update, isUpdate: true };
      } else if (proposal.operation === 'create_goal' && proposal.result.create_goal?.goal) {
        // Handle Create Goal
        const goalData = proposal.result.create_goal.goal;
        const newGoal = {
          user_id: user.id,
          name: goalData.name,
          target_amount: goalData.target_amount,
          account_name: goalData.account_name,
          deadline: goalData.deadline || null,
          emoji: goalData.emoji || '🎯',
          color: goalData.color || COLORS[Math.floor(Math.random() * COLORS.length)],
          created_at: new Date().toISOString()
        };
        
        await addDoc(collection(db, 'goals'), newGoal);
        await fetchData();
        setProposal(null);
        setSuccess("Objetivo creado con éxito.");
        setTimeout(() => setSuccess(null), 4000);
        setIsProcessing(false);
        return;
      }

      if (proposal.operation === 'query') {
        setProposal(null);
        setIsProcessing(false);
        return;
      }

      if (!body) {
        setIsProcessing(false);
        return;
      }

      if (body.isUpdate && body.target?.event_id) {
        // Handle Update from proposal
        const eventRef = doc(db, 'events', body.target.event_id);
        const eventDoc = await getDoc(eventRef);
        if (eventDoc.exists()) {
          const existingData = eventDoc.data();
          const updates: any = {};
          if (body.patch) {
            body.patch.forEach((p: any) => {
              const keys = p.path.split('.');
              if (keys.length === 1) updates[keys[0]] = p.new_value;
            });
          }
          Object.keys(updates).forEach(key => {
            if (updates[key] === undefined) delete updates[key];
          });
          await updateDoc(eventRef, updates);
        }
      } else {
        // Handle Create
        const eventsToSave: any[] = [];
        const hasPending = proposal.pending_proposals && proposal.pending_proposals.length > 0;
        
        // Determine if we should group these events (only for specific paired transactions)
        let linkedProposalIndex = -1;
        if (hasPending) {
          const primaryKind = proposal.result.create?.event?.kind;
          const primaryAmount = proposal.result.create?.event?.amount;
          
          // Find the first pending proposal that matches the dual-entry pattern
          linkedProposalIndex = proposal.pending_proposals.findIndex((p: any) => {
            const pendingKind = p.result?.create?.event?.kind;
            const pendingAmount = p.result?.create?.event?.amount;
            
            const isLoanGiven = primaryKind === 'loan_given' && pendingKind === 'expense';
            const isDebtIncrease = primaryKind === 'debt_increase' && pendingKind === 'income';
            const isDebtPayment = primaryKind === 'debt_payment' && pendingKind === 'expense';
            const isLoanRepayment = primaryKind === 'loan_repayment_received' && pendingKind === 'income';
            
            const isTransfer = (primaryKind === 'expense' && pendingKind === 'income') && 
              primaryAmount === pendingAmount &&
              (proposal.result.create?.event?.category?.toLowerCase().includes('traspaso') || proposal.result.create?.event?.category?.toLowerCase().includes('transferencia'));
              
            return isLoanGiven || isDebtIncrease || isDebtPayment || isLoanRepayment || isTransfer;
          });
        }

        const groupId = linkedProposalIndex !== -1 ? crypto.randomUUID() : null;
        
        const normalizeEvent = (ev: any) => {
          const normalized = { ...ev };
          if (!normalized.account_name && normalized.accounts?.primary_account_ref) {
            normalized.account_name = typeof normalized.accounts.primary_account_ref === 'string' 
              ? normalized.accounts.primary_account_ref 
              : normalized.accounts.primary_account_ref.name;
          }
          // Remove helper fields
          delete normalized.isUpdate;
          Object.keys(normalized).forEach(key => {
            if (normalized[key] === undefined) delete normalized[key];
          });
          return normalized;
        };

        // Primary event
        const primaryEvent = normalizeEvent({
          ...body,
          user_id: user.id,
          created_at: new Date().toISOString(),
          group_id: groupId,
          batch_id: proposal.shared_group_id
        });
        eventsToSave.push(primaryEvent);

        // Only include the linked pending proposal if we found one
        if (linkedProposalIndex !== -1) {
          const p = proposal.pending_proposals[linkedProposalIndex];
          if (p.operation === 'create' && p.result?.create?.event) {
            const secondaryEvent = normalizeEvent({
              ...p.result.create.event,
              user_id: user.id,
              created_at: new Date().toISOString(),
              group_id: groupId,
              batch_id: proposal.shared_group_id
            });
            eventsToSave.push(secondaryEvent);
          }
        }
        
        // Save all events atomically using writeBatch
        if (eventsToSave.length === 1) {
          await addDoc(collection(db, 'events'), eventsToSave[0]);
        } else {
          const batch = writeBatch(db);
          eventsToSave.forEach(ev => {
            const newDocRef = doc(collection(db, 'events'));
            batch.set(newDocRef, ev);
          });
          await batch.commit();
        }
        
        // Auto-sync: agregar categoría nueva a la lista maestra
        const newEventCategory = eventsToSave?.[0]?.category;
        if (newEventCategory && user?.uid && 
            !userCategories.includes(newEventCategory)) {
          const updatedCats = [...userCategories, newEventCategory].sort();
          setUserCategories(updatedCats);
          setDoc(
            doc(db, 'users', user.uid),
            { categories: updatedCats },
            { merge: true }
          ).catch(e => console.error("Error auto-sync categoría:", e));
        }
        
        // Refresh data immediately to show the saved event
        await fetchData();

        // Verificar si alguna meta fue completada
        if (user?.uid) {
          fetch('/api/notifications/check-goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firebase_uid: user.uid })
          }).catch(e => console.error('Error checking goals:', e));
        }

        // Remove the linked proposal from pending_proposals if it exists
        let remainingProposals = proposal.pending_proposals || [];
        if (linkedProposalIndex !== -1) {
          remainingProposals = remainingProposals.filter((_: any, index: number) => index !== linkedProposalIndex);
        }

        // If there are remaining pending proposals, move to the next one instead of finishing
        if (remainingProposals.length > 0) {
          const nextProposal = remainingProposals[0];
          nextProposal.shared_group_id = proposal.shared_group_id;
          // Pass any remaining pending proposals to the next one
          if (remainingProposals.length > 1) {
            nextProposal.pending_proposals = remainingProposals.slice(1);
          } else {
            nextProposal.pending_proposals = [];
          }
          
          setProposal(nextProposal);
          setSuccess("Movimiento guardado. Verificando el siguiente...");
          speakText('Movimiento guardado. Verificando el siguiente.');
          setTimeout(() => setSuccess(null), 3000);
          setIsProcessing(false);
          return;
        }
      }
      
      const eventOccurredAt = body.occurred_at || new Date().toISOString();
      
      // Helper to convert UTC event time to Local ISO string for comparison
      const toLocalISO = (dateStr: string) => {
        if (!dateStr) return new Date().toISOString();
        if (dateStr.length === 10) return `${dateStr}T12:00:00`;
        const d = new Date(dateStr);
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().slice(0, 23);
      };
      
      const localEventDate = toLocalISO(eventOccurredAt);
      const isOutsideFilter = localEventDate < dateRange.start || localEventDate > dateRange.end;
      
      const eventDate = new Date(eventOccurredAt);
      
      // Reset proposal since we processed everything
      setProposal(null);
      
      if (isOutsideFilter) {
        // Use UTC for display if it's just a date string to avoid shifting
        const dateStr = eventOccurredAt.length === 10 
          ? eventDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
          : eventDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
        setSuccess(`¡Movimientos registrados! Nota: Son del ${dateStr}, por lo que no aparecerán en tu vista actual.`);
        speakText('¡Listo! El movimiento fue registrado con éxito.');
        setTimeout(() => setSuccess(null), 8000);
      } else {
        setSuccess("Movimientos registrados con éxito.");
        speakText('¡Listo! El movimiento fue registrado con éxito.');
        setTimeout(() => setSuccess(null), 4000);
      }
      
      // Already fetched data above if we continued, but safe to call again or just leave it
      // if we are here, we are finishing the flow
    } catch (err: any) {
      console.error("Error confirming proposal:", err);
      if (err.code === 'permission-denied' || (err.message && err.message.includes('permission'))) {
        setError('Error de permisos: No tienes permiso para guardar este movimiento. Verifica las Reglas de Firestore.');
      } else {
        setError("Error al procesar la propuesta");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    let timer: any;
    if (isDeleting && deleteConfirmTimer > 0) {
      timer = setInterval(() => {
        setDeleteConfirmTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isDeleting, deleteConfirmTimer]);

  useEffect(() => {
    let timer: any;
    if (isDeletingAccount && deleteAccountConfirmTimer > 0) {
      timer = setInterval(() => {
        setDeleteAccountConfirmTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isDeletingAccount, deleteAccountConfirmTimer]);

  useEffect(() => {
    let timer: any;
    if (isDeletingGoal && deleteGoalConfirmTimer > 0) {
      timer = setInterval(() => {
        setDeleteGoalConfirmTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isDeletingGoal, deleteGoalConfirmTimer]);

  const handleDeleteEvent = async (eventId: string) => {
    setIsProcessing(true);
    try {
      const eventToDelete = editingEvent;
      if (!eventToDelete) return;

      // Delete the primary event
      if (eventId.startsWith('int_')) {
        const res = await fetch(`/api/events/${eventId}?userId=${user.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error("Error deleting from SQLite");
      } else {
        try {
          await deleteDoc(doc(db, 'events', eventId));
        } catch (e: any) {
          console.warn("Error deleting from Firestore, continuing to SQLite:", e);
        }
        const res = await fetch(`/api/events/${eventId}?userId=${user.id}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.error !== "Movimiento no encontrado o no autorizado") {
            throw new Error(data.error || "Error deleting from SQLite");
          }
        }
      }

      // If it's part of a batch or group, delete the linked events too
      if (eventToDelete.batch_id) {
        try {
          const q = query(
            collection(db, 'events'), 
            where('batch_id', '==', eventToDelete.batch_id),
            where('user_id', '==', user.id)
          );
          const querySnapshot = await getDocs(q);
          
          for (const eventDoc of querySnapshot.docs) {
            if (eventDoc.id !== eventId) {
              try {
                await deleteDoc(doc(db, 'events', eventDoc.id));
              } catch (e: any) {
                console.warn("Error deleting linked event from Firestore:", e);
              }
              const res = await fetch(`/api/events/${eventDoc.id}?userId=${user.id}`, { method: 'DELETE' });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                if (data.error !== "Movimiento no encontrado o no autorizado") {
                  throw new Error(data.error || "Error deleting linked event from SQLite");
                }
              }
            }
          }
        } catch (e: any) {
          console.warn("Error querying batch events from Firestore:", e);
          // Fallback: delete from SQLite directly if Firestore query fails
          const res = await fetch(`/api/events/batch/${eventToDelete.batch_id}?userId=${user.id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error("Error deleting batch from SQLite");
        }
      } else if (eventToDelete.group_id) {
        try {
          const q = query(
            collection(db, 'events'), 
            where('group_id', '==', eventToDelete.group_id),
            where('user_id', '==', user.id)
          );
          const querySnapshot = await getDocs(q);
          
          for (const eventDoc of querySnapshot.docs) {
            if (eventDoc.id !== eventId) {
              try {
                await deleteDoc(doc(db, 'events', eventDoc.id));
              } catch (e: any) {
                console.warn("Error deleting linked event from Firestore:", e);
              }
              const res = await fetch(`/api/events/${eventDoc.id}?userId=${user.id}`, { method: 'DELETE' });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                if (data.error !== "Movimiento no encontrado o no autorizado") {
                  throw new Error(data.error || "Error deleting linked event from SQLite");
                }
              }
            }
          }
        } catch (e: any) {
          console.warn("Error querying group events from Firestore:", e);
          // Fallback: delete from SQLite directly if Firestore query fails
          const res = await fetch(`/api/events/group/${eventToDelete.group_id}?userId=${user.id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error("Error deleting group from SQLite");
        }
      }

      setIsDeleting(false);
      setEditingEvent(null);
      await fetchData();
      setSuccess("Movimientos eliminados");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Error deleting event:", err);
      if (err.code === 'permission-denied' || (err.message && err.message.includes('permissions'))) {
        setError('Error de permisos: No tienes permiso para eliminar este movimiento.');
      } else {
        setError("Error al eliminar el movimiento");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateEvent = async (updatedEvent: any) => {
    setIsProcessing(true);
    try {
      const { id, ...data } = updatedEvent;
      
      // Clean undefined fields
      const cleanedData = { ...data };
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === undefined) {
          delete cleanedData[key];
        }
      });

      // If it's a debt payment or increase, and the user explicitly changed the account to a bank account,
      // we should assume they are trying to change the creditor (e.g. paying a BBVA credit card).
      // So we update the merchant_name to match the account_name.
      if (['debt_payment', 'debt_increase'].includes(cleanedData.kind)) {
        if (editingEvent && editingEvent.account_name !== cleanedData.account_name && cleanedData.account_name) {
          // If they changed the account of a debt event, they are changing the creditor.
          cleanedData.merchant_name = cleanedData.account_name;
        }
        
        const isCashOrDebit = ['Efectivo', 'Cash', 'cash', 'efectivo', 'Debit Card', 'Débito'].some(c => cleanedData.account_name?.toLowerCase().includes(c.toLowerCase()));
        const selectedAccount = user?.accounts?.find((a: any) => a.name === cleanedData.account_name);
        const isDebitAccount = selectedAccount && ['debit', 'cash', 'savings'].includes(selectedAccount.type);

        if ((isCashOrDebit || isDebitAccount) && cleanedData.kind === 'debt_increase' && !editingEvent.group_id) {
          // If it's a single debt_increase (credit card expense) and the account is a debit account,
          // they probably meant it was a regular expense, not a credit card expense.
          cleanedData.kind = 'expense';
        }

        if (editingEvent && editingEvent.description !== cleanedData.description) {
          // If they changed the description, they might be trying to change the creditor name
          cleanedData.merchant_name = cleanedData.description;
        }
      } else if (cleanedData.kind === 'expense' && !editingEvent.group_id) {
        const isCreditCard = ['Crédito', 'Credit', 'Tarjeta', 'Card'].some(c => cleanedData.account_name?.toLowerCase().includes(c.toLowerCase()));
        const selectedAccount = user?.accounts?.find((a: any) => a.name === cleanedData.account_name);
        const isCreditAccount = selectedAccount && selectedAccount.type === 'credit';

        if (isCreditCard || isCreditAccount) {
          // If it's a single expense and the account is a credit card,
          // it should be a debt_increase (credit card expense).
          cleanedData.kind = 'debt_increase';
        }
      }

      // Update the primary event
      if (id.startsWith('int_')) {
        // This is an interest event generated by the server, it only exists in SQLite
        const res = await fetch(`/api/events/${id}?userId=${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanedData)
        });
        if (!res.ok) throw new Error("Error updating SQLite event");
      } else {
        try {
          await setDoc(doc(db, 'events', id), cleanedData, { merge: true });
        } catch (e: any) {
          console.warn("Error updating Firestore event, continuing to SQLite:", e);
        }
        const res = await fetch(`/api/events/${id}?userId=${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanedData)
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.error !== "Movimiento no encontrado o no autorizado") {
            throw new Error(data.error || "Error updating SQLite event");
          }
        }
      }

      // If it's part of a group, update the linked event too
      if (updatedEvent.group_id) {
        try {
          const q = query(
            collection(db, 'events'), 
            where('group_id', '==', updatedEvent.group_id),
            where('user_id', '==', user.id)
          );
          const querySnapshot = await getDocs(q);
          
          for (const eventDoc of querySnapshot.docs) {
            if (eventDoc.id !== id) {
              // Update linked event with same basic info but keep its own kind/amount logic if needed
              // For loans/debts, they usually share everything except kind (and sometimes amount sign)
              const linkedUpdates: any = {
                description: cleanedData.description,
                amount: cleanedData.amount,
                category: cleanedData.category,
                occurred_at: cleanedData.occurred_at,
                merchant_name: cleanedData.merchant_name
              };
              
              // Clean undefined
              Object.keys(linkedUpdates).forEach(k => {
                if (linkedUpdates[k] === undefined) delete linkedUpdates[k];
              });
              
              try {
                await setDoc(doc(db, 'events', eventDoc.id), linkedUpdates, { merge: true });
              } catch (e: any) {
                console.warn("Error updating linked Firestore event:", e);
              }
              const res = await fetch(`/api/events/${eventDoc.id}?userId=${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(linkedUpdates)
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                if (data.error !== "Movimiento no encontrado o no autorizado") {
                  throw new Error(data.error || "Error updating linked SQLite event");
                }
              }
            }
          }
        } catch (e: any) {
          console.warn("Error querying group events from Firestore:", e);
          // Fallback: update SQLite directly if Firestore query fails
          const res = await fetch(`/api/events/group/${updatedEvent.group_id}?userId=${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleanedData)
          });
          if (!res.ok) throw new Error("Error updating SQLite group");
        }
      }

      setEditingEvent(null);
      await fetchData();
      setSuccess("Movimiento actualizado");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Error updating event:", err);
      if (err.code === 'permission-denied' || (err.message && err.message.includes('permissions'))) {
        setError('Error de permisos: No tienes permiso para actualizar este movimiento.');
      } else {
        setError("Error al actualizar el movimiento");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const renderAuth = () => (
    <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950 min-h-screen pb-[env(safe-area-inset-bottom)]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 px-6 pt-0 pb-8 sm:px-8 sm:pb-10 rounded-[2.5rem] shadow-2xl w-full max-w-[450px] border border-gray-100 dark:border-gray-800 overflow-hidden"
      >
        <div className="text-center -mx-10 -mt-10 mb-8">
          <div className="bg-emerald-600 pt-14 pb-10 px-10 flex flex-col items-center">
            <img src={APP_LOGO} alt="Logo" className="w-14 h-14 mb-3 rounded-2xl shadow-lg" referrerPolicy="no-referrer" />
            <h1 className="text-xl font-black text-white tracking-tight">ContaBot</h1>
            <p className="text-emerald-100 text-xs font-medium mt-1">Tu asistente financiero inteligente</p>
          </div>
          <h2 className="text-xl font-bold dark:text-white tracking-tight mt-6 px-4">
            {authMode === 'login' ? '¡Hola de nuevo!' : 'Regístrate para empezar'}
          </h2>
        </div>

        {/* Auth Method Switcher */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-8">
            <button 
              onClick={() => setAuthMethod('email')}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                authMethod === 'email' ? "bg-white dark:bg-gray-700 shadow-sm text-emerald-600 dark:text-emerald-400" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <Mail size={16} /> Correo
            </button>
            <button 
              onClick={() => setAuthMethod('phone')}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                authMethod === 'phone' ? "bg-white dark:bg-gray-700 shadow-sm text-emerald-600 dark:text-emerald-400" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <Phone size={16} /> Teléfono
            </button>
          </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex flex-col gap-2 text-red-600 dark:text-red-400 text-sm font-medium"
          >
            <div className="flex items-center gap-3">
              <AlertCircle size={18} />
              <span className="flex-1">{error}</span>
            </div>
            {(error.includes('Configuración') || error.toLowerCase().includes('permisos') || error.toLowerCase().includes('permissions')) && (
              <button 
                onClick={() => setShowRulesHelper(true)}
                className="ml-7 text-xs font-bold underline hover:text-red-700 text-left"
              >
                Ver reglas de Firestore requeridas para solucionar esto
              </button>
            )}

            {error.includes('https://console.firebase.google.com') && (
              <a 
                href={error.split(': ').pop()} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-7 text-xs font-bold underline hover:text-red-700 text-left"
              >
                {error.includes('construyendo') ? 'Ver progreso en Firebase' : 'Crear índice en Firebase Console'}
              </a>
            )}
          </motion.div>
        )}

        {authMethod === 'email' ? (
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Correo electrónico</label>
              <input 
                type="email" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full px-5 py-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-900 transition-all outline-none dark:text-white placeholder:text-gray-400"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Contraseña</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={authMode === 'login' ? "Tu contraseña" : "Mínimo 8 caracteres"}
                className="w-full px-5 py-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-900 transition-all outline-none dark:text-white placeholder:text-gray-400"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={isProcessing}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-bold text-lg transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isProcessing && <Loader2 className="animate-spin" size={20} />}
              {authMode === 'login' ? 'Continuar' : 'Siguiente'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Número de teléfono</label>
              <input 
                type="tel" 
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+52 123 456 7890"
                className="w-full px-5 py-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-900 transition-all outline-none dark:text-white placeholder:text-gray-400"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Contraseña</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={authMode === 'login' ? "Tu contraseña" : "Mínimo 8 caracteres"}
                className="w-full px-5 py-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-900 transition-all outline-none dark:text-white placeholder:text-gray-400"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={isProcessing}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-bold text-lg transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isProcessing && <Loader2 className="animate-spin" size={20} />}
              {authMode === 'login' ? 'Continuar' : 'Siguiente'}
            </button>
          </form>
        )}

        <div className="relative my-10">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100 dark:border-gray-800"></div>
          </div>
          <div className="relative flex justify-center text-sm uppercase">
            <span className="bg-white dark:bg-gray-900 px-4 text-gray-400 font-bold">o</span>
          </div>
        </div>

        <div className="space-y-3">
          <button 
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-3.5 px-6 rounded-full border-2 border-gray-100 dark:border-gray-800 flex items-center justify-center gap-3 font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {authMode === 'login' ? 'Continuar con Google' : 'Registrarte con Google'}
          </button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">
            {authMode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes una cuenta?'}
          </p>
          <button 
            onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            className="text-gray-900 dark:text-white font-black hover:underline decoration-emerald-500 decoration-2 underline-offset-4"
          >
            {authMode === 'login' ? 'Regístrate' : 'Iniciar sesión'}
          </button>
        </div>
      </motion.div>
    </div>
  );

  const renderFilterBar = () => {
    const adjustDate = (amount: number) => {
      const parts = filterDate.split('-');
      const year = parseInt(parts[0]);
      const month = parts[1] ? parseInt(parts[1]) - 1 : 0;
      const day = parts[2] ? parseInt(parts[2]) : 1;
      const date = new Date(year, month, day);

      if (filterType === 'day') date.setDate(date.getDate() + amount);
      else if (filterType === 'month') date.setMonth(date.getMonth() + amount);
      else if (filterType === 'year') date.setFullYear(date.getFullYear() + amount);

      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');

      if (filterType === 'day') setFilterDate(`${y}-${m}-${d}`);
      else if (filterType === 'month') setFilterDate(`${y}-${m}`);
      else if (filterType === 'year') setFilterDate(`${y}`);
    };

    const getFilterLabel = () => {
      if (filterType === 'all') return 'Todo el tiempo';
      const parts = filterDate.split('-');
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];

      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

      if (filterType === 'day') return `${day} ${months[parseInt(month) - 1]} ${year}`;
      if (filterType === 'month') return `${months[parseInt(month) - 1]} ${year}`;
      if (filterType === 'year') return year;
      return '';
    };

    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-gray-200/60 dark:border-gray-700 dark:shadow-none mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1 rounded-xl">
            {(['day', 'month', 'year', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setFilterType(t);
                  // Reset date to now when switching types to ensure valid format
                  const now = new Date();
                  const y = now.getFullYear();
                  const m = String(now.getMonth() + 1).padStart(2, '0');
                  const d = String(now.getDate()).padStart(2, '0');
                  if (t === 'day') setFilterDate(`${y}-${m}-${d}`);
                  else if (t === 'month') setFilterDate(`${y}-${m}`);
                  else if (t === 'year') setFilterDate(`${y}`);
                }}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                  filterType === t 
                    ? "bg-white dark:bg-gray-800 text-emerald-600 shadow-sm" 
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                )}
              >
                {t === 'day' ? 'Día' : t === 'month' ? 'Mes' : t === 'year' ? 'Año' : 'Todo'}
              </button>
            ))}
            {view === 'analytics' && (
              <>
                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
                <button
                  onClick={() => {
                    if (isPremium) {
                      setShowExportModal(true)
                    } else {
                      setError("La exportación es exclusiva de ContaBot Pro 👑")
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-emerald-500 transition-colors relative"
                  title="Exportar datos"
                >
                  <Download size={18} />
                  {!isPremium && (
                    <Crown size={8} className="absolute -top-0.5 -right-0.5 text-amber-500" />
                  )}
                </button>
              </>
            )}
          </div>

          {filterType !== 'all' && (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => adjustDate(-1)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all text-gray-400"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-200 min-w-[120px] justify-center">
                <Calendar size={18} className="text-emerald-500" />
                <span>{getFilterLabel()}</span>
              </div>
              <button 
                onClick={() => adjustDate(1)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all text-gray-400"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Ensure view is consistent with auth state
  useEffect(() => {
    if (!isLoading && !user && view !== 'auth') {
      setView('auth');
    }
  }, [isLoading, user, view]);

  const renderHome = () => {
    if (isLoading) return <HomeSkeleton />;
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <Loader2 className="animate-spin text-emerald-500" size={40} />
          <p className="text-gray-500 font-medium">Cargando perfil...</p>
        </div>
      );
    }

    const toggleSummary = (type: 'income' | 'expense' | 'debt' | 'loan') => {
      if (expandedSummary === type) {
        setExpandedSummary(null);
        setIsActivityExpanded(previousActivityState);
      } else {
        if (expandedSummary === null) {
          setPreviousActivityState(isActivityExpanded);
        }
        setExpandedSummary(type);
        setIsActivityExpanded(false);
      }
    };

    const getSectionForKind = (kind: string): 'income' | 'expense' | 'debt' | 'loan' => {
      if (['income', 'refund'].includes(kind)) return 'income';
      if (['expense', 'loss'].includes(kind)) return 'expense';
      if (['debt_increase', 'debt_payment'].includes(kind)) return 'debt';
      return 'loan';
    };

    const navigateToLinkedEvent = (currentEvent: any) => {
      // Buscar el evento vinculado por group_id
      const linked = recentEvents.find(e => e.group_id === currentEvent.group_id && e.id !== currentEvent.id);
      if (!linked) return;

      // Determinar qué sección abrir
      const targetSection = getSectionForKind(linked.kind);

      // Abrir la sección correcta
      setExpandedSummary(targetSection);
      setIsActivityExpanded(false);

      // Esperar a que se abra la sección, luego hacer scroll y resaltar
      setTimeout(() => {
        const el = document.getElementById(`summary-event-${linked.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setHighlightedEventId(linked.id);
        setHighlightSourceKind(currentEvent.kind);
        // Quitar el resaltado después de 2 segundos
        setTimeout(() => { setHighlightedEventId(null); setHighlightSourceKind(null); }, 2000);
      }, 450);
    };

    const renderEventList = (eventsToRender: any[], isRecentActivity: boolean = false, isSummaryExpanded: boolean = false) => {
      if (eventsToRender.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mb-4">
              <Wallet size={28} className="text-emerald-500" />
            </div>
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Sin movimientos aún
            </p>
            <p className="text-xs text-gray-400 font-normal max-w-[200px] leading-relaxed">
              Registra tu primer ingreso o gasto usando el campo de texto abajo
            </p>
          </div>
        );
      }

      const getEventColor = (kind: string) => {
        if (['income', 'refund'].includes(kind)) return 'text-emerald-400';
        if (['expense', 'loss'].includes(kind)) return 'text-red-400';
        if (['debt_increase', 'debt_payment'].includes(kind)) return 'text-amber-400';
        if (['loan_given', 'loan_repayment_received'].includes(kind)) return 'text-blue-400';
        return 'text-gray-400';
      };

      const renderHalfChain = (kind: string, position: 'top' | 'bottom') => {
        const colorClass = getEventColor(kind);
        
        if (position === 'top') {
          return (
            <g className={colorClass} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="m19 5 3-3" />
              <path d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z" />
              <path d="M13.5 7.5 L10.5 10.5" />
              <path d="M16.5 10.5 L13.5 13.5" />
            </g>
          );
        } else {
          return (
            <g className={colorClass} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="m2 22 3-3" />
              <path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z" />
            </g>
          );
        }
      };

      const renderCard = (event: any, isFirst: boolean, isSecond: boolean, linkedWithEvent?: any) => {
        const marginClass = isFirst ? "mb-0" : "mb-2 last:mb-0";
        const radiusClass = isFirst ? "rounded-t-2xl" : isSecond ? "rounded-b-2xl" : "rounded-2xl";
        const borderClass = isFirst ? "border border-gray-200 dark:border-gray-800 border-b border-b-gray-300 dark:border-b-gray-600" : isSecond ? "border border-t-0 border-gray-200 dark:border-gray-800" : "border border-gray-200 dark:border-gray-800";
        const isHighlighted = isSummaryExpanded && highlightedEventId === event.id;
        const highlightBg = (() => {
          if (!isHighlighted || !highlightSourceKind) return '';
          if (['income', 'refund'].includes(highlightSourceKind)) return 'bg-emerald-50 dark:bg-emerald-900/30';
          if (['expense', 'loss'].includes(highlightSourceKind)) return 'bg-red-50 dark:bg-red-900/30';
          if (['debt_increase', 'debt_payment'].includes(highlightSourceKind)) return 'bg-amber-50 dark:bg-amber-900/30';
          if (['loan_given', 'loan_repayment_received'].includes(highlightSourceKind)) return 'bg-blue-50 dark:bg-blue-900/30';
          return 'bg-emerald-50 dark:bg-emerald-900/30';
        })();
        const bgClass = isHighlighted
          ? highlightBg
          : isSummaryExpanded
          ? "bg-gray-50 dark:bg-gray-900/60 shadow-sm"
          : isRecentActivity
          ? "bg-white dark:bg-gray-800"
          : "bg-white/70 dark:bg-gray-800/30";
        
        const displayDate = (() => {
          try {
            const d = new Date(event.occurred_at);
            const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
            if (event.occurred_at.length === 10) {
              options.timeZone = 'UTC';
            }
            return d.toLocaleDateString('es-MX', options);
          } catch (e) {
            return 'Fecha inválida';
          }
        })();

        return (
          <div 
            key={event.id}
            id={isSummaryExpanded ? `summary-event-${event.id}` : undefined}
            className={cn(
              "p-4 flex items-center justify-between transition-all duration-500 relative",
              marginClass,
              radiusClass,
              borderClass,
              bgClass
            )}
          >
            <div className="flex items-center gap-4">
              {/* Ícono principal + chain debajo, en columna */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className={cn(
                  "p-2 rounded-xl",
                  ['debt_increase', 'debt_payment'].includes(event.kind) ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                  ['loan_given', 'loan_repayment_received'].includes(event.kind) ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                  ['income', 'refund'].includes(event.kind) ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                  'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                )}>
                  {['debt_increase', 'debt_payment'].includes(event.kind) ? <Wallet size={20} /> :
                   ['loan_given', 'loan_repayment_received'].includes(event.kind) ? <Banknote size={20} /> :
                   ['income', 'refund'].includes(event.kind) ? <ArrowDownLeft size={20} /> : 
                   <ArrowUpRight size={20} />}
                </div>
                {/* Chain icon DEBAJO del ícono principal */}
                {event._is_linked && (isSummaryExpanded || !isRecentActivity) && (
                  <div 
                    className="mt-2 w-[18px] h-[18px] rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shadow-sm cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                    onClick={() => isSummaryExpanded && navigateToLinkedEvent(event)}
                    title="Ir al movimiento vinculado"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn(
                      ['income', 'expense', 'refund', 'loss'].includes(event.kind) ? "-translate-x-0.5 translate-y-0.5" : "translate-x-0.5 -translate-y-0.5"
                    )}>
                      {['income', 'expense', 'refund', 'loss'].includes(event.kind) ? (
                        renderHalfChain(event.kind, 'top')
                      ) : (
                        renderHalfChain(event.kind, 'bottom')
                      )}
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium dark:text-white">{event.description || event.merchant_name || 'Movimiento'}</p>
                <p className="text-xs text-gray-400">{displayDate} • {event.category}</p>
              </div>
            </div>
            <div className="text-right flex items-center gap-4">
              <div>
                <p className={cn(
                  "font-mono font-bold whitespace-nowrap", 
                  ['income', 'refund', 'debt_increase', 'loan_given'].includes(event.kind) ? 'text-emerald-600' : 
                  ['expense', 'debt_payment', 'loan_repayment_received', 'loss'].includes(event.kind) ? 'text-red-600' : 'dark:text-white'
                )}>
                  {['income', 'refund', 'debt_increase', 'loan_given'].includes(event.kind) ? '+' : '-'}${formatAmount(event.amount)}
                </p>
                <p className="text-[10px] text-gray-400 uppercase font-bold">{event.account_name || 'Efectivo'}</p>
              </div>
              <button 
                onClick={() => setEditingEvent(event)}
                className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 active:bg-emerald-100 dark:active:bg-emerald-900/50 rounded-lg transition-all"
              >
                <Pencil size={16} />
              </button>
              {event.raw_data?.receipt_image && (
                <button 
                  onClick={() => setShowReceiptModal(event.raw_data.receipt_image)}
                  className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 active:bg-blue-100 dark:active:bg-blue-900/50 rounded-lg transition-all"
                  title="Ver Ticket"
                >
                  <ImageIcon size={16} />
                </button>
              )}
            </div>
            {/* Ícono de cadena centrado en la línea divisoria */}
            {isFirst && linkedWithEvent && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-600 flex items-center justify-center pointer-events-none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  {renderHalfChain(event.kind, 'top')}
                  {renderHalfChain(linkedWithEvent.kind, 'bottom')}
                </svg>
              </div>
            )}
          </div>
        );
      };

      const elements = [];
      for (let i = 0; i < eventsToRender.length; i++) {
        const event = eventsToRender[i];
        const hasNextInGroup = event._is_linked && i < eventsToRender.length - 1 && eventsToRender[i + 1].group_id === event.group_id;
        const isLinkedAndRecent = isRecentActivity && hasNextInGroup;

        if (isLinkedAndRecent) {
          const nextEvent = eventsToRender[i + 1];
          elements.push(
            <div key={`group-${event.group_id}`} className="relative mb-2 last:mb-0">
              {renderCard(event, true, false, nextEvent)}
              {renderCard(nextEvent, false, true)}
            </div>
          );
          i++; // Skip next event
        } else {
          elements.push(renderCard(event, false, false));
        }
      }
      return elements;
    };

    return (
    <div className="space-y-5 sm:space-y-6">
      <div className="bg-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20">
        <p className="text-xs font-medium text-emerald-100 uppercase tracking-wider mb-1">
          Hola, {user?.username?.split(' ')[0]} 👋
        </p>
        <p className="text-3xl font-bold font-mono">
          ${formatAmount(summary.balance - summary.expenses)}
        </p>
        <p className="text-xs text-emerald-200 mt-1">Balance total</p>
      </div>
      {renderFilterBar()}
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-gray-200/60 dark:border-gray-700 dark:shadow-none">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg"><ArrowDownLeft size={20} /></div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Ingresos</span>
            </div>
            <button onClick={() => toggleSummary('income')} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-emerald-500 transition-colors">
              <motion.div animate={{ rotate: expandedSummary === 'income' ? 180 : 0 }} transition={{ duration: 0.3, ease: "easeInOut" }}>
                <ChevronDown size={20} />
              </motion.div>
            </button>
          </div>
          <p className="text-lg sm:text-2xl font-mono font-semibold dark:text-white">${formatAmount(summary.balance)}</p>
          <AnimatePresence initial={false}>
            {expandedSummary === 'income' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  {renderEventList(recentEvents.filter(e => ['income', 'refund'].includes(e.kind)), true, true)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-gray-200/60 dark:border-gray-700 dark:shadow-none">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg"><ArrowUpRight size={20} /></div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Salidas</span>
            </div>
            <button onClick={() => toggleSummary('expense')} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors">
              <motion.div animate={{ rotate: expandedSummary === 'expense' ? 180 : 0 }} transition={{ duration: 0.3, ease: "easeInOut" }}>
                <ChevronDown size={20} />
              </motion.div>
            </button>
          </div>
          <p className="text-lg sm:text-2xl font-mono font-semibold dark:text-white">${formatAmount(summary.expenses)}</p>
          <AnimatePresence initial={false}>
            {expandedSummary === 'expense' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  {renderEventList(recentEvents.filter(e => ['expense', 'loss'].includes(e.kind)), true, true)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-gray-200/60 dark:border-gray-700 dark:shadow-none">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg"><Wallet size={20} /></div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Deudas</span>
            </div>
            <button onClick={() => toggleSummary('debt')} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-500 transition-colors">
              <motion.div animate={{ rotate: expandedSummary === 'debt' ? 180 : 0 }} transition={{ duration: 0.3, ease: "easeInOut" }}>
                <ChevronDown size={20} />
              </motion.div>
            </button>
          </div>
          <p className="text-lg sm:text-2xl font-mono font-semibold dark:text-white">${formatAmount(summary.debts)}</p>
          <AnimatePresence initial={false}>
            {expandedSummary === 'debt' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  {renderEventList(recentEvents.filter(e => ['debt_increase', 'debt_payment'].includes(e.kind)), true, true)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-gray-200/60 dark:border-gray-700 dark:shadow-none">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><Banknote size={20} /></div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Préstamos</span>
            </div>
            <button onClick={() => toggleSummary('loan')} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors">
              <motion.div animate={{ rotate: expandedSummary === 'loan' ? 180 : 0 }} transition={{ duration: 0.3, ease: "easeInOut" }}>
                <ChevronDown size={20} />
              </motion.div>
            </button>
          </div>
          <p className="text-lg sm:text-2xl font-mono font-semibold dark:text-white">${formatAmount(summary.loans)}</p>
          <AnimatePresence initial={false}>
            {expandedSummary === 'loan' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  {renderEventList(recentEvents.filter(e => ['loan_given', 'loan_repayment_received'].includes(e.kind)), true, true)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Proposal Area */}
      <AnimatePresence>
        {proposal && (
          <motion.div 
            ref={proposalRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 overflow-hidden",
              ['debt_increase', 'debt_payment'].includes(proposal?.result?.create?.event?.kind || '')
                ? "border-amber-100 dark:border-amber-900"
                : ['loan_given', 'loan_repayment_received'].includes(proposal?.result?.create?.event?.kind || '')
                ? "border-blue-100 dark:border-blue-900"
                : ['expense', 'loss'].includes(proposal?.result?.create?.event?.kind || '')
                ? "border-red-100 dark:border-red-900"
                : ['income', 'refund'].includes(proposal?.result?.create?.event?.kind || '')
                ? "border-emerald-100 dark:border-emerald-900"
                : proposal?.operation === 'query'
                ? "border-violet-100 dark:border-violet-900"
                : proposal?.operation === 'create_goal'
                ? "border-emerald-100 dark:border-emerald-900"
                : "border-gray-100 dark:border-gray-800"
            )}
          >
            <div className={cn(
              "px-6 py-4 border-b flex justify-between items-center",
              ['debt_increase', 'debt_payment'].includes(proposal?.result?.create?.event?.kind || '')
                ? "bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-900"
                : ['loan_given', 'loan_repayment_received'].includes(proposal?.result?.create?.event?.kind || '')
                ? "bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-900"
                : ['income', 'refund'].includes(proposal?.result?.create?.event?.kind || '')
                ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-900"
                : ['expense', 'loss'].includes(proposal?.result?.create?.event?.kind || '')
                ? "bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-900"
                : proposal?.operation === 'query'
                ? "bg-violet-50 dark:bg-violet-900/30 border-violet-100 dark:border-violet-900"
                : proposal?.operation === 'create_goal'
                ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-900"
                : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800"
            )}>
              <h3 className={cn(
                "font-semibold flex items-center gap-2",
                ['debt_increase', 'debt_payment'].includes(proposal?.result?.create?.event?.kind || '')
                  ? "text-amber-800 dark:text-amber-400"
                  : ['loan_given', 'loan_repayment_received'].includes(proposal?.result?.create?.event?.kind || '')
                  ? "text-blue-800 dark:text-blue-400"
                  : ['income', 'refund'].includes(proposal?.result?.create?.event?.kind || '')
                  ? "text-emerald-800 dark:text-emerald-400"
                  : ['expense', 'loss'].includes(proposal?.result?.create?.event?.kind || '')
                  ? "text-red-800 dark:text-red-400"
                  : proposal?.operation === 'query'
                  ? "text-violet-800 dark:text-violet-400"
                  : proposal?.operation === 'create_goal'
                  ? "text-emerald-800 dark:text-emerald-400"
                  : "text-gray-800 dark:text-gray-200"
              )}>
                {['debt_increase', 'debt_payment'].includes(proposal?.result?.create?.event?.kind || '') ? <Wallet size={18} /> : 
                 ['loan_given', 'loan_repayment_received'].includes(proposal?.result?.create?.event?.kind || '') ? <Banknote size={18} /> :
                 ['income', 'refund'].includes(proposal?.result?.create?.event?.kind || '') ? <ArrowDownLeft size={18} /> :
                 ['expense', 'loss'].includes(proposal?.result?.create?.event?.kind || '') ? <ArrowUpRight size={18} /> :
                 proposal?.operation === 'query' ? <Search size={18} /> :
                 proposal?.operation === 'create_goal' ? <Target size={18} /> :
                 <Check size={18} />} 
                {proposal?.operation === 'query' ? 'Consulta' : proposal?.operation === 'create_goal' ? 'Nuevo Objetivo' : 'Propuesta de Movimiento'} {remainingPendingCount > 0 ? `(Pendientes: ${remainingPendingCount + 1})` : ''}
              </h3>
              <button onClick={() => { setProposal(null); speakText('Entendido, propuesta descartada.'); }} className={cn(
                "p-1 rounded-full transition-colors",
                ['debt_increase', 'debt_payment'].includes(proposal?.result?.create?.event?.kind || '')
                  ? "text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-800"
                  : ['loan_given', 'loan_repayment_received'].includes(proposal?.result?.create?.event?.kind || '')
                  ? "text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-800"
                  : ['income', 'refund'].includes(proposal?.result?.create?.event?.kind || '')
                  ? "text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-800"
                  : ['expense', 'loss'].includes(proposal?.result?.create?.event?.kind || '')
                  ? "text-red-600 hover:bg-red-100 dark:hover:bg-red-800"
                  : proposal?.operation === 'query'
                  ? "text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-800"
                  : proposal?.operation === 'create_goal'
                  ? "text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-800"
                  : "text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {isProcessing && !proposal ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="animate-spin text-emerald-500" size={40} />
                  <p className="text-gray-500 font-medium italic">Procesando propuesta...</p>
                </div>
              ) : (
                <>
                  <div className="text-gray-700 dark:text-gray-300 italic prose dark:prose-invert max-w-none [&>p]:m-0 [&>p]:inline">
                    <ReactMarkdown>{proposal?.result?.user_feedback_message || 'He preparado una propuesta para tu movimiento.'}</ReactMarkdown>
                  </div>
                  
                  {(!proposal?.operation || (proposal?.operation === 'create' && !proposal?.result?.create?.event)) && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900 rounded-xl text-red-800 dark:text-red-400 text-sm font-medium flex items-start gap-3">
                      <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                      <p>No se pudo extraer la información del movimiento. Por favor, intenta de nuevo con más detalles o una imagen más clara.</p>
                    </div>
                  )}

                  {proposal?.result?.create?.event && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Concepto</label>
                    <p className="text-base font-bold dark:text-white leading-tight">
                      {proposal?.result?.create?.event?.description || 
                       proposal?.result?.create?.event?.merchant?.name || 
                       'Sin descripción'}
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Monto</label>
                    <p className={cn(
                      "text-base font-bold dark:text-white leading-tight",
                      ['income', 'refund', 'debt_increase', 'loan_given'].includes(proposal?.result?.create?.event?.kind || '') 
                        ? 'text-emerald-600' 
                        : ['expense', 'debt_payment', 'loan_repayment_received', 'loss'].includes(proposal?.result?.create?.event?.kind || '')
                        ? 'text-red-600'
                        : 'dark:text-white'
                    )}>
                      {proposal?.result?.create?.event?.amount !== null && proposal?.result?.create?.event?.amount !== undefined
                        ? `${['income', 'refund', 'debt_increase', 'loan_given'].includes(proposal?.result?.create?.event?.kind || '') ? '+' : '-'}$${formatAmount(proposal?.result?.create?.event?.amount)} ${proposal?.result?.create?.event?.currency || 'MXN'}` 
                        : 'Pendiente'}
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Categoría</label>
                    <p className="text-base font-bold dark:text-white leading-tight">
                      {proposal?.result?.create?.event?.category || 'Sin categoría'}
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">{isTransferProposal ? 'Cuenta Origen' : 'Cuenta'}</label>
                    <p className="text-base font-bold dark:text-white leading-tight flex items-center gap-1">
                      <CreditCard size={14} /> 
                      {proposal?.result?.create?.event?.accounts?.primary_account_ref?.name || 
                       (typeof proposal?.result?.create?.event?.accounts?.primary_account_ref === 'string' ? proposal?.result?.create?.event?.accounts?.primary_account_ref : 'Por definir')}
                    </p>
                  </div>
                  {isTransferProposal && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Cuenta Destino</label>
                      <p className="text-base font-bold dark:text-white leading-tight flex items-center gap-1">
                        <CreditCard size={14} /> 
                        {proposal?.pending_proposals?.[transferProposalIndex]?.result?.create?.event?.accounts?.primary_account_ref?.name || 
                         (typeof proposal?.pending_proposals?.[transferProposalIndex]?.result?.create?.event?.accounts?.primary_account_ref === 'string' ? proposal?.pending_proposals?.[transferProposalIndex]?.result?.create?.event?.accounts?.primary_account_ref : 'Por definir')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {proposal?.result?.create_goal?.goal && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Objetivo</label>
                    <p className="text-base font-bold dark:text-white leading-tight flex items-center gap-2">
                      <span>{proposal.result.create_goal.goal.emoji || '🎯'}</span>
                      {proposal.result.create_goal.goal.name || 'Sin nombre'}
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Monto Objetivo</label>
                    <p className="text-base font-bold dark:text-white leading-tight">
                      {proposal.result.create_goal.goal.target_amount !== null && proposal.result.create_goal.goal.target_amount !== undefined
                        ? `$${formatAmount(proposal.result.create_goal.goal.target_amount)}` 
                        : 'Pendiente'}
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Cuenta Vinculada</label>
                    <p className="text-base font-bold dark:text-white leading-tight flex items-center gap-1">
                      <CreditCard size={14} /> 
                      {proposal.result.create_goal.goal.account_name || 'Por definir'}
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Fecha Límite</label>
                    <p className="text-base font-bold dark:text-white leading-tight">
                      {proposal.result.create_goal.goal.deadline || 'Sin fecha'}
                    </p>
                  </div>
                </div>
              )}

              {/* Technical query info removed per user request */}

              {proposal?.follow_up_questions && proposal?.follow_up_questions?.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-xl border border-amber-100 dark:border-amber-900">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-400 uppercase mb-2">Preguntas de seguimiento</p>
                  <ul className="list-disc list-inside text-sm text-amber-900 dark:text-amber-300 space-y-1">
                    {proposal?.follow_up_questions?.map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={confirmProposal}
                  disabled={proposal?.status === 'needs_clarification' || isProcessing || !proposal?.operation || (proposal?.operation === 'create' && !proposal?.result?.create?.event)}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
                    proposal?.status === 'ready_to_confirm' && !isProcessing && proposal?.operation && !(proposal?.operation === 'create' && !proposal?.result?.create?.event)
                    ? (['debt_increase', 'debt_payment'].includes(proposal?.result?.create?.event?.kind || '') 
                        ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-md' 
                        : ['loan_given', 'loan_repayment_received'].includes(proposal?.result?.create?.event?.kind || '')
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                        : ['income', 'refund'].includes(proposal?.result?.create?.event?.kind || '')
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
                        : ['expense', 'loss'].includes(proposal?.result?.create?.event?.kind || '')
                        ? 'bg-red-600 text-white hover:bg-red-700 shadow-md'
                        : proposal?.operation === 'query'
                        ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-md'
                        : proposal?.operation === 'create_goal'
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md')
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {isProcessing && <Loader2 className="animate-spin" size={18} />}
                  {proposal?.operation === 'query' ? 'Entendido' : (remainingPendingCount > 0 ? 'Confirmar y Siguiente' : 'Confirmar')}
                </button>
                <button 
                  onClick={() => {
                    setProposal(null);
                    speakText('Entendido, propuesta descartada.');
                  }}
                  disabled={isProcessing}
                  className="px-6 py-3 rounded-xl font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
                >
                  Descartar
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Event Modal */}
      <AnimatePresence>
        {editingEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700"
            >
              <div className="p-4 sm:p-5 md:p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                  <Pencil size={18} className="text-emerald-500" /> Editar Movimiento
                </h3>
                <button onClick={() => setEditingEvent(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all dark:text-gray-400">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updated = {
                  ...editingEvent,
                  description: formData.get('description'),
                  amount: parseFloat(formData.get('amount') as string),
                  category: formData.get('category'),
                  account_name: formData.get('account_name'),
                  occurred_at: formData.get('occurred_at')
                };
                handleUpdateEvent(updated);
              }} className="p-4 sm:p-5 md:p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 uppercase">Concepto</label>
                  <input 
                    name="description" 
                    defaultValue={editingEvent.description}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 uppercase">Monto</label>
                    <input 
                      name="amount" 
                      type="number" 
                      step="0.01"
                      defaultValue={editingEvent.amount}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 uppercase">Fecha</label>
                    <input 
                      name="occurred_at" 
                      type="date" 
                      defaultValue={(() => {
                        if (editingEvent.occurred_at.length === 10) return editingEvent.occurred_at;
                        const d = new Date(editingEvent.occurred_at);
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                      })()}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 uppercase">Categoría</label>
                    <div className="relative">
                      <select
                        name="category" 
                        defaultValue={editingEvent.category}
                        className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white appearance-none"
                        required
                      >
                        <option value="" disabled>Selecciona una categoría</option>
                        {displayCategories.length > 0 ? (
                          displayCategories.map((cat: string) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))
                        ) : (
                          <option value="" disabled>No hay categorías</option>
                        )}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 uppercase">Cuenta</label>
                    <div className="relative">
                      <select
                        name="account_name" 
                        defaultValue={editingEvent.account_name || editingEvent.accounts?.primary_account_ref?.name || ''}
                        className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white appearance-none"
                        required
                      >
                        <option value="" disabled>Selecciona una cuenta</option>
                        {displayAccounts.length > 0 ? (
                          displayAccounts.map((acc: any) => (
                            <option key={acc.name} value={acc.name}>{acc.name}</option>
                          ))
                        ) : (
                          <option value="" disabled>No hay cuentas</option>
                        )}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-6 pt-6">
                  <div className="flex justify-center">
                    <button 
                      type="submit"
                      disabled={isProcessing}
                      className="w-full max-w-[280px] py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-3 text-lg active:scale-[0.98]"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={22} /> : <Save size={22} />}
                      Guardar Cambios
                    </button>
                  </div>
                  
                  <div className="flex gap-3 px-2">
                    <button 
                      type="button"
                      onClick={() => {
                        setIsDeleting(true);
                        setDeleteConfirmTimer(3);
                      }}
                      className="flex-1 py-3 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <Trash2 size={16} />
                      Eliminar
                    </button>
                    <button 
                      type="button"
                      onClick={() => setEditingEvent(null)}
                      className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleting && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-red-100 dark:border-red-900/30"
            >
              <div className="p-5 sm:p-6 md:p-8 text-center">
                <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-6">
                  <AlertCircle size={40} />
                </div>
                <h3 className="text-xl sm:text-2xl font-black dark:text-white mb-4 tracking-tight">¿Eliminar movimiento?</h3>
                <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl mb-8">
                  <p className="text-red-800 dark:text-red-300 text-sm font-medium leading-relaxed">
                    Esta acción es permanente y no se puede deshacer. Se actualizarán tus saldos y análisis automáticamente.
                  </p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => handleDeleteEvent(editingEvent.id)}
                    disabled={deleteConfirmTimer > 0 || isProcessing}
                    className={cn(
                      "w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-xl",
                      deleteConfirmTimer > 0 
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                        : "bg-red-600 text-white hover:bg-red-700 shadow-red-600/20"
                    )}
                  >
                    {isProcessing ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : deleteConfirmTimer > 0 ? (
                      `Espera ${deleteConfirmTimer}s...`
                    ) : (
                      <>
                        <Trash2 size={20} />
                        Confirmar Eliminación
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => setIsDeleting(false)}
                    disabled={isProcessing}
                    className="w-full py-4 text-gray-500 dark:text-gray-400 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isDeletingGoal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-red-100 dark:border-red-900/30"
            >
              <div className="p-5 sm:p-6 md:p-8 text-center">
                <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-6">
                  <AlertCircle size={40} />
                </div>
                <h3 className="text-xl sm:text-2xl font-black dark:text-white mb-4 tracking-tight">¿Eliminar objetivo?</h3>
                <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl mb-8">
                  <p className="text-red-800 dark:text-red-300 text-sm font-medium leading-relaxed">
                    Esta acción es permanente y no se puede deshacer. Perderás el seguimiento de este ahorro.
                  </p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={executeDeleteGoal}
                    disabled={deleteGoalConfirmTimer > 0 || isProcessing}
                    className={cn(
                      "w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-xl",
                      deleteGoalConfirmTimer > 0 
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                        : "bg-red-600 text-white hover:bg-red-700 shadow-red-600/20"
                    )}
                  >
                    {isProcessing ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : deleteGoalConfirmTimer > 0 ? (
                      `Espera ${deleteGoalConfirmTimer}s...`
                    ) : (
                      <>
                        <Trash2 size={20} />
                        Confirmar Eliminación
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => setIsDeletingGoal(null)}
                    disabled={isProcessing}
                    className="w-full py-4 text-gray-500 dark:text-gray-400 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        <button 
          onClick={() => setIsActivityExpanded(!isActivityExpanded)}
          className="w-full flex items-center justify-between group"
        >
          <h2 className="text-lg font-semibold flex items-center gap-2 dark:text-white">
            <History size={20} className="text-gray-400" /> Actividad Reciente
          </h2>
          <motion.div
            animate={{ rotate: isActivityExpanded ? 0 : 180 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 group-hover:text-emerald-500 transition-colors"
          >
            <ChevronDown size={20} />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {isActivityExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
              className="overflow-hidden"
            >
              <div className="pt-2">
                {renderEventList(recentEvents, true)}
              </div>
      </motion.div>
    )}
  </AnimatePresence>
  {hasMoreEvents && (
    <div className="flex justify-center pt-2">
      <button
        onClick={loadMoreEvents}
        disabled={isLoadingMore}
        className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm disabled:opacity-50"
      >
        {isLoadingMore 
          ? <Loader2 size={16} className="animate-spin" />
          : <ChevronDown size={16} />
        }
        {isLoadingMore ? 'Cargando...' : 'Ver más movimientos'}
      </button>
    </div>
  )}
</div>
</div>
  );
  };

  const renderAnalytics = () => {
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <Loader2 className="animate-spin text-emerald-500" size={40} />
          <p className="text-gray-500 font-medium">Cargando análisis...</p>
        </div>
      );
    }

    const getChartHeight = (data: any[]) => {
      const count = data?.length || 0;
      // Estimate 2 items per row, 24px per row
      // Base chart area ~250px
      return Math.max(300, 280 + (Math.ceil(count / 2) * 24));
    };

    const renderCustomLegend = (props: any) => {
      const { payload } = props;
      
      return (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-5">
          {payload.map((entry: any, index: number) => {
            const { color, value } = entry;
            
            return (
              <div key={`item-${index}`} className="flex items-center text-xs font-medium">
                <div 
                  style={{ 
                    backgroundColor: color, 
                    width: 10, 
                    height: 10, 
                    marginRight: 6,
                    borderRadius: '2px',
                    boxSizing: 'border-box'
                  }} 
                />
                <span style={{ color: color }}>{value}</span>
              </div>
            );
          })}
        </div>
      );
    };

    return (
    <div className="space-y-8">
      {/* Análisis Inteligente con IA */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-gray-200/60 dark:border-gray-700 dark:shadow-none min-w-0 overflow-hidden">
        {!analysisGenerated ? (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
              <Sparkles className="text-white" size={32} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Análisis Inteligente con IA</h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">
              Descubre en qué estás gastando de más y cómo alcanzar tus objetivos más rápido
            </p>
            {isPremium === true ? (
              <button
                onClick={generateAIAnalysis}
                disabled={isAnalyzing}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all disabled:opacity-70"
              >
                {isAnalyzing ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                {isAnalyzing ? "Analizando tus finanzas..." : "Generar mi análisis del mes"}
              </button>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <button disabled className="bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 px-6 py-3 rounded-full font-bold flex items-center gap-2 cursor-not-allowed">
                  <Crown size={20} />
                  Exclusivo para ContaBot Pro 👑
                </button>
                <button onClick={() => setView('planes')} className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
                  Ver planes
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col h-[520px] rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="text-emerald-500" size={18} />
                Análisis del Mes
                {(() => {
                  const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                  const chatMonth = getActiveChatMonth();
                  const [year, monthNum] = chatMonth.split('-');
                  const monthLabel = mesesNombres[parseInt(monthNum) - 1] + ' ' + year;
                  return (
                    <span className="text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                      {monthLabel}
                    </span>
                  );
                })()}
              </h3>
              <button
                onClick={async () => {
                  if (user?.uid) {
                    const month = getActiveChatMonth();
                    try {
                      await setDoc(doc(db, 'users', user.uid, 'aiChats', month), 
                        { messages: [], updatedAt: new Date().toISOString(), month }, 
                        { merge: false }
                      );
                    } catch (err) {
                      console.error("Error clearing AI chat:", err);
                    }
                  }
                  setAiChatMessages([]);
                  setAnalysisGenerated(false);
                  setAiAnalysis(null);
                  generateAIAnalysis();
                }}
                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-colors"
                title="Regenerar análisis"
              >
                <RefreshCw size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
              {aiChatMessages.map((msg, idx) => (
                <div key={idx} className={cn("flex gap-3 max-w-[85%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                  {msg.role === 'user' ? (
                    user?.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt="Avatar" 
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        <UserIcon size={16} className="text-emerald-500" />
                      </div>
                    )
                  ) : (
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-emerald-500">
                      <img src={APP_LOGO} alt="ContaBot" className="w-5 h-5 object-contain" />
                    </div>
                  )}
                  <div className={cn("px-4 py-3 rounded-2xl text-sm shadow-sm", msg.role === 'user' ? "bg-emerald-500 text-white rounded-tr-sm" : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm")}>
                    {msg.role === 'user' ? (
                      msg.text
                    ) : (
                      <div className="markdown-body prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-gray-800 prose-pre:text-gray-100">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isAnalyzing && (
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-emerald-500">
                    <img src={APP_LOGO} alt="ContaBot" className="w-5 h-5 object-contain" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-1">
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="flex gap-2">
                <textarea
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendAiChatMessage();
                    }
                  }}
                  placeholder="Pregúntame algo sobre tu análisis..."
                  className="flex-1 resize-none h-10 max-h-32 min-h-[40px] py-2 px-4 bg-gray-100 dark:bg-gray-700 border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-sm dark:text-white"
                  rows={1}
                />
                <button
                  onClick={sendAiChatMessage}
                  disabled={isAnalyzing || !aiChatInput.trim()}
                  className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-50"
                >
                  <Send size={18} className="ml-0.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {renderFilterBar()}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Balance by Account */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm min-w-0">
          <h3 className="text-base font-bold dark:text-white mb-4 tracking-tight">Saldos por Cuenta</h3>
          <div className="w-full min-h-[300px] transition-all duration-300 ease-in-out" style={{ height: getChartHeight(analytics?.incomeByAccount || []) }}>
            <AnimatePresence mode="wait">
              {analytics ? (
                (analytics?.incomeByAccount || []).length > 0 ? (
                  <motion.div
                    key={`chart-${(analytics?.incomeByAccount || []).map((e: any) => e.name).sort().join('-')}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                    className="w-full h-full"
                    id="chart-balance-account"
                  >
                    <ResponsiveContainer width="99%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics?.incomeByAccount || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {(analytics?.incomeByAccount || []).map((entry: any, index: number) => {
                            const color = getEntityColor(entry.name, 'account') || COLORS[index % COLORS.length];
                            return (
                              <Cell 
                                key={entry.name} 
                                fill={color} 
                                stroke="none"
                              />
                            );
                          })}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => `$${formatAmount(value)}`}
                          contentStyle={{ 
                            backgroundColor: isDarkMode ? '#1f2937' : '#fff', 
                            borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                            borderRadius: '8px',
                            color: isDarkMode ? '#fff' : '#000'
                          }}
                          itemStyle={{ color: isDarkMode ? '#fff' : '#000' }}
                        />
                        <Legend content={renderCustomLegend} verticalAlign="bottom" />
                      </PieChart>
                    </ResponsiveContainer>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="h-full flex flex-col items-center justify-center text-gray-400 italic p-4 text-center"
                  >
                    <p>Registra ingresos para ver tus saldos aquí.</p>
                  </motion.div>
                )
              ) : (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex items-center justify-center text-gray-400 italic"
                >
                  Cargando datos...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Expenses by Category */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm min-w-0">
          <h3 className="text-base font-bold dark:text-white mb-4 tracking-tight">Salidas por Categoría</h3>
          <div className="w-full min-h-[300px] transition-all duration-300 ease-in-out" style={{ height: getChartHeight(analytics?.expensesByCategory || []) }}>
            <AnimatePresence mode="wait">
              {analytics ? (
                (analytics?.expensesByCategory || []).length > 0 ? (
                  <motion.div
                    key="chart"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full"
                    id="chart-expenses-category"
                  >
                    <ResponsiveContainer width="99%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics?.expensesByCategory || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {(analytics?.expensesByCategory || []).map((entry: any, index: number) => {
                            const color = entry.color || COLORS[index % COLORS.length];
                            return (
                              <Cell 
                                key={entry.name} 
                                fill={color} 
                                stroke="none"
                              />
                            );
                          })}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => `$${formatAmount(value)}`}
                          contentStyle={{ 
                            backgroundColor: isDarkMode ? '#1f2937' : '#fff', 
                            borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                            borderRadius: '8px',
                            color: isDarkMode ? '#fff' : '#000'
                          }}
                          itemStyle={{ color: isDarkMode ? '#fff' : '#000' }}
                        />
                        <Legend content={renderCustomLegend} verticalAlign="bottom" />
                      </PieChart>
                    </ResponsiveContainer>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="h-full flex flex-col items-center justify-center text-gray-400 italic p-4 text-center"
                  >
                    <p>Registra tus salidas para verlas aquí.</p>
                  </motion.div>
                )
              ) : (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex items-center justify-center text-gray-400 italic"
                >
                  Cargando datos...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Debts by Counterparty */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm md:col-span-2 min-w-0">
          <h3 className="text-base font-bold dark:text-white mb-4 tracking-tight">Deudas por Acreedor</h3>
          <div className="h-[300px] min-h-[300px] w-full flex items-center justify-center transition-all duration-300 ease-in-out">
            <AnimatePresence mode="wait">
              {analytics ? (
                (analytics?.debtsByCounterparty || []).length > 0 ? (
                  <motion.div
                    key="chart"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full"
                    id="chart-debts"
                  >
                    <ResponsiveContainer width="99%" height="100%">
                      <BarChart data={analytics?.debtsByCounterparty || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip 
                          cursor={{ fill: isDarkMode ? '#374151' : '#e8ebf0' }} 
                          formatter={(value: number, _name: string, props: any) => [`$${formatAmount(value)}`, props.payload.name]}
                          labelStyle={{ display: 'none' }}
                          contentStyle={{ 
                            backgroundColor: isDarkMode ? '#1f2937' : '#fff', 
                            borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                            borderRadius: '8px',
                            color: isDarkMode ? '#fff' : '#000',
                            padding: '8px 12px'
                          }}
                          itemStyle={{ color: isDarkMode ? '#fff' : '#000', padding: 0 }}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {(analytics?.debtsByCounterparty || []).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={getEntityColor(entry.name, 'debt') || '#f59e0b'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="text-gray-400 dark:text-gray-500 italic text-center text-xs sm:text-sm"
                  >
                    No hay deudas registradas
                  </motion.div>
                )
              ) : (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex items-center justify-center text-gray-400 italic"
                >
                  Cargando datos...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Loans by Debtor */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm min-w-0">
          <h3 className="text-base font-bold dark:text-white mb-4 tracking-tight">Préstamos por Cobrar</h3>
          <div className="h-[300px] min-h-[300px] w-full flex items-center justify-center transition-all duration-300 ease-in-out">
            <AnimatePresence mode="wait">
              {analytics ? (
                (analytics?.loansByDebtor || []).length > 0 ? (
                  <motion.div
                    key="chart"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full"
                    id="chart-loans"
                  >
                    <ResponsiveContainer width="99%" height="100%">
                      <BarChart data={analytics?.loansByDebtor || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip 
                          cursor={{ fill: isDarkMode ? '#374151' : '#e8ebf0' }} 
                          formatter={(value: number, _name: string, props: any) => [`$${formatAmount(value)}`, props.payload.name]}
                          labelStyle={{ display: 'none' }}
                          contentStyle={{ 
                            backgroundColor: isDarkMode ? '#1f2937' : '#fff', 
                            borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                            borderRadius: '8px',
                            color: isDarkMode ? '#fff' : '#000',
                            padding: '8px 12px'
                          }}
                          itemStyle={{ color: isDarkMode ? '#fff' : '#000', padding: 0 }}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {(analytics?.loansByDebtor || []).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={getEntityColor(entry.name, 'debt') || '#3b82f6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="text-gray-400 dark:text-gray-500 italic text-center text-xs sm:text-sm"
                  >
                    No hay préstamos por cobrar
                  </motion.div>
                )
              ) : (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex items-center justify-center text-gray-400 italic"
                >
                  Cargando datos...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
  };

  const GOAL_TEMPLATES = [
    { name: 'Fondo de Emergencia', emoji: '🛡️', color: '#10b981', target: 50000 },
    { name: 'Vacaciones', emoji: '🏖️', color: '#3b82f6', target: 20000 },
    { name: 'Nuevo Auto', emoji: '🚗', color: '#f59e0b', target: 300000 },
    { name: 'Enganche Casa', emoji: '🏠', color: '#8b5cf6', target: 500000 },
    { name: 'Gadget Nuevo', emoji: '💻', color: '#ec4899', target: 15000 },
    { name: 'Inversiones', emoji: '📈', color: '#06b6d4', target: 100000 },
  ];

  const renderGoals = () => {
    const goalDisplayAccounts = displayAccounts.filter(acc => acc.type !== 'credit' && acc.type !== 'credit_card' && acc.type !== 'debt');

    const calculateDaysLeft = (deadline: string) => {
      if (!deadline) return null;
      const diff = new Date(deadline).getTime() - new Date().getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days > 0 ? days : 0;
    };

    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black dark:text-white tracking-tight">Mis Metas</h2>
            <p className="text-xs sm:text-sm text-gray-500">Ahorra para lo que más quieres</p>
          </div>
          <button 
            onClick={() => {
              setGoalForm({ name: '', emoji: '🎯', color: '#10b981', target_amount: 0, current_amount: 0, deadline: '', account_name: '' });
              setIsAddingGoal(true);
            }}
            className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/20 hover:scale-105 transition-transform"
          >
            <Plus size={24} />
          </button>
        </div>

        {goals.length === 0 && !isAddingGoal ? (
          <div className="bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] text-center border border-dashed border-gray-200 dark:border-gray-700">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Target size={36} className="text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold dark:text-white mb-2">
              ¿Cuál es tu próximo sueño?
            </h3>
            <p className="text-sm text-gray-400 font-normal mb-8 max-w-xs mx-auto leading-relaxed">
              Crea tu primera meta y ContaBot te ayudará a darle seguimiento a tus ahorros automáticamente
            </p>
            <div className="grid grid-cols-2 gap-3">
              {GOAL_TEMPLATES.slice(0, 4).map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setGoalForm({
                      name: template.name,
                      emoji: template.emoji,
                      color: template.color,
                      target_amount: template.target,
                      current_amount: 0,
                      deadline: ''
                    });
                    setIsAddingGoal(true);
                  }}
                  className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all text-left group"
                >
                  <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">
                    {template.emoji}
                  </span>
                  <p className="text-xs font-semibold dark:text-white leading-tight">
                    {template.name}
                  </p>
                  <p className="text-[10px] text-gray-400 font-normal mt-0.5">
                    ${formatAmount(template.target)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {goals.map((goal) => {
              const current_amount = goal.account_name && analytics?.accountBalances 
                ? (analytics.accountBalances[goal.account_name] || 0) 
                : (goal.current_amount || 0);
              const progress = Math.min((current_amount / goal.target_amount) * 100, 100);
              const daysLeft = calculateDaysLeft(goal.deadline);
              const isCompleted = progress >= 100;

              return (
                <motion.div
                  layout
                  key={goal.id}
                  className="relative bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 group"
                >
                  {/* Barra de color superior basada en el color de la meta */}
                  <div
                    className="h-1.5 w-full"
                    style={{ backgroundColor: goal.color }}
                  />

                  <div className="p-5">
                    {/* Fila superior: emoji + nombre + acciones */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0"
                          style={{ backgroundColor: `${goal.color}20` }}
                        >
                          {goal.emoji}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight truncate">
                            {goal.name}
                          </h3>
                          {goal.account_name && (
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                              {goal.account_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={() => { setGoalForm(goal); setIsAddingGoal(true); }}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(goal.id!)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Montos */}
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <p className="text-2xl font-bold font-mono text-gray-900 dark:text-white">
                          ${formatAmount(current_amount)}
                        </p>
                        <p className="text-xs text-gray-400 font-normal">
                          de ${formatAmount(goal.target_amount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold" style={{ color: goal.color }}>
                          {progress.toFixed(0)}%
                        </p>
                        <p className="text-xs text-gray-400 font-normal">completado</p>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: goal.color }}
                      />
                    </div>

                    {/* Footer: días restantes + estado */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Clock size={12} />
                        <span className="text-xs font-normal">
                          {daysLeft !== null ? `${daysLeft} días restantes` : 'Sin fecha límite'}
                        </span>
                      </div>
                      {isCompleted ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full text-xs font-semibold">
                          <Trophy size={12} />
                          Completada
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: `${goal.color}15`, color: goal.color }}
                        >
                          <span>${formatAmount(Math.max(goal.target_amount - current_amount, 0))} faltantes</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Add/Edit Goal Modal */}
        <AnimatePresence>
          {isAddingGoal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]"
              >
                <div className="p-4 sm:p-5 md:p-6 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 shrink-0">
                  <h3 className="text-lg sm:text-xl font-black dark:text-white tracking-tight">
                    {goalForm.id ? 'Editar Objetivo' : 'Nuevo Objetivo'}
                  </h3>
                  <button onClick={() => setIsAddingGoal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <X size={24} className="text-gray-400" />
                  </button>
                </div>

                <div className="p-4 sm:p-5 md:p-6 overflow-y-auto flex-1 no-scrollbar">
                  <form id="goal-form" onSubmit={handleSaveGoal} className="space-y-8">
                    
                    {/* Emoji & Name Section */}
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative group">
                        <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center overflow-hidden border-2 border-transparent focus-within:border-emerald-500 transition-all">
                          <input 
                            type="text"
                            value={goalForm.emoji}
                            onChange={(e) => setGoalForm({ ...goalForm, emoji: e.target.value })}
                            className="w-full h-full text-5xl text-center bg-transparent outline-none"
                            maxLength={2}
                          />
                        </div>
                        <div className="absolute -bottom-2 bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none left-1/2 -translate-x-1/2 whitespace-nowrap">
                          Cambiar Emoji
                        </div>
                      </div>

                      <div className="w-full">
                        <input 
                          type="text"
                          value={goalForm.name}
                          onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
                          className="w-full text-center text-2xl bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-3 outline-none dark:text-white font-black placeholder:text-gray-300 dark:placeholder:text-gray-700 focus:ring-2 focus:ring-emerald-500 transition-all"
                          placeholder="Nombre del Objetivo"
                          required
                        />
                      </div>
                    </div>

                    {/* Fields Section */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Monto Objetivo</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">$</span>
                          <input 
                            type="number"
                            value={goalForm.target_amount || ''}
                            onChange={(e) => setGoalForm({ ...goalForm, target_amount: parseFloat(e.target.value) })}
                            className="w-full h-14 pl-10 pr-4 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white font-bold text-lg transition-all"
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Cuenta Vinculada</label>
                        <div className="relative">
                          <select
                            value={goalForm.account_name || ''}
                            onChange={(e) => setGoalForm({ ...goalForm, account_name: e.target.value })}
                            className="w-full h-14 px-4 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white font-bold appearance-none transition-all"
                            required
                          >
                            <option value="" disabled>Selecciona una cuenta</option>
                            {goalDisplayAccounts.map((acc: any) => (
                              <option key={acc.name} value={acc.name}>{acc.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Fecha Límite</label>
                        <input 
                          type="date"
                          value={goalForm.deadline}
                          onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })}
                          className="w-full h-14 px-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white font-bold transition-all"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 text-center block">Color</label>
                        <div className="flex flex-wrap gap-4 justify-center py-2">
                          {COLORS.slice(0, 8).map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setGoalForm({ ...goalForm, color: c })}
                              className={cn(
                                "w-12 h-12 rounded-full transition-all shrink-0",
                                goalForm.color === c ? "scale-110 ring-4 ring-offset-4 ring-offset-white dark:ring-offset-gray-900 ring-emerald-500" : "hover:scale-105 opacity-80 hover:opacity-100"
                              )}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>

                      {!goalForm.id && (
                        <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Plantillas Rápidas</label>
                          <div className="flex flex-wrap gap-2">
                            {GOAL_TEMPLATES.map((t, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setGoalForm({ ...goalForm, name: t.name, emoji: t.emoji, color: t.color, target_amount: t.target })}
                                className="px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-bold dark:text-white hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
                              >
                                {t.emoji} {t.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </form>
                </div>
                
                <div className="p-4 sm:p-5 md:p-6 border-t border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
                  <button 
                    form="goal-form"
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold text-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    {goalForm.id ? 'Actualizar Objetivo' : 'Crear Objetivo'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderSettings = () => {
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <Loader2 className="animate-spin text-emerald-500" size={40} />
          <p className="text-gray-500 font-medium">Cargando ajustes...</p>
        </div>
      );
    }

    return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 pb-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 p-4 sm:p-6 md:p-8 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-gray-200/60 dark:border-gray-700 dark:shadow-none">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold dark:text-white">Perfil de Usuario</h3>
          <button 
            onClick={() => {
              setIsEditingProfile(!isEditingProfile);
              if (!isEditingProfile) {
                setProfileForm({
                  username: user?.username || '',
                  email: (user?.email && !user.email.endsWith('@phone.contabot.com')) ? user.email : '',
                  phone: user?.phone || '',
                  newPassword: '',
                  confirmPassword: ''
                });
              }
            }}
            className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all"
          >
            {isEditingProfile ? <X size={20} /> : <Pencil size={20} />}
          </button>
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-lg">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={40} className="text-emerald-500" />
              )}
            </div>
            <button 
              onClick={() => profileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-all"
            >
              <Camera size={16} />
            </button>
            <input 
              type="file" 
              ref={profileInputRef} 
              onChange={handleAvatarUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          {!isEditingProfile && (
            <div className="mt-4 text-center">
              <h4 className="text-xl font-semibold dark:text-white">{user?.username}</h4>
              <p className="text-xs sm:text-sm text-gray-500">
                {(user?.email && !user.email.endsWith('@phone.contabot.com')) 
                  ? user.email 
                  : user?.phone || 'Sin contacto'}
              </p>
            </div>
          )}
        </div>

        {isEditingProfile ? (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase">Nombre de Usuario</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  value={profileForm.username}
                  onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                  placeholder="Nombre de usuario"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                    placeholder="ejemplo@correo.com"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                    placeholder="Agrega tu número"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <h4 className="text-sm font-bold text-gray-400 uppercase mb-4">Cambiar Contraseña</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 uppercase">Nueva Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="password"
                      value={profileForm.newPassword}
                      onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 uppercase">Confirmar Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="password"
                      value={profileForm.confirmPassword}
                      onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
            </div>



            <button 
              type="submit"
              disabled={isProcessing}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Guardar Cambios
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user?.email && !user.email.endsWith('@phone.contabot.com') ? (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center gap-4">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <Mail size={18} className="text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Email</p>
                    <p className="text-sm font-medium dark:text-white">{user.email}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 cursor-pointer group" onClick={() => setIsEditingProfile(true)}>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Email</label>
                  <div className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center gap-3 text-gray-400 group-hover:bg-gray-100 dark:group-hover:bg-gray-800 group-hover:text-gray-500 dark:group-hover:text-gray-300 transition-all">
                    <Mail size={18} />
                    <span className="text-sm">Agrega tu correo</span>
                  </div>
                </div>
              )}

              {user?.phone ? (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center gap-4">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <Phone size={18} className="text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Teléfono</p>
                    <p className="text-sm font-medium dark:text-white">{user.phone}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 cursor-pointer group" onClick={() => setIsEditingProfile(true)}>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Teléfono</label>
                  <div className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center gap-3 text-gray-400 group-hover:bg-gray-100 dark:group-hover:bg-gray-800 group-hover:text-gray-500 dark:group-hover:text-gray-300 transition-all">
                    <Phone size={18} />
                    <span className="text-sm">Agrega tu número</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <Shield size={18} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Seguridad</p>
                  <p className="text-sm font-medium dark:text-white">Contraseña establecida</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditingProfile(true)}
                className="text-xs font-bold text-emerald-600 hover:underline"
              >
                Cambiar
              </button>
            </div>
          </div>
        )}
      </motion.div>
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-gray-200/60 dark:border-gray-700 dark:shadow-none">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold dark:text-white">Estado de Suscripción</h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setIsProcessing(true);
                // checkSubscription is defined in the useEffect scope, I should move it or call it differently
                // Actually, I can just call the fetch directly here or move checkSubscription up
                if (user?.uid) {
                  fetch(`/api/user/subscription/${user.uid}`)
                    .then(r => r.json())
                    .then(data => {
                      setIsPremium(data.isPremium);
                      setPremiumUntil(data.premiumUntil);
                      if (data.isPremium) {
                        setSuccess("Suscripción actualizada correctamente.");
                        setShowAd(false);
                      } else {
                        setError("Aún no detectamos tu suscripción Premium. Si acabas de pagar, espera unos segundos.");
                      }
                    })
                    .finally(() => setIsProcessing(false));
                }
              }}
              disabled={isProcessing}
              className="p-2 text-gray-400 hover:text-emerald-500 transition-colors"
              title="Refrescar estado"
            >
              <History size={18} className={isProcessing ? "animate-spin" : ""} />
            </button>
            <div className={cn(
              "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider",
              isPremium === null ? "bg-gray-100 text-gray-400" : (isPremium ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400")
            )}>
              {isPremium === null ? 'Verificando...' : (isPremium ? 'Premium' : 'Estándar')}
            </div>
          </div>
        </div>

        <div className={cn(
          "rounded-2xl border transition-all overflow-hidden",
          isPremium
            ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30"
            : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800"
        )}>
          {/* Barra de acento superior */}
          <div className={cn(
            "h-1 w-full",
            isPremium ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-700"
          )} />

          <div className="p-4 sm:p-5">
            {/* Fila superior: ícono + nombre del plan */}
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                "p-2 rounded-xl shrink-0",
                isPremium ? "bg-emerald-500 text-white" : "bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              )}>
                {isPremium ? <Crown size={18} /> : <UserIcon size={18} />}
              </div>
              <p className="font-semibold dark:text-white text-base leading-tight">
                {isPremium === null ? 'Verificando estado...' : (isPremium ? 'Plan Premium Activo' : 'Usuario Estándar')}
              </p>
            </div>

            {/* Descripción + botón en la misma fila base, con botón siempre a la derecha */}
            <div className="flex items-end justify-between gap-3 pl-1">
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed flex-1 min-w-0">
                {isPremium === null
                  ? 'Estamos sincronizando tu cuenta con Stripe.'
                  : (isPremium
                      ? (premiumUntil
                          ? `Activa hasta el ${new Date(premiumUntil).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`
                          : 'Tu suscripción Premium está activa.')
                      : 'Mejora tu plan para desbloquear todas las funciones.')}
              </p>
              {!isPremium && (
                <button
                  onClick={() => setView('planes')}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none shrink-0"
                >
                  Mejorar
                </button>
              )}
            </div>
          </div>
        </div>
        
        {isPremium && (
          <div className="mt-4 flex items-center gap-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest px-1">
            <Check size={12} />
            Sin anuncios y con todas las funciones desbloqueadas
          </div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white dark:bg-gray-800 p-4 sm:p-6 md:p-8 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-gray-200/60 dark:border-gray-700 dark:shadow-none mb-6">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold dark:text-white">Cuentas y Tarjetas</h3>
          {!isAddingAccount && (
            <button 
              onClick={() => {
                setAccountForm({ id: '', name: '', type: 'debit', cards: '', interest_rate: '' });
                setIsAddingAccount(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all text-sm"
            >
              <Plus size={16} />
              Agregar Cuenta
            </button>
          )}
        </div>

        {isAddingAccount ? (
          <form onSubmit={handleSaveAccount} className="space-y-4 bg-gray-50 dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold dark:text-white">{accountForm.id ? 'Editar Cuenta' : 'Nueva Cuenta'}</h4>
              <button type="button" onClick={() => setIsAddingAccount(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase">Nombre de la Cuenta (Ej. AMEX Crédito)</label>
              <input 
                type="text"
                value={accountForm.name}
                onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                placeholder="Nombre global de la cuenta"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase">Tipo de Cuenta</label>
              <select 
                value={accountForm.type}
                onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
              >
                <option value="debit">Débito / Nómina</option>
                <option value="credit">Crédito</option>
                <option value="savings">Ahorro / Inversión</option>
                <option value="cash">Efectivo</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase">Tarjetas Asociadas (Opcional, separadas por coma)</label>
              <input 
                type="text"
                value={accountForm.cards}
                onChange={(e) => setAccountForm({ ...accountForm, cards: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                placeholder="Ej. AMEX Platinum, AMEX Gold"
              />
              <p className="text-[10px] text-gray-500 mt-1">Si tienes varias tarjetas que comparten el mismo saldo/cuenta, agrégalas aquí.</p>
            </div>

            {(accountForm.type === 'savings') && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Tasa de interés anual (%) (Opcional)</label>
                <div className="relative">
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    value={accountForm.interest_rate || ''}
                    onChange={(e) => setAccountForm({ ...accountForm, interest_rate: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white pr-10"
                    placeholder="Ej. 15"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Se calculará y registrará el interés de forma automática cada día.</p>
              </div>
            )}

            <div className="pt-4 flex gap-2">
              {accountForm.id && !accountForm.id.startsWith('auto_') && (
                <button 
                  type="button"
                  onClick={() => handleDeleteAccount(accountForm.id)}
                  className="w-12 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-all flex items-center justify-center shrink-0"
                  title="Eliminar cuenta"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <button 
                type="button"
                onClick={() => setIsAddingAccount(false)}
                className="flex-1 py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-700 transition-all text-sm"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={isProcessing}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-1 text-sm"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Guardar
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {displayAccounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center bg-gray-50 dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                  <CreditCard size={24} className="text-emerald-500" />
                </div>
                <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm mb-1">
                  Sin cuentas configuradas
                </p>
                <p className="text-xs text-gray-400 font-normal max-w-[220px] leading-relaxed mb-4">
                  Agrega tus cuentas para que ContaBot las reconozca automáticamente al registrar movimientos
                </p>
                <button
                  onClick={() => { setAccountForm({ id: '', name: '', type: 'debit', cards: '', interest_rate: '' }); setIsAddingAccount(true); }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-all"
                >
                  + Agregar primera cuenta
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayAccounts.map((acc: any) => (
                  <div 
                    key={acc.id} 
                    onClick={() => {
                      setAccountForm({ id: acc.id.startsWith('auto_') ? '' : acc.id, name: acc.name, type: acc.type, cards: (acc.cards || []).join(', '), interest_rate: acc.interest_rate ? String(acc.interest_rate) : '' });
                      setIsAddingAccount(true);
                    }}
                    className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 relative group cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg shadow-sm ${acc.type === 'credit' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : acc.type === 'savings' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : acc.type === 'cash' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                          {acc.type === 'credit' ? <CreditCard size={20} /> : acc.type === 'savings' ? <PiggyBank size={20} /> : acc.type === 'cash' ? <Banknote size={20} /> : <Wallet size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold dark:text-white">{acc.name}</h4>
                            {acc.id.startsWith('auto_') && (
                              <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-[9px] font-bold uppercase tracking-wider">Auto</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">{acc.type === 'credit' ? 'Crédito' : acc.type === 'savings' ? 'Ahorro' : acc.type === 'cash' ? 'Efectivo' : 'Débito'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                          <Pencil size={16} />
                        </div>
                        {!acc.id.startsWith('auto_') && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAccount(acc.id);
                            }}
                            className="p-2 text-red-600 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    {acc.cards && acc.cards.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">Tarjetas asociadas</p>
                        <div className="flex flex-wrap gap-2">
                          {acc.cards.map((card: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-xs text-gray-600 dark:text-gray-300">
                              {card}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.08 }} 
        className="bg-white dark:bg-gray-800 p-4 sm:p-6 md:p-8 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-gray-200/60 dark:border-gray-700 dark:shadow-none mb-6"
      >
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold dark:text-white">Categorías</h3>
          {!isAddingCategory && (
            <button
              onClick={() => { setNewCategoryName(''); setIsAddingCategory(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all text-sm"
            >
              <Plus size={16} /> Agregar
            </button>
          )}
        </div>

        {isAddingCategory && (
          <div className="flex gap-2 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
              placeholder="Nombre de la categoría"
              className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white text-sm"
              autoFocus
            />
            <button
              onClick={handleAddCategory}
              disabled={isProcessing || !newCategoryName.trim()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 text-sm flex items-center gap-1"
            >
              {isProcessing 
                ? <Loader2 size={14} className="animate-spin" /> 
                : <Check size={14} />
              }
              Guardar
            </button>
            <button
              onClick={() => { setIsAddingCategory(false); setNewCategoryName(''); }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all text-sm"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {userCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center bg-gray-50 dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
              <PieChartIcon size={24} className="text-emerald-500" />
            </div>
            <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm mb-1">
              Sin categorías todavía
            </p>
            <p className="text-xs text-gray-400 font-normal max-w-[220px] leading-relaxed">
              ContaBot las crea automáticamente cuando registras movimientos, o puedes agregarlas manualmente
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {userCategories.map((category) => (
              <div
                key={category}
                className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 group hover:border-emerald-400 dark:hover:border-emerald-600 transition-all"
              >
                {/* Punto de color generado a partir del nombre */}
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[Math.abs(category.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % COLORS.length] }}
                />

                {/* Modo edición o modo lectura */}
                {editingCategory === category ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editingCategoryValue}
                      onChange={(e) => setEditingCategoryValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRenameCategory(); if (e.key === 'Escape') setEditingCategory(null); }}
                      className="w-24 px-2 py-0.5 bg-white dark:bg-gray-700 border border-emerald-500 rounded-lg text-xs outline-none dark:text-white"
                      autoFocus
                    />
                    <button onClick={handleRenameCategory} disabled={isProcessing} className="text-emerald-500 hover:text-emerald-600">
                      {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    </button>
                    <button onClick={() => setEditingCategory(null)} className="text-gray-400 hover:text-gray-600">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-medium dark:text-white leading-none">{category}</span>
                    <div className="flex items-center gap-0.5 ml-1">
                      <button
                        onClick={() => { setEditingCategory(category); setEditingCategoryValue(category); }}
                        className="p-1 text-gray-400 hover:text-emerald-500 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-gray-800 p-4 sm:p-6 md:p-8 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-gray-200/60 dark:border-gray-700 dark:shadow-none">
        <h3 className="text-xl font-bold mb-8 dark:text-white">Preferencias</h3>
        
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                {isDarkMode ? <Moon className="text-indigo-400" /> : <Sun className="text-amber-500" />}
              </div>
              <div className="min-w-0">
                <p className="font-semibold dark:text-white">Modo Oscuro</p>
                <p className="text-xs text-gray-500 line-clamp-2">Cambia la apariencia de la app</p>
              </div>
            </div>
            <button 
              onClick={toggleTheme}
              className={cn(
                "w-14 h-8 rounded-full transition-all relative flex-shrink-0",
                isDarkMode ? 'bg-emerald-500' : 'bg-gray-300'
              )}
            >
              <div className={cn(
                "w-6 h-6 bg-white rounded-full absolute top-1 transition-all",
                isDarkMode ? 'right-1' : 'left-1'
              )} />
            </button>
          </div>

          {notificationPermission !== 'unsupported' && (
            <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Bell className="text-blue-500" size={20} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold dark:text-white">Notificaciones</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {notificationPermission === 'denied'
                      ? 'Bloqueadas en el navegador'
                      : isPushEnabled
                      ? 'Activadas — objetivos, deudas y recordatorios'
                      : 'Recibe alertas de tus objetivos y finanzas'}
                  </p>
                </div>
              </div>
              {notificationPermission === 'denied' ? (
                <span className="text-xs text-red-400 font-medium flex-shrink-0">Bloqueadas</span>
              ) : (
                <button
                  onClick={isPushEnabled ? disablePushNotifications : enablePushNotifications}
                  disabled={isTogglingPush}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0",
                    isPushEnabled ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600",
                    isTogglingPush && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isTogglingPush ? (
                    <Loader2 size={12} className="animate-spin text-white mx-auto" />
                  ) : (
                    <span className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                      isPushEnabled ? "translate-x-6" : "translate-x-1"
                    )} />
                  )}
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <LogOut className="text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold dark:text-white">Cerrar Sesión</p>
                <p className="text-xs text-gray-500 line-clamp-2">Salir de tu cuenta actual</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all flex-shrink-0"
            >
              Salir
            </button>
          </div>

          <div className="flex items-center justify-between p-3 sm:p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <Shield className="text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-red-600 dark:text-red-400">
                  Reinicio de Fábrica
                </p>
                <p className="text-xs text-red-400 dark:text-red-500 line-clamp-2">
                  Borra todos tus datos permanentemente
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowResetModal(true)}
              className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-all text-sm flex-shrink-0"
            >
              Reiniciar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
  };

  useEffect(() => {
    if (!isLoading) {
      sessionStorage.removeItem('app_retry_count');
      return;
    }

    const retryCount = parseInt(sessionStorage.getItem('app_retry_count') || '0', 10);

    const longTimer = setTimeout(() => {
      setIsTakingLong(true);
    }, 6000);

    const reloadTimer = setTimeout(() => {
      if (retryCount < 2) {
        sessionStorage.setItem('app_retry_count', (retryCount + 1).toString());
        window.location.reload();
      } else {
        setHasFailedLoading(true);
      }
    }, 10000);

    return () => {
      clearTimeout(longTimer);
      clearTimeout(reloadTimer);
    };
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading) {
      const readyTimer = setTimeout(() => {
        setIsAppReady(true);
      }, 300); // Wait for fade out to complete
      
      const adTimer = setTimeout(() => {
        // Si isPremium es null, intentamos mostrarlo de todos modos si ha pasado suficiente tiempo
        // o asumimos que es false si el fetch falló.
        if (isPremium === false || isPremium === null) {
          if (!isPremium) setShowAd(true);
        }
      }, 2000); // Aumentamos un poco el tiempo para asegurar que la carga de suscripción termine
      
      return () => {
        clearTimeout(readyTimer);
        clearTimeout(adTimer);
      };
    }
  }, [isLoading, isPremium]);

  const linkedProposalIndex = (() => {
    if (!proposal?.pending_proposals?.length) return -1;
    const primaryKind = proposal.result.create?.event?.kind;
    const primaryAmount = proposal.result.create?.event?.amount;
    
    return proposal.pending_proposals.findIndex((p: any) => {
      const pendingKind = p.result?.create?.event?.kind;
      const pendingAmount = p.result?.create?.event?.amount;
      
      const isLoanGiven = primaryKind === 'loan_given' && pendingKind === 'expense';
      const isDebtIncrease = primaryKind === 'debt_increase' && pendingKind === 'income';
      const isDebtPayment = primaryKind === 'debt_payment' && pendingKind === 'expense';
      const isLoanRepayment = primaryKind === 'loan_repayment_received' && pendingKind === 'income';
      
      const isTransfer = (primaryKind === 'expense' && pendingKind === 'income') && 
        primaryAmount === pendingAmount &&
        (proposal.result.create?.event?.category?.toLowerCase().includes('traspaso') || proposal.result.create?.event?.category?.toLowerCase().includes('transferencia'));
        
      return isLoanGiven || isDebtIncrease || isDebtPayment || isLoanRepayment || isTransfer;
    });
  })();
  
  const isTransferProposal = (() => {
    if (linkedProposalIndex === -1) return false;
    const primaryKind = proposal.result.create?.event?.kind;
    const pendingKind = proposal.pending_proposals[linkedProposalIndex].result?.create?.event?.kind;
    return primaryKind === 'expense' && pendingKind === 'income';
  })();
  
  const transferProposalIndex = isTransferProposal ? linkedProposalIndex : -1;
  const remainingPendingCount = proposal?.pending_proposals ? proposal.pending_proposals.length - (linkedProposalIndex !== -1 ? 1 : 0) : 0;

  return (
    <>
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] bg-gradient-to-b from-[#0d5c45] to-[#083d2e] flex items-center justify-center pb-[env(safe-area-inset-bottom)]"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              <img 
                src={APP_LOGO_TRANSPARENT} 
                alt="Logo" 
                className="w-28 h-28 mb-8 drop-shadow-[0_15px_30px_rgba(255,255,255,0.15)]" 
                referrerPolicy="no-referrer" 
              />
              
              <h1 className="text-white font-bold text-2xl tracking-[0.2em] uppercase mb-2">
                ContaBot
              </h1>
              <p className="text-white/30 text-xs font-medium tracking-wider mb-10">
                Tu asistente financiero inteligente
              </p>

              <div className="flex gap-2">
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0 }}
                  className="w-2.5 h-2.5 bg-white/80 rounded-full"
                />
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                  className="w-2.5 h-2.5 bg-white/80 rounded-full"
                />
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                  className="w-2.5 h-2.5 bg-white/80 rounded-full"
                />
              </div>

              {hasFailedLoading ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 flex flex-col items-center"
                >
                  <p className="text-white/80 text-sm font-medium text-center max-w-[250px] mb-4">
                    Estamos teniendo problemas técnicos. Por favor intenta más tarde 🙏
                  </p>
                  <button 
                    onClick={() => {
                      sessionStorage.removeItem('app_retry_count');
                      window.location.reload();
                    }}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold text-sm transition-all"
                  >
                    Reintentar
                  </button>
                </motion.div>
              ) : isTakingLong ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6"
                >
                  <p className="text-white/30 text-[10px] font-medium tracking-wider">
                    Esto está tardando más de lo normal, reintentando...
                  </p>
                </motion.div>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-[#e8ebf0] dark:bg-gray-950 flex flex-col transition-colors duration-300 pb-[env(safe-area-inset-bottom)]">
      {/* Header */}
      {view !== 'auth' && (
        <div className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 z-40 bg-white dark:bg-gray-900 transition-colors duration-300">
          <div className="flex items-center gap-2.5">
            <img src={APP_LOGO} alt="ContaBot" className="w-8 h-8 rounded-xl" />
            <span className="font-bold text-base tracking-tight dark:text-white">
              ContaBot
            </span>
          </div>

          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      )}
      
      {/* Success Toast */}
      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -100, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -100, x: '-50%' }}
            className="fixed top-6 left-1/2 z-[100] w-full max-w-md px-4"
          >
            <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3 border border-emerald-500">
              <div className="p-2 bg-white/20 rounded-lg shrink-0">
                <Check size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm mb-1">Éxito</p>
                <p className="text-xs opacity-90 leading-relaxed">{success}</p>
              </div>
              <button onClick={() => setSuccess(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -100, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -100, x: '-50%' }}
            className="fixed top-6 left-1/2 z-[100] w-full max-w-md px-4"
          >
            <div className="bg-red-600 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3 border border-red-500">
              <div className="p-2 bg-white/20 rounded-lg shrink-0">
                <AlertCircle size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm mb-1">Error de Sistema</p>
                <p className="text-xs opacity-90 leading-relaxed">{error}</p>

                {(error.includes('Firestore') || error.toLowerCase().includes('permisos') || error.toLowerCase().includes('permissions')) && !error.includes('IA') && (
                  <button 
                    onClick={() => { setShowRulesHelper(true); setError(null); }}
                    className="mt-3 px-4 py-2 bg-white text-red-600 rounded-xl font-bold text-xs hover:bg-gray-100 transition-all"
                  >
                    Ver solución (Reglas de Firestore)
                  </button>
                )}
                {error.includes('https://console.firebase.google.com') && (
                  <a 
                    href={error.split(': ').pop()} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-3 px-4 py-2 bg-white text-red-600 rounded-xl font-bold text-xs hover:bg-gray-100 transition-all inline-block text-center"
                  >
                    {error.includes('construyendo') ? 'Ver progreso en Firebase' : 'Crear índice en Firebase'}
                  </a>
                )}
              </div>
              <button onClick={() => setError(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {isDeletingAccount && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-red-100 dark:border-red-900/30"
            >
              <div className="p-5 sm:p-6 md:p-8 text-center">
                <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-6">
                  <AlertCircle size={40} />
                </div>
                <h3 className="text-xl sm:text-2xl font-black dark:text-white mb-4 tracking-tight">¿Eliminar cuenta?</h3>
                <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl mb-8">
                  <p className="text-red-800 dark:text-red-300 text-sm font-medium leading-relaxed">
                    Esta acción es irreversible. Eliminar esta cuenta puede afectar a los saldos de las cuentas o a los gráficos ya creados.
                  </p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={executeDeleteAccount}
                    disabled={deleteAccountConfirmTimer > 0 || isProcessing}
                    className={cn(
                      "w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-xl",
                      deleteAccountConfirmTimer > 0 
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                        : "bg-red-600 text-white hover:bg-red-700 shadow-red-600/20"
                    )}
                  >
                    {isProcessing ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : deleteAccountConfirmTimer > 0 ? (
                      `Espera ${deleteAccountConfirmTimer}s...`
                    ) : (
                      <>
                        <Trash2 size={20} />
                        Confirmar Eliminación
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => setIsDeletingAccount(null)}
                    disabled={isProcessing}
                    className="w-full py-4 text-gray-500 dark:text-gray-400 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6 pb-[calc(8rem+env(safe-area-inset-bottom))]">
        {view === 'auth' && renderAuth()}
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {renderHome()}
            </motion.div>
          )}
          {view === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {renderAnalytics()}
            </motion.div>
          )}
          {view === 'goals' && (
            <motion.div
              key="goals"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {renderGoals()}
            </motion.div>
          )}
          {view === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {renderSettings()}
            </motion.div>
          )}
          {view === 'planes' && user && (
            <motion.div
              key="planes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <PlanesView userId={user.uid} onBack={() => setView('home')} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      {view !== 'auth' && (
        <div className={cn(
          "fixed left-0 right-0 z-50 flex justify-center px-4 pb-5 transition-all duration-300",
          view === 'home' 
            ? (isNavVisible ? 'bottom-[calc(4.75rem+env(safe-area-inset-bottom))]' : '-bottom-32') 
            : (isNavVisible ? 'bottom-0' : '-bottom-32')
        )}>
          <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl px-2 py-2 shadow-xl shadow-black/10">
            {[
              { id: 'home', label: 'Inicio', icon: HomeIcon },
              { id: 'analytics', label: 'Análisis', icon: PieChartIcon },
              { id: 'goals', label: 'Objetivos', icon: Target },
              { id: 'settings', label: 'Ajustes', icon: SettingsIcon },
            ].map((tab) => {
              const isActive = view === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id as View)}
                  className={`flex flex-col items-center justify-center rounded-2xl transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500 text-white px-5 py-2.5 gap-1'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-4 py-2.5 gap-1'
                  }`}
                >
                  <tab.icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  {isActive && (
                    <span className="text-[10px] font-semibold leading-none">
                      {tab.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input Bar (Only visible on Home) */}
      {view === 'home' && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#e8ebf0] dark:from-gray-950 via-[#e8ebf0]/90 dark:via-gray-950 to-transparent backdrop-blur-sm p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-40">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleTextInput} className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-200 focus-within:border-emerald-500/50 focus-within:shadow-emerald-500/10 focus-within:shadow-2xl">
              <div className="flex-1 relative flex items-center">
                <textarea 
                  ref={textareaRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTextInput(e as any);
                    }
                  }}
                  placeholder="¿Qué registramos hoy?"
                  className="w-full bg-transparent border-none rounded-xl px-4 py-3 focus:ring-0 dark:text-white resize-none max-h-[150px] overflow-y-auto leading-relaxed"
                  disabled={isProcessing}
                />
              </div>
              
              <div className="flex items-center min-h-[44px]">
                <AnimatePresence mode="wait">
                  {isSpeaking ? (
                    <motion.div
                      key="speaking"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="flex items-center gap-1"
                    >
                      {/* Animación de ondas de voz */}
                      <div className="flex items-end gap-0.5 h-6">
                        {[0, 1, 2, 3].map((i) => (
                          <motion.div
                            key={i}
                            className="w-1 bg-emerald-500 rounded-full"
                            animate={{ height: ['4px', '20px', '4px'] }}
                            transition={{
                              duration: 0.6,
                              repeat: Infinity,
                              delay: i * 0.15,
                              ease: 'easeInOut'
                            }}
                          />
                        ))}
                      </div>
                      {/* Botón para silenciar */}
                      <button
                        type="button"
                        onClick={stopSpeaking}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all"
                        title="Silenciar"
                      >
                        <X size={18} />
                      </button>
                    </motion.div>
                  ) : !inputText.trim() && !isRecording && !isVoiceProcessing ? (
                    <motion.div 
                      key="media-actions"
                      initial={{ opacity: 0, scale: 0.8, x: 10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8, x: 10 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="flex gap-1"
                    >
                      <button 
                        type="button"
                        onClick={startRecording}
                        className="p-3 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-all flex flex-col items-center justify-center gap-0.5"
                        disabled={isProcessing}
                      >
                        <Mic size={20} />
                        {isPremium === false && (
                          <span className={audioUsage < 3 ? "text-[9px] text-gray-400 leading-none" : "text-[9px] text-red-400 leading-none"}>
                            {audioUsage < 3 ? 3 - audioUsage : 0}
                          </span>
                        )}
                      </button>
                      
                      <div className="relative">
                        <button 
                          type="button"
                          onClick={() => setShowCameraMenu(!showCameraMenu)}
                          className={cn(
                            "p-3 rounded-2xl transition-all flex flex-col items-center justify-center gap-0.5",
                            showCameraMenu ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          )}
                          disabled={isProcessing}
                        >
                          <Camera size={20} />
                          {isPremium === false && (
                            <span className={photoUsage < 3 ? "text-[9px] text-gray-400 leading-none" : "text-[9px] text-red-400 leading-none"}>
                              {photoUsage < 3 ? 3 - photoUsage : 0}
                            </span>
                          )}
                        </button>
                        
                        <AnimatePresence>
                          {showCameraMenu && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden min-w-[160px] z-50 max-h-[80vh] overflow-y-auto"
                            >
                              <button 
                                type="button"
                                onClick={() => { 
                                  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                                  if (isMobile) {
                                    cameraInputRef.current?.click(); 
                                  } else {
                                    startWebcam();
                                  }
                                  setShowCameraMenu(false); 
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-bold dark:text-white whitespace-nowrap"
                              >
                                <Camera size={18} className="text-emerald-500" />
                                Tomar Imagen
                              </button>
                              <div className="h-px bg-gray-100 dark:bg-gray-700" />
                              <button 
                                type="button"
                                onClick={() => { fileInputRef.current?.click(); setShowCameraMenu(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-bold dark:text-white whitespace-nowrap"
                              >
                                <Upload size={18} className="text-blue-500" />
                                Elegir Imagen
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  ) : isRecording ? (
                    <motion.button 
                      key="recording-stop"
                      type="button"
                      onClick={stopRecording}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="p-3 bg-red-500 text-white rounded-2xl animate-pulse shadow-lg shadow-red-200 dark:shadow-none"
                    >
                      <Mic size={20} />
                    </motion.button>
                  ) : isVoiceProcessing ? (
                    <motion.button 
                      key="voice-processing"
                      type="button"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none cursor-wait"
                      disabled
                    >
                      <Loader2 className="animate-spin" size={20} />
                    </motion.button>
                  ) : (
                    <motion.button
                      key="send-action"
                      type="submit"
                      initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      disabled={isProcessing}
                      className="p-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    </motion.button>
                  )}
                </AnimatePresence>

                <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" multiple className="hidden" />
                <input type="file" ref={cameraInputRef} onChange={handleImageSelect} accept="image/*" capture="environment" className="hidden" />
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Ad Modal */}
      <AnimatePresence>
        {showAd && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative"
            >
              <div className="relative aspect-video bg-emerald-500 flex items-center justify-center overflow-hidden">
                <img 
                  src="https://picsum.photos/seed/ads/800/450" 
                  alt="Publicidad" 
                  className="w-full h-full object-cover opacity-80"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4 sm:p-5 md:p-6">
                  <div>
                    <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider mb-2 inline-block">Patrocinado</span>
                    <h3 className="text-white text-xl font-black">¡Ahorra más con ContaBot Pro!</h3>
                  </div>
                </div>
              </div>
              
              <div className="p-4 sm:p-5 md:p-6">
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Obtén análisis detallados, múltiples cuentas y soporte prioritario. ¡Prueba 7 días gratis hoy mismo!
                </p>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => { setShowAd(false); setView('planes'); }}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
                  >
                    Saber más
                  </button>
                  {canCloseAd ? (
                    <button 
                      onClick={() => setShowAd(false)}
                      className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                    >
                      <X size={20} />
                    </button>
                  ) : (
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-xl font-mono font-bold min-w-[44px] flex items-center justify-center">
                      {adTimer}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crop Modal */}
      <AnimatePresence>
        {showCropModal && imageToCrop && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="flex-1 relative overflow-auto p-2 bg-gray-100 dark:bg-gray-800 flex flex-col items-center">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  className="max-w-full"
                >
                  <img 
                    ref={imgRef}
                    src={imageToCrop} 
                    alt="Crop" 
                    className="max-w-full h-auto rounded-lg shadow-sm block"
                    onLoad={(e) => {
                      const { width, height } = e.currentTarget;
                      const fullCrop: Crop = { unit: '%', width: 100, height: 100, x: 0, y: 0 };
                      setCrop(fullCrop);
                      // Also set completed crop so it can be confirmed immediately
                      setCompletedCrop({
                        unit: 'px',
                        x: 0,
                        y: 0,
                        width,
                        height
                      });
                    }}
                  />
                </ReactCrop>
              </div>
              
              <div className="bg-white dark:bg-gray-900 p-4 space-y-3 shrink-0 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between gap-4">
                  <button 
                    onClick={() => {
                      if (imgRef.current) {
                        const { width, height } = imgRef.current;
                        const fullCrop: Crop = { unit: '%', width: 100, height: 100, x: 0, y: 0 };
                        setCrop(fullCrop);
                        setCompletedCrop({ unit: 'px', x: 0, y: 0, width, height });
                      }
                    }}
                    className="px-4 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  >
                    Reiniciar Encuadre
                  </button>
                  <p className="text-[10px] text-gray-400 italic">
                    Verifica la calidad de la imagen
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => { setShowCropModal(false); setImageToCrop(null); setCrop(undefined); }}
                    className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button"
                    onClick={handleConfirmCrop}
                    className="flex-[2] py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 text-sm"
                    disabled={isProcessing || !completedCrop}
                  >
                    {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Group Modal */}
      <AnimatePresence>
        {showImageGroupModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6">
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <Loader2 className="text-emerald-600 dark:text-emerald-400 animate-spin" size={48} />
                    <div className="text-center space-y-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Procesando tickets...
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Analizando {selectedFiles.length} imágenes
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  ¿Cómo procesar estas imágenes?
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Has seleccionado {selectedFiles.length} imágenes.
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => handleProcessMultipleImages('single')}
                    className="w-full flex items-center justify-start gap-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-100 dark:border-indigo-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors group"
                  >
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-800 rounded-lg text-indigo-600 dark:text-indigo-300 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/></svg>
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-white">Mismo Ticket</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Es un ticket largo dividido en partes</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleProcessMultipleImages('multiple')}
                    className="w-full flex items-center justify-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-100 dark:border-emerald-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors group"
                  >
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-lg text-emerald-600 dark:text-emerald-300 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h10"/><path d="M7 12h10"/><path d="M7 17h10"/></svg>
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-white">Tickets Diferentes</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Son compras separadas</div>
                    </div>
                  </button>
                </div>

                <button
                  onClick={() => { setShowImageGroupModal(false); setSelectedFiles([]); }}
                  className="mt-6 w-full py-3 text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Webcam Modal */}
      <AnimatePresence>
        {showWebcamModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black flex flex-col"
          >
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            
            <div className="bg-white dark:bg-gray-900 p-6 flex flex-col items-center gap-4 shrink-0 border-t border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium text-center">
                Encuadra el ticket y presiona el botón para capturar
              </p>
              
              <div className="flex items-center gap-6 w-full max-w-xs">
                <button 
                  type="button"
                  onClick={stopWebcam}
                  className="p-4 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
                >
                  <X size={24} />
                </button>
                
                <button 
                  type="button"
                  onClick={capturePhoto}
                  className="flex-1 h-16 bg-emerald-600 text-white rounded-2xl font-bold shadow-xl shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  <Camera size={24} />
                  Capturar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Image Modal */}
      <AnimatePresence>
        {showReceiptModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-sm flex items-center justify-center p-2 md:p-8"
            onClick={() => setShowReceiptModal(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl w-full max-h-[95vh] bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-4 right-4 z-20">
                <button 
                  onClick={handleFullScreen}
                  className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all shadow-lg backdrop-blur-md"
                  title="Pantalla Completa"
                >
                  <Maximize size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-auto p-4 bg-gray-100 dark:bg-gray-800 flex flex-col items-center">
                <img 
                  ref={receiptImgRef}
                  src={`data:image/jpeg;base64,${showReceiptModal}`} 
                  alt="Ticket Original" 
                  className="max-w-full h-auto rounded-xl shadow-2xl block"
                />
              </div>
              
              <div className="p-4 md:p-6 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-900 shrink-0">
                <div>
                  <h3 className="font-bold dark:text-white text-lg">Ticket de Compra</h3>
                  <p className="text-xs text-gray-500">Imagen guardada en el registro</p>
                </div>
                <button 
                  onClick={() => setShowReceiptModal(null)}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all text-sm"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Rules Helper Modal */}
      <AnimatePresence>
        {showRulesHelper && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <div className="p-5 sm:p-6 md:p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold dark:text-white">Reglas de Seguridad de Firestore</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">Copia y pega esto en tu Consola de Firebase</p>
                </div>
                <button onClick={() => setShowRulesHelper(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all">
                  <X size={24} className="text-gray-400" />
                </button>
              </div>
              <div className="p-5 sm:p-6 md:p-8">
                <div className="bg-gray-950 rounded-2xl p-6 font-mono text-xs text-emerald-400 overflow-x-auto relative group">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(FIRESTORE_RULES);
                      setSuccess("Reglas copiadas al portapapeles 📋");
                    }}
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copiar Reglas"
                  >
                    <Send size={16} />
                  </button>
                  <pre>{FIRESTORE_RULES}</pre>
                </div>
                <div className="mt-6 space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Pasos para configurar:</strong>
                  </p>
                  <ol className="text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside space-y-2">
                    <li>Ve a tu <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">Consola de Firebase</a>.</li>
                    <li>Selecciona tu proyecto y ve a <strong>Firestore Database</strong>.</li>
                    <li>Haz clic en la pestaña <strong>Rules</strong> (Reglas).</li>
                    <li>Reemplaza el contenido actual con el código de arriba.</li>
                    <li>Haz clic en <strong>Publish</strong> (Publicar).</li>
                  </ol>
                </div>
                <button 
                  onClick={() => setShowRulesHelper(false)}
                  className="w-full mt-8 py-4 bg-emerald-600 text-white font-semibold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <div className="p-5 sm:p-6 md:p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold dark:text-white">Exportar datos</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    {getExportPeriodLabel()}
                  </p>
                </div>
                <button onClick={() => {
                  setShowExportModal(false);
                  setExportFormat(null);
                }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all">
                  <X size={24} className="text-gray-400" />
                </button>
              </div>
              <div className="p-5 sm:p-6 md:p-8">
                {filterType === 'day' && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 
                    dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-400 
                    text-xs font-medium flex items-center gap-2 mb-4">
                    <AlertCircle size={14} />
                    La exportación por día específico no está disponible. 
                    Cambia el filtro a Mes, Año o Todo para exportar.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <button
                    onClick={() => setExportFormat('pdf')}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                      exportFormat === 'pdf' 
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mb-2">
                      <span className="font-bold text-lg">PDF</span>
                    </div>
                    <span className="font-medium">Documento PDF</span>
                    <span className="text-xs text-center opacity-70">Reporte visual con gráficas</span>
                  </button>
                  
                  <button
                    onClick={() => setExportFormat('excel')}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                      exportFormat === 'excel' 
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mb-2">
                      <span className="font-bold text-lg">XLSX</span>
                    </div>
                    <span className="font-medium">Hoja de cálculo</span>
                    <span className="text-xs text-center opacity-70">Datos crudos para análisis</span>
                  </button>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setShowExportModal(false);
                      setExportFormat(null);
                    }}
                    className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={exportFormat === null || isExporting || filterType === 'day'}
                    className="flex-1 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isExporting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Exportando...
                      </>
                    ) : (
                      <>
                        <Download size={20} />
                        Exportar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <div className="p-5 sm:p-6 md:p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold dark:text-white">
                    {resetStep === 1 && "Reinicio de Fábrica"}
                    {resetStep === 2 && "¿Estás completamente seguro?"}
                    {resetStep === 3 && "Confirma tu identidad"}
                  </h3>
                </div>
                <button onClick={closeResetModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all">
                  <X size={24} className="text-gray-400" />
                </button>
              </div>
              <div className="p-5 sm:p-6 md:p-8">
                {resetStep === 1 && (
                  <div className="flex flex-col items-center text-center">
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-2xl mb-6">
                      <Shield size={48} className="text-red-500" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Esta acción es IRREVERSIBLE. Se eliminará permanentemente:
                    </p>
                    <ul className="text-left text-sm text-gray-600 dark:text-gray-400 space-y-2 mb-6 w-full bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl">
                      <li className="flex items-center gap-2">• Todos tus movimientos y transacciones</li>
                      <li className="flex items-center gap-2">• Todos tus objetivos de ahorro</li>
                      <li className="flex items-center gap-2">• Todo el historial del chat con la IA</li>
                      <li className="flex items-center gap-2">• Todas tus cuentas configuradas</li>
                      <li className="flex items-center gap-2">• Tus contadores de uso mensual</li>
                    </ul>
                    <div className="w-full p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-emerald-700 dark:text-emerald-400 text-sm font-medium mb-8 text-left flex items-start gap-3">
                      <Check size={18} className="shrink-0 mt-0.5" />
                      <div>
                        ✓ Se mantendrá tu cuenta, nombre, foto y {isPremium ? 'tu suscripción Premium activa.' : 'configuración de tema.'}
                      </div>
                    </div>
                    <div className="flex gap-4 w-full">
                      <button
                        onClick={closeResetModal}
                        className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => setResetStep(2)}
                        className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                      >
                        Entiendo, continuar →
                      </button>
                    </div>
                  </div>
                )}

                {resetStep === 2 && (
                  <div className="flex flex-col items-center text-center">
                    <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-2xl mb-6">
                      <AlertCircle size={48} className="text-amber-500" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                      No podrás recuperar tus datos después de esto. Esta acción no se puede deshacer.
                    </p>
                    <div className="flex flex-col gap-4 w-full">
                      <button
                        onClick={() => {
                          setResetStep(3);
                          setResetConfirmTimer(5);
                        }}
                        className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                      >
                        Sí, quiero borrar todo
                      </button>
                      <button
                        onClick={closeResetModal}
                        className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                      >
                        No, mejor no
                      </button>
                    </div>
                  </div>
                )}

                {resetStep === 3 && (
                  <div className="flex flex-col items-center text-center">
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-2xl mb-6">
                      <Trash2 size={48} className="text-red-500" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Escribe tu nombre de usuario exactamente para confirmar:
                    </p>
                    <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono font-bold text-gray-700 dark:text-gray-300 mb-6">
                      {user?.username}
                    </div>
                    <div className="w-full mb-8 text-left">
                      <input
                        type="text"
                        value={resetConfirmText}
                        onChange={(e) => setResetConfirmText(e.target.value)}
                        placeholder="Escribe tu nombre de usuario"
                        className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl outline-none transition-all ${
                          resetConfirmText.length > 0 && resetConfirmText !== user?.username
                            ? 'border-red-500 focus:border-red-500'
                            : resetConfirmText === user?.username
                            ? 'border-emerald-500 focus:border-emerald-500'
                            : 'border-gray-200 dark:border-gray-700 focus:border-emerald-500'
                        } dark:text-white`}
                      />
                      <div className="h-6 mt-2 text-sm font-medium">
                        {resetConfirmText === user?.username && (
                          <span className="text-emerald-500">✓ Nombre confirmado</span>
                        )}
                        {resetConfirmText.length > 0 && resetConfirmText !== user?.username && (
                          <span className="text-red-500">✗ No coincide</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4 w-full">
                      <button
                        onClick={closeResetModal}
                        className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={executeFactoryReset}
                        disabled={resetConfirmText !== user?.username || isResetting || resetConfirmTimer > 0}
                        className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isResetting ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : resetConfirmTimer > 0 ? (
                          `Espera ${resetConfirmTimer}s...`
                        ) : (
                          "Borrar todo permanentemente"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {showReassignModal && categoryToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <div className="p-4 sm:p-5 md:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold dark:text-white">
                    Eliminar "{categoryToDelete}"
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    ¿A qué categoría mover los movimientos?
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setShowReassignModal(false);
                    setCategoryToDelete(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="p-4 sm:p-5 md:p-6 space-y-3 max-h-[50vh] overflow-y-auto">
                {userCategories
                  .filter(c => c !== categoryToDelete)
                  .map(category => (
                    <button
                      key={category}
                      onClick={() => {
                        setReassignTarget(category);
                        setIsCreatingReassignCategory(false);
                        setNewReassignCategoryName('');
                      }}
                      className={cn(
                        "w-full p-3 rounded-2xl border-2 text-left font-medium transition-all text-sm",
                        reassignTarget === category && !isCreatingReassignCategory
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                          : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 dark:text-white hover:border-emerald-300 dark:hover:border-emerald-700"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span>{category}</span>
                        {reassignTarget === category && !isCreatingReassignCategory && (
                          <Check size={16} className="text-emerald-500" />
                        )}
                      </div>
                    </button>
                  ))
                }

                <button
                  onClick={() => {
                    setIsCreatingReassignCategory(true);
                    setReassignTarget('');
                  }}
                  className={cn(
                    "w-full p-3 rounded-2xl border-2 text-left font-medium transition-all text-sm",
                    isCreatingReassignCategory
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                      : "border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-emerald-300 dark:hover:border-emerald-700"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Plus size={16} />
                    <span>+ Nueva categoría</span>
                  </div>
                </button>

                {isCreatingReassignCategory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden"
                  >
                    <input
                      type="text"
                      value={newReassignCategoryName}
                      onChange={(e) => setNewReassignCategoryName(e.target.value)}
                      onKeyDown={(e) => { 
                        if (e.key === 'Enter') executeDeleteWithReassign(); 
                      }}
                      placeholder="Nombre de la nueva categoría"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-emerald-500 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none dark:text-white text-sm"
                      autoFocus
                    />
                  </motion.div>
                )}
              </div>

              <div className="p-4 sm:p-5 md:p-6 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                <button
                  onClick={() => {
                    setShowReassignModal(false);
                    setCategoryToDelete(null);
                  }}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeDeleteWithReassign}
                  disabled={
                    isProcessingDelete || 
                    (!reassignTarget && !newReassignCategoryName.trim())
                  }
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-lg shadow-red-500/20"
                >
                  {isProcessingDelete 
                    ? <Loader2 size={16} className="animate-spin" />
                    : <Trash2 size={16} />
                  }
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}