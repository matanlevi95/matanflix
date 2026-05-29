import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, font, radius } from "../theme";
import { api, setApiBase, getApiBase } from "../api";
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "../store/settings";

const QUALITY = [
  { key: "auto", label: "אוטומטי" },
  { key: "1080p", label: "1080p" },
  { key: "720p", label: "720p" },
  { key: "480p", label: "480p" },
];

const SUBS = [
  { key: "he", label: "עברית" },
  { key: "none", label: "ללא" },
];

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function OptionRow({ options, value, onChange }) {
  return (
    <View style={styles.options}>
      {options.map((o) => (
        <TouchableOpacity
          key={o.key}
          style={[styles.option, value === o.key && styles.optionActive]}
          onPress={() => onChange(o.key)}
        >
          <Text style={[styles.optionText, value === o.key && styles.optionTextActive]}>
            {o.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function SettingsScreen() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [backendInput, setBackendInput] = useState("");

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setBackendInput(s.backendUrl);
    });
  }, []);

  const update = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  const applyBackend = () => {
    const url = backendInput.trim();
    update({ backendUrl: url });
    setApiBase(url);
    Alert.alert("נשמר", `כתובת השרת עודכנה:\n${getApiBase()}`);
  };

  const testConnection = async () => {
    try {
      const r = await api.health();
      Alert.alert("חיבור תקין ✓", `מקורות פעילים: ${(r.sources || []).join(", ") || "—"}`);
    } catch {
      Alert.alert("שגיאת חיבור", "לא ניתן להתחבר לשרת. בדקו את הכתובת.");
    }
  };

  const clearCache = async () => {
    try {
      const r = await api.clearCache();
      Alert.alert("המטמון נוקה", `${r.cleared} פריטים הוסרו`);
    } catch {
      Alert.alert("שגיאה", "ניקוי המטמון נכשל");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      <Text style={styles.header}>הגדרות</Text>

      <Section title="איכות ברירת מחדל">
        <OptionRow options={QUALITY} value={settings.quality} onChange={(q) => update({ quality: q })} />
      </Section>

      <Section title="שפת כתוביות">
        <OptionRow
          options={SUBS}
          value={settings.subtitleLang}
          onChange={(l) => update({ subtitleLang: l })}
        />
      </Section>

      <Section title="כתובת שרת">
        <TextInput
          value={backendInput}
          onChangeText={setBackendInput}
          placeholder="https://my-backend.onrender.com"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          textAlign="left"
        />
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={applyBackend}>
            <Ionicons name="save-outline" size={18} color={colors.text} />
            <Text style={styles.buttonText}>שמירה</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.buttonAlt]} onPress={testConnection}>
            <Ionicons name="pulse-outline" size={18} color={colors.text} />
            <Text style={styles.buttonText}>בדיקת חיבור</Text>
          </TouchableOpacity>
        </View>
      </Section>

      <Section title="ניהול מטמון">
        <TouchableOpacity style={styles.button} onPress={clearCache}>
          <Ionicons name="trash-outline" size={18} color={colors.text} />
          <Text style={styles.buttonText}>נקה מטמון מטא-דאטה</Text>
        </TouchableOpacity>
      </Section>

      <Section title="אודות">
        <Text style={styles.about}>Matanflix · גרסה 1.0.0</Text>
        <Text style={styles.aboutMuted}>
          אגרגטור תוכן חוקי בהשראת Plex / Stremio / Kodi. מטא-דאטה מ-TMDB, תוכן
          ממקורות חוקיים (YouTube, Internet Archive) וכתוביות מ-OpenSubtitles.
        </Text>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    color: colors.text,
    fontSize: font.title,
    fontWeight: "800",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.sm,
    textAlign: "right",
  },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  sectionTitle: { color: colors.textMuted, fontSize: font.small, marginBottom: spacing.md, textAlign: "right" },
  options: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm },
  option: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  optionActive: { backgroundColor: colors.accent },
  optionText: { color: colors.textMuted, fontSize: font.body, fontWeight: "600" },
  optionTextActive: { color: colors.text },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: font.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonRow: { flexDirection: "row-reverse", gap: spacing.sm, marginTop: spacing.md },
  button: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    flex: 1,
  },
  buttonAlt: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: colors.text, fontSize: font.body, fontWeight: "700" },
  about: { color: colors.text, fontSize: font.body, fontWeight: "700", textAlign: "right" },
  aboutMuted: { color: colors.textMuted, fontSize: font.small, lineHeight: 20, marginTop: spacing.sm, textAlign: "right" },
});
