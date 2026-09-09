const CUSTOM_PRESETS_KEY = "royal-custom-report-presets-v1";
const CUSTOM_PRESETS_LIMIT = 20;

const CUSTOM_OPERATORS = [
    ["eq", "مساوی باشد"],
    ["neq", "مساوی نباشد"],
    ["gt", "بزرگ‌تر باشد"],
    ["gte", "بزرگ‌تر یا مساوی"],
    ["lt", "کوچک‌تر باشد"],
    ["lte", "کوچک‌تر یا مساوی"],
    ["contains", "شامل عبارت باشد"],
    ["not_contains", "شامل عبارت نباشد"],
    ["empty", "خالی باشد"],
    ["not_empty", "خالی نباشد"],
];

const CUSTOM_COLORS = [
    ["soft_red", "قرمز ملایم"],
    ["soft_orange", "نارنجی ملایم"],
    ["soft_green", "سبز ملایم"],
    ["soft_blue", "آبی ملایم"],
    ["soft_yellow", "زرد ملایم"],
];

let customInspection = null;
let customPendingPreset = null;
let customBuilderBusy = false;


function createCustomBuilderLauncher() {
    const existing = document.getElementById(
        "customBuilderLaunch"
    );

    if (existing) {
        return existing;
    }

    const button = document.createElement("button");

    button.className = "custom-builder-launch";
    button.id = "customBuilderLaunch";
    button.type = "button";
    button.innerHTML = `
        <span class="custom-builder-launch-icon" aria-hidden="true">＋</span>
        <span>گزارش‌ساز</span>
    `;

    document.body.appendChild(button);
    return button;
}


