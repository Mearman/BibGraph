/**
 * Form Manager Component
 *
 * Provides comprehensive form handling with validation, error management,
 * and integration with UI components. Simplifies complex form scenarios
 * and improves developer experience with standardized patterns.
 */

import { Button, Group, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconLoader } from "@tabler/icons-react";
import type { ReactNode, SyntheticEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import { useToast } from "./ToastNotification";

/**
True when a field's value should be treated as absent for required-field validation: undefined, null, or an all-whitespace string.
 */
const isEmptyFieldValue = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

export interface FormFieldConfig<T = unknown> {
  /**
  Field name
   */
  name: keyof T;
  /**
  Initial value
   */
  initialValue: unknown;
  /**
  Validation function
   */
  validate?: (value: unknown, formData: T) => string | null;
  /**
  Whether field is required
   */
  required?: boolean;
  /**
  Custom error message
   */
  errorMessage?: string;
  /**
  Transform function before validation
   */
  transform?: (value: unknown) => unknown;
  /**
  Field dependencies
   */
  dependsOn?: (keyof T)[];
}

export interface FormConfig<T> {
  /**
  Form field configurations
   */
  fields: FormFieldConfig<T>[];
  /**
  Initial form data
   */
  initialData?: Partial<T>;
  /**
  Submit handler
   */
  onSubmit: (data: T) => Promise<void> | void;
  /**
  Reset handler
   */
  onReset?: () => void;
  /**
  Whether to show success toast
   */
  showSuccessToast?: boolean;
  /**
  Success message
   */
  successMessage?: string;
  /**
  Whether to show error toast
   */
  showErrorToast?: boolean;
  /**
  Submit button text
   */
  submitText?: string;
  /**
  Reset button text
   */
  resetText?: string;
  /**
  Whether to disable submit while loading
   */
  disableSubmitOnLoading?: boolean;
  /**
  Custom validation function
   */
  validateForm?: (data: T) => Record<string, string> | null;
  /**
  Auto-save configuration
   */
  autoSave?: {
    enabled: boolean;
    debounceMs: number;
    onSave: (data: T) => Promise<void> | void;
  };
}

export interface FormManagerProps<T> {
  /**
  Form configuration
   */
  config: FormConfig<T>;
  /**
  Render function
   */
  children: (properties: {
    data: T;
    errors: Record<string, string>;
    touched: Partial<Record<keyof T, boolean>>;
    loading: boolean;
    dirty: boolean;
    valid: boolean;
    getFieldProps: (name: keyof T) => {
      value: unknown;
      error?: string;
      onChange: (value: unknown) => void;
      onBlur: () => void;
      required?: boolean;
    };
    setFieldValue: (name: keyof T, value: unknown) => void;
    setError: (name: keyof T, error: string) => void;
    clearError: (name: keyof T) => void;
    handleSubmit: (e?: SyntheticEvent) => Promise<void>;
    handleReset: () => void;
  }) => ReactNode;
  /**
  Custom submit button
   */
  submitButton?: ReactNode;
  /**
  Custom reset button
   */
  resetButton?: ReactNode;
  /**
  Show action buttons
   */
  showActions?: boolean;
}

/**
 * True when every configured field has a defined value in `data`, meaning the partial record built from `initialData` and each field's own `initialValue` fully covers `T`'s shape.
 */
const isCompleteFormData = <T,>(
  data: Readonly<Partial<Record<keyof T, unknown>>>,
  fields: readonly FormFieldConfig<T>[]
): data is T => fields.every((field) => data[field.name] !== undefined);

/**
 * Hook for form state management
 */
export const useFormManager = <T,>(config: FormConfig<T>) => {
  const toast = useToast();
  const formId = useId();

  // Initialize form data
  const initialData = useMemo(() => {
    const data: Partial<Record<keyof T, unknown>> = { ...config.initialData };
    for (const field of config.fields) {
      data[field.name] ??= field.initialValue;
    }
    if (!isCompleteFormData(data, config.fields)) {
      throw new Error('Form initial data is missing a value for one or more configured fields');
    }
    return data;
  }, [config.fields, config.initialData]);

  const [data, setData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    return JSON.stringify(data) !== JSON.stringify(initialData);
  }, [data, initialData]);

  // Check if form is valid
  const isValid = useMemo(() => (
    Object.keys(errors).length === 0 && config.fields.every((field) => (
      !(field.required === true && isEmptyFieldValue(data[field.name]))
    ))
  ), [errors, data, config.fields]);

  // Validate single field
  const validateField = useCallback((name: keyof T, value: unknown): string | null => {
    const field = config.fields.find((f) => f.name === name);
    if (!field) return null;

    // Check required
    if (field.required === true && isEmptyFieldValue(value)) {
      return field.errorMessage ?? `${String(name)} is required`;
    }

    // Transform value
    const transformedValue = field.transform ? field.transform(value) : value;

    // Custom validation
    if (field.validate) {
      return field.validate(transformedValue, data);
    }

    return null;
  }, [config.fields, data]);

  // Validate entire form
  const validateForm = useCallback((formData: T): Record<string, string> => {
    let newErrors: Record<string, string> = {};

    // Validate each field
    for (const field of config.fields) {
      const error = validateField(field.name, formData[field.name]);
      if (error !== null) {
        newErrors = { ...newErrors, [String(field.name)]: error };
      }
    }

    // Custom form validation
    if (config.validateForm) {
      const customErrors = config.validateForm(formData);
      if (customErrors) {
        newErrors = { ...newErrors, ...customErrors };
      }
    }

    return newErrors;
  }, [config, validateField]);

  // Set field value
  const setFieldValue = useCallback((name: keyof T, value: unknown) => {
    setData((previous) => ({ ...previous, [name]: value }));

    // Clear error when value changes
    if (errors[String(name)]) {
      setErrors((previous) => {
        const { [String(name)]: _removed, ...rest } = previous;
        return rest;
      });
    }

    // Mark as touched
    setTouched((previous) => ({ ...previous, [name]: true }));
  }, [errors]);

  // Set field error
  const setError = useCallback((name: keyof T, error: string) => {
    setErrors((previous) => ({ ...previous, [name]: error }));
  }, []);

  // Clear field error
  const clearError = useCallback((name: keyof T) => {
    setErrors((previous) => {
      const { [String(name)]: _removed, ...rest } = previous;
      return rest;
    });
  }, []);

  // Handle field blur
  const handleFieldBlur = useCallback((name: keyof T) => {
    setTouched((previous) => ({ ...previous, [name]: true }));
    const error = validateField(name, data[name]);
    if (error !== null) {
      setError(name, error);
    } else {
      clearError(name);
    }
  }, [validateField, data, setError, clearError]);

  // Get field props for form inputs
  const getFieldProperties = useCallback((name: keyof T) => ({
    value: data[name],
    error: touched[name] === true ? errors[String(name)] : undefined,
    onChange: (value: unknown) => { setFieldValue(name, value); },
    onBlur: () => { handleFieldBlur(name); },
    required: config.fields.find((f) => f.name === name)?.required,
  }), [data, touched, errors, setFieldValue, handleFieldBlur, config.fields]);

  // Handle submit
  const handleSubmit = useCallback(async (e?: SyntheticEvent) => {
    e?.preventDefault();
    setSubmitted(true);

    // Validate form
    const newErrors = validateForm(data);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);
      await config.onSubmit(data);

      if (config.showSuccessToast === true) {
        toast.success(config.successMessage ?? "Form submitted successfully");
      }

      // Mark all fields as untouched after successful submit
      setTouched({});
    } catch (error) {
      if (config.showErrorToast === true) {
        toast.error(error instanceof Error ? error.message : "Submission failed");
      }
    } finally {
      setLoading(false);
    }
  }, [data, validateForm, config, toast]);

  // Handle reset
  const handleReset = useCallback(() => {
    setData(initialData);
    setErrors({});
    setTouched({});
    setSubmitted(false);
    config.onReset?.();
  }, [initialData, config]);

  // Auto-save functionality
  useEffect(() => {
    if (config.autoSave?.enabled !== true) return undefined;

    const timeoutId = setTimeout(() => {
      const runAutoSave = async () => {
        if (isDirty && isValid && config.autoSave?.onSave) {
          try {
            await config.autoSave.onSave(data);
          } catch {
            // Silent auto-save failures
          }
        }
      };
      void runAutoSave();
    }, config.autoSave.debounceMs);

    return () => { clearTimeout(timeoutId); };
  }, [data, isDirty, isValid, config.autoSave]);

  return {
    data,
    errors,
    touched,
    loading,
    dirty: isDirty,
    valid: isValid,
    submitted,
    formId,
    setFieldValue,
    setError,
    clearError,
    getFieldProps: getFieldProperties,
    handleSubmit,
    handleReset,
  };
};;

