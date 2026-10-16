/**
 * Safely writes to localStorage, handling QuotaExceededError gracefully without crashing the app.
 */
export function safeLocalStorageSetItem(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch (e: any) {
        console.warn(`LocalStorage write failed for key "${key}":`, e);
        
        // QuotaExceededError check
        if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
            // Try to reclaim space by deleting non-essential big cache like cached_quotes
            if (key !== 'cached_quotes') {
                try {
                    localStorage.removeItem('cached_quotes');
                    localStorage.setItem(key, value);
                    console.log(`Reclaimed space and successfully saved "${key}" to localStorage.`);
                    return;
                } catch (retryError) {
                    console.error(`LocalStorage write failed even after clearing cached_quotes:`, retryError);
                }
            }
        }
    }
}

/**
 * Normalizes curtain type input to standard categories: 'ทึบ' | 'โปร่ง' | 'all'
 */
export function normalizeCurtainType(type: any): 'ทึบ' | 'โปร่ง' | 'all' {
    if (!type) return 'all';
    const t = String(type).trim().toLowerCase();
    if (t === 'ทึบ' || t === 'ม่านทึบ' || t === 'ผ้าทึบ' || t === 'dimout' || t === 'blackout' || t === 'ทึบแสง') return 'ทึบ';
    if (t === 'โปร่ง' || t === 'ม่านโปร่ง' || t === 'ผ้าโปร่ง' || t === 'sheer' || t === 'โปร่งแสง') return 'โปร่ง';
    if (t === 'all' || t === 'ทั้งหมด' || t === 'ทั้งสอง' || t === 'ทึบ/โปร่ง' || t === 'ทึบและโปร่ง') return 'all';
    return 'all';
}

/**
 * Checks whether an item's type matches the selected curtainType ('ทึบ' or 'โปร่ง')
 */
export function isCurtainTypeMatch(itemType: any, selectedType: string): boolean {
    if (!selectedType || selectedType === 'อื่นๆ') return true;
    const normItem = normalizeCurtainType(itemType);
    if (normItem === 'all') return true;
    const normSelected = normalizeCurtainType(selectedType);
    return normItem === normSelected;
}

/**
 * Robust check for condition matching across styles, formulas, categories, and languages (Thai & English)
 */
export function checkCondition(condition: string, currentStyle: string, formulas: any[] = []): boolean {
    if (!condition) return true;
    const raw = String(condition).trim().toLowerCase();
    if (!raw || raw === 'all' || raw === 'ทั้งหมด' || raw === 'ทุกรูปแบบ' || raw === 'ทุกสไตล์') return true;

    const conditions = raw.split(',').map(c => c.trim().toLowerCase());
    if (conditions.includes('all') || conditions.includes('ทั้งหมด')) return true;

    const styleDef = (formulas || []).find(s => s.id === currentStyle);
    const isBlind = styleDef?.category === 'blind';
    const isFabric = !isBlind;

    // Check category conditions
    if (isFabric && (conditions.includes('fabric') || conditions.includes('ผ้า') || conditions.includes('ม่านผ้า') || conditions.includes('เฉพาะม่านผ้า'))) {
        return true;
    }
    if (isBlind && (conditions.includes('blind') || conditions.includes('ม่านสำเร็จ') || conditions.includes('เฉพาะม่านสำเร็จ'))) {
        return true;
    }

    // Direct style matches
    const currentStyleLower = (currentStyle || '').toLowerCase();
    if (conditions.includes(currentStyleLower)) return true;

    if (styleDef) {
        const labelLower = (styleDef.label || '').toLowerCase();
        if (conditions.includes(labelLower)) return true;
        if (conditions.some(c => labelLower.includes(c) || currentStyleLower.includes(c))) return true;
    }

    // Common style aliases (English id vs Thai names)
    const aliases: Record<string, string[]> = {
        pleated: ['ม่านจีบ', 'จีบ'],
        wave: ['ม่านลอน', 'ลอน', 'ม่านลอนโซ่'],
        wave_tape: ['ม่านลอนเทป', 'ลอนเทป'],
        eyelet: ['ม่านเจาะห่วง', 'ตาไก่', 'ม่านตาไก่', 'เจาะห่วง'],
        loop: ['ม่านห่วงคล้อง', 'ห่วงคล้อง'],
        roman: ['ม่านพับ', 'พับ'],
        roller: ['ม่านม้วน', 'ม้วน', 'roller_blind', 'roller'],
        venetian: ['ม่านมู่ลี่', 'มู่ลี่', 'venetian_blind', 'venetian', 'ไม้', 'มู่ลี่ไม้', 'มู่ลี่อลูมิเนียม']
    };

    const styleAliases = aliases[currentStyle] || [];
    if (conditions.some(c => styleAliases.includes(c))) return true;

    return false;
}

