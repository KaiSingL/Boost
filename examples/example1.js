function duplicateInfoDivOnce() {
    // Find the target div (title-section + filters + gallery)
    const targetDiv = document.querySelector('div[class*="title-section"][class*="filters"][class*="gallery"]');
    
    if (!targetDiv) {
        console.warn('Target div not found.');
        return;
    }

    // Select only original divs that haven't been processed yet
    const galleryInfos = document.querySelectorAll(
        'div[class*="gallery-info"][class*="to-gall-info"]:not([data-duplicated="true"])'
    );

    if (galleryInfos.length === 0) {
        // Nothing new to duplicate (silent – runs every second)
        return;
    }

    galleryInfos.forEach(function(infoDiv) {
        // Safety: double-check this one isn't already a clone
        if (infoDiv.classList.contains('cloned-gallery-info')) return;

        // Create clone
        const clone = infoDiv.cloneNode(true);

        // Mark clone to avoid re-processing it in future runs
        clone.classList.add('cloned-gallery-info');
        if (clone.id) clone.id += '-clone';

        // Optional: remove the marker attribute from clone so it doesn't confuse logic
        clone.removeAttribute('data-duplicated');

        // Insert clone right after the targetDiv
        targetDiv.parentNode.insertBefore(clone, targetDiv.nextSibling);

        // Mark the ORIGINAL as processed so we never clone it again
        infoDiv.setAttribute('data-duplicated', 'true');

    });


}

setInterval(duplicateInfoDivOnce, 1000);



function clickAgreeButton() {
    // Find the exact button: div with both classes AND visible text "I Agree"
    const agreeButton = Array.from(
        document.querySelectorAll('div.button-agree.btn-fill')
    ).find(el => el.textContent.trim() === 'I Agree');

    if (!agreeButton) {
        console.warn('"I Agree" button not found or not visible yet.');
        return false;
    }

    // Optional: small safety check – make sure it's visible and not disabled
    const style = window.getComputedStyle(agreeButton);
    if (style.display === 'none' || style.visibility === 'hidden' || agreeButton.getAttribute('disabled')) {
        console.warn('"I Agree" button is hidden or disabled.');
        return false;
    }

    console.log('Found "I Agree" button – clicking it now.');
    agreeButton.click();  // Triggers the same event listeners the site expects

    return true;
}

const agreeInterval = setInterval(() => {
    if (clickAgreeButton()) {
        clearInterval(agreeInterval);  // Stop once clicked
        console.log('"I Agree" button successfully clicked – stopped trying.');
    }
}, 1000);



function removeAllGalleryAds() {
    let removed = 0;

    // 1. Classic ad-text span + iframe (with or without <i></i>, content, etc.)
    document.querySelectorAll('span.h2.ad-text').forEach(span => {
        // Remove the span itself
        span.remove();
        removed++;

        // Remove the immediately following iframe (if it exists)
        const sibling = span.nextElementSibling;
        if (sibling && sibling.tagName === 'IFRAME') {
            sibling.remove();
            removed++;
        }
    });

    // 2. Standalone iframes from hpawd.pornpics.com that are no longer preceded by the span
    document.querySelectorAll('iframe[src*="hpawd.pornpics.com"]').forEach(iframe => {
        const prev = iframe.previousElementSibling;
        // If the previous sibling is NOT an existing ad-text span (already removed or never existed)
        if (!prev || !prev.classList || !prev.classList.contains('ad-text')) {
            iframe.remove();
            removed++;
        }
    });

    // 3. Cam / whitelabel ads: <a class="rel-link"> containing <span class="h2"> with "Online"
    document.querySelectorAll('a.rel-link').forEach(link => {
        const h2span = link.querySelector('span.h2');
        if (h2span && h2span.textContent.includes('Online')) {
            link.remove();
            removed++;
        }
    });

    if (removed > 0) {
        console.log(`Removed ${removed} ad elements (spans, iframes, and cam links).`);
    }

    return removed;
}

setInterval(removeAllGalleryAds,1000)