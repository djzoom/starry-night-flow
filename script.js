    const toggleBtn = document.getElementById('toggleConsole');
    const controls = document.querySelector('.controls-container');
    if (toggleBtn && controls) {
        toggleBtn.addEventListener('click', () => {
            const isCollapsed = controls.classList.toggle('collapsed');
            // Also toggle class on button for styling if needed
            toggleBtn.classList.toggle('collapsed', isCollapsed);
            toggleBtn.innerText = isCollapsed ? '☰' : '×';
        });
    }