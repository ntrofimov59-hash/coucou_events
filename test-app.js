import http from 'http';

const PORT = 4321; // Порт, на котором обычно локально запускается Astro (или проверяем production порт/url)
// Если приложение доступно по определенному порту или локальному сайту, проверим локальный сервер или сделаем запросы к PM2 порту.
// Давайте проверим через http://127.0.0.1:4321 или настроим под запущенный процесс.

const urlsToTest = [
  '/ru',
  '/eng',
  '/ru/cities',
  '/ru/cities/yerevan',
  '/ru/all-services',
  '/robots.txt',
  '/sitemap.xml',
  '/ru/privacy'
];

console.log('🚀 Запуск экспресс-проверки ключевых страниц CouCou Events...\n');

let passed = 0;
let failed = 0;

async function checkUrl(path) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${PORT}${path}`, (res) => {
      if (res.statusCode === 200 || res.statusCode === 301 || res.statusCode === 302) {
        console.log(`✅ [${res.statusCode}] ${path}`);
        passed++;
      } else {
        console.log(`❌ [${res.statusCode}] ${path}`);
        failed++;
      }
      resolve();
    });

    req.on('error', (err) => {
      console.log(`❌ [Ошибка соединения] ${path} -> ${err.message}`);
      failed++;
      resolve();
    });
  });
}

async function runTests() {
  for (const url of urlsToTest) {
    await checkUrl(url);
  }
  
  console.log('\n-----------------------------------');
  console.log(`📊 Итоги тестирования:`);
  console.log(`   Успешно: ${passed}`);
  console.log(`   Ошибок:  ${failed}`);
  console.log('-----------------------------------\n');
  
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
