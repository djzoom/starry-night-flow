// Check if image is already loaded (e.g. from cache or Base64)
if (typeof STARRY_NIGHT_B64 !== 'undefined' || image.complete) {
    init();
} else {
    // Check every 100ms for Base64 or file load
    const checkInterval = setInterval(() => {
        if (typeof STARRY_NIGHT_B64 !== 'undefined' || image.complete) {
            clearInterval(checkInterval);
            init();
        }
    }, 100);
}
