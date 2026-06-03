import React from 'react';
import { Card } from './Common';
import { Customer } from '../types';

interface CustomerFormProps {
    customer: Customer;
    setCustomer: (c: Customer) => void;
    onNext: () => void;
    onCancel: () => void;
}

export const CustomerForm = ({ customer, setCustomer, onNext, onCancel }: CustomerFormProps) => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-2 sm:p-4 font-sans">
        <Card className="w-full max-w-2xl p-0 shadow-lg">
            <div className="p-4 sm:p-8">
                <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-blue-800 border-b pb-3 sm:pb-4">ข้อมูลลูกค้าใหม่</h1>
                <div className="grid gap-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                            <input 
                                className="std-input w-full p-3 border rounded" 
                                autoFocus 
                                value={customer.name} 
                                onChange={e => setCustomer({...customer, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">เบอร์ติดต่อ</label>
                            <input 
                                className="std-input w-full p-3 border rounded" 
                                value={customer.phone} 
                                onChange={e => setCustomer({...customer, phone: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ที่อยู่จัดส่ง / หน้างาน</label>
                        <textarea 
                            className="std-input w-full h-24 p-3 border rounded" 
                            value={customer.address} 
                            onChange={e => setCustomer({...customer, address: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">หมายเหตุ (ถ้ามี)</label>
                        <textarea 
                            className="std-input w-full h-20 p-3 border rounded" 
                            value={customer.note} 
                            onChange={e => setCustomer({...customer, note: e.target.value})}
                        />
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button onClick={onCancel} className="flex-1 py-3 text-gray-500 bg-gray-100 rounded hover:bg-gray-200 transition-colors">ย้อนกลับ</button>
                        <button onClick={onNext} className="flex-[2] py-3 bg-blue-700 text-white rounded font-bold hover:bg-blue-800 transition-colors">เริ่มทำใบเสนอราคา</button>
                    </div>
                </div>
            </div>
        </Card>
    </div>
);
