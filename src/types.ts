export const ADMIN_ID = 'T58121';

export const DEFAULT_STAFF = [
    { id: 'T58121', name: 'ผู้ดูแลระบบ', pass: 'admin', role: 'admin' },
    { id: 'S001', name: 'พนักงานขาย 1', pass: '1234', role: 'sale' },
];

export const DEFAULT_ROOMS = [];
export const DEFAULT_HOUSES = [];

export const DEFAULT_THEME_COLORS = {
    main: '#1e3a8a',    // blue-900
    action: '#2563eb',  // blue-600
    success: '#16a34a', // green-600
    bg: '#f9fafb'       // gray-50
};

export const DEFAULT_FORMULAS = [
  { id: 'pleated', label: 'ม่านจีบ', category: 'fabric', fullness: 2.0, hemSide: 10, hemTopBot: 30, sewingPrice: 380 },
  { id: 'wave', label: 'ม่านลอน', category: 'fabric', fullness: 2.5, hemSide: 10, hemTopBot: 30, sewingPrice: 380 },
  { id: 'wave_tape', label: 'ม่านลอนเทป', category: 'fabric', fullness: 2.5, hemSide: 10, hemTopBot: 30, sewingPrice: 380 },
  { id: 'eyelet', label: 'ม่านเจาะห่วง (ตาไก่)', category: 'fabric', fullness: 2.0, hemSide: 10, hemTopBot: 30, sewingPrice: 575 },
  { id: 'loop', label: 'ม่านห่วงคล้อง', category: 'fabric', fullness: 1.5, hemSide: 10, hemTopBot: 50, sewingPrice: 380 },
  { id: 'roman', label: 'ม่านพับ', category: 'fabric', fullness: 1.0, hemSide: 10, hemTopBot: 40, sewingPrice: 420 },
  { id: 'roller', label: 'ม่านม้วน', category: 'blind', fullness: 1.0, hemSide: 0, hemTopBot: 0, sewingPrice: 0 },
  { id: 'venetian', label: 'ม่านมู่ลี่', category: 'blind', fullness: 1.0, hemSide: 0, hemTopBot: 0, sewingPrice: 0 },
];

export const OTHER_EXPENSES = [
    { id: 'install', label: 'ค่าติดตั้ง', price: 1500, fixed: true },
    { id: 'motor_install', label: 'ค่าติดตั้งมอเตอร์', price: 1500, fixed: true },
    { id: 'high_hall', label: 'ค่าติดตั้งโถงสูง', price: 1500, fixed: true },
    { id: 'travel', label: 'ค่าเดินทางต่างจังหวัด', price: 0, fixed: false, hasInput: true },
    { id: 'other', label: 'อื่นๆ', price: 0, fixed: false, hasInput: true }
];

export const CALCULATION_STYLES = [
  { id: 'grain_opaque', label: 'เกรนม่านทึบ (ต่อหน้าผ้า)' },
  { id: 'grain_sheer', label: 'เกรนม่านโปร่ง (ไร้รอยต่อ)' }
];

export const INITIAL_DB = {
    fabrics: [
        { id: 'f1', name: 'Dimout A01', design: 'พื้น', price: 350, width: 150, yRepeat: 0, weight: 200, type: 'ทึบ', condition: 'all' },
        { id: 'f2', name: 'Blackout B02', design: 'กันร้อน', price: 550, width: 280, yRepeat: 0, weight: 350, type: 'ทึบ', condition: 'all' },
        { id: 'f3', name: 'Sheer S01', design: 'เรียบ', price: 250, width: 300, yRepeat: 0, weight: 100, type: 'โปร่ง', condition: 'all' },
    ],
    blinds: [
        { id: 'b1', name: 'Sunscreen 1%', price: 850, condition: 'roller' },
        { id: 'b2', name: 'Blackout Roller', price: 950, condition: 'roller' },
    ],
    venetians: [
        { id: 'v_imp_1', name: 'มู่ลี่ไม้ CLASSIC (BASS WOOD )35 mm W3551-W3558 โซ่วน / APEX', price: 3900, condition: 'venetian' },
        { id: 'v_imp_2', name: 'มู่ลี่ไม้ CLASSIC (BASSWOOD) 50 mm W5051-W5058 โซ่วน / APEX', price: 3900, condition: 'venetian' },
        { id: 'v_imp_3', name: 'มู่ลี่ไม้WATER PROOF (WOOD PLUS) 35 mm S3501-S3504 โซ่วน /APEX', price: 3900, condition: 'venetian' },
        { id: 'v_imp_4', name: 'มู่ลี่ไม้WATER PROOF (WOOD PLUS) 50 mm S5001-S5004 โซ่วน /APEX', price: 3900, condition: 'venetian' },
        { id: 'v_imp_5', name: 'มู่ลี่ไม้WATER PROOF (WOOD PLUS) 50 mm S5005-S5008 โซ่วน /APEX', price: 5400, condition: 'venetian' },
        { id: 'v_imp_6', name: 'มู่ลี่ไม้WATER PROOF (WOOD PLUS) 50 mm S5009-S5012 โซ่วน /APEX', price: 3900, condition: 'venetian' },
        { id: 'v_imp_7', name: 'มู่ลี่ไม้ HAND SCRAPING WOOD (BASS WOOD) 50mm W41-W44  โซ่วน /APEX', price: 5300, condition: 'venetian' },
        { id: 'v_imp_8', name: 'มู่ลี่ไม้ HAND SCRAPING WOOD (BASS WOOD) 50mm W45-W48  โซ่วน /APEX', price: 5300, condition: 'venetian' },
        { id: 'v_imp_9', name: 'มู่ลี่ไม้ HAND SCRAPING WOOD (BASS WOOD) 50mm W81-W86  โซ่วน /APEX', price: 5700, condition: 'venetian' },
        { id: 'v_imp_10', name: 'มู่ลี่ไม้ CLASSIC (PINE WOOD) 50mm W5081-W5087 โซ่วน /APEX', price: 3600, condition: 'venetian' },
        { id: 'v_imp_11', name: 'มู่ลี่ไม้ CLASSIC (PINE WOOD) 50mm W5091-W5098 โซ่วน /APEX', price: 3600, condition: 'venetian' },
    ],
    rails: [
        { id: 'r1', name: 'ราง M (มาตรฐาน)', price: 350, unit: 'เมตร', condition: 'pleated,wave_tape,roman' },
        { id: 'r2', name: 'รางโชว์ไทเทเนียม', price: 550, unit: 'เมตร', condition: 'eyelet,loop' },
        { id: 'r3', name: 'รางม่านลอนโซ่', price: 650, unit: 'เมตร', condition: 'wave' },
    ],
    accs: [
        { id: 'a1', name: 'สายรวบม่านพู่ใหญ่', price: 150, unit: 'ชิ้น', condition: 'fabric' },
        { id: 'a2', name: 'ตะขอเกี่ยวผนัง', price: 50, unit: 'ชิ้น', condition: 'fabric' },
        { id: 'a3', name: 'ด้ามจูง', price: 120, unit: 'ชิ้น', condition: 'all' },
    ]
};

export interface Staff {
    id: string;
    name: string;
    pass: string;
    role: string;
}

export interface Customer {
    name: string;
    phone: string;
    address: string;
    note: string;
}

export interface Formula {
    id: string;
    label: string;
    category: string;
    fullness: number;
    hemSide: number;
    hemTopBot: number;
    sewingPrice: number;
}
