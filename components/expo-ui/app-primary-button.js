import { Platform } from "react-native";

const AppPrimaryButton =
  Platform.OS === "ios"
    ? require("./app-primary-button.ios").default
    : Platform.OS === "android"
      ? require("./app-primary-button.android").default
      : require("./app-primary-button.web").default;

export default AppPrimaryButton;
