const { app, BrowserWindow, ipcMain, shell } = require('electron');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { imageHash } = require('image-hash');
const fs = require('fs');
const path = require('path');
const axios = require('axios');


puppeteer.use(StealthPlugin());
let win;

const createWindow = () => {
    win = new BrowserWindow({
        width: 900,
        height: 500,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false
        }
    });
    win.loadFile('index.html');
    // win.webContents.openDevTools(); // Open DevTools for debugging
}

app.on('ready', () => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('show-temp-file', (event) => {

    const Fpath = path.join(__dirname, 'temp_images');
    console.log(`Opening temp file at: ${Fpath}`);
    
    shell.openPath(Fpath).then((error) => {
        if (error) {
            console.error('Error opening temp file:', error);
        }
        });
});


ipcMain.on(`search-image`, async (event, sourceImagePath) => {
    const folderPath = path.join(__dirname, 'temp_images');
    const files = fs.readdirSync(folderPath);
    const results = [];

    imageHash(sourceImagePath, 16, true, async (error, sourceHash) => {
        if (error) return console.error(error);

        for (const file of files) {
            const currentFilePath = path.join(folderPath, file);

            const currentHash = await new Promise((resolve) => {
                imageHash(currentFilePath, 16, true, (err, hash) => {
                    if (err) resolve(null);
                    else resolve(hash);
                });
            });
            if (!currentHash) continue;

            const distance = compareHashes(sourceHash, currentHash);

            if (distance <= 50) { // Adjust threshold as needed
                results.push({
                    path: currentFilePath,
                    distance: distance
                });
            }
        }

        results.sort((a, b) => a.distance - b.distance);
        event.reply('search-results', results);
    });
});

function compareHashes(h1, h2) {
    let similarity = 0;
    for (let i = 0; i < h1.length; i++) {
        if (h1[i] !== h2[i]) similarity++;
    }
    return similarity;
}

ipcMain.on('start-scraping', async (event, { url, pageCount }) => {
    const browser = await puppeteer.launch({ headless: false, args: ['--start-maximized', '--disable-popup-blocking'] });
    
    let page = (await browser.pages())[0];
    await page.setViewport({ width: 1366, height: 768 });

    const downloadDir = path.join(__dirname, 'temp_images');
    if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);

    const targetDomainKeyword = 'erome'; 

    for (let i = 1; i <= pageCount; i++) {

        const currentUrl = i === 1 ? url : `${url}&page=${i}`;
        console.log(`Navigating to: ${currentUrl}`);

        if (page.isClosed()) {
                page = await browser.newPage();
            }

        await page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        try {
            const selector = '.enter'; // <-- Write the correct selector for the "Enter" button
            await page.waitForSelector(selector, { timeout: 3000 });
            await page.click(selector);
            await new Promise(r => setTimeout(r, 4000));

            const pages = await browser.pages(); // Tüm açık sekmeleri getir
            console.log(`tab number: ${pages.length}`);

            let correctPageFound = false;

            for (const p of pages) {
                        const pUrl = p.url();
                        
                        // Doğru siteyi bulduk mu?
                        if (pUrl.includes(targetDomainKeyword) && !pUrl.includes('google')) {
                            console.log(`Doğru sekme bulundu: ${pUrl}`);
                            page = p; // ARTIK 'page' DEĞİŞKENİ DOĞRU SEKME!
                            await page.bringToFront(); // Öne getir
                            correctPageFound = true;
                        }
                    }

                    if (!correctPageFound) {
                        console.log("Uyarı: Doğru sekme bulunamadı, mevcut sekme ile devam ediliyor.");
                    }

        } catch (e) {}

        event.reply('scrape-progress', `page ${i} scraped`);

        await autoScroll(page);

            const images = await page.evaluate(() => {
                let results = [];
                
                const albumContainers = document.querySelectorAll('.album');

                albumContainers.forEach(container => {

                    const thumbnails = container.querySelectorAll('img.album-thumbnail');

                    const limit = Math.min(thumbnails.length, 3);

                    for (let j = 0; j < limit; j++) {
                        const imgTag = thumbnails[j];

                        let imageurl = '';

                    if (imgTag) {

                        imageurl = imgTag.getAttribute('data-rotate-src') || 
                               imgTag.getAttribute('data-src') || 
                               imgTag.src;

                    } else {
                        const bg = window.getComputedStyle(el).backgroundImage;
                        imageurl = bg.replace(/url\(['"]?(.*?)['"]?\)/i, '$1');
                    }
                    
                    if (imageurl && !imageurl.includes('base64') && imageurl.length > 10) {
                        if (imageurl.startsWith('//')) {
                                imageurl = 'https:' + imageurl;
                            }
                        if (!imageurl.includes('pixel') && !imageurl.includes('blank')) {
                                results.push(imageurl);
                            }
                    }
                    }
                });
                return [...new Set(results)];
        });
        console.log(`Found ${images.length} images on page ${i}`);

        const userAgent = await browser.userAgent();
        const cookies = await page.cookies();
        const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        for (const url of images) {
            await downloadImage(url, downloadDir, userAgent, cookieHeader);
            await new Promise(r => setTimeout(r, 100));

        }
    }

    await browser.close();
    event.reply('scrape-finished', 'Tüm resimler indirildi!');
});

async function downloadImage(url, dest, userAgent, cookieHeader, retries = 3) {
    try {
        const fileName = path.basename(url).split('?')[0];
        const filePath = path.join(dest, fileName);

        if (fs.existsSync(filePath)) return;

        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            headers: {
                'Referer': 'https://www.erome.com/',
                'User-Agent': userAgent,
                'Cookie': cookieHeader,
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
            },
            timeout: 10000
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (err) {
        console.error(`Error downloading ${url}:`, err.message);
        if (retries > 0) {
            console.log(`Retrying ${url} (${3 - retries + 1}/3)`);
            await new Promise(r => setTimeout(r, 1500));
            return downloadImage(url, dest, userAgent, cookieHeader, retries - 1);
        } else {
            console.error(`Failed to download ${url} after 3 attempts.`);
        }
    }
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

            
                if (totalHeight >= scrollHeight - window.innerHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100); 
        });
    });
}