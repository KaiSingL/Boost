

// Define a function to replace the src attribute
function replaceSrc() {
  // Loop through each "lazyloaded" image
  document.querySelectorAll('img.lazyloaded').forEach(function(image) {
    // Get the current src attribute
    const currentSrc = image.src;

    // Replace the "320x180/1" string with "preview"
    const newSrc = currentSrc.replace('320x180/1', 'preview');

    // Update the src attribute with the new value
    image.src = newSrc;
  });
}

// Call the replaceSrc function every 1 second
setInterval(replaceSrc, 1000);