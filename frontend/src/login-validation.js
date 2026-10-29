export function validateLogin({ email, password }) {
  const errors = {};
  if (typeof email !== "string" || !email.trim()) errors.email = "Email is required.";
  else if (Array.from(email).length > 254) errors.email = "Email must not exceed 254 characters.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Invalid email address.";
  if (typeof password !== "string" || !password.trim()) errors.password = "Password is required.";
  else if (Array.from(password).length > 128) errors.password = "Password must not exceed 128 characters.";
  return errors;
}
