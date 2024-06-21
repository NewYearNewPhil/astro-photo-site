export default function init() {
    document.addEventListener("DOMContentLoaded", function () {
        let idleTimeout: number | undefined;

        function resetIdleTimer() {
            clearTimeout(idleTimeout);
            showIdleElements();
            idleTimeout = setTimeout(hideIdleElements, 2000);
        }

        function hideIdleElements() {
            const elements = document.querySelectorAll('.idle-hidden');
            elements.forEach(el => {
                (el as HTMLElement).style.opacity = '0';
            });
        }

        function showIdleElements() {
            const elements = document.querySelectorAll('.idle-hidden');
            elements.forEach(el => {
                (el as HTMLElement).style.opacity = '1';
            });
        }

        resetIdleTimer();
        ['scroll', 'click', 'touchstart', 'touchend', 'mousemove'].forEach(event => {
            window.addEventListener(event, resetIdleTimer, true);
        });
    });
}