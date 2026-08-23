export function strongPasswordError(password: string) {
  if (password.length < 12) return "Password must be at least 12 characters";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return "Password must include uppercase and lowercase letters";
  }
  if (!/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "Password must include a number and a symbol";
  }
  return null;
}
