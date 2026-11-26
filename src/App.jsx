import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  FileUp,
  Type,
  Image as ImageIcon,
  Grid,
  Download,
  Trash2,
  CheckCircle2,
  Lock,
  Layers,
  Sliders,
  Eye,
  RotateCw,
  Crown,
  Bookmark,
  Plus,
  AlertCircle,
  Loader2,
  ShieldCheck,
  FolderArchive,
  X,
  LogIn,
  LogOut,
  User,
  Database,
  Mail,
  KeyRound,
  RefreshCw,
} from 'lucide-react';

const scriptCache = {};

function loadScript(src, globalName) {
  if (typeof window !== 'undefined' && window[globalName]) {
    return Promise.resolve(window[globalName]);
  }
  if (!scriptCache[src]) {
    scriptCache[src] = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve(window[globalName]));
        existing.addEventListener('error', reject);
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve(window[globalName]);
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }
  return scriptCache[src];
}

const loadPdfLib = () =>
  loadScript('https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js', 'PDFLib');

const loadJSZip = () =>
  loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'JSZip');

const loadSupabaseJs = () =>
  loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', 'supabase');

const loadPdfJs = async () => {
  const pdfjsLib = await loadScript(
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'pdfjsLib'
  );
  if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  return pdfjsLib;
};

function getAppEnv() {
  try {
    return {
      url: import.meta.env.VITE_SUPABASE_URL || '',
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      stripePaymentLink: import.meta.env.VITE_STRIPE_PAYMENT_LINK || '',
    };
  } catch {
    return { url: '', anonKey: '', stripePaymentLink: '' };
  }
}

function renderTextToPngBytes(text, colorHex, fontSizePx, bold = true) {
  const scale = 3;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fontSpec = `${bold ? '800' : '500'} ${fontSizePx * scale}px "Prompt", "Sarabun", sans-serif`;

  ctx.font = fontSpec;
  const metrics = ctx.measureText(text || ' ');
  const textW = Math.ceil(metrics.width);
  const textH = Math.ceil(fontSizePx * scale * 1.45);

  canvas.width = Math.max(20, textW + 40 * scale);
  canvas.height = Math.max(20, textH + 20 * scale);

  ctx.font = fontSpec;
  ctx.fillStyle = colorHex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { bytes, width: canvas.width / scale, height: canvas.height / scale };
}

function loadImageFileToPngBytes(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 300;
      canvas.height = img.naturalHeight || 300;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      resolve({ bytes, width: canvas.width, height: canvas.height });
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}

