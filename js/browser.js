export function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Si carga desde iOS añadimos clase especial
if (isIOS()) {
    document.documentElement.classList.add('ios');
}