import { useRouter } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormField } from '@/components/FormField';
import { fonts, radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useTheme';
import {
  deleteApiKey,
  getApiSettings,
  isValidApiAddress,
  listModels,
  saveApiSettings,
  type ApiSettings,
} from '@/services/apiSettings';

/** Settings for the optional online receipt reader. No provider is built in: the user brings their own. */
export default function ApiSettingsScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const headerHeight = useHeaderHeight();
  const [saved, setSaved] = useState<ApiSettings | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [model, setModel] = useState('');
  const [key, setKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  useEffect(() => {
    getApiSettings().then((settings) => {
      setSaved(settings);
      setName(settings.name);
      setAddress(settings.address);
      setModel(settings.model);
    });
  }, []);

  const addressOk = address.trim() === '' || isValidApiAddress(address);
  const canSave = addressOk && (address.trim() === '') === (model.trim() === '');

  const canLoadModels = isValidApiAddress(address) && (key.trim() !== '' || saved?.keyEnding != null);

  async function handleLoadModels() {
    setIsLoadingModels(true);
    setModelsError(null);
    try {
      setModels(await listModels(address, key));
    } catch (error) {
      setModels([]);
      setModelsError(error instanceof Error ? error.message : "Couldn't load the model list.");
    } finally {
      setIsLoadingModels(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await saveApiSettings({ name: name.trim(), address: address.trim(), model: model.trim() }, key);
      router.back();
    } catch {
      Alert.alert('Could not save', 'Your API settings were not saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  function confirmDeleteKey() {
    Alert.alert('Delete the API key?', 'The receipt button will be hidden until you add a key again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteApiKey();
          setSaved(await getApiSettings());
        },
      },
    ]);
  }

  if (!saved) {
    return null;
  }

  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={headerHeight} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardText}>
            Optional. When a receipt is hard to read, a button on the Confirm screen can send the photo to an AI
            service you choose. It works with any service that offers an OpenAI-compatible chat API with image input.
          </Text>
          <Text style={styles.warning}>
            The photo goes to that service under its terms. Some free plans use what you send to improve their
            products and let people review it. Receipts can show names, phone numbers or card endings.
          </Text>
        </View>
        <FormField label="Name (optional)" value={name} onChangeText={setName} placeholder="Shown on the button" />
        <FormField
          label={addressOk ? 'API address' : 'API address (must start with https://)'}
          value={address}
          onChangeText={setAddress}
          placeholder="https://…"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <FormField
          label="Model name"
          value={model}
          onChangeText={setModel}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <FormField
          label="API key"
          value={key}
          onChangeText={setKey}
          placeholder={saved.keyEnding ? `Saved, ends in ${saved.keyEnding}` : 'Paste your key'}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        {saved.keyEnding && <Text style={styles.hint}>Leave the key empty to keep the saved one.</Text>}
        <Button
          title={isLoadingModels ? 'Loading…' : 'Load models'}
          variant="secondary"
          onPress={handleLoadModels}
          disabled={!canLoadModels || isLoadingModels}
        />
        {modelsError && <Text style={styles.warning}>{modelsError}</Text>}
        {models.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.hint}>Tap a model to use it</Text>
            {models.map((id) => (
              <Pressable
                key={id}
                accessibilityRole="radio"
                accessibilityState={{ checked: id === model.trim() }}
                onPress={() => setModel(id)}
                style={({ pressed }) => [styles.modelRow, pressed && styles.pressed]}
              >
                <Text style={[styles.modelText, id === model.trim() && styles.modelPicked]}>{id}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <Button title={isSaving ? 'Saving…' : 'Save'} onPress={handleSave} disabled={!canSave || isSaving} />
        {saved.keyEnding && <Button title="Delete key" variant="danger" onPress={confirmDeleteKey} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.gutter,
      gap: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
    },
    cardText: {
      ...typography.meta,
      color: colors.text,
    },
    warning: {
      ...typography.meta,
      color: colors.warning,
    },
    hint: {
      ...typography.meta,
      color: colors.textMuted,
    },
    modelRow: {
      paddingVertical: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    pressed: {
      backgroundColor: colors.surfacePressed,
    },
    modelText: {
      ...typography.body,
      color: colors.text,
    },
    modelPicked: {
      fontFamily: fonts.semiBold,
      color: colors.accent,
    },
  });
