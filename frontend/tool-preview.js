const TOOL_PREVIEW_DETAILS = {
    "site-charge": {
        process: "تطبیق ستون کد کالا در اکسل سایت و انبار محصول",
        output: "افزودن موجودی انبار محصول و مشخص‌کردن موجودی‌های صفر",
    },
    "three-inventory": {
        process: "تطبیق کد کالا میان سایت، انبار محصول و انبار موقت",
        output: "افزودن موجودی انبار محصول و موجودی انبار موقت",
    },
    "daily-load": {
        process: "ادغام تعداد دلخواه سند انبار و یکسان‌سازی ستون‌ها",
        output: "گزارش بار روز با فرمول مبلغ و قالب‌بندی نهایی",
    },
    "order-discrepancy": {
        process: "تطبیق شماره راهکاران با شماره سفارش و مقایسه مبلغ‌ها",
        output: "مبلغ خالص، اختلاف مبلغ و وضعیت هر سفارش",
    },
    "barcode-comparison": {
        process: "تطبیق مشخصه فنی با بارکد و کد کالا با کد محصول",
        output: "کدهای مشترک رنگی به‌همراه ستون شناسه محصول",
    },
    "sep-comparison": {
        process: "تطبیق کد پرداخت ادمین با کد رهگیری فایل SEP",
        output: "وضعیت OK یا NO با رنگ‌بندی سبز و قرمز",
    },
    "price-comparison": {
        process: "پاک‌سازی داده‌ها و تطبیق بارکد، مشخصه فنی و قیمت",
        output: "مقایسه قیمت سایت و صندوق با وضعیت OK یا NO",
    },
    "definition-date-report": {
        process: "تطبیق موجودی‌ها و مشخصه فنی با بارکد فایل سوم",
        output: "افزودن تاریخ تعریف و رنگ‌بندی وضعیت موجودی‌ها",
    },
};


const previewCards = Array.from(
    document.querySelectorAll(
        ".tool-card[data-tool]:not(:disabled)"
    )
);

let activePreviewCard = null;
let previewFrame = null;


function createToolPreviewPanel() {
    const existingPanel = document.querySelector(
        ".tool-preview-panel"
    );

    if (existingPanel) {
        return existingPanel;
    }

    const panel = document.createElement("aside");

    panel.className = "tool-preview-panel";
    panel.id = "toolPreviewPanel";
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");
    panel.setAttribute("aria-hidden", "true");

    panel.innerHTML = `
        <div class="tool-preview-head">
            <span class="tool-preview-title-wrap">
                <small class="tool-preview-kicker">پیش‌نمایش ابزار</small>
                <strong class="tool-preview-title"></strong>
            </span>
            <span class="tool-preview-count"></span>
        </div>

        <div class="tool-preview-body">
            <div class="tool-preview-row">
                <span class="tool-preview-label">ورودی‌ها</span>
                <span class="tool-preview-value" data-preview="files"></span>
            </div>

            <div class="tool-preview-row">
                <span class="tool-preview-label">پردازش</span>
                <span class="tool-preview-value" data-preview="process"></span>
            </div>

            <div class="tool-preview-row">
                <span class="tool-preview-label">خروجی</span>
                <span class="tool-preview-value" data-preview="output"></span>
            </div>
        </div>

        <div class="tool-preview-hint">
            برای انتخاب فایل‌ها روی کارت کلیک کنید
        </div>
    `;

    document.body.appendChild(panel);
    return panel;
}


const toolPreviewPanel = createToolPreviewPanel();


function getCardFileDescription(card) {
    if (card.dataset.fileMode === "multiple") {
        return {
            count: "چند فایل",
            names: "تعداد دلخواه سند انبار",
        };
    }

    const count = Number(card.dataset.fileCount || 2);
    const names = [
        card.dataset.fileOne,
        card.dataset.fileTwo,
        card.dataset.fileThree,
    ]
        .slice(0, count)
        .filter(Boolean)
        .join("، ");

    return {
        count: `${count.toLocaleString("fa-IR")} فایل`,
        names,
    };
}


