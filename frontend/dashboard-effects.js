const DENIM_HISTORY_KEY = "royal-jeans-report-history-v1";

const denimToolsGrid = document.querySelector(".tools-grid");
const denimModal = document.getElementById("uploadModal");
const denimUploadForm = document.getElementById("uploadForm");
const denimMessageBox = document.getElementById("messageBox");
const denimToolCards = Array.from(
    document.querySelectorAll(".tool-card"),
);

let denimActiveCard = null;
let denimCurrentRunId = null;
let denimHandledRunId = null;
let denimResizeFrame = null;


function createRoyalHologram() {
    if (document.querySelector(".royal-hologram")) {
        return;
    }

    const hologram = document.createElement("div");
    const image = document.createElement("img");

    hologram.className = "royal-hologram";
    hologram.setAttribute("aria-hidden", "true");

    image.src = "/static/royal-jeans-logo.png?v=1";
    image.alt = "";

    hologram.appendChild(image);
    document.body.prepend(hologram);
}


function setModalOrigin(card) {
    if (!card) {
        return;
    }

    const rect = card.getBoundingClientRect();
    const cardCenterX = rect.left + rect.width / 2;
    const cardCenterY = rect.top + rect.height / 2;
    const shiftX = cardCenterX - window.innerWidth / 2;
    const shiftY = cardCenterY - window.innerHeight / 2;

    document.documentElement.style.setProperty(
        "--modal-shift-x",
        `${shiftX.toFixed(1)}px`,
    );

    document.documentElement.style.setProperty(
        "--modal-shift-y",
        `${shiftY.toFixed(1)}px`,
    );
}


function appendSvgElement(parent, name, attributes) {
    const element = document.createElementNS(
        "http://www.w3.org/2000/svg",
        name,
    );

    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, String(value));
    });

    parent.appendChild(element);
    return element;
}


function getConnectorPoints(firstRect, secondRect, gridRect) {
    const firstCenterX = firstRect.left + firstRect.width / 2;
    const firstCenterY = firstRect.top + firstRect.height / 2;
    const secondCenterX = secondRect.left + secondRect.width / 2;
    const secondCenterY = secondRect.top + secondRect.height / 2;
    const sameRow = Math.abs(firstCenterY - secondCenterY) < 40;

    if (sameRow) {
        const firstIsLeft = firstCenterX < secondCenterX;

        return {
            x1: (
                firstIsLeft
                    ? firstRect.right
                    : firstRect.left
            ) - gridRect.left,
            y1: firstCenterY - gridRect.top,
            x2: (
                firstIsLeft
                    ? secondRect.left
                    : secondRect.right
            ) - gridRect.left,
            y2: secondCenterY - gridRect.top,
            direction: "horizontal",
        };
    }

    return {
        x1: firstCenterX - gridRect.left,
        y1: firstRect.bottom - gridRect.top,
        x2: secondCenterX - gridRect.left,
        y2: secondRect.top - gridRect.top,
        direction: "vertical",
    };
}


function connectorPath(points) {
    if (points.direction === "horizontal") {
        const middleX = (points.x1 + points.x2) / 2;

        return [
            `M ${points.x1} ${points.y1}`,
            `C ${middleX} ${points.y1}`,
            `${middleX} ${points.y2}`,
            `${points.x2} ${points.y2}`,
        ].join(" ");
    }

    const middleY = (points.y1 + points.y2) / 2;

    return [
        `M ${points.x1} ${points.y1}`,
        `C ${points.x1} ${middleY}`,
        `${points.x2} ${middleY}`,
        `${points.x2} ${points.y2}`,
    ].join(" ");
}


function drawStitchNetwork() {
    if (!denimToolsGrid) {
        return;
    }

    const visibleCards = denimToolCards.filter(
        (card) => card.offsetParent !== null,
    );

    const oldNetwork = denimToolsGrid.querySelector(
        ":scope > .stitch-network",
    );

    if (oldNetwork) {
        oldNetwork.remove();
    }

    if (visibleCards.length < 2) {
        return;
    }

    const gridRect = denimToolsGrid.getBoundingClientRect();
    const svg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
    );

    svg.classList.add("stitch-network");
    svg.setAttribute(
        "viewBox",
        `0 0 ${gridRect.width} ${gridRect.height}`,
    );
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");

    visibleCards.slice(0, -1).forEach((card, index) => {
        const nextCard = visibleCards[index + 1];
        const points = getConnectorPoints(
            card.getBoundingClientRect(),
            nextCard.getBoundingClientRect(),
            gridRect,
        );

        const path = appendSvgElement(
            svg,
            "path",
            {
                d: connectorPath(points),
            },
        );

        path.style.animationDelay = `${index * -0.38}s`;

        appendSvgElement(
            svg,
            "circle",
            {
                cx: points.x1,
                cy: points.y1,
                r: 2.2,
            },
        );

        appendSvgElement(
            svg,
            "circle",
            {
                cx: points.x2,
                cy: points.y2,
                r: 2.2,
            },
        );
    });

    denimToolsGrid.prepend(svg);
}


function scheduleStitchNetwork() {
    if (denimResizeFrame !== null) {
        cancelAnimationFrame(denimResizeFrame);
    }

    denimResizeFrame = requestAnimationFrame(() => {
        drawStitchNetwork();
        denimResizeFrame = null;
    });
}


function safeHistoryRead() {
    try {
        const history = JSON.parse(
            localStorage.getItem(DENIM_HISTORY_KEY) || "[]",
        );

        return Array.isArray(history)
            ? history
            : [];
    } catch (error) {
        console.warn(
            "خواندن تاریخچه گزارش‌ها ممکن نیست.",
            error,
        );
        return [];
    }
}