/**
 * Form Manager Component
 */
export const FormManager = <T,>({
  config,
  children,
  submitButton,
  resetButton,
  showActions = true,
}: FormManagerProps<T>) => {
  const formState = useFormManager(config);

  return (
    <form
      id={formState.formId}
      onSubmit={(e) => { void formState.handleSubmit(e); }}
      noValidate
    >
      {children(formState)}

      {showActions && (
        <Group mt="md" justify="flex-end">
          {resetButton ?? (
            <Button
              variant="light"
              onClick={formState.handleReset}
              disabled={formState.loading || !formState.dirty}
            >
              {config.resetText ?? "Reset"}
            </Button>
          )}

          {submitButton ?? (
            <Button
              type="submit"
              loading={formState.loading}
              disabled={!formState.dirty || !formState.valid || (config.disableSubmitOnLoading === true && formState.loading)}
              leftSection={formState.loading ? <IconLoader size={16} /> : <IconCheck size={16} />}
            >
              {config.submitText ?? "Submit"}
            </Button>
          )}
        </Group>
      )}
    </form>
  );
};;

/**
 * Form field component with integrated validation
 */
export interface FormFieldProps {
  label: ReactNode;
  error?: string;
  required?: boolean;
  description?: ReactNode;
  children: ReactNode;
}

