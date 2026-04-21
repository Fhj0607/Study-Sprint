import { defaultStyles } from '@/constants/defaultStyles';
import { supabase } from '@/lib/supabase';
import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View
} from 'react-native';

export default function EditTask() {
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const getTask = async () => {
        if (!taskId) return;

        setIsLoading(true);

        try {
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('tId', taskId)
            .single();

          if (error || !data) {
            Alert.alert('Task not found');
            router.back();
            return;
          }

          setTitle(data.title ?? '');
          setDescription(data.description ?? '');
          setDeadline(data.deadline ?? '');
          setIsCompleted(Boolean(data.isCompleted));
        } finally {
          setIsLoading(false);
        }
      };

      getTask();
    }, [taskId])
  );

  const handleSaveTask = async () => { 
    if (!title.trim() || !description.trim() || !deadline.trim()) {
      Alert.alert("All fields are required!");
      return;
    }
    setIsSaving(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        router.replace("../createUser");
        return;
      }
      const { error: dbError } = await supabase.from("tasks").update({
        title,
        description,
        isCompleted,
        lastChanged: new Date().toISOString(),
        deadline,
        uId: userData.user.id,
      }).eq("tId", taskId);

      if (dbError) {
        Alert.alert("Task could not be edited, please try again");
        return;
      }
      Alert.alert("Task successfully edited!");
      router.back();
    } finally {
      setIsSaving(false);
    } 
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Edit Task",
          headerTitleStyle: defaultStyles.title
        }}
      />

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            style={defaultStyles.container}
            keyboardShouldPersistTaps="handled"  
          >
            <View style={styles.card}>
              <Text style={defaultStyles.title}>Edit Task</Text>
              <Text style={styles.subtitle}>Update your task details below.</Text>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" />
                  <Text style={styles.loadingText}>Loading task...</Text>
                </View>
              ) : (
                <>
                <View style={styles.field}>
                  <Text style={styles.label}>Title</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter task title"
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                 <View style={styles.field}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Enter task description"
                      placeholderTextColor="#9ca3af"
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Deadline</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9ca3af"
                      value={deadline}
                      onChangeText={setDeadline}
                    />
                  </View>

                  <Pressable
                    style={[
                      styles.checkboxContainer,
                      isCompleted && styles.checkboxContainerActive,
                    ]}
                    onPress={() => setIsCompleted((current) => !current)}
                  >
                     <View
                      style={[
                        styles.checkbox,
                        isCompleted && styles.checkboxActive,
                      ]}
                    >
                      {isCompleted && <Text style={styles.checkboxMark}>✓</Text>}
                    </View>

                    <Text style={styles.checkboxLabel}>
                      {isCompleted ? 'Completed' : 'Not completed'}
                    </Text>
                  </Pressable>

                   <View style={styles.buttonGroup}>
                    <Pressable
                      style={[
                        styles.primaryButton,
                        isSaving && styles.disabledButton,
                      ]}
                      onPress={handleSaveTask}
                      disabled={isSaving}
                    >
                      <Text style={styles.primaryButtonText}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </Text>
                    </Pressable>

                  {isSaving && (
                    <ActivityIndicator size="small" />
                  )}

                   <Pressable
                      style={styles.secondaryButton}
                      onPress={() => router.back()}
                      disabled={isSaving}
                    >
                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({

  screen: {
    flex: 1,
    backgroundColor: 'f3f4f6'
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5, 
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 15,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  textArea: {
    minHeight: 110,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    marginBottom: 22,
    backgroundColor: '#f9fafb',
  },
  checkboxContainerActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#9ca3af',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxActive: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  checkboxMark: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  buttonGroup: {
    gap: 12,
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  secondaryButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
});