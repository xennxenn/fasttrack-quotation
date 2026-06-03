import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Calculator, LogOut, Search, Users, Ruler, Palette, Database, Loader, Settings } from 'lucide-react';
import { collection, deleteDoc, doc, query, onSnapshot, getFirestore, where, orderBy, limit } from 'firebase/firestore';
import { Staff } from '../types';
import { Modal } from './Common';
import { safeLocalStorageSetItem } from '../utils';

interface DashboardProps {
    user: any;
    staff: Staff;
    onLoadQuote: (quote: any) => void;
    onCreateQuote: () => void;
    onLogout: () => void;
    isAdmin: boolean;
    setModal: (m: string | null) => void;
    staffList: Staff[];
    firestore: any;
    appId: string;
}

const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    try {
        const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('th-TH');
    } catch (e) { return '-'; }
};

export const Dashboard = ({ 
    user, 
    staff, 
    onLoadQuote, 
    onCreateQuote, 
    onLogout, 
    isAdmin, 
    setModal, 
    staffList, 
    firestore, 
    appId 
}: DashboardProps) => {
    const [quotes, setQuotes] = useState<any[]>(() => {
        try {
            const saved = localStorage.getItem('cached_quotes');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    const [status, setStatus] = useState(() => {
        try {
            const saved = localStorage.getItem('cached_quotes');
            return (saved && JSON.parse(saved).length > 0) ? 'ready' : 'loading';
        } catch { return 'loading'; }
    });
    const [isSynced, setIsSynced] = useState(false);
    const [sortBy, setSortBy] = useState('newest');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStaff, setFilterStaff] = useState('all');
    const [adminMenuOpen, setAdminMenuOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    useEffect(() => { 
        if(!firestore) {
            setStatus('no-config'); 
            return;
        } 
        
        let unsubscribe = () => {};

        const setupListener = () => {
            // Under high volumes, querying the entire database causes extreme slowdowns on low-end mobiles.
            // We use standard limit clauses which do not trigger secondary indexing failures on Firestore-side.
            let q;
            if (!isAdmin && staff?.id) {
                // Fetch the 300 latest quotes owned by this staff member (safe, clean, doesn't need custom index)
                q = query(
                    collection(firestore, 'artifacts', appId, 'public', 'data', 'quotations'),
                    where('staffId', '==', staff.id),
                    limit(300)
                );
            } else {
                // Admins fetch the top 500 overall latest quotes sorted by newest (uses single-field updatedAt index)
                q = query(
                    collection(firestore, 'artifacts', appId, 'public', 'data', 'quotations'),
                    orderBy('updatedAt', 'desc'),
                    limit(500)
                );
            }

            unsubscribe = onSnapshot(q, (snapshot) => {
                let loadedQuotes = snapshot.docs.map(d => ({id: d.id, ...d.data()}) as any);
                
                // Client-side filtering as an extra safety layer
                if (!isAdmin) {
                    loadedQuotes = loadedQuotes.filter(q => q.staffId === staff?.id);
                }
                
                setQuotes(loadedQuotes); 
                safeLocalStorageSetItem('cached_quotes', JSON.stringify(loadedQuotes));
                setStatus('ready'); 
                setIsSynced(true);
            }, (error) => {
                console.error("Quotes snapshot load error:", error);
                setStatus('ready');
                setIsSynced(true);
            });
        };

        if (user) {
            setupListener();
        } else {
            // Setup a fallback timeout so if auth/firestore is slow/offline,
            // we don't lock the UI on "loading..." forever.
            const t = setTimeout(() => {
                setStatus('ready');
            }, 1500);
            return () => {
                clearTimeout(t);
                unsubscribe();
            };
        }
        
        return () => unsubscribe();
    }, [user, staff, isAdmin, firestore, appId]);
    
    const handleDeleteQuote = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteConfirmId(id);
    };

    const sortedQuotes = useMemo(() => {
        let res = [...quotes];

        // Filter by Staff (Admin only)
        if (isAdmin && filterStaff !== 'all') {
            res = res.filter(q => q.staffId === filterStaff);
        }

        // Filter by Search Query
        if (searchQuery) {
            const term = searchQuery.toLowerCase();
            res = res.filter(q => 
                (q.customer?.name || '').toLowerCase().includes(term) ||
                (q.customer?.phone || '').toLowerCase().includes(term)
            );
        }

        // Sort
        if (sortBy === 'newest') res.sort((a,b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
        if (sortBy === 'oldest') res.sort((a,b) => (a.updatedAt?.seconds || 0) - (b.updatedAt?.seconds || 0));
        if (sortBy === 'name') res.sort((a,b) => (a.customer?.name||'').localeCompare(b.customer?.name||''));
        if (sortBy === 'staff') res.sort((a,b) => (a.staff?.name||'').localeCompare(b.staff?.name||''));
        return res;
    }, [quotes, sortBy, searchQuery, isAdmin, filterStaff]);

    if(status === 'no-config') {
        return <div className="min-h-screen flex items-center justify-center p-8 text-red-500 font-bold font-sans">ไม่พบการตั้งค่า Firebase</div>;
    }

    return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <nav className="theme-bg-main text-white px-4 md:px-6 py-3.5 flex justify-between items-center shadow-md select-none no-print">
            <div className="flex items-center gap-2 md:gap-3">
                <div className="bg-white/10 p-1.5 md:p-2 rounded"><Calculator size={18} className="md:w-5 md:h-5"/></div>
                <h1 className="font-bold text-sm sm:text-base md:text-lg leading-tight truncate max-w-[130px] sm:max-w-none">Fast Track <span className="hidden sm:inline">Quotation</span></h1>
            </div>
            <div className="flex items-center gap-1.5 md:gap-3">
                <span className="text-xs md:text-sm bg-white/10 px-2 md:px-3 py-1 rounded truncate max-w-[90px] sm:max-w-none">{staff?.name}</span>
                {isAdmin && (
                    <div className="relative">
                        {/* Desktop Mode (horizontal bar) */}
                        <div className="hidden lg:flex items-center gap-1 bg-white/5 rounded-full px-1">
                            <button onClick={()=>setModal('staff_manager')} className="p-2 hover:bg-white/10 rounded-full transition-all text-orange-300" title="พนักงาน"><Users size={18}/></button>
                            <button onClick={()=>setModal('formulas')} className="p-2 hover:bg-white/10 rounded-full transition-all text-green-300" title="สูตรคำนวณ"><Ruler size={18}/></button>
                            <button onClick={()=>setModal('theme')} className="p-2 hover:bg-white/10 rounded-full transition-all text-pink-300" title="สี/ธีม"><Palette size={18}/></button>
                            <button onClick={()=>setModal('database')} className="p-2 hover:bg-white/10 rounded-full transition-all text-yellow-300" title="ฐานข้อมูล"><Database size={18}/></button>
                        </div>
                        {/* Mobile Mode (settings icon dropdown) */}
                        <div className="lg:hidden relative">
                            <button 
                                onClick={() => setAdminMenuOpen(!adminMenuOpen)} 
                                className={`p-1.5 hover:bg-white/10 rounded-full transition-all text-orange-200 ${adminMenuOpen ? 'bg-white/20' : ''}`}
                                title="แอดมินเซ็ตติ้ง"
                            >
                                <Settings size={18}/>
                            </button>
                            {adminMenuOpen && (
                                <div className="absolute right-0 mt-2 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-2 flex flex-col gap-1.5 z-[100] w-40 text-white">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 border-b border-slate-800 text-center">เมนูผู้ดูแล (Admin)</div>
                                    <button onClick={() => { setModal('staff_manager'); setAdminMenuOpen(false); }} className="w-full flex items-center gap-2 px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-white/10 text-orange-300 text-left transition-colors cursor-pointer border-none bg-transparent">
                                        <Users size={14}/> พนักงาน
                                    </button>
                                    <button onClick={() => { setModal('formulas'); setAdminMenuOpen(false); }} className="w-full flex items-center gap-2 px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-white/10 text-green-300 text-left transition-colors cursor-pointer border-none bg-transparent">
                                        <Ruler size={14}/> สูตรคำนวณ
                                    </button>
                                    <button onClick={() => { setModal('theme'); setAdminMenuOpen(false); }} className="w-full flex items-center gap-2 px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-white/10 text-pink-300 text-left transition-colors cursor-pointer border-none bg-transparent">
                                        <Palette size={14}/> สี/ธีมระบบ
                                    </button>
                                    <button onClick={() => { setModal('database'); setAdminMenuOpen(false); }} className="w-full flex items-center gap-2 px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-white/10 text-yellow-300 text-left transition-colors cursor-pointer border-none bg-transparent">
                                        <Database size={14}/> ฐานข้อมูล
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <button onClick={onLogout} className="p-1.5 hover:bg-red-500 rounded text-red-200" title="ออกจากระบบ"><LogOut size={18}/></button>
            </div>
        </nav>
        <div className="p-4 md:p-8 max-w-6xl mx-auto w-full flex-1">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 self-start md:self-auto">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800">รายการใบเสนอราคา</h2>
                    {isSynced ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200 w-fit select-none font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            ซิงค์เรียลไทม์ล่าสุด
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200 animate-pulse w-fit select-none font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            กำลังอัปเดตข้อมูล...
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap md:flex-nowrap gap-2 w-full md:w-auto items-center">
                    <div className="relative flex-1 min-w-[140px] md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="ค้นหาลูกค้า/เบอร์โทร..." 
                            className="pl-9 pr-3 py-2 border rounded text-xs md:text-sm w-full outline-none bg-white font-sans focus:ring-1 focus:ring-blue-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {isAdmin && (
                        <select className="border rounded px-2 md:px-3 py-2 text-xs md:text-sm bg-white font-sans flex-1 md:flex-initial" value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)}>
                            <option value="all">พนักงานทั้งหมด</option>
                            {staffList?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    )}
                    <select className="border rounded px-2 md:px-3 py-2 text-xs md:text-sm bg-white font-sans flex-1 md:flex-initial" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="newest">ล่าสุด</option>
                        <option value="oldest">เก่าสุด</option>
                        <option value="name">ชื่อลูกค้า</option>
                        {isAdmin && <option value="staff">ชื่อพนักงาน</option>}
                    </select>
                    <button onClick={onCreateQuote} className="bg-orange-600 hover:bg-orange-700 text-white px-3 md:px-6 py-2 rounded-lg font-bold flex gap-1.5 whitespace-nowrap shadow transition-colors text-xs md:text-sm w-full md:w-auto justify-center"><Plus size={16}/> สร้างลูกค้าใหม่</button>
                </div>
            </div>

            {status === 'loading' && quotes.length === 0 ? (
                <div className="text-center py-20 text-gray-400 flex flex-col items-center justify-center gap-3">
                    <Loader className="animate-spin text-blue-600" size={32}/>
                    <span>กำลังโหลดข้อมูลในระบบ...</span>
                </div>
            ) : (
                <>
                    {sortedQuotes.length === 0 ? (
                        <div className="bg-white border text-center p-16 rounded-xl text-gray-400">ชื่อลูกค้าหรือรายการใบเสนอราคาไม่พบ กรุณากดปุ่ม "สร้างลูกค้าใหม่"</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {sortedQuotes.map(q => (
                                <div key={q.id} onClick={()=>onLoadQuote(q)} className="bg-white p-5 rounded-xl shadow-sm border hover:shadow-md cursor-pointer relative group transition-all">
                                    <div className="flex justify-between items-start">
                                        <div className="font-bold text-lg mb-1 truncate w-48 text-gray-800" title={q.customer?.name}>{q.customer?.name || 'ไม่ระบุชื่อ'}</div>
                                        <button onClick={(e) => handleDeleteQuote(q.id, e)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                    </div>
                                    <div className="text-xs text-gray-400 mb-2 flex justify-between">
                                        <span>{formatDate(q.createdAt)}</span>
                                        {q.updatedAt && q.updatedAt.seconds !== q.createdAt?.seconds && (
                                            <span className="text-[10px] text-gray-300 ml-1">(แก้ไข: {formatDate(q.updatedAt)})</span>
                                        )}
                                        {isAdmin && <span className="text-blue-500 font-medium ml-auto">{q.staff?.name}</span>}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-2">{q.items?.length||0} รายการสินค้า</div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {deleteConfirmId && (
                <Modal title="ยืนยันการลบลูกค้า" onClose={() => setDeleteConfirmId(null)}>
                    <div className="py-2 text-sm font-sans flex flex-col gap-4">
                        <p className="text-gray-650 leading-relaxed text-sm">ต้องการลบข้อมูลลูกค้าและใบเสนอราคารายการนี้ใช่หรือไม่? การลบนี้ใช้ระบบคลาวด์และไม่สามารถกู้คืนกลับมาได้</p>
                        <div className="flex justify-end gap-2 text-xs">
                            <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 border rounded border-gray-200 text-gray-500 font-semibold hover:bg-gray-50 cursor-pointer">
                                ยกเลิก
                            </button>
                            <button 
                                onClick={async () => {
                                    const id = deleteConfirmId;
                                    setDeleteConfirmId(null);
                                    try {
                                        await deleteDoc(doc(firestore, 'artifacts', appId, 'public', 'data', 'quotations', id));
                                        setQuotes(prev => prev.filter(q => q.id !== id));
                                        try {
                                            const filtered = quotes.filter(q => q.id !== id);
                                            safeLocalStorageSetItem('cached_quotes', JSON.stringify(filtered));
                                        } catch (err) {}
                                    } catch (err: any) {
                                        alert("ลบไม่สำเร็จ: " + err.message);
                                    }
                                }} 
                                className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 shadow-sm cursor-pointer"
                            >
                                ยืนยันลบ
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    </div>
    );
};
