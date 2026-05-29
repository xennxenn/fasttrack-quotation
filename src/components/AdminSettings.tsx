import React, { useState } from 'react';
import { Trash2, Save, Upload, RefreshCw, ArrowUp, ArrowDown, Info, CheckSquare, Users, Ruler, Palette, Database } from 'lucide-react';
import { ConditionSelector } from './Common';
import { Formula, Staff } from '../types';

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
    const [tab, setTab] = useState('fabrics'); 
    const [importText, setImportText] = useState(''); 
    const patterns: any = {
        fabrics: "ชื่อ, ดีไซน์, ราคา, หน้ากว้าง(ซม.), Repeat, ประเภท(ทึบ/โปร่ง), เงื่อนไข",
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
            setDb((prev: any) => ({ ...prev, [tab]: defaultData }));
        }
    };

    const handleImport = () => { 
        if (!importText) return; 
        const lines = importText.trim().split(/\r?\n/);
        const newItems: any[] = [];
        
        lines.forEach((line, idx) => {
            if (!line.trim()) return;
            const cols = line.split(',');
            if (cols.length < 2) return;
            
            const id = Date.now() + idx + Math.random().toString().slice(2,5);
            let item = null;

            if (tab === 'fabrics') {
                item = { id, name: cols[0], design: cols[1]||'', price: parseFloat(cols[2])||0, width: parseFloat(cols[3])||150, yRepeat: parseFloat(cols[4])||0, weight: 0, type: cols[5]||'ทึบ', condition: cols[6]||'all' }; 
            } else if (tab === 'rails') {
                item = { id, name: cols[0], price: parseFloat(cols[1])||0, unit: cols[2]||'เมตร', condition: cols[3]||'all' }; 
            } else if (tab === 'accs') {
                item = { id, name: cols[0], price: parseFloat(cols[1])||0, unit: cols[2]||'ชิ้น', condition: cols[3]||'all' }; 
            } else if (tab === 'blinds' || tab === 'venetians') {
                item = { id, name: cols[0], price: parseFloat(cols[1])||0, condition: cols[2]||'all' }; 
            }
            
            if (item) newItems.push(item);
        });

        if (newItems.length > 0) {
            setDb((prev: any) => ({ ...prev, [tab]: [...prev[tab], ...newItems] })); 
            setImportText(''); 
            alert(`นำเข้าเรียบร้อย ${newItems.length} รายการ`); 
        } else {
            alert("ไม่พบข้อมูลที่ถูกต้อง");
        }
    }; 
    
    const updateRow = (idx: number, field: string, val: any) => { 
        const newData = [...(db[tab] || [])]; 
        newData[idx] = { ...newData[idx], [field]: val }; 
        setDb({ ...db, [tab]: newData }); 
    }; 

    const removeRow = (idx: number) => { 
        const newData = [...(db[tab] || [])]; 
        newData.splice(idx, 1); 
        setDb({ ...db, [tab]: newData }); 
    }; 

    const moveRow = (idx: number, direction: number) => {
        const newData = [...(db[tab] || [])];
        if (direction === -1 && idx > 0) {
            [newData[idx], newData[idx - 1]] = [newData[idx - 1], newData[idx]];
        } else if (direction === 1 && idx < newData.length - 1) {
            [newData[idx], newData[idx + 1]] = [newData[idx + 1], newData[idx]];
        }
        setDb({ ...db, [tab]: newData });
    };
    
    return (
    <div className="flex flex-col h-full relative font-sans">
        <div className="flex gap-2 mb-4 border-b overflow-x-auto flex-none">
            {['fabrics','blinds','venetians','rails','accs'].map(t => (
                <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 whitespace-nowrap text-sm ${tab===t ? 'border-b-2 border-blue-600 font-bold text-blue-600' : 'text-gray-500'}`}>
                    {t==='fabrics'?'ผ้า': t==='rails'?'ราง': t==='accs'?'อุปกรณ์': t==='blinds'?'ม่านสำเร็จ': t==='venetians'?'มู่ลี่': t.toUpperCase()}
                </button>
            ))}
        </div>
        <div className="flex-1 overflow-auto min-h-0 text-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[800px]">
                    <thead><tr className="bg-gray-100 sticky top-0 z-10"><th className="p-2 border">ชื่อ</th><th className="p-2 border">ราคา</th>{tab === 'fabrics' && <><th className="p-2 border">ประเภท</th><th className="p-2 border w-16">กว้าง(ซม.)</th><th className="p-2 border w-16">Repeat</th></>}<th className="p-2 border w-1/3">เงื่อนไข</th><th className="p-2 border w-24"></th></tr></thead>
                    <tbody>
                        {(db[tab] || []).map((row: any, idx: number) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                            <td className="p-1 border"><input className="w-full p-1 border rounded" value={row.name} onChange={e=>updateRow(idx,'name',e.target.value)}/></td>
                            <td className="p-1 border w-24"><input type="number" className="w-full p-1 border rounded" value={row.price} onChange={e=>updateRow(idx,'price',parseFloat(e.target.value))}/></td>
                            {tab === 'fabrics' && <><td className="p-1 border w-20"><input className="w-full p-1 border rounded" value={row.type} onChange={e=>updateRow(idx,'type',e.target.value)}/></td><td className="p-1 border w-16"><input type="number" className="w-full p-1 border rounded" value={row.width} onChange={e=>updateRow(idx,'width',parseFloat(e.target.value))}/></td><td className="p-1 border w-16"><input type="number" className="w-full p-1 border rounded" value={row.yRepeat} onChange={e=>updateRow(idx,'yRepeat',parseFloat(e.target.value))}/></td></>}
                            <td className="p-1 border"><ConditionSelector value={row.condition} onChange={val=>updateRow(idx,'condition',val)} formulas={formulas} /></td>
                            <td className="p-1 border text-center flex items-center justify-center gap-1">
                                <button onClick={()=>moveRow(idx, -1)} className="text-gray-400 hover:text-blue-500 disabled:opacity-30" disabled={idx===0}><ArrowUp size={14}/></button>
                                <button onClick={()=>moveRow(idx, 1)} className="text-gray-400 hover:text-blue-500 disabled:opacity-30" disabled={idx===(db[tab]?.length || 0)-1}><ArrowDown size={14}/></button>
                                <button onClick={()=>removeRow(idx)} className="text-red-500 ml-1"><Trash2 size={16}/></button>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        <div className="p-4 border-t bg-white flex flex-col gap-2 flex-none z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.1)]">
            <button onClick={onSave} className="w-full bg-green-600 text-white py-2 rounded-lg font-bold shadow-md hover:bg-green-700 flex items-center justify-center gap-2 transition-colors"><Save size={18}/> บันทึกและซิงค์ข้อมูล (Sync)</button>
            
            <div>
                <h4 className="font-bold text-sm mb-1 flex justify-between">
                    <span className="flex items-center gap-2"><Upload size={16}/> นำเข้า (CSV)</span>
                    <div className="flex gap-2">
                        <button onClick={handleReset} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 flex items-center gap-1"><RefreshCw size={12}/> รีเซ็ต</button>
                        <label className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded cursor-pointer">เลือกไฟล์... <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload}/></label>
                    </div>
                </h4>
                <div className="text-xs text-gray-500 mb-2 font-mono bg-gray-50 p-1 rounded border overflow-x-auto whitespace-nowrap">รูปแบบ: {patterns[tab]}</div>
                <textarea className="w-full h-20 p-2 text-xs border rounded" value={importText} onChange={e=>setImportText(e.target.value)}/>
                <button onClick={handleImport} className="mt-2 w-full bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700">นำเข้าข้อมูล</button>
            </div>
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
