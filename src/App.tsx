import React, { useState, useEffect, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Plus, Trash2, FileText, User, Home, Save, Calculator, X, Database, 
  CheckSquare, Upload, Edit, Cloud, Download, LogOut, LayoutGrid, MapPin, 
  Layers, Scissors, Package, ArrowRight, Info, Users, FilePenLine, Percent, 
  CheckCircle, Loader, Printer, Ruler, Palette, ArrowLeft, ArrowUp, ArrowDown, Share,
  ChevronDown, ChevronUp, Settings, ExternalLink
} from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, Timestamp, onSnapshot, enableIndexedDbPersistence } from 'firebase/firestore';

// --- Imports from modular files ---
import { 
  ADMIN_ID, DEFAULT_STAFF, DEFAULT_ROOMS, DEFAULT_HOUSES, 
  DEFAULT_THEME_COLORS, DEFAULT_FORMULAS, OTHER_EXPENSES, 
  CALCULATION_STYLES, INITIAL_DB, Staff, Customer, Formula 
} from './types';
import { Card, Modal, SearchableSelect } from './components/Common';
import { LoginScreen } from './components/LoginScreen';
import { CustomerForm } from './components/CustomerForm';
import { Dashboard } from './components/Dashboard';
import { ThemeManager, FormulaManager, DatabaseEditor, StaffManager } from './components/AdminSettings';
import { safeLocalStorageSetItem } from './utils';

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyBELKIKLIbRiuHUmOxHQflg2StbdtgFTr4",
  authDomain: "fast-track-quotation.firebaseapp.com",
  projectId: "fast-track-quotation",
  storageBucket: "fast-track-quotation.firebasestorage.app",
  messagingSenderId: "606803037776",
  appId: "1:606803037776:web:ebe0900136e5b2abc58b55",
  measurementId: "G-EZJK9BNBJ7"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const firestore = getFirestore(app);

// Enable Firestore persistence for lightning-fast loading of old documents and true offline support
try {
  enableIndexedDbPersistence(firestore).catch((err) => {
      console.warn("Firestore offline persistence failed to enable:", err.code);
  });
} catch (e) {
  console.error("Firestore persistence init error:", e);
}

const appId = 'fast-track-quote';

// --- Helper Functions ---
const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    try {
        const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('th-TH');
    } catch (e) { return '-'; }
};

