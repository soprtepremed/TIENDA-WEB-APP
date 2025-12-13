document.addEventListener('DOMContentLoaded', () => {
    // Check auth
    if (typeof checkAuth === 'function') {
        checkAuth();
    }

    // Mock Data for Videos
    const videosData = [
        {
            id: 1,
            title: "Introducción a la Plataforma",
            description: "Un recorrido completo por las funcionalidades principales del sistema de gestión Cafe Premed. Aprende a navegar por los módulos de ventas, reportes y asistencia.",
            thumbnail: "https://via.placeholder.com/640x360/1B3A6B/FFFFFF?text=Intro+Plataforma",
            url: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Placeholder URL
            duration: "12:45",
            date: "2025-12-10",
            category: "capacitacion",
            isNew: true
        },
        {
            id: 2,
            title: "Gestión de Inventario Avanzada",
            description: "Tutorial detallado sobre cómo manejar el stock, realizar ajustes de inventario y configurar alertas de stock mínimo para evitar desabastecimiento.",
            thumbnail: "https://via.placeholder.com/640x360/D4AF37/1B3A6B?text=Inventario",
            url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            duration: "08:20",
            date: "2025-12-08",
            category: "tutoriales",
            isNew: false
        },
        {
            id: 3,
            title: "Reunión Mensual - Diciembre",
            description: "Grabación de la reunión mensual de equipo donde se discutieron los objetivos para el cierre de año y las nuevas implementaciones.",
            thumbnail: "https://via.placeholder.com/640x360/0F2847/FFFFFF?text=Reunion+Dic",
            url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            duration: "45:00",
            date: "2025-12-01",
            category: "reuniones",
            isNew: false
        },
        {
            id: 4,
            title: "Cómo registrar nuevos alumnos",
            description: "Guía paso a paso para el alta de nuevos alumnos en el sistema, incluyendo la carga de documentos y asignación de grupos.",
            thumbnail: "https://via.placeholder.com/640x360/2A4A7C/FFFFFF?text=Registro+Alumnos",
            url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            duration: "05:15",
            date: "2025-11-28",
            category: "tutoriales",
            isNew: false
        }
    ];

    const videosGrid = document.getElementById('videosGrid');
    const mainVideoSection = document.getElementById('mainVideoSection');
    const categoryButtons = document.querySelectorAll('.category-pill');

    // Initial Render
    renderVideos(videosData);

    // Filter Logic
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            categoryButtons.forEach(b => b.classList.remove('active'));
            // Add to clicked
            btn.classList.add('active');

            const category = btn.dataset.category;
            const filteredVideos = category === 'all'
                ? videosData
                : videosData.filter(v => v.category === category);

            renderVideos(filteredVideos);
        });
    });

    function renderVideos(videos) {
        videosGrid.innerHTML = '';

        if (videos.length === 0) {
            videosGrid.innerHTML = '<p class="empty-state-text">No se encontraron videos en esta categoría.</p>';
            return;
        }

        videos.forEach(video => {
            const card = document.createElement('div');
            card.className = 'video-card';
            card.onclick = () => playVideo(video);

            card.innerHTML = `
                <div class="video-thumbnail-wrapper">
                    <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail">
                    <span class="video-duration">${video.duration}</span>
                    <div class="play-icon-overlay">▶</div>
                </div>
                <div class="video-card-content">
                    <h4 class="video-card-title">${video.title}</h4>
                    <div class="video-card-meta">
                        <span style="text-transform: capitalize;">${video.category}</span>
                        ${video.isNew ? `
                        <div class="video-status">
                            <span class="status-indicator status-new"></span> Nuevo
                        </div>` : ''}
                    </div>
                </div>
            `;
            videosGrid.appendChild(card);
        });
    }

    function playVideo(video) {
        // Show player section if hidden
        mainVideoSection.classList.remove('hidden');

        // Update Content
        document.getElementById('mainVideoFrame').src = video.url;
        document.getElementById('mainVideoTitle').textContent = video.title;
        document.getElementById('mainVideoDate').textContent = formatDate(video.date);
        document.getElementById('mainVideoDuration').textContent = video.duration;
        document.getElementById('mainVideoDescription').textContent = video.description;

        // Scroll to player
        mainVideoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('es-ES', options);
    }
});
