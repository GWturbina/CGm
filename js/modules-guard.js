/* =====================================================
   MODULES LOADER GUARD v1.0
   Предотвращает повторную загрузку модулей
   
   ДОЛЖЕН БЫТЬ ЗАГРУЖЕН ПЕРВЫМ!
   Добавь в <head> до всех остальных скриптов:
   <script src="js/modules-guard.js"></script>
   ===================================================== */

(function() {
    'use strict';
    
    // Список загруженных модулей
    window.__loadedModules = window.__loadedModules || {};
    
    // Функция проверки - можно ли загружать модуль
    window.canLoadModule = function(moduleName) {
        if (window.__loadedModules[moduleName]) {
            console.log(`⏭️ Module "${moduleName}" already loaded, skipping`);
            return false;
        }
        window.__loadedModules[moduleName] = true;
        console.log(`📦 Loading module: ${moduleName}`);
        return true;
    };
    
    // Защита глобальных переменных от переопределения
    const protectedVars = [
        'VirtualAssistant',
        'AssistantUI', 
        'AssistantInit',
        'LessonsData',
        'LessonsDataV2',
        'ContentFilter',
        'SupabaseClient'
    ];
    
    // Сохраняем оригинальные значения
    const originals = {};
    
    protectedVars.forEach(varName => {
        if (window[varName] !== undefined) {
            originals[varName] = window[varName];
        }
    });
    
    // Переопределяем Object.defineProperty для защиты
    const originalDefineProperty = Object.defineProperty;
    
    Object.defineProperty = function(obj, prop, descriptor) {
        // Если пытаются переопределить защищённую переменную на window
        if (obj === window && protectedVars.includes(prop)) {
            if (originals[prop] !== undefined) {
                console.warn(`⚠️ Blocked redefinition of window.${prop}`);
                return obj;
            }
            // Сохраняем первое определение
            originals[prop] = descriptor.value;
        }
        
        return originalDefineProperty.call(Object, obj, prop, descriptor);
    };
    
    console.log('🛡️ Modules Guard v1.0 loaded - protecting against duplicates');
    
})();
