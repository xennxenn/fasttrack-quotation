import React, { useState } from 'react';
import { Trash2, Save, Upload, RefreshCw, ArrowUp, ArrowDown, Info, CheckSquare, Users, Ruler, Palette, Database, Plus, Search } from 'lucide-react';
import { ConditionSelector } from './Common';
import { Formula, Staff } from '../types';
import { safeLocalStorageSetItem, normalizeCurtainType } from '../utils';

export const ThemeManager = ({ theme, setTheme, onSave }: any) => { 
    const [localTheme, setLocalTheme] = useState(theme);
    const handleChange = (key: string, val: string) => setLocalTheme((prev: any) => ({ ...prev, [key]: val })); 
    const resetTheme = () => setLocalTheme({ main: '#1e3a8a', action: '#2563eb', success: '#16a34a', bg: '#f9fafb' }); 
    return (
        <div className="space-y-6">
            <div className="bg-yellow-50 text-yellow-800 p-3 rounded text-sm mb-4 border border-yellow-200">
                <Info size={16} className="inline mr-1"/> เปลี่ยนสีของระบบ
            </div>
            <div className="grid grid-cols-2 gap-4">
                {Object.entries(localTheme).map(([key, val]: any) => (
                    <div key={key}>
                        <label className="block text-sm font-bold text-gray-700 mb-1 capitalize">{key}</label>
                        <div className="flex gap-2">
                            <input type="color" value={val} onChange={e=>handleChange(key, e.target.value)} className="w-10 h-10 border rounded cursor-pointer"/>
                            <input type="text" value={val} onChange={e=>handleChange(key, e.target.value)} className="flex-1 border rounded px-2 text-sm"/>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-8 flex justify-between border-t pt-4">
                <button onClick={resetTheme} className="text-gray-500 hover:text-red-500 text-sm flex items-center gap-1">
                    <Trash2 size={14}/> รีเซ็ต
                </button>
                <button onClick={() => { setTheme(localTheme); onSave(localTheme); }} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700">บันทึก</button>
            </div>
        </div>
    ); 
};

export const FormulaManager = ({ formulas, setFormulas, onSave }: any) => { 
    const [localFormulas, setLocalFormulas] = useState(formulas);
    const updateFormula = (id: string, field: string, value: string) => { 
        setLocalFormulas(localFormulas.map((f: any) => f.id === id ? { ...f, [field]: parseFloat(value) || 0 } : f)); 
    }; 
    return (
        <div className="flex flex-col h-full">
            <div className="p-2 text-sm text-gray-500 bg-yellow-50 border border-yellow-200 rounded mb-4">
                <Info size={16} className="inline mr-1"/> ตั้งค่าสูตรคำนวณ
            </div>
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-gray-100 sticky top-0">
                        <tr>
                            <th className="p-2 border">ประเภท</th>
                            <th className="p-2 border w-16">Fullness</th>
                            <th className="p-2 border w-16">ริม(cm)</th>
                            <th className="p-2 border w-16">บนล่าง</th>
                            <th className="p-2 border w-20">ค่าตัดเย็บ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {localFormulas?.map((f: any) => (
                            <tr key={f.id} className="border-b hover:bg-gray-50">
                                <td className="p-2 font-bold text-gray-700">{f.label}</td>
                                <td className="p-2">
                                    <input type="number" step="0.1" className="w-full p-1 border rounded text-center" value={f.fullness} onChange={e=>updateFormula(f.id, 'fullness', e.target.value)} disabled={f.category==='blind' || f.category === 'other'}/>
                                </td>
                                <td className="p-2">
                                    <input type="number" className="w-full p-1 border rounded text-center" value={f.hemSide} onChange={e=>updateFormula(f.id, 'hemSide', e.target.value)} disabled={f.category==='blind' || f.category === 'other'}/>
                                </td>
                                <td className="p-2">
                                    <input type="number" className="w-full p-1 border rounded text-center" value={f.hemTopBot} onChange={e=>updateFormula(f.id, 'hemTopBot', e.target.value)} disabled={f.category==='blind' || f.category === 'other'}/>
                                </td>
                                <td className="p-2">
                                    <input type="number" className="w-full p-1 border rounded text-center" value={f.sewingPrice} onChange={e=>updateFormula(f.id, 'sewingPrice', e.target.value)} disabled={f.category==='blind' && f.id !== 'roman' && f.category !== 'other'}/>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 flex justify-end">
                <button onClick={() => { setFormulas(localFormulas); onSave(localFormulas); }} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700">บันทึก</button>
            </div>
        </div>
    ); 
};

export const DatabaseEditor = ({ db, setDb, formulas, onSave, initialDb }: any) => { 
    const [tab, setTab] = useState<'fabrics' | 'blinds' | 'venetians' | 'rails' | 'accs'>('fabrics'); 
    const [importText, setImportText] = useState(''); 
    const [searchTerm, setSearchTerm] = useState('');
    const [showImport, setShowImport] = useState(false);

    // Form state for creating a new item manually
    const [newItem, setNewItem] = useState({
        name: '',
        design: '',
        price: '',
        width: '150',
        yRepeat: '0',
        type: 'ทึบ',
        unit: 'เมตร',
        condition: 'all'
    });

    const patterns: any = {
        fabrics: "ชื่อ, ดีไซน์, ราคา, หน้ากว้าง(ซม.), Repeat, ประเภท(ทึบ/โปร่ง), เงื่อนไข (หรือย่อ: ชื่อ, ราคา, ประเภท)",
        blinds: "ชื่อ, ราคา, เงื่อนไข",
        venetians: "ชื่อ, ราคา, เงื่อนไข",
        rails: "ชื่อ, ราคา, หน่วย, เงื่อนไข",
        accs: "ชื่อ, ราคา, หน่วย, เงื่อนไข"
    };

    const handleFileUpload = (e: any) => { 
        const file = e.target.files[0]; 
        if (file) { 
            const reader = new FileReader(); 
            reader.onload = (evt: any) => setImportText(evt.target.result); 
            reader.readAsText(file); 
        } 
    }; 
    
    const handleReset = () => {
        if (confirm(`คุณแน่ใจหรือไม่ที่จะรีเซ็ตข้อมูล "${tab.toUpperCase()}" กลับเป็นค่าเริ่มต้น?\nข้อมูลที่คุณเพิ่มเองในหมวดนี้จะหายไปทั้งหมด!`)) {
            const defaultData = JSON.parse(JSON.stringify(initialDb[tab] || []));
            const updatedDb = { ...db, [tab]: defaultData };
            setDb(updatedDb);
            safeLocalStorageSetItem('cached_db', JSON.stringify(updatedDb));
        }
    };

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.name.trim()) {
            return alert('กรุณาระบุชื่อสินค้า/รายการ');
        }

        const id = `${tab.slice(0, 1)}_${Date.now()}`;
        const priceNum = parseFloat(newItem.price) || 0;
        let createdItem: any = null;

        if (tab === 'fabrics') {
            createdItem = {
                id,
                name: newItem.name.trim(),
                design: newItem.design.trim() || 'พื้น',
                price: priceNum,
                width: parseFloat(newItem.width) || 150,
                yRepeat: parseFloat(newItem.yRepeat) || 0,
                weight: 0,
                type: normalizeCurtainType(newItem.type),
                condition: (newItem.condition || 'all').trim()
            };
        } else if (tab === 'rails') {
            createdItem = {
                id,
                name: newItem.name.trim(),
                price: priceNum,
                unit: newItem.unit.trim() || 'เมตร',
                condition: (newItem.condition || 'all').trim()
            };
        } else if (tab === 'accs') {
            createdItem = {
                id,
                name: newItem.name.trim(),
                price: priceNum,
                unit: newItem.unit.trim() || 'ชิ้น',
                condition: (newItem.condition || 'all').trim()
            };
        } else if (tab === 'blinds') {
            createdItem = {
                id,
                name: newItem.name.trim(),
                price: priceNum,
                condition: (newItem.condition || 'roller').trim()
            };
        } else if (tab === 'venetians') {
            createdItem = {
                id,
                name: newItem.name.trim(),
                price: priceNum,
                condition: (newItem.condition || 'venetian').trim()
            };
        }

        if (createdItem) {
            const currentList = Array.isArray(db[tab]) ? db[tab] : [];
            const updatedDb = { ...db, [tab]: [createdItem, ...currentList] };
            setDb(updatedDb);
            safeLocalStorageSetItem('cached_db', JSON.stringify(updatedDb));

            // Reset form
            setNewItem({
                name: '',
                design: '',
                price: '',
                width: '150',
                yRepeat: '0',
                type: 'ทึบ',
                unit: tab === 'rails' ? 'เมตร' : 'ชิ้น',
                condition: tab === 'blinds' ? 'roller' : tab === 'venetians' ? 'venetian' : 'all'
            });

            alert(`เพิ่ม "${createdItem.name}" เข้าหมวด ${tab.toUpperCase()} เรียบร้อยแล้ว`);
        }
    };

    const handleImport = () => { 
        if (!importText) return; 
        const lines = importText.trim().split(/\r?\n/);
        const newItems: any[] = [];
        
        lines.forEach((line, idx) => {
            if (!line.trim()) return;
            const cols = line.split(',').map(c => c.trim());
            if (cols.length < 2) return;
            
            const id = `${tab.slice(0, 1)}_${Date.now()}_${idx}_${Math.random().toString().slice(2,5)}`;
            let item = null;

            if (tab === 'fabrics') {
                // Flexible column recognition
                // Format A (full 7 cols): name, design, price, width, yRepeat, type, condition
                // Format B (3 cols): name, price, type
                // Format C (2 cols): name, price
                if (cols.length >= 6) {
                    item = { 
                        id, 
                        name: cols[0], 
                        design: cols[1] || 'พื้น', 
                        price: parseFloat(cols[2]) || 0, 
                        width: parseFloat(cols[3]) || 150, 
                        yRepeat: parseFloat(cols[4]) || 0, 
                        weight: 0, 
                        type: normalizeCurtainType(cols[5] || 'ทึบ'), 
                        condition: cols[6] || 'all' 
                    }; 
                } else if (cols.length === 3) {
                    const isCol1Price = !isNaN(parseFloat(cols[1]));
                    item = {
                        id,
                        name: cols[0],
                        design: isCol1Price ? 'พื้น' : cols[1],
                        price: isCol1Price ? (parseFloat(cols[1]) || 0) : (parseFloat(cols[2]) || 0),
                        width: 150,
                        yRepeat: 0,
                        weight: 0,
                        type: isCol1Price ? normalizeCurtainType(cols[2] || 'ทึบ') : 'ทึบ',
                        condition: 'all'
                    };
                } else {
                    item = {
                        id,
                        name: cols[0],
                        design: 'พื้น',
                        price: parseFloat(cols[1]) || 0,
                        width: 150,
                        yRepeat: 0,
                        weight: 0,
                        type: 'ทึบ',
                        condition: 'all'
                    };
                }
            } else if (tab === 'rails') {
                item = { 
                    id, 
                    name: cols[0], 
                    price: parseFloat(cols[1]) || 0, 
                    unit: cols[2] || 'เมตร', 
                    condition: cols[3] || 'all' 
                }; 
            } else if (tab === 'accs') {
                item = { 
                    id, 
                    name: cols[0], 
                    price: parseFloat(cols[1]) || 0, 
                    unit: cols[2] || 'ชิ้น', 
                    condition: cols[3] || 'all' 
                }; 
            } else if (tab === 'blinds' || tab === 'venetians') {
                item = { 
                    id, 
                    name: cols[0], 
                    price: parseFloat(cols[1]) || 0, 
                    condition: cols[2] || (tab === 'blinds' ? 'roller' : 'venetian') 
                }; 
            }
            
            if (item) newItems.push(item);
        });

        if (newItems.length > 0) {
            const currentList = Array.isArray(db[tab]) ? db[tab] : [];
            const updatedDb = { ...db, [tab]: [...newItems, ...currentList] };
            setDb(updatedDb); 
            safeLocalStorageSetItem('cached_db', JSON.stringify(updatedDb));
            setImportText(''); 
            alert(`นำเข้าเรียบร้อย ${newItems.length} รายการ (บันทึกเข้าระบบแล้ว)`); 
        } else {
            alert("ไม่พบข้อมูลที่ถูกต้อง กรุณาตรวจสอบรูปแบบข้อความ");
        }
    }; 
    
    const updateRow = (idx: number, field: string, val: any) => { 
        const currentList = Array.isArray(db[tab]) ? [...db[tab]] : [];
        currentList[idx] = { ...currentList[idx], [field]: val }; 
        const updatedDb = { ...db, [tab]: currentList };
        setDb(updatedDb); 
        safeLocalStorageSetItem('cached_db', JSON.stringify(updatedDb));
    }; 

    const removeRow = (idx: number) => { 
        const currentList = Array.isArray(db[tab]) ? [...db[tab]] : [];
        const itemToRemove = currentList[idx];
        if (confirm(`คุณต้องการลบ "${itemToRemove?.name || 'รายการนี้'}" ใช่หรือไม่?`)) {
            currentList.splice(idx, 1); 
            const updatedDb = { ...db, [tab]: currentList };
            setDb(updatedDb); 
            safeLocalStorageSetItem('cached_db', JSON.stringify(updatedDb));
        }
    }; 

    const moveRow = (idx: number, direction: number) => {
        const currentList = Array.isArray(db[tab]) ? [...db[tab]] : [];
        if (direction === -1 && idx > 0) {
            [currentList[idx], currentList[idx - 1]] = [currentList[idx - 1], currentList[idx]];
        } else if (direction === 1 && idx < currentList.length - 1) {
            [currentList[idx], currentList[idx + 1]] = [currentList[idx + 1], currentList[idx]];
        }
        const updatedDb = { ...db, [tab]: currentList };
        setDb(updatedDb); 
        safeLocalStorageSetItem('cached_db', JSON.stringify(updatedDb));
    };

    const tabCounts = {
        fabrics: db?.fabrics?.length || 0,
        blinds: db?.blinds?.length || 0,
        venetians: db?.venetians?.length || 0,
        rails: db?.rails?.length || 0,
        accs: db?.accs?.length || 0
    };

    const currentTabItems = (db[tab] || []) as any[];
    const filteredRows = currentTabItems.filter((row: any) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (row.name || '').toLowerCase().includes(q) || 
               (row.design || '').toLowerCase().includes(q) ||
               (row.type || '').toLowerCase().includes(q);
    });
    
    return (
    <div className="flex flex-col h-full relative font-sans space-y-3">
        {/* Navigation Tabs with Item Count Badges */}
        <div className="flex gap-2 border-b overflow-x-auto flex-none pb-1">
            {[
                { id: 'fabrics', label: 'ผ้า', count: tabCounts.fabrics },
                { id: 'blinds', label: 'ม่านสำเร็จ', count: tabCounts.blinds },
                { id: 'venetians', label: 'มู่ลี่', count: tabCounts.venetians },
                { id: 'rails', label: 'ราง', count: tabCounts.rails },
                { id: 'accs', label: 'อุปกรณ์', count: tabCounts.accs }
            ].map(t => (
                <button 
                    key={t.id} 
                    onClick={() => {
                        setTab(t.id as any);
                        setSearchTerm('');
                        setNewItem(prev => ({
                            ...prev,
                            unit: t.id === 'rails' ? 'เมตร' : 'ชิ้น',
                            condition: t.id === 'blinds' ? 'roller' : t.id === 'venetians' ? 'venetian' : 'all'
                        }));
                    }} 
                    className={`px-3 py-2 whitespace-nowrap text-xs md:text-sm flex items-center gap-1.5 rounded-t-lg transition-colors cursor-pointer ${tab === t.id ? 'border-b-2 border-blue-600 font-bold text-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <span>{t.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[11px] ${tab === t.id ? 'bg-blue-600 text-white font-bold' : 'bg-gray-200 text-gray-600'}`}>
                        {t.count}
                    </span>
                </button>
            ))}
        </div>

        {/* Quick Add Form Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 shadow-xs">
            <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Plus size={15} className="text-green-600"/> เพิ่มรายการใหม่ในหมวด "{tab === 'fabrics' ? 'ผ้า' : tab === 'rails' ? 'ราง' : tab === 'accs' ? 'อุปกรณ์' : tab === 'blinds' ? 'ม่านสำเร็จ' : 'มู่ลี่'}"
                </span>
                <span className="text-[11px] text-gray-400">กรอกข้อมูลแล้วกด "เพิ่มรายการ"</span>
            </div>
            
            <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 text-xs">
                <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-700 mb-0.5">ชื่อรายการ / รหัส *</label>
                    <input 
                        className="w-full p-1.5 border rounded bg-white font-medium" 
                        placeholder={tab === 'fabrics' ? 'เช่น Dimout B01' : tab === 'rails' ? 'เช่น ราง M (มาตรฐาน)' : 'เช่น ชื่อสินค้า'}
                        value={newItem.name} 
                        onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                        required
                    />
                </div>

                <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-0.5">
                        ราคา {tab === 'fabrics' ? '(บ./หลา)' : tab === 'rails' ? '(บ./หน่วย)' : tab === 'accs' ? '(บ./ชิ้น)' : '(บ./ตร.ม.)'} *
                    </label>
                    <input 
                        type="number"
                        step="any"
                        className="w-full p-1.5 border rounded bg-white text-right font-bold text-blue-700" 
                        placeholder="0"
                        value={newItem.price} 
                        onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                        required
                    />
                </div>

                {tab === 'fabrics' && (
                    <>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-0.5">ประเภทผ้า</label>
                            <select 
                                className="w-full p-1.5 border rounded bg-white"
                                value={newItem.type}
                                onChange={e => setNewItem({ ...newItem, type: e.target.value })}
                            >
                                <option value="ทึบ">ทึบ (Dimout/Blackout)</option>
                                <option value="โปร่ง">โปร่ง (Sheer)</option>
                                <option value="all">ทั้งสอง (ทึบ/โปร่ง)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-0.5">หน้ากว้าง (ซม.)</label>
                            <input 
                                type="number"
                                className="w-full p-1.5 border rounded bg-white text-center" 
                                value={newItem.width} 
                                onChange={e => setNewItem({ ...newItem, width: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Repeat (ซม.)</label>
                            <input 
                                type="number"
                                className="w-full p-1.5 border rounded bg-white text-center" 
                                value={newItem.yRepeat} 
                                onChange={e => setNewItem({ ...newItem, yRepeat: e.target.value })}
                            />
                        </div>
                    </>
                )}

                {(tab === 'rails' || tab === 'accs') && (
                    <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-0.5">หน่วยนับ</label>
                        <input 
                            className="w-full p-1.5 border rounded bg-white text-center" 
                            placeholder={tab === 'rails' ? 'เมตร' : 'ชิ้น'}
                            value={newItem.unit} 
                            onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                        />
                    </div>
                )}

                <div className={tab === 'fabrics' ? 'md:col-span-4' : 'md:col-span-2'}>
                    <label className="block text-[11px] font-bold text-gray-700 mb-0.5">เงื่อนไขการแสดงผล (สไตล์ม่าน)</label>
                    <ConditionSelector 
                        value={newItem.condition} 
                        onChange={val => setNewItem({ ...newItem, condition: val })} 
                        formulas={formulas} 
                    />
                </div>

                <div className="flex items-end md:col-span-2">
                    <button 
                        type="submit" 
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-3 rounded shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <Plus size={15}/> เพิ่มรายการทันที
                    </button>
                </div>
            </form>
        </div>

        {/* Search and Table Tools */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-1">
            <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                <input 
                    type="text"
                    className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-lg bg-white"
                    placeholder={`ค้นหาใน ${filteredRows.length} รายการ...`}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button 
                    onClick={() => setShowImport(!showImport)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium transition-colors"
                >
                    <Upload size={13}/> {showImport ? 'ซ่อนนำเข้า CSV' : 'นำเข้า CSV'}
                </button>
                <button 
                    onClick={handleReset} 
                    className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium transition-colors"
                >
                    <RefreshCw size={12}/> รีเซ็ตเป็นค่าเริ่มต้น
                </button>
            </div>
        </div>

        {/* Collapsible CSV Import Form */}
        {showImport && (
            <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3 text-xs">
                <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-blue-900 flex items-center gap-1"><Upload size={14}/> นำเข้าข้อมูล {tab.toUpperCase()} (CSV)</span>
                    <label className="text-[11px] bg-white border border-blue-300 hover:bg-blue-100 px-2 py-0.5 rounded cursor-pointer text-blue-700">
                        เลือกไฟล์ .csv... <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload}/>
                    </label>
                </div>
                <div className="text-[11px] text-blue-700 mb-1.5 font-mono bg-white p-1 rounded border border-blue-100 overflow-x-auto whitespace-nowrap">
                    รูปแบบ: {patterns[tab]}
                </div>
                <textarea 
                    className="w-full h-16 p-2 text-xs border rounded bg-white font-mono" 
                    placeholder="วางข้อมูล CSV ที่นี่..."
                    value={importText} 
                    onChange={e => setImportText(e.target.value)}
                />
                <button onClick={handleImport} className="mt-1.5 bg-blue-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-blue-700 transition-colors">
                    นำเข้าข้อมูลลงฐานข้อมูล
                </button>
            </div>
        )}

        {/* Items Table */}
        <div className="flex-1 overflow-auto min-h-0 text-sm border rounded-lg bg-white shadow-xs">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                    <thead>
                        <tr className="bg-gray-100 sticky top-0 z-10 text-gray-700 font-bold border-b">
                            <th className="p-2 border-r">ชื่อรายการ</th>
                            <th className="p-2 border-r w-24 text-right">ราคา</th>
                            {tab === 'fabrics' && (
                                <>
                                    <th className="p-2 border-r w-28">ประเภทผ้า</th>
                                    <th className="p-2 border-r w-20 text-center">กว้าง (ซม.)</th>
                                    <th className="p-2 border-r w-20 text-center">Repeat</th>
                                </>
                            )}
                            {(tab === 'rails' || tab === 'accs') && (
                                <th className="p-2 border-r w-20 text-center">หน่วย</th>
                            )}
                            <th className="p-2 border-r">เงื่อนไขการใช้ (สไตล์ม่าน)</th>
                            <th className="p-2 text-center w-24">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredRows.length === 0 ? (
                            <tr>
                                <td colSpan={tab === 'fabrics' ? 7 : (tab === 'rails' || tab === 'accs') ? 5 : 4} className="p-8 text-center text-gray-400">
                                    {searchTerm ? 'ไม่พบรายการที่ตรงกับการค้นหา' : 'ยังไม่มีรายการในหมวดนี้ กรอกข้อมูลด้านบนเพื่อเพิ่มรายการ'}
                                </td>
                            </tr>
                        ) : (
                            filteredRows.map((row: any) => {
                                const realIdx = currentTabItems.findIndex((r: any) => r.id === row.id);
                                return (
                                <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="p-1 border-r">
                                        <input 
                                            className="w-full p-1.5 border rounded bg-transparent hover:bg-white focus:bg-white" 
                                            value={row.name || ''} 
                                            onChange={e => updateRow(realIdx, 'name', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-1 border-r w-24">
                                        <input 
                                            type="number" 
                                            step="any"
                                            className="w-full p-1.5 border rounded bg-transparent hover:bg-white focus:bg-white text-right font-medium" 
                                            value={row.price ?? ''} 
                                            onChange={e => updateRow(realIdx, 'price', parseFloat(e.target.value) || 0)}
                                        />
                                    </td>
                                    {tab === 'fabrics' && (
                                        <>
                                            <td className="p-1 border-r w-28">
                                                <select 
                                                    className="w-full p-1.5 border rounded bg-white text-xs" 
                                                    value={normalizeCurtainType(row.type)} 
                                                    onChange={e => updateRow(realIdx, 'type', e.target.value)}
                                                >
                                                    <option value="ทึบ">ทึบ</option>
                                                    <option value="โปร่ง">โปร่ง</option>
                                                    <option value="all">ทั้งสอง (All)</option>
                                                </select>
                                            </td>
                                            <td className="p-1 border-r w-20">
                                                <input 
                                                    type="number" 
                                                    className="w-full p-1.5 border rounded bg-transparent hover:bg-white focus:bg-white text-center" 
                                                    value={row.width ?? ''} 
                                                    onChange={e => updateRow(realIdx, 'width', parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="p-1 border-r w-20">
                                                <input 
                                                    type="number" 
                                                    className="w-full p-1.5 border rounded bg-transparent hover:bg-white focus:bg-white text-center" 
                                                    value={row.yRepeat ?? ''} 
                                                    onChange={e => updateRow(realIdx, 'yRepeat', parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                        </>
                                    )}
                                    {(tab === 'rails' || tab === 'accs') && (
                                        <td className="p-1 border-r w-20">
                                            <input 
                                                className="w-full p-1.5 border rounded bg-transparent hover:bg-white focus:bg-white text-center" 
                                                value={row.unit || ''} 
                                                onChange={e => updateRow(realIdx, 'unit', e.target.value)}
                                            />
                                        </td>
                                    )}
                                    <td className="p-1 border-r">
                                        <ConditionSelector 
                                            value={row.condition || 'all'} 
                                            onChange={val => updateRow(realIdx, 'condition', val)} 
                                            formulas={formulas} 
                                        />
                                    </td>
                                    <td className="p-1 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button 
                                                onClick={() => moveRow(realIdx, -1)} 
                                                className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-20 cursor-pointer" 
                                                disabled={realIdx === 0}
                                                title="เลื่อนขึ้น"
                                            >
                                                <ArrowUp size={13}/>
                                            </button>
                                            <button 
                                                onClick={() => moveRow(realIdx, 1)} 
                                                className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-20 cursor-pointer" 
                                                disabled={realIdx === currentTabItems.length - 1}
                                                title="เลื่อนลง"
                                            >
                                                <ArrowDown size={13}/>
                                            </button>
                                            <button 
                                                onClick={() => removeRow(realIdx)} 
                                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer ml-1"
                                                title="ลบรายการ"
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Sticky Save and Cloud Sync Footer */}
        <div className="pt-2 flex-none z-10">
            <button 
                onClick={onSave} 
                className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold shadow hover:bg-green-700 flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm"
            >
                <Save size={18}/> บันทึกและซิงค์ฐานข้อมูลทั้งหมด (Cloud Sync)
            </button>
            <p className="text-[11px] text-gray-500 text-center mt-1">
                การแก้ไขในหน้านี้จะบันทึกในเครื่องทันที และเมื่อกดปุ่มเขียวจะซิงค์ขึ้น Cloud เพื่อให้พนักงานและเครื่องอื่นเห็นข้อมูลตรงกัน
            </p>
        </div>
    </div>
    );
};

export const StaffManager = ({ staffList, setStaffList, onSave, adminId }: any) => {
    const [newStaff, setNewStaff] = useState<Staff>({ id: '', name: '', pass: '', role: 'sale' });
    const [editId, setEditId] = useState<string | null>(null);

    const handleSaveStaff = () => {
        if (!newStaff.id || !newStaff.name) return;
        let newList;
        if (editId) {
            newList = staffList.map((s: Staff) => s.id === editId ? newStaff : s);
            setEditId(null);
        } else {
            if (staffList.some((s: Staff) => s.id === newStaff.id)) return alert("รหัสพนักงานซ้ำ");
            newList = [...staffList, newStaff];
        }
        setStaffList(newList);
        onSave(newList);
        setNewStaff({ id: '', name: '', pass: '', role: 'sale' });
    };

    const handleEdit = (staff: Staff) => {
        setNewStaff(staff);
        setEditId(staff.id);
    };

    const handleRemove = (id: string) => {
        if (id === adminId) return alert("ไม่สามารถลบ Admin หลักได้");
        if (confirm("ลบพนักงาน?")) {
            const newList = staffList.filter((s: Staff) => s.id !== id);
            setStaffList(newList);
            onSave(newList);
        }
    };

    return (
        <div className="flex flex-col h-full font-sans">
            <div className="flex-1 overflow-auto max-h-60 text-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 sticky top-0">
                        <tr>
                            <th className="p-2 border">รหัส</th>
                            <th className="p-2 border">ชื่อ</th>
                            <th className="p-2 border">สิทธิ์</th>
                            <th className="p-2 border w-16"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {(staffList || []).map((s: Staff) => (
                            <tr key={s.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => handleEdit(s)}>
                                <td className="p-2">{s.id}</td>
                                <td className="p-2">{s.name}</td>
                                <td className="p-2">{s.role}</td>
                                <td className="p-2 text-center" onClick={e=>e.stopPropagation()}>
                                    {s.id !== adminId && <button onClick={() => handleRemove(s.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 border-t pt-4 bg-gray-50 p-4 rounded text-sm">
                <h4 className="font-bold mb-2">{editId ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงาน'}</h4>
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <input className="p-2 border rounded" placeholder="รหัส" value={newStaff.id} onChange={e=>setNewStaff({...newStaff, id:e.target.value})} disabled={!!editId}/>
                    <input className="p-2 border rounded" placeholder="ชื่อ" value={newStaff.name} onChange={e=>setNewStaff({...newStaff, name:e.target.value})}/>
                    <input className="p-2 border rounded" placeholder="รหัสผ่าน" value={newStaff.pass} onChange={e=>setNewStaff({...newStaff, pass:e.target.value})}/>
                    <select className="p-2 border rounded" value={newStaff.role} onChange={e=>setNewStaff({...newStaff, role:e.target.value})}>
                        <option value="sale">Sale</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div className="flex gap-2">
                    {editId && <button onClick={() => { setEditId(null); setNewStaff({ id: '', name: '', pass: '', role: 'sale' }); }} className="flex-1 bg-gray-200 text-gray-700 py-1 rounded">ยกเลิก</button>}
                    <button onClick={handleSaveStaff} className={`flex-1 text-white py-1 rounded ${editId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}>{editId ? 'บันทึกแก้ไข' : 'เพิ่ม'}</button>
                </div>
            </div>
        </div>
    );
};
