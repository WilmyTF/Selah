const API_KEY = 'AIzaSyBYyInRW3rmC6ePRcSV3mEkpCPuFqfz9dE';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];

let gapiInited = false;
let currentCategory = 'home';
let currentSubcategory = null;
let lazyLoadObserver;
let folderCache = {};

let carouselImages = [];
let carouselIndex = 0;
let carouselTimer = null;
let fotosBackgroundImages = [];
let fotosBackgroundIndex = 0;
let fotosBackgroundTimer = null;

const content = document.getElementById('content');
const loadingSpinner = document.getElementById('loadingSpinner');
const modal = document.getElementById('mediaModal');
const modalImage = document.getElementById('modalImage');
const modalVideo = document.getElementById('modalVideo');
const modalTitle = document.getElementById('modalTitle');
const closeModal = document.getElementById('closeModal');

const homeView = document.getElementById('homeView');
const fotosView = document.getElementById('fotosView');
const videosView = document.getElementById('videosView');
const fotosMediaGrid = document.getElementById('fotosMediaGrid');
const videosMediaGrid = document.getElementById('videosMediaGrid');

const FOTOS_FOLDER_ALIASES = {
    seleccionado: ['seleccionado', 'seleccionada', 'seleccionados', 'seleccionadas'],
    editada: ['editada', 'editadas'],
    sinEditar: ['sin-editar', 'sineditar', 'sin-editaras', 'sin-edicion', 'sin-edicionar']
};

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
    });
    gapiInited = true;
    content.style.display = 'block';
    initializeLazyLoading();
    await loadFolderStructure();
    showView('home');
}

function normalizeFolderName(name = '') {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[._]/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

function isMatchingAlias(name, aliases = []) {
    const normalized = normalizeFolderName(name);
    return aliases.some(alias => normalized === normalizeFolderName(alias));
}

function setFotosPath(pathLabel) {
    const pathEl = document.getElementById('fotosPath');
    if (pathEl) {
        pathEl.textContent = pathLabel;
    }
}

function findSubcategoryByAliases(category, aliases) {
    const entries = Object.entries(FOLDER_CONFIG[category]?.subcategories || {});
    const aliasSet = new Set(aliases.map(alias => normalizeFolderName(alias)));

    for (const [key, folder] of entries) {
        if (aliasSet.has(normalizeFolderName(folder.name)) || aliasSet.has(normalizeFolderName(key))) {
            return { key, ...folder };
        }
    }

    return null;
}

async function getChildFolders(parentFolderId) {
    const cacheKey = `children:${parentFolderId}`;
    if (folderCache[cacheKey]) {
        return folderCache[cacheKey];
    }

    const response = await gapi.client.drive.files.list({
        q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        pageSize: 100
    });

    folderCache[cacheKey] = response.result.files || [];
    return folderCache[cacheKey];
}

function findFolderInListByAliases(folders, aliases) {
    const aliasSet = new Set(aliases.map(alias => normalizeFolderName(alias)));
    return folders.find(folder => aliasSet.has(normalizeFolderName(folder.name))) || null;
}

async function resolveFotosFolder(target) {
    if (!FOLDER_CONFIG.fotos.folderId) {
        return null;
    }

    const aliases = FOTOS_FOLDER_ALIASES[target] || [];
    const direct = findSubcategoryByAliases('fotos', aliases);
    if (direct) {
        return {
            key: direct.key,
            folderId: direct.folderId,
            name: direct.name
        };
    }

    const imagenFolder = findSubcategoryByAliases('fotos', ['imagen', 'imagenes']);
    if (!imagenFolder) {
        return null;
    }

    const childFolders = await getChildFolders(imagenFolder.folderId);
    const nested = findFolderInListByAliases(childFolders, aliases);
    if (!nested) {
        return null;
    }

    return {
        key: normalizeFolderName(nested.name),
        folderId: nested.id,
        name: nested.name
    };
}

function renderFotosQuickAccess() {
    const subcategoryGrid = document.querySelector('#fotosView .subcategory-grid');
    if (!subcategoryGrid) return;

    subcategoryGrid.innerHTML = '';

    const shortcuts = [
        {
            label: 'Ver todo',
            onClick: () => {
                setFotosPath('Fotos / Ver todo');
                updateSubcategoryUI('fotos');
                fotosMediaGrid.innerHTML = '';
            }
        },
        {
            label: 'Editada',
            onClick: () => openFotosSpecialFolder('editada')
        },
        {
            label: 'Sin editar',
            onClick: () => openFotosSpecialFolder('sinEditar')
        }
    ];

    shortcuts.forEach(shortcut => {
        const card = document.createElement('div');
        card.className = 'subcategory-card';
        card.innerHTML = `
            <div class="folder-icon"></div>
            <div class="folder-name">${shortcut.label}</div>
        `;
        card.addEventListener('click', shortcut.onClick);
        subcategoryGrid.appendChild(card);
    });
}

async function openFotosSpecialFolder(target) {
    const resolvedFolder = await resolveFotosFolder(target);

    if (!resolvedFolder) {
        fotosMediaGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--color-dark); padding: 2rem;">No se encontró la carpeta solicitada.</p>';
        return;
    }

    currentSubcategory = resolvedFolder.key;
    setFotosPath(`Fotos / ${resolvedFolder.name}`);
    await loadMediaFromFolderRecursive('fotos', resolvedFolder.folderId);
}