function parsePageIndices(totalPages, mode, customRangeStr) {
  if (mode === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  if (mode === 'odd') {
    const res = [];
    for (let i = 0; i < totalPages; i += 2) res.push(i);
    return res;
  }
  if (mode === 'even') {
    const res = [];
    for (let i = 1; i < totalPages; i += 2) res.push(i);
    return res;
  }
  if (mode === 'first') {
    return totalPages > 0 ? [0] : [];
  }
  const parts = (customRangeStr || '').split(',');
  const set = new Set();
  parts.forEach((p) => {
    const trimmed = p.trim();
    if (!trimmed) return;
    if (trimmed.includes('-')) {
      const [s, e] = trimmed.split('-').map((n) => parseInt(n.trim(), 10));
      if (!isNaN(s) && !isNaN(e)) {
        for (let i = Math.max(1, s); i <= Math.min(totalPages, e); i++) {
          set.add(i - 1);
        }
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        set.add(num - 1);
      }
    }
  });
  return set.size > 0 ? Array.from(set).sort((a, b) => a - b) : [0];
}

const DEFAULT_PRESETS = [
  {
    id: 'p-copy',
    name: 'สำเนาถูกต้อง (แดง)',
    wmType: 'text',
    wmText: 'สำเนาถูกต้อง • ใช้สำหรับยื่นเอกสารเท่านั้น',
    wmColor: '#dc2626',
    wmSize: 28,
    wmOpacity: 35,
    wmRotation: -32,
    wmPosition: 'center',
  },
  {
    id: 'p-conf',
    name: 'CONFIDENTIAL (ปูเต็มหน้า)',
    wmType: 'text',
    wmText: 'CONFIDENTIAL • ห้ามเผยแพร่',
    wmColor: '#1e293b',
    wmSize: 22,
    wmOpacity: 20,
    wmRotation: -30,
    wmPosition: 'tile',
  },
  {
    id: 'p-draft',
    name: 'DRAFT / ฉบับร่าง',
    wmType: 'text',
    wmText: 'DRAFT • เอกสารฉบับร่าง',
    wmColor: '#0284c7',
    wmSize: 42,
    wmOpacity: 28,
    wmRotation: -35,
    wmPosition: 'center',
  },
];

const formatSize = (bytes) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getTodayThai = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${
    d.getFullYear() + 543
  }`;
};

export default function App() {
  const supabaseRef = useRef(null);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const [isProPlan, setIsProPlan] = useState(false);
  const [isRefreshingPlan, setIsRefreshingPlan] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [pdfFiles, setPdfFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [presets, setPresets] = useState(DEFAULT_PRESETS);
  const [toast, setToast] = useState(null);

  const previewCanvasRef = useRef(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDims, setPreviewDims] = useState({ width: 595, height: 842 });

  const [wmType, setWmType] = useState('text');
  const [wmText, setWmText] = useState('สำเนาถูกต้อง • CONFIDENTIAL');
  const [wmColor, setWmColor] = useState('#dc2626');
  const [wmBold, setWmBold] = useState(true);
  const [wmImageUrl, setWmImageUrl] = useState(null);
  const [wmImageName, setWmImageName] = useState('');
  const [wmSize, setWmSize] = useState(32);
  const [wmOpacity, setWmOpacity] = useState(35);
  const [wmRotation, setWmRotation] = useState(-30);
  const [wmPosition, setWmPosition] = useState('center');
  const [tileSpacing, setTileSpacing] = useState(140);
  const [pageRangeMode, setPageRangeMode] = useState('first');
  const [customRange, setCustomRange] = useState('1-3, 5');
  const [includeDateTag, setIncludeDateTag] = useState(false);
  const [includeFilenameFooter, setIncludeFilenameFooter] = useState(false);
  const [lockMetadata, setLockMetadata] = useState(true);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  const fetchUserProfile = async (client, currentUser) => {
    const userId = typeof currentUser === 'string' ? currentUser : currentUser?.id;
    const userEmail = typeof currentUser === 'object' ? currentUser?.email : null;

    if (!client || (!userId && !userEmail)) {
      setIsProPlan(false);
      return false;
    }

    try {
      let profileRow = null;

      if (userId) {
        const { data, error } = await client
          .from('profiles')
          .select('plan, pro_expires_at, email')
          .eq('id', userId)
          .maybeSingle();
        if (!error && data) {
          profileRow = data;
        }
      }

      if (!profileRow && userEmail) {
        const { data, error } = await client
          .from('profiles')
          .select('plan, pro_expires_at, email')
          .ilike('email', userEmail.trim())
          .maybeSingle();
        if (!error && data) {
          profileRow = data;
        }
      }

      if (profileRow) {
        const normalizedPlan = String(profileRow.plan || '').trim().toLowerCase();
        const expiryTime = profileRow.pro_expires_at
          ? new Date(profileRow.pro_expires_at).getTime()
          : null;
        const isNotExpired = !expiryTime || Number.isNaN(expiryTime) || expiryTime > Date.now();
        if ((normalizedPlan === 'pro' || normalizedPlan === 'active') && isNotExpired) {
          setIsProPlan(true);
          return { active: true, plan: normalizedPlan, expired: false };
        }
        return {
          active: false,
          plan: normalizedPlan || 'empty',
          expired: !isNotExpired,
        };
      }

      if (userId) {
        const { data: subData } = await client
          .from('subscriptions')
          .select('status, plan')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (
          subData &&
          (String(subData.status || '').toLowerCase() === 'active' ||
            String(subData.plan || '').toLowerCase() === 'pro')
        ) {
          setIsProPlan(true);
          return true;
        }
      }

      setIsProPlan(false);
      return { active: false, plan: 'not_found', expired: false };
    } catch {
      setIsProPlan(false);
      return { active: false, plan: 'error', expired: false };
    }
  };

  useEffect(() => {
    let authSubscription = null;
    const { url, anonKey } = getAppEnv();

    if (!url || !anonKey) {
      setSupabaseConnected(false);
      return;
    }

    loadSupabaseJs()
      .then(async (sbLib) => {
        if (!sbLib?.createClient) return;
        const client = sbLib.createClient(url, anonKey);
        supabaseRef.current = client;
        setSupabaseConnected(true);

        const {
          data: { session },
        } = await client.auth.getSession();
        const currentUser = session?.user || null;
        setUser(currentUser);
        if (currentUser) {
          await fetchUserProfile(client, currentUser);
        }

        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          if (params.get('payment') === 'success') {
            showToast('🎉 ชำระเงินสำเร็จ! กำลังตรวจสอบสิทธิ์ PRO...');
            if (currentUser) {
              setTimeout(() => fetchUserProfile(client, currentUser), 1500);
            }
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }

        const { data } = client.auth.onAuthStateChange((_event, newSession) => {
          const nextUser = newSession?.user || null;
          setUser(nextUser);
          if (nextUser) {
            fetchUserProfile(client, nextUser);
          } else {
            setIsProPlan(false);
          }
        });
        authSubscription = data?.subscription;
      })
      .catch((err) => {
        console.error('Supabase init error:', err);
      });

    return () => {
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  const handleRefreshPlan = async () => {
    if (!supabaseRef.current || !user) return;
    setIsRefreshingPlan(true);
    const result = await fetchUserProfile(supabaseRef.current, user);
    setIsRefreshingPlan(false);
    if (result?.active) {
      showToast('👑 ยืนยันสถานะ PRO รายเดือนเรียบร้อยแล้ว!');
    } else if (result?.expired) {
      showToast('⚠️ สิทธิ์ PRO ในฐานข้อมูลหมดอายุแล้ว (pro_expires_at)', 'error');
    } else {
      showToast(
        `ℹ️ ฐานข้อมูลของ ${user.email} แสดง plan: "${result?.plan || 'free'}"`,
        'error'
      );
    }
  };

  const handleGoogleLogin = async () => {
    if (!supabaseRef.current) {
      setAuthError('กรุณาตั้งค่าไฟล์ .env เชื่อม Supabase ก่อนครับ');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      const { error } = await supabaseRef.current.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err) {
      setAuthError(err?.message || 'ไม่สามารถเชื่อมต่อ Google Login ได้');
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (supabaseRef.current) {
      await supabaseRef.current.auth.signOut();
    }
    setUser(null);
    setIsProPlan(false);
    showToast('ออกจากระบบเรียบร้อยแล้ว');
  };

  const recordUsageToSupabase = async (fileCount, totalPages) => {
    if (!supabaseRef.current) return;
    try {
      await supabaseRef.current.from('usage_logs').insert({
        user_id: user?.id || null,
        room_id: 'room-401',
        app_name: 'SaladWatermarkPDF',
        file_count: fileCount,
        page_count: totalPages,
        environment: 'live',
      });
    } catch (err) {
      console.warn('Usage log skipped:', err);
    }
  };

  const activeFile = pdfFiles.find((f) => f.id === activeFileId) || pdfFiles[0] || null;
  const effectiveText = includeDateTag ? `${wmText} (${getTodayThai()})` : wmText;

  useEffect(() => {
    if (!isProPlan) {
      if (wmType === 'image') setWmType('text');
      if (pageRangeMode !== 'first') setPageRangeMode('first');
      if (wmPosition === 'tile') setWmPosition('center');
    } else if (pageRangeMode === 'first') {
      setPageRangeMode('all');
    }
  }, [isProPlan]);

  useEffect(() => {
    let cancelled = false;

    const renderPdfPage1 = async () => {
      if (!activeFile || !activeFile.arrayBuffer) {
        setPreviewLoaded(false);
        return;
      }
      setPreviewLoading(true);
      try {
        const pdfjsLib = await loadPdfJs();
        if (cancelled) return;
        const bufferCopy = activeFile.arrayBuffer.slice(0);
        const loadingTask = pdfjsLib.getDocument({ data: bufferCopy });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.4 });

        if (cancelled || !previewCanvasRef.current) return;
        const canvas = previewCanvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) {
          setPreviewDims({ width: viewport.width, height: viewport.height });
          setPreviewLoaded(true);
        }
      } catch (err) {
        console.error('PDF Preview error:', err);
        if (!cancelled) setPreviewLoaded(false);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    };

    renderPdfPage1();
    return () => {
      cancelled = true;
    };
  }, [activeFile?.id]);

  const handleAddPdfFiles = async (fileList) => {
    const incoming = Array.from(fileList || []).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (incoming.length === 0) {
      showToast('กรุณาเลือกไฟล์นามสกุล .pdf เท่านั้นครับ', 'error');
      return;
    }

    if (!isProPlan && (pdfFiles.length >= 1 || incoming.length > 1)) {
      showToast('โหมด Free รองรับทีละ 1 ไฟล์ — อัปเกรด Pro เพื่อทำทีละหลายไฟล์พร้อมกัน!', 'error');
      setShowUpgradeModal(true);
      if (pdfFiles.length >= 1) return;
    }

    const toProcess = isProPlan ? incoming : [incoming[0]];

    try {
      const PDFLib = await loadPdfLib();
      const loadedItems = [];

      for (const file of toProcess) {
        const arrayBuffer = await file.arrayBuffer();
        let pageCount = 1;
        try {
          const doc = await PDFLib.PDFDocument.load(arrayBuffer.slice(0), {
            ignoreEncryption: true,
          });
          pageCount = doc.getPageCount();
        } catch {
          pageCount = 1;
        }
        loadedItems.push({
          id: `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          name: file.name,
          size: file.size,
          arrayBuffer,
          pageCount,
          status: 'ready',
        });
      }

      setPdfFiles((prev) => (isProPlan ? [...prev, ...loadedItems] : loadedItems));
      if (!activeFileId && loadedItems[0]) {
        setActiveFileId(loadedItems[0].id);
      }
      showToast(`📄 เพิ่มไฟล์ PDF สำเร็จ ${loadedItems.length} ไฟล์`);
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถอ่านไฟล์ PDF ได้ กรุณาลองใหม่อีกครั้ง', 'error');
    }
  };

  const handleCreateSamplePdf = async () => {
    try {
      const PDFLib = await loadPdfLib();
      const pdfDoc = await PDFLib.PDFDocument.create();
      const font = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
      const regular = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

      for (let p = 1; p <= 3; p++) {
        const page = pdfDoc.addPage([595, 842]);
        page.drawText(`SAMPLE CONTRACT DOCUMENT - PAGE ${p}`, {
          x: 55,
          y: 770,
          size: 18,
          font,
          color: PDFLib.rgb(0.1, 0.15, 0.28),
        });
        page.drawLine({
          start: { x: 55, y: 755 },
          end: { x: 540, y: 755 },
          thickness: 1.5,
          color: PDFLib.rgb(0.2, 0.3, 0.5),
        });
        for (let line = 0; line < 14; line++) {
          page.drawText(
            `Section ${p}.${line + 1} - This is a real generated PDF file for testing SaladWatermarkPDF.`,
            {
              x: 55,
              y: 710 - line * 36,
              size: 11,
              font: regular,
              color: PDFLib.rgb(0.25, 0.25, 0.3),
            }
          );
        }
        page.drawText(`Page ${p} of 3 • SaladWatermarkPDF Test Document`, {
          x: 190,
          y: 45,
          size: 9,
          font: regular,
          color: PDFLib.rgb(0.5, 0.5, 0.5),
        });
      }

      const bytes = await pdfDoc.save();
      const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const sampleItem = {
        id: `sample-${Date.now()}`,
        file: null,
        name: `Sample_Contract_${pdfFiles.length + 1}.pdf`,
        size: bytes.byteLength,
        arrayBuffer,
        pageCount: 3,
        status: 'ready',
      };

      setPdfFiles((prev) => (isProPlan ? [...prev, sampleItem] : [sampleItem]));
      setActiveFileId(sampleItem.id);
      showToast('✨ สร้างไฟล์ PDF ตัวอย่าง (3 หน้า) ให้ทดลองประทับลายน้ำแล้ว!');
    } catch (err) {
      console.error(err);
      showToast('สร้างไฟล์ตัวอย่างไม่สำเร็จ', 'error');
    }
  };

  const handleImageUpload = (e) => {
    if (!isProPlan) {
      showToast('🔒 การประทับโลโก้/รูปภาพ สำหรับแพ็กเกจ Pro รายเดือนเท่านั้นครับ', 'error');
      setShowUpgradeModal(true);
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setWmImageUrl(url);
    setWmImageName(file.name);
    setWmType('image');
    showToast(`🖼️ อัปโหลดรูปลายน้ำ "${file.name}" เรียบร้อย`);
  };

  const handleSavePreset = () => {
    if (!isProPlan) {
      showToast('🔒 บันทึกพรีเซ็ตส่วนตัว สำหรับแพ็กเกจ Pro รายเดือนเท่านั้นครับ', 'error');
      setShowUpgradeModal(true);
      return;
    }
    const label = wmType === 'text' ? wmText.slice(0, 18) || 'ลายน้ำของฉัน' : wmImageName || 'โลโก้ของฉัน';
    const newPreset = {
      id: `p-${Date.now()}`,
      name: `⭐ ${label}`,
      wmType,
      wmText,
      wmColor,
      wmSize,
      wmOpacity,
      wmRotation,
      wmPosition,
    };
    setPresets((prev) => [newPreset, ...prev].slice(0, 8));
    showToast('⭐ บันทึกพรีเซ็ตลายน้ำเรียบร้อยแล้ว');
  };

  const applyPreset = (p) => {
    if (!isProPlan && (p.wmType === 'image' || p.wmPosition === 'tile')) {
      setWmType('text');
      setWmPosition('center');
      showToast('โหมด Free ใช้ได้เฉพาะข้อความเดี่ยว (อัปเกรด Pro เพื่อใช้โหมดปูเต็มหน้า/โลโก้)');
    } else {
      setWmType(p.wmType);
      setWmPosition(p.wmPosition);
      showToast(`ใช้พรีเซ็ต "${p.name}" แล้ว`);
    }
    if (p.wmText) setWmText(p.wmText);
    if (p.wmColor) setWmColor(p.wmColor);
    setWmSize(p.wmSize);
    setWmOpacity(p.wmOpacity);
    setWmRotation(p.wmRotation);
  };

  const processSinglePdf = async (PDFLib, item, wmPngData) => {
    const pdfDoc = await PDFLib.PDFDocument.load(item.arrayBuffer.slice(0), {
      ignoreEncryption: true,
    });
    const embeddedImg = await pdfDoc.embedPng(wmPngData.bytes);
    const pages = pdfDoc.getPages();
    const targetIndices = isProPlan
      ? parsePageIndices(pages.length, pageRangeMode, customRange)
      : pages.length > 0
      ? [0]
      : [];
    const opacityVal = Math.max(0.05, Math.min(1, wmOpacity / 100));
    const angleDeg = -wmRotation;

    let drawW = wmPngData.width;
    let drawH = wmPngData.height;
    if (isProPlan && wmType === 'image') {
      const targetWidth = wmSize * 4.5;
      const ratio = wmPngData.height / Math.max(1, wmPngData.width);
      drawW = targetWidth;
      drawH = targetWidth * ratio;
    }

    const footerFont =
      includeFilenameFooter || !isProPlan
        ? await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold)
        : null;

    for (const pageIdx of targetIndices) {
      const page = pages[pageIdx];
      const { width: pW, height: pH } = page.getSize();
      const margin = 36;

      if (isProPlan && wmPosition === 'tile') {
        const stepX = Math.max(drawW + 60, tileSpacing * 1.6);
        const stepY = Math.max(drawH + 60, tileSpacing * 1.2);
        for (let y = -40; y < pH + 80; y += stepY) {
          for (let x = -40; x < pW + 80; x += stepX) {
            page.drawImage(embeddedImg, {
              x,
              y,
              width: drawW * 0.72,
              height: drawH * 0.72,
              opacity: opacityVal,
              rotate: PDFLib.degrees(angleDeg),
            });
          }
        }
      } else {
        let cx = pW / 2;
        let cy = pH / 2;

        if (wmPosition.includes('left')) cx = margin + drawW / 2;
        if (wmPosition.includes('right')) cx = pW - margin - drawW / 2;
        if (wmPosition.includes('top')) cy = pH - margin - drawH / 2;
        if (wmPosition.includes('bottom')) cy = margin + drawH / 2;

        const rad = (angleDeg * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rx = cx - (drawW / 2) * cos + (drawH / 2) * sin;
        const ry = cy - (drawW / 2) * sin - (drawH / 2) * cos;

        page.drawImage(embeddedImg, {
          x: rx,
          y: ry,
          width: drawW,
          height: drawH,
          opacity: opacityVal,
          rotate: PDFLib.degrees(angleDeg),
        });
      }

      if (isProPlan && includeFilenameFooter && footerFont) {
        page.drawText(`Protected PDF • Page ${pageIdx + 1}/${pages.length} • ${getTodayThai()}`, {
          x: 24,
          y: 14,
          size: 8,
          font: footerFont,
          color: PDFLib.rgb(0.45, 0.45, 0.5),
          opacity: 0.7,
        });
      }

      if (!isProPlan && footerFont) {
        const brandLabel = 'SaladWatermarkPDF (Free)';
        const brandSize = 9.5;
        const textWidth = footerFont.widthOfTextAtSize(brandLabel, brandSize);
        page.drawText(brandLabel, {
          x: Math.max(16, pW - textWidth - 18),
          y: 14,
          size: brandSize,
          font: footerFont,
          color: PDFLib.rgb(0.32, 0.38, 0.48),
          opacity: 0.72,
        });
      }
    }

    if (lockMetadata) {
      pdfDoc.setProducer('SaladWatermarkPDF (Protected Document)');
      pdfDoc.setCreator('SaladWatermarkPDF');
      pdfDoc.setModificationDate(new Date());
    }

    return await pdfDoc.save();
  };

  const handleExportAll = async () => {
    if (pdfFiles.length === 0 || isProcessing) return;
    if (wmType === 'text' && !wmText.trim()) {
      showToast('กรุณาพิมพ์ข้อความลายน้ำก่อนครับ', 'error');
      return;
    }
    if (wmType === 'image' && !wmImageUrl) {
      showToast('กรุณาอัปโหลดรูปลายน้ำก่อนครับ', 'error');
      return;
    }

    setIsProcessing(true);
    setProgressText('กำลังเตรียมเอนจิน PDF...');

    try {
      const PDFLib = await loadPdfLib();
      const targetFiles = isProPlan ? pdfFiles : [pdfFiles[0]];

      const wmPngData =
        !isProPlan || wmType === 'text'
          ? renderTextToPngBytes(effectiveText, wmColor, wmSize, wmBold)
          : await loadImageFileToPngBytes(wmImageUrl);

      if (targetFiles.length === 1) {
        const item = targetFiles[0];
        setProgressText(`กำลังประทับลายน้ำ ${item.name}...`);
        setPdfFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: 'processing' } : f))
        );

        const outBytes = await processSinglePdf(PDFLib, item, wmPngData);
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `watermarked_${item.name}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setPdfFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: 'done' } : f))
        );
        await recordUsageToSupabase(1, isProPlan ? item.pageCount : 1);
        showToast(`✅ ดาวน์โหลดไฟล์ watermarked_${item.name} เรียบร้อยแล้ว!`);
      } else {
        const JSZip = await loadJSZip();
        const zip = new JSZip();
        let totalPages = 0;

        for (let i = 0; i < targetFiles.length; i++) {
          const item = targetFiles[i];
          totalPages += item.pageCount;
          setProgressText(`กำลังประมวลผลไฟล์ ${i + 1}/${targetFiles.length}: ${item.name}`);
          setPdfFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, status: 'processing' } : f))
          );

          const outBytes = await processSinglePdf(PDFLib, item, wmPngData);
          zip.file(`watermarked_${item.name}`, outBytes);

          setPdfFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, status: 'done' } : f))
          );
        }

        setProgressText('กำลังบีบอัดไฟล์ ZIP...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SaladWatermarkPDF_Batch_${targetFiles.length}_Files.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        await recordUsageToSupabase(targetFiles.length, totalPages);
        showToast(`🎉 ประทับลายน้ำสำเร็จทั้งหมด ${targetFiles.length} ไฟล์ (ดาวน์โหลด ZIP แล้ว)!`);
      }
    } catch (err) {
      console.error('Export error:', err);
      showToast('เกิดข้อผิดพลาดระหว่างสร้างไฟล์ PDF กรุณาลองใหม่', 'error');
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  const positionClassMap = {
    'top-left': 'items-start justify-start p-7',
    'top-center': 'items-start justify-center p-7',
    'top-right': 'items-start justify-end p-7',
    'center-left': 'items-center justify-start p-7',
    center: 'items-center justify-center',
    'center-right': 'items-center justify-end p-7',
    'bottom-left': 'items-end justify-start p-7',
    'bottom-center': 'items-end justify-center p-7',
    'bottom-right': 'items-end justify-end p-7',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700;800&display=swap');
        body { font-family: 'Prompt', sans-serif; }
      `}</style>

      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 border ${
            toast.type === 'error'
              ? 'bg-rose-600 text-white border-rose-400'
              : 'bg-emerald-600 text-white border-emerald-400'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-extrabold text-base text-white tracking-tight">
                  SaladWatermarkPDF
                </h1>
                <span
                  className={`px-2 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1 ${
                    supabaseConnected
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <Database className="w-3 h-3" />
                  <span>{supabaseConnected ? 'Supabase Online' : 'Local Mode'}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                ประทับลายน้ำไฟล์ PDF ภาษาไทย & โลโก้บริษัท • ประมวลผลในเครื่อง ปลอดภัยไฟล์ไม่หลุด
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                if (!supabaseConnected) {
                  setIsProPlan((p) => !p);
                } else {
                  setShowUpgradeModal(true);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition ${
                isProPlan
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>{isProPlan ? 'PRO รายเดือน' : 'FREE (ทีละ 1 แผ่น)'}</span>
            </button>

            <button
              onClick={() => setShowUpgradeModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-extrabold shadow-md cursor-pointer transition"
            >
              💎 แพ็กเกจราคา
            </button>

            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs">
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  <span className="max-w-[130px] truncate text-slate-200 font-medium">
                    {user.email}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600/30 text-slate-400 hover:text-rose-300 border border-slate-700 cursor-pointer transition"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthError('');
                  setShowAuthModal(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
              >
                <LogIn className="w-3.5 h-3.5 text-sky-400" />
                <span>เข้าสู่ระบบ</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleAddPdfFiles(e.dataTransfer.files);
            }}
            className={`rounded-2xl border-2 border-dashed p-5 transition-all ${
              isDragging
                ? 'border-sky-400 bg-sky-950/40'
                : 'border-slate-700 bg-slate-900/70 hover:border-slate-600'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                  <FileUp className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-white">
                    อัปโหลดไฟล์ PDF ที่ต้องการประทับลายน้ำ
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ลากไฟล์มาวางที่นี่ หรือกดเลือกไฟล์ (
                    {isProPlan
                      ? 'เลือกได้หลายไฟล์ ไม่จำกัดจำนวนหน้า'
                      : 'โหมด Free ทำได้ทีละ 1 แผ่น (หน้าแรก) และติดลายน้ำมุมขวาล่าง'}
                    )
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCreateSamplePdf}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold cursor-pointer transition"
                >
                  ✨ สร้างไฟล์ทดสอบ
                </button>
                <label className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold shadow-lg cursor-pointer transition flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>เลือกไฟล์ PDF</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple={isProPlan}
                    onChange={(e) => {
                      handleAddPdfFiles(e.target.files);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {pdfFiles.length > 0 && (
              <div className="mt-4 pt-3.5 border-t border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span className="font-bold text-sky-300">
                    คิวไฟล์ทั้งหมด ({pdfFiles.length} ไฟล์) — คลิกชื่อไฟล์เพื่อดูพรีวิว
                  </span>
                  <button
                    onClick={() => {
                      setPdfFiles([]);
                      setActiveFileId(null);
                    }}
                    className="text-rose-400 hover:text-rose-300 cursor-pointer font-semibold"
                  >
                    ล้างคิวทั้งหมด
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {pdfFiles.map((f, idx) => {
                    const isSelected = activeFile?.id === f.id;
                    const lockedByFree = !isProPlan && idx > 0;
                    return (
                      <div
                        key={f.id}
                        onClick={() => setActiveFileId(f.id)}
                        className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs cursor-pointer transition ${
                          lockedByFree
                            ? 'bg-slate-950/40 border-slate-800 text-slate-500'
                            : isSelected
                            ? 'bg-sky-600/20 border-sky-400/70 text-white'
                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                          <span className="font-bold truncate">{f.name}</span>
                          <span className="text-[10.5px] text-slate-400 shrink-0">
                            ({f.pageCount} หน้า • {formatSize(f.size)})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {lockedByFree ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                              🔒 Pro เท่านั้น
                            </span>
                          ) : f.status === 'processing' ? (
                            <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                          ) : f.status === 'done' ? (
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> เสร็จแล้ว
                            </span>
                          ) : null}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPdfFiles((prev) => prev.filter((item) => item.id !== f.id));
                            }}
                            className="text-slate-500 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                พรีเซ็ตลายน้ำด่วน (Quick Presets)
              </span>
              <button
                onClick={handleSavePreset}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold cursor-pointer"
              >
                + บันทึกค่าปัจจุบัน
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 text-[11px] text-slate-200 font-medium cursor-pointer transition"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-sky-300 flex items-center gap-1.5">
                <Sliders className="w-4 h-4" />
                <span>ตั้งค่าลายน้ำ (ข้อความภาษาไทย / รูปโลโก้)</span>
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setWmType('text')}
                className={`py-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  wmType === 'text'
                    ? 'bg-sky-600 text-white border-sky-400 shadow-md'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Type className="w-4 h-4" /> พิมพ์ข้อความเอง
              </button>
              <button
                onClick={() => {
                  if (!isProPlan) {
                    showToast('🔒 ประทับโลโก้/รูปภาพ สำหรับแพ็กเกจ Pro รายเดือนเท่านั้นครับ', 'error');
                    setShowUpgradeModal(true);
                    return;
                  }
                  setWmType('image');
                }}
                className={`py-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  wmType === 'image' && isProPlan
                    ? 'bg-sky-600 text-white border-sky-400 shadow-md'
                    : !isProPlan
                    ? 'bg-slate-950/60 text-slate-500 border-slate-800 hover:border-amber-500/40'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {!isProPlan ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <ImageIcon className="w-4 h-4" />}
                <span>ใส่รูป / โลโก้ PNG</span>
                {!isProPlan && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9.5px]">
                    PRO
                  </span>
                )}
              </button>
            </div>

            {wmType === 'text' || !isProPlan ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={wmText}
                    onChange={(e) => setWmText(e.target.value)}
                    placeholder="พิมพ์ข้อความลายน้ำ (รองรับภาษาไทย 100%)..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400"
                  />
                  <input
                    type="color"
                    value={wmColor}
                    onChange={(e) => setWmColor(e.target.value)}
                    title="เลือกสีลายน้ำ"
                    className="w-11 h-10 rounded-xl bg-slate-950 border border-slate-700 cursor-pointer p-1"
                  />
                  <button
                    onClick={() => setWmBold((b) => !b)}
                    className={`px-3 h-10 rounded-xl border text-xs font-extrabold cursor-pointer ${
                      wmBold
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                        : 'bg-slate-950 border-slate-700 text-slate-400'
                    }`}
                    title="ตัวหนา"
                  >
                    B
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['#dc2626', '#0f172a', '#0284c7', '#059669', '#d97706', '#7c3aed'].map((hex) => (
                    <button
                      key={hex}
                      onClick={() => setWmColor(hex)}
                      style={{ backgroundColor: hex }}
                      className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                        wmColor === hex ? 'border-white scale-110' : 'border-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-dashed border-slate-700 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  {wmImageUrl ? (
                    <img
                      src={wmImageUrl}
                      alt="logo"
                      className="w-10 h-10 rounded-lg object-contain bg-white/10 p-1"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                  <div className="truncate">
                    <div className="font-bold text-white truncate">
                      {wmImageName || 'ยังไม่ได้เลือกรูปลายน้ำ'}
                    </div>
                    <div className="text-[10.5px] text-slate-400">
                      แนะนำไฟล์ PNG พื้นหลังโปร่งใส (Transparent)
                    </div>
                  </div>
                </div>
                <label className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer shrink-0">
                  เลือกรูปภาพ
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span>ขนาดลายน้ำ</span>
                  <span className="font-bold text-sky-300">{wmSize}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="76"
                  value={wmSize}
                  onChange={(e) => setWmSize(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span>ความทึบ / ความใส</span>
                  <span className="font-bold text-sky-300">{wmOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={wmOpacity}
                  onChange={(e) => setWmOpacity(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1">
                    <RotateCw className="w-3 h-3" /> มุมเอียง
                  </span>
                  <span className="font-bold text-sky-300">{wmRotation}°</span>
                </div>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  value={wmRotation}
                  onChange={(e) => setWmRotation(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-4">
              <div>
                <div className="text-[11px] text-slate-400 mb-1.5 font-semibold">ตำแหน่ง 9 จุด</div>
                <div className="grid grid-cols-3 gap-1.5 w-32">
                  {[
                    'top-left',
                    'top-center',
                    'top-right',
                    'center-left',
                    'center',
                    'center-right',
                    'bottom-left',
                    'bottom-center',
                    'bottom-right',
                  ].map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setWmPosition(pos)}
                      className={`h-7 rounded-md border transition cursor-pointer ${
                        wmPosition === pos
                          ? 'bg-sky-500 border-sky-300 shadow-sm'
                          : 'bg-slate-950 hover:bg-slate-800 border-slate-700'
                      }`}
                      title={pos}
                    />
                  ))}
                </div>
              </div>

              <div className="flex-1 min-w-[200px] space-y-2">
                <div className="text-[11px] text-slate-400 font-semibold">โหมดปูลายน้ำเต็มหน้า</div>
                <button
                  onClick={() => {
                    if (!isProPlan) {
                      showToast('🔒 โหมดปูลายน้ำเต็มหน้า (Tile Grid) สำหรับแพ็กเกจ Pro เท่านั้นครับ', 'error');
                      setShowUpgradeModal(true);
                      return;
                    }
                    setWmPosition(wmPosition === 'tile' ? 'center' : 'tile');
                  }}
                  className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                    wmPosition === 'tile' && isProPlan
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                      : !isProPlan
                      ? 'bg-slate-950/60 text-slate-500 border-slate-800 hover:border-amber-500/40'
                      : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {!isProPlan ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Grid className="w-4 h-4" />}
                  <span>
                    {wmPosition === 'tile' && isProPlan
                      ? '✓ กำลังเปิดโหมดปูเต็มหน้า (Tile Grid)'
                      : 'เปิดโหมดปูเต็มหน้า (Tile Grid)'}
                  </span>
                  {!isProPlan && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9.5px]">
                      PRO
                    </span>
                  )}
                </button>
                {wmPosition === 'tile' && isProPlan && (
                  <div className="pt-1">
                    <div className="flex justify-between text-[10.5px] text-slate-400 mb-1">
                      <span>ระยะห่างลายน้ำซ้ำ</span>
                      <span className="text-indigo-300 font-bold">{tileSpacing}px</span>
                    </div>
                    <input
                      type="range"
                      min="90"
                      max="240"
                      value={tileSpacing}
                      onChange={(e) => setTileSpacing(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-3 text-xs">
              <div className="font-bold text-sky-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>ตัวเลือกระดับมืออาชีพ (Pro Options)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    ช่วงหน้าที่ต้องการประทับ {!isProPlan && <span className="text-amber-400">(Free ได้ทีละ 1 แผ่น)</span>}
                  </label>
                  <select
                    value={isProPlan ? pageRangeMode : 'first'}
                    onChange={(e) => {
                      if (!isProPlan && e.target.value !== 'first') {
                        showToast('🔒 โหมด Free ประทับได้ทีละ 1 แผ่น (หน้าแรก) — อัปเกรด Pro เพื่อทำทุกหน้า!', 'error');
                        setShowUpgradeModal(true);
                        return;
                      }
                      setPageRangeMode(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="first">เฉพาะหน้าแรก (ทีละ 1 แผ่น)</option>
                    <option value="all">{isProPlan ? 'ทุกหน้าในเอกสาร' : '🔒 ทุกหน้าในเอกสาร (Pro)'}</option>
                    <option value="odd">{isProPlan ? 'เฉพาะหน้าคี่ (1, 3, 5...)' : '🔒 เฉพาะหน้าคี่ (Pro)'}</option>
                    <option value="even">{isProPlan ? 'เฉพาะหน้าคู่ (2, 4, 6...)' : '🔒 เฉพาะหน้าคู่ (Pro)'}</option>
                    <option value="custom">{isProPlan ? 'กำหนดช่วงหน้าเอง' : '🔒 กำหนดช่วงหน้าเอง (Pro)'}</option>
                  </select>
                </div>
                {isProPlan && pageRangeMode === 'custom' && (
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">ระบุเลขหน้า (เช่น 1-3, 5)</label>
                    <input
                      type="text"
                      value={customRange}
                      onChange={(e) => setCustomRange(e.target.value)}
                      placeholder="1-3, 5"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-4 pt-1 text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeDateTag}
                    onChange={(e) => setIncludeDateTag(e.target.checked)}
                    className="accent-sky-500 w-4 h-4"
                  />
                  <span>แนบวันที่อัตโนมัติ ({getTodayThai()})</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeFilenameFooter}
                    onChange={(e) => setIncludeFilenameFooter(e.target.checked)}
                    className="accent-sky-500 w-4 h-4"
                  />
                  <span>ใส่เลขหน้าท้ายกระดาษ</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lockMetadata}
                    onChange={(e) => setLockMetadata(e.target.checked)}
                    className="accent-sky-500 w-4 h-4"
                  />
                  <span className="flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" /> บันทึกตราป้องกันใน Metadata
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between text-xs">
              <div className="font-extrabold text-white flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-sky-400" />
                <span>Live Preview {activeFile ? `— ${activeFile.name}` : '(ตัวอย่าง A4)'}</span>
              </div>
              <span className="text-[10.5px] text-slate-400">
                {activeFile ? `หน้า 1 / ${activeFile.pageCount}` : 'ยังไม่ได้อัปโหลด PDF'}
              </span>
            </div>

            <div
              className="relative w-full mx-auto bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700 select-none"
              style={{
                aspectRatio: `${previewDims.width} / ${previewDims.height}`,
                maxHeight: '520px',
              }}
            >
              <canvas
                ref={previewCanvasRef}
                className={`w-full h-full object-contain ${previewLoaded ? 'block' : 'hidden'}`}
              />

              {previewLoading && (
                <div className="absolute inset-0 bg-white/90 z-40 flex flex-col items-center justify-center gap-2 text-slate-600 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                  <span>กำลังเรนเดอร์หน้า PDF จริง...</span>
                </div>
              )}

              {!previewLoaded && !previewLoading && (
                <div className="absolute inset-0 p-7 text-slate-800 flex flex-col justify-between pointer-events-none">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start border-b-2 border-slate-800 pb-2">
                      <div>
                        <div className="text-sm font-extrabold text-slate-900">
                          ตัวอย่างเอกสาร PDF (A4)
                        </div>
                        <div className="text-[10px] text-slate-500">
                          อัปโหลดไฟล์ PDF จริงทางซ้าย หรือกด "✨ สร้างไฟล์ทดสอบ"
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 text-right">
                        <div>{getTodayThai()}</div>
                        <div>หน้า 1 / 1</div>
                      </div>
                    </div>
                    <div className="space-y-2 pt-2">
                      <div className="h-2.5 bg-slate-200 rounded w-5/6" />
                      <div className="h-2.5 bg-slate-200 rounded w-full" />
                      <div className="h-2.5 bg-slate-200 rounded w-4/6" />
                      <div className="h-2.5 bg-slate-200 rounded w-full" />
                    </div>
                    <div className="border border-slate-200 rounded-lg p-3 space-y-2 mt-4">
                      <div className="h-2.5 bg-slate-300 rounded w-1/3" />
                      <div className="h-2 bg-slate-100 rounded w-full" />
                      <div className="h-2 bg-slate-100 rounded w-full" />
                      <div className="h-2 bg-slate-100 rounded w-5/6" />
                    </div>
                  </div>
                  <div className="flex justify-between text-[9.5px] text-slate-400 border-t pt-3">
                    <span>SaladWatermarkPDF Live Preview</span>
                    <span>100% Private Client-Side</span>
                  </div>
                </div>
              )}

              <div
                className={`absolute inset-0 pointer-events-none overflow-hidden flex z-30 ${
                  wmPosition === 'tile'
                    ? 'items-center justify-center'
                    : positionClassMap[wmPosition]
                }`}
              >
                {wmPosition === 'tile' ? (
                  <div
                    className="grid grid-cols-2 w-[145%] h-[145%] place-items-center"
                    style={{ gap: `${Math.round(tileSpacing * 0.45)}px` }}
                  >
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          opacity: wmOpacity / 100,
                          transform: `rotate(${wmRotation}deg)`,
                          color: wmColor,
                          fontSize: `${Math.max(10, wmSize * 0.52)}px`,
                          fontWeight: wmBold ? 800 : 500,
                        }}
                        className="whitespace-nowrap flex items-center justify-center"
                      >
                        {wmType === 'text' ? (
                          effectiveText
                        ) : wmImageUrl ? (
                          <img
                            src={wmImageUrl}
                            alt="wm"
                            style={{ width: `${wmSize * 2.2}px` }}
                            className="object-contain"
                          />
                        ) : (
                          <span className="px-2 py-0.5 border-2 border-sky-600 text-sky-600 rounded font-black">
                            LOGO
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      opacity: wmOpacity / 100,
                      transform: `rotate(${wmRotation}deg)`,
                      color: wmColor,
                      fontSize: `${Math.max(11, wmSize * 0.72)}px`,
                      fontWeight: wmBold ? 800 : 500,
                    }}
                    className="text-center leading-tight max-w-[92%] break-words"
                  >
                    {wmType === 'text' ? (
                      effectiveText
                    ) : wmImageUrl ? (
                      <img
                        src={wmImageUrl}
                        alt="wm"
                        style={{ width: `${wmSize * 3.1}px` }}
                        className="object-contain"
                      />
                    ) : (
                      <span className="px-3 py-1 border-4 border-sky-600 text-sky-600 rounded-lg font-black text-base">
                        COMPANY LOGO
                      </span>
                    )}
                  </div>
                )}
              </div>

              {isProPlan && includeFilenameFooter && (
                <div className="absolute bottom-1.5 left-3 z-30 text-[8px] text-slate-500 pointer-events-none">
                  Protected PDF • Page 1/{activeFile?.pageCount || 1} • {getTodayThai()}
                </div>
              )}

              {!isProPlan && (
                <div className="absolute bottom-2 right-3 z-30 text-[9.5px] font-bold text-slate-500/80 tracking-wide pointer-events-none select-none">
                  SaladWatermarkPDF (Free)
                </div>
              )}
            </div>

            <button
              onClick={handleExportAll}
              disabled={isProcessing || pdfFiles.length === 0}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-45 text-white font-extrabold text-sm shadow-xl shadow-sky-600/20 flex items-center justify-center gap-2 cursor-pointer transition"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{progressText || 'กำลังประมวลผล...'}</span>
                </>
              ) : pdfFiles.length > 1 && isProPlan ? (
                <>
                  <FolderArchive className="w-4 h-4" />
                  <span>ประทับลายน้ำทั้งหมด {pdfFiles.length} ไฟล์ & โหลดเป็น .ZIP</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>
                    {pdfFiles.length === 0
                      ? 'อัปโหลดไฟล์ PDF เพื่อเริ่มประทับลายน้ำ'
                      : 'ประทับลายน้ำ & ดาวน์โหลดไฟล์ PDF จริง'}
                  </span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ประมวลผลบนเบราว์เซอร์ของคุณ 100% ไม่มีการอัปโหลดไฟล์ขึ้นเซิร์ฟเวอร์</span>
            </div>
          </div>
        </div>
      </main>

      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAuthModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-white">
                  {authMode === 'login' ? '🔐 เข้าสู่ระบบ SaladWatermarkPDF' : '✨ สมัครสมาชิกใหม่'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  เชื่อมต่อบัญชีเพื่อใช้งานสิทธิ์ Pro รายเดือนและบันทึกประวัติ
                </p>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!supabaseConnected && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-[11px] text-amber-200 leading-relaxed">
                ⚠️ ยังไม่ได้ใส่ค่า <strong>VITE_SUPABASE_URL</strong> และ{' '}
                <strong>VITE_SUPABASE_ANON_KEY</strong> ในไฟล์ <code>.env</code> ของโปรเจกต์
              </div>
            )}

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200">
                {authError}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <span>🔵</span>
              <span>ดำเนินการต่อด้วย Google</span>
            </button>

            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <div className="flex-1 h-px bg-slate-800" />
              <span>หรือใช้อีเมล</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">อีเมล</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">รหัสผ่าน</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-extrabold cursor-pointer transition flex items-center justify-center gap-2"
              >
                {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{authMode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิกฟรี'}</span>
              </button>
            </form>

            <div className="text-center text-xs text-slate-400">
              {authMode === 'login' ? (
                <>
                  ยังไม่มีบัญชีใช่ไหม?{' '}
                  <button
                    onClick={() => {
                      setAuthMode('signup');
                      setAuthError('');
                    }}
                    className="text-sky-400 hover:underline font-bold cursor-pointer"
                  >
                    สมัครสมาชิกฟรี
                  </button>
                </>
              ) : (
                <>
                  มีบัญชีอยู่แล้ว?{' '}
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError('');
                    }}
                    className="text-sky-400 hover:underline font-bold cursor-pointer"
                  >
                    เข้าสู่ระบบ
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showUpgradeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowUpgradeModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-white">
                  💎 แพ็กเกจ SaladWatermarkPDF
                </h3>
                <p className="text-xs text-slate-400">
                  เชื่อมบัญชี Supabase เรียบร้อย — พร้อมผูกระบบตัดบัตร Stripe เพื่อปลดล็อก Pro อัตโนมัติ
                </p>
              </div>
              <div className="flex items-center gap-2">
                {user && supabaseConnected && (
                  <button
                    onClick={handleRefreshPlan}
                    disabled={isRefreshingPlan}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshingPlan ? 'animate-spin' : ''}`} />
                    <span>รีเฟรชสิทธิ์</span>
                  </button>
                )}
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="font-bold text-slate-400">FREE</div>
                <div className="text-2xl font-extrabold text-white">฿0</div>
                <ul className="space-y-1.5 text-slate-300">
                  <li>✓ ประทับลายน้ำแบบพิมพ์ข้อความเท่านั้น</li>
                  <li>✓ ทำได้ทีละ 1 แผ่น (หน้าแรก / ทีละ 1 ไฟล์)</li>
                  <li>✓ ปรับขนาด ความทึบ มุมเอียง ตำแหน่ง 9 จุด</li>
                  <li className="text-amber-300/90">• ติดลายน้ำชื่อโปรแกรมมุมขวาล่างกระดาษ</li>
                  <li className="text-slate-500 line-through">ประทับรูปภาพ / โลโก้บริษัท</li>
                </ul>
                <button
                  onClick={() => {
                    if (!supabaseConnected) setIsProPlan(false);
                    setShowUpgradeModal(false);
                  }}
                  className="w-full py-2 rounded-xl bg-slate-800 text-slate-200 font-bold cursor-pointer"
                >
                  {isProPlan ? 'แผนพื้นฐาน' : '✓ กำลังใช้งานอยู่'}
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-b from-sky-950/60 to-slate-950 border-2 border-sky-500 space-y-3">
                <div className="font-bold text-sky-300 flex items-center justify-between">
                  <span>PRO รายเดือน (ไม่จำกัด)</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px]">
                    แนะนำ
                  </span>
                </div>
                <div className="text-2xl font-extrabold text-white">
                  ฿199 <span className="text-xs font-normal text-slate-400">/เดือน</span>
                </div>
                <ul className="space-y-1.5 text-slate-200">
                  <li>✓ <strong>ไม่จำกัดจำนวนหน้า & ทำทีละหลายไฟล์ (.ZIP)</strong></li>
                  <li>✓ <strong>ลบลายน้ำชื่อโปรแกรมมุมขวาล่างออก 100%</strong></li>
                  <li>✓ <strong>ประทับรูปภาพ / โลโก้บริษัท (PNG) เป็นลายน้ำได้</strong></li>
                  <li>✓ ปูลายน้ำเต็มหน้า (Tile Grid), เลือกช่วงหน้า, บันทึกพรีเซ็ต</li>
                  <li>✓ 100% Private ประมวลผลในเครื่อง</li>
                </ul>
                <button
                  onClick={handleStripeCheckout}
                  disabled={isProPlan}
                  className="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-slate-950 font-extrabold cursor-pointer"
                >
                  {isProPlan ? '✓ คุณเป็นสมาชิก PRO แล้ว' : 'อัปเกรดเป็น PRO ฿199/เดือน'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}