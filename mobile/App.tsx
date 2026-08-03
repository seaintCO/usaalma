import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Camera } from "expo-camera";
import { requestRecordingPermissionsAsync } from "expo-audio";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";
import {
  ALMA_ROUTES,
  classifyNavigation,
  type AlmaRoute,
} from "./src/navigation";
import { requestAlmaPushRegistration } from "./src/notifications";

const configuredBase = String(
  Constants.expoConfig?.extra?.almaBaseUrl ?? "https://www.seaintalma.com",
).replace(/\/$/, "");

function appUrl(path: string) {
  return `${configuredBase}${path}`;
}

const NATIVE_BOOTSTRAP = `
  (function () {
    document.documentElement.dataset.almaNativeIos = 'true';
    window.__ALMA_NATIVE_IOS__ = true;
    var theme = localStorage.getItem('alma-theme') === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.almaTheme = theme;
    document.documentElement.style.colorScheme = theme;
    function reportTheme(){
      if(window.ReactNativeWebView){
        window.ReactNativeWebView.postMessage('theme:' + (document.documentElement.dataset.almaTheme || 'dark'));
      }
    }
    new MutationObserver(reportTheme).observe(document.documentElement, {attributes:true, attributeFilter:['data-alma-theme']});
    setTimeout(reportTheme, 50);
  })();
  true;
`;

