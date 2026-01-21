/* =====================================================
   CARDGIFT - WALLET STATE
   Управление состоянием кошелька
   ===================================================== */

const WalletState = {
    connected: false,
    address: null,
    chainId: null,
    balance: '0',
    
    // Установить подключение
    setConnected(address, chainId) {
        this.connected = true;
        this.address = address;
        this.chainId = chainId;
        this.save();
    },
    
    // Отключить
    disconnect() {
        this.connected = false;
        this.address = null;
        this.chainId = null;
        this.balance = '0';
        this.save();
    },
    
    // Сохранить в localStorage
    save() {
        try {
            localStorage.setItem('walletState', JSON.stringify({
                connected: this.connected,
                address: this.address,
                chainId: this.chainId
            }));
        } catch (e) {
            console.warn('Failed to save wallet state:', e);
        }
    },
    
    // Загрузить из localStorage
    load() {
        try {
            const saved = localStorage.getItem('walletState');
            if (saved) {
                const data = JSON.parse(saved);
                this.connected = data.connected || false;
                this.address = data.address || null;
                this.chainId = data.chainId || null;
            }
        } catch (e) {
            console.warn('Failed to load wallet state:', e);
        }
        return this;
    },
    
    // Проверить подключен ли
    isConnected() {
        return this.connected && this.address;
    },
    
    // Получить короткий адрес
    getShortAddress() {
        if (!this.address) return '';
        return `${this.address.slice(0, 6)}...${this.address.slice(-4)}`;
    }
};

// Загружаем состояние при старте
WalletState.load();

// Глобальный доступ
window.WalletState = WalletState;

console.log('💼 WalletState loaded');
