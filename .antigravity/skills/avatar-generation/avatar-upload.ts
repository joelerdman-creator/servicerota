import { firestore, storage } from "../../../src/firebase/admin-app";
import { firebaseConfig } from "../../../src/firebase/config";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";

// Helper to ensure arguments are passed
const [, , filePath, role, gender] = process.argv;

if (!filePath || !role || !gender) {
  console.error("Usage: npx tsx avatar-upload.ts <absolute_path_to_webp> <role> <gender>");
  process.exit(1);
}

async function uploadAvatar() {
  if (!firestore) {
    console.error("Firestore admin not initialized.");
    process.exit(1);
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const uuid = crypto.randomUUID();
    // Use the exact path standard: avatars/[role]/[uuid].webp
    const formattedRole = role.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const storagePath = `avatars/${formattedRole}/${gender}_${uuid}.png`;

    if (!storage) {
      console.error("Storage admin not initialized.");
      process.exit(1);
    }
    const bucket = storage.bucket(firebaseConfig.storageBucket);
    const file = bucket.file(storagePath);

    console.log(`Uploading to gs://${firebaseConfig.storageBucket}/${storagePath}...`);

    await file.save(fileBuffer, {
      metadata: {
        contentType: "image/png",
      },
    });

    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${firebaseConfig.storageBucket}/${storagePath}`;

    // Optionally map avatars in the database if there's a collection, or just let them exist in storage.
    // For now we'll write to graphic_assets so the user can see/approve them in the platform.
    const docRef = firestore.collection("graphic_assets").doc(uuid);
    await docRef.set({
      url: publicUrl,
      storagePath,
      role,
      gender,
      assetType: "avatar",
      approved: true, // Auto-approve avatars since they are generic place-holders
      generatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`Successfully uploaded Avatar. URL: ${publicUrl}`);
  } catch (error) {
    console.error("Upload failed", error);
    process.exit(1);
  }
}

uploadAvatar();