async function initializeFotosLanding() {
    clearFotosBackgroundRotation();
    renderFotosQuickAccess();

    if (!FOLDER_CONFIG.fotos.folderId) {
        fotosMediaGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--color-dark); padding: 2rem;">Cargando carpeta de Fotos...</p>';
        setFotosPath('Fotos');
        return;
    }

    await Promise.all([
        openFotosSpecialFolder('seleccionado'),
        initializeFotosBackground()
    ]);
}

function clearFotosBackgroundRotation() {
    if (fotosBackgroundTimer) {
        clearInterval(fotosBackgroundTimer);
        fotosBackgroundTimer = null;
    }
    fotosBackgroundImages = [];
    fotosBackgroundIndex = 0;
    fotosView.classList.remove('has-dynamic-bg');
    fotosView.style.removeProperty('--fotos-bg-image');
}

function toBackgroundImageUrl(file) {
    if (file.thumbnailLink) {
        return file.thumbnailLink.replace(/=s\d+/, '=s1600');
    }
    return `https://drive.google.com/thumbnail?id=${file.id}&sz=w1600`;
}

function setFotosBackgroundImage(imageUrl) {
    if (!imageUrl) return;
    const safeUrl = imageUrl.replace(/'/g, '%27');
    fotosView.style.setProperty('--fotos-bg-image', `url('${safeUrl}')`);
    fotosView.classList.add('has-dynamic-bg');
}

function pickRandomItems(items, count) {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

async function initializeFotosBackground() {
    const selectedFolder = await resolveFotosFolder('seleccionado');
    if (!selectedFolder) {
        return;
    }

    const files = await collectMediaFilesRecursively(selectedFolder.folderId);
    const imageFiles = files.filter(file => file.mimeType && file.mimeType.startsWith('image/'));

    fotosBackgroundImages = pickRandomItems(imageFiles, 4).map(toBackgroundImageUrl);
    fotosBackgroundIndex = 0;

    if (!fotosBackgroundImages.length) {
        return;
    }

    setFotosBackgroundImage(fotosBackgroundImages[0]);

    if (fotosBackgroundImages.length > 1) {
        fotosBackgroundTimer = setInterval(() => {
            fotosBackgroundIndex = (fotosBackgroundIndex + 1) % fotosBackgroundImages.length;
            setFotosBackgroundImage(fotosBackgroundImages[fotosBackgroundIndex]);
        }, 30000);
    }
}

async function loadFolderStructure() {
    try {
        const response = await gapi.client.drive.files.list({
            q: `'${ROOT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            pageSize: 100
        });

        const folders = response.result.files;

        for (const folder of folders) {
            const folderName = folder.name.toLowerCase();
            if (folderName === 'fotos') {
                FOLDER_CONFIG.fotos.folderId = folder.id;
                await loadSubcategories('fotos', folder.id);
            } else if (folderName === 'videos') {
                FOLDER_CONFIG.videos.folderId = folder.id;
                await loadSubcategories('videos', folder.id);
            }
        }
    } catch (error) {
        console.error('Error loading folder structure:', error);
    }
}

async function loadSubcategories(category, folderId) {
    try {
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            pageSize: 100
        });

        const folders = response.result.files;
        
        folders.forEach(folder => {
            const key = normalizeFolderName(folder.name);
            FOLDER_CONFIG[category].subcategories[key] = {
                folderId: folder.id,
                name: folder.name
            };
            if (category === 'fotos' && isMatchingAlias(folder.name, FOTOS_FOLDER_ALIASES.seleccionado)) {
                loadCarouselImages(folder.id);
            }
        });

        updateSubcategoryUI(category);
    } catch (error) {
        console.error(`Error loading ${category} subcategories:`, error);
    }
}

async function loadCarouselImages(folderId) {
    try {
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and trashed=false and mimeType contains 'image/'`,
            fields: 'files(id, name, thumbnailLink)',
            pageSize: 50
        });

        let files = response.result.files;
        if (!files || files.length === 0) return;

        for (let i = files.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [files[i], files[j]] = [files[j], files[i]];
        }
        const selected = files.slice(0, Math.min(8, files.length));
        initCarousel(selected);
    } catch (error) {
        console.error('Error loading carousel images:', error);
    }
}

function initCarousel(images) {
    carouselImages = images;
    carouselIndex = 0;

    const track = document.getElementById('carouselTrack');
    const dotsContainer = document.getElementById('carouselDots');
    track.innerHTML = '';
    dotsContainer.innerHTML = '';

    images.forEach((file, i) => {
        const slide = document.createElement('div');
        slide.className = 'carousel-slide' + (i === 0 ? ' active' : '');

        const imgUrl = file.thumbnailLink
            ? file.thumbnailLink.replace(/=s\d+/, '=s1600')
            : `https://drive.google.com/thumbnail?id=${file.id}&sz=w1600`;

        slide.innerHTML = `
            <div class="carousel-slide-bg" style="background-image: url('${imgUrl}')"></div>
            <img src="${imgUrl}" alt="Slide ${i + 1}" loading="lazy">
            <div class="carousel-slide-overlay"></div>
        `;
        track.appendChild(slide);

        const dot = document.createElement('button');
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
    });

    goToSlide(0);
    startCarouselTimer();
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    if (!slides.length) return;

    slides[carouselIndex]?.classList.remove('active');
    dots[carouselIndex]?.classList.remove('active');

    carouselIndex = (index + carouselImages.length) % carouselImages.length;

    document.getElementById('carouselTrack').style.transform = `translateX(-${carouselIndex * 100}%)`;
    slides[carouselIndex]?.classList.add('active');
    dots[carouselIndex]?.classList.add('active');
}

function startCarouselTimer() {
    if (carouselTimer) clearInterval(carouselTimer);
    carouselTimer = setInterval(() => goToSlide(carouselIndex + 1), 4500);
}

function updateSubcategoryUI(category) {
    const viewId = category === 'fotos' ? 'fotosView' : 'videosView';
    const subcategoryGrid = document.querySelector(`#${viewId} .subcategory-grid`);
    
    if (!subcategoryGrid) return;
    
    subcategoryGrid.innerHTML = '';
    
    Object.entries(FOLDER_CONFIG[category].subcategories).forEach(([key, folder]) => {
        const card = document.createElement('div');
        card.className = 'subcategory-card';
        card.setAttribute('data-folder', key);
        card.innerHTML = `
            <div class="folder-icon"></div>
            <div class="folder-name">${escapeHtml(folder.name)}</div>
        `;
        card.addEventListener('click', async () => {
            currentSubcategory = key;
            if (category === 'fotos') {
                setFotosPath(`Fotos / ${folder.name}`);
            }
            await checkForSubfolders(category, folder.name, folder.folderId);
        });
        subcategoryGrid.appendChild(card);
    });
}

async function checkForSubfolders(category, subcategoryKey, folderId) {
    try {
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            pageSize: 100
        });

        const subfolders = response.result.files;
        
        if (subfolders && subfolders.length > 0) {
            showSubfolders(category, subcategoryKey, subfolders, folderId);
        } else {
            loadMediaFromFolder(category, folderId, subcategoryKey);
        }
    } catch (error) {
        console.error('Error checking for subfolders:', error);
        loadMediaFromFolder(category, folderId, subcategoryKey);
    }
}