function AlmaApp() {
  const webView = useRef<WebView>(null);
  const [source, setSource] = useState(appUrl(ALMA_ROUTES.login));
  const [loading, setLoading] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [dark, setDark] = useState(true);

  const host = useMemo(() => new URL(configuredBase).host, []);

  function go(route: AlmaRoute) {
    setToolsOpen(false);
    setSource(appUrl(ALMA_ROUTES[route]));
  }

  function handleNavigation(request: { url: string }) {
    const decision = classifyNavigation(request.url, configuredBase);
    if (decision === "internal" || decision === "oauth") return true;
    if (decision === "external") void Linking.openURL(request.url);
    return false;
  }

  function afterNavigate(event: WebViewNavigation) {
    setCanGoBack(event.canGoBack);
    setCanGoForward(event.canGoForward);
    setLoading(false);
  }

  async function openReceiptCamera() {
    const permission = await Camera.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Camera permission",
        "Enable camera access in iPhone Settings to scan receipts.",
      );
      return;
    }
    go("money");
    setTimeout(() => {
      webView.current?.injectJavaScript(`
        (function(){
          var input=document.querySelector('input[type=file][accept*="image"]');
          if(input){input.click();}else{window.scrollTo(0,document.body.scrollHeight);}
        })(); true;
      `);
    }, 900);
  }

  async function openLiveCamera() {
    const permission = await Camera.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Camera permission",
        "Enable camera access in iPhone Settings to use ALMA Live Camera.",
      );
      return;
    }
    setToolsOpen(false);
    setSource(`${appUrl(ALMA_ROUTES.alma)}?liveCamera=1`);
  }

  async function openDocumentPicker() {
    go("documents");
    setTimeout(() => {
      webView.current?.injectJavaScript(`
        (function(){
          var input=document.querySelector('input[type=file]');
          if(input){input.click();}else{window.scrollTo(0,0);}
        })(); true;
      `);
    }, 900);
  }

  async function enableMicrophone() {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Microphone permission",
        "Enable microphone access in iPhone Settings to talk with ALMA.",
      );
      return;
    }
    go("alma");
    Alert.alert(
      "Microphone ready",
      "Tap the microphone in ALMA to speak, transcribe, or translate.",
    );
  }

  async function enableNotifications() {
    setNotificationBusy(true);
    try {
      const registration = await requestAlmaPushRegistration();
      const payload = JSON.stringify({
        ...registration,
        platform: "ios",
        appVersion: Constants.expoConfig?.version ?? "1.0.0",
        locale: "en",
      });
      webView.current?.injectJavaScript(`
        fetch('/api/mobile/devices', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          credentials: 'same-origin',
          body: ${JSON.stringify(payload)}
        }).then(function(r){return r.ok?r.json():Promise.reject();})
          .then(function(){window.ReactNativeWebView.postMessage('push:registered');})
          .catch(function(){window.ReactNativeWebView.postMessage('push:signin-required');});
        true;
      `);
      Alert.alert(
        "Notifications enabled",
        "ALMA can notify you about approvals, work, invoices, and customer activity.",
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message === "eas_project_id_required"
          ? "Finish the EAS project link before enabling push notifications."
          : "Notifications were not enabled. You can try again from this menu.";
      Alert.alert("Notifications", message);
    } finally {
      setNotificationBusy(false);
    }
  }

  function toggleAppearance() {
    const next = dark ? "light" : "dark";
    setDark(!dark);
    setToolsOpen(false);
    webView.current?.injectJavaScript(`
      (function(){
        var next=${JSON.stringify(next)};
        localStorage.setItem('alma-theme', next);
        document.documentElement.dataset.almaTheme=next;
        document.documentElement.style.colorScheme=next;
        window.dispatchEvent(new CustomEvent('alma-theme-change',{detail:next}));
      })(); true;
    `);
  }

  const ink = dark ? "#F5F7FB" : "#080A0D";
  const muted = dark ? "#99A5BA" : "#697386";
  const chrome = dark ? "#080B12" : "#FFFFFF";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: chrome }]}>
      <StatusBar style={dark ? "light" : "dark"} />
      <View
        style={[
          styles.header,
          {
            backgroundColor: chrome,
            borderBottomColor: dark ? "#20283A" : "#D9DEE7",
          },
        ]}
      >
        <View style={styles.brandMark}>
          <Text style={styles.brandLetter}>A</Text>
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: ink }]}>ALMA Office</Text>
          <Text style={[styles.host, { color: muted }]}>{host}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open native tools"
          onPress={() => setToolsOpen(true)}
          style={styles.toolButton}
        >
          <Ionicons name="add" size={25} color={ink} />
        </Pressable>
      </View>

      <View
        style={[
          styles.webContainer,
          { backgroundColor: dark ? "#05070C" : "#F7F8FA" },
        ]}
      >
        <WebView
          ref={webView}
          source={{ uri: source }}
          originWhitelist={["https://*"]}
          applicationNameForUserAgent="ALMA-iOS/1.0"
          injectedJavaScriptBeforeContentLoaded={NATIVE_BOOTSTRAP}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled={false}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
          mediaPlaybackRequiresUserAction
          allowsBackForwardNavigationGestures
          onShouldStartLoadWithRequest={handleNavigation}
          onNavigationStateChange={afterNavigate}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => setLoading(false)}
          onMessage={(event) => {
            if (event.nativeEvent.data === "theme:dark") setDark(true);
            if (event.nativeEvent.data === "theme:light") setDark(false);
            if (event.nativeEvent.data === "push:signin-required") {
              Alert.alert(
                "Sign in required",
                "Sign in to ALMA, then enable notifications again.",
              );
            }
          }}
          setSupportMultipleWindows={false}
          style={[
            styles.webView,
            { backgroundColor: dark ? "#05070C" : "#F7F8FA" },
          ]}
        />
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color="#25C9A7" />
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.browserBar,
          {
            backgroundColor: chrome,
            borderTopColor: dark ? "#20283A" : "#D9DEE7",
          },
        ]}
      >
        <Pressable
          disabled={!canGoBack}
          onPress={() => webView.current?.goBack()}
          style={styles.browserButton}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={canGoBack ? ink : dark ? "#4C5568" : "#B8BEC8"}
          />
        </Pressable>
        <Pressable
          disabled={!canGoForward}
          onPress={() => webView.current?.goForward()}
          style={styles.browserButton}
        >
          <Ionicons
            name="chevron-forward"
            size={22}
            color={canGoForward ? ink : dark ? "#4C5568" : "#B8BEC8"}
          />
        </Pressable>
        <Pressable
          onPress={() => webView.current?.reload()}
          style={styles.browserButton}
        >
          <Ionicons name="refresh" size={20} color={ink} />
        </Pressable>
        <Pressable
          onPress={() => setToolsOpen(true)}
          style={[styles.browserButton, styles.activeBrowserButton]}
        >
          <Ionicons name="attach" size={20} color={ink} />
        </Pressable>
      </View>

      <Modal
        transparent
        animationType="slide"
        visible={toolsOpen}
        onRequestClose={() => setToolsOpen(false)}
      >
        <Pressable style={styles.scrim} onPress={() => setToolsOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: chrome }]}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.sheetTitle, { color: ink }]}>Add to ALMA</Text>
          <Text style={[styles.sheetBody, { color: muted }]}>
            Permissions are requested only when you choose a tool.
          </Text>
          <View style={styles.toolGrid}>
            <Tool
              icon="camera-outline"
              label="Scan receipt"
              onPress={() => void openReceiptCamera()}
              dark={dark}
            />
            <Tool
              icon="videocam-outline"
              label="Live Camera"
              onPress={() => void openLiveCamera()}
              dark={dark}
            />
            <Tool
              icon="document-outline"
              label="Choose document"
              onPress={() => void openDocumentPicker()}
              dark={dark}
            />
            <Tool
              icon="mic-outline"
              label="Talk to ALMA"
              onPress={() => void enableMicrophone()}
              dark={dark}
            />
            <Tool
              icon="notifications-outline"
              label={notificationBusy ? "Enabling…" : "Notifications"}
              onPress={() => void enableNotifications()}
              dark={dark}
            />
            <Tool
              icon={dark ? "sunny-outline" : "moon-outline"}
              label={dark ? "Light appearance" : "Dark appearance"}
              onPress={toggleAppearance}
              dark={dark}
            />
          </View>
          <Text style={[styles.privacy, { color: muted }]}>
            Your files and business records use your signed-in ALMA workspace
            and are never shared across accounts.
          </Text>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Tool({
  icon,
  label,
  onPress,
  dark,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  dark: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.toolCard, dark ? styles.toolCardDark : null]}
    >
      <Ionicons name={icon} size={24} color={dark ? "#F5F7FB" : "#080A0D"} />
      <Text style={[styles.toolLabel, { color: dark ? "#F5F7FB" : "#080A0D" }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AlmaApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#D9DEE7",
    backgroundColor: "#FFFFFF",
  },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#080A0D",
    alignItems: "center",
    justifyContent: "center",
  },
  brandLetter: { color: "#F6F3EA", fontSize: 19, fontWeight: "700" },
  headerCopy: { flex: 1, paddingHorizontal: 10 },
  title: { color: "#080A0D", fontSize: 15, fontWeight: "700" },
  host: { color: "#697386", fontSize: 11, marginTop: 1 },
  toolButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DDF8F2",
    alignItems: "center",
    justifyContent: "center",
  },
  webContainer: { flex: 1, backgroundColor: "#F7F8FA" },
  webView: { flex: 1, backgroundColor: "#F7F8FA" },
  loader: {
    position: "absolute",
    top: 12,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#080A0D",
    alignItems: "center",
    justifyContent: "center",
  },
  browserBar: {
    height: 48,
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#D9DEE7",
    backgroundColor: "#FFFFFF",
  },
  browserButton: {
    width: 40,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activeBrowserButton: { backgroundColor: "#DDF8F2" },
  scrim: { flex: 1, backgroundColor: "rgba(8,10,13,0.38)" },
  sheet: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    paddingBottom: 34,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    backgroundColor: "#D9DEE7",
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 25, fontWeight: "700", color: "#080A0D" },
  sheetBody: { marginTop: 7, fontSize: 14, lineHeight: 20, color: "#697386" },
  toolGrid: { marginTop: 18, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  toolCard: {
    width: "48%",
    minHeight: 96,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: "#D9DEE7",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
  },
  toolCardDark: { borderColor: "#273149", backgroundColor: "#111622" },
  toolLabel: { fontSize: 14, fontWeight: "600", color: "#080A0D" },
  privacy: { marginTop: 18, color: "#697386", fontSize: 12, lineHeight: 18 },
});
