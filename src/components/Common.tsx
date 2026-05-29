import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, CheckSquare, Search } from 'lucide-react';
import { Formula } from '../types';

export const Card = ({ children, className = "", title, icon: Icon, action }: any) => (
    <div className={`bg-white border border-gray-200 shadow-sm rounded-lg flex flex-col ${className} print-clean`}>
        {title && (
            <div className="theme-bg-light border-b border-gray-200 px-4 py-3 flex items-center justify-between font-bold text-gray-700 rounded-t-lg print-hidden">
                <div className="flex items-center gap-2">{Icon && <Icon size={18} className="theme-text-action"/>}{title}</div>
                {action}
            </div>
        )}
        <div className="flex-1 flex flex-col min-h-0">{children}</div>
    </div>
);

export const Modal = ({ title, onClose, children, maxWidth = "max-w-md" }: any) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className={`bg-white w-full ${maxWidth} rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]`}>
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                <h3 className="font-bold text-lg text-gray-800">{title}</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-red-500"><X size={24}/></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">{children}</div>
        </div>
    </div>
);

export const SearchableSelect = ({ options, value, onChange, placeholder = "ค้นหาหรือเลือก..." }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filterText, setFilterText] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find((o: any) => o.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if(selectedOption && !isOpen) {
             setFilterText(''); 
        }
    }, [selectedOption, isOpen]);

    const filteredOptions = options.filter((opt: any) => 
        opt.label.toLowerCase().includes(filterText.toLowerCase())
    );

    const handleSelect = (val: string) => {
        onChange({ target: { value: val } });
        setIsOpen(false);
        setFilterText('');
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div 
                className="w-full bg-white border border-gray-300 rounded p-2 flex items-center justify-between cursor-pointer std-input"
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100);
                }}
            >
                <span className={`truncate ${!selectedOption ? 'text-gray-400' : 'text-gray-800'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={16} className="text-gray-400"/>
            </div>
            
            {isOpen && (
                <div className="absolute z-[100] mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-96 overflow-hidden flex flex-col">
                    <div className="p-2 border-b bg-gray-50">
                        <div className="flex items-center bg-white border rounded px-2">
                            <Search size={14} className="text-gray-400"/>
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full p-2 bg-transparent outline-none text-sm"
                                placeholder="พิมพ์เพื่อค้นหา..."
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 max-h-60">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt: any) => (
                                <div 
                                    key={opt.value} 
                                    className={`p-2 hover:bg-theme-bg-app cursor-pointer text-sm ${value === opt.value ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-700'}`}
                                    onClick={() => handleSelect(opt.value)}
                                >
                                    {opt.label}
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-gray-400 text-xs">ไม่พบข้อมูล</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const ConditionSelector = ({ value, onChange, formulas }: { value: string; onChange: (v: string) => void; formulas: Formula[] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const conditions = value ? value.split(',').map(s=>s.trim()) : ['all'];
    const options = [
      { id: 'all', label: 'ทั้งหมด (All)' }, 
      { id: 'fabric', label: 'เฉพาะม่านผ้า' }, 
      { id: 'blind', label: 'เฉพาะม่านสำเร็จ' }, 
      { id: 'roller', label: 'ม่านม้วน' }, 
      { id: 'venetian', label: 'มู่ลี่' }, 
      ...formulas.map(s => ({ id: s.id, label: s.label }))
    ];

    useEffect(() => { 
        const handleClickOutside = (event: MouseEvent) => { 
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false); 
            }
        }; 
        document.addEventListener("mousedown", handleClickOutside); 
        return () => document.removeEventListener("mousedown", handleClickOutside); 
    }, []);

    const toggleCondition = (id: string) => { 
        let newConds = [...conditions]; 
        if (id === 'all') {
            newConds = ['all']; 
        } else { 
            if (newConds.includes('all')) newConds = []; 
            if (newConds.includes(id)) {
                newConds = newConds.filter(c => c !== id); 
            } else {
                newConds.push(id); 
            }
            if (newConds.length === 0) newConds = ['all']; 
        } 
        onChange(newConds.join(',')); 
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="w-full p-1 border rounded text-xs bg-white cursor-pointer min-h-[28px] flex items-center" onClick={() => setIsOpen(!isOpen)}>
                <div className="truncate text-blue-600 w-full">{value || 'all'}</div>
                <ChevronDown size={14} className="text-gray-400 flex-shrink-0"/>
            </div>
            {isOpen && (
                <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-y-auto p-1">
                    {options.map(opt => (
                        <div key={opt.id} className={`flex items-center gap-2 p-2 hover:bg-blue-50 cursor-pointer text-xs rounded ${conditions.includes(opt.id) ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600'}`} onClick={() => toggleCondition(opt.id)}>
                            <div className={`w-4 h-4 border rounded flex items-center justify-center ${conditions.includes(opt.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                {conditions.includes(opt.id) && <CheckSquare size={12} className="text-white"/>}
                            </div>
                            <span>{opt.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
