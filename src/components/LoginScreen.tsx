import React, { useState } from 'react';
import { Staff } from '../types';

interface LoginScreenProps {
    onLogin: (staff: Staff) => void;
    staffList: Staff[];
}

export const LoginScreen = ({ onLogin, staffList }: LoginScreenProps) => {
    const [id, setId] = useState('');
    const [pass, setPass] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => { 
        const s = (staffList || []).find(x => x.id === id && x.pass === pass); 
        if (s) {
            onLogin(s); 
        } else {
            setError('รหัสหรือรหัสผ่านไม่ถูกต้อง'); 
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-sans">
            <div className="bg-white w-full max-w-sm p-8 rounded-xl shadow-lg space-y-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-center text-blue-900 tracking-tight">เข้าสู่ระบบ</h1>
                    <p className="text-sm text-gray-500 mt-1">ใส่อีเมลหรือรหัสเพื่อเริ่มคำนวณใบเสนอราคา</p>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">รหัสพนักงาน</label>
                        <input 
                            className="w-full p-3 border rounded text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            placeholder="รหัสพนักงาน (เช่น T58121)" 
                            value={id} 
                            onChange={e => setId(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">รหัสผ่าน</label>
                        <input 
                            type="password" 
                            className="w-full p-3 border rounded text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            placeholder="รหัสผ่าน" 
                            value={pass} 
                            onChange={e => setPass(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <button onClick={handleSubmit} className="w-full py-3 bg-blue-700 text-white rounded-lg font-bold hover:bg-blue-800 transition-colors cursor-pointer">เข้าสู่ระบบ</button>
                </div>
            </div>
        </div>
    );
};
