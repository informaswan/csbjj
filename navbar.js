// navbar.js - Put this in a separate file
function initializeNavbar() {
    const dropdownParents = document.querySelectorAll(".dropdown-parent");
    const mobileToggle = document.getElementById("mobile-toggle");

    if (!dropdownParents.length) {
        console.log('Navbar elements not found, retrying...');
        // Retry after a short delay if elements aren't loaded yet
        setTimeout(initializeNavbar, 100);
        return;
    }

    console.log('Initializing navbar with', dropdownParents.length, 'dropdown parents');

    dropdownParents.forEach(parent => {
        const dropdownToggle = parent.querySelector('.dropdown-toggle');
        
        if (dropdownToggle) {
            // Remove any existing event listeners to prevent duplicates
            dropdownToggle.removeEventListener("click", handleDropdownClick);
            dropdownToggle.addEventListener("click", handleDropdownClick);
        }
    });

    function handleDropdownClick(e) {
        // Only apply this behavior on mobile view
        if (window.innerWidth <= 768) {
            e.preventDefault(); // Prevent default link behavior
            e.stopPropagation();
            
            console.log('Dropdown clicked on mobile');
            
            const parent = e.target.closest('.dropdown-parent');
            
            // Toggle current dropdown
            const isCurrentlyOpen = parent.classList.contains("dropdown-open");
            
            // Close all dropdowns first
            dropdownParents.forEach(p => {
                p.classList.remove("dropdown-open");
            });
            
            // If it wasn't open, open the current one
            if (!isCurrentlyOpen) {
                parent.classList.add("dropdown-open");
                console.log('Opening dropdown for:', parent.querySelector('.dropdown-toggle').textContent);
            }
        }
    }

    // Close dropdowns when clicking outside (only on mobile)
    document.addEventListener("click", function (e) {
        if (window.innerWidth <= 768) {
            // Check if click is outside navbar
            if (!e.target.closest('.navbar')) {
                dropdownParents.forEach(p => p.classList.remove("dropdown-open"));
            }
        }
    });

    // Close mobile menu and dropdowns when clicking on dropdown links
    const dropdownLinks = document.querySelectorAll('.dropdown a');
    dropdownLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                // Close mobile menu
                if (mobileToggle) mobileToggle.checked = false;
                // Close all dropdowns
                dropdownParents.forEach(p => p.classList.remove("dropdown-open"));
            }
        });
    });

    // Reset dropdown states when switching between mobile/desktop
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            dropdownParents.forEach(p => p.classList.remove("dropdown-open"));
            if (mobileToggle) mobileToggle.checked = false;
        }
    });

    console.log('Navbar initialization complete');
}