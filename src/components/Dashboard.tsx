import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Calculator, LogOut, Search, Users, Ruler, Palette, Database, Loader } from 'lucide-react';
import { collection, deleteDoc, doc, query, onSnapshot, getFirestore } from 'firebase/firestore';
import { Staff } from '../types';

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
    const [status, setStatus] = useState('loading');
    const [sortBy, setSortBy] = useState('newest');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStaff, setFilterStaff] = useState('all');

    useEffect(() => { 
        if(!firestore) {
            setStatus('no-config'); 
            return;
        } 
        
        let unsubscribe = () => {};

        const setupListener = () => {
            const q = query(collection(firestore, 'artifacts', appId, 'public', 'data', 'quotations')); 
            unsubscribe = onSnapshot(q, (snapshot) => {
                let loadedQuotes = snapshot.docs.map(d => ({id: d.id, ...d.data()}) as any);
                
                // Client-side filtering to avoid index requirements
                if (!isAdmin) {
                    loadedQuotes = loadedQuotes.filter(q => q.staffId === staff?.id);
                }
                
                setQuotes(loadedQuotes); 
                localStorage.setItem('cached_quotes', JSON.stringify(loadedQuotes));
                setStatus('ready'); 
            }, (error) => {
                console.error("Quotes snapshot load error:", error);
                setStatus('ready');
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
    
    const handleDeleteQuote = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if(!confirm("ต้องการลบข้อมูลลูกค้านี้ใช่หรือไม่?")) return;
        try {
            await deleteDoc(doc(firestore, 'artifacts', appId, 'public', 'data', 'quotations', id));
            setQuotes(prev => prev.filter(q => q.id !== id));
            try {
                const filtered = quotes.filter(q => q.id !== id);
                localStorage.setItem('cached_quotes', JSON.stringify(filtered));
            } catch (err) {}
        } catch (err: any) {
            alert("ลบไม่สำเร็จ: " + err.message);
        }
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
        <nav className="theme-bg-main text-white px-6 py-4 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded"><Calculator/></div>
                <h1 className="font-bold text-lg leading-tight">Fast Track Quotation</h1>
            </div>
            <div className="flex items-center gap-3">
                <span className="text-sm bg-white/10 px-3 py-1 rounded">{staff?.name}</span>
                {isAdmin && (
                    <>
                        <button onClick={()=>setModal('staff_manager')} className="p-1 hover:bg-white/15 rounded text-orange-200" title="พนักงาน"><Users size={20}/></button>
                        <button onClick={()=>setModal('formulas')} className="p-1 hover:bg-white/15 rounded text-green-200" title="สูตรคำนวณ"><Ruler size={20}/></button>
                        <button onClick={()=>setModal('theme')} className="p-1 hover:bg-white/15 rounded text-pink-200" title="สี/ธีม"><Palette size={20}/></button>
                        <button onClick={()=>setModal('database')} className="p-1 hover:bg-white/15 rounded text-yellow-200" title="ฐานข้อมูล"><Database size={20}/></button>
                    </>
                )}
                <button onClick={onLogout} className="p-1 hover:bg-red-500 rounded text-red-200" title="ออกจากระบบ"><LogOut size={20}/></button>
            </div>
        </nav>
        <div className="p-8 max-w-6xl mx-auto w-full flex-1">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">รายการใบเสนอราคา</h2>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="ค้นหาลูกค้า/เบอร์โทร..." 
                            className="pl-9 pr-3 py-2 border rounded text-sm w-full outline-none bg-white font-sans focus:ring-1 focus:ring-blue-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {isAdmin && (
                        <select className="border rounded px-3 py-2 text-sm bg-white font-sans" value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)}>
                            <option value="all">พนักงานทั้งหมด</option>
                            {staffList?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    )}
                    <select className="border rounded px-3 py-2 text-sm bg-white font-sans" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="newest">ล่าสุด</option>
                        <option value="oldest">เก่าสุด</option>
                        <option value="name">ชื่อลูกค้า</option>
                        {isAdmin && <option value="staff">ชื่อพนักงาน</option>}
                    </select>
                    <button onClick={onCreateQuote} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-bold flex gap-2 whitespace-nowrap shadow transition-colors"><Plus/> สร้างลูกค้าใหม่</button>
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
        </div>
    </div>
    );
};