function fillToolPreview(card) {
    const toolKey = card.dataset.tool;
    const details = TOOL_PREVIEW_DETAILS[toolKey] || {
        process: "بررسی و پردازش اطلاعات فایل‌های انتخاب‌شده",
        output: "ساخت گزارش اکسل نهایی",
    };
    const files = getCardFileDescription(card);
    const accent = getComputedStyle(card)
        .getPropertyValue("--card-accent")
        .trim();

    toolPreviewPanel.style.setProperty(
        "--preview-accent",
        accent || "91, 181, 231"
    );

    toolPreviewPanel.querySelector(
        ".tool-preview-title"
    ).textContent = (
        card.dataset.title
        || card.querySelector(".tool-content strong")?.textContent
        || "ابزار گزارش‌گیری"
    ).trim();

    toolPreviewPanel.querySelector(
        ".tool-preview-count"
    ).textContent = files.count;

    toolPreviewPanel.querySelector(
        '[data-preview="files"]'
    ).textContent = files.names;

    toolPreviewPanel.querySelector(
        '[data-preview="process"]'
    ).textContent = details.process;

    toolPreviewPanel.querySelector(
        '[data-preview="output"]'
    ).textContent = details.output;
}


function clampPreview(value, minimum, maximum) {
    return Math.min(
        Math.max(value, minimum),
        maximum
    );
}


function positionToolPreview() {
    if (!activePreviewCard) {
        return;
    }

    const cardRect = activePreviewCard.getBoundingClientRect();
    const panelRect = toolPreviewPanel.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const edge = 12;
    const gap = 14;

    let left = cardRect.left - panelRect.width - gap;

    if (left < edge) {
        left = cardRect.right + gap;
    }

    if (left + panelRect.width > viewportWidth - edge) {
        left = cardRect.left + (
            cardRect.width - panelRect.width
        ) / 2;
    }

    let top = cardRect.top + (
        cardRect.height - panelRect.height
    ) / 2;

    left = clampPreview(
        left,
        edge,
        viewportWidth - panelRect.width - edge
    );

    top = clampPreview(
        top,
        edge,
        viewportHeight - panelRect.height - edge
    );

    toolPreviewPanel.style.left = `${left}px`;
    toolPreviewPanel.style.top = `${top}px`;
}


function schedulePreviewPosition() {
    if (previewFrame !== null) {
        cancelAnimationFrame(previewFrame);
    }

    previewFrame = requestAnimationFrame(() => {
        positionToolPreview();
        previewFrame = null;
    });
}


function showToolPreview(card) {
    if (
        window.matchMedia("(hover: none)").matches
        || window.innerWidth <= 760
    ) {
        return;
    }

    activePreviewCard = card;
    fillToolPreview(card);
    toolPreviewPanel.classList.add("is-visible");
    toolPreviewPanel.setAttribute("aria-hidden", "false");
    card.setAttribute("aria-describedby", "toolPreviewPanel");
    schedulePreviewPosition();
}


function hideToolPreview(card = activePreviewCard) {
    if (card) {
        card.removeAttribute("aria-describedby");
    }

    if (card !== activePreviewCard) {
        return;
    }

    activePreviewCard = null;
    toolPreviewPanel.classList.remove("is-visible");
    toolPreviewPanel.setAttribute("aria-hidden", "true");
}


previewCards.forEach((card) => {
    card.addEventListener(
        "pointerenter",
        () => showToolPreview(card)
    );

    card.addEventListener(
        "pointerleave",
        () => hideToolPreview(card)
    );

    card.addEventListener(
        "focus",
        () => showToolPreview(card)
    );

    card.addEventListener(
        "blur",
        () => hideToolPreview(card)
    );

    card.addEventListener(
        "click",
        () => hideToolPreview(card),
        true
    );
});


window.addEventListener(
    "resize",
    schedulePreviewPosition,
    { passive: true }
);

window.addEventListener(
    "scroll",
    schedulePreviewPosition,
    { passive: true }
);