function createCustomBuilderOverlay() {
    const existing = document.getElementById(
        "customBuilderOverlay"
    );

    if (existing) {
        return existing;
    }

    const overlay = document.createElement("div");

    overlay.className = "custom-builder-overlay";
    overlay.id = "customBuilderOverlay";
    overlay.setAttribute("aria-hidden", "true");

    overlay.innerHTML = `
        <section
            class="custom-builder-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customBuilderTitle"
        >
            <header class="custom-builder-header">
                <span class="custom-builder-mark" aria-hidden="true">＋</span>

                <span class="custom-builder-heading">
                    <strong id="customBuilderTitle">گزارش‌ساز بدون کدنویسی</strong>
                    <small>تطبیق، انتقال، حذف و رنگ‌بندی را خودت تعریف کن</small>
                </span>

                <button
                    class="custom-builder-close"
                    id="customBuilderClose"
                    type="button"
                    aria-label="بستن گزارش‌ساز"
                >×</button>
            </header>

            <div class="custom-builder-scroll">
                <section class="custom-presets">
                    <div class="custom-presets-head">
                        <strong class="custom-presets-title">میانبرهای ذخیره‌شده</strong>
                        <span class="custom-presets-count" id="customPresetsCount"></span>
                    </div>

                    <div class="custom-presets-list" id="customPresetsList"></div>
                </section>

                <form id="customBuilderForm">
                    <section class="custom-builder-section">
                        <strong class="custom-section-title">
                            <span class="custom-section-number">۱</span>
                            نام و فایل‌ها
                        </strong>

                        <label class="custom-field">
                            <span>نام ابزار یا گزارش</span>
                            <input
                                class="custom-input"
                                id="customReportName"
                                type="text"
                                maxlength="80"
                                placeholder="مثلاً بررسی موجودی ویژه"
                                required
                            >
                        </label>

                        <div class="custom-field-grid" style="margin-top:10px">
                            <label class="custom-file-box" id="customBaseBox">
                                <span class="custom-file-icon">X</span>
                                <span class="custom-file-info">
                                    <strong>اکسل مبنا</strong>
                                    <small id="customBaseName">انتخاب فایل</small>
                                </span>
                                <input
                                    id="customBaseFile"
                                    type="file"
                                    accept=".xlsx,.xlsm"
                                    hidden
                                >
                            </label>

                            <label class="custom-file-box" id="customLookupBox">
                                <span class="custom-file-icon">X</span>
                                <span class="custom-file-info">
                                    <strong>اکسل دوم</strong>
                                    <small id="customLookupName">انتخاب فایل</small>
                                </span>
                                <input
                                    id="customLookupFile"
                                    type="file"
                                    accept=".xlsx,.xlsm"
                                    hidden
                                >
                            </label>
                        </div>

                        <button
                            class="custom-inspect-button"
                            id="customInspectButton"
                            type="button"
                        >شناسایی ستون‌های دو فایل</button>
                    </section>

                    <section
                        class="custom-builder-section"
                        id="customMappingSection"
                        hidden
                    >
                        <strong class="custom-section-title">
                            <span class="custom-section-number">۲</span>
                            تطبیق و ستون‌ها
                        </strong>

                        <div class="custom-field-grid">
                            <label class="custom-field">
                                <span>ستون تطبیق اکسل مبنا</span>
                                <select class="custom-select" id="customBaseKey"></select>
                            </label>

                            <label class="custom-field">
                                <span>ستون تطبیق اکسل دوم</span>
                                <select class="custom-select" id="customLookupKey"></select>
                            </label>
                        </div>

                        <div class="custom-column-grid">
                            <div class="custom-column-box">
                                <strong class="custom-column-box-title">
                                    ستون‌های انتقالی از اکسل دوم
                                </strong>
                                <div class="custom-check-list" id="customAppendColumns"></div>
                            </div>

                            <div class="custom-column-box">
                                <strong class="custom-column-box-title">
                                    ستون‌های قابل حذف از اکسل مبنا
                                </strong>
                                <div class="custom-check-list" id="customRemoveColumns"></div>
                            </div>
                        </div>
                    </section>

                    <section
                        class="custom-builder-section"
                        id="customRulesSection"
                        hidden
                    >
                        <strong class="custom-section-title">
                            <span class="custom-section-number">۳</span>
                            رنگ‌بندی و خروجی
                        </strong>

                        <div class="custom-rules" id="customRules"></div>

                        <button
                            class="custom-add-rule"
                            id="customAddRule"
                            type="button"
                        >＋ افزودن قانون رنگ</button>
                    </section>

                    <div
                        class="custom-builder-message"
                        id="customBuilderMessage"
                        aria-live="polite"
                    ></div>

                    <div class="custom-builder-actions">
                        <button
                            class="custom-secondary-button"
                            id="customSavePreset"
                            type="button"
                            disabled
                        >ذخیره میانبر</button>

                        <button
                            class="custom-primary-button"
                            id="customBuildReport"
                            type="submit"
                            disabled
                        >ساخت گزارش</button>
                    </div>
                </form>
            </div>
        </section>
    `;

    document.body.appendChild(overlay);
    return overlay;
}


const customBuilderLaunch = createCustomBuilderLauncher();
const customBuilderOverlay = createCustomBuilderOverlay();
const customBuilderClose = document.getElementById("customBuilderClose");
const customBuilderForm = document.getElementById("customBuilderForm");
const customReportName = document.getElementById("customReportName");
const customBaseFile = document.getElementById("customBaseFile");
const customLookupFile = document.getElementById("customLookupFile");
const customBaseName = document.getElementById("customBaseName");
const customLookupName = document.getElementById("customLookupName");
const customBaseBox = document.getElementById("customBaseBox");
const customLookupBox = document.getElementById("customLookupBox");
const customInspectButton = document.getElementById("customInspectButton");
const customMappingSection = document.getElementById("customMappingSection");
const customRulesSection = document.getElementById("customRulesSection");
const customBaseKey = document.getElementById("customBaseKey");
const customLookupKey = document.getElementById("customLookupKey");
const customAppendColumns = document.getElementById("customAppendColumns");
const customRemoveColumns = document.getElementById("customRemoveColumns");
const customRules = document.getElementById("customRules");
const customAddRule = document.getElementById("customAddRule");
const customSavePreset = document.getElementById("customSavePreset");
const customBuildReport = document.getElementById("customBuildReport");
const customBuilderMessage = document.getElementById("customBuilderMessage");
const customPresetsList = document.getElementById("customPresetsList");
const customPresetsCount = document.getElementById("customPresetsCount");


