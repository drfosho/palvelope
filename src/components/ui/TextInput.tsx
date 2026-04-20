import React, { useState } from "react";
import {
  TextInput as RNTextInput,
  StyleSheet,
  type TextInputProps as RNTextInputProps,
} from "react-native";
import { semantic, typography, radius, spacing } from "@/theme/tokens";

interface TextInputProps extends Omit<RNTextInputProps, "style"> {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
}

export default function TextInput({
  value,
  onChangeText,
  placeholder,
  ...rest
}: TextInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <RNTextInput
      style={[styles.input, focused && styles.focused]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={semantic.inkSoft}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: semantic.surface2,
    borderWidth: 1,
    borderColor: semantic.rule,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: spacing[4],
    fontFamily: typography.fontBody,
    fontSize: typography.scale.base,
    color: semantic.ink,
  },
  focused: {
    borderColor: semantic.accentInk,
    borderWidth: 1.5,
  },
});
