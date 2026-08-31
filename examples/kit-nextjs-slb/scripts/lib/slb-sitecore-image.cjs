const fs = require("node:fs");

function xmlEscape(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}

function validateDescriptor(filename, descriptor) {
    const valid =
        descriptor &&
        typeof descriptor.publicUrl === "string" &&
        descriptor.publicUrl.startsWith(
            "https://thlt-demo.sitecoresandbox.cloud/api/public/content/",
        ) &&
        Number.isSafeInteger(descriptor.damId) &&
        descriptor.damId > 0 &&
        descriptor.contentType === "Image" &&
        Number.isSafeInteger(descriptor.width) &&
        descriptor.width > 0 &&
        Number.isSafeInteger(descriptor.height) &&
        descriptor.height > 0;

    if (!valid) {
        throw new Error(`Invalid Content Hub DAM descriptor for ${filename}`);
    }

    return Object.freeze({ ...descriptor });
}

function loadSlbDamAssetDescriptors(filePath) {
    const catalog = JSON.parse(fs.readFileSync(filePath, "utf8"));

    if (!catalog || Array.isArray(catalog) || typeof catalog !== "object") {
        throw new Error("Content Hub DAM descriptor catalog must be an object");
    }

    return new Map(
        Object.entries(catalog).map(([filename, descriptor]) => [
            filename,
            validateDescriptor(filename, descriptor),
        ]),
    );
}

function serializeSitecoreDamImage(image, descriptors) {
    if (!image?.filename) return undefined;

    const descriptor = descriptors.get(image.filename);
    if (!descriptor) {
        throw new Error(
            `Missing Content Hub DAM descriptor for referenced content image: ${image.filename}`,
        );
    }

    validateDescriptor(image.filename, descriptor);

    const publicUrl = xmlEscape(descriptor.publicUrl);
    return `<image mediaid="" src="${publicUrl}" thumbnailsrc="${publicUrl}" dam-id="${descriptor.damId}" dam-content-type="${descriptor.contentType}" width="${descriptor.width}" height="${descriptor.height}" alt="${xmlEscape(image.alt)}" />`;
}

module.exports = {
    loadSlbDamAssetDescriptors,
    serializeSitecoreDamImage,
    validateDescriptor,
};
