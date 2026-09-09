const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const toolButtons = $$(".tool-card");
const uploadModal = $("#uploadModal");
const modalBox = $(".modal-box");
const closeModalButton = $("#closeModal");
const modalTitle = $("#modalTitle");
const modalDescription = $("#modalDescription");
const uploadForm = $("#uploadForm");
const startButton = $("#startBtn");
const startButtonText = $("#startBtnText");
const messageBox = $("#messageBox");

const buttonProgressFill = $("#buttonProgressFill");
const buttonProgressPercent = $("#buttonProgressPercent");

const fileInputs = [$("#file1"), $("#file2"), $("#file3"), $("#file4")];
const fileBoxes = [$("#fileBox1"), $("#fileBox2"), $("#fileBox3"), $("#fileBox4")];
const fileNames = [$("#fileName1"), $("#fileName2"), $("#fileName3"), $("#fileName4")];
const fileLabels = [$("#fileLabel1"), $("#fileLabel2"), $("#fileLabel3"), $("#fileLabel4")];

const dynamicFilesContainer = document.createElement("div");
dynamicFilesContainer.id = "dynamicFilesContainer";
dynamicFilesContainer.style.cssText = [
    "display:none",
    "max-height:340px",
    "overflow-y:auto",
    "padding:3px 3px 3px 8px",
].join(";");

uploadForm.insertBefore(dynamicFilesContainer, messageBox);
modalBox.style.maxHeight = "92vh";
modalBox.style.overflowY = "auto";

let activeTool = null;
let activeEndpoint = "/upload";
let activeFileCount = 2;
let activeFileMode = "fixed";
let expectedMultipleFileCount = 0;
let dynamicFileSelectors = [];
let progressTimer = null;
let currentProgress = 0;

const percentFormatter = new Intl.NumberFormat("fa-IR");
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

/* افکت نور دنبال‌کننده موس */

let pointerFrame = null;

if (!reduceMotionQuery.matches) {
    document.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch") return;

        if (pointerFrame) cancelAnimationFrame(pointerFrame);

        pointerFrame = requestAnimationFrame(() => {
            document.documentElement.style.setProperty("--pointer-x", `${event.clientX}px`);
            document.documentElement.style.setProperty("--pointer-y", `${event.clientY}px`);
            pointerFrame = null;
        });
    });
}

/* افکت سه‌بعدی کارت‌ها */

function updateCardTilt(card, event) {
    if (reduceMotionQuery.matches || event.pointerType === "touch") return;

    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateX = (0.5 - y / rect.height) * 8;
    const rotateY = (x / rect.width - 0.5) * 10;

    card.style.setProperty("--rotate-x", `${rotateX.toFixed(2)}deg`);
    card.style.setProperty("--rotate-y", `${rotateY.toFixed(2)}deg`);
    card.style.setProperty("--glow-x", `${x.toFixed(0)}px`);
    card.style.setProperty("--glow-y", `${y.toFixed(0)}px`);
}

function resetCardTilt(card) {
    card.style.setProperty("--rotate-x", "0deg");
    card.style.setProperty("--rotate-y", "0deg");
    card.style.setProperty("--glow-x", "50%");
    card.style.setProperty("--glow-y", "50%");
}

/* پیام‌ها */

function clearMessage() {
    messageBox.textContent = "";
    messageBox.className = "message-box";
}

function showMessage(message, type) {
    messageBox.textContent = message;
    messageBox.className = `message-box ${type}`;
}

function setLoading(isLoading) {
    startButton.disabled = isLoading;
    startButton.classList.toggle("is-loading", isLoading);

    if (
        !isLoading &&
        !startButton.classList.contains("is-complete") &&
        !startButton.classList.contains("is-error")
    ) {
        startButtonText.textContent = "ساخت گزارش";
    }
}

/* نوار پیشرفت */

function clearProgressTimer() {
    if (progressTimer !== null) {
        clearInterval(progressTimer);
        progressTimer = null;
    }
}

function setProgressValue(value) {
    const safeValue = Math.max(0, Math.min(100, Math.round(value)));
    currentProgress = safeValue;
    buttonProgressFill.style.width = `${safeValue}%`;
    buttonProgressPercent.textContent = `${percentFormatter.format(safeValue)}٪`;
    buttonProgressFill.setAttribute("aria-valuenow", String(safeValue));
}