function showSubfolders(category, parentKey, subfolders, parentFolderId) {
    const viewId = category === 'fotos' ? 'fotosView' : 'videosView';
    const subcategoryGrid = document.querySelector(`#${viewId} .subcategory-grid`);
    const mediaGrid = category === 'fotos' ? fotosMediaGrid : videosMediaGrid;
    
    subcategoryGrid.innerHTML = '';
    mediaGrid.innerHTML = '';
    
    const backCard = document.createElement('div');
    backCard.className = 'subcategory-card back-card';
    backCard.innerHTML = `
        <div class="folder-icon"></div>
        <div class="folder-name">← Volver</div>
    `;
    backCard.addEventListener('click', () => {
        updateSubcategoryUI(category);
        mediaGrid.innerHTML = '';
    });
    subcategoryGrid.appendChild(backCard);
    
    subfolders.forEach(folder => {
        const card = document.createElement('div');
        card.className = 'subcategory-card';
        card.innerHTML = `
            <div class="folder-icon"></div>
            <div class="folder-name">${escapeHtml(folder.name)}</div>
        `;
        card.addEventListener('click', () => {
            if (category === 'fotos') {
                setFotosPath(`Fotos / ${folder.name}`);
            }
            loadMediaFromFolder(category, folder.id, folder.name);
        });
        subcategoryGrid.appendChild(card);
    });
    
    if (parentFolderId) {
        loadMediaFromFolder(category, parentFolderId, parentKey);
    }
}

