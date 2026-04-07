import sharp from "sharp";
import fs from "fs";

const filePath = process.argv[2];
const ratio = process.argv[3] || "16:9";

if (!filePath) {
    console.error("Usage: tsx crop-images.ts <absolute_path> [ratio]");
    process.exit(1);
}

async function crop() {
    try {
        const [wRatio, hRatio] = ratio.split(':').map(Number);
        const buffer = fs.readFileSync(filePath);
        const metadata = await sharp(buffer).metadata();
        
        if (!metadata.width || !metadata.height) {
            throw new Error("Invalid image metadata");
        }
        
        const targetRatio = wRatio / hRatio;
        let targetW = metadata.width;
        let targetH = metadata.height;

        if (metadata.width / metadata.height > targetRatio) {
            targetW = Math.round(metadata.height * targetRatio);
        } else {
            targetH = Math.round(metadata.width / targetRatio);
        }

        const left = Math.round((metadata.width - targetW) / 2);
        const top = Math.round((metadata.height - targetH) / 2);

        const cropped = await sharp(buffer)
            .extract({ left, top, width: targetW, height: targetH })
            .toBuffer();
            
        fs.writeFileSync(filePath, cropped);
        console.log(`✅ Successfully cropped ${filePath} to ${targetW}x${targetH} (${ratio})`);
    } catch (e: any) {
        console.error("❌ Cropping failed:", e.message);
        process.exit(1);
    }
}

crop();
