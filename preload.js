const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
    startScraping: (url, pageCount) => ipcRenderer.send('start-scraping', { url, pageCount }),
    onProgress: (callback) => ipcRenderer.on('scrape-progress', (event, data) => callback(data)),
    onFinished: (callback) => ipcRenderer.on('scrape-finished', (event, data) => callback(data)),
    searchImage: (file) => { 
        const filePath = webUtils.getPathForFile(file);
        ipcRenderer.send('search-image', filePath);
    },
    onSearchResults: (callback) => ipcRenderer.on('search-results', (event, data) => callback(data)),
    showTempFile: () => ipcRenderer.send('show-temp-file')
});