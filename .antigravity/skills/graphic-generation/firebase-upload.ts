import { getStorage } from "firebase-admin/storage";
import { firestore } from "../../../src/firebase/admin-app";
import { firebaseConfig } from "../../../src/firebase/config";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";

// Helper to ensure arguments are passed
const [, , filePath, role, denomination, styleVersion] = process.argv;

if (!filePath || !role || !denomination || !styleVersion) {
  console.error("Usage: npx tsx firebase-upload.ts <absolute_path_to_webp> <role> <denomination> <styleVersion>");
  process.exit(1);
}

async function uploadGraphic() {
  if (!firestore) {
    console.error("Firestore admin not initialized.");
    process.exit(1);
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const uuid = crypto.randomUUID();
    const storagePath = `graphics/${role}/${denomination}/${uuid}.webp`;

    const storage = getStorage();
    const bucket = storage.bucket(firebaseConfig.storageBucket);
    const file = bucket.file(storagePath);

    console.log(`Uploading to gs://${firebaseConfig.storageBucket}/${storagePath}...`);

    await file.save(fileBuffer, {
      metadata: {
        contentType: "image/webp",
      },
    });

    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${firebaseConfig.storageBucket}/${storagePath}`;

    // Write to Firestore mapping
    const docRef = firestore.collection("graphic_assets").doc(uuid);
    await docRef.set({
      url: publicUrl,
      storagePath,
      role,
      denominationCluster: denomination, // storing the full denomination name
      styleVersion,
      approved: false,
      generatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`Successfully uploaded. URL: ${publicUrl}`);
  } catch (error) {
    console.error("Upload failed", error);
    process.exit(1);
  }
}

uploadGraphic();
