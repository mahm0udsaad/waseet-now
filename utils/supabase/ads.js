import { ensureSupabaseSession, supabase } from "./client";

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
  const normalizedPrice = type === "taqib" ? null : price ? Number(price) : null;

  const { data, error } = await supabase
    .from("ads")
    .insert({
      owner_id: userId,
      type,
      title,
      description,
      price: normalizedPrice,
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
    .eq("status", "active")
    .order("pin_position", { ascending: true, nullsFirst: false })
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

export async function fetchAllAdsByType(type) {
  const { data, error } = await supabase
    .from("ads")
    .select("*, ad_images(storage_path, sort_order), owner:profiles!owner_id(display_name, phone)")
    .eq("type", type)
    .order("pin_position", { ascending: true, nullsFirst: false })
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

export async function adminDeleteAd(adId) {
  const { error } = await supabase.rpc("admin_delete_ad", { p_ad_id: adId });
  if (error) throw error;
}

export async function adminSuspendAd(adId, reason = null) {
  const { error } = await supabase.rpc("admin_suspend_ad", {
    p_ad_id: adId,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function adminUnsuspendAd(adId) {
  const { error } = await supabase.rpc("admin_unsuspend_ad", { p_ad_id: adId });
  if (error) throw error;
}

export async function adminSetPinPosition(adId, position) {
  const { error } = await supabase.rpc("admin_set_pin_position", {
    p_ad_id: adId,
    p_position: position,
  });
  if (error) throw error;
}

export async function adminClearPinPosition(adId) {
  const { error } = await supabase.rpc("admin_clear_pin_position", { p_ad_id: adId });
  if (error) throw error;
}

export async function fetchAdById(adId) {
  const { data, error } = await supabase
    .from("ads")
    .select("*, ad_images(storage_path, sort_order)")
    .eq("id", adId)
    .single();

  if (error) throw error;

  return {
    ...data,
    images: (data.ad_images || []).map((img) => ({
      ...img,
      publicUrl: buildPublicUrl(img.storage_path),
    })),
  };
}