export default function App() {
  const [appState, setAppState] = useState('login'); 
  const [modal, setModal] = useState<string | null>(null);
  const [inputText, setInputText] = useState(''); 
  const [editTarget, setEditTarget] = useState<any>(null); 
  const [deleteConfirm, setDeleteConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [user, setUser] = useState<any>(null); 
  
  // Local/Cached state loaders
  const [staffList, setStaffList] = useState<Staff[]>(() => {
    try {
      const saved = localStorage.getItem('cached_staffList');
      return saved ? JSON.parse(saved) : DEFAULT_STAFF;
    } catch { return DEFAULT_STAFF; }
  });
  const [staff, setStaff] = useState<Staff | null>(() => {
    try {
      const saved = localStorage.getItem('currentStaff');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [formulas, setFormulas] = useState<Formula[]>(() => {
    try {
      const saved = localStorage.getItem('cached_formulas');
      return saved ? JSON.parse(saved) : DEFAULT_FORMULAS;
    } catch { return DEFAULT_FORMULAS; }
  });
  const [theme, setTheme] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('cached_theme');
      return saved ? JSON.parse(saved) : DEFAULT_THEME_COLORS;
    } catch { return DEFAULT_THEME_COLORS; }
  });
  const [db, setDb] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('cached_db');
      return saved ? JSON.parse(saved) : INITIAL_DB;
    } catch { return INITIAL_DB; }
  });

  const [customer, setCustomer] = useState<Customer>({ name: '', address: '', phone: '', note: '' });
  const [items, setItems] = useState<any[]>([]);
  const [ontopPercent, setOntopPercent] = useState(0);
  const [quoteId, setQuoteId] = useState<string | null>(null); 
  const [isDraftPrint, setIsDraftPrint] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); 
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [quoteOwner, setQuoteOwner] = useState<Staff | null>(null); 
  const autoSaveTimeoutRef = useRef<any>(null);

  // House/Room State
  const [tempHouses, setTempHouses] = useState<string[]>([]);
  const [tempRooms, setTempRooms] = useState<any>({});
  const [selectedHouse, setSelectedHouse] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [excludedHouses, setExcludedHouses] = useState<string[]>([]);
  const [excludedItemIds, setExcludedItemIds] = useState<string[]>([]); 

  // Mobile & UI State
  const [isHouseListCollapsed, setIsHouseListCollapsed] = useState(false); 
  const [activeMobileTab, setActiveMobileTab] = useState<'area' | 'spec' | 'items'>('area');
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [showIframeWarn, setShowIframeWarn] = useState(true);
  
  const initialItemState = {
    id: null as string | null,
    curtainType: 'ทึบ', curtainStyle: 'pleated', calcStyle: 'grain_opaque', fabricId: '', color: '', 
    railWidth: 150, railHeight: 200, panels: 2, quantity: 1, sideReturn: false, 
    railAccessoryId: '', extraAccessories: [] as { id: string; qty: number }[], 
    discFabric: 30, discSew: 30, discRail: 30, discAcc: 30, 
    isOntopFabric: true, isOntopSew: true, isOntopRail: true, isOntopAcc: true,
    otherExpenseType: '', customNote: '', customPrice: 0, customDiscount: 0
  };
  const sanitizeItem = (item: any) => {
    return {
      ...initialItemState,
      ...item,
      extraAccessories: Array.isArray(item?.extraAccessories) ? item.extraAccessories : [],
      discFabric: typeof item?.discFabric === 'number' ? item.discFabric : initialItemState.discFabric,
      discSew: typeof item?.discSew === 'number' ? item.discSew : initialItemState.discSew,
      discRail: typeof item?.discRail === 'number' ? item.discRail : initialItemState.discRail,
      discAcc: typeof item?.discAcc === 'number' ? item.discAcc : initialItemState.discAcc,
      isOntopFabric: typeof item?.isOntopFabric === 'boolean' ? item.isOntopFabric : initialItemState.isOntopFabric,
      isOntopSew: typeof item?.isOntopSew === 'boolean' ? item.isOntopSew : initialItemState.isOntopSew,
      isOntopRail: typeof item?.isOntopRail === 'boolean' ? item.isOntopRail : initialItemState.isOntopRail,
      isOntopAcc: typeof item?.isOntopAcc === 'boolean' ? item.isOntopAcc : initialItemState.isOntopAcc,
    };
  };
  const [currentItem, setCurrentItem] = useState(initialItemState);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const isAdmin = staff?.id === ADMIN_ID;

  const availableHouses = useMemo(() => [...new Set([...DEFAULT_HOUSES, ...items.map(i=>i.houseName), ...tempHouses])], [items, tempHouses]);
  const availableRooms = useMemo(() => {
      if (!selectedHouse) return [];
      const fromItems = items.filter(i => i.houseName === selectedHouse).map(i => i.roomName);
      const fromTemp = tempRooms[selectedHouse] || [];
      return [...new Set([...fromTemp, ...fromItems, ...DEFAULT_ROOMS])];
  }, [items, selectedHouse, tempRooms]);
  
  const housesInQuote = useMemo(() => [...new Set(items.map(i => i.houseName))], [items]);
  const activeItems = useMemo(() => items.filter(i => !excludedHouses.includes(i.houseName)), [items, excludedHouses]);
  const itemsInCurrentRoom = useMemo(() => {
      return items.filter(i => i.houseName === selectedHouse && i.roomName === selectedRoom);
  }, [items, selectedHouse, selectedRoom]);

  const checkCondition = (condition: string, currentStyle: string) => {
      if (!condition || condition === 'all') return true;
      const conditions = condition.split(',').map(c => c.trim());
      const styleDef = formulas.find(s => s.id === currentStyle);
      const isFabric = styleDef?.category === 'fabric';
      const isBlind = styleDef?.category === 'blind';
      if (conditions.includes('fabric') && isFabric) return true;
      if (conditions.includes('blind') && isBlind) return true;
      if (conditions.includes(currentStyle)) return true;
      return false;
  };

  const fabricOptions = useMemo(() => {
        let list = [];
        if (['roller', 'venetian'].includes(currentItem.curtainStyle)) {
             list = [...db.blinds, ...db.venetians];
        } else {
             list = db.fabrics.filter((f: any) => f.type === currentItem.curtainType);
        }
        return list.filter((item: any) => checkCondition(item.condition, currentItem.curtainStyle))
                    .sort((a: any, b: any) => a.name.localeCompare(b.name))
                    .map((item: any) => ({ value: item.id, label: `${item.name} (${item.price})` }));
    }, [db, currentItem.curtainStyle, currentItem.curtainType, formulas]);

  const railOptions = useMemo(() => {
        return db.rails
            .filter((r: any) => checkCondition(r.condition, currentItem.curtainStyle))
            .map((r: any) => ({ value: r.id, label: `${r.name} (${r.price})` }));
    }, [db.rails, currentItem.curtainStyle, formulas]);


  const handleLogin = (staffData: Staff) => { 
      setStaff(staffData); 
      safeLocalStorageSetItem('currentStaff', JSON.stringify(staffData));
      setAppState('dashboard'); 
  };
  const handleLogout = () => { 
      setStaff(null); 
      localStorage.removeItem('currentStaff');
      setAppState('login'); 
  };
  const handleCreateQuote = () => { setCustomer({ name: '', address: '', phone: '', note: '' }); setItems([]); setTempHouses([]); setTempRooms({}); setQuoteId(null); setOntopPercent(0); setSelectedHouse(null); setSelectedRoom(null); setExcludedHouses([]); setExcludedItemIds([]); setQuoteOwner(staff); setAppState('customer_form'); };
  const handleStartQuote = async () => { if(!customer.name.trim()) return alert("กรุณาระบุชื่อลูกค้า"); if (!quoteId && user && firestore) { try { const newDocRef = doc(collection(firestore, 'artifacts', appId, 'public', 'data', 'quotations')); await setDoc(newDocRef, { createdAt: Timestamp.now(), updatedAt: Timestamp.now(), customer, staff: quoteOwner || staff, items: [], staffId: (quoteOwner || staff)?.id, ontopPercent: 0 }); setQuoteId(newDocRef.id); } catch (e) { } } setAppState('editor'); };
  
  const handleLoadQuote = (q: any) => { 
      setCustomer(q.customer); 
      setItems(q.items || []); 
      setOntopPercent(q.ontopPercent || 0); 
      setQuoteId(q.id); 
      
      if(q.tempHouses) setTempHouses(q.tempHouses);
      else {
          const houses = [...new Set(q.items.map((i: any)=>i.houseName))] as string[]; 
          setTempHouses(houses);
      }

      if (q.roomOrder) {
          setTempRooms(q.roomOrder);
      } else {
          const roomsMap: any = {}; 
          q.items.forEach((i: any) => { 
              if(!roomsMap[i.houseName]) roomsMap[i.houseName] = []; 
              if(!roomsMap[i.houseName].includes(i.roomName)) roomsMap[i.houseName].push(i.roomName); 
          }); 
          setTempRooms(roomsMap);
      }

      setExcludedHouses(q.excludedHouses || []); 
      setExcludedItemIds(q.excludedItemIds || []); 
      setQuoteOwner(q.staff); 
      setAppState('editor'); 
  };

  const handleSaveItem = () => { 
      if (!currentItem.fabricId && currentItem.curtainType !== 'อื่นๆ') {
          return alert("กรุณาเลือกผ้า/รุ่น");
      }
      if (currentItem.curtainType === 'อื่นๆ' && !currentItem.otherExpenseType) {
          return alert("กรุณาเลือกประเภทค่าใช้จ่าย");
      }
      if (!selectedHouse || !selectedRoom) {
          return alert("กรุณาเลือกบ้านและห้อง");
      }
      
      const resultToSave = computedResult;
      const parsedItem = {
          ...currentItem,
          railWidth: parseFloat(currentItem.railWidth as any) || 0,
          railHeight: parseFloat(currentItem.railHeight as any) || 0,
          quantity: parseInt(currentItem.quantity as any) || 0,
          customPrice: parseFloat(currentItem.customPrice as any) || 0,
          customDiscount: parseFloat(currentItem.customDiscount as any) || 0,
          discFabric: parseFloat(currentItem.discFabric as any) || 0,
          discSew: parseFloat(currentItem.discSew as any) || 0,
          discRail: parseFloat(currentItem.discRail as any) || 0,
          discAcc: parseFloat(currentItem.discAcc as any) || 0,
      };
      const newItem = { 
          ...parsedItem, 
          houseName: selectedHouse, 
          roomName: selectedRoom, 
          id: editingItemId || String(Date.now()), 
          calculated: resultToSave, 
          staffId: staff?.id 
      };
      
      if (editingItemId) {
          setItems(items.map(i => i.id === editingItemId ? newItem : i));
          setEditingItemId(null);
      } else {
          setItems([...items, newItem]);
      }
      
      setCurrentItem({...initialItemState});
      setActiveMobileTab('items');
  };
  const handlePrintDraft = () => { setIsDraftPrint(true); setTimeout(() => { window.print(); setIsDraftPrint(false); }, 100); };
  
  const handleSaveToCloud = async () => { 
      if (!user || !firestore) return alert("Cloud Connection is currently setting up, please try again shortly!"); 
      if (!customer.name) return alert("ระบุชื่อลูกค้า"); 
      try { 
          const docId = quoteId || doc(collection(firestore, 'artifacts', appId, 'public', 'data', 'quotations')).id; 
          await setDoc(doc(firestore, 'artifacts', appId, 'public', 'data', 'quotations', docId), { 
              updatedAt: Timestamp.now(), 
              customer, 
              staff: quoteOwner || staff, 
              items, 
              staffId: (quoteOwner || staff)?.id, 
              ontopPercent,
              roomOrder: tempRooms, 
              tempHouses, 
              excludedHouses, 
              excludedItemIds 
          }, { merge: true }); 
          setQuoteId(docId); 
          alert("บันทึกสำเร็จ"); 
          setAppState('dashboard'); 
      } catch(e: any) { 
          console.error(e); 
          alert("Error: "+e.message); 
      } 
  };

  const handleManualSaveDB = async () => {
    try {
        await setDoc(doc(firestore, 'artifacts', appId, 'public', 'data', 'app_settings', 'db_data'), db);
        alert('บันทึกและซิงค์ข้อมูลเรียบร้อยแล้ว ทุกเครื่องจะเห็นข้อมูลชุดนี้');
    } catch (e: any) {
        console.error(e);
        alert('เกิดข้อผิดพลาดในการบันทึก: ' + e.message);
    }
  };

  const handleUpdateStaff = async (newList: Staff[]) => {
    try {
        await setDoc(doc(firestore, 'artifacts', appId, 'public', 'data', 'app_settings', 'staff_data'), { list: newList });
        alert('บันทึกพนักงานเรียบร้อย');
        setModal(null);
    } catch (e: any) {
        console.error(e);
        alert('Error: ' + e.message);
    }
  };

  const handleUpdateFormulas = async (newList: Formula[]) => {
    try {
        await setDoc(doc(firestore, 'artifacts', appId, 'public', 'data', 'app_settings', 'formula_data'), { list: newList });
        alert('บันทึกสูตรคำนวณเรียบร้อย');
        setModal(null);
    } catch (e: any) {
        console.error(e);
        alert('Error: ' + e.message);
    }
  };

  const handleUpdateTheme = async (newTheme: any) => {
    try {
        await setDoc(doc(firestore, 'artifacts', appId, 'public', 'data', 'app_settings', 'theme_data'), newTheme);
        alert('บันทึกธีมเรียบร้อย');
        setModal(null);
    } catch (e: any) {
        console.error(e);
        alert('Error: ' + e.message);
    }
  };

  const handleAddHouse = () => { setInputText(''); setModal('add_house'); };
  const confirmAddHouse = () => { if(inputText.trim()) { setTempHouses([...tempHouses, inputText.trim()]); setSelectedHouse(inputText.trim()); setSelectedRoom(null); } setModal(null); };
  const handleDeleteHouse = (house: string, e: React.MouseEvent) => { 
    e.stopPropagation(); 
    setDeleteConfirm({
      title: 'ยืนยันการลบหลัง/บ้าน',
      message: `คุณต้องการลบ "${house}" ใช่หรือไม่? (การลบจะเอาสินค้าทั้งหมดในบ้านหลังนี้ออกด้วย)`,
      onConfirm: () => {
        setItems(items => items.filter(i => i.houseName !== house)); 
        setTempHouses(tempHouses => tempHouses.filter(h => h !== house)); 
        if(selectedHouse === house) { 
          setSelectedHouse(null); 
          setSelectedRoom(null); 
        }
      }
    });
  };
  const handleAddRoom = () => { if(!selectedHouse) return alert("เลือกบ้านก่อน"); setInputText(''); setModal('add_room'); };
  const confirmAddRoom = () => { 
      if(inputText.trim()) { 
          const newRoom = inputText.trim();
          setTempRooms((prev: any) => ({
              ...prev, 
              [selectedHouse as string]: [...(prev[selectedHouse as string]||[]), newRoom]
          })); 
          setSelectedRoom(newRoom); 
          setActiveMobileTab('spec');
      } 
      setModal(null); 
  };
  const handleDeleteRoom = (room: string, e: React.MouseEvent) => { 
    e.stopPropagation(); 
    setDeleteConfirm({
      title: 'ยืนยันการลบห้อง',
      message: `คุณต้องการลบห้อง "${room}" ใช่หรือไม่? (การลบจะเอาสินค้าทัั้งหมดในห้องนี้ออกด้วย)`,
      onConfirm: () => {
        setItems(items => items.filter(i => i.houseName !== selectedHouse || i.roomName !== room)); 
        setTempRooms(tempRooms => ({ 
          ...tempRooms, 
          [selectedHouse as string]: (tempRooms[selectedHouse as string]||[]).filter(r => r !== room) 
        })); 
        if(selectedRoom === room) setSelectedRoom(null);
      }
    });
  };
  const handleEditFromSummary = (item: any) => { setEditingItemId(item.id); setCurrentItem(sanitizeItem(item)); setSelectedHouse(item.houseName); setSelectedRoom(item.roomName); setAppState('editor'); setActiveMobileTab('spec'); };
  const handleRemoveFromSummary = (id: string) => { 
    setDeleteConfirm({
      title: 'ยืนยันการลบรายการสินค้า',
      message: 'คุณต้องการลบรายการสินค้านี้ออกจากการเสนอราคาใช่หรือไม่?',
      onConfirm: () => {
        setItems(items => items.filter(i => i.id !== id));
      }
    });
  };

  const handleEditName = (type: string, oldName: string) => {
    setEditTarget({ type, oldName });
    setInputText(oldName);
    setModal('edit_name');
  };
  
  const handleMoveRoom = (roomName: string, direction: number) => {
      setTempRooms((prev: any) => {
          const rooms = prev[selectedHouse as string] || [];
          const idx = rooms.indexOf(roomName);
          if (idx === -1) return prev;
          const newRooms = [...rooms];
          if (direction === -1 && idx > 0) {
              [newRooms[idx], newRooms[idx-1]] = [newRooms[idx-1], newRooms[idx]];
          } else if (direction === 1 && idx < rooms.length - 1) {
              [newRooms[idx], newRooms[idx+1]] = [newRooms[idx+1], newRooms[idx]];
          }
          return { ...prev, [selectedHouse as string]: newRooms };
      });
  };

  const handleMoveItem = (itemId: string, direction: number) => {
        const roomItems = items.filter(i => i.houseName === selectedHouse && i.roomName === selectedRoom);
        const currentIndexInRoom = roomItems.findIndex(i => i.id === itemId);
        
        if (currentIndexInRoom === -1) return;
        
        const mainIndex = items.findIndex(i => i.id === itemId);
        let targetId = null;
        if (direction === -1 && currentIndexInRoom > 0) {
            targetId = roomItems[currentIndexInRoom - 1].id;
        } else if (direction === 1 && currentIndexInRoom < roomItems.length - 1) {
            targetId = roomItems[currentIndexInRoom + 1].id;
        }
        if (targetId) {
            const targetMainIndex = items.findIndex(i => i.id === targetId);
            const newItems = [...items];
            [newItems[mainIndex], newItems[targetMainIndex]] = [newItems[targetMainIndex], newItems[mainIndex]];
            setItems(newItems);
        }
  };

  const confirmEditName = () => {
    if (!inputText.trim()) return;
    const newName = inputText.trim();
    if (editTarget.type === 'house') {
        const updatedItems = items.map(i => i.houseName === editTarget.oldName ? { ...i, houseName: newName } : i);
        setItems(updatedItems);
        setTempHouses(prev => prev.map(h => h === editTarget.oldName ? newName : h));
        if (selectedHouse === editTarget.oldName) setSelectedHouse(newName);
    } else {
        const updatedItems = items.map(i => i.houseName === selectedHouse && i.roomName === editTarget.oldName ? { ...i, roomName: newName } : i);
        setItems(updatedItems);
        setTempRooms((prev: any) => ({
            ...prev,
            [selectedHouse as string]: prev[selectedHouse as string].map((r: any) => r === editTarget.oldName ? newName : r)
        }));
        if (selectedRoom === editTarget.oldName) setSelectedRoom(newName);
    }
    setModal(null);
    setEditTarget(null);
  };

  const toggleItemSelection = (id: string) => {
      setExcludedItemIds(prev => {
          if (prev.includes(id)) return prev.filter(x => x !== id);
          return [...prev, id];
      });
  };

  const toggleRoomSelection = (roomItems: any[], isSelected: boolean) => {
      const ids = roomItems.map(i => i.id);
      if (isSelected) {
          setExcludedItemIds(prev => [...new Set([...prev, ...ids])]);
      } else {
          setExcludedItemIds(prev => prev.filter(id => !ids.includes(id)));
      }
  };
  
  const handleSharePDF = async () => {
    const element = document.getElementById('quotation-print-sheet');
    if (!element) return;
    
    setIsGeneratingPDF(true);
    
    // Create a temporary off-screen container for crisp, complete desktop-width rendering (fixing mobile column truncation)
    const printContainer = document.createElement('div');
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px';
    printContainer.style.top = '0';
    printContainer.style.width = '1000px';
    printContainer.style.backgroundColor = '#ffffff';
    
    // Clone the real element to avoid affecting user's viewport
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.width = '1000px';
    clone.style.maxWidth = 'none';
    clone.style.overflow = 'visible';
    clone.style.padding = '20px';
    
    // Permanently remove all no-print elements (like checkboxes, edits, delete buttons) from the captured tree
    const noPrintElements = clone.querySelectorAll('.no-print');
    noPrintElements.forEach(el => el.remove());
    
    printContainer.appendChild(clone);
    document.body.appendChild(printContainer);
    
    try {
        const canvas = await html2canvas(clone, {
            scale: 2,
            useCORS: true,
            scrollX: 0,
            scrollY: 0,
            windowWidth: 1000,
            backgroundColor: '#ffffff'
        });
        
        // Remove cloned DOM elements immediately
        if (printContainer.parentNode) {
            document.body.removeChild(printContainer);
        }
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210; 
        const pageHeight = 297; 
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        const blob = pdf.output('blob');
        const filename = `ใบเสนอราคา_คุณ${customer.name || 'ลูกค้า'}.pdf`;
        const file = new File([blob], filename, { type: 'application/pdf' });
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file]
                });
            } catch (shareErr) {
                console.warn("navigator.share failed, falling back to direct download link:", shareErr);
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            }
        } else {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        }
    } catch (err) {
        console.error("PDF engine error, falling back to print:", err);
        if (printContainer.parentNode) {
            document.body.removeChild(printContainer);
        }
        window.print();
    } finally {
        setIsGeneratingPDF(false);
    }
  };

  const handleShareTextSummary = () => {
    const itemLines = activeItems
        .filter(i => !excludedItemIds.includes(i.id))
        .map((item, idx) => {
            const isOther = item.curtainType === 'อื่นๆ';
            let desc = '';
            if (isOther) {
                desc = item.customNote || OTHER_EXPENSES.find(e => e.id === item.otherExpenseType)?.label || 'อื่นๆ';
            } else {
                const fabric = db.fabrics.find((f: any) => f.id === item.fabricId) || db.blinds.find((b: any) => b.id === item.fabricId) || db.venetians.find((b: any) => b.id === item.fabricId);
                desc = `${formulas.find(s=>s.id===item.curtainStyle)?.label || ''} (${item.curtainType}) ${item.railWidth} x ${item.railHeight} ซม. ${fabric ? `[ผ้า: ${fabric.name}]` : ''}`;
            }
            return `${idx + 1}. ${item.houseName} - ${item.roomName} : ${desc} - ${Math.ceil(item.calculated?.grandTotal || 0).toLocaleString()} บาท`;
        })
        .join('\n');

    const shareText = `ใบเสนอราคาเบื้องต้นคุณ ${customer.name || 'ลูกค้า'}\n` +
                      `เบอร์โทร: ${customer.phone || '-'}\n` +
                      `-----------------------------\n` +
                      `${itemLines || 'ไม่มีรายการสินค้า'}\n` +
                      `-----------------------------\n` +
                      `ส่วนลด On Top: ${ontopPercent}%\n` +
                      `ยอดรวมสุทธิ: ${Math.ceil(summaryTotals.finalNet).toLocaleString()} บาท\n` +
                      `เสนอราคาโดย: ${quoteOwner?.name || staff?.name || ''}`;

    if (navigator.share) {
        navigator.share({
            title: `ใบเสนอราคาคุณ ${customer.name || 'ลูกค้า'}`,
            text: shareText
        }).catch(e => console.log('Share canceled', e));
    } else {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareText);
            alert('คัดลอกข้อความสรุปใส่คลิปบอร์ดแล้ว คุณสามารถกดวางเพื่อส่งให้ลูกค้าใน LINE ได้เลย!');
        } else {
            alert('เบราว์เซอร์ไม่รองรับการส่งแชร์ กรุณาคัดลอกข้อมูลสรุปด้วยตนเอง');
        }
    }
  };

  // --- Real-time Firestore Live Config Listeners ---
  useEffect(() => { 
    const savedStaff = localStorage.getItem('currentStaff');
    if (savedStaff) { 
        setStaff(JSON.parse(savedStaff)); 
        setAppState('dashboard'); 
    }

    const initAuthAndSync = async () => {
        try {
            if (typeof (window as any).__initial_auth_token !== 'undefined' && (window as any).__initial_auth_token) {
                 await signInWithCustomToken(auth, (window as any).__initial_auth_token); 
            } else {
                 await signInAnonymously(auth); 
            }
        } catch (e) {
            console.error("Auth init failed, working in offline-first cache mode:", e);
        }
    };
    initAuthAndSync();

    const unsubAuth = onAuthStateChanged(auth, (u) => { 
        setUser(u); 
        if (u) { 
            // Register Snapshot listeners for lightning fast real-time updates without Promise.all blocking
            onSnapshot(doc(firestore, 'artifacts', appId, 'public', 'data', 'app_settings', 'staff_data'), 
                (docSnap) => { 
                    if(docSnap.exists()) {
                        const data = docSnap.data().list;
                        setStaffList(data); 
                        safeLocalStorageSetItem('cached_staffList', JSON.stringify(data));
                    }
                },
                (err) => console.error("staff_data listener error", err)
            );
            onSnapshot(doc(firestore, 'artifacts', appId, 'public', 'data', 'app_settings', 'formula_data'), 
                (docSnap) => { 
                    if(docSnap.exists()) {
                        const data = docSnap.data().list;
                        setFormulas(data); 
                        safeLocalStorageSetItem('cached_formulas', JSON.stringify(data));
                    }
                },
                (err) => console.error("formula_data listener error", err)
            );
            onSnapshot(doc(firestore, 'artifacts', appId, 'public', 'data', 'app_settings', 'theme_data'), 
                (docSnap) => { 
                    if(docSnap.exists()) {
                        const data = docSnap.data();
                        setTheme(data); 
                        safeLocalStorageSetItem('cached_theme', JSON.stringify(data));
                    }
                },
                (err) => console.error("theme_data listener error", err)
            );
            onSnapshot(doc(firestore, 'artifacts', appId, 'public', 'data', 'app_settings', 'db_data'), 
                (docSnap) => { 
                    if(docSnap.exists()) {
                        const data = docSnap.data();
                        setDb(data); 
                        safeLocalStorageSetItem('cached_db', JSON.stringify(data));
                    }
                },
                (err) => console.error("db_data listener error", err)
            );
            setIsDataLoaded(true);
        } 
    }); 
    return () => unsubAuth(); 
  }, []);

  // --- Real-time Autosave of Current Quoted Document ---
  useEffect(() => { 
    if (!quoteId || !user || !firestore) return; 
    
    const saveData = async () => { 
        setSaveStatus('saving'); 
        try { 
            const docRef = doc(firestore, 'artifacts', appId, 'public', 'data', 'quotations', quoteId); 
            await setDoc(docRef, { 
                updatedAt: Timestamp.now(), 
                customer, 
                staff: quoteOwner || staff, 
                items, 
                staffId: (quoteOwner || staff)?.id, 
                ontopPercent,
                roomOrder: tempRooms, 
                tempHouses, 
                excludedHouses, 
                excludedItemIds 
            }, { merge: true }); 
            setSaveStatus('saved'); 
            setTimeout(() => setSaveStatus(''), 2000); 
        } catch (error) { 
            setSaveStatus('error'); 
        } 
    }; 
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current); 
    autoSaveTimeoutRef.current = setTimeout(saveData, 2000); 
    return () => clearTimeout(autoSaveTimeoutRef.current); 
  }, [items, customer, ontopPercent, quoteId, user, db, staff, quoteOwner, tempRooms, tempHouses, excludedHouses, excludedItemIds]);

  // --- CALCULATOR CALCULATION LOGIC ---
  const computedResult = useMemo(() => {
    const curtainStyle = currentItem.curtainStyle;
    const railWidth = parseFloat(currentItem.railWidth as any) || 0;
    const railHeight = parseFloat(currentItem.railHeight as any) || 0;
    const panels = parseInt(currentItem.panels as any) || 1;
    const fabricId = currentItem.fabricId;
    const quantity = parseInt(currentItem.quantity as any) || 0;
    const railAccessoryId = currentItem.railAccessoryId;
    const extraAccessories = currentItem.extraAccessories;
    const discFabric = parseFloat(currentItem.discFabric as any) || 0;
    const discSew = parseFloat(currentItem.discSew as any) || 0;
    const discRail = parseFloat(currentItem.discRail as any) || 0;
    const discAcc = parseFloat(currentItem.discAcc as any) || 0;
    const calcStyle = currentItem.calcStyle;
    const curtainType = currentItem.curtainType;
    const otherExpenseType = currentItem.otherExpenseType;
    const customPrice = parseFloat(currentItem.customPrice as any) || 0;
    const customDiscount = parseFloat(currentItem.customDiscount as any) || 0;
    
    if (curtainType === 'อื่นๆ') {
        const exp = OTHER_EXPENSES.find(e => e.id === otherExpenseType);
        const price = exp?.fixed ? exp.price : (customPrice || 0);
        let total = price * quantity;
        
        if (otherExpenseType === 'other' && customDiscount) {
             total = total * (1 - customDiscount / 100);
        }

        return { 
            curtainWidthPerPanel: 0, numCuts: 0, usage: 0, repeats: 0, railQty: 0,
            costs: { fabric: 0, sewing: 0, rail: 0, acc: 0 },
            nets: { fabric: 0, sewing: 0, rail: 0, acc: 0 },
            grandTotal: Math.ceil(total)
        };
    }

    const styleDef = formulas.find(s => s.id === curtainStyle);
    if (!styleDef) return null;
    let material = null, isBlind = styleDef.category === 'blind';
    if (curtainStyle === 'roller') material = db.blinds.find((b: any) => b.id === fabricId); 
    else if (curtainStyle === 'venetian') material = db.venetians.find((b: any) => b.id === fabricId); 
    else material = db.fabrics.find((f: any) => f.id === fabricId);

    const fabWidth = material ? (parseFloat(material.width) || 150) : 150;
    const priceUnit = material ? (parseFloat(material.price) || 0) : 0;
    const yRepeat = material ? (parseFloat(material.yRepeat) || 0) : 0;

    let curtainWidthPerPanel = 0;
    if (['pleated', 'wave', 'wave_tape'].includes(curtainStyle)) { 
        curtainWidthPerPanel = Math.floor(((railWidth / panels) + 8) + (currentItem.sideReturn ? 8 : 0)); 
    } else if (['eyelet', 'loop'].includes(curtainStyle)) { 
        curtainWidthPerPanel = Math.floor((railWidth * styleDef.fullness) / panels); 
    } else { 
        curtainWidthPerPanel = railWidth; 
    }

    let numCuts = 0, usage = 0, repeats = 0;
    if (isBlind) { 
        usage = Math.ceil((railWidth * railHeight) / 10000 * 10) / 10; 
        if (usage < 1.5) usage = 1.5; 
    } else if (material) { 
        let yRepeatVal = yRepeat || 0; 
        repeats = 1; 
        if (calcStyle === 'grain_opaque') { 
            if (yRepeatVal > 0) repeats = Math.ceil((railHeight + styleDef.hemTopBot) / yRepeatVal); 
            else yRepeatVal = railHeight + styleDef.hemTopBot; 
        } 
        let rawCuts = 0; 
        if (calcStyle === 'grain_opaque') { 
            let requiredWidth = 0;
            if (['pleated', 'wave', 'wave_tape'].includes(curtainStyle)) requiredWidth = ((curtainWidthPerPanel * styleDef.fullness) + styleDef.hemSide) * panels;
            else if (['eyelet', 'loop'].includes(curtainStyle)) requiredWidth = (curtainWidthPerPanel + styleDef.hemSide) * panels; 
            else if (curtainStyle === 'roman') requiredWidth = (curtainWidthPerPanel + styleDef.hemSide) * panels;
            
            if(fabWidth > 0) {
                rawCuts = requiredWidth / fabWidth;
                let cutsCeil = Math.ceil(rawCuts); 
                if (curtainStyle !== 'roman' && (rawCuts % 1) >= 0.9) cutsCeil += 1; 
                numCuts = cutsCeil; 
            }
            
            let val = (repeats * yRepeatVal * numCuts * 1.05) / 91.44; 
            usage = Math.ceil(val); 
        } else { 
            if(fabWidth > 0) numCuts = Math.ceil((railHeight + styleDef.hemTopBot) / fabWidth);
            let totalRun = 0;
            if (['pleated', 'wave', 'wave_tape'].includes(curtainStyle)) totalRun = ((curtainWidthPerPanel * styleDef.fullness) + styleDef.hemSide) * panels;
            else totalRun = (curtainWidthPerPanel + styleDef.hemSide) * panels;
            let val = (totalRun * numCuts * 1.05) / 91.44;
            usage = Math.ceil(val); 
        } 
    }

    let sewingCost = 0;
    const sewRate = styleDef.sewingPrice || 0;
    if (['pleated', 'wave', 'wave_tape', 'loop'].includes(curtainStyle)) {
        let rate = railHeight > 599 ? 1000 : sewRate;
        sewingCost = (curtainWidthPerPanel * panels / 100) * rate; 
    } else if (curtainStyle === 'eyelet') {
        sewingCost = (curtainWidthPerPanel * panels / 100) * sewRate; 
    } else if (curtainStyle === 'roman') {
        sewingCost = (curtainWidthPerPanel * panels * railHeight / 10000) * sewRate;
    }

    const selectedRail = db.rails.find((r: any) => r.id === railAccessoryId);
    let costRail = 0, railQty = 0;
    if (selectedRail) {
        railQty = selectedRail.unit === 'เมตร' ? Math.max(1, Math.ceil(railWidth/100*10)/10) : 1;
        costRail = railQty * selectedRail.price;
    }
    let costAcc = extraAccessories.reduce((sum, accObj) => {
        const a = db.accs.find((x: any) => x.id === accObj.id);
        const qty = parseInt(accObj.qty as any) || 0;
        return sum + (a ? (a.price * qty) : 0);
    }, 0);

    const costFabric = usage * priceUnit;
    
    const totalFabric = costFabric * quantity;
    const totalSewing = sewingCost * quantity;
    const totalRail = costRail * quantity;
    const totalAcc = costAcc * quantity;
    
    // Net Prices per Item
    const netFabric = totalFabric * (1 - discFabric/100);
    const netSewing = totalSewing * (1 - discSew/100);
    const netRail = totalRail * (1 - discRail/100);
    const netAcc = totalAcc * (1 - discAcc/100);

    return {
        curtainWidthPerPanel, numCuts, usage, repeats, railQty,
        costs: { fabric: totalFabric, sewing: totalSewing, rail: totalRail, acc: totalAcc },
        nets: { fabric: netFabric, sewing: netSewing, rail: netRail, acc: netAcc },
        grandTotal: Math.ceil(netFabric + netSewing + netRail + netAcc)
    };
  }, [currentItem, db, formulas]);

  // --- CALCULATOR TOTALS ---
  const summaryTotals = useMemo(() => {
      const validItems = activeItems.filter(i => 
          i.calculated && 
          (i.curtainType === 'อื่นๆ' ? true : (i.calculated.costs && i.calculated.nets)) &&
          !excludedItemIds.includes(i.id)
      );
      
      const totalBasePrice = Math.ceil(validItems.reduce((sum, item) => {
          if (item.curtainType === 'อื่นๆ') return sum + (item.calculated.grandTotal || 0);
          const { costs } = item.calculated;
          return sum + (costs.fabric || 0) + (costs.sewing || 0) + (costs.rail || 0) + (costs.acc || 0);
      }, 0));

      const totalNetPrice = Math.ceil(validItems.reduce((sum, item) => sum + (item.calculated.grandTotal || 0), 0));
      const totalItemDiscount = totalBasePrice - totalNetPrice;

      const participatingTotal = validItems.reduce((sum, item) => {
          if (item.curtainType === 'อื่นๆ') {
             return item.isOntopFabric ? sum + (item.calculated.grandTotal || 0) : sum;
          }
          
          let itemEligible = 0;
          if (item.isOntopFabric) itemEligible += item.calculated.nets?.fabric || 0;
          if (item.isOntopSew) itemEligible += item.calculated.nets?.sewing || 0;
          if (item.isOntopRail) itemEligible += item.calculated.nets?.rail || 0;
          if (item.isOntopAcc) itemEligible += item.calculated.nets?.acc || 0;
          return sum + itemEligible;
      }, 0);

      const ontopAmount = Math.floor(participatingTotal * (ontopPercent / 100));
      const finalNet = Math.ceil(totalNetPrice - ontopAmount);

      return { totalBasePrice, totalItemDiscount, totalNetPrice, ontopAmount, finalNet };
  }, [activeItems, ontopPercent, excludedItemIds]);

  const StyleBlock = () => (
    <style dangerouslySetInnerHTML={{__html: `
      :root {
        --theme-main: ${theme.main || '#1e3a8a'};
        --theme-action: ${theme.action || '#2563eb'};
        --theme-success: ${theme.success || '#16a34a'};
        --theme-bg: ${theme.bg || '#f9fafb'};
      }
      .theme-bg-app { background-color: var(--theme-bg) !important; }
      .theme-bg-main { background-color: var(--theme-main) !important; }
      .theme-text-main { color: var(--theme-main) !important; }
      .theme-bg-action { background-color: var(--theme-action) !important; }
      .theme-text-action { color: var(--theme-action) !important; }
      .theme-bg-success { background-color: var(--theme-success) !important; }
      .theme-bg-light { background-color: #f3f4f6; }
      
      /* Dynamic Theme Overrides for hardcoded blue colors */
      .bg-blue-50, .bg-blue-50\\/50 {
        background-color: color-mix(in srgb, var(--theme-main) 8%, white) !important;
      }
      .bg-blue-100 {
        background-color: color-mix(in srgb, var(--theme-action) 12%, white) !important;
      }
      .bg-blue-600, .bg-blue-700, .bg-blue-750, .bg-blue-800 {
        background-color: var(--theme-action) !important;
      }
      .text-blue-700, .text-blue-800, .text-blue-900 {
        color: var(--theme-main) !important;
      }
      .text-blue-600, .theme-text-action {
        color: var(--theme-action) !important;
      }
      .border-blue-100, .border-blue-500 {
        border-color: color-mix(in srgb, var(--theme-main) 20%, white) !important;
      }
      .hover\\:bg-blue-50:hover {
        background-color: color-mix(in srgb, var(--theme-action) 8%, white) !important;
      }
      .hover\\:bg-blue-200:hover {
        background-color: color-mix(in srgb, var(--theme-action) 20%, white) !important;
      }
      .hover\\:bg-blue-700:hover, .hover\\:bg-blue-800:hover {
        background-color: var(--theme-main) !important;
      }
      .std-input {
        background-color: white !important;
        border: 1px solid #64748b !important;
        color: #0f172a !important;
        border-radius: 0.5rem !important;
        padding: 0.45rem 0.65rem !important;
        outline: none !important;
        font-size: 0.875rem !important;
        transition: all 0.2s !important;
      }
      .std-input:focus {
        border-color: var(--theme-action) !important;
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-action) 20%, transparent) !important;
      }
      .label {
        display: block !important;
        font-size: 0.75rem !important;
        font-weight: 700 !important;
        color: #0f172a !important;
        margin-bottom: 0.375rem !important;
        margin-left: 0.25rem !important;
      }
      @media print {
        html, body, #root, .min-h-screen, .flex-col, .flex-1, .app-layout {
            height: auto !important;
            min-height: initial !important;
            overflow: visible !important;
            display: block !important;
            position: relative !important;
        }
        div, section, table, tbody, tr, td {
            overflow: visible !important;
            height: auto !important;
        }
        .no-print { display: none !important; }
        .print-only { display: block !important; }
        body { background: white !important; font-size: 10pt; color: black !important; }
        .print-table-wrapper { width: 100%; border-collapse: collapse; }
        .print-header-group { display: table-header-group; }
        .print-footer-group { display: table-footer-group; }
        th, td, tr { background-color: transparent !important; background: none !important; }
        .print-table th { border-bottom: 2px solid black !important; padding: 6px 4px; text-align: left; font-weight: bold; color: black !important; font-size: 10pt; }
        .print-table td { border-bottom: 1px solid #ddd !important; padding: 6px 4px; color: black !important; font-size: 10pt; }
        .page-break { page-break-inside: avoid; break-inside: avoid; }
        .draft-watermark {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg);
            font-size: 130px; font-weight: 900; color: rgba(130, 130, 130, 0.13) !important; letter-spacing: 12px; pointer-events: none; z-index: 9999; display: block !important;
            text-shadow: none !important;
        }
        .print-container { width: 100%; }
        @page { size: A4; margin: 12mm; }
      }
    `}} />
  );

  if (appState === 'login') {
      return (
          <>
              <StyleBlock />
              <LoginScreen onLogin={handleLogin} staffList={staffList} />
          </>
      );
  }
  
  if (appState === 'dashboard') {
      return (
          <>
              <StyleBlock />
              <Dashboard 
                  user={user} 
                  staff={staff as Staff} 
                  isAdmin={isAdmin} 
                  onLoadQuote={handleLoadQuote} 
                  onCreateQuote={handleCreateQuote} 
                  onLogout={handleLogout} 
                  setModal={setModal} 
                  staffList={staffList}
                  firestore={firestore}
                  appId={appId}
              />
              {modal === 'database' && isAdmin && ( <Modal title="จัดการฐานข้อมูล (Admin)" onClose={()=>setModal(null)} maxWidth="max-w-4xl"><DatabaseEditor db={db} setDb={setDb} formulas={formulas} onSave={handleManualSaveDB} initialDb={INITIAL_DB}/></Modal> )}
              {modal === 'staff_manager' && isAdmin && ( <Modal title="จัดการพนักงาน (Admin)" onClose={()=>setModal(null)}><StaffManager staffList={staffList} setStaffList={setStaffList} onSave={handleUpdateStaff} adminId={ADMIN_ID}/></Modal> )}
              {modal === 'formulas' && isAdmin && ( <Modal title="จัดการสูตรคำนวณ (Admin)" onClose={()=>setModal(null)}><FormulaManager formulas={formulas} setFormulas={setFormulas} onSave={handleUpdateFormulas}/></Modal> )}
              {modal === 'theme' && isAdmin && ( <Modal title="จัดการสี/ธีม (Admin)" onClose={()=>setModal(null)}><ThemeManager theme={theme} setTheme={setTheme} onSave={handleUpdateTheme}/></Modal> )}
          </>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex flex-col">
      <StyleBlock />

      {isGeneratingPDF && (
          <div className="fixed inset-0 bg-black/65 z-[9999] flex flex-col items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center max-w-xs w-full">
                  <div className="bg-blue-50 p-4 rounded-full theme-text-action flex items-center justify-center">
                      <Loader className="animate-spin text-blue-600" size={32} />
                  </div>
                  <div>
                      <h4 className="font-bold text-gray-950 text-base">กำลังสร้างไฟล์ PDF...</h4>
                      <p className="text-xs text-gray-600 mt-1">กรุณารอสสักครู่ ระบบกำลังจัดเตรียมหน้ากระดาษเพื่อแชร์ไปยังแอปหลักปุ่มแชร์ทันที</p>
                  </div>
              </div>
          </div>
      )}

      <nav className="sticky top-0 z-40 theme-bg-main text-white px-4 md:px-6 py-3 flex justify-between items-center shadow-md no-print select-none">
          <div className="flex items-center gap-2 md:gap-3">
             <div className="bg-white/10 p-1.5 md:p-2 rounded-lg flex-shrink-0"><Calculator size={18} className="md:w-5 md:h-5"/></div>
             <div className="flex-shrink-0"><h1 className="font-bold text-base md:text-lg leading-tight">Fast Track</h1><p className="text-[10px] md:text-xs text-blue-200 hidden sm:block">ระบบใบเสนอราคา</p></div>
         </div>
         <div className="flex items-center gap-1.5 md:gap-3">
             {saveStatus === 'saving' && (
                 <span className="flex items-center gap-0.5 md:gap-1 text-xs text-yellow-300 animate-pulse">
                     <Loader size={12} className="animate-spin"/>
                     <span className="hidden sm:inline">กำลังบันทึก...</span>
                 </span>
             )}
             {saveStatus === 'saved' && (
                 <span className="flex items-center gap-0.5 md:gap-1 text-xs text-green-300">
                     <CheckCircle size={12}/>
                     <span className="hidden sm:inline">บันทึกแล้ว</span>
                 </span>
             )}
             <div className="hidden sm:block h-6 w-px bg-white/20 mx-1 md:mx-2"></div>
             <span className="text-xs md:text-sm font-semibold bg-white/10 px-2 md:px-3 py-1 rounded-full hidden sm:inline-block truncate max-w-28">{staff?.name}</span>
             
             {appState === 'editor' && (
                 <button onClick={() => setAppState('dashboard')} className="p-1.5 md:p-2 hover:bg-white/10 rounded-full text-blue-200 flex items-center gap-1 transition-all" title="กลับหน้าหลัก">
                     <ArrowLeft size={16}/> 
                     <span className="text-sm hidden md:inline">กลับหน้าหลัก</span>
                 </button>
             )}
             
             <button onClick={() => setModal('cloud_save')} className="p-1.5 md:p-2 hover:bg-white/10 rounded-full text-green-300 transition-all" title="บันทึกออนไลน์คลาวด์">
                 <Save size={18} className="md:w-5 md:h-5"/>
             </button>
             
             {appState === 'editor' && (
                 <button onClick={() => setAppState('summary')} className="p-1.5 md:p-2 hover:bg-white/10 rounded-full text-yellow-200 flex items-center gap-1 transition-all" title="ใบเสนอราคา">
                     <FileText size={18} className="md:w-5 md:h-5"/> 
                     <span className="text-sm hidden md:inline">ใบเสนอราคา</span>
                 </button>
             )}
             
             {appState === 'summary' && (
                 <button onClick={() => setAppState('editor')} className="p-1.5 md:p-2 hover:bg-white/10 rounded-full text-yellow-200 flex items-center gap-1 transition-all" title="แก้ไขข้อมูล">
                     <Edit size={18} className="md:w-5 md:h-5"/> 
                     <span className="text-sm hidden md:inline">แก้ไขข้อมูล</span>
                 </button>
             )}
             
             {appState === 'summary' && (
                 <>
                     <button onClick={() => window.print()} className="p-1.5 md:p-2 hover:bg-white/10 rounded-full text-emerald-300 flex items-center gap-1 transition-all" title="พิมพ์ A4">
                         <Printer size={18} className="md:w-5 md:h-5"/>
                         <span className="text-sm hidden md:inline">พิมพ์ (A4)</span>
                     </button>
                     <button onClick={handleSharePDF} className="p-1.5 md:p-2 hover:bg-white/10 rounded-full text-blue-300 flex items-center gap-1 transition-all" title="แชร์ PDF">
                         <Share size={18} className="md:w-5 md:h-5"/> 
                         <span className="text-sm hidden md:inline">แชร์ PDF</span>
                     </button>
                 </>
             )}
             
             {isAdmin && (
                <div className="relative">
                    {/* Desktop Mode (horizontal bar) */}
                    <div className="hidden lg:flex items-center gap-1 bg-white/5 rounded-full px-1">
                        <button onClick={() => setModal('staff_manager')} className="p-2 hover:bg-white/10 rounded-full transition-all text-orange-300" title="พนักงาน"><Users size={18}/></button>
                        <button onClick={() => setModal('formulas')} className="p-2 hover:bg-white/10 rounded-full transition-all text-green-300" title="สูตร"><Ruler size={18}/></button>
                        <button onClick={() => setModal('theme')} className="p-2 hover:bg-white/10 rounded-full transition-all text-pink-300" title="สี/ธีม"><Palette size={18}/></button>
                        <button onClick={() => setModal('database')} className="p-2 hover:bg-white/10 rounded-full transition-all text-yellow-300" title="ฐานข้อมูล"><Database size={18}/></button>
                    </div>
                    {/* Mobile Mode (elegant gear/settings icon dropdown) */}
                    <div className="lg:hidden relative">
                        <button 
                            onClick={() => setAdminMenuOpen(!adminMenuOpen)} 
                            className={`p-1.5 hover:bg-white/10 rounded-full transition-all text-orange-300 ${adminMenuOpen ? 'bg-white/20' : ''}`}
                            title="แอดมินเซ็ตติ้ง"
                        >
                            <Settings size={18}/>
                        </button>
                        {adminMenuOpen && (
                            <div className="absolute right-0 mt-2 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-2 flex flex-col gap-1.5 z-55 w-40 text-white">
                                <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 border-b border-slate-800 text-center">เมนูผู้ดูแล (Admin)</div>
                                <button onClick={() => { setModal('staff_manager'); setAdminMenuOpen(false); }} className="w-full flex items-center gap-2 px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-white/10 text-orange-300 text-left transition-colors cursor-pointer">
                                    <Users size={14}/> พนักงาน
                                </button>
                                <button onClick={() => { setModal('formulas'); setAdminMenuOpen(false); }} className="w-full flex items-center gap-2 px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-white/10 text-green-300 text-left transition-colors cursor-pointer">
                                    <Ruler size={14}/> สูตรคำนวณ
                                </button>
                                <button onClick={() => { setModal('theme'); setAdminMenuOpen(false); }} className="w-full flex items-center gap-2 px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-white/10 text-pink-300 text-left transition-colors cursor-pointer">
                                    <Palette size={14}/> สี/ธีมระบบ
                                </button>
                                <button onClick={() => { setModal('database'); setAdminMenuOpen(false); }} className="w-full flex items-center gap-2 px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-white/10 text-yellow-300 text-left transition-colors cursor-pointer">
                                    <Database size={14}/> ฐานข้อมูล
                                </button>
                            </div>
                        )}
                    </div>
                </div>
             )}
             <button onClick={handleLogout} className="p-1.5 md:p-2 hover:bg-red-500 rounded-full transition-all text-red-200" title="ออกจากระบบ"><LogOut size={16} className="md:w-5 md:h-5"/></button>
         </div>
      </nav>

      {/* --- CONTENT SUMMARY OR EDITOR --- */}
      {appState === 'summary' ? (
        <div className="p-4 md:p-8 max-w-5xl mx-auto w-full relative bg-white min-h-screen font-sans md:border md:shadow-md md:my-6 rounded-none md:rounded-xl pb-24 md:pb-16">
             {isDraftPrint && (<div className="draft-watermark">DRAFT</div>)}
             
             {typeof window !== 'undefined' && window.self !== window.top && showIframeWarn && (
                 <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-xs relative">
                     <button 
                         onClick={() => setShowIframeWarn(false)} 
                         className="absolute top-3 right-3 p-1 text-blue-400 hover:text-blue-600 rounded-full hover:bg-blue-100/50 transition-colors cursor-pointer border-none bg-transparent"
                         title="ปิดการแจ้งเตือน"
                     >
                         <X size={14} />
                     </button>
                     <div className="flex-1 pr-6">
                         <h4 className="font-bold text-blue-800 text-sm flex items-center gap-1.5">
                             💡 คำแนะนำสำหรับการทำรายการพิมพ์/แชร์บนมือถือ
                         </h4>
                         <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                             เนื่องจากท่านกำลังใช้งานผ่านระบบหน้าต่างจำลอง (iFrame) ใน AI Studio เพื่อประสิทธิภาพและหน้าตาใบเสนอราคาแบบ PDF ที่สวยงามถูกต้องสมบูรณ์แบบ 100% แนะนำให้กดปุ่มขวามือเพื่อเปิดในแท็บใหม่ จะแชร์หาลูกค้าได้สะดวกยิ่งขึ้นครับ
                         </p>
                     </div>
                     <a 
                         href={window.location.href} 
                         target="_blank" 
                         rel="noopener noreferrer" 
                         className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 self-end md:self-auto cursor-pointer whitespace-nowrap"
                     >
                         <ExternalLink size={14} /> เปิดแท็บใหม่เพื่อพิมพ์/แชร์
                     </a>
                 </div>
             )}
             
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg no-print">
                <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-bold text-gray-700 flex items-center gap-2 text-sm"><Home size={18}/> เลือกบ้านที่ต้องการพิมพ์:</span>
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1 rounded border hover:bg-blue-50 transition-all text-xs">
                        <input 
                            type="checkbox" 
                            checked={excludedHouses.length === 0}
                            onChange={() => setExcludedHouses([])}
                            className="w-4 h-4 text-theme-main rounded focus:ring-blue-500"
                        />
                        <span className={excludedHouses.length === 0 ? 'text-blue-700 font-bold' : 'text-gray-700'}>เลือกทั้งหมด</span>
                    </label>
                    <div className="h-6 w-px bg-gray-300 mx-2"></div>
                    {housesInQuote.map(house => (
                        <label key={house} className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1 rounded border hover:bg-gray-50 transition-all text-xs">
                            <input 
                                type="checkbox" 
                                checked={!excludedHouses.includes(house)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setExcludedHouses(prev => prev.filter(h => h !== house));
                                    } else {
                                        setExcludedHouses(prev => [...prev, house]);
                                    }
                                }}
                                className="w-4 h-4 text-theme-main rounded focus:ring-blue-500"
                            />
                            <span className={!excludedHouses.includes(house) ? 'text-gray-900 font-medium' : 'text-gray-400 line-through'}>{house}</span>
                        </label>
                    ))}
                </div>
            </div>

             {/* Responsive Scrollable Container to prevent table from overflowing on mobile viewports */}
             <div className="w-full overflow-x-auto -mx-2 px-2 md:-mx-0 md:px-0 scrollbar-thin print:overflow-visible">
                 <table id="quotation-print-sheet" className="w-full print-table-wrapper text-sm font-sans min-w-[700px] md:min-w-0 bg-white">
                <thead className="print-header-group">
                    <tr>
                        <td colSpan={6}>
                             <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b-2 border-gray-800 mb-4 pt-4">
                                 <div>
                                     <h1 className="text-xl md:text-2xl font-bold text-gray-800 font-sans">ใบเสนอราคาผ้าม่านเบื้องต้น</h1>
                                     <p className="text-gray-500 text-xs">Fast Track Quotation System</p>
                                 </div>
                                 <div className="text-left sm:text-right text-sm">
                                     <div className="font-bold text-base text-gray-800 font-sans">ลูกค้า: คุณ{customer.name}</div>
                                     {customer.phone && <div className="text-gray-600">โทร: {customer.phone}</div>}
                                     {customer.address && <div className="text-gray-500 max-w-[250px] text-xs mt-1 sm:ml-auto">{customer.address}</div>}
                                 </div>
                             </div>
                        </td>
                    </tr>
                    <tr className="bg-transparent text-gray-800 text-xs font-bold uppercase border-b-2 border-t border-gray-300">
                        <th className="py-3 px-2 w-8 text-center no-print">เลือก</th>
                        <th style={{width: '35%'}} className="py-3 px-4 text-left font-sans">รายการ</th>
                        <th style={{width: '30%'}} className="py-3 px-4 text-left font-sans">รายละเอียด</th>
                        <th style={{width: '20%', textAlign: 'center'}} className="py-3 px-4 text-center font-sans">ขนาด</th>
                        <th style={{width: '15%', textAlign: 'right'}} className="py-3 px-4 text-right font-sans font-bold">ราคา</th>
                        <th className="no-print" style={{width: '5%'}}></th>
                    </tr>
                </thead>
                <tbody>
                      {Object.entries(activeItems.reduce((acc, i) => { (acc[i.houseName] = acc[i.houseName] || []).push(i); return acc; }, {})).map(([house, houseItems]: any) => {
                          const roomsInHouse = houseItems.reduce((r: any, i: any) => { (r[i.roomName] = r[i.roomName] || []).push(i); return r; }, {});
                          const isHouseVisibleInPrint = houseItems.some((i: any) => !excludedItemIds.includes(i.id));

                          return (
                              <React.Fragment key={house}>
                                  <tr className={`bg-transparent border-b border-gray-250 page-break ${!isHouseVisibleInPrint ? 'print:hidden' : ''}`}><td colSpan={6} className="font-bold text-base pt-5 pb-2 text-gray-800 px-2 font-sans">{house}</td></tr>
                                  {Object.entries(roomsInHouse).map(([roomName, roomItems]: any) => {
                                      const roomIncludedItems = roomItems.filter((i: any) => !excludedItemIds.includes(i.id));
                                      const roomTotal = roomIncludedItems.reduce((sum: number, item: any) => sum + (item.calculated?.grandTotal || 0), 0);
                                      const isRoomAllChecked = roomItems.every((i: any) => !excludedItemIds.includes(i.id));
                                      const isRoomVisibleInPrint = roomIncludedItems.length > 0;

                                      return (
                                          <React.Fragment key={roomName}>
                                              <tr className={`bg-transparent border-b border-gray-150 page-break ${!isRoomVisibleInPrint ? 'print:hidden opacity-50' : ''}`}>
                                                <td className="text-center no-print align-middle"><input type="checkbox" checked={isRoomAllChecked} onChange={() => toggleRoomSelection(roomItems, isRoomAllChecked)} className="cursor-pointer w-4 h-4 text-theme-main"/></td>
                                                <td colSpan={5} className="font-bold text-gray-750 py-2 px-2 border-b border-gray-100 font-sans">{roomName}</td>
                                              </tr>
                                              {roomItems.map((item: any, idx: number) => {
                                                  const isExcluded = excludedItemIds.includes(item.id);
                                                  const isOther = item.curtainType === 'อื่นๆ';
                                                  let details = [], typeText = '', displayPrice = 0;
                                                  if (isOther) {
                                                      const exp = OTHER_EXPENSES.find(e => e.id === item.otherExpenseType);
                                                      typeText = exp ? exp.label : 'อื่นๆ';
                                                      if (item.customNote) details.push(item.customNote);
                                                      displayPrice = item.calculated?.grandTotal || 0;
                                                  } else {
                                                      const fabric = db.fabrics.find((f: any) => f.id === item.fabricId) || db.blinds.find((b: any) => b.id === item.fabricId) || db.venetians.find((b: any) => b.id === item.fabricId);
                                                      const rail = db.rails.find((r: any) => r.id === item.railAccessoryId);
                                                      const accs = item.extraAccessories.map((ea: any) => { const a = db.accs.find((dbA: any) => dbA.id === ea.id); return a ? `${a.name} (${ea.qty} ${a.unit || 'ชิ้น'})` : ''; }).filter(Boolean).join(', ');
                                                      typeText = `${formulas.find(s=>s.id===item.curtainStyle)?.label} (${item.curtainType})`;
                                                      if (fabric) details.push(`ผ้า: ${fabric.name} ${item.color ? `(สี ${item.color})` : ''}`);
                                                      if (rail) details.push(`ราง: ${rail.name} (${item.calculated?.railQty} ${rail.unit})`);
                                                      if (accs) details.push(`อุปกรณ์: ${accs}`);
                                                      displayPrice = Math.ceil(item.calculated?.grandTotal || 0);
                                                  }
                                                  return (
                                                      <tr key={item.id} className={`page-break border-b border-gray-100 ${isExcluded ? 'opacity-30 print:hidden bg-transparent' : 'bg-transparent'}`}>
                                                          <td className="text-center no-print align-top py-2.5"><input type="checkbox" checked={!isExcluded} onChange={() => toggleItemSelection(item.id)} className="cursor-pointer w-4 h-4 text-theme-main"/></td>
                                                          <td className="align-top py-2.5 px-4 font-medium font-sans">{idx + 1}. {typeText}</td>
                                                          <td className="align-top py-2.5 px-4 text-xs text-gray-500 line-clamp-2 font-sans">{details.join(' | ')}</td>
                                                          <td className="align-top py-2.5 px-4 text-center text-xs font-sans">{!isOther && `${item.railWidth} x ${item.railHeight} ซม.`}{item.quantity > 1 && <div className="text-[10px] text-gray-400">x {item.quantity} {isOther ? 'รายการ' : 'ชุด'}</div>}</td>
                                                          <td className="align-top py-2.5 px-4 text-right font-bold font-sans">{isExcluded ? <span className="line-through text-gray-300">{displayPrice.toLocaleString()}</span> : displayPrice.toLocaleString()}</td>
                                                          <td className="align-top py-2.5 px-2 text-center no-print"><div className="flex gap-1 justify-center"><button onClick={()=>handleEditFromSummary(item)} className="text-blue-600 hover:bg-gray-100 p-1.5 rounded cursor-pointer"><Edit size={14}/></button><button onClick={()=>handleRemoveFromSummary(item.id)} className="text-red-500 hover:bg-red-55 p-1.5 rounded cursor-pointer"><Trash2 size={14}/></button></div></td>
                                                      </tr>
                                                  );
                                              })}
                                              <tr className={`border-t border-gray-300 font-bold bg-transparent ${!isRoomVisibleInPrint ? 'print:hidden' : ''}`}>
                                                  <td className="no-print"></td>
                                                  <td colSpan={3} className="text-right py-2.5 pr-4 text-xs text-gray-500 font-medium font-sans">รวมราคาห้อง {roomName}</td>
                                                  <td className="text-right py-2.5 px-4 font-sans font-bold">{Math.ceil(roomTotal).toLocaleString()}</td>
                                                  <td className="no-print"></td>
                                              </tr>
                                          </React.Fragment>
                                      );
                                  })}
                              </React.Fragment>
                          );
                      })}
                </tbody>
                <tfoot className="print-footer-group">
                    <tr>
                        <td colSpan={6}>
                             <div className="flex flex-col md:flex-row justify-between items-start mt-8 pt-6 border-t border-gray-300 page-break gap-8 print:flex-row">
                                 <div className="w-full md:w-1/2 text-left text-xs text-gray-500 font-sans">
                                    {customer.note && <div className="mb-4"><div className="font-bold text-gray-700 underline mb-1 font-sans">เพิ่มเติม:</div><div className="p-2 border border-dashed border-gray-300 rounded text-sm text-gray-700 bg-gray-50 font-sans">{customer.note}</div></div>}
                                    <div className="text-[11px] text-gray-400 space-y-1 font-sans">
                                        <div className="font-bold text-gray-700 underline mb-1 font-sans">หมายเหตุ:</div>
                                        <ol className="list-decimal pl-4 space-y-1 font-sans">
                                            <li>ราคาในใบเสนอราคาเบื้องต้นนี้รวมภาษีมูลค่าเพิ่ม 7% แล้ว</li>
                                            <li>ใบเสนอราคาเบื้องต้นนี้เป็นการคำนวณราคาเบื้องต้นเท่านั้น โปรดนัดคิวเจ้าหน้าที่เข้าวัดพื้นที่จริงเพื่อสรุปยอดคงเหลือ</li>
                               </ol>
                                    </div>
                                 </div>
                                 <div className="w-full md:w-80">
                                     <table className="w-full text-sm">
                                         <tbody>
                                             <tr><td className="py-1 text-gray-600">ราคารวม (รวมภาษี 7%)</td><td className="py-1 text-right font-medium">{Math.ceil(summaryTotals.totalBasePrice).toLocaleString()}</td></tr>
                                             <tr><td className="py-1 text-gray-600">ส่วนลดรวม</td><td className="py-1 text-right text-red-500">-{Math.ceil(summaryTotals.totalItemDiscount).toLocaleString()}</td></tr>
                                             <tr className="border-t"><td className="py-1 font-bold pt-2">ราคาหลังหักส่วนลด</td><td className="py-1 text-right font-bold pt-2">{Math.ceil(summaryTotals.totalNetPrice).toLocaleString()}</td></tr>
                                             <tr>
                                                 <td className="py-1 text-gray-600 flex items-center gap-2">
                                                     ส่วนลด On Top 
                                                     <span className="no-print border px-1 text-xs bg-white rounded"><input type="number" className="w-8 text-center outline-none" value={ontopPercent === 0 ? '' : ontopPercent} onChange={e=>setOntopPercent(e.target.value === '' ? 0 : parseFloat(e.target.value)||0)}/>%</span>
                                                     <span className="print-only ml-1">({ontopPercent}%)</span>
                                                 </td>
                                                 <td className="py-1 text-right text-red-500">-{Math.floor(summaryTotals.ontopAmount).toLocaleString()}</td>
                                             </tr>
                                             <tr className="text-xl border-t-2 border-black font-bold "><td className="py-3 text-gray-950">ยอดสุทธิ</td><td className="py-3 text-right text-blue-900">{Math.ceil(summaryTotals.finalNet).toLocaleString()} บาท</td></tr>
                                         </tbody>
                                     </table>
                                     <div className="mt-8 text-right text-sm text-gray-900 font-bold">ผู้เสนอราคา: {quoteOwner?.name || staff?.name}</div>
                                 </div>
                             </div>
                        </td>
                    </tr>
                </tfoot>
             </table>
             </div>
             {/* Sticky Bottom Actions inside the Summary screen for mobile (above bottom navigation menu) */}
             <div className="no-print md:hidden fixed bottom-16 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t p-3 flex flex-row gap-3 shadow-lg max-w-[1920px] mx-auto">
                 <button onClick={() => setAppState('editor')} className="flex-1 py-3 px-2 rounded-xl bg-gray-100 text-gray-750 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer font-sans">
                     <ArrowLeft size={14}/> แก้ไขข้อมูล
                 </button>
                 <button onClick={handleSharePDF} className="flex-1 py-3 px-3 rounded-xl bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer font-sans font-bold">
                     <Printer size={14}/> แชร์ไฟล์ PDF
                 </button>
             </div>

             <div className="mt-10 hidden md:flex justify-center gap-4 no-print pb-10">
                 <button onClick={() => setAppState('editor')} className="px-6 py-2 rounded-lg bg-gray-100 text-gray-650 hover:bg-gray-200 transition-colors cursor-pointer font-sans">กลับไปแก้ไข</button>
                 <button onClick={handlePrintDraft} className="px-6 py-2 rounded-lg bg-gray-600 text-white shadow hover:bg-gray-700 flex items-center gap-2 transition-colors cursor-pointer font-sans"><Printer size={18}/> พิมพ์ (Draft)</button>
                 <button onClick={() => window.print()} className="px-6 py-2 rounded-lg bg-blue-700 text-white shadow hover:bg-blue-800 flex items-center gap-2 transition-colors cursor-pointer font-sans"><Printer size={18}/> พิมพ์สรุปใบเสนอราคา</button>
             </div>
        </div>
      ) : (
        <>
        <div className="flex-1 flex flex-col lg:flex-row p-4 pb-24 lg:pb-4 gap-4 overflow-hidden max-w-[1920px] mx-auto w-full font-sans">
            <div className={`w-full lg:w-72 flex flex-col gap-4 flex-shrink-0 bg-white lg:bg-transparent z-20 ${activeMobileTab === 'area' ? 'flex' : 'hidden lg:flex'} ${isHouseListCollapsed ? 'h-14 overflow-hidden' : 'h-auto lg:h-full overflow-hidden'}`}>
                <div className="lg:hidden flex justify-between items-center bg-blue-50 p-2 rounded-lg mb-2 cursor-pointer" onClick={() => setIsHouseListCollapsed(!isHouseListCollapsed)}>
                    <span className="font-bold text-blue-800 flex items-center gap-2"><MapPin size={18}/> เลือกบ้าน/ห้อง</span>
                    {isHouseListCollapsed ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}
                </div>

                <Card className="flex-1 min-h-[200px]" title="1. เลือกบ้าน" icon={MapPin} action={<button onClick={handleAddHouse} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"><Plus size={12}/> เพิ่มบ้าน</button>}>
                    <div className="p-2 overflow-y-auto space-y-1 h-full bg-gray-50/50">
                        {availableHouses.length === 0 && <div className="text-center text-gray-400 py-10 text-xs">ยังไม่มีบ้าน กดเพิ่มบ้าน</div>}
                        {availableHouses.map(house => (
                            <div key={house} className={`group w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all cursor-pointer ${selectedHouse === house ? 'bg-white border-blue-500 theme-text-action font-bold shadow-sm' : 'bg-white border-gray-200 hover:border-blue-300 text-gray-600'}`} onClick={() => { setSelectedHouse(house); setSelectedRoom(null); }}>
                                <span className="text-sm truncate">{house}</span>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button onClick={(e) => { e.stopPropagation(); handleEditName('house', house); }} className="p-1 text-gray-300 hover:text-blue-500"><Edit size={12}/></button>
                                    {selectedHouse === house && <CheckSquare size={14} className="text-blue-600"/>}
                                    <button onClick={(e)=>handleDeleteHouse(house, e)} className="p-1 text-gray-300 hover:text-red-500 rounded"><Trash2 size={12}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
                <Card className="flex-[2]" title={selectedHouse ? `2. ห้องใน ${selectedHouse}` : '2. รายการห้อง'} icon={LayoutGrid} action={selectedHouse && <button onClick={handleAddRoom} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"><Plus size={12}/> เพิ่มห้อง</button>}>
                    <div className="p-2 overflow-y-auto space-y-1 h-full bg-gray-50/50">
                        {!selectedHouse ? <div className="text-center text-gray-400 py-10 text-xs">เลือกบ้านก่อน</div> : availableRooms.length === 0 ? <div className="text-center text-gray-400 py-10 text-xs">ยังไม่มีห้อง กดเพิ่มห้อง</div> : availableRooms.map(room => (
                            <div key={room} className={`group w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all cursor-pointer ${selectedRoom === room ? 'bg-green-50 border-green-500 text-green-800 font-bold shadow-sm' : 'bg-white border-gray-200 hover:border-green-300 text-gray-600'}`} onClick={() => { setSelectedRoom(room); if (window.innerWidth < 1024) setActiveMobileTab('spec'); }}>
                                <span className="text-sm truncate">{room}</span>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button onClick={(e) => { e.stopPropagation(); handleEditName('room', room); }} className="p-1 text-gray-300 hover:text-blue-500"><Edit size={12}/></button>
                                    <div className="flex flex-col">
                                        <button onClick={(e) => { e.stopPropagation(); handleMoveRoom(room, -1); }} className="p-0.5 text-gray-400 hover:text-blue-500"><ArrowUp size={10}/></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleMoveRoom(room, 1); }} className="p-0.5 text-gray-400 hover:text-blue-500"><ArrowDown size={10}/></button>
                                    </div>
                                    {selectedRoom === room && <ArrowRight size={14} className="text-green-600"/>}
                                    <button onClick={(e)=>handleDeleteRoom(room, e)} className="p-1 text-gray-300 hover:text-red-500 rounded"><Trash2 size={12}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
            
            <div className={`flex-1 flex flex-col gap-4 overflow-y-auto min-h-0 ${activeMobileTab !== 'area' ? 'flex' : 'hidden lg:flex'}`}>
                <div className="bg-white border border-blue-100 shadow-sm rounded-lg p-3 flex justify-between items-center flex-none">
                     <div className="flex items-center gap-3">
                         <div className="bg-blue-50 p-2 rounded-full theme-text-action"><User size={20}/></div>
                         <div><div className="font-bold text-gray-800 text-sm">{customer.name}</div><div className="text-xs text-gray-500">{customer.phone}</div></div>
                     </div>
                     <button onClick={()=>setAppState('customer_form')} className="text-xs theme-text-action hover:text-blue-700 flex items-center gap-1 font-semibold"><Edit size={14}/> แก้ไขข้อมูลลูกค้า</button>
                </div>
                {!selectedHouse || !selectedRoom ? (
                    <div className="flex-1 bg-white border border-dashed border-gray-300 rounded-lg flex items-center justify-center flex-col text-gray-400 p-8 text-center font-sans">
                        <Home size={40} className="mb-3 opacity-60 text-blue-800"/>
                        <p className="font-bold text-sm text-gray-700">กรุณาเลือกชื่อ 'บ้าน' และ 'ห้อง' ก่อน</p>
                        <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">จากคอลัมน์พื้นที่ เพื่อดำเนินการจัดทำราคาสินค้าหรือคำนวณสเปก</p>
                        <button onClick={() => setActiveMobileTab('area')} className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow hover:bg-blue-700 transition-colors cursor-pointer font-sans">
                            ไปหน้าเลือกพื้นที่ (บ้าน/ห้อง)
                        </button>
                    </div>
                ) : (
                    <>
                        {itemsInCurrentRoom.length > 0 && (
                            <div className={`bg-white border border-blue-100 rounded-lg overflow-hidden flex-none ${activeMobileTab === 'items' ? 'block' : 'hidden lg:block'}`}>
                                <div className="bg-blue-50 px-4 py-2 font-bold text-blue-800 text-sm">รายการสินค้าในห้อง "{selectedRoom}"</div>
                                <div className="divide-y divide-gray-100 max-h-40 overflow-y-auto">
                                    {itemsInCurrentRoom.map(item => (
                                        <div key={item.id} className="p-3 flex justify-between items-center hover:bg-gray-50 transition-colors text-xs">
                                            <div>
                                                <div className="font-bold text-gray-700">{item.curtainType === 'อื่นๆ' ? OTHER_EXPENSES.find(e=>e.id===item.otherExpenseType)?.label : formulas.find(s=>s.id===item.curtainStyle)?.label}</div>
                                                <div className="text-gray-500">{item.curtainType === 'อื่นๆ' ? item.customNote : `${item.railWidth} x ${item.railHeight} ซม. | สี: ${item.color}`}</div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="font-bold text-blue-700">{item.calculated?.grandTotal.toLocaleString()} บาท</div>
                                                <div className="flex gap-1 items-center">
                                                    <button onClick={() => {
                                                        setEditingItemId(item.id); 
                                                        setCurrentItem(sanitizeItem(item));
                                                        setActiveMobileTab('spec');
                                                    }} className="p-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded" title="แก้ไข"><Edit size={13}/></button>
                                                    <button onClick={() => {
                                                        setDeleteConfirm({
                                                            title: 'ยืนยันการลบรายการสินค้า',
                                                            message: 'คุณต้องการลบรายการสินค้านี้ใช่หรือไม่?',
                                                            onConfirm: () => setItems(items => items.filter(x => x.id !== item.id))
                                                        });
                                                    }} className="p-1 bg-gray-100 hover:bg-red-50 hover:text-red-500 rounded" title="ลบ"><Trash2 size={13}/></button>
                                                    <div className="flex flex-col ml-1">
                                                        <button onClick={() => handleMoveItem(item.id, -1)} className="p-0.5 hover:text-blue-600 text-gray-300" title="เลื่อนขึ้น"><ArrowUp size={11}/></button>
                                                        <button onClick={() => handleMoveItem(item.id, 1)} className="p-0.5 hover:text-blue-600 text-gray-300" title="เลื่อนลง"><ArrowDown size={11}/></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className={`bg-white border border-gray-200 rounded-lg shadow-sm flex-1 ${activeMobileTab === 'spec' ? 'block' : 'hidden lg:block'}`}>
                            <div className="bg-gray-50 px-6 py-3.5 border-b border-gray-200 flex justify-between items-center">
                                <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                    {editingItemId ? <Edit size={18} className="text-orange-500"/> : <Plus size={18} className="text-blue-600"/>} 
                                    {editingItemId ? 'แก้ไขรายการสินค้า' : 'เพิ่มสินค้าและบริการใหม่'}
                                </h2>
                                {editingItemId && <button onClick={() => { setEditingItemId(null); setCurrentItem({...initialItemState}); }} className="text-xs text-red-500 hover:underline">ยกเลิกแก้ไข</button>}
                            </div>
                            <div className="p-6 grid gap-6 text-sm">
                                <section className="border rounded-lg bg-white">
                                    <div className="bg-blue-50/50 px-4 py-2 border-b text-xs font-bold text-blue-800 flex items-center gap-2 rounded-t-lg"><Layers size={14}/> สเปกสินค้า</div>
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="label">ประเภท</label>
                                            <select 
                                                className="std-input w-full" 
                                                value={currentItem.curtainType} 
                                                onChange={e=> { 
                                                    const newVal = e.target.value; 
                                                    setCurrentItem(prev => ({
                                                        ...prev, 
                                                        curtainType: newVal, 
                                                        isOntopFabric: newVal!=='อื่นๆ', 
                                                        isOntopSew: newVal!=='อื่นๆ', 
                                                        isOntopRail: newVal!=='อื่นๆ', 
                                                        isOntopAcc: newVal!=='อื่นๆ', 
                                                        discFabric: newVal==='อื่นๆ'?0:prev.discFabric, 
                                                        discSew: newVal==='อื่นๆ'?0:prev.discSew, 
                                                        discRail: newVal==='อื่นๆ'?0:prev.discRail, 
                                                        discAcc: newVal==='อื่นๆ'?0:prev.discAcc 
                                                    })); 
                                                }}
                                            >
                                                <option value="ทึบ">ม่านทึบ</option>
                                                <option value="โปร่ง">ม่านโปร่ง</option>
                                                <option value="อื่นๆ">อื่นๆ</option>
                                            </select>
                                        </div>
                                        {currentItem.curtainType === 'อื่นๆ' ? (
                                            <>
                                                <div className="col-span-2">
                                                    <label className="label">รายการค่าใช้จ่าย</label>
                                                    <select 
                                                        className="std-input w-full" 
                                                        value={currentItem.otherExpenseType} 
                                                        onChange={e=> { 
                                                            const type = e.target.value; 
                                                            const exp = OTHER_EXPENSES.find(x => x.id === type); 
                                                            setCurrentItem({...currentItem, otherExpenseType: type, customPrice: exp?.fixed ? exp.price : 0, customNote: ''}); 
                                                        }}
                                                    >
                                                        <option value="">-- เลือกรายการ --</option>
                                                        {OTHER_EXPENSES.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                                                    </select>
                                                </div>
                                                {currentItem.otherExpenseType && OTHER_EXPENSES.find(e=>e.id===currentItem.otherExpenseType)?.hasInput && (
                                                    <div>
                                                        <label className="label">ระบุรายละเอียด</label>
                                                        <input 
                                                            className="std-input w-full" 
                                                            value={currentItem.customNote} 
                                                            onChange={e=>setCurrentItem({...currentItem, customNote: e.target.value})} 
                                                            placeholder="ระบุเพิ่มเติม..."
                                                        />
                                                    </div>
                                                )}
                                                <div>
                                                    <label className="label">ราคาต่อหน่วย</label>
                                                    <input 
                                                        type="number" 
                                                        className="std-input w-full bg-white" 
                                                        value={currentItem.customPrice ?? ''} 
                                                        onChange={e=>setCurrentItem({...currentItem, customPrice: e.target.value})} 
                                                        disabled={OTHER_EXPENSES.find(e=>e.id===currentItem.otherExpenseType)?.fixed}
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div>
                                                    <label className="label">รูปแบบ</label>
                                                    <select 
                                                        className="std-input w-full font-sans" 
                                                        value={currentItem.curtainStyle} 
                                                        onChange={e=>setCurrentItem({...currentItem, curtainStyle: e.target.value})}
                                                    >
                                                        {formulas.filter(f=>f.category!=='other').map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="label">เลือกผ้า/รุ่น</label>
                                                    <SearchableSelect options={fabricOptions} value={currentItem.fabricId} onChange={(e: any) => setCurrentItem({...currentItem, fabricId: e.target.value})} />
                                                </div>
                                                <div>
                                                    <label className="label">ระบุสี</label>
                                                    <input className="std-input w-full" placeholder="เช่น ครีม หนา" value={currentItem.color} onChange={e=>setCurrentItem({...currentItem, color: e.target.value})}/>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    {currentItem.curtainType !== 'อื่นๆ' && (
                                        <div className="px-4 pb-4">
                                            <label className="label">รูปแบบการคำนวณ (Grain)</label>
                                            <select className="std-input w-full text-xs font-sans bg-white border rounded" value={currentItem.calcStyle} onChange={e=>setCurrentItem({...currentItem, calcStyle: e.target.value})}>
                                                {CALCULATION_STYLES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </section>
                                {currentItem.curtainType !== 'อื่นๆ' && (
                                <>
                                    <section className="border rounded-lg bg-white">
                                        <div className="bg-blue-50/50 px-4 py-2 border-b text-xs font-bold text-blue-800 flex items-center gap-2 rounded-t-lg"><Scissors size={14}/> ขนาดและจำนวน</div>
                                        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                            <div>
                                                <label className="label">กว้าง (ซม.)</label>
                                                <input type="number" className="std-input w-full text-center bg-white" value={currentItem.railWidth ?? ''} onChange={e=>setCurrentItem({...currentItem, railWidth: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="label">สูง (ซม.)</label>
                                                <input type="number" className="std-input w-full text-center bg-white" value={currentItem.railHeight ?? ''} onChange={e=>setCurrentItem({...currentItem, railHeight: e.target.value})} />
                                            </div>
                                            <div>
                                                {!['roller', 'venetian'].includes(currentItem.curtainStyle) ? (
                                                    <>
                                                        <label className="label">จำนวนผืน/ช่อง</label>
                                                        <div className="flex bg-gray-100 rounded p-1 border">
                                                            {[1,2].map(n => <button key={n} onClick={()=>setCurrentItem({...currentItem, panels: n})} className={`flex-1 text-[11px] rounded py-1 transition-all ${currentItem.panels===n ? 'bg-white shadow text-blue-800 font-bold' : 'text-gray-500'}`}>{n}</button>)}
                                                        </div>
                                                    </>
                                                ) : <div className="text-[11px] text-gray-400 pt-7 text-center">- ไร้รอยต่อ -</div>}
                                            </div>
                                            <div>
                                                <label className="label">จำนวนชุด</label>
                                                <input type="number" className="std-input w-full text-center font-bold text-blue-800 bg-white" value={currentItem.quantity ?? ''} onChange={e=>setCurrentItem({...currentItem, quantity: e.target.value})} />
                                            </div>
                                        </div>
                                        {['pleated', 'wave', 'wave_tape'].includes(currentItem.curtainStyle) && (
                                            <div className="px-4 pb-4">
                                                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600"><input type="checkbox" checked={currentItem.sideReturn} onChange={e=>setCurrentItem({...currentItem, sideReturn: e.target.checked})}/> เพิ่มเผื่ออ้อมข้างผนัง (+8 ซม./ผืน)</label>
                                            </div>
                                        )}
                                    </section>
                                    <section className="border rounded-lg bg-white">
                                        <div className="bg-blue-50/50 px-4 py-2 border-b text-xs font-bold text-blue-800 flex items-center gap-2 rounded-t-lg"><Package size={14}/> อุปกรณ์เสริม</div>
                                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="label">รางม่านสเปก</label>
                                                <SearchableSelect options={railOptions} value={currentItem.railAccessoryId} onChange={(e: any) => setCurrentItem({...currentItem, railAccessoryId: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="label">ส่วนประกอบเสริมอื่นๆ</label>
                                                <div className="border border-gray-200 rounded bg-gray-50 h-32 overflow-y-auto p-2 text-xs">
                                                    {db.accs.filter((a: any) => checkCondition(a.condition, currentItem.curtainStyle)).map((acc: any) => { 
                                                        const isSelected = currentItem.extraAccessories.some(x => x.id === acc.id); 
                                                        const currentQty = currentItem.extraAccessories.find(x => x.id === acc.id)?.qty || 1; 
                                                        return (
                                                            <div key={acc.id} className="flex items-center justify-between mb-2">
                                                                <label className="flex items-center gap-2 cursor-pointer flex-1 text-xs">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={isSelected} 
                                                                        className="rounded text-theme-main focus:ring-blue-500"
                                                                        onChange={(e) => { 
                                                                            const newAccs = e.target.checked ? [...currentItem.extraAccessories, { id: acc.id, qty: 1 }] : currentItem.extraAccessories.filter(x => x.id !== acc.id); 
                                                                            setCurrentItem({ ...currentItem, extraAccessories: newAccs }); 
                                                                        }}
                                                                    />
                                                                    <span>{acc.name} ({acc.price} บาท)</span>
                                                                </label>
                                                                {isSelected && <input type="number" min="1" className="w-12 p-1 text-center border rounded text-[11px] bg-white text-gray-800" value={currentQty ?? ''} onChange={(e) => { const newAccs = currentItem.extraAccessories.map(x => x.id === acc.id ? { ...x, qty: e.target.value } : x); setCurrentItem({ ...currentItem, extraAccessories: newAccs }); }}/>}
                                                            </div>
                                                        ); 
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </>
                                )}

                                <section className="border rounded-lg bg-white">
                                    <div className="bg-blue-50/50 px-4 py-2 border-b text-xs font-bold text-blue-800 flex items-center gap-2 rounded-t-lg"><Percent size={14}/> ส่วนลดรายหน่วย %</div>
                                    <div className="p-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                                        {currentItem.curtainType !== 'อื่นๆ' && (
                                            <>
                                                <div><label className="label">ส่วนลดผ้า (%)</label><input type="number" className="std-input w-full text-red-600 font-bold bg-white font-mono" value={currentItem.discFabric ?? ''} onChange={e=>setCurrentItem({...currentItem, discFabric: e.target.value})}/></div>
                                                <div><label className="label">ส่วนลดเย็บ (%)</label><input type="number" className="std-input w-full text-red-600 font-bold bg-white font-mono" value={currentItem.discSew ?? ''} onChange={e=>setCurrentItem({...currentItem, discSew: e.target.value})}/></div>
                                                <div><label className="label">ส่วนลดราง (%)</label><input type="number" className="std-input w-full text-red-600 font-bold bg-white font-mono" value={currentItem.discRail ?? ''} onChange={e=>setCurrentItem({...currentItem, discRail: e.target.value})}/></div>
                                                <div><label className="label">ส่วนลดอุปกรณ์ (%)</label><input type="number" className="std-input w-full text-red-600 font-bold bg-white font-mono" value={currentItem.discAcc ?? ''} onChange={e=>setCurrentItem({...currentItem, discAcc: e.target.value})}/></div>
                                            </>
                                        )}
                                        {currentItem.curtainType === 'อื่นๆ' && (
                                            <>
                                                <div className="col-span-2 md:col-span-4"><label className="label">ปริมาณ (รายการ)</label><input type="number" className="std-input w-full text-center font-bold text-blue-800 bg-white" value={currentItem.quantity ?? ''} onChange={e=>setCurrentItem({...currentItem, quantity: e.target.value})} /></div>
                                                {currentItem.otherExpenseType === 'other' && (
                                                    <div><label className="label">ส่วนลดพิเศษ (%)</label><input type="number" className="std-input w-full text-red-600 font-bold bg-white font-mono" value={currentItem.customDiscount ?? ''} onChange={e=>setCurrentItem({...currentItem, customDiscount: e.target.value})}/></div>
                                                )}
                                            </>
                                        )}
                                        <div className="col-span-2 md:col-span-5 flex flex-wrap gap-4 pt-2">
                                            <span className="text-xs font-bold text-blue-800 flex items-center">เข้าร่วม On-Top:</span>
                                            <label className="flex items-center gap-1 cursor-pointer text-xs text-gray-600">
                                                <input type="checkbox" checked={currentItem.isOntopFabric} onChange={e=>setCurrentItem({...currentItem, isOntopFabric: e.target.checked})} disabled={currentItem.curtainType==='อื่นๆ' && currentItem.otherExpenseType!=='other'}/> ผ้า/ค่าบริการ
                                            </label>
                                            {currentItem.curtainType !== 'อื่นๆ' && (
                                                <>
                                                    <label className="flex items-center gap-1 cursor-pointer text-xs text-gray-600"><input type="checkbox" checked={currentItem.isOntopSew} onChange={e=>setCurrentItem({...currentItem, isOntopSew: e.target.checked})} /> ตัดเย็บ</label>
                                                    <label className="flex items-center gap-1 cursor-pointer text-xs text-gray-600"><input type="checkbox" checked={currentItem.isOntopRail} onChange={e=>setCurrentItem({...currentItem, isOntopRail: e.target.checked})} /> ราง</label>
                                                    <label className="flex items-center gap-1 cursor-pointer text-xs text-gray-600"><input type="checkbox" checked={currentItem.isOntopAcc} onChange={e=>setCurrentItem({...currentItem, isOntopAcc: e.target.checked})} /> อุปกรณ์</label>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {computedResult && currentItem.curtainType !== 'อื่นๆ' && !['roller', 'venetian'].includes(currentItem.curtainStyle) && (
                                        <div className="bg-gray-100 p-3 mx-4 mb-4 rounded border text-[11px] text-gray-500 grid grid-cols-2 md:grid-cols-4 gap-2">
                                            <div><span className="font-bold">ขนาดผ้า/ผืน:</span> {computedResult.curtainWidthPerPanel} ซม.</div>
                                            <div><span className="font-bold">หน้าผ้าลายขวาง:</span> {computedResult.numCuts} หน้า</div>
                                            {computedResult.repeats > 0 && <div><span className="font-bold">ลายซ้ำ (Repeat):</span> {computedResult.repeats}</div>}
                                            <div className="text-blue-700 font-bold"><span>ผ้าสุทธิ:</span> {computedResult.usage} หลา</div>
                                        </div>
                                    )}
                                    <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-between items-center gap-4">
                                        <div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">ราคาสุทธิ (รวมราคาตัดเย็บ + อุปกรณ์ และส่วนลดแล้ว)</div>
                                            <div className="text-2xl font-bold text-blue-700">{computedResult?.grandTotal.toLocaleString()} <span className="text-sm text-gray-500 font-normal">บาท</span></div>
                                        </div>
                                        <button onClick={handleSaveItem} className="px-8 py-2 md:py-3 bg-green-600 hover:bg-green-700 transition-all rounded-lg text-white font-bold flex items-center gap-2 shadow-sm text-sm"><Save className="w-4 h-4"/> {editingItemId ? 'บันทึกแก้ไขรายการ' : 'เพิ่มลงในห้องนี้'}</button>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>

        {/* Mobile Bottom Navigation Menu Bar for Editor */}
        <div className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-45 bg-white/95 backdrop-blur border-t flex flex-row justify-around py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] max-w-[1920px] mx-auto pb-safe">
            <button 
                onClick={() => setActiveMobileTab('area')}
                className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${activeMobileTab === 'area' ? 'theme-text-action font-bold' : 'text-gray-400'}`}
            >
                <MapPin size={20}/>
                <span className="text-[10px] font-sans">1. เลือกพื้นที่</span>
            </button>
            <button 
                onClick={() => setActiveMobileTab('spec')}
                className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${activeMobileTab === 'spec' ? 'theme-text-action font-bold' : 'text-gray-400'}`}
            >
                <Ruler size={20}/>
                <span className="text-[10px] font-sans">2. คำนวณสเปก</span>
            </button>
            <button 
                onClick={() => setActiveMobileTab('items')}
                className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${activeMobileTab === 'items' ? 'theme-text-action font-bold' : 'text-gray-400'}`}
            >
                <div className="relative">
                    <LayoutGrid size={20}/>
                    {itemsInCurrentRoom.length > 0 && (
                        <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full leading-none font-sans">{itemsInCurrentRoom.length}</span>
                    )}
                </div>
                <span className="text-[10px] font-sans">3. สินค้าห้องนี้</span>
            </button>
            <button 
                onClick={() => setAppState('summary')}
                className="flex flex-col items-center justify-center gap-1 text-yellow-600 cursor-pointer"
            >
                <FileText size={20}/>
                <span className="text-[10px] font-bold text-yellow-700 font-sans">4. สรุป/ใบเสนอราคา</span>
            </button>
        </div>
        </>
      )}

      {/* --- Overlay Modals --- */}
      {deleteConfirm && (
        <Modal title={deleteConfirm.title} onClose={() => setDeleteConfirm(null)}>
          <div className="py-2 text-sm font-sans flex flex-col gap-4">
            <p className="text-gray-650 leading-relaxed text-sm">{deleteConfirm.message}</p>
            <div className="flex justify-end gap-2 text-xs">
              <button 
                onClick={() => setDeleteConfirm(null)} 
                className="px-4 py-2 border rounded border-gray-200 text-gray-500 font-semibold hover:bg-gray-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button 
                onClick={() => {
                  deleteConfirm.onConfirm();
                  setDeleteConfirm(null);
                }} 
                className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 shadow-sm cursor-pointer"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </Modal>
      )}
      {modal === 'database' && isAdmin && ( <Modal title="จัดการฐานข้อมูล (Admin)" onClose={()=>setModal(null)} maxWidth="max-w-4xl"><DatabaseEditor db={db} setDb={setDb} formulas={formulas} onSave={handleManualSaveDB} initialDb={INITIAL_DB}/></Modal> )}
      {modal === 'staff_manager' && isAdmin && ( <Modal title="จัดการพนักงาน (Admin)" onClose={()=>setModal(null)}><StaffManager staffList={staffList} setStaffList={setStaffList} onSave={handleUpdateStaff} adminId={ADMIN_ID}/></Modal> )}
      {modal === 'formulas' && isAdmin && ( <Modal title="จัดการสูตรคำนวณ (Admin)" onClose={()=>setModal(null)}><FormulaManager formulas={formulas} setFormulas={setFormulas} onSave={handleUpdateFormulas}/></Modal> )}
      {modal === 'theme' && isAdmin && ( <Modal title="จัดการสี/ธีม (Admin)" onClose={()=>setModal(null)}><ThemeManager theme={theme} setTheme={setTheme} onSave={handleUpdateTheme}/></Modal> )}
      {modal === 'cloud_save' && ( <Modal title="บันทึกข้อมูลออนไลน์" onClose={()=>setModal(null)}><div className="text-center py-6 font-sans"><div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-theme-main"><Cloud size={32}/></div><h3 className="text-lg font-bold mb-2">ตกลงบันทึกส่งข้อมูลขึ้นคลาวด์?</h3><p className="text-xs text-gray-500 mb-6 font-medium">ข้อมูลทั้งหมดจะถูกซิงค์เพื่อเปิดใช้งานในทุกๆ เครื่อง</p><button onClick={handleSaveToCloud} className="w-full bg-blue-750 text-white py-2.5 rounded-xl font-bold shadow-md hover:bg-blue-800 transition-colors">ตกลง บันทึกข้อมูลคลาวด์</button></div></Modal> )}
      {modal === 'add_house' && ( <Modal title="เพิ่มหลัง/บ้านใหม่" onClose={()=>setModal(null)}><input autoFocus className="w-full p-2 border rounded mb-4 text-sm font-sans" placeholder="ระบุเลขที่บ้านหรือรหัสหน้างาน..." value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmAddHouse()}/><div className="flex justify-end gap-2 text-xs"><button onClick={()=>setModal(null)} className="px-4 py-2 text-gray-500 font-medium">ยกเลิก</button><button onClick={confirmAddHouse} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">ตกลง</button></div></Modal> )}
      {modal === 'add_room' && ( <Modal title="เพิ่มห้องใหม่" onClose={()=>setModal(null)}><input autoFocus className="w-full p-2 border rounded mb-4 text-sm font-sans" placeholder="ระบุชื่อห้อง (เช่น ห้องรับแขก)..." value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmAddRoom()}/><div className="flex justify-end gap-2 text-xs"><button onClick={()=>setModal(null)} className="px-4 py-2 text-gray-500 font-medium">ยกเลิก</button><button onClick={confirmAddRoom} className="px-4 py-2 bg-green-600 text-white rounded font-bold">ตกลง</button></div></Modal> )}
      {modal === 'edit_name' && editTarget && (
        <Modal title={editTarget.type === 'house' ? 'แก้ไขชื่อโครงการ_บ้าน' : 'แก้ไขชื่อห้อง'} onClose={()=>{setModal(null); setEditTarget(null);}}>
            <input 
                autoFocus 
                className="w-full p-2 border rounded mb-4 text-sm font-sans" 
                value={inputText} 
                onChange={e => setInputText(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && confirmEditName()}
            />
            <div className="flex justify-end gap-2 text-xs">
                <button onClick={()=>{setModal(null); setEditTarget(null);}} className="px-4 py-2 text-gray-500 font-medium">ยกเลิก</button>
                <button onClick={confirmEditName} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">บันทึก</button>
            </div>
        </Modal>
      )}
    </div>
  );
}
