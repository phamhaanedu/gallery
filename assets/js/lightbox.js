console.log("Lightbox.js loaded");

// Ensure global array exists
if (typeof currentPhotos === 'undefined') {
    console.warn("currentPhotos is undefined initially");
    window.currentPhotos = [];
} else {
    console.log("currentPhotos found:", currentPhotos.length);
}

let currentIndex = 0;
let panzoomInstance = null;

function openLightbox(index) {
    console.log("openLightbox called with index:", index);

    if (!currentPhotos || currentPhotos.length === 0) {
        console.error("Error: currentPhotos is empty or undefined!", currentPhotos);
        return;
    }

    currentIndex = index;
    const photo = currentPhotos[index];
    console.log("Photo data:", photo);

    const modal = document.getElementById('lightbox-modal');
    const container = document.getElementById('lightbox-image-container');

    if (!modal) {
        console.error("Error: #lightbox-modal not found in DOM");
        return;
    }
    if (!container) {
        console.error("Error: #lightbox-image-container not found in DOM");
        return;
    }

    // Cleanup previous panzoom
    if (panzoomInstance) {
        panzoomInstance.dispose();
        panzoomInstance = null;
    }

    // Render Logic: Split vs Single
    let contentHtml = '';

    if (photo.type === 'split' && photo.src_a && photo.src_b) {
        console.log("Rendering SPLIT mode");
        contentHtml = `
            <div class="stitch-container">
                <img src="${photo.src_a}" class="half-img" draggable="false" alt="Left Part">
                <img src="${photo.src_b}" class="half-img" draggable="false" alt="Right Part">
            </div>
        `;
    } else {
        console.log("Rendering SINGLE mode");
        contentHtml = `<img src="${photo.src}" class="lightbox-img" alt="${photo.name}">`;
    }

    container.innerHTML = contentHtml;
    updateLightboxInfo(photo);

    // Show Modal
    modal.classList.add('active');
    console.log("Modal class added 'active'");
    document.body.style.overflow = 'hidden'; // Disable scroll

    // Init Panzoom (Delayed to ensure DOM render)
    setTimeout(() => {
        const target = container.firstElementChild;
        if (typeof Panzoom !== 'undefined' && target) {
            console.log("Initializing Panzoom");
            panzoomInstance = Panzoom(target, {
                maxScale: 5,
                minScale: 1,
                contain: 'outside',
            });
            target.parentElement.addEventListener('wheel', panzoomInstance.zoomWithWheel);
        } else {
            console.warn("Panzoom not loaded or target missing");
        }
    }, 50);
}

function closeLightbox() {
    const modal = document.getElementById('lightbox-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    if (panzoomInstance) {
        panzoomInstance.dispose(); // Important cleanup
        panzoomInstance = null;
    }
}

function nextPhoto() {
    if (currentIndex < currentPhotos.length - 1) {
        openLightbox(currentIndex + 1);
    }
}

function prevPhoto() {
    if (currentIndex > 0) {
        openLightbox(currentIndex - 1);
    }
}

function updateLightboxInfo(photo) {
    document.getElementById('lightbox-title').innerText = photo.name;
    document.getElementById('lightbox-counter').innerText = `${currentIndex + 1} / ${currentPhotos.length}`;
}

// Keyboard nav
document.addEventListener('keydown', (e) => {
    if (!document.getElementById('lightbox-modal').classList.contains('active')) return;

    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextPhoto();
    if (e.key === 'ArrowLeft') prevPhoto();
});

// Explicitly expose functions to global scope
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.nextPhoto = nextPhoto;
window.prevPhoto = prevPhoto;

console.log("Lightbox.js fully initialized & functions exported to window.");