function setProgressStage(stage, value, hint) {
    const stageTitles = {
        upload: "آپلود فایل‌ها",
        processing: "پردازش گزارش",
        download: "آماده‌سازی دانلود",
    };

    startButton.classList.remove("is-complete", "is-error");
    startButton.dataset.stage = stage;
    startButton.title = hint;
    startButtonText.textContent = stageTitles[stage];
    setProgressValue(value);
}

function startProcessingProgress() {
    clearProgressTimer();
    setProgressStage(
        "processing",
        Math.max(currentProgress, 46),
        "اطلاعات اکسل‌ها در حال بررسی و ساخت گزارش است.",
    );

    progressTimer = setInterval(() => {
        if (currentProgress >= 82) return;
        const increase = currentProgress < 65 ? 2 : 1;

        setProgressStage(
            "processing",
            Math.min(82, currentProgress + increase),
            "اطلاعات اکسل‌ها در حال بررسی و ساخت گزارش است.",
        );
    }, 650);
}

function completeProgress() {
    clearProgressTimer();
    setProgressStage(
        "download",
        100,
        "فایل خروجی آماده شد و دانلود آن آغاز شده است.",
    );

    startButton.classList.add("is-complete");
    startButton.dataset.stage = "complete";
    startButtonText.textContent = "گزارش آماده شد";
    startButton.title = "فایل خروجی دانلود شد.";
}

function failProgress(message) {
    clearProgressTimer();
    startButton.classList.remove("is-complete");
    startButton.classList.add("is-error");
    startButton.dataset.stage = "error";
    startButtonText.textContent = "خطا در ساخت گزارش";
    startButton.title = message;
}

function resetProgress() {
    clearProgressTimer();
    currentProgress = 0;
    startButton.classList.remove("is-loading", "is-complete", "is-error");
    startButton.removeAttribute("data-stage");
    startButton.title = "";
    startButtonText.textContent = "ساخت گزارش";
    setProgressValue(0);
}

/* انتخاب فایل‌های گزارش بار روز */

function askForFileCount() {
    while (true) {
        const answer = prompt("تعداد اسناد انبار را وارد کنید:", "1");
        if (answer === null) return null;

        const count = Number(answer);
        if (Number.isInteger(count) && count >= 1 && count <= 100) return count;

        alert("لطفاً یک عدد صحیح بین ۱ تا ۱۰۰ وارد کنید.");
    }
}

function createDynamicFileSelectors(count) {
    dynamicFilesContainer.innerHTML = "";
    dynamicFileSelectors = [];

    for (let index = 1; index <= count; index += 1) {
        const inputId = `dailyFile${index}`;
        const fileBox = document.createElement("label");
        const icon = document.createElement("span");
        const content = document.createElement("span");
        const label = document.createElement("strong");
        const fileName = document.createElement("small");
        const selectLabel = document.createElement("span");
        const input = document.createElement("input");

        fileBox.className = "file-selector";
        fileBox.htmlFor = inputId;
        icon.className = "file-selector-icon";
        icon.textContent = String(index).padStart(2, "0");
        content.className = "file-selector-content";
        label.textContent = `سند انبار ${index}`;
        fileName.textContent = "برای انتخاب فایل کلیک کنید";
        selectLabel.className = "select-label";
        selectLabel.textContent = "انتخاب";
        input.type = "file";
        input.id = inputId;
        input.accept = ".xlsx,.xlsm,.xls";
        input.hidden = true;

        content.append(label, fileName);
        fileBox.append(icon, content, selectLabel, input);
        dynamicFilesContainer.appendChild(fileBox);

        const selector = { input, box: fileBox, fileName };
        dynamicFileSelectors.push(selector);

        input.addEventListener("change", () => {
            const selectedFile = input.files[0];
            fileName.textContent = selectedFile
                ? selectedFile.name
                : "برای انتخاب فایل کلیک کنید";
            fileBox.classList.toggle("has-file", Boolean(selectedFile));
        });
    }

    dynamicFilesContainer.style.display = "block";
}

