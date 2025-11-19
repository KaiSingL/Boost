// browser content blocker may affect the functions
// use setInterval to bypass content blocker


function moveInfoDiv() {
    // Find the target div (first one with all three classes)
    const targetDiv = document.querySelector('div[class*="title-section"][class*="filters"][class*="gallery"]');
    
    if (!targetDiv) {
        console.warn('Target div with classes "title-section filters gallery" not found.');
        return;
    }
    
    // Find all divs with both "gallery-info" and "to-gall-info" classes
    const galleryInfos = document.querySelectorAll('div[class*="gallery-info"][class*="to-gall-info"]');
    
    // Move each one below the target (append as next sibling)
    galleryInfos.forEach(function(infoDiv) {
        targetDiv.parentNode.insertBefore(infoDiv, targetDiv.nextSibling);
    });
    
    console.log(`Moved ${galleryInfos.length} gallery-info divs below the target.`);
}

setInterval(moveInfoDiv, 1000);