export const FormField = ({ label, error, required, description, children }: FormFieldProps) => {
  return (
    <Stack gap="xs">
      <Text fw={500} size="sm">
        {label}
        {required === true && <Text span c="red">*</Text>}
      </Text>
      {children}
      {error !== undefined && (
        <Group gap={4} align="center">
          <IconAlertTriangle size={12} />
          <Text c="red" size="sm" fz="xs">
            {error}
          </Text>
        </Group>
      )}
      {description !== undefined && (
        <Text c="dimmed" size="sm" fz="xs">
          {description}
        </Text>
      )}
    </Stack>
  );
};

/**
 * Predefined validation functions
 */
export const Validations = {
  required: (message = "This field is required") => (value: unknown) => {
    if (isEmptyFieldValue(value)) {
      return message;
    }
    return null;
  },

  email: (message = "Please enter a valid email address") => (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return message;
    }
    return null;
  },

  minLength: (min: number, message?: string) => (value: string) => {
    if (value.length < min) {
      return message ?? `Must be at least ${String(min)} characters`;
    }
    return null;
  },

  maxLength: (max: number, message?: string) => (value: string) => {
    if (value.length > max) {
      return message ?? `Must be no more than ${String(max)} characters`;
    }
    return null;
  },

  pattern: (regex: Readonly<RegExp>, message = "Invalid format") => (value: string) => {
    if (!regex.test(value)) {
      return message;
    }
    return null;
  },

  url: (message = "Please enter a valid URL") => (value: string) => {
    try {
      new URL(value);
      return null;
    } catch {
      return message;
    }
  },

  numeric: (message = "Please enter a valid number") => (value: unknown) => {
    if (Number.isNaN(Number(value))) {
      return message;
    }
    return null;
  },

  positive: (message = "Must be a positive number") => (value: unknown) => {
    const number_ = Number(value);
    if (Number.isNaN(number_) || number_ <= 0) {
      return message;
    }
    return null;
  },

  integer: (message = "Must be a whole number") => (value: unknown) => {
    const number_ = Number(value);
    if (Number.isNaN(number_) || !Number.isInteger(number_)) {
      return message;
    }
    return null;
  },

  range: (min: number, max: number, message?: string) => (value: unknown) => {
    const number_ = Number(value);
    if (Number.isNaN(number_) || number_ < min || number_ > max) {
      return message ?? `Must be between ${String(min)} and ${String(max)}`;
    }
    return null;
  },

  match: (pattern: Readonly<RegExp>, message = "Invalid format") => (value: string) => {
    if (!pattern.test(value)) {
      return message;
    }
    return null;
  },
};