/* مدیریت فرم و پنجره */

function resetForm() {
    uploadForm.reset();

    fileInputs.forEach((input) => {
        input.multiple = false;
        input.accept = ".xlsx,.xlsm";
    });

    fileNames.forEach((fileName) => {
        fileName.textContent = "برای انتخاب فایل کلیک کنید";
    });

    fileBoxes.forEach((fileBox) => {
        fileBox.classList.remove("has-file");
        fileBox.style.display = "flex";
    });

    dynamicFilesContainer.innerHTML = "";
    dynamicFilesContainer.style.display = "none";
    dynamicFileSelectors = [];
    clearMessage();
    resetProgress();
    setLoading(false);
}

function configureFileSelectors(toolButton) {
    activeFileMode = toolButton.dataset.fileMode || "fixed";
    activeEndpoint = toolButton.dataset.endpoint || "/upload";

    if (activeFileMode === "multiple") {
        activeFileCount = expectedMultipleFileCount;
        fileBoxes.forEach((fileBox) => (fileBox.style.display = "none"));
        createDynamicFileSelectors(expectedMultipleFileCount);
        modalDescription.textContent =
            `${expectedMultipleFileCount} سند انبار را جداگانه انتخاب کنید.`;
        return;
    }

    dynamicFilesContainer.style.display = "none";
    activeFileCount = Number(toolButton.dataset.fileCount || 2);

    const labels = [
        toolButton.dataset.fileOne || "اکسل اول",
        toolButton.dataset.fileTwo || "اکسل دوم",
        toolButton.dataset.fileThree || "اکسل سوم",
        toolButton.dataset.fileFour || "اکسل چهارم",
    ];

    fileLabels.forEach((fileLabel, index) => {
        fileLabel.textContent = labels[index];
    });

    fileBoxes.forEach((fileBox, index) => {
        const shouldShow = index < activeFileCount;
        fileBox.style.display = shouldShow ? "flex" : "none";

        if (!shouldShow) {
            fileInputs[index].value = "";
        }
    });

    const countNames = {
        2: "دو",
        3: "سه",
        4: "چهار",
    };
    const readableCount = countNames[activeFileCount] || activeFileCount;
    modalDescription.textContent =
        `${readableCount} فایل اکسل موردنظر را انتخاب کنید.`;
}

function openModal(toolButton) {
    const requestedMode = toolButton.dataset.fileMode || "fixed";

    if (requestedMode === "multiple") {
        const selectedCount = askForFileCount();
        if (selectedCount === null) return;
        expectedMultipleFileCount = selectedCount;
    } else {
        expectedMultipleFileCount = 0;
    }

    activeTool = toolButton.dataset.tool;
    modalTitle.textContent = toolButton.dataset.title;
    resetForm();
    configureFileSelectors(toolButton);
    uploadModal.classList.add("is-open");
    uploadModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    closeModalButton.focus();
}

function closeModal() {
    if (startButton.disabled) return;

    uploadModal.classList.remove("is-open");
    uploadModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    activeTool = null;
    expectedMultipleFileCount = 0;
    dynamicFilesContainer.innerHTML = "";
    dynamicFileSelectors = [];
}

/* ارسال، دریافت و دانلود گزارش */