async function listMediaFilesInFolder(folderId) {
    const response = await gapi.client.drive.files.list({
        q: `'${folderId}' in parents and trashed=false and (mimeType contains 'image/' or mimeType contains 'video/')`,
        fields: 'files(id, name, mimeType, thumbnailLink, webContentLink, webViewLink)',
        pageSize: 100,
        orderBy: 'name'
    });

    return response.result.files || [];
}

async function collectMediaFilesRecursively(folderId, visited = new Set()) {
    if (visited.has(folderId)) {
        return [];
    }
    visited.add(folderId);

    const [files, childFolders] = await Promise.all([
        listMediaFilesInFolder(folderId),
        getChildFolders(folderId)
    ]);

    const nestedCollections = await Promise.all(
        childFolders.map(child => collectMediaFilesRecursively(child.id, visited))
    );

    return files.concat(...nestedCollections);
}

async function loadMediaFromFolderRecursive(category, folderId) {
    showLoading(true);
    const targetGrid = category === 'fotos' ? fotosMediaGrid : videosMediaGrid;
    targetGrid.innerHTML = '';

    try {
        const files = await collectMediaFilesRecursively(folderId);
        files.sort((a, b) => a.name.localeCompare(b.name, 'es'));

        if (!files || files.length === 0) {
            targetGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--color-dark); padding: 2rem;">No se encontraron archivos en esta carpeta.</p>';
            showLoading(false);
            return;
        }

        await loadMediaProgressively(files, targetGrid);
    } catch (error) {
        console.error('Error loading recursive media:', error);
        targetGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--color-dark); padding: 2rem;">Error al cargar el contenido: ' + error.message + '</p>';
    }

    showLoading(false);
}