function readCustomPresets() {
    try {
        const parsed = JSON.parse(
            localStorage.getItem(CUSTOM_PRESETS_KEY) || "[]"
        );

        return Array.isArray(parsed)
            ? parsed.slice(0, CUSTOM_PRESETS_LIMIT)
            : [];
    } catch (error) {
        console.warn("خواندن میانبرهای گزارش‌ساز ممکن نیست.", error);
        return [];
    }
}


function writeCustomPresets(presets) {
    try {
        localStorage.setItem(
            CUSTOM_PRESETS_KEY,
            JSON.stringify(
                presets.slice(0, CUSTOM_PRESETS_LIMIT)
            )
        );
    } catch (error) {
        console.warn("ذخیره میانبر گزارش‌ساز ممکن نیست.", error);
    }
}


function showCustomMessage(message = "", type = "") {
    customBuilderMessage.textContent = message;
    customBuilderMessage.className = "custom-builder-message";

    if (type) {
        customBuilderMessage.classList.add(type);
    }
}


function renderCustomPresets() {
    const presets = readCustomPresets();

    customPresetsList.replaceChildren();
    customPresetsCount.textContent = (
        `${presets.length.toLocaleString("fa-IR")} میانبر`
    );

    if (presets.length === 0) {
        const empty = document.createElement("span");

        empty.className = "custom-presets-empty";
        empty.textContent = "هنوز میانبری ذخیره نشده است.";
        customPresetsList.appendChild(empty);
        return;
    }

    presets.forEach((preset) => {
        const chip = document.createElement("article");
        const openButton = document.createElement("button");
        const deleteButton = document.createElement("button");

        chip.className = "custom-preset-chip";

        openButton.type = "button";
        openButton.textContent = preset.name;
        openButton.style.cssText = [
            "border:0",
            "padding:0",
            "color:inherit",
            "font:inherit",
            "background:transparent",
            "cursor:pointer",
        ].join(";");

        deleteButton.className = "custom-preset-delete";
        deleteButton.type = "button";
        deleteButton.textContent = "×";
        deleteButton.setAttribute(
            "aria-label",
            `حذف میانبر ${preset.name}`
        );

        openButton.addEventListener("click", () => {
            customPendingPreset = preset;
            customReportName.value = preset.name;

            if (customInspection) {
                applyCustomConfigToForm(preset.config);
                showCustomMessage(
                    "تنظیمات میانبر روی فایل‌های فعلی اعمال شد.",
                    "success"
                );
            } else {
                showCustomMessage(
                    "دو فایل را انتخاب و ستون‌ها را شناسایی کن تا میانبر اعمال شود."
                );
            }
        });

        deleteButton.addEventListener("click", () => {
            const nextPresets = readCustomPresets().filter(
                (item) => item.id !== preset.id
            );
            writeCustomPresets(nextPresets);
            renderCustomPresets();
            showCustomMessage("میانبر حذف شد.");
        });

        chip.append(openButton, deleteButton);
        customPresetsList.appendChild(chip);
    });
}


function openCustomBuilder() {
    renderCustomPresets();
    customBuilderOverlay.classList.add("is-open");
    customBuilderOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("custom-builder-open");
    window.setTimeout(() => customReportName.focus(), 80);
}


function closeCustomBuilder() {
    if (customBuilderBusy) {
        return;
    }

    customBuilderOverlay.classList.remove("is-open");
    customBuilderOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("custom-builder-open");
}


function resetCustomInspection() {
    customInspection = null;
    customMappingSection.hidden = true;
    customRulesSection.hidden = true;
    customSavePreset.disabled = true;
    customBuildReport.disabled = true;
    customRules.replaceChildren();
}


function updateCustomFile(input, nameElement, boxElement) {
    const file = input.files?.[0];

    nameElement.textContent = file
        ? file.name
        : "انتخاب فایل";
    boxElement.classList.toggle("has-file", Boolean(file));
    resetCustomInspection();
    showCustomMessage("");
}


function fillCustomSelect(select, headers, selectedValue = "") {
    select.replaceChildren();

    headers.forEach((header) => {
        const option = document.createElement("option");

        option.value = header.source_name;
        option.textContent = `${header.letter} — ${header.name}`;
        option.selected = header.source_name === selectedValue;
        select.appendChild(option);
    });
}


