import { defaultStyles } from '@/constants/defaultStyles';
import { SUBJECT_COLOR_KEYS, SUBJECT_COLORS, type SubjectColor } from '@/lib/subjectColors';
import { supabase } from '@/lib/supabase';
import type { Subject } from '@/lib/types';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View
} from 'react-native';


export default function UpsertSubject() {
    const { sId } = useLocalSearchParams<{ sId?: string }>();
    const isEditMode = Boolean(sId);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [color, setColor] = useState<SubjectColor>('blue');

    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isEditMode || !sId) return;

        const loadSubject = async () => {
            setIsLoading(true);

            const { data, error } = await supabase
                .from('subjects')
                .select('*')
                .eq('sId', sId)
                .single();

            setIsLoading(false);

            if (error || !data ) {
                Alert.alert('Subject could not be loaded, please try again');
                router.back();
                return;
            }

            const subject = data as Subject;

            setTitle(subject.title ?? '');
            setDescription(subject.description ?? '');
            setIsActive(subject.isActive ?? true);
            setColor(subject.color ?? 'blue');
        };

        loadSubject();
    }, [isEditMode, sId]);

    const handleSubmit = async () => {
        if (title.trim() === '') {
            Alert.alert('Title is required!');
            return;
        }
        
        const { data, error: userError } = await supabase.auth.getUser();

        if (userError || !data.user) {
            router.replace('/login');
            return;
        }

        setIsSaving(true);

        const payload = {
            title: title.trim(),
            description : description.trim(),
            isActive,
            color,
            lastChanged: new Date().toISOString(),
            uId:  data.user.id,
        };

        const result = isEditMode && sId
            ? await supabase.from('subjects').update(payload).eq('sId', sId)
            : await supabase.from('subjects').insert(payload);
        
        setIsSaving(false);

        if(result.error) {
            Alert.alert(
              isEditMode 
                ? 'Subject could not be updated, please try again' 
                : 'Subject could not be created, please try again'
            );
            return;
        }

        Alert.alert(
            isEditMode ? 'Subject updated successfully!' : 'Subject created successfully!'
        );

        router.back();
    };

    const inputClassName = 
        'rounded-2xl border border-app-border bg-app-subtle px-4 py-3 text-base text-text-main';
    
    const labelClassName = 'mb-2 text-sm font-semibold text-text-secondary';

    const selectedColor = useMemo(() => SUBJECT_COLORS[color], [color]);

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-app-bg">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <>
            <Stack.Screen
                options= {{
                    title: isEditMode ? 'Edit Subject' : 'Create Subject',
                    headerTitleStyle: defaultStyles.title,
                }} 
            />

            <KeyboardAvoidingView
                className="flex-1 bg-app-bg"
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}    
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView
                        className="flex-1"
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{
                            flexGrow: 1,
                            justifyContent: 'center',
                            paddingHorizontal: 20,
                            paddingVertical: 32,
                        }}
                    >
                        <View className="mb-6">
                            <Text className="text-3xl font-bold text-text-main">
                                {isEditMode ? 'Edit Subject' : 'Create Subject'}
                            </Text>
                            <Text className="mt-2 text-base leading-6 text-text-secondary">
                                {isEditMode? ' Update this subject and keep your study structure organized.'
                                : 'Add a subject to organize your assignments and studyt tasks.'}
                            </Text>
                        </View>

                        <View className="rounded-3xl border border-app-border bg-app-surface p-5 shadow-sm">
                            <View className="mb-5">
                                <Text className={labelClassName}>Title</Text>
                                <TextInput className={inputClassName}
                                    placeholder="Enter subject title"
                                    placeholderTextColor="#9CA3AF"
                                    value={title}
                                    onChangeText={setTitle}
                                    returnKeyType="next"
                                />
                            </View>

                            <View className ="mb-5">
                                <Text className={labelClassName}>Description</Text>
                                <TextInput 
                                    className={`${inputClassName} min-h-28`}
                                    placeholder="Add a short description"
                                    placeholderTextColor="#9CA3AF"
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    textAlignVertical="top"
                                />
                            </View>

                            <View className="mb-6">
                                <Text className={labelClassName}>Color</Text>

                                <View className="mb-4">
                                    <Text className={labelClassName}>Preview</Text>

                                    <View
                                        className="rounded-3xl bg-app-surface p-4"
                                        style={{
                                            borderWidth: 1,
                                            borderColor: selectedColor.strong,
                                        }}
                                    >
                                        <View className="flex-row items-center">
                                            <View
                                                className="mr-3 h-12 w-12 items-center justify-center rounded-2xl"
                                                style={{ backgroundColor: selectedColor.soft }}
                                            >
                                                <Text
                                                    className="text-base font-bold"
                                                    style={{ color: selectedColor.strong }}
                                                >
                                                    {title.trim().charAt(0).toUpperCase() || 'S'}
                                                </Text>
                                            </View>

                                            <View className="flex-1">
                                                <Text
                                                    className="text-base font-bold text-text-main"
                                                    numberOfLines={1}
                                                >
                                                    {title.trim() || 'Subject Preview'}
                                                </Text>

                                                <Text
                                                    className="mt-1 text-sm leading-5 text-text-secondary"
                                                    numberOfLines={2}
                                                >
                                                    {description.trim() || 'This color will be used as the subject card accent.'}
                                                </Text>
                                            </View>

                                            <View className="ml-3">
                                                <View
                                                    className="rounded-full px-3 py-1"
                                                    style={{ backgroundColor: selectedColor.soft }}
                                                >
                                                    <Text
                                                        className="text-xs font-semibold"
                                                        style={{ color: selectedColor.strong }}
                                                    >
                                                        {isActive ? 'Active' : 'Inactive'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                <View className="flex-row flex-wrap">
                                    {SUBJECT_COLOR_KEYS.map((colorKey) => {
                                        const colorOption = SUBJECT_COLORS[colorKey];
                                        const isSelected = color === colorKey;

                                        return (
                                            <Pressable
                                                key={colorKey}
                                                onPress={() => setColor(colorKey)}
                                                className="mr-3 mb-3 rounded-2xl border border-app-border bg-app--surface p-2"
                                                style={{
                                                    borderColor: isSelected
                                                    ? colorOption.strong
                                                    : '#FFFFFF',
                                                }}
                                            >
                                                <View className="flex-row items-center">
                                                    <View
                                                        className="mr-2 h-8 w-8 rounded-xl"
                                                        style={{ backgroundColor: colorOption.strong }}
                                                    />
                                                    <Text
                                                        className="text-sm font-semibold"
                                                        style={{
                                                            color: isSelected
                                                            ? colorOption.strong
                                                            : '#52616B',
                                                        }}
                                                    >
                                                        {colorOption.label}
                                                    </Text>
                                                </View>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>

                            <Pressable
                                onPress={() => setIsActive((state) => !state)}
                                disabled={isSaving}
                                className={`mb-6 flex-row items-center rounded-2xl border p-4 ${
                                    isActive
                                        ? 'border-accent bg-accent-soft'
                                        : 'border-app-border bg-app-subtle'
                                    }`}
                            >
                                <View
                                    className={`mr-3 h-6 w-6 items-center justify-center rounded-md border-2 ${
                                        isActive
                                            ? 'border-accent bg-accent'
                                            : 'border-app-border bg-app-surface'
                                    }`}
                                >
                                    {isActive && (
                                        <Text className="text-sm font-bold text-text-inverse">✓</Text>
                                    )}
                                </View>

                                <View className="flex-1">
                                    <Text className="text-base font-semibold text-text-main">
                                        Active subject
                                    </Text>
                                    <Text className="mt-1 text-sm text-text-muted">
                                        Active subjects appear in your main study workflow.
                                    </Text>
                                </View>
                            </Pressable>

                            <Pressable
                                className={`h-14 items-center justify-center rounded-2xl ${
                                    isSaving 
                                        ? 'bg-accent-disabled' 
                                        : 'bg-accent'
                                    }`}
                                    onPress={handleSubmit}
                                    disabled={isSaving}
                            >
                                {isSaving ? (
                                    <View className="flex-row items-center">
                                        <ActivityIndicator size="small" />
                                        <Text className="ml-3 text-base font-bold-text-text-inverse">
                                            {isEditMode ? 'Saving...' : 'Creating...'}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text className="text-base font-bold text-text-inverse">
                                        {isEditMode ? 'Save Changes' : 'Create Subject'}
                                    </Text>
                                )}
                            </Pressable>

                            <Pressable
                                className="mt-3 h-14 items-center justify-center rounded-2xl border border-app-border bg-app-subtle"
                                onPress={() => router.back()}
                                disabled={isSaving}
                            >
                                <Text className="text-base font-semibold text-text-secondary">
                                    Cancel
                                </Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </>
    );
}