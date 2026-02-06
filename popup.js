// ── Elements ──
const cards = document.querySelectorAll(".card");
const removeBtn = document.getElementById("remove-btn");
const customCard = document.getElementById("custom-card");
const customPreview = document.getElementById("custom-preview");
const uploadPlaceholder = document.getElementById("upload-placeholder");
const changeBtn = document.getElementById("change-btn");
const fileInput = document.getElementById("file-input");

// ── Highlight the active card ──
function setActive(bgName) {
  cards.forEach((card) => {
    card.classList.toggle("active", card.dataset.bg === bgName);
  });
  removeBtn.disabled = !bgName;
}

// ── Show or hide the custom thumbnail ──
function showCustomPreview(dataUrl) {
  if (dataUrl) {
    customPreview.src = dataUrl;
    customPreview.style.display = "block";
    uploadPlaceholder.style.display = "none";
    changeBtn.style.display = "block";
  } else {
    customPreview.src = "";
    customPreview.style.display = "none";
    uploadPlaceholder.style.display = "flex";
    changeBtn.style.display = "none";
  }
}

// ── Load custom preview from storage ──
function loadCustomPreview() {
  chrome.storage.local.get("chatfaces_custom_data", (data) => {
    showCustomPreview(data.chatfaces_custom_data || null);
  });
}

// ── On load: read saved choice + custom preview ──
chrome.storage.sync.get("chatfaces_bg", (data) => {
  setActive(data.chatfaces_bg || null);
});
loadCustomPreview();

// ── Preset card click: save choice ──
cards.forEach((card) => {
  if (card.id === "custom-card") return; // handled separately
  card.addEventListener("click", () => {
    const bg = card.dataset.bg;
    chrome.storage.sync.set({ chatfaces_bg: bg }, () => {
      setActive(bg);
    });
  });
});

// ── Custom card click ──
customCard.addEventListener("click", (e) => {
  // If clicking the "Change" button, open file picker
  if (e.target.id === "change-btn") {
    fileInput.click();
    return;
  }

  // If a custom image already exists, select it as active
  chrome.storage.local.get("chatfaces_custom_data", (data) => {
    if (data.chatfaces_custom_data) {
      chrome.storage.sync.set({ chatfaces_bg: "custom" }, () => {
        setActive("custom");
      });
    } else {
      // No custom image yet — open file picker
      fileInput.click();
    }
  });
});

// ── File selected: read, store, and activate ──
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataUrl = ev.target.result;

    // Store the image data in local storage
    chrome.storage.local.set({ chatfaces_custom_data: dataUrl }, () => {
      showCustomPreview(dataUrl);

      // Activate it
      chrome.storage.sync.set({ chatfaces_bg: "custom" }, () => {
        setActive("custom");
      });
    });
  };
  reader.readAsDataURL(file);

  // Reset so the same file can be re-selected
  fileInput.value = "";
});

// ── Remove button: clear active choice but keep custom image data ──
removeBtn.addEventListener("click", () => {
  chrome.storage.sync.remove("chatfaces_bg", () => {
    setActive(null);
  });
});
