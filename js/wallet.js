/* =====================================================
   CARDGIFT - WALLET FUNCTIONS
   v1.1 - Функции работы с Web3 кошельком
   ИСПРАВЛЕНО: Приоритет SafePal
   ===================================================== */

var OPBNB_CHAIN = {
    chainId: '0xCC',
    chainName: 'opBNB Mainnet',
    nativeCurrency: {
        name: 'BNB',
        symbol: 'BNB',
        decimals: 18
    },
    rpcUrls: ['https://opbnb-mainnet-rpc.bnbchain.org'],
    blockExplorerUrls: ['https://opbnbscan.com']
};

function getWeb3Provider() {
    if (window.safepalProvider) {
        console.log('Using SafePal provider');
        return window.safepalProvider;
    }
    if (window.safepal && window.safepal.ethereum) {
        console.log('Using SafePal ethereum');
        return window.safepal.ethereum;
    }
    if (window.ethereum && window.ethereum.isSafePal) {
        console.log('Using ethereum.isSafePal');
        return window.ethereum;
    }
    if (window.ethereum && window.ethereum.providers && window.ethereum.providers.length) {
        var safePalProvider = window.ethereum.providers.find(function(p) { return p.isSafePal; });
        if (safePalProvider) {
            console.log('Using SafePal from providers');
            return safePalProvider;
        }
    }
    if (window.ethereum) {
        console.log('Using default ethereum');
        return window.ethereum;
    }
    return null;
}

async function connectWallet() {
    var provider = getWeb3Provider();
    
    if (!provider) {
        alert('Wallet not found! Install SafePal or MetaMask.');
        return null;
    }
    
    try {
        console.log('Connecting wallet...');
        
        var accounts;
        try {
            accounts = await provider.request({ method: 'eth_requestAccounts' });
        } catch (e) {
            console.warn('eth_requestAccounts failed:', e);
            if (provider.enable) {
                accounts = await provider.enable();
            } else {
                throw e;
            }
        }
        
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found');
        }
        
        var address = accounts[0];
        console.log('Got address:', address);
        
        try {
            var chainId = await provider.request({ method: 'eth_chainId' });
            var currentChainId = parseInt(chainId, 16);
            if (currentChainId !== 204) {
                console.log('Switching to opBNB...');
                await switchToOpBNB();
            }
        } catch (e) {
            console.warn('Network check failed:', e);
        }
        
        if (window.WalletState) {
            WalletState.setConnected(address, 204);
        }
        
        console.log('Wallet connected:', address);
        updateWalletUI(address);
        return address;
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        if (error.code === 4001) {
            alert('Connection rejected by user');
        } else {
            alert('Connection error: ' + error.message);
        }
        return null;
    }
}

async function switchToOpBNB() {
    var provider = getWeb3Provider();
    if (!provider) return;
    
    try {
        await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: OPBNB_CHAIN.chainId }]
        });
    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
                await provider.request({
                    method: 'wallet_addEthereumChain',
                    params: [OPBNB_CHAIN]
                });
            } catch (addError) {
                console.error('Failed to add opBNB network:', addError);
                throw addError;
            }
        } else {
            throw switchError;
        }
    }
}

function disconnectWallet() {
    if (window.WalletState) {
        WalletState.disconnect();
    }
    
    localStorage.removeItem('walletState');
    localStorage.removeItem('connectedWallet');
    localStorage.removeItem('cg_wallet_address');
    localStorage.removeItem('currentUser');
    
    updateWalletUI(null);
    console.log('Wallet disconnected');
    window.location.reload();
}

function updateWalletUI(address) {
    var connectBtn = document.getElementById('walletConnectBtn');
    var walletStatus = document.getElementById('walletStatus');
    var walletBtnSmall = document.getElementById('walletBtnSmall');
    var walletStatusSmall = document.getElementById('walletStatusSmall');
    
    if (address) {
        var shortAddress = address.slice(0, 6) + '...' + address.slice(-4);
        
        if (connectBtn) {
            connectBtn.innerHTML = 'Connected: ' + shortAddress;
            connectBtn.onclick = disconnectWallet;
        }
        
        if (walletStatus) {
            walletStatus.innerHTML = '<span style="color: #4CAF50;">Connected: ' + shortAddress + '</span>';
        }
        
        if (walletBtnSmall) {
            walletBtnSmall.style.display = 'none';
        }
        
        if (walletStatusSmall) {
            walletStatusSmall.style.display = 'block';
        }
    } else {
        if (connectBtn) {
            connectBtn.innerHTML = 'Connect Wallet';
            connectBtn.onclick = connectWallet;
        }
        
        if (walletStatus) {
            walletStatus.innerHTML = '';
        }
        
        if (walletBtnSmall) {
            walletBtnSmall.style.display = 'block';
        }
        
        if (walletStatusSmall) {
            walletStatusSmall.style.display = 'none';
        }
    }
}

async function getWalletAddress() {
    var provider = getWeb3Provider();
    if (!provider) return null;
    
    try {
        var accounts = await provider.request({ method: 'eth_accounts' });
        return accounts[0] || null;
    } catch (error) {
        console.warn('Failed to get wallet address:', error);
        return null;
    }
}

async function autoConnectWallet() {
    if (window.WalletState && WalletState.isConnected()) {
        var address = await getWalletAddress();
        if (address && address.toLowerCase() === (WalletState.address || '').toLowerCase()) {
            updateWalletUI(address);
            return address;
        } else {
            WalletState.disconnect();
        }
    }
    return null;
}

function initWalletListeners() {
    var provider = getWeb3Provider();
    
    if (provider && provider.on) {
        provider.on('accountsChanged', function(accounts) {
            if (accounts.length === 0) {
                disconnectWallet();
            } else {
                if (window.WalletState) {
                    WalletState.setConnected(accounts[0], WalletState.chainId);
                }
                updateWalletUI(accounts[0]);
            }
        });
        
        provider.on('chainChanged', function(chainId) {
            var currentChainId = parseInt(chainId, 16);
            if (currentChainId !== 204) {
                console.warn('Please switch to opBNB network');
            }
        });
    }
}

setTimeout(function() {
    initWalletListeners();
}, 500);

window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.getWalletAddress = getWalletAddress;
window.autoConnectWallet = autoConnectWallet;
window.switchToOpBNB = switchToOpBNB;
window.getWeb3Provider = getWeb3Provider;

console.log('Wallet functions v1.1 loaded (SafePal priority)');
