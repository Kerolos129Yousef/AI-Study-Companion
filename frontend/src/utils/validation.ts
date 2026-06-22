export interface FieldError {
  field: string;
  message: string;
}

export interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
}

export interface RegisterValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof RegisterFormValues, string>>;
  sanitized: RegisterFormValues;
}

export function validateRegisterForm(values: RegisterFormValues): RegisterValidationResult {
  const errors: Partial<Record<keyof RegisterFormValues, string>> = {};

  const name = values.name.trim();
  const email = values.email.trim().toLowerCase();
  const password = values.password;

  if (!name) {
    errors.name = 'Full name is required.';
  } else if (name.length < 3) {
    errors.name = 'Full name must be at least 3 characters.';
  } else if (!/^[a-zA-Z\s]+$/.test(name)) {
    errors.name = 'Full name may only contain letters and spaces.';
  }

  if (!email) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (!/[A-Z]/.test(password)) {
    errors.password = 'Password must contain at least one uppercase letter.';
  } else if (!/[a-z]/.test(password)) {
    errors.password = 'Password must contain at least one lowercase letter.';
  } else if (!/[0-9]/.test(password)) {
    errors.password = 'Password must contain at least one number.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: { name, email, password },
  };
}
