import { validateRegisterForm } from '../../utils/validation';

describe('validateRegisterForm', () => {
  it('accepts valid registration input and sanitizes values', () => {
    const result = validateRegisterForm({
      name: '  John Doe  ',
      email: '  John@Example.COM ',
      password: 'Secret123',
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.sanitized).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Secret123',
    });
  });

  it('requires a full name', () => {
    const result = validateRegisterForm({
      name: '',
      email: 'user@example.com',
      password: 'Secret123',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.name).toBe('Full name is required.');
  });

  it('rejects names shorter than 3 characters', () => {
    const result = validateRegisterForm({
      name: 'Jo',
      email: 'user@example.com',
      password: 'Secret123',
    });

    expect(result.errors.name).toBe('Full name must be at least 3 characters.');
  });

  it('rejects names with invalid characters', () => {
    const result = validateRegisterForm({
      name: 'John123',
      email: 'user@example.com',
      password: 'Secret123',
    });

    expect(result.errors.name).toBe('Full name may only contain letters and spaces.');
  });

  it('requires a valid email address', () => {
    const result = validateRegisterForm({
      name: 'John Doe',
      email: 'not-an-email',
      password: 'Secret123',
    });

    expect(result.errors.email).toBe('Please enter a valid email address.');
  });

  it('requires an email', () => {
    const result = validateRegisterForm({
      name: 'John Doe',
      email: '',
      password: 'Secret123',
    });

    expect(result.errors.email).toBe('Email is required.');
  });

  it('requires a password', () => {
    const result = validateRegisterForm({
      name: 'John Doe',
      email: 'user@example.com',
      password: '',
    });

    expect(result.errors.password).toBe('Password is required.');
  });

  it('reports multiple validation errors at once', () => {
    const result = validateRegisterForm({
      name: '',
      email: 'bad',
      password: 'short',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.email).toBeDefined();
    expect(result.errors.password).toBeDefined();
  });

  it('enforces password complexity rules', () => {
    const tooShort = validateRegisterForm({
      name: 'John Doe',
      email: 'user@example.com',
      password: 'short1',
    });
    expect(tooShort.errors.password).toBe('Password must be at least 8 characters.');

    const noUppercase = validateRegisterForm({
      name: 'John Doe',
      email: 'user@example.com',
      password: 'secret123',
    });
    expect(noUppercase.errors.password).toBe(
      'Password must contain at least one uppercase letter.'
    );

    const noLowercase = validateRegisterForm({
      name: 'John Doe',
      email: 'user@example.com',
      password: 'SECRET123',
    });
    expect(noLowercase.errors.password).toBe(
      'Password must contain at least one lowercase letter.'
    );

    const noNumber = validateRegisterForm({
      name: 'John Doe',
      email: 'user@example.com',
      password: 'SecretPass',
    });
    expect(noNumber.errors.password).toBe('Password must contain at least one number.');
  });
});
