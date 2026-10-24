// Resize and check photos in the browser before they are posted to FormSubmit.
// Re-encoding on a canvas drops EXIF and GPS. No libraries.

const MAX_PHOTOS = 3;
const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;
const MAX_SIDE = 2000;
const START_QUALITY = 0.85;
const MIN_QUALITY = 0.4;
const QUALITY_STEP = 0.05;

const form = document.getElementById("photo-form");
const fileInput = document.getElementById("photos");
const preview = document.getElementById("photo-preview");
const sizeReadout = document.getElementById("size-readout");
const errors = document.getElementById("form-errors");
const status = document.getElementById("form-status");
const submitButton = document.getElementById("submit-photo");

form.hidden = false;

let previewUrls = [];
let ignoreChange = false;
let processing = false;

fileInput.addEventListener("change", () => {
  if (ignoreChange || processing) return;
  showSelection(fileInput.files);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearStatus();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const files = [...fileInput.files];
  const problems = validateFiles(files);
  if (problems.length) {
    showErrors(problems, true);
    return;
  }

  processing = true;
  submitButton.disabled = true;
  status.textContent = "Preparing your photos…";

  try {
    const canvases = [];
    for (const file of files) {
      canvases.push(await drawScaled(file));
    }
    const blobs = await encodeUnderLimit(canvases);
    const renamed = blobs.map((blob, index) => new File([blob], `photo-${index + 1}.jpg`, { type: "image/jpeg" }));
    const transfer = new DataTransfer();
    renamed.forEach((file) => transfer.items.add(file));
    ignoreChange = true;
    fileInput.files = transfer.files;
    ignoreChange = false;
    renderPreview(renamed, "Ready to send");
    status.textContent = "Sending…";
    form.submit();
  } catch (error) {
    processing = false;
    submitButton.disabled = false;
    showErrors([error.message || "We couldn't prepare those photos. Please try again."], true);
  }
});

function showSelection(fileList) {
  const files = [...fileList];
  const problems = files.length ? validateFiles(files) : [];
  if (problems.length) {
    showErrors(problems, false);
    renderPreview([], "");
    sizeReadout.textContent = "";
    return;
  }
  clearErrors();
  renderPreview(files, "Total size");
}

function validateFiles(files) {
  const problems = [];
  if (!files.length) {
    problems.push("Choose at least one photo.");
    return problems;
  }
  if (files.length > MAX_PHOTOS) {
    problems.push(`Choose up to ${MAX_PHOTOS} photos. You selected ${files.length}.`);
  }
  files.forEach((file) => {
    const kind = fileKind(file);
    if (kind === "heic") {
      problems.push(`${file.name} looks like an iPhone HEIC photo. Share it as Most Compatible (JPEG), or convert it to JPEG, then try again.`);
    } else if (kind !== "ok") {
      problems.push(`${file.name} isn't a JPEG, PNG, or WebP photo.`);
    }
    if (file.size > MAX_ORIGINAL_BYTES) {
      problems.push(`${file.name} is ${formatSize(file.size)}. Each photo needs to be 15 MB or smaller.`);
    }
  });
  return problems;
}

function fileKind(file) {
  const type = (file.type || "").toLowerCase();
  const name = file.name || "";
  if (type.includes("heic") || type.includes("heif") || /\.hei[cf]$/i.test(name)) return "heic";
  if (type === "image/jpeg" || type === "image/jpg" || type === "image/pjpeg" || /\.jpe?g$/i.test(name)) return "ok";
  if (type === "image/png" || /\.png$/i.test(name)) return "ok";
  if (type === "image/webp" || /\.webp$/i.test(name)) return "ok";
  return "other";
}

async function drawScaled(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (error) {
    try {
      bitmap = await createImageBitmap(file);
    } catch (readError) {
      throw new Error(`We couldn't read ${file.name}. Try a JPEG, PNG, or WebP.`);
    }
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if (bitmap.close) bitmap.close();
  return canvas;
}

async function encodeUnderLimit(canvases) {
  let quality = START_QUALITY;
  let blobs = await blobsAt(canvases, quality);
  while (totalSize(blobs) > MAX_UPLOAD_BYTES && quality - QUALITY_STEP >= MIN_QUALITY) {
    quality = Math.round((quality - QUALITY_STEP) * 100) / 100;
    blobs = await blobsAt(canvases, quality);
  }
  if (totalSize(blobs) > MAX_UPLOAD_BYTES) {
    throw new Error("Those photos are still too large to send together after resizing. Try fewer photos.");
  }
  return blobs;
}

function blobsAt(canvases, quality) {
  return Promise.all(canvases.map((canvas) => new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("We couldn't prepare a photo. Please try again."));
      else resolve(blob);
    }, "image/jpeg", quality);
  })));
}

function totalSize(blobs) {
  return blobs.reduce((sum, blob) => sum + blob.size, 0);
}

function renderPreview(files, label) {
  previewUrls.forEach((url) => URL.revokeObjectURL(url));
  previewUrls = [];
  preview.replaceChildren();
  if (!files.length) {
    sizeReadout.textContent = "";
    return;
  }
  files.forEach((file) => {
    const url = URL.createObjectURL(file);
    previewUrls.push(url);
    const item = document.createElement("li");
    const image = document.createElement("img");
    image.src = url;
    image.alt = "";
    const text = document.createElement("p");
    const name = document.createElement("strong");
    name.textContent = file.name;
    const size = document.createElement("span");
    size.textContent = formatSize(file.size);
    text.append(name, document.createElement("br"), size);
    item.append(image, text);
    preview.append(item);
  });
  sizeReadout.textContent = `${label}: ${formatSize(totalSize(files))} for ${files.length} photo${files.length === 1 ? "" : "s"}`;
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function showErrors(messages, focus) {
  status.textContent = "";
  errors.replaceChildren();
  const list = document.createElement("ul");
  messages.forEach((message) => {
    const item = document.createElement("li");
    item.textContent = message;
    list.append(item);
  });
  errors.append(list);
  if (focus) errors.focus();
}

function clearErrors() {
  errors.replaceChildren();
}

function clearStatus() {
  status.textContent = "";
}
