function createStartupSplash() {
    const oldSplash = document.getElementById("appSplash");

    if (oldSplash) {
        return oldSplash;
    }

    const splash = document.createElement("div");

    splash.className = "app-splash";
    splash.id = "appSplash";
    splash.setAttribute("role", "status");
    splash.setAttribute("aria-live", "polite");
    splash.setAttribute(
        "aria-label",
        "در حال آماده‌سازی ابزارهای گزارش‌گیری",
    );

    splash.innerHTML = `
        <div
            class="app-splash-texture"
            aria-hidden="true"
        ></div>

        <div class="app-splash-content">
            <div class="app-splash-logo-stage">
                <span
                    class="app-splash-ring ring-one"
                    aria-hidden="true"
                ></span>

                <span
                    class="app-splash-ring ring-two"
                    aria-hidden="true"
                ></span>

                <span
                    class="app-splash-glow"
                    aria-hidden="true"
                ></span>

                <img
                    class="app-splash-logo"
                    src="/static/royal-jeans-logo.png?v=1"
                    alt="Royal Jeans"
                    width="180"
                    height="180"
                >
            </div>

            <div class="app-splash-copy">
                <span class="app-splash-eyebrow">
                    ROYAL JEANS
                </span>

                <strong>
                    ابزارهای گزارش‌گیری
                </strong>

                <small id="appSplashStatus">
                    در حال آماده‌سازی محیط...
                </small>
            </div>

            <div
                class="app-splash-progress"
                aria-hidden="true"
            >
                <span id="appSplashProgress"></span>
            </div>
        </div>
    `;

    document.body.prepend(splash);
    return splash;
}


const splashElement = createStartupSplash();
const splashStatus = document.getElementById("appSplashStatus");
const splashProgress = document.getElementById("appSplashProgress");
const successMessageBox = document.getElementById("messageBox");
const successUploadForm = document.getElementById("uploadForm");

const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
);

let selectedSuccessCard = null;
let successRunId = null;
let handledSuccessRunId = null;


function setSplashStage(progress, message) {
    if (splashProgress) {
        splashProgress.style.width = `${progress}%`;
    }

    if (splashStatus) {
        splashStatus.style.opacity = "0";

        window.setTimeout(() => {
            splashStatus.textContent = message;
            splashStatus.style.opacity = "1";
        }, 130);
    }
}


function finishSplash() {
    if (!splashElement || splashElement.classList.contains("is-leaving")) {
        return;
    }

    setSplashStage(100, "همه‌چیز آماده است");
    splashElement.classList.add("is-ready");

    const leaveDelay = prefersReducedMotion.matches
        ? 80
        : 420;

    window.setTimeout(() => {
        splashElement.classList.add("is-leaving");

        window.setTimeout(() => {
            splashElement.remove();
        }, prefersReducedMotion.matches ? 140 : 680);
    }, leaveDelay);
}


function startSplashSequence() {
    if (!splashElement) {
        return;
    }

    if (prefersReducedMotion.matches) {
        finishSplash();
        return;
    }

    setSplashStage(24, "در حال آماده‌سازی محیط...");

    window.setTimeout(() => {
        setSplashStage(58, "در حال بارگذاری ابزارها...");
    }, 430);

    window.setTimeout(() => {
        setSplashStage(84, "در حال آماده‌سازی داشبورد...");
    }, 900);

    window.setTimeout(finishSplash, 1450);
}


function createSuccessCheck() {
    const namespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(namespace, "svg");
    const path = document.createElementNS(namespace, "path");

    svg.classList.add("professional-success-check");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");

    path.setAttribute("d", "m5 12 4 4L19 6");
    svg.appendChild(path);

    return svg;
}


function createSuccessParticles() {
    const particles = document.createElement("span");
    particles.className = "professional-success-particles";
    particles.setAttribute("aria-hidden", "true");

    for (let index = 0; index < 8; index += 1) {
        particles.appendChild(document.createElement("i"));
    }

    return particles;
}


function playProfessionalSuccess(card) {
    if (!card) {
        return;
    }

    const icon = card.querySelector(".tool-icon");
    if (!icon) {
        return;
    }

    card.querySelectorAll(".professional-success-effect").forEach(
        (element) => element.remove(),
    );

    card.classList.remove("professional-success");

    const originalIconMarkup = icon.innerHTML;
    const waveOne = document.createElement("span");
    const waveTwo = document.createElement("span");
    const sweep = document.createElement("span");
    const label = document.createElement("span");
    const particles = createSuccessParticles();

    waveOne.className = (
        "professional-success-effect "
        + "professional-success-wave wave-one"
    );

    waveTwo.className = (
        "professional-success-effect "
        + "professional-success-wave wave-two"
    );

    sweep.className = (
        "professional-success-effect "
        + "professional-success-sweep"
    );

    label.className = (
        "professional-success-effect "
        + "professional-success-label"
    );
    label.textContent = "گزارش آماده شد";

    particles.classList.add("professional-success-effect");

    icon.replaceChildren(createSuccessCheck());
    card.append(
        waveOne,
        waveTwo,
        sweep,
        particles,
        label,
    );

    requestAnimationFrame(() => {
        card.classList.add("professional-success");
    });

    window.setTimeout(() => {
        card.classList.remove("professional-success");
        icon.innerHTML = originalIconMarkup;

        card.querySelectorAll(".professional-success-effect").forEach(
            (element) => element.remove(),
        );
    }, 2900);
}


function handleProfessionalSuccess() {
    const completed = successMessageBox
        && successMessageBox.classList.contains("success");

    if (
        !completed
        || successRunId === null
        || handledSuccessRunId === successRunId
    ) {
        return;
    }

    handledSuccessRunId = successRunId;
    playProfessionalSuccess(selectedSuccessCard);
}


document.addEventListener(
    "click",
    (event) => {
        const card = event.target.closest(
            ".tool-card:not(:disabled)",
        );

        if (card) {
            selectedSuccessCard = card;
        }
    },
    true,
);


if (successUploadForm) {
    successUploadForm.addEventListener(
        "submit",
        () => {
            successRunId = `${Date.now()}-${Math.random()}`;
        },
        true,
    );
}


if (successMessageBox) {
    const professionalSuccessObserver = new MutationObserver(
        handleProfessionalSuccess,
    );

    professionalSuccessObserver.observe(
        successMessageBox,
        {
            attributes: true,
            attributeFilter: ["class"],
            childList: true,
            characterData: true,
            subtree: true,
        },
    );
}


if (document.readyState === "complete") {
    startSplashSequence();
} else {
    window.addEventListener(
        "load",
        startSplashSequence,
        { once: true },
    );
}


window.setTimeout(finishSplash, 3600);