function renderCustomAppendColumns(headers) {
    customAppendColumns.replaceChildren();

    headers.forEach((header) => {
        const row = document.createElement("label");
        const checkbox = document.createElement("input");
        const label = document.createElement("span");
        const outputName = document.createElement("input");

        row.className = "custom-check-row with-name";
        checkbox.type = "checkbox";
        checkbox.className = "custom-append-check";
        checkbox.dataset.sourceHeader = header.source_name;

        label.className = "custom-check-label";
        label.textContent = header.name;
        label.title = header.name;

        outputName.className = "custom-output-name";
        outputName.type = "text";
        outputName.value = header.source_name;
        outputName.placeholder = "نام خروجی";
        outputName.disabled = true;

        checkbox.addEventListener("change", () => {
            outputName.disabled = !checkbox.checked;
            refreshCustomRuleColumns();
        });

        outputName.addEventListener(
            "input",
            refreshCustomRuleColumns
        );

        row.append(checkbox, label, outputName);
        customAppendColumns.appendChild(row);
    });
}


function renderCustomRemoveColumns(headers) {
    customRemoveColumns.replaceChildren();

    headers.forEach((header) => {
        const row = document.createElement("label");
        const checkbox = document.createElement("input");
        const label = document.createElement("span");

        row.className = "custom-check-row";
        checkbox.type = "checkbox";
        checkbox.className = "custom-remove-check";
        checkbox.dataset.header = header.source_name;

        label.className = "custom-check-label";
        label.textContent = header.name;
        label.title = header.name;

        row.append(checkbox, label);
        customRemoveColumns.appendChild(row);
    });

    syncCustomBaseKeyRemoval();
}


function syncCustomBaseKeyRemoval() {
    const baseKey = customBaseKey.value;

    customRemoveColumns.querySelectorAll(
        ".custom-remove-check"
    ).forEach((checkbox) => {
        const isKey = checkbox.dataset.header === baseKey;

        checkbox.disabled = isKey;

        if (isKey) {
            checkbox.checked = false;
        }
    });

    refreshCustomRuleColumns();
}


function getCustomOutputHeaders() {
    if (!customInspection) {
        return [];
    }

    const removed = new Set(
        Array.from(
            customRemoveColumns.querySelectorAll(
                ".custom-remove-check:checked"
            )
        ).map((checkbox) => checkbox.dataset.header)
    );

    const baseHeaders = customInspection.base.headers
        .map((header) => header.source_name)
        .filter((header) => !removed.has(header));

    const appendedHeaders = Array.from(
        customAppendColumns.querySelectorAll(
            ".custom-check-row"
        )
    )
        .filter((row) => row.querySelector(".custom-append-check").checked)
        .map((row) => (
            row.querySelector(".custom-output-name").value.trim()
            || row.querySelector(".custom-append-check").dataset.sourceHeader
        ));

    return [...baseHeaders, ...appendedHeaders];
}


function createCustomOption(value, label) {
    const option = document.createElement("option");

    option.value = value;
    option.textContent = label;
    return option;
}


function refreshCustomRuleColumns() {
    const headers = getCustomOutputHeaders();

    customRules.querySelectorAll(
        ".custom-rule-column"
    ).forEach((select) => {
        const oldValue = select.value;

        select.replaceChildren();
        headers.forEach((header) => {
            select.appendChild(
                createCustomOption(header, header)
            );
        });

        if (headers.includes(oldValue)) {
            select.value = oldValue;
        }
    });
}


function syncCustomRuleValue(row) {
    const operator = row.querySelector(
        ".custom-rule-operator"
    ).value;
    const valueInput = row.querySelector(
        ".custom-rule-value"
    );
    const valueNotNeeded = [
        "empty",
        "not_empty",
    ].includes(operator);

    valueInput.disabled = valueNotNeeded;
    valueInput.placeholder = valueNotNeeded
        ? "نیازی نیست"
        : "مقدار";

    if (valueNotNeeded) {
        valueInput.value = "";
    }
}