function downloadReport(blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const now = new Date();
    const timestamp = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0"),
        String(now.getSeconds()).padStart(2, "0"),
    ].join("-");

    link.href = url;
    link.download = `${activeTool || "report"}-${timestamp}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

async function readErrorMessage(blob, status = 0) {
    let text = "";
    try {
        text = await blob.text();
    } catch (error) {
        text = "";
    }

    if (text) {
        try {
            const data = JSON.parse(text);
            if (Array.isArray(data.detail)) {
                return data.detail.map((item) => item.msg || String(item)).join("، ");
            }
            if (data.detail) {
                return String(data.detail);
            }
            if (data.message) {
                return String(data.message);
            }
        } catch (error) {
            const clean = text
                .replace(/<style[\s\S]*?<\/style>/gi, " ")
                .replace(/<script[\s\S]*?<\/script>/gi, " ")
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim();
            if (clean) {
                return clean.slice(0, 700);
            }
        }
    }

    return status
        ? `ساخت گزارش با خطا مواجه شد. کد خطای سرور: ${status}`
        : "ساخت گزارش با خطا مواجه شد.";
}

function requestReport(endpoint, formData) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        let responseStarted = false;

        request.open("POST", endpoint, true);
        request.responseType = "blob";

        request.upload.addEventListener("progress", (event) => {
            if (!event.lengthComputable) {
                setProgressStage(
                    "upload",
                    Math.max(currentProgress, 8),
                    "فایل‌ها در حال ارسال به سرور هستند.",
                );
                return;
            }

            const value = Math.max(3, Math.min(44, (event.loaded / event.total) * 44));
            setProgressStage("upload", value, "فایل‌ها در حال ارسال به سرور هستند.");
        });

        request.upload.addEventListener("load", () => {
            setProgressStage(
                "upload",
                44,
                "آپلود کامل شد؛ پردازش گزارش در حال شروع است.",
            );
            startProcessingProgress();
        });

        request.addEventListener("progress", (event) => {
            if (!responseStarted) {
                responseStarted = true;
                clearProgressTimer();
            }

            const value = event.lengthComputable
                ? 84 + (event.loaded / event.total) * 14
                : 90;

            setProgressStage(
                "download",
                Math.max(currentProgress, value),
                "فایل خروجی در حال آماده‌سازی برای دانلود است.",
            );
        });

        request.addEventListener("load", async () => {
            clearProgressTimer();

            if (request.status >= 200 && request.status < 300) {
                setProgressStage(
                    "download",
                    98,
                    "فایل آماده است؛ دانلود تا چند لحظه دیگر آغاز می‌شود.",
                );
                resolve(request.response);
                return;
            }

            reject(new Error(await readErrorMessage(request.response, request.status)));
        });

        request.addEventListener("error", () => {
            clearProgressTimer();
            reject(new Error("ارتباط با سرور برقرار نشد."));
        });

        request.addEventListener("abort", () => {
            clearProgressTimer();
            reject(new Error("ارسال فایل‌ها لغو شد."));
        });

        request.send(formData);
    });
}

/* رویدادهای صفحه */

toolButtons.forEach((toolButton) => {
    toolButton.addEventListener("pointermove", (event) => {
        updateCardTilt(toolButton, event);
    });

    toolButton.addEventListener("pointerleave", () => {
        resetCardTilt(toolButton);
    });

    toolButton.addEventListener("click", () => openModal(toolButton));
});

closeModalButton.addEventListener("click", closeModal);

uploadModal.addEventListener("click", (event) => {
    if (event.target === uploadModal) closeModal();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && uploadModal.classList.contains("is-open")) {
        closeModal();
    }
});

fileInputs.forEach((input, index) => {
    input.addEventListener("change", () => {
        const selectedFile = input.files[0];
        fileNames[index].textContent = selectedFile
            ? selectedFile.name
            : "برای انتخاب فایل کلیک کنید";
        fileBoxes[index].classList.toggle("has-file", Boolean(selectedFile));
    });
});

uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    const selectedFiles = activeFileMode === "multiple"
        ? dynamicFileSelectors.map((selector) => selector.input.files[0])
        : fileInputs.slice(0, activeFileCount).map((input) => input.files[0]);

    const missingFiles = selectedFiles.filter((file) => !file).length;

    if (selectedFiles.length === 0 || missingFiles > 0) {
        const message = activeFileMode === "multiple"
            ? `${missingFiles} فایل هنوز انتخاب نشده است.`
            : "لطفاً تمام فایل‌های موردنیاز را انتخاب کنید.";
        showMessage(message, "error");
        return;
    }

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("files", file));

    setLoading(true);
    setProgressStage("upload", 2, "در حال آماده‌سازی فایل‌ها برای ارسال...");

    try {
        const reportBlob = await requestReport(activeEndpoint, formData);
        downloadReport(reportBlob);
        completeProgress();
        showMessage("گزارش با موفقیت ساخته و دانلود شد.", "success");
    } catch (error) {
        console.error(error);
        const message = error.message || "ساخت گزارش با خطا مواجه شد.";
        failProgress(message);
        showMessage(message, "error");
    } finally {
        setLoading(false);
    }
});