async function loadMediaFromFolder(category, folderId, folderName) {
    showLoading(true);
    const targetGrid = category === 'fotos' ? fotosMediaGrid : videosMediaGrid;
    targetGrid.innerHTML = '';

    try {
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and trashed=false and (mimeType contains 'image/' or mimeType contains 'video/')`,
            fields: 'files(id, name, mimeType, thumbnailLink, webContentLink, webViewLink)',
            pageSize: 100,
            orderBy: 'name'
        });

        const files = response.result.files;
        
        if (!files || files.length === 0) {
            targetGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--color-dark); padding: 2rem;">No se encontraron archivos en esta carpeta.</p>';
            showLoading(false);
            return;
        }

        await loadMediaProgressively(files, targetGrid);

    } catch (error) {
        console.error('Error loading media:', error);
        targetGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--color-dark); padding: 2rem;">Error al cargar el contenido: ' + error.message + '</p>';
    }

    showLoading(false);
}

function initializeLazyLoading() {
    if (lazyLoadObserver) {
        lazyLoadObserver.disconnect();
    }

    const options = {
        root: null,
        rootMargin: '50px',
        threshold: 0.01
    };

    lazyLoadObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.getAttribute('data-src');
                if (src) {
                    img.src = src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            }
        });
    }, options);
}

function showView(view) {
    homeView.style.display = 'none';
    fotosView.style.display = 'none';
    videosView.style.display = 'none';

    const heroSection = document.getElementById('heroSection');

    if (view !== 'fotos') {
        clearFotosBackgroundRotation();
    }

    if (view === 'home') {
        homeView.style.display = 'block';
        if (heroSection) heroSection.style.display = 'block';
    } else {
        if (heroSection) heroSection.style.display = 'none';
        if (view === 'fotos') {
            fotosView.style.display = 'block';
            initializeFotosLanding();
        }
        else if (view === 'videos') videosView.style.display = 'block';
    }

    currentCategory = view;
    setActiveNavLink(view);
}

async function loadCategoryMedia(category, subcategory) {
    showLoading(true);
    const targetGrid = category === 'fotos' ? fotosMediaGrid : videosMediaGrid;
    targetGrid.innerHTML = '';

    let folderId;
    if (subcategory && FOLDER_CONFIG[category]?.subcategories[subcategory]) {
        folderId = FOLDER_CONFIG[category].subcategories[subcategory].folderId;
    } else if (FOLDER_CONFIG[category]) {
        folderId = FOLDER_CONFIG[category].folderId;
    } else {
        targetGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--color-dark); padding: 2rem;">Cargando estructura de carpetas...</p>';
        showLoading(false);
        return;
    }

    if (!folderId) {
        targetGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--color-dark); padding: 2rem;">Carpeta no encontrada.</p>';
        showLoading(false);
        return;
    }

    try {
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and trashed=false and (mimeType contains 'image/' or mimeType contains 'video/')`,
            fields: 'files(id, name, mimeType, thumbnailLink, webContentLink, webViewLink)',
            pageSize: 100,
            orderBy: 'name'
        });

        const files = response.result.files;
        
        if (!files || files.length === 0) {
            targetGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--color-dark); padding: 2rem;">No se encontraron archivos en esta carpeta.</p>';
            showLoading(false);
            return;
        }

        await loadMediaProgressively(files, targetGrid);

    } catch (error) {
        console.error('Error loading Drive content:', error);
        targetGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--color-dark); padding: 2rem;">Error al cargar el contenido: ' + error.message + '</p>';
    }

    showLoading(false);
}

async function loadMediaProgressively(files, targetGrid) {
    const BATCH_SIZE = 10;
    const BATCH_DELAY = 300;
    
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        
        batch.forEach((file, index) => {
            const mediaNumber = i + index + 1;
            const mediaCard = createMediaCard(file, mediaNumber);
            targetGrid.appendChild(mediaCard);
        });
        
        if (i + BATCH_SIZE < files.length) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
    }
}