function addCustomRule(rule = {}) {
    if (customRules.children.length >= 5) {
        showCustomMessage(
            "حداکثر پنج قانون رنگ می‌توانی اضافه کنی.",
            "error"
        );
        return;
    }

    const row = document.createElement("div");
    const columnSelect = document.createElement("select");
    const operatorSelect = document.createElement("select");
    const valueInput = document.createElement("input");
    const colorSelect = document.createElement("select");
    const deleteButton = document.createElement("button");

    row.className = "custom-rule-row";

    columnSelect.className = "custom-select custom-rule-column";
    getCustomOutputHeaders().forEach((header) => {
        columnSelect.appendChild(
            createCustomOption(header, header)
        );
    });

    operatorSelect.className = "custom-select custom-rule-operator";
    CUSTOM_OPERATORS.forEach(([value, label]) => {
        operatorSelect.appendChild(
            createCustomOption(value, label)
        );
    });

    valueInput.className = "custom-input custom-rule-value";
    valueInput.type = "text";
    valueInput.placeholder = "مقدار";

    colorSelect.className = "custom-select custom-rule-color";
    CUSTOM_COLORS.forEach(([value, label]) => {
        colorSelect.appendChild(
            createCustomOption(value, label)
        );
    });

    deleteButton.className = "custom-rule-delete";
    deleteButton.type = "button";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", "حذف قانون");

    if (rule.column) {
        columnSelect.value = rule.column;
    }

    if (rule.operator) {
        operatorSelect.value = rule.operator;
    }

    if (rule.value !== undefined && rule.value !== null) {
        valueInput.value = rule.value;
    }

    if (rule.color) {
        colorSelect.value = rule.color;
    }

    operatorSelect.addEventListener(
        "change",
        () => syncCustomRuleValue(row)
    );

    deleteButton.addEventListener("click", () => {
        row.remove();
    });

    row.append(
        columnSelect,
        operatorSelect,
        valueInput,
        colorSelect,
        deleteButton
    );
    customRules.appendChild(row);
    syncCustomRuleValue(row);
}


function renderCustomInspection(data) {
    customInspection = data;

    fillCustomSelect(
        customBaseKey,
        data.base.headers
    );
    fillCustomSelect(
        customLookupKey,
        data.lookup.headers
    );
    renderCustomAppendColumns(data.lookup.headers);
    renderCustomRemoveColumns(data.base.headers);
    customRules.replaceChildren();

    customMappingSection.hidden = false;
    customRulesSection.hidden = false;
    customSavePreset.disabled = false;
    customBuildReport.disabled = false;

    if (customPendingPreset) {
        applyCustomConfigToForm(customPendingPreset.config);
    }
}


function applyCustomConfigToForm(config) {
    if (!customInspection || !config) {
        return;
    }

    customReportName.value = config.name || customReportName.value;
    customBaseKey.value = config.base_key || customBaseKey.value;
    customLookupKey.value = config.lookup_key || customLookupKey.value;

    const appendMap = new Map(
        (config.append_columns || []).map((item) => [
            item.source_header,
            item.output_header,
        ])
    );

    customAppendColumns.querySelectorAll(
        ".custom-check-row"
    ).forEach((row) => {
        const checkbox = row.querySelector(".custom-append-check");
        const outputName = row.querySelector(".custom-output-name");
        const savedOutput = appendMap.get(
            checkbox.dataset.sourceHeader
        );

        checkbox.checked = appendMap.has(
            checkbox.dataset.sourceHeader
        );
        outputName.disabled = !checkbox.checked;

        if (savedOutput) {
            outputName.value = savedOutput;
        }
    });

    const removed = new Set(config.remove_columns || []);

    customRemoveColumns.querySelectorAll(
        ".custom-remove-check"
    ).forEach((checkbox) => {
        checkbox.checked = removed.has(
            checkbox.dataset.header
        );
    });

    syncCustomBaseKeyRemoval();
    customRules.replaceChildren();

    (config.rules || []).forEach((rule) => {
        addCustomRule(rule);
    });

    customPendingPreset = null;
}


