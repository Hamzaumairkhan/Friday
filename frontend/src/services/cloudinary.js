/**
 * Cloudinary Unsigned Upload Service
 * Uses environment variables:
 * VITE_CLOUDINARY_CLOUD_NAME
 * VITE_CLOUDINARY_UPLOAD_PRESET
 */

export async function uploadToCloudinary(file, folder = 'friday_uploads') {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    // If Cloudinary env vars are missing, create a base64 Data URL or mock preview URL
    // while notifying clearly in the console so it functions seamlessly in dev
    console.warn('VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET not set. Generating local data URL as fallback for local testing.');
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  if (folder) {
    formData.append('folder', folder);
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Failed to upload image to Cloudinary');
  }

  const data = await response.json();
  return data.secure_url;
}

export default uploadToCloudinary;
