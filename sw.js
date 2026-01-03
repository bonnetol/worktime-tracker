/**
 * ============================================
 * BTONE - Service Worker
 * ============================================
 * 
 * Service Worker - это скрипт, который работает в фоне,
 * отдельно от веб-страницы. Он позволяет:
 * 
 * 1. Кэшировать файлы для офлайн-работы
 * 2. Перехватывать сетевые запросы
 * 3. Отправлять push-уведомления
 * 
 * ЖИЗНЕННЫЙ ЦИКЛ SERVICE WORKER:
 * 1. install - установка (кэширование файлов)
 * 2. activate - активация (очистка старого кэша)
 * 3. fetch - перехват запросов
 * 
 * ============================================
 */


// ============================================
// НАСТРОЙКИ КЭША
// ============================================

// Название кэша (меняйте при обновлении приложения)
const CACHE_NAME = 'btone-cache-v1';

// Список файлов для кэширования
// Эти файлы будут доступны офлайн
const FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/firebase-config.js',
    '/manifest.json',
    '/images/icon-192.png',
    '/images/icon-512.png'
];


// ============================================
// СОБЫТИЕ INSTALL (Установка)
// ============================================
// 
// Вызывается когда Service Worker устанавливается.
// Здесь мы кэшируем все необходимые файлы.

self.addEventListener('install', (event) => {
    console.log('[SW] Установка Service Worker');
    
    // waitUntil говорит браузеру дождаться завершения операции
    event.waitUntil(
        // Открываем кэш
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Кэширование файлов');
                // Добавляем все файлы в кэш
                return cache.addAll(FILES_TO_CACHE);
            })
            .then(() => {
                console.log('[SW] Файлы закэшированы');
                // Сразу активируем новый Service Worker
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Ошибка кэширования:', error);
            })
    );
});


// ============================================
// СОБЫТИЕ ACTIVATE (Активация)
// ============================================
// 
// Вызывается когда Service Worker активируется.
// Здесь мы удаляем старые версии кэша.

self.addEventListener('activate', (event) => {
    console.log('[SW] Активация Service Worker');
    
    event.waitUntil(
        // Получаем список всех кэшей
        caches.keys()
            .then((cacheNames) => {
                // Удаляем старые кэши
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Если кэш не текущий - удаляем
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] Удаление старого кэша:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Активирован');
                // Захватываем контроль над всеми страницами
                return self.clients.claim();
            })
    );
});


// ============================================
// СОБЫТИЕ FETCH (Перехват запросов)
// ============================================
// 
// Вызывается при каждом сетевом запросе.
// Мы можем отдать файл из кэша или загрузить из сети.

self.addEventListener('fetch', (event) => {
    // Получаем URL запроса
    const requestUrl = new URL(event.request.url);
    
    // Пропускаем запросы к Firebase и другим внешним сервисам
    // Они должны всегда идти через сеть
    if (
        requestUrl.origin.includes('firebase') ||
        requestUrl.origin.includes('googleapis') ||
        requestUrl.origin.includes('gstatic')
    ) {
        return;
    }
    
    // Стратегия: сначала сеть, потом кэш (Network First)
    // Это лучше для приложений, где важна актуальность данных
    event.respondWith(
        // Пытаемся загрузить из сети
        fetch(event.request)
            .then((response) => {
                // Если ответ успешный
                if (response.status === 200) {
                    // Клонируем ответ (его можно прочитать только один раз)
                    const responseClone = response.clone();
                    
                    // Сохраняем в кэш для офлайн-доступа
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                }
                
                return response;
            })
            .catch(() => {
                // Если сеть недоступна - ищем в кэше
                return caches.match(event.request)
                    .then((response) => {
                        if (response) {
                            return response;
                        }
                        
                        // Если файла нет в кэше и это HTML-запрос,
                        // отдаём главную страницу (для SPA)
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});


// ============================================
// ОБРАБОТКА PUSH-УВЕДОМЛЕНИЙ (для будущего)
// ============================================

self.addEventListener('push', (event) => {
    console.log('[SW] Push-уведомление получено');
    
    // Данные уведомления
    const data = event.data ? event.data.json() : {};
    
    // Параметры уведомления
    const options = {
        body: data.body || 'Новое уведомление',
        icon: '/images/icon-192.png',
        badge: '/images/icon-72.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        }
    };
    
    // Показываем уведомление
    event.waitUntil(
        self.registration.showNotification(data.title || 'BTONE', options)
    );
});


// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Клик по уведомлению');
    
    // Закрываем уведомление
    event.notification.close();
    
    // Открываем приложение
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});