function collectCustomConfig() {
    const name = customReportName.value.trim();

    if (!name) {
        throw new Error("نام گزارش یا ابزار را وارد کن.");
    }

    if (!customInspection) {
        throw new Error("ابتدا ستون‌های دو فایل را شناسایی کن.");
    }

    const appendColumns = Array.from(
        customAppendColumns.querySelectorAll(
            ".custom-check-row"
        )
    )
        .filter((row) => row.querySelector(".custom-append-check").checked)
        .map((row) => {
            const checkbox = row.querySelector(".custom-append-check");
            const outputName = row.querySelector(".custom-output-name");

            return {
                source_header: checkbox.dataset.sourceHeader,
                output_header: (
                    outputName.value.trim()
                    || checkbox.dataset.sourceHeader
                ),
            };
        });

    if (appendColumns.length === 0) {
        throw new Error(
            "حداقل یک ستون از اکسل دوم برای انتقال انتخاب کن."
        );
    }

    const outputNames = appendColumns.map(
        (item) => item.output_header.toLocaleLowerCase("fa")
    );

    if (new Set(outputNames).size !== outputNames.length) {
        throw new Error("نام ستون‌های خروجی نباید تکراری باشد.");
    }

    const removeColumns = Array.from(
        customRemoveColumns.querySelectorAll(
            ".custom-remove-check:checked"
        )
    ).map((checkbox) => checkbox.dataset.header);

    const removedSet = new Set(removeColumns);
    const keptBaseNames = customInspection.base.headers
        .map((header) => header.source_name)
        .filter((header) => !removedSet.has(header))
        .map((header) => header.trim().toLocaleLowerCase("fa"));
    const conflictingName = outputNames.find(
        (header) => keptBaseNames.includes(header)
    );

    if (conflictingName) {
        throw new Error(
            "نام ستون انتقالی با یکی از ستون‌های اکسل مبنا تکراری است؛ نام خروجی را تغییر بده."
        );
    }

    const rules = Array.from(
        customRules.querySelectorAll(".custom-rule-row")
    ).map((row) => ({
        column: row.querySelector(".custom-rule-column").value,
        operator: row.querySelector(".custom-rule-operator").value,
        value: row.querySelector(".custom-rule-value").value,
        color: row.querySelector(".custom-rule-color").value,
    }));

    return {
        name,
        base_key: customBaseKey.value,
        lookup_key: customLookupKey.value,
        append_columns: appendColumns,
        remove_columns: removeColumns,
        rules,
    };
}


async function readCustomError(response) {
    try {
        const data = await response.json();
        return data.detail || "عملیات با خطا مواجه شد.";
    } catch (error) {
        return "عملیات با خطا مواجه شد.";
    }
}


function setCustomBusy(isBusy, label = "") {
    customBuilderBusy = isBusy;
    customInspectButton.disabled = isBusy;
    customSavePreset.disabled = isBusy || !customInspection;
    customBuildReport.disabled = isBusy || !customInspection;
    customBuilderClose.disabled = isBusy;

    customBuildReport.textContent = isBusy && label
        ? label
        : "ساخت گزارش";
}


async function inspectCustomFiles() {
    const baseFile = customBaseFile.files?.[0];
    const lookupFile = customLookupFile.files?.[0];

    if (!baseFile || !lookupFile) {
        showCustomMessage(
            "هر دو فایل اکسل را انتخاب کن.",
            "error"
        );
        return;
    }

    const formData = new FormData();
    formData.append("files", baseFile);
    formData.append("files", lookupFile);

    setCustomBusy(true);
    customInspectButton.textContent = "در حال شناسایی ستون‌ها...";
    showCustomMessage("فایل‌ها در حال بررسی هستند...");

    try {
        const response = await fetch(
            "/custom-report/inspect",
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) {
            throw new Error(await readCustomError(response));
        }

        const data = await response.json();
        renderCustomInspection(data);
        showCustomMessage(
            `${data.base.column_count.toLocaleString("fa-IR")} ستون مبنا و `
            + `${data.lookup.column_count.toLocaleString("fa-IR")} ستون اکسل دوم شناسایی شد.`,
            "success"
        );
    } catch (error) {
        resetCustomInspection();
        showCustomMessage(
            error.message || "شناسایی ستون‌ها انجام نشد.",
            "error"
        );
    } finally {
        setCustomBusy(false);
        customInspectButton.textContent = "شناسایی ستون‌های دو فایل";
    }
}


