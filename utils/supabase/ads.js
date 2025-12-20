import { supabase, ensureSupabaseSession } from "./client";

const ADS_BUCKET = "ads";

function buildPublicUrl(path) {
  const { data } = supabase.storage.from(ADS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function uploadAdImages(userId, images = []) {
  const uploaded = [];
  for (let index = 0; index < images.length; index++) {
    const img = images[index];
    if (!img?.uri) continue;
    const extension = (img.name || img.uri)?.split(".").pop() || "jpg";
    const objectPath = `${userId}/ads/${Date.now()}-${index}.${extension}`;

    const response = await fetch(img.uri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from(ADS_BUCKET)
      .upload(objectPath, blob, {
        contentType: img.mimeType || "image/jpeg",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    uploaded.push({
      storage_path: objectPath,
      publicUrl: buildPublicUrl(objectPath),
    });
  }
  return uploaded;
}

export async function createAd({ type, title, description, price, location, metadata = {}, images = [] }) {
  const session = await ensureSupabaseSession();
  const userId = session.user.id;

  const uploaded = await uploadAdImages(userId, images);

  const { data, error } = await supabase
    .from("ads")
    .insert({
      owner_id: userId,
      type,
      title,
      description,
      price: price ? Number(price) : null,
      location,
      metadata,
    })
    .select()
    .single();

  if (error) throw error;

  if (uploaded.length > 0) {
    const adImages = uploaded.map((img, i) => ({
      ad_id: data.id,
      storage_path: img.storage_path,
      sort_order: i,
    }));
    const { error: imgError } = await supabase.from("ad_images").insert(adImages);
    if (imgError) throw imgError;
  }

  return { ...data, images: uploaded };
}

export async function fetchAdsByType(type) {
  const { data, error } = await supabase
    .from("ads")
    .select("*, ad_images(storage_path, sort_order)")
    .eq("type", type)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((ad) => ({
    ...ad,
    images: (ad.ad_images || []).map((img) => ({
      ...img,
      publicUrl: buildPublicUrl(img.storage_path),
    })),
  }));
}

