export const emailSchema = {
  required: 'Email is required',
  pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email address' }
};

export const passwordSchema = {
  required: 'Password is required',
  minLength: { value: 6, message: 'Password must be at least 6 characters' }
};

export const usernameSchema = {
  required: 'Username is required',
};

export const customerCodeSchema = {
  required: 'Customer Code is required',
};

export const confirmPasswordSchema = {
  required: 'Confirm Password is required',
  minLength: { value: 6, message: 'Password must be at least 6 characters' }
};

export const firstNameSchema = {
  required: 'First name is required',
  pattern: { value: /^[a-zA-Z\s]+$/, message: 'Invalid first name' }
};

export const lastNameSchema = {
  required: 'Last name is required',
  pattern: { value: /^[a-zA-Z\s]+$/, message: 'Invalid last name' }
};
