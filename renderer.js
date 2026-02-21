const startBtn = document.getElementById('searchButton');
const urlInput = document.getElementById('URL');
const statusDiv = document.getElementById('status');
const searchBtn = document.getElementById('Search');
const tempFileBtn = document.getElementById('TempFile');


searchBtn.addEventListener('click', () => {
    const referenceInput = document.getElementById('reference');
    const file = referenceInput.files[0];
    if (file) {
        window.api.searchImage(file);
        console.log("Searching for similar images...");
    } else {
        alert("Please select an image to search for.");
    }
});

tempFileBtn.addEventListener('click', () => {
    window.api.showTempFile();
});

window.api.onSearchResults((matches) => {
    const resultsDiv = document.getElementById('results');  
    resultsDiv.innerHTML = '';

    if (matches.length === 0) {
        resultsDiv.innerText = 'No similar images found.';
        return;
    }

    matches.forEach(match => {
        const img = document.createElement('img');
        img.src = `file://${match.path}`;
        img.style.width = '200px';
        img.title = `difference: ${match.distance}`;
        resultsDiv.appendChild(img);
    });
});

startBtn.addEventListener('click', () => {
    const url = urlInput.value;
    if (!url) {
        alert("Please enter a URL.");
        return;
    };
    const pages = 20; 


    window.api.startScraping(url, pages);
    statusDiv.innerText = "processing...";
});


window.api.onProgress((message) => {
    statusDiv.innerText = message;
});

window.api.onFinished((message) => {
    statusDiv.innerText = message;
    alert("Scraping completed! Check the 'temp_images' folder.");
});