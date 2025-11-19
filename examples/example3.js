function replaceClass(targetClass, newClass, selector = 'ul') {
    // Build a selector that finds elements containing the targetClass in their class attribute
    const elements = document.querySelectorAll(`${selector}[class*=" ${targetClass}"], ${selector}[class^=" ${targetClass}"], ${selector}[class$="${targetClass}"], ${selector}[class*="${targetClass}"]`);
    let count = 0;

    elements.forEach(el => {
        if (el.classList.contains(targetClass)) {
            // Exact full class match
            el.classList.remove(targetClass);
            el.classList.add(newClass);
            count++;
        } else {
            // Handle partial matches like col_3_2_extra, old-class--mobile, etc.
            const oldClassName = el.className;
            // Replace any word starting with targetClass followed by non-space chars
            el.className = el.className.replace(new RegExp(`\\b${targetClass}\\w*\\b`, 'g'), newClass);
            if (oldClassName !== el.className) count++;
        }
    });

    if (count > 0) {
        console.log(`Updated ${count} ${selector}(s): ${targetClass} → ${newClass}`);
    }

    return count; // Optional: returns number of changed elements
}

function setImageHeightAuto(linkClass = 'ImgA autoHeight') {
    // Target <img> elements that are direct children of <a class="...ImgA autoHeight...">
    const images = document.querySelectorAll(`a.${linkClass.split(' ').join('.')} > img`);
    let count = 0;

    images.forEach(img => {
        // Method 1: Inline style (highest specificity)
        img.style.height = 'auto';
        img.style.setProperty('height', 'auto', 'important');

        // Method 2: Also remove any fixed height attribute if present
        if (img.hasAttribute('height')) {
            img.removeAttribute('height');
        }

        // Optional: ensure width behaves nicely too (prevents stretching)
        if (!img.style.width && !img.hasAttribute('width')) {
            img.style.width = '100%';
            img.style.objectFit = 'contain'; // or 'cover' depending on your needs
        }

        count++;
    });

    if (count > 0) {
        console.log(`Forced height: auto on ${count} image(s) inside <a class="${linkClass}">`);
    } else {
        console.warn(`No images found inside <a class="${linkClass}">`);
    }

    return count;
}


function runAll(){
    replaceClass("col_3_2", "col_6_1");
    replaceClass("col_2","col_1");
    setImageHeightAuto()

}

setInterval(runAll, 1000);