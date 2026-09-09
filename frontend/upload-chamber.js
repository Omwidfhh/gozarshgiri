const chamberForm = document.getElementById("uploadForm");
const chamberMessageBox = document.getElementById("messageBox");
const chamberStartButton = document.getElementById("startBtn");
const chamberProgressFill = document.getElementById("buttonProgressFill");
const chamberModal = document.getElementById("uploadModal");


function createUploadChamber() {
    const existingChamber = document.querySelector(
        ".upload-chamber"
    );

    if (existingChamber) {
        return existingChamber;
    }

    const chamber = document.createElement("section");

    chamber.className = "upload-chamber";
    chamber.dataset.stage = "idle";
    chamber.setAttribute("aria-label", "اتاق پردازش فایل‌ها");

    chamber.innerHTML = `
        <span class="chamber-label">ROYAL PROCESSING CORE</span>

        <div class="chamber-stage">
            <div class="chamber-files" data-chamber="files">
                <span class="chamber-empty">
                    فایل‌های انتخاب‌شده اینجا وارد هسته پردازش می‌شوند.
                </span>
            </div>

            <span class="chamber-flow" aria-hidden="true"></span>

            <div class="chamber-core-wrap">
                <div class="chamber-core">
                    <span class="chamber-core-icon">X</span>
                    <span class="chamber-core-status" data-chamber="status">
                        آماده دریافت فایل
                    </span>
                </div>
            </div>

            <div class="chamber-result">
                <div class="chamber-output-pill">
                    <span class="chamber-output-name">گزارش نهایی Excel</span>
                </div>

                <span class="chamber-progress-text" data-chamber="progress">
                    ۰٪
                </span>
            </div>
        </div>
    `;

    chamberForm.insertBefore(
        chamber,
        chamberMessageBox
    );

    return chamber;
}


const uploadChamber = createUploadChamber();
const chamberFiles = uploadChamber.querySelector(
    '[data-chamber="files"]'
);
const chamberStatus = uploadChamber.querySelector(
    '[data-chamber="status"]'
);
const chamberProgress = uploadChamber.querySelector(
    '[data-chamber="progress"]'
);


function placeUploadChamberAfterSelectors() {
    const dynamicContainer = document.getElementById(
        "dynamicFilesContainer"
    );
    const fixedContainer = document.getElementById(
        "fileSelectorsContainer"
    );
    const selectorsContainer = (
        dynamicContainer
        || fixedContainer
    );

    if (selectorsContainer) {
        selectorsContainer.insertAdjacentElement(
            "afterend",
            uploadChamber
        );
    }
}


function getSelectedChamberFiles() {
    return Array.from(
        chamberForm.querySelectorAll(
            'input[type="file"]'
        )
    )
        .map((input) => input.files?.[0])
        .filter(Boolean);
}


function shortenChamberFileName(fileName) {
    const maximumLength = 28;

    if (fileName.length <= maximumLength) {
        return fileName;
    }

    const dotIndex = fileName.lastIndexOf(".");
    const extension = dotIndex >= 0
        ? fileName.slice(dotIndex)
        : "";
    const availableLength = (
        maximumLength
        - extension.length
        - 1
    );

    return `${fileName.slice(0, availableLength)}…${extension}`;
}


function renderChamberFiles() {
    const selectedFiles = getSelectedChamberFiles();

    chamberFiles.replaceChildren();

    if (selectedFiles.length === 0) {
        const empty = document.createElement("span");

        empty.className = "chamber-empty";
        empty.textContent = (
            "فایل‌های انتخاب‌شده اینجا وارد هسته پردازش می‌شوند."
        );
        chamberFiles.appendChild(empty);
        return;
    }

    selectedFiles.slice(0, 3).forEach((file, index) => {
        const pill = document.createElement("span");
        const name = document.createElement("span");

        pill.className = "chamber-file-pill";
        pill.style.setProperty(
            "--file-delay",
            `${index * 75}ms`
        );
        pill.title = file.name;

        name.className = "chamber-file-name";
        name.textContent = shortenChamberFileName(file.name);

        pill.appendChild(name);
        chamberFiles.appendChild(pill);
    });

    if (selectedFiles.length > 3) {
        const more = document.createElement("span");

        more.className = "chamber-file-more";
        more.textContent = (
            `+${(selectedFiles.length - 3).toLocaleString("fa-IR")} فایل دیگر`
        );
        chamberFiles.appendChild(more);
    }
}


function getChamberStage() {
    const buttonStage = chamberStartButton.dataset.stage;

    if (buttonStage) {
        return buttonStage;
    }

    return getSelectedChamberFiles().length > 0
        ? "ready"
        : "idle";
}


function getChamberStatusText(stage, fileCount) {
    const statusTexts = {
        idle: "آماده دریافت فایل",
        ready: `${fileCount.toLocaleString("fa-IR")} فایل آماده پردازش`,
        upload: "انتقال فایل‌ها به هسته",
        processing: "تطبیق و پردازش اطلاعات",
        download: "ساخت فایل خروجی",
        complete: "گزارش با موفقیت آماده شد",
        error: "پردازش با خطا متوقف شد",
    };

    return statusTexts[stage] || statusTexts.idle;
}


function syncUploadChamber() {
    const selectedFiles = getSelectedChamberFiles();
    const stage = getChamberStage();
    const progressValue = Number(
        chamberProgressFill.getAttribute("aria-valuenow")
        || 0
    );

    uploadChamber.dataset.stage = stage;
    chamberStatus.textContent = getChamberStatusText(
        stage,
        selectedFiles.length
    );
    chamberProgress.textContent = (
        `${progressValue.toLocaleString("fa-IR")}٪`
    );
}


function refreshUploadChamber() {
    renderChamberFiles();
    syncUploadChamber();
}


chamberForm.addEventListener("change", (event) => {
    if (!event.target.matches('input[type="file"]')) {
        return;
    }

    window.setTimeout(
        refreshUploadChamber,
        0
    );
});


const chamberStateObserver = new MutationObserver(
    syncUploadChamber
);

chamberStateObserver.observe(
    chamberStartButton,
    {
        attributes: true,
        attributeFilter: [
            "class",
            "data-stage",
        ],
    }
);

chamberStateObserver.observe(
    chamberProgressFill,
    {
        attributes: true,
        attributeFilter: [
            "aria-valuenow",
        ],
    }
);


const chamberModalObserver = new MutationObserver(() => {
    if (chamberModal.classList.contains("is-open")) {
        window.setTimeout(
            refreshUploadChamber,
            0
        );
    }
});

chamberModalObserver.observe(
    chamberModal,
    {
        attributes: true,
        attributeFilter: ["class"],
    }
);


window.setTimeout(() => {
    placeUploadChamberAfterSelectors();
    refreshUploadChamber();
}, 0);