function safeHistoryWrite(history) {
    try {
        localStorage.setItem(
            DENIM_HISTORY_KEY,
            JSON.stringify(history),
        );
    } catch (error) {
        console.warn(
            "ذخیره تاریخچه گزارش‌ها ممکن نیست.",
            error,
        );
    }
}


function createActivityDock() {
    const oldDock = document.querySelector(
        ".activity-dock",
    );

    if (oldDock) {
        return oldDock;
    }

    const dock = document.createElement("section");
    const header = document.createElement("div");
    const liveDot = document.createElement("span");
    const title = document.createElement("strong");
    const count = document.createElement("span");
    const clearButton = document.createElement("button");
    const track = document.createElement("div");

    dock.className = "activity-dock";
    dock.setAttribute("aria-label", "آخرین گزارش‌های ساخته‌شده");

    header.className = "activity-dock-header";
    liveDot.className = "activity-live-dot";
    title.className = "activity-dock-title";
    title.textContent = "آخرین فعالیت‌ها";
    count.className = "activity-dock-count";
    count.id = "activityDockCount";

    clearButton.className = "activity-clear";
    clearButton.type = "button";
    clearButton.textContent = "پاک‌کردن";

    track.className = "activity-track";
    track.id = "activityTrack";
    track.setAttribute("aria-live", "polite");

    header.append(
        liveDot,
        title,
        count,
        clearButton,
    );

    dock.append(header, track);
    document.body.appendChild(dock);

    clearButton.addEventListener("click", () => {
        safeHistoryWrite([]);
        renderActivityHistory();
    });

    return dock;
}


function formatActivityTime(isoTime) {
    const date = new Date(isoTime);

    if (Number.isNaN(date.getTime())) {
        return "همین حالا";
    }

    return new Intl.DateTimeFormat(
        "fa-IR",
        {
            hour: "2-digit",
            minute: "2-digit",
            month: "short",
            day: "numeric",
        },
    ).format(date);
}


function createActivityItem(item) {
    const element = document.createElement("article");
    const icon = document.createElement("span");
    const content = document.createElement("span");
    const title = document.createElement("strong");
    const time = document.createElement("small");

    element.className = "activity-item";
    icon.className = "activity-item-icon";
    icon.textContent = "✓";
    content.className = "activity-item-content";
    title.className = "activity-item-title";
    title.textContent = item.title || "گزارش اکسل";
    time.className = "activity-item-time";
    time.textContent = `${formatActivityTime(item.time)} · دانلود شد`;

    content.append(title, time);
    element.append(icon, content);

    return element;
}


function renderActivityHistory() {
    const dock = createActivityDock();
    const track = dock.querySelector(".activity-track");
    const count = dock.querySelector(".activity-dock-count");
    const history = safeHistoryRead();

    track.replaceChildren();
    count.textContent = `${history.length} گزارش`;

    if (history.length === 0) {
        const empty = document.createElement("div");
        empty.className = "activity-empty";
        empty.textContent = "هنوز گزارشی در این مرورگر ساخته نشده است.";
        track.appendChild(empty);
        return;
    }

    history.forEach((item) => {
        track.appendChild(
            createActivityItem(item),
        );
    });
}


function addActivity(title) {
    const history = safeHistoryRead();

    history.unshift({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title,
        time: new Date().toISOString(),
    });

    safeHistoryWrite(history);

    renderActivityHistory();
}


function flashSuccessfulCard(card) {
    if (!card) {
        return;
    }

    card.classList.remove("report-success");
    card.querySelector(".card-success-burst")?.remove();

    const burst = document.createElement("span");
    burst.className = "card-success-burst";
    burst.textContent = "✓";
    burst.setAttribute("aria-hidden", "true");

    card.appendChild(burst);

    requestAnimationFrame(() => {
        card.classList.add("report-success");
    });

    window.setTimeout(() => {
        card.classList.remove("report-success");
        burst.remove();
    }, 2300);
}


function handleSuccessfulReport() {
    const isSuccess = denimMessageBox
        && denimMessageBox.classList.contains("success");

    if (
        !isSuccess
        || denimCurrentRunId === null
        || denimHandledRunId === denimCurrentRunId
    ) {
        return;
    }

    denimHandledRunId = denimCurrentRunId;

    const reportTitle = (
        denimActiveCard?.dataset.title
        || denimActiveCard?.querySelector("strong")?.textContent
        || "گزارش اکسل"
    ).trim();

    addActivity(reportTitle);
    flashSuccessfulCard(denimActiveCard);
}


document.addEventListener(
    "click",
    (event) => {
        const card = event.target.closest(
            ".tool-card:not(:disabled)",
        );

        if (!card) {
            return;
        }

        denimActiveCard = card;
        setModalOrigin(card);
    },
    true,
);


if (denimUploadForm) {
    denimUploadForm.addEventListener(
        "submit",
        () => {
            denimCurrentRunId = `${Date.now()}-${Math.random()}`;
        },
        true,
    );
}


if (denimMessageBox) {
    const successObserver = new MutationObserver(
        handleSuccessfulReport,
    );

    successObserver.observe(
        denimMessageBox,
        {
            attributes: true,
            attributeFilter: ["class"],
            childList: true,
            characterData: true,
            subtree: true,
        },
    );
}


window.addEventListener(
    "resize",
    scheduleStitchNetwork,
    { passive: true },
);


if (typeof ResizeObserver !== "undefined" && denimToolsGrid) {
    const gridResizeObserver = new ResizeObserver(
        scheduleStitchNetwork,
    );

    gridResizeObserver.observe(denimToolsGrid);
}


createRoyalHologram();
renderActivityHistory();

requestAnimationFrame(() => {
    requestAnimationFrame(
        scheduleStitchNetwork,
    );
});
