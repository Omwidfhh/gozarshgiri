const themeToggle =
    document.getElementById("themeToggle");

const themeToggleIcon =
    document.getElementById("themeToggleIcon");

const themeToggleText =
    document.getElementById("themeToggleText");

const THEME_STORAGE_KEY =
    "royal-jeans-theme";


function getCurrentTheme() {
    return (
        document.documentElement.dataset.theme ===
        "dark"
    )
        ? "dark"
        : "light";
}


function updateThemeButton(theme) {
    const isDark = theme === "dark";

    themeToggle.setAttribute(
        "aria-pressed",
        String(isDark),
    );

    themeToggle.setAttribute(
        "aria-label",
        isDark
            ? "فعال‌کردن تم روشن"
            : "فعال‌کردن تم تیره",
    );

    themeToggleIcon.textContent =
        isDark ? "☀" : "☾";

    themeToggleText.textContent =
        isDark ? "تم روشن" : "تم تیره";
}


function setTheme(theme) {
    const finalTheme = (
        theme === "dark"
    )
        ? "dark"
        : "light";

    document.documentElement.dataset.theme =
        finalTheme;

    updateThemeButton(finalTheme);

    try {
        localStorage.setItem(
            THEME_STORAGE_KEY,
            finalTheme,
        );
    } catch (error) {
        console.warn(
            "ذخیره تم مرورگر امکان‌پذیر نیست.",
            error,
        );
    }
}


themeToggle.addEventListener(
    "click",
    () => {
        const nextTheme = (
            getCurrentTheme() === "dark"
        )
            ? "light"
            : "dark";

        setTheme(nextTheme);
    },
);


updateThemeButton(
    getCurrentTheme()
);


const headerClock =
    document.getElementById("headerClock");

const serverStatus =
    document.getElementById("serverStatus");

const serverStatusText =
    document.getElementById("serverStatusText");

const PERSIAN_DIGITS =
    "۰۱۲۳۴۵۶۷۸۹";


function convertToPersianDigits(value) {
    return String(value).replace(
        /\d/g,
        (digit) => PERSIAN_DIGITS[Number(digit)],
    );
}


function updateHeaderClock() {
    if (!headerClock) {
        return;
    }

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    headerClock.textContent = convertToPersianDigits(
        `${hours}:${minutes}`,
    );

    headerClock.dateTime = now.toISOString();
}


async function updateServerStatus() {
    if (!serverStatus || !serverStatusText) {
        return;
    }

    try {
        const response = await fetch(
            "/health",
            {
                cache: "no-store",
            },
        );

        if (!response.ok) {
            throw new Error("Server is unavailable");
        }

        serverStatus.classList.remove("is-offline");
        serverStatusText.textContent = "سرور آماده";
    } catch (error) {
        serverStatus.classList.add("is-offline");
        serverStatusText.textContent = "ارتباط قطع است";
    }
}


updateHeaderClock();
updateServerStatus();

window.setInterval(
    updateHeaderClock,
    30000,
);

window.setInterval(
    updateServerStatus,
    45000,
);


function loadStartupAndSuccessEffects() {
    if (document.querySelector("script[data-startup-success]")) {
        return;
    }

    const script = document.createElement("script");

    script.src = "/static/startup-success.js?v=1";
    script.dataset.startupSuccess = "true";
    script.defer = true;

    document.body.appendChild(script);
}


loadStartupAndSuccessEffects();


function loadToolPreview() {
    if (document.querySelector("script[data-tool-preview]")) {
        return;
    }

    const script = document.createElement("script");

    script.src = "/static/tool-preview.js?v=1";
    script.dataset.toolPreview = "true";
    script.defer = true;

    document.body.appendChild(script);
}


loadToolPreview();


function loadUploadChamber() {
    if (document.querySelector("script[data-upload-chamber]")) {
        return;
    }

    const script = document.createElement("script");

    script.src = "/static/upload-chamber.js?v=1";
    script.dataset.uploadChamber = "true";
    script.defer = true;

    document.body.appendChild(script);
}


loadUploadChamber();


function loadCustomReportBuilder() {
    if (document.querySelector("script[data-custom-builder]")) {
        return;
    }

    const script = document.createElement("script");

    script.src = "/static/custom-builder.js?v=1";
    script.dataset.customBuilder = "true";
    script.defer = true;

    document.body.appendChild(script);
}


loadCustomReportBuilder();
