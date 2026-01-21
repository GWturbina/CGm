/* =====================================================
   CARDGIFT - DEBUG PANEL MODULE
   Вырезано из dashboard.js (строки 115-171)
   
   Включает:
   - Debug panel toggle
   - Debug info display
   ===================================================== */

// ============ DEBUG PANEL ============
function showDebugPanel() {
    const existingPanel = document.getElementById('debugPanel');
    if (existingPanel) existingPanel.remove();
    
    const panel = document.createElement('div');
    panel.id = 'debugPanel';
    panel.style.cssText = `
        position: fixed;
        bottom: 60px;
        left: 10px;
        right: 10px;
        background: rgba(0,0,0,0.95);
        color: #0f0;
        padding: 15px;
        border-radius: 10px;
        font-family: monospace;
        font-size: 12px;
        z-index: 999999;
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid #0f0;
    `;
    
    async function updateDebugInfo() {
        let info = '<b>🔧 DEBUG INFO v2.8</b><br><br>';
        info += `<b>Wallet:</b> ${walletAddress ? walletAddress.slice(0,10) + '...' : 'NOT CONNECTED'}<br>`;
        info += `<b>Connected:</b> ${walletConnected ? '✅ YES' : '❌ NO'}<br>`;
        info += `<b>CardGift Level:</b> ${currentUserLevel} (${LEVEL_NAMES[currentUserLevel] || 'Unknown'})<br>`;
        info += `<b>isMobile:</b> ${isMobile() ? '📱 YES' : '💻 NO'}<br>`;
        info += `<b>Provider:</b> ${getWeb3Provider() ? '✅ Found' : '❌ Not found'}<br>`;
        
        if (window.GlobalWayBridge && walletAddress && walletAddress !== '0xAUTHOR_MODE') {
            try {
                if (typeof GlobalWayBridge.getUserLevel === 'function') {
                    const level = await GlobalWayBridge.getUserLevel(walletAddress);
                    info += `<b>GlobalWay Level:</b> ${level} (${LEVEL_NAMES[level] || 'Unknown'})<br>`;
                }
                if (typeof GlobalWayBridge.isRegisteredInGlobalWay === 'function') {
                    const isReg = await GlobalWayBridge.isRegisteredInGlobalWay(walletAddress);
                    info += `<b>Registered in GW:</b> ${isReg ? '✅ YES' : '❌ NO'}<br>`;
                }
            } catch (e) {
                info += `<b>GlobalWay:</b> ❌ Error: ${e.message}<br>`;
            }
        }
        
        panel.innerHTML = info + '<br><button onclick="document.getElementById(\'debugPanel\').remove()" style="background:#333;color:#fff;border:none;padding:8px 15px;border-radius:5px;width:100%;">Close</button>';
    }
    
    document.body.appendChild(panel);
    updateDebugInfo();
    setInterval(updateDebugInfo, 3000);
}

window.showDebugPanel = showDebugPanel;


// ===== ЭКСПОРТ =====
window.toggleDebugPanel = toggleDebugPanel;
window.updateDebugInfo = updateDebugInfo;

console.log('🔧 Debug Module loaded');