function saveCustomPreset() {
    try {
        const config = collectCustomConfig();
        const presets = readCustomPresets();
        const normalizedName = config.name.trim().toLocaleLowerCase("fa");
        const oldPreset = presets.find(
            (preset) => (
                preset.name.trim().toLocaleLowerCase("fa")
                === normalizedName
            )
        );
        const newPreset = {
            id: oldPreset?.id || `${Date.now()}-${Math.random()}`,
            name: config.name,
            config,
            updated_at: new Date().toISOString(),
        };
        const nextPresets = [
            newPreset,
            ...presets.filter((preset) => preset.id !== oldPreset?.id),
        ];

        writeCustomPresets(nextPresets);
        renderCustomPresets();
        showCustomMessage(
            "میانبر گزارش با موفقیت ذخیره شد.",
            "success"
        );
    } catch (error) {
        showCustomMessage(error.message, "error");
    }
}


function downloadCustomReport(blob, reportName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const now = new Date();
    const stamp = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0"),
    ].join("-");
    const safeName = reportName.replace(
        /[^\w\u0600-\u06ff-]+/g,
        "-"
    );

    link.href = url;
    link.download = `${safeName || "custom-report"}-${stamp}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}


async function buildCustomReport() {
    const baseFile = customBaseFile.files?.[0];
    const lookupFile = customLookupFile.files?.[0];

    if (!baseFile || !lookupFile) {
        throw new Error("هر دو فایل اکسل را انتخاب کن.");
    }

    const config = collectCustomConfig();
    const formData = new FormData();

    formData.append("files", baseFile);
    formData.append("files", lookupFile);
    formData.append("config", JSON.stringify(config));

    setCustomBusy(true, "در حال ساخت گزارش...");
    showCustomMessage("تطبیق و ساخت خروجی در حال انجام است...");

    try {
        const response = await fetch(
            "/custom-report/build",
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) {
            throw new Error(await readCustomError(response));
        }

        const blob = await response.blob();
        const matched = response.headers.get(
            "X-Report-Matched-Count"
        );
        const unmatched = response.headers.get(
            "X-Report-Unmatched-Count"
        );

        downloadCustomReport(blob, config.name);

        if (typeof window.addActivity === "function") {
            window.addActivity(`گزارش سفارشی: ${config.name}`);
        }

        const summary = matched !== null
            ? `گزارش آماده شد؛ ${Number(matched).toLocaleString("fa-IR")} ردیف مچ و ${Number(unmatched || 0).toLocaleString("fa-IR")} ردیف بدون تطبیق.`
            : "گزارش با موفقیت ساخته و دانلود شد.";

        showCustomMessage(summary, "success");
    } finally {
        setCustomBusy(false);
    }
}


customBuilderLaunch.addEventListener("click", openCustomBuilder);
customBuilderClose.addEventListener("click", closeCustomBuilder);

customBuilderOverlay.addEventListener("click", (event) => {
    if (event.target === customBuilderOverlay) {
        closeCustomBuilder();
    }
});

document.addEventListener("keydown", (event) => {
    if (
        event.key === "Escape"
        && customBuilderOverlay.classList.contains("is-open")
    ) {
        closeCustomBuilder();
    }
});

customBaseFile.addEventListener("change", () => {
    updateCustomFile(
        customBaseFile,
        customBaseName,
        customBaseBox
    );
});

customLookupFile.addEventListener("change", () => {
    updateCustomFile(
        customLookupFile,
        customLookupName,
        customLookupBox
    );
});

customBaseKey.addEventListener(
    "change",
    syncCustomBaseKeyRemoval
);

customRemoveColumns.addEventListener(
    "change",
    refreshCustomRuleColumns
);

customInspectButton.addEventListener(
    "click",
    inspectCustomFiles
);

customAddRule.addEventListener(
    "click",
    () => addCustomRule()
);

customSavePreset.addEventListener(
    "click",
    saveCustomPreset
);

customBuilderForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        await buildCustomReport();
    } catch (error) {
        showCustomMessage(
            error.message || "ساخت گزارش انجام نشد.",
            "error"
        );
        setCustomBusy(false);
    }
});


renderCustomPresets();
