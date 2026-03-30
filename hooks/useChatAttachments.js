import { useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Location from "expo-location";

function formatLocationLabel(placemark, isRTL) {
  if (!placemark) return null;

  const parts = [
    placemark.name,
    placemark.street,
    placemark.district,
    placemark.city || placemark.subregion,
    placemark.region,
  ]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);

  const uniqueParts = [...new Set(parts)];
  if (uniqueParts.length === 0) {
    return isRTL ? "الموقع الحالي" : "Current Location";
  }

  return uniqueParts.slice(0, 3).join("، ");
}

export function useChatAttachments(t, isRTL) {
  const [attachments, setAttachments] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [sharingLocation, setSharingLocation] = useState(false);

  // Pick image from gallery
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t.common.error, "Permission to access gallery was denied");
      return false;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newAttachments = result.assets.map((asset, index) => ({
        id: `img-${Date.now()}-${index}`,
        type: "image",
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType || "image/jpeg",
      }));
      setAttachments((prev) => [...prev, ...newAttachments]);
      return true;
    }

    return false;
  };

  // Take photo with camera
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t.common.error, "Permission to access camera was denied");
      return false;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled) {
      setAttachments((prev) => [
        ...prev,
        {
          id: `img-${Date.now()}`,
          type: "image",
          uri: result.assets[0].uri,
          width: result.assets[0].width,
          height: result.assets[0].height,
          mimeType: result.assets[0].mimeType || "image/jpeg",
        },
      ]);
      return true;
    }

    return false;
  };

  // Pick document
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: true,
      });

      if (!result.canceled) {
        const newAttachments = result.assets.map((asset, index) => ({
          id: `file-${Date.now()}-${index}`,
          type: "file",
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
          mimeType: asset.mimeType || "application/octet-stream",
        }));
        setAttachments((prev) => [...prev, ...newAttachments]);
        return true;
      }

      return false;
    } catch (error) {
      console.log("Document picker error:", error);
      return false;
    }
  };

  // Share location
  const shareLocation = async () => {
    if (sharingLocation) return false;

    setSharingLocation(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setSharingLocation(false);
      Alert.alert(t.common.error, "Permission to access location was denied");
      return false;
    }

    try {
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      let label = null;

      try {
        const [placemark] = await Location.reverseGeocodeAsync({ latitude, longitude });
        label = formatLocationLabel(placemark, isRTL);
      } catch (reverseGeocodeError) {
        console.warn("Failed to reverse geocode chat location:", reverseGeocodeError);
      }

      setAttachments((prev) => [
        ...prev,
        {
          id: `loc-${Date.now()}`,
          type: "location",
          latitude,
          longitude,
          label,
        },
      ]);
      return true;
    } catch (error) {
      Alert.alert(t.common.error, "Could not get location");
      return false;
    } finally {
      setSharingLocation(false);
    }
  };

  // Remove attachment
  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Clear all attachments
  const clearAttachments = () => {
    setAttachments([]);
  };

  return {
    attachments,
    selectedImage,
    setSelectedImage,
    pickImage,
    takePhoto,
    pickDocument,
    shareLocation,
    sharingLocation,
    removeAttachment,
    clearAttachments,
  };
}