function createMediaCard(file, mediaNumber) {
    const card = document.createElement('div');
    card.className = 'media-card';
    
    const isVideo = file.mimeType.startsWith('video/');
    let thumbnailUrl = file.thumbnailLink;
    
    // Mejoramos la resolución si Google nos dio un thumbnail
    if (thumbnailUrl) {
        thumbnailUrl = thumbnailUrl.replace('=s220', '=s400');
    } else if (!isVideo) {
        // Si es foto y Drive falló al dar thumbnail, forzamos la carga por API
        thumbnailUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${API_KEY}`;
    }
    
    const placeholderSvg = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 220"%3E%3Crect fill="%23F5E6D3" width="280" height="220"/%3E%3C/svg%3E';
    
    // Agregué un pequeño icono de "Play" (▶️) visual para que se note qué archivos son videos
    card.innerHTML = `
        <div class="media-thumbnail-container" style="position:relative;">
            <img data-src="${thumbnailUrl || placeholderSvg}" alt="${file.name}" class="media-thumbnail" src="${placeholderSvg}">
            <div class="media-number">${mediaNumber}</div>
            ${isVideo ? '<div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:3rem; opacity:0.8;">▶️</div>' : ''}
        </div>
    `;
    
    const img = card.querySelector('img');
    
    if (lazyLoadObserver && thumbnailUrl) {
        lazyLoadObserver.observe(img);
    }
    
    card.addEventListener('click', () => {
        openMediaModal(file);
    });
    
    return card;
}

async function openMediaModal(file) {
    const isVideo = file.mimeType.startsWith('video/');
    modalTitle.textContent = file.name;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    if (isVideo) {
        modalImage.style.display = 'none';
        modalVideo.style.display = 'block';
        
        // Solución Video: Insertamos el iframe dentro del nuevo DIV
        const videoUrl = `https://drive.google.com/file/d/${file.id}/preview`;
        modalVideo.innerHTML = `<iframe src="${videoUrl}" width="100%" height="100%" style="border:none; min-height:60vh;" allow="autoplay"></iframe>`;
    } else {
        modalVideo.style.display = 'none';
        modalImage.style.display = 'block';
        modalImage.src = '';
        
        // Solución Imagen: Usamos la API oficial en lugar del enlace "uc?export=view"
        const imageUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${API_KEY}`;
        
        modalImage.onload = () => console.log('Imagen cargada');
        modalImage.onerror = () => {
            if (file.thumbnailLink) modalImage.src = file.thumbnailLink.replace('=s220', '=s1600');
        };
        
        modalImage.src = imageUrl;
    }
}

function closeMediaModal() {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    modalImage.src = '';
    modalVideo.innerHTML = '';
}


function showLoading(show) {
    loadingSpinner.style.display = show ? 'block' : 'none';
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

closeModal.addEventListener('click', closeMediaModal);

modal.querySelector('.modal-overlay').addEventListener('click', closeMediaModal);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeMediaModal();
    }
});

document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const category = btn.getAttribute('data-category');
        showView(category);
    });
});

document.querySelectorAll('.nav-link').forEach(btn => {
    btn.addEventListener('click', () => {
        const category = btn.getAttribute('data-category');
        showView(category);
    });
});

document.getElementById('brandLogo').addEventListener('click', () => {
    showView('home');
});

function setActiveNavLink(category) {
    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-category') === category);
    });
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-category') === category);
    });
}

document.getElementById('carouselPrev').addEventListener('click', () => {
    clearInterval(carouselTimer);
    goToSlide(carouselIndex - 1);
    startCarouselTimer();
});

document.getElementById('carouselNext').addEventListener('click', () => {
    clearInterval(carouselTimer);
    goToSlide(carouselIndex + 1);
    startCarouselTimer();
});

document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
        const category = card.getAttribute('data-navigate');
        showView(category);
    });
});

document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => {
        const backTo = btn.getAttribute('data-back');
        if (backTo === 'home') {
            showView('home');
            currentSubcategory = null;
        }
    });
});

window.addEventListener('load', () => {
    gapi.load('client', initializeGapiClient);
});
